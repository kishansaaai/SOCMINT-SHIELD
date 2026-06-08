"""
Identity Search — Find all social profiles belonging to a real person
given their name + college/organization.

Pipeline:
  1. Build Google dork queries + username candidates from the name
  2. Run searches concurrently (Google CSE → DuckDuckGo fallback)
  3. Classify each result URL into a platform profile
  4. Fetch profile details for high-value hits
  5. Score each candidate against name/org/city
  6. Run direct username checks via existing run_all_platforms()
  7. Merge, deduplicate, sort by confidence
"""

import asyncio
import os
import re
import time
from typing import Optional
from urllib.parse import urlparse, quote_plus, urlencode

import httpx
from bs4 import BeautifulSoup

from platforms import (
    search_github, search_reddit, search_hackernews,
    search_devto, search_gitlab, TIMEOUT, MOZILLA_UA,
)

# ── Env vars ──────────────────────────────────────────────────────────────────
GOOGLE_API_KEY = os.getenv("GOOGLE_CSE_API_KEY", "")
GOOGLE_CX      = os.getenv("GOOGLE_CSE_CX", "")

# ─────────────────────────────────────────────────────────────────────────────
# STEP 1 — Query & Username Builder
# ─────────────────────────────────────────────────────────────────────────────

def build_queries(
    full_name: str,
    organization: str,
    city: Optional[str] = None,
    year: Optional[str] = None,
) -> dict:
    parts   = full_name.strip().split()
    first   = parts[0].lower()  if parts      else ""
    last    = parts[-1].lower() if len(parts) > 1 else ""
    mid     = parts[1].lower()  if len(parts) > 2 else ""
    initials = "".join(p[0].lower() for p in parts)
    org     = organization.strip()

    # Abbreviation: "PES University" → "PES", "IIT Bombay" → "IIT"
    org_words  = org.split()
    org_abbrev = "".join(w[0].upper() for w in org_words if w[0].isupper()) or org_words[0]
    org_short  = org_words[0] if org_words else org

    fn  = full_name
    q   = []

    # --- Site-specific dorks ---
    q.append(f'"{fn}" "{org}" site:linkedin.com/in')
    q.append(f'"{fn}" "{org}" site:github.com')
    q.append(f'"{fn}" "{org}" site:twitter.com OR site:x.com')
    q.append(f'"{fn}" "{org}" site:instagram.com')
    q.append(f'"{fn}" "{org}" site:reddit.com')
    q.append(f'"{fn}" "{org}" site:dev.to')

    # --- Broader dorks ---
    q.append(f'"{fn}" "{org}" developer profile')
    q.append(f'"{fn}" "{org}" github linkedin')
    q.append(f'{fn} {org} social media profile')
    q.append(f'"{fn}" {org_abbrev} developer')

    # --- With optional filters ---
    if city:
        q.append(f'"{fn}" "{org}" "{city}"')
        q.append(f'{fn} {org} {city} profile')
    if year:
        q.append(f'"{fn}" "{org}" "{year}"')
        q.append(f'"{fn}" batch {year} {org_short}')

    # --- Name variant dorks ---
    if first and last:
        q.append(f'"{first} {last}" "{org}" site:github.com')
        q.append(f'"{first} {last}" "{org}" site:linkedin.com/in')

    # ── Username candidates ────────────────────────────────────────────────
    usernames = set()

    def add(*u_list):
        for u in u_list:
            cleaned = re.sub(r"[^a-z0-9._-]", "", u.lower())
            if cleaned and len(cleaned) >= 3:
                usernames.add(cleaned)

    if first and last:
        add(
            f"{first}{last}",
            f"{first}_{last}",
            f"{first}.{last}",
            f"{last}{first}",
            f"{last}_{first}",
            f"{first}-{last}",
            f"{initials}{last}",
            f"{first[0]}{last}",
            f"{first}{last[0]}",
        )
        if mid:
            add(f"{first}{mid}{last}", f"{first}_{mid}_{last}", f"{first}{mid[0]}{last}")

        # With year suffix
        if year:
            yy = year[-2:]
            add(
                f"{first}{last}{yy}",
                f"{first}{last}{year}",
                f"{first}_{last}{yy}",
                f"{first}_{last}_{yy}",
            )
        # With org abbreviation suffix
        add(
            f"{first}{last}_{org_abbrev.lower()}",
            f"{first}_{last}_{org_abbrev.lower()}",
            f"{first}{last}{org_short.lower()[:3]}",
        )

    return {"queries": q, "usernames": sorted(usernames)}


# ─────────────────────────────────────────────────────────────────────────────
# STEP 2 — Search Engines
# ─────────────────────────────────────────────────────────────────────────────

async def search_google_cse(client: httpx.AsyncClient, query: str) -> list:
    """Google Custom Search Engine — requires API key + CX id."""
    if not GOOGLE_API_KEY or not GOOGLE_CX:
        return []
    try:
        params = {"q": query, "key": GOOGLE_API_KEY, "cx": GOOGLE_CX, "num": 10}
        r = await client.get(
            "https://www.googleapis.com/customsearch/v1",
            params=params,
            timeout=10,
        )
        if r.status_code == 200:
            items = r.json().get("items", [])
            return [
                {
                    "title":   i.get("title", ""),
                    "link":    i.get("link", ""),
                    "snippet": i.get("snippet", ""),
                }
                for i in items
            ]
    except Exception:
        pass
    return []


async def search_duckduckgo(client: httpx.AsyncClient, query: str) -> list:
    """DuckDuckGo HTML scrape — no API key required, works as fallback."""
    try:
        r = await client.post(
            "https://html.duckduckgo.com/html/",
            data={"q": query},
            headers={
                "User-Agent": MOZILLA_UA,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            timeout=12,
            follow_redirects=True,
        )
        if r.status_code != 200:
            return []
        soup   = BeautifulSoup(r.text, "lxml")
        results = []
        for a in soup.select("a.result__a")[:10]:
            href = a.get("href", "")
            # DuckDuckGo wraps real URLs in redirect links — extract uddg param
            if "uddg=" in href:
                try:
                    from urllib.parse import parse_qs, urlparse as up
                    uddg = parse_qs(up(href).query).get("uddg", [href])[0]
                    href = uddg
                except Exception:
                    pass
            title   = a.get_text(strip=True)
            snippet_el = a.find_parent("div", class_="result__body")
            snippet = ""
            if snippet_el:
                snip_tag = snippet_el.find("a", class_="result__snippet")
                if snip_tag:
                    snippet = snip_tag.get_text(strip=True)
            results.append({"title": title, "link": href, "snippet": snippet})
        return results
    except Exception:
        return []


async def run_query(client: httpx.AsyncClient, query: str) -> list:
    """Try Google CSE first, fall back to DuckDuckGo."""
    if GOOGLE_API_KEY and GOOGLE_CX:
        results = await search_google_cse(client, query)
        if results:
            return results
    return await search_duckduckgo(client, query)


# ─────────────────────────────────────────────────────────────────────────────
# STEP 3 — URL Classifier
# ─────────────────────────────────────────────────────────────────────────────

PLATFORM_PATTERNS = [
    # (regex on full URL, platform name, username group index)
    (r"linkedin\.com/in/([^/?&#]+)",              "LinkedIn",   1),
    (r"github\.com/([^/?&#]+)$",                  "GitHub",     1),
    (r"github\.com/([^/?&#]+)(?:/[^/?&#]+)?$",   "GitHub",     1),
    (r"(?:twitter|x)\.com/([^/?&#]+)$",           "Twitter/X",  1),
    (r"instagram\.com/([^/?&#]+)/?$",             "Instagram",  1),
    (r"reddit\.com/(?:u|user)/([^/?&#]+)",        "Reddit",     1),
    (r"youtube\.com/@([^/?&#]+)",                 "YouTube",    1),
    (r"youtube\.com/user/([^/?&#]+)",             "YouTube",    1),
    (r"dev\.to/([^/?&#]+)$",                      "Dev.to",     1),
    (r"medium\.com/@([^/?&#]+)",                  "Medium",     1),
    (r"t\.me/([^/?&#]+)$",                        "Telegram",   1),
    (r"gitlab\.com/([^/?&#]+)$",                  "GitLab",     1),
    (r"stackoverflow\.com/users/\d+/([^/?&#]+)",  "StackOverflow", 1),
    (r"hackerrank\.com/([^/?&#]+)$",              "HackerRank", 1),
    (r"leetcode\.com/([^/?&#]+)/?$",              "LeetCode",   1),
    (r"codechef\.com/users/([^/?&#]+)",           "CodeChef",   1),
    (r"codeforces\.com/profile/([^/?&#]+)",       "Codeforces", 1),
    (r"kaggle\.com/([^/?&#]+)$",                  "Kaggle",     1),
    (r"behance\.net/([^/?&#]+)$",                 "Behance",    1),
    (r"dribbble\.com/([^/?&#]+)$",                "Dribbble",   1),
]

# URLs that look like profiles but are org/topic pages
EXCLUDE_PATTERNS = [
    r"github\.com/(orgs|topics|explore|trending|marketplace|sponsors|about|features)",
    r"linkedin\.com/(company|school|jobs|learning)",
    r"twitter\.com/(search|hashtag|i/|explore)",
    r"instagram\.com/(p/|explore/|reel/)",
    r"reddit\.com/r/",
    r"youtube\.com/(channel/UC|watch|playlist|feed)",
]


def classify_url(url: str, title: str = "", snippet: str = "") -> Optional[dict]:
    """Return platform profile dict if URL is a social profile, else None."""
    if not url or not url.startswith("http"):
        return None

    # Reject obvious non-profile URLs
    for excl in EXCLUDE_PATTERNS:
        if re.search(excl, url, re.I):
            return None

    for pattern, platform, grp in PLATFORM_PATTERNS:
        m = re.search(pattern, url, re.I)
        if m:
            username = m.group(grp).rstrip("/")
            # Skip if username looks like a path segment (contains /)
            if "/" in username:
                continue
            # Skip very generic usernames
            if username.lower() in ("home", "about", "contact", "search", "login", "signup"):
                continue
            return {
                "platform": platform,
                "url":      url,
                "username": username,
                "title":    title,
                "snippet":  snippet,
            }
    return None


def normalize_url(url: str) -> str:
    """Strip trailing slash, query params, fragments for dedup."""
    try:
        p = urlparse(url)
        return f"{p.scheme}://{p.netloc}{p.path.rstrip('/')}"
    except Exception:
        return url.rstrip("/")


# ─────────────────────────────────────────────────────────────────────────────
# STEP 4 — Profile Fetcher
# ─────────────────────────────────────────────────────────────────────────────

async def fetch_og_tags(client: httpx.AsyncClient, url: str) -> dict:
    """Fetch og:title, og:description, og:image from a URL."""
    try:
        r = await client.get(url, headers={"User-Agent": MOZILLA_UA},
                              timeout=8, follow_redirects=True)
        if r.status_code != 200:
            return {}
        soup = BeautifulSoup(r.text, "lxml")
        def og(prop):
            tag = soup.find("meta", property=prop) or soup.find("meta", attrs={"name": prop})
            return tag.get("content", "").strip() if tag else ""
        return {
            "og_title":       og("og:title"),
            "og_description": og("og:description"),
            "og_image":       og("og:image"),
        }
    except Exception:
        return {}


PLATFORM_FETCHERS = {
    "GitHub":  search_github,
    "Reddit":  search_reddit,
    "Dev.to":  search_devto,
    "GitLab":  search_gitlab,
}


async def fetch_profile_details(client: httpx.AsyncClient, candidate: dict) -> dict:
    """Enrich candidate with fetched profile data."""
    platform = candidate.get("platform", "")
    username = candidate.get("username", "")
    fetcher  = PLATFORM_FETCHERS.get(platform)

    if fetcher and username:
        try:
            data = await fetcher(client, username)
            if data.get("found"):
                candidate.update({
                    "display_name": data.get("display_name") or candidate.get("username"),
                    "bio":          data.get("bio"),
                    "location":     data.get("location"),
                    "followers":    data.get("followers"),
                    "avatar":       data.get("avatar"),
                    "created_at":   data.get("created_at"),
                    "fetched":      True,
                })
                return candidate
        except Exception:
            pass

    # Fallback: OG tags
    og = await fetch_og_tags(client, candidate["url"])
    if og.get("og_title"):
        candidate.update({
            "display_name": og["og_title"],
            "bio":          og.get("og_description"),
            "avatar":       og.get("og_image"),
            "fetched":      True,
        })
    return candidate


# ─────────────────────────────────────────────────────────────────────────────
# STEP 5 — Confidence Scorer
# ─────────────────────────────────────────────────────────────────────────────

def _name_tokens(name: str) -> set:
    return {t.lower() for t in re.split(r"[\s._\-@]+", name) if len(t) > 1}


def score_candidate(
    candidate: dict,
    full_name: str,
    organization: str,
    city: Optional[str] = None,
    all_candidates: Optional[list] = None,
) -> dict:
    score   = 0
    reasons = []

    name_tokens = _name_tokens(full_name)
    first       = full_name.strip().split()[0].lower()
    last        = full_name.strip().split()[-1].lower()
    org_lower   = organization.lower()

    # Texts to search
    display    = (candidate.get("display_name") or "").lower()
    bio        = (candidate.get("bio") or "").lower()
    snippet    = (candidate.get("snippet") or "").lower()
    title      = (candidate.get("title") or "").lower()
    username   = (candidate.get("username") or "").lower()
    all_text   = f"{display} {bio} {snippet} {title} {username}"

    # ── Name match ─────────────────────────────────────────────────────────
    display_tokens = _name_tokens(display)
    if name_tokens and name_tokens.issubset(display_tokens):
        score += 35
        reasons.append("Exact name match in profile")
    elif first in all_text and last in all_text:
        score += 28
        reasons.append("Full name found in profile")
    elif first in username and last in username:
        score += 25
        reasons.append("Name in username")
    elif first in username or last in username:
        score += 15
        reasons.append("Partial name in username")
    elif first in all_text or last in all_text:
        score += 10
        reasons.append("Partial name match")

    # ── Organization match ─────────────────────────────────────────────────
    org_words = [w.lower() for w in organization.split() if len(w) > 2]
    org_abbrev = "".join(w[0].upper() for w in organization.split() if w[0].isupper())
    if org_lower in all_text:
        score += 25
        reasons.append(f"{organization} mentioned in profile")
    elif any(w in all_text for w in org_words if len(w) > 3):
        score += 15
        reasons.append(f"Organization keyword found")
    elif org_abbrev.lower() in all_text and len(org_abbrev) >= 2:
        score += 10
        reasons.append(f"{org_abbrev} abbreviation found")

    # ── City match ─────────────────────────────────────────────────────────
    if city and city.lower() in all_text:
        score += 10
        reasons.append(f"City '{city}' matches")

    # ── Activity signals ───────────────────────────────────────────────────
    followers = candidate.get("followers") or 0
    repos     = candidate.get("public_repos") or 0
    karma     = candidate.get("karma") or 0
    if followers > 10 or repos > 2 or karma > 100:
        score += 10
        reasons.append("Active account with followers/activity")

    # ── New account penalty ────────────────────────────────────────────────
    created = candidate.get("created_at")
    if created:
        try:
            from datetime import datetime
            dt   = datetime.fromisoformat(created.replace("Z", ""))
            days = (datetime.utcnow() - dt).days
            if days < 30:
                score -= 10
                reasons.append("⚠ Very new account (< 30 days)")
        except Exception:
            pass

    # ── Cross-platform username match ──────────────────────────────────────
    if all_candidates and username:
        same_username = [
            c for c in all_candidates
            if c.get("username", "").lower() == username
            and c.get("platform") != candidate.get("platform")
        ]
        if same_username:
            score += 15
            reasons.append(f"Same username on {len(same_username)+1} platforms")

    score = max(0, min(100, score))

    if score >= 70:
        level = "HIGH"
    elif score >= 40:
        level = "MEDIUM"
    else:
        level = "LOW"

    candidate["confidence_score"] = score
    candidate["confidence_level"] = level
    candidate["match_reasons"]    = reasons
    return candidate


# ─────────────────────────────────────────────────────────────────────────────
# MAIN ORCHESTRATOR
# ─────────────────────────────────────────────────────────────────────────────

async def identity_search(
    full_name: str,
    organization: str,
    city: Optional[str] = None,
    year: Optional[str] = None,
) -> dict:
    start = time.time()

    built     = build_queries(full_name, organization, city, year)
    queries   = built["queries"]
    usernames = built["usernames"]

    seen_urls:  set  = set()
    candidates: list = []

    async with httpx.AsyncClient(follow_redirects=True) as client:

        # ── Phase 1: Run all search queries concurrently ──────────────────
        search_tasks = [run_query(client, q) for q in queries]
        search_results_all = await asyncio.gather(*search_tasks, return_exceptions=True)

        # Flatten + classify
        raw_candidates = []
        for results in search_results_all:
            if isinstance(results, Exception) or not results:
                continue
            for item in results:
                url  = item.get("link", "")
                norm = normalize_url(url)
                if not norm or norm in seen_urls:
                    continue
                classified = classify_url(url, item.get("title", ""), item.get("snippet", ""))
                if classified:
                    seen_urls.add(norm)
                    raw_candidates.append(classified)

        # ── Phase 2: Fetch profile details for top candidates ─────────────
        # Fetch all in parallel (cap at 20 to avoid hammering)
        fetch_tasks = [
            fetch_profile_details(client, c)
            for c in raw_candidates[:20]
        ]
        fetched = await asyncio.gather(*fetch_tasks, return_exceptions=True)
        for item in fetched:
            if isinstance(item, dict):
                candidates.append(item)

        # ── Phase 3: Direct username checks ───────────────────────────────
        # Import here to avoid circular import at module load time
        from platforms import run_all_platforms

        # Run up to 6 most-likely usernames concurrently
        priority_usernames = _rank_usernames(usernames, full_name)[:6]
        username_tasks = [
            run_all_platforms(username=u)
            for u in priority_usernames
        ]
        username_results_all = await asyncio.gather(*username_tasks, return_exceptions=True)

        username_candidates = []
        for u_idx, platform_list in enumerate(username_results_all):
            if isinstance(platform_list, Exception):
                continue
            checked_username = priority_usernames[u_idx]
            for p in platform_list:
                if not p.get("found"):
                    continue
                profile_url  = p.get("url", "")
                norm         = normalize_url(profile_url)
                if norm in seen_urls:
                    # Already found via search — enrich existing candidate
                    for c in candidates:
                        if normalize_url(c.get("url", "")) == norm:
                            c.update({k: v for k, v in p.items() if v and k not in c})
                    continue
                seen_urls.add(norm)
                username_candidates.append({
                    "platform":    p["platform"],
                    "url":         profile_url,
                    "username":    p.get("display_name") or checked_username,
                    "display_name": p.get("display_name"),
                    "bio":         p.get("bio"),
                    "location":    p.get("location"),
                    "followers":   p.get("followers"),
                    "avatar":      p.get("avatar"),
                    "created_at":  p.get("created_at"),
                    "title":       "",
                    "snippet":     "",
                    "source":      "direct_username_check",
                    "checked_username": checked_username,
                })

        all_candidates = candidates + username_candidates

    # ── Phase 4: Score all candidates ─────────────────────────────────────
    scored = []
    for c in all_candidates:
        scored.append(
            score_candidate(c, full_name, organization, city, all_candidates=all_candidates)
        )

    # Sort by score desc
    scored.sort(key=lambda x: x.get("confidence_score", 0), reverse=True)
    top = scored[:15]

    elapsed = round(time.time() - start, 2)
    return {
        "query": {
            "full_name":    full_name,
            "organization": organization,
            "city":         city,
            "year":         year,
        },
        "candidates":      top,
        "username_candidates_checked": priority_usernames,
        "total_found":     len(top),
        "elapsed_seconds": elapsed,
    }


def _rank_usernames(usernames: list, full_name: str) -> list:
    """Put most-likely username variants first."""
    parts = full_name.strip().lower().split()
    first = parts[0] if parts else ""
    last  = parts[-1] if len(parts) > 1 else ""

    def priority(u):
        # Exact first+last concat first
        if u == f"{first}{last}" or u == f"{first}_{last}":
            return 0
        if first in u and last in u:
            return 1
        if first in u or last in u:
            return 2
        return 3

    return sorted(usernames, key=priority)
