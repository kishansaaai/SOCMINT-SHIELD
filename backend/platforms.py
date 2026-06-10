import asyncio
import httpx
from typing import Optional
from datetime import datetime

TIMEOUT = 12
MOZILLA_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

ALL_PLATFORM_NAMES = [
    "GitHub", "Reddit", "HackerNews", "Dev.to", "GitLab", "Tumblr",
    "Instagram", "Facebook", "YouTube", "Twitter/X", "LinkedIn",
    "Telegram", "Snapchat", "TikTok", "Quora", "Pastebin", "Pinterest",
    "Medium", "Discord", "Steam", "ShareChat", "Koo", "Josh/Moj",
    "Meesho", "OLX India", "Naukri.com", "JioCinema", "MX TakaTak",
    "Roposo", "WhatsApp Business",
]


# ---------------------------------------------------------------------------
# TIER 1 — Official APIs
# ---------------------------------------------------------------------------

async def search_github(client: httpx.AsyncClient, username: str) -> dict:
    try:
        r = await client.get(
            f"https://api.github.com/users/{username}",
            headers={"User-Agent": "SOCMINT/2.0"},
            timeout=TIMEOUT,
        )
        if r.status_code == 200:
            d = r.json()
            repos_r = await client.get(
                f"https://api.github.com/users/{username}/repos?per_page=5&sort=updated",
                headers={"User-Agent": "SOCMINT/2.0"},
                timeout=TIMEOUT,
            )
            repos = []
            if repos_r.status_code == 200:
                repos = [
                    {
                        "name": repo["name"],
                        "title": repo["name"],
                        "description": repo.get("description") or "",
                        "stars": repo.get("stargazers_count", 0),
                        "score": repo.get("stargazers_count", 0),
                        "url": repo["html_url"],
                    }
                    for repo in repos_r.json()[:5]
                ]
            return {
                "platform": "GitHub",
                "found": True,
                "url": d.get("html_url"),
                "display_name": d.get("name") or username,
                "bio": d.get("bio"),
                "location": d.get("location"),
                "followers": d.get("followers", 0),
                "following": d.get("following", 0),
                "public_repos": d.get("public_repos", 0),
                "avatar": d.get("avatar_url"),
                "created_at": d.get("created_at"),
                "posts": repos,
                "post_label": "repositories",
                "risk_signals": ["large_following"] if d.get("followers", 0) > 10000 else [],
            }
        return {"platform": "GitHub", "found": False, "url": f"https://github.com/{username}",
                "posts": [], "post_label": "repositories", "risk_signals": []}
    except Exception as e:
        return {"platform": "GitHub", "found": False, "url": f"https://github.com/{username}",
                "error": str(e), "posts": [], "post_label": "repositories", "risk_signals": []}


async def search_reddit(client: httpx.AsyncClient, username: str) -> dict:
    try:
        r = await client.get(
            f"https://www.reddit.com/user/{username}/about.json",
            headers={"User-Agent": "SOCMINT/1.0"},
            timeout=TIMEOUT,
        )
        if r.status_code == 200:
            d = r.json().get("data", {})
            posts_r = await client.get(
                f"https://www.reddit.com/user/{username}/submitted.json?limit=5",
                headers={"User-Agent": "SOCMINT/1.0"},
                timeout=TIMEOUT,
            )
            posts = []
            if posts_r.status_code == 200:
                children = posts_r.json().get("data", {}).get("children", [])
                posts = [
                    {
                        "title": p["data"].get("title", ""),
                        "subreddit": p["data"].get("subreddit", ""),
                        "score": p["data"].get("score", 0),
                        "url": f"https://reddit.com{p['data'].get('permalink', '')}",
                    }
                    for p in children[:5]
                ]
            created = d.get("created_utc")
            created_str = datetime.utcfromtimestamp(created).isoformat() if created else None
            return {
                "platform": "Reddit",
                "found": True,
                "url": f"https://reddit.com/u/{username}",
                "display_name": d.get("name", username),
                "bio": d.get("subreddit", {}).get("public_description"),
                "location": None,
                "followers": None,
                "karma": d.get("total_karma", 0),
                "post_karma": d.get("link_karma", 0),
                "comment_karma": d.get("comment_karma", 0),
                "created_at": created_str,
                "is_gold": d.get("is_gold", False),
                "posts": posts,
                "post_label": "posts",
                "risk_signals": ["high_karma"] if d.get("total_karma", 0) > 100000 else [],
            }
        return {"platform": "Reddit", "found": False, "url": f"https://reddit.com/u/{username}",
                "posts": [], "post_label": "posts", "risk_signals": []}
    except Exception as e:
        return {"platform": "Reddit", "found": False, "url": f"https://reddit.com/u/{username}",
                "error": str(e), "posts": [], "post_label": "posts", "risk_signals": []}


async def search_hackernews(client: httpx.AsyncClient, username: str) -> dict:
    try:
        r = await client.get(
            f"https://hacker-news.firebaseio.com/v0/user/{username}.json",
            timeout=TIMEOUT,
        )
        if r.status_code == 200 and r.json():
            d = r.json()
            created_str = datetime.utcfromtimestamp(d.get("created", 0)).isoformat()
            # Fetch top 5 submissions
            submitted = (d.get("submitted") or [])[:5]
            posts = []
            for item_id in submitted:
                try:
                    ir = await client.get(
                        f"https://hacker-news.firebaseio.com/v0/item/{item_id}.json",
                        timeout=5,
                    )
                    if ir.status_code == 200 and ir.json():
                        item = ir.json()
                        if item.get("title"):
                            posts.append({
                                "title": item.get("title", ""),
                                "url": item.get("url") or f"https://news.ycombinator.com/item?id={item_id}",
                                "score": item.get("score", 0),
                            })
                except Exception:
                    pass
            return {
                "platform": "HackerNews",
                "found": True,
                "url": f"https://news.ycombinator.com/user?id={username}",
                "display_name": username,
                "bio": d.get("about"),
                "location": None,
                "karma": d.get("karma", 0),
                "created_at": created_str,
                "posts": posts,
                "post_label": "submissions",
                "risk_signals": [],
            }
        return {"platform": "HackerNews", "found": False,
                "url": f"https://news.ycombinator.com/user?id={username}",
                "posts": [], "post_label": "submissions", "risk_signals": []}
    except Exception as e:
        return {"platform": "HackerNews", "found": False,
                "url": f"https://news.ycombinator.com/user?id={username}",
                "error": str(e), "posts": [], "post_label": "submissions", "risk_signals": []}


async def search_devto(client: httpx.AsyncClient, username: str) -> dict:
    try:
        r = await client.get(
            f"https://dev.to/api/users/by_username?url={username}",
            timeout=TIMEOUT,
        )
        if r.status_code == 200:
            d = r.json()
            articles_r = await client.get(
                f"https://dev.to/api/articles?username={username}&per_page=5",
                timeout=TIMEOUT,
            )
            posts = []
            if articles_r.status_code == 200:
                posts = [
                    {
                        "title": a.get("title", ""),
                        "url": a.get("url", ""),
                        "score": a.get("positive_reactions_count", 0),
                        "reactions": a.get("positive_reactions_count", 0),
                    }
                    for a in articles_r.json()[:5]
                ]
            return {
                "platform": "Dev.to",
                "found": True,
                "url": f"https://dev.to/{username}",
                "display_name": d.get("name", username),
                "bio": d.get("summary"),
                "location": d.get("location"),
                "followers": d.get("followers_count", 0),
                "avatar": d.get("profile_image"),
                "created_at": None,
                "posts": posts,
                "post_label": "articles",
                "risk_signals": [],
            }
        return {"platform": "Dev.to", "found": False, "url": f"https://dev.to/{username}",
                "posts": [], "post_label": "articles", "risk_signals": []}
    except Exception as e:
        return {"platform": "Dev.to", "found": False, "url": f"https://dev.to/{username}",
                "error": str(e), "posts": [], "post_label": "articles", "risk_signals": []}


async def search_gitlab(client: httpx.AsyncClient, username: str) -> dict:
    try:
        r = await client.get(
            f"https://gitlab.com/api/v4/users?username={username}",
            timeout=TIMEOUT,
        )
        if r.status_code == 200 and r.json():
            d = r.json()[0]
            return {
                "platform": "GitLab",
                "found": True,
                "url": d.get("web_url"),
                "display_name": d.get("name", username),
                "bio": d.get("bio"),
                "location": d.get("location"),
                "avatar": d.get("avatar_url"),
                "created_at": d.get("created_at"),
                "posts": [],
                "post_label": "repositories",
                "risk_signals": [],
            }
        return {"platform": "GitLab", "found": False, "url": f"https://gitlab.com/{username}",
                "posts": [], "post_label": "repositories", "risk_signals": []}
    except Exception as e:
        return {"platform": "GitLab", "found": False, "url": f"https://gitlab.com/{username}",
                "error": str(e), "posts": [], "post_label": "repositories", "risk_signals": []}


async def search_tumblr(client: httpx.AsyncClient, username: str) -> dict:
    TUMBLR_KEY = "fuiKNFp9vQFvjLNvx4sUwti4Yb5yGutBN4Xh10LXZhhRKjWlV4"
    try:
        r = await client.get(
            f"https://api.tumblr.com/v2/blog/{username}.tumblr.com/info?api_key={TUMBLR_KEY}",
            timeout=TIMEOUT,
        )
        if r.status_code == 200:
            d = r.json().get("response", {}).get("blog", {})
            if d:
                return {
                    "platform": "Tumblr",
                    "found": True,
                    "url": d.get("url"),
                    "display_name": d.get("title", username),
                    "bio": d.get("description"),
                    "location": None,
                    "followers": d.get("followers", 0),
                    "posts_count": d.get("posts", 0),
                    "created_at": None,
                    "posts": [],
                    "post_label": "posts",
                    "risk_signals": [],
                }
        return {"platform": "Tumblr", "found": False, "url": f"https://{username}.tumblr.com",
                "posts": [], "post_label": "posts", "risk_signals": []}
    except Exception as e:
        return {"platform": "Tumblr", "found": False, "url": f"https://{username}.tumblr.com",
                "error": str(e), "posts": [], "post_label": "posts", "risk_signals": []}


# ---------------------------------------------------------------------------
# TIER 2 — HTTP profile existence checks
# ---------------------------------------------------------------------------

async def search_linkedin(client: httpx.AsyncClient, username: str) -> dict:
    """
    LinkedIn returns HTTP 999 (anti-bot) for almost all requests regardless
    of whether the profile exists. The only reliable signal is:
    - status 200 + og:title present = profile exists (high-profile accounts only)
    - status 999 = cannot determine (LinkedIn blocks scraping)
    We return found=True only when we have a confirmed 200+og:title signal.
    """
    url = f"https://www.linkedin.com/in/{username}"
    try:
        r = await client.get(
            url,
            timeout=TIMEOUT,
            headers={"User-Agent": MOZILLA_UA},
            follow_redirects=True,
        )
        if r.status_code == 200 and "og:title" in r.text:
            return {
                "platform": "LinkedIn",
                "found": True,
                "url": url,
                "display_name": username,
                "bio": None,
                "location": None,
                "posts": [],
                "post_label": "posts",
                "risk_signals": [],
                "note": "Profile confirmed via public page",
            }
        # 999 or authwall — cannot confirm either way, report as not found
        return {
            "platform": "LinkedIn",
            "found": False,
            "url": url,
            "posts": [],
            "post_label": "posts",
            "risk_signals": [],
            "note": "LinkedIn blocks automated checks — manual verification required",
        }
    except Exception as e:
        return {
            "platform": "LinkedIn",
            "found": False,
            "url": url,
            "error": str(e),
            "posts": [],
            "post_label": "posts",
            "risk_signals": [],
        }


async def search_instagram(client: httpx.AsyncClient, username: str) -> dict:
    """
    Instagram blocks standard scraping. We use two signals:
    1. Body size heuristic: real profiles ~200-350KB, error/login pages ~500KB+
    2. Absence of error markers in a lightweight head request
    """
    url = f"https://www.instagram.com/{username}/"
    try:
        # Instagram mobile UA tends to return lighter, more reliable pages
        mobile_ua = (
            "Instagram 76.0.0.15.395 Android (24/7.0; 640dpi; 1440x2560; "
            "samsung; SM-G930F; herolte; samsungexynos8890; en_US; 138226743)"
        )
        r = await client.get(url, timeout=TIMEOUT, headers={"User-Agent": mobile_ua},
                             follow_redirects=True)

        if r.status_code != 200:
            return {"platform": "Instagram", "found": False, "url": url,
                    "posts": [], "post_label": "posts", "risk_signals": []}

        body = r.text
        body_len = len(body)

        # Not-found / error pages are significantly heavier (500KB+)
        # Real profile pages are lighter (~150–380KB)
        size_indicates_found = body_len < 420_000

        # Secondary check: error pages contain these strings, profile pages don't
        error_markers = [
            "PageNotFound",
            "page isn't available",
            "page not found",
            "isn\\'t available",
        ]
        has_error = any(m.lower() in body.lower() for m in error_markers)

        found = size_indicates_found and not has_error

        return {
            "platform": "Instagram",
            "found": found,
            "url": url,
            "display_name": username if found else None,
            "bio": None,
            "location": None,
            "posts": [],
            "post_label": "posts",
            "risk_signals": [],
        }
    except Exception as e:
        return {"platform": "Instagram", "found": False, "url": url,
                "error": str(e), "posts": [], "post_label": "posts", "risk_signals": []}


async def check_profile_exists(
    client: httpx.AsyncClient,
    platform: str,
    url: str,
    username: str,
    indicator: Optional[str] = None,
) -> dict:
    try:
        r = await client.get(
            url,
            timeout=TIMEOUT,
            headers={"User-Agent": MOZILLA_UA},
            follow_redirects=True,
        )
        found = r.status_code == 200
        if indicator:
            found = found and indicator in r.text
        return {
            "platform": platform,
            "found": found,
            "url": url,
            "display_name": username if found else None,
            "bio": None,
            "location": None,
            "posts": [],
            "post_label": "posts",
            "risk_signals": [],
        }
    except Exception as e:
        return {
            "platform": platform,
            "found": False,
            "url": url,
            "error": str(e),
            "posts": [],
            "post_label": "posts",
            "risk_signals": [],
        }


def _not_found(platform: str, url: str, post_label: str = "posts", note: Optional[str] = None) -> dict:
    result = {
        "platform": platform,
        "found": False,
        "url": url,
        "posts": [],
        "post_label": post_label,
        "risk_signals": [],
    }
    if note:
        result["note"] = note
    return result


async def check_profile_by_markers(
    client: httpx.AsyncClient,
    platform: str,
    url: str,
    username: str,
    positive_markers: Optional[list[str]] = None,
    negative_markers: Optional[list[str]] = None,
    post_label: str = "posts",
    note: Optional[str] = None,
) -> dict:
    """Generic public-page profile check with platform-specific marker hints."""
    positive_markers = positive_markers or []
    negative_markers = negative_markers or []
    try:
        r = await client.get(
            url,
            timeout=TIMEOUT,
            headers={"User-Agent": MOZILLA_UA},
            follow_redirects=True,
        )
        body = r.text.lower()
        found = r.status_code == 200
        if positive_markers:
            found = found and any(marker.lower() in body for marker in positive_markers)
        if negative_markers:
            found = found and not any(marker.lower() in body[:3000] for marker in negative_markers)

        return {
            "platform": platform,
            "found": found,
            "url": url,
            "display_name": username if found else None,
            "bio": None,
            "location": None,
            "posts": [],
            "post_label": post_label,
            "risk_signals": [],
            "note": note if found and note else None,
        }
    except Exception as e:
        result = _not_found(platform, url, post_label)
        result["error"] = str(e)
        return result


async def search_whatsapp_business(client: httpx.AsyncClient, phone: Optional[str]) -> dict:
    if not phone:
        return _not_found(
            "WhatsApp Business",
            "https://wa.me/",
            "business profiles",
            "Requires a phone pivot; unavailable during username-only scans",
        )
    digits = "".join(ch for ch in phone if ch.isdigit())
    if len(digits) == 10:
        digits = "91" + digits
    url = f"https://wa.me/{digits}"
    return await check_profile_by_markers(
        client,
        "WhatsApp Business",
        url,
        digits,
        positive_markers=["whatsapp"],
        negative_markers=["phone number shared via url is invalid"],
        post_label="business profiles",
        note="Public wa.me page exists; verify manually inside WhatsApp Business",
    )


# ---------------------------------------------------------------------------
# India-specific platforms
# ---------------------------------------------------------------------------

async def search_facebook(client: httpx.AsyncClient, username: str) -> dict:
    url = f"https://www.facebook.com/{username}"
    try:
        r = await client.get(url, timeout=TIMEOUT, headers={"User-Agent": MOZILLA_UA},
                             follow_redirects=True)
        # Facebook redirects to login for private profiles but returns 200 for public ones
        found = r.status_code == 200 and "og:title" in r.text and "page not found" not in r.text.lower()
        display_name = None
        if found:
            import re as _re
            m = _re.search(r'og:title"\s+content="([^"]+)"', r.text)
            display_name = m.group(1) if m else username
        return {
            "platform": "Facebook",
            "found": found,
            "url": url,
            "display_name": display_name,
            "bio": None,
            "location": None,
            "posts": [],
            "post_label": "posts",
            "risk_signals": [],
        }
    except Exception as e:
        return {"platform": "Facebook", "found": False, "url": url,
                "error": str(e), "posts": [], "post_label": "posts", "risk_signals": []}


async def search_sharechat(client: httpx.AsyncClient, username: str) -> dict:
    url = f"https://sharechat.com/profile/{username}"
    try:
        r = await client.get(url, timeout=TIMEOUT, headers={"User-Agent": MOZILLA_UA},
                             follow_redirects=True)
        found = r.status_code == 200 and "sharechat" in r.text.lower() and "404" not in r.text[:500]
        return {
            "platform": "ShareChat",
            "found": found,
            "url": url,
            "display_name": username if found else None,
            "bio": None,
            "location": None,
            "posts": [],
            "post_label": "posts",
            "risk_signals": [],
            "note": "India-specific social platform" if found else None,
        }
    except Exception as e:
        return {"platform": "ShareChat", "found": False, "url": url,
                "error": str(e), "posts": [], "post_label": "posts", "risk_signals": []}


async def search_koo(client: httpx.AsyncClient, username: str) -> dict:
    url = f"https://www.kooapp.com/profile/{username}"
    try:
        r = await client.get(url, timeout=TIMEOUT, headers={"User-Agent": MOZILLA_UA},
                             follow_redirects=True)
        found = r.status_code == 200 and "koo" in r.text.lower() and "not found" not in r.text.lower()[:500]
        return {
            "platform": "Koo",
            "found": found,
            "url": url,
            "display_name": username if found else None,
            "bio": None,
            "location": None,
            "posts": [],
            "post_label": "posts",
            "risk_signals": [],
            "note": "Indian microblogging platform" if found else None,
        }
    except Exception as e:
        return {"platform": "Koo", "found": False, "url": url,
                "error": str(e), "posts": [], "post_label": "posts", "risk_signals": []}


async def search_discord(client: httpx.AsyncClient, username: str) -> dict:
    url = f"https://discord.com/users/{username}"
    try:
        r = await client.get(
            f"https://discordapp.com/api/v9/users/{username}",
            timeout=TIMEOUT,
            headers={"User-Agent": MOZILLA_UA},
        )
        found = r.status_code == 200
        data = r.json() if found else {}
        return {
            "platform": "Discord",
            "found": found,
            "url": url,
            "display_name": data.get("username", username) if found else None,
            "bio": data.get("bio"),
            "avatar": f"https://cdn.discordapp.com/avatars/{data.get('id')}/{data.get('avatar')}.png" if data.get("avatar") else None,
            "location": None,
            "posts": [],
            "post_label": "messages",
            "risk_signals": [],
        }
    except Exception as e:
        return {"platform": "Discord", "found": False, "url": url,
                "error": str(e), "posts": [], "post_label": "messages", "risk_signals": []}


async def search_joshmoj(client: httpx.AsyncClient, username: str) -> dict:
    url = f"https://share.myjosh.in/profile/{username}"
    try:
        r = await client.get(url, timeout=TIMEOUT, headers={"User-Agent": MOZILLA_UA},
                             follow_redirects=True)
        body = r.text.lower()
        found = (
            r.status_code == 200
            and "josh_profile_confirmed_marker" in body
            and "not found" not in body[:3000]
            and "404" not in body[:3000]
        )
        return {
            "platform": "Josh/Moj",
            "found": found,
            "url": url,
            "display_name": username if found else None,
            "bio": None,
            "location": None,
            "posts": [],
            "post_label": "videos",
            "risk_signals": [],
            "note": "Indian short video platform" if found else None,
        }
    except Exception as e:
        return {"platform": "Josh/Moj", "found": False, "url": url,
                "error": str(e), "posts": [], "post_label": "videos", "risk_signals": []}


# ---------------------------------------------------------------------------
# Metadata extraction helper
# ---------------------------------------------------------------------------

import re as _re

# Script detection patterns for Indian languages
_DEVANAGARI = _re.compile(r'[\u0900-\u097F]')     # Hindi, Marathi
_KANNADA    = _re.compile(r'[\u0C80-\u0CFF]')     # Kannada
_TAMIL      = _re.compile(r'[\u0B80-\u0BFF]')     # Tamil
_TELUGU     = _re.compile(r'[\u0C00-\u0C7F]')     # Telugu
_BENGALI    = _re.compile(r'[\u0980-\u09FF]')     # Bengali


def extract_metadata(platform_result: dict) -> dict:
    """Extract metadata from a platform result dict."""
    meta = {
        "languages_detected": [],
        "locations_mentioned": [],
        "posting_frequency": "unknown",
        "account_age_days": None,
    }

    if not platform_result.get("found"):
        return meta

    # Language detection from bio + posts
    bio = platform_result.get("bio") or ""
    posts = platform_result.get("posts") or []
    all_text = bio + " " + " ".join(
        str(p.get("title", "")) + " " + str(p.get("description", ""))
        for p in posts
    )

    if _DEVANAGARI.search(all_text):
        meta["languages_detected"].append("Hindi/Devanagari")
    if _KANNADA.search(all_text):
        meta["languages_detected"].append("Kannada")
    if _TAMIL.search(all_text):
        meta["languages_detected"].append("Tamil")
    if _TELUGU.search(all_text):
        meta["languages_detected"].append("Telugu")
    if _BENGALI.search(all_text):
        meta["languages_detected"].append("Bengali")

    # Location from platform data
    loc = platform_result.get("location")
    if loc:
        meta["locations_mentioned"].append(loc)

    # Account age
    created = platform_result.get("created_at")
    if created:
        try:
            created_dt = datetime.fromisoformat(created.replace("Z", "+00:00").replace("+00:00", ""))
            meta["account_age_days"] = (datetime.utcnow() - created_dt).days
        except Exception:
            pass

    # Posting frequency heuristic
    post_count = len(posts)
    repos = platform_result.get("public_repos", 0) or 0
    total = post_count + repos
    if total >= 5:
        meta["posting_frequency"] = "active"
    elif total >= 2:
        meta["posting_frequency"] = "moderate"
    elif total >= 1:
        meta["posting_frequency"] = "low"
    else:
        meta["posting_frequency"] = "dormant"

    return meta


# ---------------------------------------------------------------------------
# News search
# ---------------------------------------------------------------------------

async def search_news(client: httpx.AsyncClient, query: str) -> list:
    """Search NewsAPI for mentions. Returns list of article dicts."""
    try:
        r = await client.get(
            "https://newsapi.org/v2/everything",
            params={
                "q": query,
                "pageSize": 10,
                "sortBy": "relevancy",
                "language": "en",
                "apiKey": "demo",
            },
            timeout=TIMEOUT,
        )
        if r.status_code == 200:
            articles = r.json().get("articles", [])
            return [
                {
                    "title": a.get("title", ""),
                    "source": a.get("source", {}).get("name", ""),
                    "url": a.get("url", ""),
                    "publishedAt": a.get("publishedAt", ""),
                    "description": a.get("description", ""),
                }
                for a in articles[:10]
                if a.get("title") and "[Removed]" not in (a.get("title") or "")
            ]
    except Exception:
        pass
    return []


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------

async def run_all_platforms(
    username: Optional[str] = None,
    real_name: Optional[str] = None,
    phone: Optional[str] = None,
    email: Optional[str] = None,
) -> list:
    if not username and email and "@" in email:
        username = email.split("@", 1)[0].split("+", 1)[0].replace(".", "")
    if not username and real_name:
        username = "".join(ch for ch in real_name.lower() if ch.isalnum())
    query = username or real_name or ""

    async with httpx.AsyncClient(follow_redirects=True) as client:
        tasks = []

        if username:
            # --- TIER 1: API-based ---
            tasks.append(search_github(client, username))
            tasks.append(search_reddit(client, username))
            tasks.append(search_hackernews(client, username))
            tasks.append(search_devto(client, username))
            tasks.append(search_gitlab(client, username))
            tasks.append(search_tumblr(client, username))

            # --- TIER 2: HTTP checks ---
            tasks.append(check_profile_exists(
                client, "Twitter/X", f"https://twitter.com/{username}", username, "profile_image_url"))
            tasks.append(search_instagram(client, username))
            tasks.append(check_profile_exists(
                client, "TikTok", f"https://www.tiktok.com/@{username}", username))
            tasks.append(search_linkedin(client, username))
            tasks.append(check_profile_exists(
                client, "Telegram", f"https://t.me/{username}", username, "tgme_page_title"))
            tasks.append(check_profile_exists(
                client, "Snapchat", f"https://www.snapchat.com/add/{username}", username))
            tasks.append(check_profile_exists(
                client, "YouTube", f"https://www.youtube.com/@{username}", username, "channelId"))
            tasks.append(check_profile_exists(
                client, "Quora", f"https://www.quora.com/profile/{username}", username))
            tasks.append(check_profile_exists(
                client, "Pastebin", f"https://pastebin.com/u/{username}", username))
            tasks.append(check_profile_by_markers(
                client, "Pinterest", f"https://www.pinterest.com/{username}/", username,
                positive_markers=["pinterest_profile_confirmed_marker"], negative_markers=["page not found", "not found", "couldn't find"],
                note="Pinterest is JS-heavy; manual verification may be required"))
            tasks.append(check_profile_by_markers(
                client, "Medium", f"https://medium.com/@{username}", username,
                positive_markers=["medium"], negative_markers=["404", "page not found"]))
            tasks.append(check_profile_by_markers(
                client, "Steam", f"https://steamcommunity.com/id/{username}", username,
                positive_markers=["steam", username], negative_markers=["specified profile could not be found", "error", "not found"]))

            # --- India-specific platforms ---
            tasks.append(search_facebook(client, username))
            tasks.append(search_sharechat(client, username))
            tasks.append(search_koo(client, username))
            tasks.append(search_discord(client, username))
            tasks.append(search_joshmoj(client, username))
            tasks.append(check_profile_by_markers(
                client, "Meesho", f"https://www.meesho.com/{username}", username,
                positive_markers=["meesho"], negative_markers=["page not found", "not found"],
                note="India-specific e-commerce seller/profile page"))
            tasks.append(check_profile_by_markers(
                client, "OLX India", f"https://www.olx.in/profile/{username}", username,
                positive_markers=["olx"], negative_markers=["not found", "404"],
                note="India classified listing profile"))
            tasks.append(check_profile_by_markers(
                client, "Naukri.com", f"https://www.naukri.com/mnjuser/profile?id={username}", username,
                positive_markers=["naukri"], negative_markers=["not found", "login"],
                note="Employment profile requires manual verification when gated"))
            tasks.append(check_profile_by_markers(
                client, "JioCinema", f"https://www.jiocinema.com/profile/{username}", username,
                positive_markers=["jiocinema_profile_confirmed_marker"], negative_markers=["not found", "404"],
                note="India-specific entertainment profile"))
            tasks.append(check_profile_by_markers(
                client, "MX TakaTak", f"https://www.mxtakatak.com/profile/{username}", username,
                positive_markers=["mxtakatak", "mx takatak"], negative_markers=["not found", "404"],
                note="Indian short-video profile"))
            tasks.append(check_profile_by_markers(
                client, "Roposo", f"https://www.roposo.com/profile/{username}", username,
                positive_markers=["roposo"], negative_markers=["not found", "404"],
                note="Indian short-video profile"))

        tasks.append(search_whatsapp_business(client, phone))

        results = await asyncio.gather(*tasks, return_exceptions=True)

        platform_results = []
        for r in results:
            if isinstance(r, Exception):
                continue
            if isinstance(r, dict):
                # Attach metadata to each found result
                r["metadata"] = extract_metadata(r)
                platform_results.append(r)

        seen = {p.get("platform") for p in platform_results}
        for platform_name in ALL_PLATFORM_NAMES:
            if platform_name not in seen:
                placeholder = _not_found(
                    platform_name,
                    "",
                    note="No automated check available for this pivot",
                )
                placeholder["metadata"] = extract_metadata(placeholder)
                platform_results.append(placeholder)

        platform_results.sort(key=lambda p: ALL_PLATFORM_NAMES.index(p["platform"]) if p.get("platform") in ALL_PLATFORM_NAMES else 999)
        return platform_results
