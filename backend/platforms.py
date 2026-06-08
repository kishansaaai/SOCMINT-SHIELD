import asyncio
import httpx
from typing import Optional
from datetime import datetime

TIMEOUT = 12
MOZILLA_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"


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
                client, "Pinterest", f"https://www.pinterest.com/{username}/", username, "og:type"))
            tasks.append(check_profile_exists(
                client, "SoundCloud", f"https://soundcloud.com/{username}", username))
            tasks.append(check_profile_exists(
                client, "Medium", f"https://medium.com/@{username}", username))
            tasks.append(check_profile_exists(
                client, "Quora", f"https://www.quora.com/profile/{username}", username))
            tasks.append(check_profile_exists(
                client, "Steam", f"https://steamcommunity.com/id/{username}", username, "profile_header"))
            tasks.append(check_profile_exists(
                client, "Pastebin", f"https://pastebin.com/u/{username}", username))
            tasks.append(check_profile_exists(
                client, "Flickr", f"https://www.flickr.com/people/{username}", username))
            tasks.append(check_profile_exists(
                client, "YouTube", f"https://www.youtube.com/@{username}", username, "channelId"))

        results = await asyncio.gather(*tasks, return_exceptions=True)

        platform_results = []
        for r in results:
            if isinstance(r, Exception):
                continue
            if isinstance(r, dict):
                platform_results.append(r)

        return platform_results
