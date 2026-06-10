"""
Indian Kanoon integration — free public search, no API key needed.
Searches indiankanoon.org for court cases, FIRs, and legal records by name.
"""
import asyncio
import re
import httpx
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "en-US,en;q=0.9",
}

async def search_indiankanoon(name: str, client: httpx.AsyncClient) -> list:
    """Search Indian Kanoon for court records by name."""
    results = []
    try:
        r = await client.get(
            "https://indiankanoon.org/search/",
            params={"formInput": name, "pagenum": 0},
            headers=HEADERS,
            timeout=12,
            follow_redirects=True,
        )
        if r.status_code != 200:
            return []
        soup = BeautifulSoup(r.text, "lxml")
        # Each result is in .result div
        for item in soup.select(".result")[:10]:
            title_el = item.select_one(".result_title a") or item.select_one("a")
            snippet_el = item.select_one(".snippet")
            date_el = item.select_one(".docsource") or item.select_one(".docdate")

            if not title_el:
                continue

            title   = title_el.get_text(strip=True)
            href    = title_el.get("href", "")
            url     = f"https://indiankanoon.org{href}" if href.startswith("/") else href
            snippet = snippet_el.get_text(strip=True) if snippet_el else ""
            date    = date_el.get_text(strip=True) if date_el else ""

            # Classify
            text_lower = (title + " " + snippet).lower()
            if any(k in text_lower for k in ("fir", "arrest", "accused", "criminal", "ipc", "crpc", "offence", "convicted")):
                category = "criminal"
            elif any(k in text_lower for k in ("fraud", "cheating", "cyber", "419", "420")):
                category = "fraud"
            elif any(k in text_lower for k in ("civil", "contract", "property", "divorce", "family")):
                category = "civil"
            else:
                category = "general"

            results.append({
                "title":    title,
                "url":      url,
                "snippet":  snippet[:200],
                "date":     date,
                "category": category,
                "source":   "Indian Kanoon",
            })
    except Exception as e:
        results.append({"error": str(e), "source": "Indian Kanoon"})
    return results


async def search_mca21(name: str, client: httpx.AsyncClient) -> list:
    """Search MCA21 (Ministry of Corporate Affairs) for company directorships."""
    results = []
    try:
        # MCA doesn't have a free scrape-friendly endpoint, use Google CSE fallback
        import os
        api_key = os.getenv("GOOGLE_CSE_API_KEY", "")
        cx      = os.getenv("GOOGLE_CSE_CX", "")
        if api_key and cx:
            r = await client.get(
                "https://www.googleapis.com/customsearch/v1",
                params={"q": f'"{name}" site:mca.gov.in OR "director" "{name}" company india', "key": api_key, "cx": cx, "num": 5},
                timeout=10,
            )
            if r.status_code == 200:
                for item in r.json().get("items", []):
                    results.append({
                        "title":    item.get("title",""),
                        "url":      item.get("link",""),
                        "snippet":  item.get("snippet","")[:200],
                        "category": "corporate",
                        "source":   "MCA21/Google",
                    })
    except Exception:
        pass
    return results


async def run_legal_search(name: str) -> dict:
    """Run all legal searches concurrently."""
    async with httpx.AsyncClient(follow_redirects=True) as client:
        kanoon_task = search_indiankanoon(name, client)
        mca_task    = search_mca21(name, client)
        kanoon, mca = await asyncio.gather(kanoon_task, mca_task, return_exceptions=True)

    kanoon_results = kanoon if isinstance(kanoon, list) else []
    mca_results    = mca    if isinstance(mca, list)    else []

    criminal_count = sum(1 for r in kanoon_results if r.get("category") == "criminal")
    fraud_count    = sum(1 for r in kanoon_results if r.get("category") == "fraud")

    return {
        "court_cases":    kanoon_results,
        "corporate":      mca_results,
        "total_found":    len(kanoon_results) + len(mca_results),
        "criminal_count": criminal_count,
        "fraud_count":    fraud_count,
        "risk_flag":      criminal_count > 0 or fraud_count > 0,
    }
