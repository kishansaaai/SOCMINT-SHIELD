"""
Phone Intelligence — free sources only, no paid APIs required.
Sources: offline telecom lookup, UPI generation, mule heuristics,
         DuckDuckGo scrape, Truecaller public page, NCCRP check,
         optional Numverify free tier.
"""

import asyncio
import os
import re
import time
from typing import Optional

import httpx
from bs4 import BeautifulSoup

MOZILLA_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

# ─────────────────────────────────────────────────────────────────────────────
# TELECOM SERIES LOOKUP  (200+ entries, fully offline)
# ─────────────────────────────────────────────────────────────────────────────

TELECOM_SERIES: dict[str, dict] = {
    # ── Karnataka ──────────────────────────────────────────────────────────
    "9845": {"operator": "Airtel",       "circle": "Karnataka"},
    "9844": {"operator": "Airtel",       "circle": "Karnataka"},
    "9886": {"operator": "Airtel",       "circle": "Karnataka"},
    "9880": {"operator": "Airtel",       "circle": "Karnataka"},
    "9743": {"operator": "Airtel",       "circle": "Karnataka"},
    "9741": {"operator": "Airtel",       "circle": "Karnataka"},
    "9980": {"operator": "Airtel",       "circle": "Karnataka"},
    "9900": {"operator": "Airtel",       "circle": "Karnataka"},
    "8970": {"operator": "Airtel",       "circle": "Karnataka"},
    "8971": {"operator": "Airtel",       "circle": "Karnataka"},
    "9448": {"operator": "Vodafone-Vi",  "circle": "Karnataka"},
    "9449": {"operator": "Vodafone-Vi",  "circle": "Karnataka"},
    "9900": {"operator": "Vodafone-Vi",  "circle": "Karnataka"},
    "9972": {"operator": "Vodafone-Vi",  "circle": "Karnataka"},
    "9632": {"operator": "Vodafone-Vi",  "circle": "Karnataka"},
    "9945": {"operator": "Vodafone-Vi",  "circle": "Karnataka"},
    "9731": {"operator": "Vodafone-Vi",  "circle": "Karnataka"},
    "9342": {"operator": "BSNL",         "circle": "Karnataka"},
    "9343": {"operator": "BSNL",         "circle": "Karnataka"},
    "9480": {"operator": "BSNL",         "circle": "Karnataka"},
    "9481": {"operator": "BSNL",         "circle": "Karnataka"},
    "7026": {"operator": "Jio",          "circle": "Karnataka"},
    "7019": {"operator": "Jio",          "circle": "Karnataka"},
    "9353": {"operator": "Jio",          "circle": "Karnataka"},
    "8050": {"operator": "Jio",          "circle": "Karnataka"},
    "8051": {"operator": "Jio",          "circle": "Karnataka"},
    "6364": {"operator": "Jio",          "circle": "Karnataka"},
    "6361": {"operator": "Jio",          "circle": "Karnataka"},
    "6362": {"operator": "Jio",          "circle": "Karnataka"},
    "6363": {"operator": "Jio",          "circle": "Karnataka"},

    # ── Maharashtra ─────────────────────────────────────────────────────────
    "9820": {"operator": "Vodafone-Vi",  "circle": "Maharashtra"},
    "9821": {"operator": "Vodafone-Vi",  "circle": "Maharashtra"},
    "9867": {"operator": "Vodafone-Vi",  "circle": "Maharashtra"},
    "9869": {"operator": "Vodafone-Vi",  "circle": "Maharashtra"},
    "9322": {"operator": "Vodafone-Vi",  "circle": "Maharashtra"},
    "9323": {"operator": "Vodafone-Vi",  "circle": "Maharashtra"},
    "9324": {"operator": "Vodafone-Vi",  "circle": "Maharashtra"},
    "9833": {"operator": "Vodafone-Vi",  "circle": "Maharashtra"},
    "9819": {"operator": "Airtel",       "circle": "Maharashtra"},
    "9870": {"operator": "Airtel",       "circle": "Maharashtra"},
    "9871": {"operator": "Airtel",       "circle": "Maharashtra"},
    "9168": {"operator": "Airtel",       "circle": "Maharashtra"},
    "9373": {"operator": "BSNL",         "circle": "Maharashtra"},
    "9422": {"operator": "BSNL",         "circle": "Maharashtra"},
    "9423": {"operator": "BSNL",         "circle": "Maharashtra"},
    "7030": {"operator": "Jio",          "circle": "Maharashtra"},
    "7031": {"operator": "Jio",          "circle": "Maharashtra"},
    "8169": {"operator": "Jio",          "circle": "Maharashtra"},
    "9004": {"operator": "Jio",          "circle": "Maharashtra"},

    # ── Delhi / NCR ─────────────────────────────────────────────────────────
    "9810": {"operator": "Airtel",       "circle": "Delhi"},
    "9811": {"operator": "Airtel",       "circle": "Delhi"},
    "9312": {"operator": "Airtel",       "circle": "Delhi"},
    "9313": {"operator": "Airtel",       "circle": "Delhi"},
    "9717": {"operator": "Airtel",       "circle": "Delhi"},
    "9711": {"operator": "Airtel",       "circle": "Delhi"},
    "9871": {"operator": "Airtel",       "circle": "Delhi"},
    "9999": {"operator": "Vodafone-Vi",  "circle": "Delhi"},
    "9910": {"operator": "Vodafone-Vi",  "circle": "Delhi"},
    "9911": {"operator": "Vodafone-Vi",  "circle": "Delhi"},
    "9818": {"operator": "Vodafone-Vi",  "circle": "Delhi"},
    "9350": {"operator": "BSNL",         "circle": "Delhi"},
    "9868": {"operator": "BSNL",         "circle": "Delhi"},
    "7011": {"operator": "Jio",          "circle": "Delhi"},
    "7012": {"operator": "Jio",          "circle": "Delhi"},
    "8368": {"operator": "Jio",          "circle": "Delhi"},
    "9205": {"operator": "Jio",          "circle": "Delhi"},

    # ── Tamil Nadu ──────────────────────────────────────────────────────────
    "9840": {"operator": "Airtel",       "circle": "Tamil Nadu"},
    "9841": {"operator": "Airtel",       "circle": "Tamil Nadu"},
    "9842": {"operator": "Airtel",       "circle": "Tamil Nadu"},
    "9843": {"operator": "Airtel",       "circle": "Tamil Nadu"},
    "7550": {"operator": "Airtel",       "circle": "Tamil Nadu"},
    "9444": {"operator": "Vodafone-Vi",  "circle": "Tamil Nadu"},
    "9445": {"operator": "Vodafone-Vi",  "circle": "Tamil Nadu"},
    "9789": {"operator": "Vodafone-Vi",  "circle": "Tamil Nadu"},
    "9442": {"operator": "BSNL",         "circle": "Tamil Nadu"},
    "9443": {"operator": "BSNL",         "circle": "Tamil Nadu"},
    "9488": {"operator": "BSNL",         "circle": "Tamil Nadu"},
    "7358": {"operator": "Jio",          "circle": "Tamil Nadu"},
    "7397": {"operator": "Jio",          "circle": "Tamil Nadu"},
    "6379": {"operator": "Jio",          "circle": "Tamil Nadu"},

    # ── Uttar Pradesh ────────────────────────────────────────────────────────
    "9839": {"operator": "Airtel",       "circle": "Uttar Pradesh"},
    "9795": {"operator": "Airtel",       "circle": "Uttar Pradesh"},
    "9794": {"operator": "Airtel",       "circle": "Uttar Pradesh"},
    "9451": {"operator": "Vodafone-Vi",  "circle": "Uttar Pradesh"},
    "9452": {"operator": "Vodafone-Vi",  "circle": "Uttar Pradesh"},
    "9453": {"operator": "Vodafone-Vi",  "circle": "Uttar Pradesh"},
    "9454": {"operator": "Vodafone-Vi",  "circle": "Uttar Pradesh"},
    "9455": {"operator": "Vodafone-Vi",  "circle": "Uttar Pradesh"},
    "9415": {"operator": "BSNL",         "circle": "Uttar Pradesh"},
    "9451": {"operator": "BSNL",         "circle": "Uttar Pradesh"},
    "7388": {"operator": "Jio",          "circle": "Uttar Pradesh"},
    "7389": {"operator": "Jio",          "circle": "Uttar Pradesh"},
    "6394": {"operator": "Jio",          "circle": "Uttar Pradesh"},

    # ── West Bengal ─────────────────────────────────────────────────────────
    "9830": {"operator": "Vodafone-Vi",  "circle": "West Bengal"},
    "9831": {"operator": "Vodafone-Vi",  "circle": "West Bengal"},
    "9832": {"operator": "Vodafone-Vi",  "circle": "West Bengal"},
    "9836": {"operator": "Vodafone-Vi",  "circle": "West Bengal"},
    "9800": {"operator": "Airtel",       "circle": "West Bengal"},
    "9433": {"operator": "BSNL",         "circle": "West Bengal"},
    "9434": {"operator": "BSNL",         "circle": "West Bengal"},
    "7908": {"operator": "Jio",          "circle": "West Bengal"},
    "7584": {"operator": "Jio",          "circle": "West Bengal"},
    "6291": {"operator": "Jio",          "circle": "West Bengal"},

    # ── Rajasthan ────────────────────────────────────────────────────────────
    "9829": {"operator": "Airtel",       "circle": "Rajasthan"},
    "9828": {"operator": "Airtel",       "circle": "Rajasthan"},
    "9462": {"operator": "Vodafone-Vi",  "circle": "Rajasthan"},
    "9461": {"operator": "Vodafone-Vi",  "circle": "Rajasthan"},
    "9414": {"operator": "BSNL",         "circle": "Rajasthan"},
    "9413": {"operator": "BSNL",         "circle": "Rajasthan"},
    "7014": {"operator": "Jio",          "circle": "Rajasthan"},
    "7015": {"operator": "Jio",          "circle": "Rajasthan"},
    "6377": {"operator": "Jio",          "circle": "Rajasthan"},

    # ── Jharkhand ────────────────────────────────────────────────────────────
    "9006": {"operator": "Airtel",       "circle": "Jharkhand"},
    "9771": {"operator": "Airtel",       "circle": "Jharkhand"},
    "9931": {"operator": "Vodafone-Vi",  "circle": "Jharkhand"},
    "9304": {"operator": "BSNL",         "circle": "Jharkhand"},
    "7979": {"operator": "Jio",          "circle": "Jharkhand"},
    "6200": {"operator": "Jio",          "circle": "Jharkhand"},
    "6201": {"operator": "Jio",          "circle": "Jharkhand"},

    # ── Bihar ────────────────────────────────────────────────────────────────
    "9431": {"operator": "BSNL",         "circle": "Bihar"},
    "9430": {"operator": "BSNL",         "circle": "Bihar"},
    "9572": {"operator": "Airtel",       "circle": "Bihar"},
    "9504": {"operator": "Airtel",       "circle": "Bihar"},
    "9905": {"operator": "Vodafone-Vi",  "circle": "Bihar"},
    "7004": {"operator": "Jio",          "circle": "Bihar"},
    "6200": {"operator": "Jio",          "circle": "Bihar"},
    "6299": {"operator": "Jio",          "circle": "Bihar"},

    # ── Gujarat ──────────────────────────────────────────────────────────────
    "9824": {"operator": "Vodafone-Vi",  "circle": "Gujarat"},
    "9825": {"operator": "Vodafone-Vi",  "circle": "Gujarat"},
    "9726": {"operator": "Vodafone-Vi",  "circle": "Gujarat"},
    "9978": {"operator": "Airtel",       "circle": "Gujarat"},
    "9979": {"operator": "Airtel",       "circle": "Gujarat"},
    "9426": {"operator": "BSNL",         "circle": "Gujarat"},
    "7016": {"operator": "Jio",          "circle": "Gujarat"},
    "6356": {"operator": "Jio",          "circle": "Gujarat"},

    # ── Andhra Pradesh / Telangana ───────────────────────────────────────────
    "9848": {"operator": "Airtel",       "circle": "Andhra Pradesh"},
    "9849": {"operator": "Airtel",       "circle": "Andhra Pradesh"},
    "9701": {"operator": "Airtel",       "circle": "Telangana"},
    "9550": {"operator": "Vodafone-Vi",  "circle": "Andhra Pradesh"},
    "9989": {"operator": "Vodafone-Vi",  "circle": "Telangana"},
    "9440": {"operator": "BSNL",         "circle": "Andhra Pradesh"},
    "9441": {"operator": "BSNL",         "circle": "Andhra Pradesh"},
    "7093": {"operator": "Jio",          "circle": "Telangana"},
    "6300": {"operator": "Jio",          "circle": "Andhra Pradesh"},
    "6301": {"operator": "Jio",          "circle": "Andhra Pradesh"},

    # ── Kerala ───────────────────────────────────────────────────────────────
    "9847": {"operator": "Airtel",       "circle": "Kerala"},
    "9846": {"operator": "Airtel",       "circle": "Kerala"},
    "9895": {"operator": "Vodafone-Vi",  "circle": "Kerala"},
    "9496": {"operator": "BSNL",         "circle": "Kerala"},
    "9497": {"operator": "BSNL",         "circle": "Kerala"},
    "7907": {"operator": "Jio",          "circle": "Kerala"},
    "6238": {"operator": "Jio",          "circle": "Kerala"},

    # ── Punjab ───────────────────────────────────────────────────────────────
    "9815": {"operator": "Airtel",       "circle": "Punjab"},
    "9814": {"operator": "Airtel",       "circle": "Punjab"},
    "9876": {"operator": "Vodafone-Vi",  "circle": "Punjab"},
    "9877": {"operator": "Vodafone-Vi",  "circle": "Punjab"},
    "9463": {"operator": "BSNL",         "circle": "Punjab"},
    "7009": {"operator": "Jio",          "circle": "Punjab"},
    "6284": {"operator": "Jio",          "circle": "Punjab"},

    # ── Haryana ──────────────────────────────────────────────────────────────
    "9812": {"operator": "Airtel",       "circle": "Haryana"},
    "9813": {"operator": "Airtel",       "circle": "Haryana"},
    "9896": {"operator": "Vodafone-Vi",  "circle": "Haryana"},
    "9466": {"operator": "BSNL",         "circle": "Haryana"},
    "7015": {"operator": "Jio",          "circle": "Haryana"},
    "6283": {"operator": "Jio",          "circle": "Haryana"},

    # ── Madhya Pradesh ───────────────────────────────────────────────────────
    "9826": {"operator": "Airtel",       "circle": "Madhya Pradesh"},
    "9827": {"operator": "Airtel",       "circle": "Madhya Pradesh"},
    "9425": {"operator": "BSNL",         "circle": "Madhya Pradesh"},
    "9691": {"operator": "Vodafone-Vi",  "circle": "Madhya Pradesh"},
    "7000": {"operator": "Jio",          "circle": "Madhya Pradesh"},
    "6260": {"operator": "Jio",          "circle": "Madhya Pradesh"},

    # ── Mumbai (separate circle) ─────────────────────────────────────────────
    "9820": {"operator": "Vodafone-Vi",  "circle": "Mumbai"},
    "9821": {"operator": "Airtel",       "circle": "Mumbai"},
    "9892": {"operator": "Vodafone-Vi",  "circle": "Mumbai"},
    "9987": {"operator": "Vodafone-Vi",  "circle": "Mumbai"},
    "9930": {"operator": "Vodafone-Vi",  "circle": "Mumbai"},
    "9967": {"operator": "Vodafone-Vi",  "circle": "Mumbai"},
    "9022": {"operator": "Airtel",       "circle": "Mumbai"},
    "9029": {"operator": "Airtel",       "circle": "Mumbai"},
    "7021": {"operator": "Jio",          "circle": "Mumbai"},
    "8169": {"operator": "Jio",          "circle": "Mumbai"},

    # ── Odisha ───────────────────────────────────────────────────────────────
    "9937": {"operator": "Airtel",       "circle": "Odisha"},
    "9861": {"operator": "Vodafone-Vi",  "circle": "Odisha"},
    "9437": {"operator": "BSNL",         "circle": "Odisha"},
    "7381": {"operator": "Jio",          "circle": "Odisha"},
    "6370": {"operator": "Jio",          "circle": "Odisha"},

    # ── Assam / North East ───────────────────────────────────────────────────
    "9435": {"operator": "BSNL",         "circle": "Assam"},
    "9864": {"operator": "Airtel",       "circle": "Assam"},
    "8011": {"operator": "Jio",          "circle": "Assam"},
    "6001": {"operator": "Jio",          "circle": "Assam"},

    # ── Himachal Pradesh ─────────────────────────────────────────────────────
    "9816": {"operator": "Airtel",       "circle": "Himachal Pradesh"},
    "9817": {"operator": "Airtel",       "circle": "Himachal Pradesh"},
    "9418": {"operator": "BSNL",         "circle": "Himachal Pradesh"},
    "7018": {"operator": "Jio",          "circle": "Himachal Pradesh"},

    # ── Uttarakhand ──────────────────────────────────────────────────────────
    "9756": {"operator": "Airtel",       "circle": "Uttarakhand"},
    "9412": {"operator": "BSNL",         "circle": "Uttarakhand"},
    "7500": {"operator": "Jio",          "circle": "Uttarakhand"},

    # ── Goa ──────────────────────────────────────────────────────────────────
    "9823": {"operator": "Vodafone-Vi",  "circle": "Goa"},
    "9370": {"operator": "BSNL",         "circle": "Goa"},
    "7774": {"operator": "Jio",          "circle": "Goa"},

    # ── Jio national series ──────────────────────────────────────────────────
    "7000": {"operator": "Jio",          "circle": "National"},
    "7001": {"operator": "Jio",          "circle": "National"},
    "7002": {"operator": "Jio",          "circle": "National"},
    "7003": {"operator": "Jio",          "circle": "National"},
    "7005": {"operator": "Jio",          "circle": "National"},
    "7006": {"operator": "Jio",          "circle": "National"},
    "7007": {"operator": "Jio",          "circle": "National"},
    "7008": {"operator": "Jio",          "circle": "National"},
    "6000": {"operator": "Jio",          "circle": "National"},
    "6300": {"operator": "Jio",          "circle": "National"},
    "8899": {"operator": "Jio",          "circle": "National"},
    "9136": {"operator": "Jio",          "circle": "National"},
    "9137": {"operator": "Jio",          "circle": "National"},
}

HIGH_FRAUD_CIRCLES = {
    "Jharkhand", "Uttar Pradesh", "Bihar", "Rajasthan", "West Bengal",
    "National",
}

UPI_PROVIDERS = [
    ("@ybl",         "PhonePe",              "PhonePe"),
    ("@ibl",         "PhonePe",              "PhonePe"),
    ("@axl",         "PhonePe",              "PhonePe"),
    ("@oksbi",       "Google Pay",           "Google Pay"),
    ("@okaxis",      "Google Pay",           "Google Pay"),
    ("@okicici",     "Google Pay",           "Google Pay"),
    ("@okhdfcbank",  "Google Pay",           "Google Pay"),
    ("@paytm",       "Paytm",                "Paytm"),
    ("@apl",         "Amazon Pay",           "Amazon Pay"),
    ("@upi",         "BHIM",                 "BHIM"),
    ("@freecharge",  "Freecharge",           "Freecharge"),
    ("@jiomoney",    "JioMoney",             "JioMoney"),
    ("@airtel",      "Airtel Payments Bank", "Airtel"),
    ("@indus",       "IndusInd Bank",        "IndusInd"),
    ("@mahb",        "Bank of Maharashtra",  "BoM"),
]


# ─────────────────────────────────────────────────────────────────────────────
# 1 — NORMALIZER
# ─────────────────────────────────────────────────────────────────────────────

def normalize_phone(phone: str) -> dict:
    raw = phone.strip()
    cleaned = re.sub(r"[\s\-\.\(\)]", "", raw)
    cleaned = re.sub(r"^\+91", "", cleaned)
    cleaned = re.sub(r"^0", "", cleaned)
    cleaned = re.sub(r"\D", "", cleaned)

    is_valid = len(cleaned) == 10 and cleaned[0] in "6789"
    return {
        "raw":        raw,
        "normalized": cleaned,
        "e164":       f"+91{cleaned}" if is_valid else None,
        "is_valid":   is_valid,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 2 — TELECOM CIRCLE DETECTOR
# ─────────────────────────────────────────────────────────────────────────────

def detect_telecom_circle(phone: str) -> dict:
    prefix4 = phone[:4]
    prefix3 = phone[:3]
    info = TELECOM_SERIES.get(prefix4) or TELECOM_SERIES.get(prefix3)
    if info:
        op = info["operator"]
        circle = info["circle"]
        prepaid = True  # conservative default
        return {
            "operator":       op,
            "circle":         circle,
            "prepaid_likely": prepaid,
            "series_prefix":  prefix4,
            "found":          True,
        }
    return {
        "operator":       "Unknown",
        "circle":         "Unknown",
        "prepaid_likely": True,
        "series_prefix":  prefix4,
        "found":          False,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 3 — UPI ID GENERATOR
# ─────────────────────────────────────────────────────────────────────────────

def generate_upi_ids(phone: str) -> list:
    result = []
    for suffix, provider, app in UPI_PROVIDERS:
        upi_id = f"{phone}{suffix}"
        result.append({
            "upi_id":   upi_id,
            "provider": provider,
            "app":      app,
            "suffix":   suffix,
            "status":   "probable-unverified",
        })
    return result


# ─────────────────────────────────────────────────────────────────────────────
# 4 — MULE ACCOUNT HEURISTICS
# ─────────────────────────────────────────────────────────────────────────────

def check_mule_patterns(phone: str, circle: str) -> dict:
    high_fraud = circle in HIGH_FRAUD_CIRCLES
    reasons = []
    if high_fraud:
        reasons.append(
            f"{circle} is a high fraud-originating circle per NCRP annual report data"
        )
        if circle == "Jharkhand":
            reasons.append("Jamtara (Jharkhand) is a known cybercrime hotspot per CBI/NCRP reports")
    return {
        "elevated_risk":      high_fraud,
        "high_fraud_circle":  high_fraud,
        "risk_reason":        "; ".join(reasons) if reasons else "No elevated risk based on circle",
        "ncrp_note":          "Based on publicly available NCRP annual report data",
    }


# ─────────────────────────────────────────────────────────────────────────────
# 5 — DUCKDUCKGO WEB MENTIONS
# ─────────────────────────────────────────────────────────────────────────────

async def search_phone_mentions(client: httpx.AsyncClient, phone: str) -> list:
    queries = [
        f'"{phone}" fraud OR scam OR complaint',
        f'"{phone}" site:consumercomplaints.in OR site:mouthshut.com',
        f'"+91{phone}"',
        f'"{phone}" site:justdial.com OR site:sulekha.com',
    ]
    seen_urls: set = set()
    all_results: list = []

    for i, query in enumerate(queries):
        if i > 0:
            await asyncio.sleep(1.5)
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
                continue
            soup = BeautifulSoup(r.text, "lxml")
            for a in soup.select("a.result__a")[:8]:
                href = a.get("href", "")
                # Unwrap DuckDuckGo redirect
                if "uddg=" in href:
                    try:
                        from urllib.parse import parse_qs, urlparse
                        href = parse_qs(urlparse(href).query).get("uddg", [href])[0]
                    except Exception:
                        pass
                if href in seen_urls or not href.startswith("http"):
                    continue
                seen_urls.add(href)
                title = a.get_text(strip=True)
                snippet = ""
                parent = a.find_parent("div", class_="result__body")
                if parent:
                    sn = parent.find("a", class_="result__snippet")
                    if sn:
                        snippet = sn.get_text(strip=True)

                # Classify
                hl = href.lower()
                if any(k in hl for k in ("complaint", "fraud", "scam", "cheated", "spam")):
                    category = "fraud_complaint"
                elif any(k in hl for k in ("justdial", "sulekha", "indiamart", "tradeindia")):
                    category = "business_listing"
                else:
                    category = "general_mention"

                all_results.append({
                    "title":              title,
                    "url":                href,
                    "snippet":            snippet,
                    "category":           category,
                    "query_that_found_it": query,
                })
        except Exception:
            continue

    return all_results[:10]


# ─────────────────────────────────────────────────────────────────────────────
# 6 — TRUECALLER PUBLIC SCRAPE
# ─────────────────────────────────────────────────────────────────────────────

async def fetch_truecaller(client: httpx.AsyncClient, phone: str) -> dict:
    """
    Name lookup using Google Custom Search API first (uses configured keys),
    then DuckDuckGo fallback, then direct Truecaller page scrape.
    """
    url = f"https://www.truecaller.com/search/in/{phone}"

    # Strategy 1: Google CSE — searches across truecaller.com, justdial.com etc.
    api_key = os.getenv("GOOGLE_CSE_API_KEY", "")
    cx      = os.getenv("GOOGLE_CSE_CX", "")
    if api_key and cx:
        queries = [
            f'"{phone}" truecaller name india',
            f'"+91{phone}" name',
            f'"{phone}" justdial india',
        ]
        for query in queries:
            try:
                r = await client.get(
                    "https://www.googleapis.com/customsearch/v1",
                    params={"q": query, "key": api_key, "cx": cx, "num": 5},
                    timeout=10,
                )
                if r.status_code == 200:
                    for item in r.json().get("items", []):
                        combined = item.get("title","") + " " + item.get("snippet","")
                        patterns = [
                            r"^([A-Z][a-z]+(?: [A-Z][a-z]+){1,3})\s*[-|–]\s*(?:\+?91)?" + re.escape(phone),
                            r"^([A-Z][a-z]+(?: [A-Z][a-z]+){1,3})\s*[-|–]",
                            r"([A-Z][a-z]+(?: [A-Z][a-z]+){1,3}) is (?:calling|a spam|a fraud)",
                            r"Name[:\s]+([A-Z][a-z]+(?: [A-Z][a-z]+){1,3})",
                        ]
                        for pat in patterns:
                            m = re.search(pat, combined)
                            if m:
                                name = m.group(1).strip()
                                skip = {"phone number","mobile number","truecaller",
                                        "justdial","india","unknown","caller"}
                                if name.lower() not in skip and len(name) > 2:
                                    return {
                                        "source":     "google_cse",
                                        "available":  True,
                                        "name":       name,
                                        "manual_url": url,
                                        "note":       f"Found via Google CSE",
                                    }
            except Exception:
                continue

    # Strategy 2: DuckDuckGo fallback
    try:
        await asyncio.sleep(1)
        r_ddg = await client.post(
            "https://html.duckduckgo.com/html/",
            data={"q": f'"{phone}" name truecaller OR justdial india'},
            headers={"User-Agent": MOZILLA_UA,
                     "Content-Type": "application/x-www-form-urlencoded"},
            timeout=10, follow_redirects=True,
        )
        if r_ddg.status_code == 200:
            soup = BeautifulSoup(r_ddg.text, "lxml")
            for a in soup.select("a.result__a")[:5]:
                title = a.get_text(strip=True)
                m = re.search(r"^([A-Z][a-z]+(?: [A-Z][a-z]+){1,3})\s*[-|–]", title)
                if m:
                    name = m.group(1).strip()
                    if name.lower() not in ("phone number","truecaller","justdial"):
                        return {
                            "source":     "duckduckgo",
                            "available":  True,
                            "name":       name,
                            "manual_url": url,
                            "note":       "Found via DuckDuckGo search",
                        }
    except Exception:
        pass

    # Strategy 3: Direct Truecaller page
    try:
        r = await client.get(url,
            headers={"User-Agent": MOZILLA_UA,
                     "Referer": "https://www.truecaller.com/"},
            timeout=10, follow_redirects=True)
        soup = BeautifulSoup(r.text, "lxml")
        og_tag = soup.find("meta", property="og:title")
        if og_tag:
            og_title = og_tag.get("content", "").strip()
            if (og_title and "truecaller" not in og_title.lower()
                    and len(og_title) > 2 and not og_title.startswith("+")):
                return {
                    "source":     "truecaller",
                    "available":  True,
                    "name":       og_title,
                    "manual_url": url,
                    "note":       "Found via Truecaller public page",
                }
    except Exception:
        pass

    return {
        "source":     "truecaller",
        "available":  False,
        "name":       None,
        "manual_url": url,
        "note":       "Truecaller requires login — check manually at truecaller.com",
    }


# ─────────────────────────────────────────────────────────────────────────────
# 7 — NCCRP / CYBERCRIME.GOV.IN CHECK
# ─────────────────────────────────────────────────────────────────────────────

async def check_nccrp(client: httpx.AsyncClient, phone: str) -> dict:
    manual_url = "https://www.cybercrime.gov.in"
    try:
        r = await client.get(
            manual_url,
            headers={"User-Agent": MOZILLA_UA},
            timeout=10,
            follow_redirects=True,
        )
        # Site is JS-rendered — httpx can't execute JS
        # Check if phone appears in raw HTML (unlikely but worth trying)
        if phone in r.text or f"+91{phone}" in r.text:
            return {
                "source":     "nccrp",
                "available":  True,
                "flagged":    True,
                "manual_url": manual_url,
                "note":       "Phone number found in NCCRP page source",
            }
        return {
            "source":     "nccrp",
            "available":  False,
            "flagged":    False,
            "manual_url": manual_url,
            "note":       "NCCRP portal is JS-rendered — manual check recommended at cybercrime.gov.in",
        }
    except Exception:
        return {
            "source":     "nccrp",
            "available":  False,
            "flagged":    False,
            "manual_url": manual_url,
            "note":       "Manual check recommended at cybercrime.gov.in",
        }


# ─────────────────────────────────────────────────────────────────────────────
# 8 — NUMVERIFY (optional free tier)
# ─────────────────────────────────────────────────────────────────────────────

async def fetch_numverify(client: httpx.AsyncClient, phone: str, api_key: str = "") -> dict:
    if not api_key or api_key in ("", "YOUR_KEY", "your_key_here"):
        return {
            "source":    "numverify",
            "available": False,
            "note":      "Add free key from numverify.com as NUMVERIFY_API_KEY env var",
        }
    try:
        r = await client.get(
            "http://apilayer.net/api/validate",
            params={"access_key": api_key, "number": f"91{phone}", "country_code": "IN"},
            timeout=10,
        )
        if r.status_code == 200:
            d = r.json()
            return {
                "source":    "numverify",
                "available": True,
                "valid":     d.get("valid"),
                "carrier":   d.get("carrier"),
                "line_type": d.get("line_type"),
                "location":  d.get("location"),
            }
    except Exception as e:
        pass
    return {"source": "numverify", "available": False, "note": "Numverify request failed"}


# ─────────────────────────────────────────────────────────────────────────────
# 9 — RISK SCORER
# ─────────────────────────────────────────────────────────────────────────────

def compute_phone_risk(results: dict) -> dict:
    score   = 0
    signals = []

    nccrp = results.get("nccrp", {})
    if nccrp.get("flagged"):
        score += 50
        signals.append("Flagged on NCCRP cybercrime portal")

    mule = results.get("mule_patterns", {})
    if mule.get("high_fraud_circle"):
        score += 15
        signals.append(mule.get("risk_reason", "High fraud circle"))

    mentions = results.get("web_mentions", [])
    fraud_count = sum(1 for m in mentions if m.get("category") == "fraud_complaint")
    if fraud_count >= 3:
        score += 20
        signals.append(f"{fraud_count} fraud/complaint web mentions found")
    elif fraud_count >= 1:
        score += 10
        signals.append(f"{fraud_count} fraud/complaint web mention found")

    biz_only = len(mentions) > 0 and fraud_count == 0 and all(
        m.get("category") == "business_listing" for m in mentions
    )
    if biz_only:
        score -= 10
        signals.append("Only business listing mentions — reduces risk")

    score = max(0, min(100, score))

    if score >= 60:
        level = "HIGH"
        color = "#ef4444"
    elif score >= 30:
        level = "MEDIUM"
        color = "#f59e0b"
    else:
        level = "LOW"
        color = "#22c55e"

    return {
        "score":   score,
        "level":   level,
        "color":   color,
        "signals": signals,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 10 — INVESTIGATOR SUMMARY
# ─────────────────────────────────────────────────────────────────────────────

def generate_summary(phone: str, results: dict) -> str:
    telecom  = results.get("telecom", {})
    tc       = results.get("truecaller", {})
    nccrp    = results.get("nccrp", {})
    mule     = results.get("mule_patterns", {})
    mentions = results.get("web_mentions", [])
    risk     = results.get("risk_score", {})

    op     = telecom.get("operator", "Unknown operator")
    circle = telecom.get("circle", "unknown circle")
    name   = tc.get("name") if tc.get("available") else None

    parts = [f"Number {phone[:5]}XXXXX is registered with {op} in {circle} circle"]
    parts.append("likely prepaid" if telecom.get("prepaid_likely") else "postpaid possible")

    if name:
        parts.append(f"Subscriber name publicly available as '{name}'")
    else:
        parts.append("Subscriber name requires Truecaller/paid API — not available via free sources (check truecaller.com manually)")

    if nccrp.get("flagged"):
        parts.append("⚠ NUMBER FLAGGED on NCCRP cybercrime portal")
    else:
        parts.append("No cybercrime complaints confirmed on NCCRP (manual verification recommended)")

    fraud_count = sum(1 for m in mentions if m.get("category") == "fraud_complaint")
    total_mentions = len(mentions)
    parts.append(
        f"{total_mentions} web mention{'s' if total_mentions != 1 else ''} found"
        + (f" including {fraud_count} fraud/complaint result{'s' if fraud_count != 1 else ''}" if fraud_count else "")
    )

    if mule.get("high_fraud_circle"):
        parts.append(
            f"⚠ {circle} is a high-fraud-originating circle per NCRP published data"
        )
    else:
        parts.append(f"{circle} is not flagged as a high-fraud-originating circle per NCRP data")

    parts.append("15 probable UPI IDs generated for investigator verification (unconfirmed)")
    parts.append(f"Overall risk assessment: {risk.get('level', 'LOW')} ({risk.get('score', 0)}/100)")

    return ". ".join(parts) + "."


# ─────────────────────────────────────────────────────────────────────────────
# MAIN ORCHESTRATOR
# ─────────────────────────────────────────────────────────────────────────────

async def phone_intelligence(phone: str, numverify_key: str = "") -> dict:
    norm = normalize_phone(phone)
    if not norm["is_valid"]:
        return {"error": f"Invalid Indian phone number: '{phone}'. Must be 10 digits starting with 6/7/8/9.", "valid": False}

    p = norm["normalized"]

    # Offline — instant
    telecom  = detect_telecom_circle(p)
    upi_ids  = generate_upi_ids(p)
    mule     = check_mule_patterns(p, telecom["circle"])

    # Async — concurrent
    async with httpx.AsyncClient(follow_redirects=True) as client:
        tc_task    = fetch_truecaller(client, p)
        nccrp_task = check_nccrp(client, p)
        ddg_task   = search_phone_mentions(client, p)
        nv_task    = fetch_numverify(client, p, numverify_key or os.getenv("NUMVERIFY_API_KEY", ""))

        tc, nccrp, mentions, numverify = await asyncio.gather(
            tc_task, nccrp_task, ddg_task, nv_task,
            return_exceptions=True,
        )

    def safe(val, fallback):
        return val if isinstance(val, dict) else fallback

    def safe_list(val):
        return val if isinstance(val, list) else []

    results = {
        "phone":         norm,
        "telecom":       telecom,
        "upi_ids":       upi_ids,
        "mule_patterns": mule,
        "truecaller":    safe(tc,       {"source": "truecaller", "available": False, "note": "Request failed"}),
        "nccrp":         safe(nccrp,    {"source": "nccrp",      "available": False, "note": "Request failed"}),
        "web_mentions":  safe_list(mentions),
        "numverify":     safe(numverify, {"source": "numverify", "available": False}),
    }

    results["risk_score"] = compute_phone_risk(results)
    results["summary"]    = generate_summary(p, results)
    return results
