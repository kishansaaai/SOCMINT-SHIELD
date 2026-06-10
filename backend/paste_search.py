"""
Paste Sites Search — find suspect mentions in paste sites.
Uses DuckDuckGo HTML scrape (no API key required).
Searches: Pastebin, GitHub Gist, Ghostbin, and general paste results.
"""

import asyncio
import httpx
from bs4 import BeautifulSoup
from urllib.parse import parse_qs, urlparse

MOZILLA_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)


async def _ddg_search(client: httpx.AsyncClient, query: str) -> list:
    """Run a single DuckDuckGo HTML search and return results."""
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

        soup = BeautifulSoup(r.text, "lxml")
        results = []
        for a in soup.select("a.result__a")[:5]:
            href = a.get("href", "")
            # Unwrap DuckDuckGo redirect
            if "uddg=" in href:
                try:
                    href = parse_qs(urlparse(href).query).get("uddg", [href])[0]
                except Exception:
                    pass
            if not href.startswith("http"):
                continue

            title = a.get_text(strip=True)
            snippet = ""
            parent = a.find_parent("div", class_="result__body")
            if parent:
                sn = parent.find("a", class_="result__snippet")
                if sn:
                    snippet = sn.get_text(strip=True)

            results.append({
                "title": title,
                "url": href,
                "snippet": snippet,
            })
        return results
    except Exception:
        return []


async def search_pastes(query: str) -> list:
    """
    Search paste sites for mentions of the query string.
    Returns top results from Pastebin, GitHub Gist, Ghostbin, and general paste search.
    """
    search_queries = [
        (f'"{query}" site:pastebin.com', "Pastebin"),
        (f'"{query}" site:gist.github.com', "GitHub Gist"),
        (f'"{query}" site:ghostbin.co', "Ghostbin"),
        (f'"{query}" paste dump leak', "General Paste"),
    ]

    seen_urls = set()
    all_results = []

    async with httpx.AsyncClient(follow_redirects=True) as client:
        for i, (search_query, source) in enumerate(search_queries):
            if i > 0:
                await asyncio.sleep(1.5)  # Rate limit DDG requests

            results = await _ddg_search(client, search_query)
            for r in results:
                url = r["url"]
                if url in seen_urls:
                    continue
                seen_urls.add(url)
                all_results.append({
                    "title": r["title"],
                    "url": url,
                    "snippet": r["snippet"][:200] if r["snippet"] else "",
                    "source": source,
                    "found_query": query,
                })

    return all_results[:10]
