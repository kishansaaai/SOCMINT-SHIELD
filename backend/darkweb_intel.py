"""
Dark Web / Telegram / Paste-site Harvester.

Features:
    1. Public Telegram channel / group post scraping (via t.me/s/<channel> preview)
    2. Paste-site monitoring (Pastebin, Rentry, Ghostbin, dpaste)
    3. Onion link presence detection (no actual Tor connection — flag only)
    4. Keyword alerting on collected text

This module does NOT connect to the Tor network.  It only inspects
publicly-indexed mirrors and APIs.  No deanonymisation is attempted.
"""

import os
import re
import time
import asyncio
import hashlib
import logging
from typing import List, Dict, Any, Optional
from urllib.parse import quote_plus

import httpx

logger = logging.getLogger("uvicorn.error")

# ---------------------------------------------------------------------------
# 1. Telegram public channel preview
# ---------------------------------------------------------------------------

# t.me/<channel> redirects to https://t.me/s/<channel> which is a
# server-rendered HTML preview of recent posts.  This is legal and public.

TG_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    )
}


async def scrape_telegram_channel(channel: str, max_posts: int = 30) -> Dict[str, Any]:
    """
    channel: bare username without '@' (e.g. 'example_channel')
    """
    info: Dict[str, Any] = {
        "channel": channel,
        "url": f"https://t.me/{channel}",
        "ok": False,
        "title": None,
        "description": None,
        "followers": None,
        "posts": [],
        "error": None,
    }

    try:
        async with httpx.AsyncClient(headers=TG_HEADERS, follow_redirects=True, timeout=20) as client:
            r = await client.get(f"https://t.me/s/{channel}")
            if r.status_code != 200:
                info["error"] = f"t.me returned {r.status_code}"
                return info

            html = r.text
            info["ok"] = True

            # Title from <meta property="og:title">
            m = re.search(r'<meta property="og:title" content="([^"]+)"', html)
            if m:
                info["title"] = m.group(1)

            # Description
            m = re.search(r'<meta property="og:description" content="([^"]+)"', html)
            if m:
                info["description"] = m.group(1)

            # Follower count (Turkish text used in preview)
            m = re.search(r'(\d[\d\s,]+)\s*(?:subscribers|abone|подписчик|members|follower)', html, re.IGNORECASE)
            if m:
                info["followers"] = m.group(1).strip()

            # Posts
            # Each post is inside <div class="tgme_widget_message ...">...</div>
            post_blocks = re.findall(
                r'<div class="tgme_widget_message_wrap[^"]*"[^>]*>(.*?)<div class="tgme_widget_message_wrap',
                html,
                re.DOTALL,
            )
            if not post_blocks:
                # fallback — single-block match
                post_blocks = re.findall(
                    r'<div class="tgme_widget_message\b[^>]*>(.*?)<div class="tgme_widget_message\b',
                    html,
                    re.DOTALL,
                )

            for block in post_blocks[:max_posts]:
                # Text content
                text_m = re.search(
                    r'<div class="tgme_widget_message_text[^"]*"[^>]*>(.*?)</div>',
                    block,
                    re.DOTALL,
                )
                text = ""
                if text_m:
                    text = re.sub(r"<[^>]+>", " ", text_m.group(1))
                    text = re.sub(r"\s+", " ", text).strip()

                # Datetime
                dt_m = re.search(r'<time datetime="([^"]+)"', block)
                dt = dt_m.group(1) if dt_m else None

                # Views
                v_m = re.search(r'<span class="tgme_widget_message_views">([^<]+)</span>', block)
                views = v_m.group(1).strip() if v_m else None

                if text or dt:
                    info["posts"].append({
                        "timestamp": dt,
                        "text": text[:1000],
                        "views": views,
                    })

            if not info["posts"]:
                # Channel may exist but be empty or fully restricted
                info["error"] = "No posts found (channel may be private or empty)"

    except Exception as e:
        logger.debug(f"Telegram scrape failed for {channel}: {e}")
        info["error"] = str(e)

    return info


# ---------------------------------------------------------------------------
# 2. Paste-site monitoring
# ---------------------------------------------------------------------------

PASTE_SOURCES = [
    # name, url-builder, content-extraction
    {
        "name": "pastebin",
        "url": "https://psbdmp.ws/api/v3/search/{q}",
        "method": "api",
        "json_path": "data",
    },
    {
        "name": "rentry",
        "url": "https://rentry.org/{q}",
        "method": "html",
    },
    {
        "name": "ghostbin",
        "url": "https://ghostbin.org/paste/{q}",
        "method": "html",
    },
    {
        "name": "dpaste",
        "url": "https://dpaste.org/{q}",
        "method": "html",
    },
]


async def search_paste_sites(query: str, max_results: int = 15) -> Dict[str, Any]:
    """
    Best-effort search across paste aggregators.  Returns matches with
    source, title, author, content-snippet (if available).
    """
    info: Dict[str, Any] = {
        "query": query,
        "results": [],
        "sources_checked": [],
        "ok": False,
        "note": None,
    }

    # PSBDMP — Pastebin dump search engine (free, no key)
    try:
        async with httpx.AsyncClient(headers=TG_HEADERS, timeout=15) as client:
            r = await client.get(f"https://psbdmp.ws/api/v3/search/{quote_plus(query)}")
            if r.status_code == 200:
                info["sources_checked"].append("psbdmp")
                data = r.json()
                for item in (data.get("data") or [])[:max_results]:
                    info["results"].append({
                        "source": "pastebin",
                        "id": item.get("id"),
                        "title": item.get("title"),
                        "author": item.get("author"),
                        "date": item.get("date"),
                        "url": f"https://pastebin.com/{item.get('id')}",
                        "tags": item.get("tags", []),
                    })
                info["ok"] = True
    except Exception as e:
        logger.debug(f"psbdmp search failed: {e}")

    # Try direct paste-id probes for rentry/ghostbin/dpaste
    # (these don't have a search API, but a known paste-id can be probed)
    for slug_template in [
        "https://rentry.co/{q}",
        "https://paste.mozilla.org/{q}",
    ]:
        try:
            url = slug_template.format(q=query)
            async with httpx.AsyncClient(headers=TG_HEADERS, follow_redirects=True, timeout=10) as client:
                r = await client.get(url)
                if r.status_code == 200 and len(r.text) > 500:
                    text = re.sub(r"<[^>]+>", " ", r.text)
                    text = re.sub(r"\s+", " ", text).strip()[:600]
                    if query.lower() in text.lower():
                        info["results"].append({
                            "source": slug_template.split("//")[1].split("/")[0],
                            "id": query,
                            "url": url,
                            "snippet": text,
                        })
                        info["ok"] = True
        except Exception:
            continue

    return info


# ---------------------------------------------------------------------------
# 3. Onion link / dark-web mention detection
# ---------------------------------------------------------------------------

ONION_RE = re.compile(r"\b[a-z2-7]{16,56}\.onion\b", re.IGNORECASE)
PGP_KEY_RE = re.compile(r"-----BEGIN PGP PUBLIC KEY BLOCK-----", re.IGNORECASE)
BTC_IN_TEXT_RE = re.compile(r"\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b")
ETH_IN_TEXT_RE = re.compile(r"\b0x[0-9a-fA-F]{40}\b")


def scan_text_for_darkweb_indicators(text: str) -> Dict[str, Any]:
    """Find onion links, PGP blocks, crypto addresses in arbitrary text."""
    return {
        "onion_links": list(set(ONION_RE.findall(text))),
        "pgp_blocks": len(PGP_KEY_RE.findall(text)),
        "btc_addresses": list(set(BTC_IN_TEXT_RE.findall(text))),
        "eth_addresses": list(set(ETH_IN_TEXT_RE.findall(text))),
    }


# ---------------------------------------------------------------------------
# 4. Threat-keyword alerting
# ---------------------------------------------------------------------------

THREAT_KEYWORDS = {
    "high": [
        "leak", "dox", "doxx", "ddos", "ransomware", "0day", "exploit kit",
        "ransom", "swat", "bomb threat", "attack plan", "shoot up",
    ],
    "medium": [
        "phishing kit", "carding", "cvv", "fullz", "credentials", "stealer logs",
        "rat", "keylogger", "malware sample", "cracking", "bruteforce",
    ],
    "low": [
        "vpn", "tor", "proxy", "socks5", "spoof", "fake id",
    ],
}


def score_text_threat(text: str) -> Dict[str, Any]:
    """Return severity counts and the matching keywords."""
    t = text.lower()
    matches = {"high": [], "medium": [], "low": []}
    for sev, kws in THREAT_KEYWORDS.items():
        for kw in kws:
            if kw in t:
                matches[sev].append(kw)
    total = sum(len(v) for v in matches.values())
    if matches["high"]:
        verdict = "high"
    elif matches["medium"]:
        verdict = "medium"
    elif matches["low"]:
        verdict = "low"
    else:
        verdict = "none"
    return {
        "verdict": verdict,
        "score": min(100, total * 15),
        "matches": matches,
        "total_hits": total,
    }


# ---------------------------------------------------------------------------
# 5. Bot-likelihood detector (heuristic)
# ---------------------------------------------------------------------------

# Lightweight signals — used when looking at any account's metadata.
def bot_score(profile: Dict[str, Any]) -> Dict[str, Any]:
    """
    profile expected keys:
        followers, following, posts, account_age_days, has_avatar, bio_length
    """
    score = 0
    reasons = []

    followers = profile.get("followers") or 0
    following = profile.get("following") or 0
    posts = profile.get("posts") or 0
    age = profile.get("account_age_days") or 1
    has_avatar = profile.get("has_avatar", True)
    bio_len = profile.get("bio_length", 0)

    # Follower/following ratio
    if following > 0 and followers == 0:
        score += 25
        reasons.append("zero_followers")
    elif following > 0 and followers / following < 0.05 and following > 100:
        score += 15
        reasons.append("very_low_follower_ratio")

    # Post density
    density = posts / max(age, 1)
    if density > 20:
        score += 20
        reasons.append(f"high_post_density_{density:.1f}_per_day")
    elif density < 0.01 and age > 180:
        score += 10
        reasons.append("dormant_account")

    # No avatar + no bio
    if not has_avatar:
        score += 10
        reasons.append("no_avatar")
    if bio_len < 5:
        score += 10
        reasons.append("empty_bio")

    # Very new with huge following
    if age < 30 and following > 1000:
        score += 20
        reasons.append("new_account_mass_follow")

    score = min(100, score)
    if score >= 70:
        verdict = "likely_bot"
    elif score >= 40:
        verdict = "possibly_bot"
    else:
        verdict = "likely_human"

    return {
        "score": score,
        "verdict": verdict,
        "reasons": reasons,
    }


# ---------------------------------------------------------------------------
# 6. Convenience entrypoint — run all of the above on a username
# ---------------------------------------------------------------------------

async def run_darkweb_intel(query: str) -> Dict[str, Any]:
    """
    Run paste search + Telegram scrape + threat scoring in parallel.
    """
    paste_task = search_paste_sites(query)
    tg_task = scrape_telegram_channel(query)
    paste_res, tg_res = await asyncio.gather(paste_task, tg_task, return_exceptions=True)

    if isinstance(paste_res, Exception):
        paste_res = {"error": str(paste_res), "results": []}
    if isinstance(tg_res, Exception):
        tg_res = {"error": str(tg_res), "posts": []}

    # Aggregate text for keyword scoring
    corpus = ""
    for p in tg_res.get("posts", []):
        corpus += " " + p.get("text", "")
    for r in paste_res.get("results", []):
        corpus += " " + r.get("title", "") + " " + r.get("snippet", "")

    darkweb_signals = scan_text_for_darkweb_indicators(corpus)
    threat = score_text_threat(corpus)

    return {
        "query": query,
        "telegram": tg_res,
        "pastes": paste_res,
        "darkweb_indicators": darkweb_signals,
        "threat_keywords": threat,
    }
