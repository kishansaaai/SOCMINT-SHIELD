import asyncio
import os
import httpx
from typing import Optional
from datetime import datetime
from bs4 import BeautifulSoup
import json
import re

TIMEOUT = 12
MOZILLA_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

# Load Sherlock platform database
SHERLOCK_DATA = {}
try:
    sherlock_path = os.path.join(os.path.dirname(__file__), "sherlock_data.json")
    if os.path.exists(sherlock_path):
        with open(sherlock_path, "r", encoding="utf-8") as f:
            SHERLOCK_DATA = json.load(f)
except Exception as e:
    print("Warning: Failed to load Sherlock database:", e)


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
# Sherlock Integration
# ---------------------------------------------------------------------------

async def check_sherlock_site(client: httpx.AsyncClient, site_name: str, site_data: dict, username: str) -> Optional[dict]:
    # Check regex if present
    regex = site_data.get("regexCheck")
    if regex:
        try:
            if not re.match(regex, username):
                return None
        except Exception:
            pass

    # Use urlProbe if present, otherwise url
    url_template = site_data.get("urlProbe") or site_data.get("url")
    if not url_template:
        return None

    async def probe_username(user: str) -> tuple[bool, Optional[httpx.Response]]:
        url = url_template.replace("{}", user)
        # Some sites use POST
        method = site_data.get("request_method", "GET")
        payload = site_data.get("request_payload")
        if payload:
            try:
                payload_str = json.dumps(payload).replace("{}", user)
                payload = json.loads(payload_str)
            except Exception:
                pass

        headers = site_data.get("headers", {})
        if "User-Agent" not in headers:
            headers["User-Agent"] = MOZILLA_UA

        try:
            if method == "POST":
                r = await client.post(url, json=payload, headers=headers, timeout=10, follow_redirects=True)
            else:
                r = await client.get(url, headers=headers, timeout=10, follow_redirects=True)

            if r.status_code != 200:  # Require exactly 200 OK
                return False, r

            # Helper to detect CAPTCHA/bot mitigation walls
            def is_bot_blocked(body_text: str) -> bool:
                body_lower = body_text.lower()
                blocked_markers = [
                    "recaptcha",
                    "hcaptcha",
                    "cloudflare-nginx",
                    "cf-challenge",
                    "captcha-delivery",
                    "distilnetworks",
                    "px-captcha",
                    "shield.net",
                    "please enable cookies and reload the page",
                    "ddos protection",
                    "robot check",
                ]
                return any(marker in body_lower for marker in blocked_markers)

            if is_bot_blocked(r.text):
                return False, r

            error_type = site_data.get("errorType")
            found = False

            if error_type == "status_code":
                found = True
            elif error_type == "message":
                error_msg = site_data.get("errorMsg")
                body_text = r.text
                if isinstance(error_msg, list):
                    found = not any(msg in body_text for msg in error_msg)
                elif isinstance(error_msg, str):
                    found = error_msg not in body_text
                else:
                    found = True
            elif error_type == "response_url":
                error_url = site_data.get("errorUrl")
                if error_url:
                    error_url = error_url.replace("{}", user)
                    found = error_url.rstrip("/").lower() not in str(r.url).lower()
                else:
                    found = True
            else:
                found = True

            return found, r
        except Exception:
            return False, None

    # Probe target username
    found, r = await probe_username(username)
    
    # Double check wildcard if found
    if found:
        # Probe a random nonexistent username without underscores (to avoid DNS/SSL errors on subdomains)
        random_user = f"nonexistentuser{os.urandom(4).hex()}"
        random_found, _ = await probe_username(random_user)
        if random_found:
            # If the random user is also "found", this site is a wildcard false positive
            found = False

    public_url = site_data.get("url", "").replace("{}", username)
    return {
        "platform": site_name,
        "found": found,
        "url": public_url,
        "display_name": username if found else None,
        "bio": None,
        "location": None,
        "posts": [],
        "post_label": "posts",
        "risk_signals": [],
        "source": "sherlock",
    }

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

NEWSAPI_KEY = os.getenv("NEWSAPI_KEY", "")


def _parse_rss_items(xml_text: str, limit: int = 10) -> list:
    """Parse RSS/XML feed into {title, link, snippet} dicts."""
    items = []
    try:
        soup = BeautifulSoup(xml_text, "xml")
        for item in soup.find_all("item")[:limit]:
            title_tag = item.find("title")
            link_tag = item.find("link")
            title = title_tag.get_text(strip=True) if title_tag else ""
            link = link_tag.get_text(strip=True) if link_tag else ""
            snippet = ""
            desc_tag = item.find("description")
            if desc_tag:
                snippet = BeautifulSoup(desc_tag.get_text(), "html.parser").get_text(strip=True)
            if title and link:
                items.append({
                    "title": title,
                    "link": link,
                    "snippet": snippet[:300],
                })
    except Exception:
        pass
    return items


async def search_news(client: httpx.AsyncClient, query: str) -> list:
    """Search news & web mentions via Google News RSS, Bing RSS, and optional NewsAPI."""
    if not query or not query.strip():
        return []

    q = query.strip()
    seen_links: set = set()
    results: list = []

    def add_unique(items: list):
        for item in items:
            link = item.get("link", "")
            if link and link not in seen_links:
                seen_links.add(link)
                results.append(item)

    # Google News RSS (no API key required)
    try:
        r = await client.get(
            "https://news.google.com/rss/search",
            params={"q": q, "hl": "en-IN", "gl": "IN", "ceid": "IN:en"},
            headers={"User-Agent": MOZILLA_UA},
            timeout=15,
        )
        if r.status_code == 200:
            add_unique(_parse_rss_items(r.text, 10))
    except Exception:
        pass

    # Bing web RSS for broader web mentions
    try:
        r = await client.get(
            "https://www.bing.com/search",
            params={"q": q, "format": "rss"},
            headers={"User-Agent": MOZILLA_UA},
            timeout=15,
        )
        if r.status_code == 200:
            add_unique(_parse_rss_items(r.text, 8))
    except Exception:
        pass

    # Optional NewsAPI if key is configured
    if NEWSAPI_KEY:
        try:
            r = await client.get(
                "https://newsapi.org/v2/everything",
                params={
                    "q": q,
                    "pageSize": 10,
                    "sortBy": "relevancy",
                    "language": "en",
                    "apiKey": NEWSAPI_KEY,
                },
                timeout=TIMEOUT,
            )
            if r.status_code == 200:
                for a in r.json().get("articles", [])[:10]:
                    title = a.get("title", "")
                    if title and "[Removed]" not in title:
                        add_unique([{
                            "title": title,
                            "link": a.get("url", ""),
                            "snippet": (a.get("description") or "")[:300],
                        }])
        except Exception:
            pass

    return results[:15]


def extract_username_from_url(url: str) -> Optional[tuple[str, str]]:
    """
    Given a URL, identify if it belongs to one of the supported social platforms
    and return a tuple (platform_name, username).
    """
    try:
        from urllib.parse import urlparse
        parsed = urlparse(url.lower())
        domain = parsed.netloc
        path = parsed.path.strip("/")
        
        # Remove empty parts
        parts = [p for p in path.split("/") if p]
        if not parts:
            return None
            
        username = parts[0]
        if username.startswith("@"):
            username = username[1:]
            
        # Check platforms
        if "instagram.com" in domain:
            if username not in ("p", "explore", "reel", "stories", "direct"):
                return "Instagram", username
        elif "twitter.com" in domain or "x.com" in domain:
            if username not in ("search", "hashtag", "explore", "home", "i", "settings", "messages"):
                return "Twitter/X", username
        elif "github.com" in domain:
            if username not in ("orgs", "topics", "explore", "trending", "marketplace", "sponsors", "about", "features", "search", "login", "join"):
                return "GitHub", username
        elif "youtube.com" in domain:
            if parts[0].startswith("@"):
                return "YouTube", parts[0][1:]
            elif parts[0] == "user" and len(parts) > 1:
                return "YouTube", parts[1]
            elif parts[0] not in ("channel", "watch", "playlist", "feed", "c"):
                return "YouTube", parts[0]
        elif "linkedin.com" in domain:
            if parts[0] == "in" and len(parts) > 1:
                return "LinkedIn", parts[1]
        elif "facebook.com" in domain:
            if username not in ("pages", "groups", "sharer", "r.php", "login.php", "campaign", "recover"):
                return "Facebook", username
        elif "reddit.com" in domain:
            if (parts[0] == "user" or parts[0] == "u") and len(parts) > 1:
                return "Reddit", parts[1]
        elif "t.me" in domain or "telegram.me" in domain:
            if username not in ("share", "addstickers", "invoice"):
                return "Telegram", username
        elif "medium.com" in domain:
            if parts[0].startswith("@"):
                return "Medium", parts[0][1:]
            elif len(parts) > 0:
                return "Medium", username
        elif "pinterest.com" in domain:
            if username not in ("pin", "categories", "search", "today"):
                return "Pinterest", username
        elif "dev.to" in domain:
            if username not in ("t", "enter", "podcasts", "videos", "stories"):
                return "Dev.to", username
        elif "gitlab.com" in domain:
            if username not in ("explore", "help", "users", "groups"):
                return "GitLab", username
        elif "quora.com" in domain:
            if parts[0] == "profile" and len(parts) > 1:
                return "Quora", parts[1]
        elif "steamcommunity.com" in domain:
            if (parts[0] == "id" or parts[0] == "profiles") and len(parts) > 1:
                return "Steam", parts[1]
        elif "tumblr.com" in domain:
            if parts[0] == "blog" and len(parts) > 1:
                return "Tumblr", parts[1]
            subdomains = domain.split(".")
            if len(subdomains) > 2 and subdomains[0] not in ("www", "assets", "api", "embed"):
                return "Tumblr", subdomains[0]
    except Exception:
        pass
    return None


async def discover_from_wikidata(client: httpx.AsyncClient, real_name: str) -> dict:
    """
    Use Wikipedia + Wikidata to find official social media handles for a person.
    Wikidata stores curated, verified social-media identifiers as structured claims.
    This is the most reliable source for public figures.
    """
    # Wikidata property → our internal platform name
    PROPERTY_MAP = {
        "P2002": "Twitter/X",       # Twitter username
        "P2003": "Instagram",       # Instagram username
        "P2397": "YouTube",         # YouTube channel ID
        "P2013": "Facebook",        # Facebook ID / username
        "P7085": "TikTok",          # TikTok username
        "P3943": "Tumblr",          # Tumblr blog name
        "P4265": "Reddit",          # Reddit username
        "P3789": "Telegram",        # Telegram channel / username
        "P6634": "LinkedIn",        # LinkedIn personal profile ID
        "P9943": "Koo",             # Koo username
    }

    discovered: dict[str, str] = {}
    try:
        # Step 1: Search Wikipedia for the person
        search_r = await client.get(
            "https://en.wikipedia.org/w/api.php",
            params={
                "action": "query",
                "list": "search",
                "srsearch": real_name,
                "format": "json",
                "srlimit": 3,
            },
            headers={"User-Agent": "SOCMINT/2.0 (OSINT research tool)"},
            timeout=15,
        )
        if search_r.status_code != 200:
            return discovered

        search_results = search_r.json().get("query", {}).get("search", [])
        if not search_results:
            return discovered

        page_title = search_results[0]["title"]

        # Step 2: Get the Wikidata entity ID via Wikipedia page-props
        props_r = await client.get(
            "https://en.wikipedia.org/w/api.php",
            params={
                "action": "query",
                "titles": page_title,
                "prop": "pageprops",
                "format": "json",
            },
            headers={"User-Agent": "SOCMINT/2.0 (OSINT research tool)"},
            timeout=15,
        )
        if props_r.status_code != 200:
            return discovered

        pages = props_r.json().get("query", {}).get("pages", {})
        wikidata_id = None
        for _pid, page_data in pages.items():
            wikidata_id = page_data.get("pageprops", {}).get("wikibase_item")
            break

        if not wikidata_id:
            return discovered

        # Step 3: Fetch the Wikidata entity claims
        wd_r = await client.get(
            "https://www.wikidata.org/w/api.php",
            params={
                "action": "wbgetentities",
                "ids": wikidata_id,
                "props": "claims",
                "format": "json",
            },
            headers={"User-Agent": "SOCMINT/2.0 (OSINT research tool)"},
            timeout=15,
        )
        if wd_r.status_code != 200:
            return discovered

        entity = wd_r.json().get("entities", {}).get(wikidata_id, {})
        claims = entity.get("claims", {})

        for prop_id, platform in PROPERTY_MAP.items():
            if prop_id not in claims:
                continue
            for claim in claims[prop_id]:
                if claim.get("rank") == "deprecated":
                    continue
                snak = claim.get("mainsnak", {})
                dv = snak.get("datavalue", {})
                if dv.get("type") == "string":
                    value = dv.get("value", "").strip()
                    if value and platform not in discovered:
                        # Clean up: remove leading @ if present
                        if value.startswith("@"):
                            value = value[1:]
                        discovered[platform] = value
                        break  # take the first non-deprecated value

    except Exception as e:
        import logging
        logging.warning(f"[Wikidata] Error discovering handles for '{real_name}': {e}")

    return discovered


async def _discover_from_google_news(client: httpx.AsyncClient, real_name: str) -> dict:
    """
    Fallback: search Google News RSS for social-media profile URLs
    mentioned in news articles about the person.
    """
    discovered = {}
    try:
        query = (
            f'"{real_name}" (site:instagram.com OR site:twitter.com OR '
            f'site:x.com OR site:youtube.com OR site:linkedin.com OR '
            f'site:facebook.com OR site:github.com)'
        )
        r = await client.get(
            "https://news.google.com/rss/search",
            params={"q": query},
            timeout=12,
        )
        if r.status_code == 200:
            soup = BeautifulSoup(r.text, "xml")
            items = soup.find_all("item")

            import re
            for item in items:
                title = item.find("title").text if item.find("title") else ""
                m = re.search(r'\(@([a-zA-Z0-9._-]+)\)', title)
                if m:
                    username = m.group(1)
                    source = (item.find("source").text if item.find("source") else "").lower()
                    platform = None
                    if "instagram" in source or "instagram" in title.lower():
                        platform = "Instagram"
                    elif "twitter" in source or "x.com" in source or "twitter" in title.lower():
                        platform = "Twitter/X"
                    elif "youtube" in source or "youtube" in title.lower():
                        platform = "YouTube"
                    if platform and platform not in discovered:
                        discovered[platform] = username

            try:
                from googlenewsdecoder import gnewsdecoder
                for item in items[:6]:
                    link = item.find("link").text if item.find("link") else ""
                    if link:
                        res = gnewsdecoder(link)
                        if res.get("status") and res.get("decoded_url"):
                            parsed = extract_username_from_url(res["decoded_url"])
                            if parsed:
                                plat, user = parsed
                                if plat not in discovered:
                                    discovered[plat] = user
            except Exception:
                pass
    except Exception:
        pass
    return discovered


async def discover_real_usernames(client: httpx.AsyncClient, real_name: str) -> dict:
    """
    Multi-source discovery pipeline:
      1. Wikidata (highest quality — curated, structured)
      2. Google News RSS (fallback — lower quality, may contain fan accounts)
    """
    # Primary: Wikidata
    discovered = await discover_from_wikidata(client, real_name)

    # Fallback: Google News RSS fills in any platforms Wikidata didn't cover
    try:
        news_extra = await _discover_from_google_news(client, real_name)
        for plat, user in news_extra.items():
            if plat not in discovered:
                discovered[plat] = user
    except Exception:
        pass

    return discovered


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

    # Map each platform to the username to check.
    # By default, use the derived/concatenated `username`.
    platform_usernames = {plat: username for plat in ALL_PLATFORM_NAMES}

    async with httpx.AsyncClient(follow_redirects=True) as client:
        # If we have a real_name, discover real/official usernames from search
        if real_name:
            discovered = await discover_real_usernames(client, real_name)
            for plat, user in discovered.items():
                platform_usernames[plat] = user

        # Track checked platform-username combinations to avoid duplication
        checked_combos = set()
        if username:
            for plat in ALL_PLATFORM_NAMES:
                user = platform_usernames.get(plat) or username
                checked_combos.add((plat, user))

        tasks = []

        if username:
            # --- TIER 1: API-based ---
            tasks.append(search_github(client, platform_usernames["GitHub"]))
            tasks.append(search_reddit(client, platform_usernames["Reddit"]))
            tasks.append(search_hackernews(client, platform_usernames["HackerNews"]))
            tasks.append(search_devto(client, platform_usernames["Dev.to"]))
            tasks.append(search_gitlab(client, platform_usernames["GitLab"]))
            tasks.append(search_tumblr(client, platform_usernames["Tumblr"]))

            # --- TIER 2: HTTP checks ---
            tasks.append(check_profile_exists(
                client, "Twitter/X", f"https://twitter.com/{platform_usernames['Twitter/X']}", platform_usernames['Twitter/X'], "profile_image_url"))
            tasks.append(search_instagram(client, platform_usernames["Instagram"]))
            tasks.append(check_profile_exists(
                client, "TikTok", f"https://www.tiktok.com/@{platform_usernames['TikTok']}", platform_usernames['TikTok']))
            tasks.append(search_linkedin(client, platform_usernames["LinkedIn"]))
            tasks.append(check_profile_exists(
                client, "Telegram", f"https://t.me/{platform_usernames['Telegram']}", platform_usernames['Telegram'], "tgme_page_title"))
            tasks.append(check_profile_exists(
                client, "Snapchat", f"https://www.snapchat.com/add/{platform_usernames['Snapchat']}", platform_usernames['Snapchat']))
            yt_user = platform_usernames['YouTube']
            yt_url = (f"https://www.youtube.com/channel/{yt_user}"
                      if yt_user and yt_user.startswith("UC")
                      else f"https://www.youtube.com/@{yt_user}")
            tasks.append(check_profile_exists(
                client, "YouTube", yt_url, yt_user, "channelId"))
            tasks.append(check_profile_exists(
                client, "Quora", f"https://www.quora.com/profile/{platform_usernames['Quora']}", platform_usernames['Quora']))
            tasks.append(check_profile_exists(
                client, "Pastebin", f"https://pastebin.com/u/{platform_usernames['Pastebin']}", platform_usernames['Pastebin']))
            tasks.append(check_profile_by_markers(
                client, "Pinterest", f"https://www.pinterest.com/{platform_usernames['Pinterest']}/", platform_usernames['Pinterest'],
                positive_markers=["pinterest_profile_confirmed_marker"], negative_markers=["page not found", "not found", "couldn't find"],
                note="Pinterest is JS-heavy; manual verification may be required"))
            tasks.append(check_profile_by_markers(
                client, "Medium", f"https://medium.com/@{platform_usernames['Medium']}", platform_usernames['Medium'],
                positive_markers=["medium"], negative_markers=["404", "page not found"]))
            tasks.append(check_profile_by_markers(
                client, "Steam", f"https://steamcommunity.com/id/{platform_usernames['Steam']}", platform_usernames['Steam'],
                positive_markers=["steam", platform_usernames['Steam']], negative_markers=["specified profile could not be found", "error", "not found"]))

            # --- India-specific platforms ---
            tasks.append(search_facebook(client, platform_usernames["Facebook"]))
            tasks.append(search_sharechat(client, platform_usernames["ShareChat"]))
            tasks.append(search_koo(client, platform_usernames["Koo"]))
            tasks.append(search_discord(client, platform_usernames["Discord"]))
            tasks.append(search_joshmoj(client, platform_usernames["Josh/Moj"]))
            tasks.append(check_profile_by_markers(
                client, "Meesho", f"https://www.meesho.com/{platform_usernames['Meesho']}", platform_usernames['Meesho'],
                positive_markers=["meesho"], negative_markers=["page not found", "not found"],
                note="India-specific e-commerce seller/profile page"))
            tasks.append(check_profile_by_markers(
                client, "OLX India", f"https://www.olx.in/profile/{platform_usernames['OLX India']}", platform_usernames['OLX India'],
                positive_markers=["olx"], negative_markers=["not found", "404"],
                note="India classified listing profile"))
            tasks.append(check_profile_by_markers(
                client, "Naukri.com", f"https://www.naukri.com/mnjuser/profile?id={platform_usernames['Naukri.com']}", platform_usernames['Naukri.com'],
                positive_markers=["naukri"], negative_markers=["not found", "login"],
                note="Employment profile requires manual verification when gated"))
            tasks.append(check_profile_by_markers(
                client, "JioCinema", f"https://www.jiocinema.com/profile/{platform_usernames['JioCinema']}", platform_usernames['JioCinema'],
                positive_markers=["jiocinema_profile_confirmed_marker"], negative_markers=["not found", "404"],
                note="India-specific entertainment profile"))
            tasks.append(check_profile_by_markers(
                client, "MX TakaTak", f"https://www.mxtakatak.com/profile/{platform_usernames['MX TakaTak']}", platform_usernames['MX TakaTak'],
                positive_markers=["mxtakatak", "mx takatak"], negative_markers=["not found", "404"],
                note="Indian short-video profile"))
            tasks.append(check_profile_by_markers(
                client, "Roposo", f"https://www.roposo.com/profile/{platform_usernames['Roposo']}", platform_usernames['Roposo'],
                positive_markers=["roposo"], negative_markers=["not found", "404"],
                note="Indian short-video profile"))

        tasks.append(search_whatsapp_business(client, phone))

        # --- Sherlock checks ---
        sem = asyncio.Semaphore(35)
        async def sem_check_sherlock(site_name, site_data, user):
            async with sem:
                return await check_sherlock_site(client, site_name, site_data, user)

        if username and SHERLOCK_DATA:
            for site, data in SHERLOCK_DATA.items():
                if site not in ALL_PLATFORM_NAMES:
                    checked_combos.add((site, username))
                    tasks.append(sem_check_sherlock(site, data, username))

        results = await asyncio.gather(*tasks, return_exceptions=True)

        platform_results = []
        for r in results:
            if isinstance(r, Exception) or not r:
                continue
            if isinstance(r, dict):
                # Attach metadata to each found result
                r["metadata"] = extract_metadata(r)
                platform_results.append(r)

        # --- RECURSIVE REAL NAME DISCOVERY ---
        discovered_names = set()
        if username:
            for p in platform_results:
                if p.get("found") and p.get("display_name"):
                    dn = p["display_name"].strip()
                    # Filter out names that match the username itself or are just placeholders
                    if dn and dn.lower() != username.lower() and len(dn) > 2:
                        if any(c.isalpha() for c in dn):
                            discovered_names.add(dn)

        # Helper to generate check task dynamically
        def get_checker_task(p_name, u_name):
            if p_name == "GitHub": return search_github(client, u_name)
            if p_name == "Reddit": return search_reddit(client, u_name)
            if p_name == "HackerNews": return search_hackernews(client, u_name)
            if p_name == "Dev.to": return search_devto(client, u_name)
            if p_name == "GitLab": return search_gitlab(client, u_name)
            if p_name == "Tumblr": return search_tumblr(client, u_name)
            if p_name == "Twitter/X": return check_profile_exists(client, "Twitter/X", f"https://twitter.com/{u_name}", u_name, "profile_image_url")
            if p_name == "Instagram": return search_instagram(client, u_name)
            if p_name == "TikTok": return check_profile_exists(client, "TikTok", f"https://www.tiktok.com/@{u_name}", u_name)
            if p_name == "LinkedIn": return search_linkedin(client, u_name)
            if p_name == "Telegram": return check_profile_exists(client, "Telegram", f"https://t.me/{u_name}", u_name, "tgme_page_title")
            if p_name == "Snapchat": return check_profile_exists(client, "Snapchat", f"https://www.snapchat.com/add/{u_name}", u_name)
            
            yt_url = f"https://www.youtube.com/channel/{u_name}" if u_name.startswith("UC") else f"https://www.youtube.com/@{u_name}"
            if p_name == "YouTube": return check_profile_exists(client, "YouTube", yt_url, u_name, "channelId")
            if p_name == "Quora": return check_profile_exists(client, "Quora", f"https://www.quora.com/profile/{u_name}", u_name)
            if p_name == "Pastebin": return check_profile_exists(client, "Pastebin", f"https://pastebin.com/u/{u_name}", u_name)
            if p_name == "Pinterest": return check_profile_by_markers(client, "Pinterest", f"https://www.pinterest.com/{u_name}/", u_name, ["pinterest_profile_confirmed_marker"], ["page not found", "not found"])
            if p_name == "Medium": return check_profile_by_markers(client, "Medium", f"https://medium.com/@{u_name}", u_name, ["medium"], ["404", "page not found"])
            if p_name == "Steam": return check_profile_by_markers(client, "Steam", f"https://steamcommunity.com/id/{u_name}", u_name, ["steam", u_name], ["specified profile could not be found", "error"])
            if p_name == "Facebook": return search_facebook(client, u_name)
            if p_name == "ShareChat": return search_sharechat(client, u_name)
            if p_name == "Koo": return search_koo(client, u_name)
            if p_name == "Discord": return search_discord(client, u_name)
            if p_name == "Josh/Moj": return search_joshmoj(client, u_name)
            if p_name == "Meesho": return check_profile_by_markers(client, "Meesho", f"https://www.meesho.com/{u_name}", u_name, ["meesho"], ["page not found", "not found"])
            if p_name == "OLX India": return check_profile_by_markers(client, "OLX India", f"https://www.olx.in/profile/{u_name}", u_name, ["olx"], ["not found", "404"])
            if p_name == "Naukri.com": return check_profile_by_markers(client, "Naukri.com", f"https://www.naukri.com/mnjuser/profile?id={u_name}", u_name, ["naukri"], ["not found", "login"])
            if p_name == "JioCinema": return check_profile_by_markers(client, "JioCinema", f"https://www.jiocinema.com/profile/{u_name}", u_name, ["jiocinema_profile_confirmed_marker"], ["not found", "404"])
            if p_name == "MX TakaTak": return check_profile_by_markers(client, "MX TakaTak", f"https://www.mxtakatak.com/profile/{u_name}", u_name, ["mxtakatak", "mx takatak"], ["not found", "404"])
            if p_name == "Roposo": return check_profile_by_markers(client, "Roposo", f"https://www.roposo.com/profile/{u_name}", u_name, ["roposo"], ["not found", "404"])
            
            if SHERLOCK_DATA and p_name in SHERLOCK_DATA:
                return sem_check_sherlock(p_name, SHERLOCK_DATA[p_name], u_name)
            return None

        # Execute discovery and platform checks for extracted names
        if discovered_names:
            # Query top 2 discovered names to limit resource usage
            for dn in list(discovered_names)[:2]:
                discovered_profiles = await discover_real_usernames(client, dn)
                rec_tasks = []
                for plat, user in discovered_profiles.items():
                    if (plat, user) not in checked_combos:
                        checked_combos.add((plat, user))
                        t = get_checker_task(plat, user)
                        if t:
                            rec_tasks.append((plat, user, t))

                if rec_tasks:
                    gathered = await asyncio.gather(*(item[2] for item in rec_tasks), return_exceptions=True)
                    for (plat, user, _), res in zip(rec_tasks, gathered):
                        if isinstance(res, Exception) or not res:
                            continue
                        if isinstance(res, dict) and res.get("found"):
                            res["metadata"] = extract_metadata(res)
                            res["linked_via_real_name"] = dn
                            # Overwrite or append to result list
                            # If the platform was already in results but not found, we replace it or update it
                            existing = next((x for x in platform_results if x.get("platform") == plat), None)
                            if existing:
                                # Replace the not-found placeholder with the found profile
                                platform_results.remove(existing)
                            platform_results.append(res)

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
