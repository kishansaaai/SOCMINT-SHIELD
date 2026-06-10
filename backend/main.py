from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import time
import base64
import re
from datetime import datetime
from dotenv import load_dotenv
load_dotenv()

from platforms import run_all_platforms, search_news
from risk_engine import compute_risk_score
from report_gen import generate_65b_report
from identity_search import identity_search as run_identity_search
from phone_intel import phone_intelligence
from kanoon import run_legal_search
from ai_analysis import run_nexus_analysis, run_chat_analysis
from breach_check import check_haveibeenpwned
from email_intel import email_intelligence
from paste_search import search_pastes
from upi_search import trace_financial_footprint
from alias_detector import detect_aliases
from shadow_prober import detect_shadow_accounts

app = FastAPI(title="SOCMINT Shield API", version="4.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class SearchRequest(BaseModel):
    username: Optional[str] = None
    real_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


class KanoonRequest(BaseModel):
    name: str

class AIAnalysisRequest(BaseModel):
    profile_data: dict

class AIChatRequest(BaseModel):
    question: str
    profile_data: dict

class PhoneSearchRequest(BaseModel):
    phone: str
    numverify_key: Optional[str] = ""


class IdentitySearchRequest(BaseModel):
    full_name: str
    organization: str
    city: Optional[str] = None
    year: Optional[str] = None


class ReportRequest(BaseModel):
    profile_data: dict
    officer_name: str
    case_id: str


class GraphRequest(BaseModel):
    profile_data: dict


class TimelineRequest(BaseModel):
    profile_data: dict


class EvasionTimelineRequest(BaseModel):
    profile_data: dict


class EmailIntelRequest(BaseModel):
    email: str


class UpiSearchRequest(BaseModel):
    query: str
    phone: Optional[str] = None


class NewsRequest(BaseModel):
    query: str


@app.get("/")
def root():
    return {"status": "SOCMINT Shield API v4.0 running", "platforms": 30}


@app.get("/api/health")
def health():
    return {"status": "ok", "time": datetime.utcnow().isoformat(), "version": "4.0.0"}


@app.post("/api/search")
async def search(req: SearchRequest):
    if not any([req.username, req.real_name, req.phone, req.email]):
        raise HTTPException(status_code=400, detail="At least one identifier required")

    query = req.username or req.real_name or req.phone or req.email
    start_time = time.time()

    platform_results = await run_all_platforms(
        username=req.username,
        real_name=req.real_name,
        phone=req.phone,
        email=req.email,
    )

    risk = compute_risk_score(platform_results, query)

    # Extract alias map via scoring algorithm
    alias_map = detect_aliases(platform_results, query)

    # Probe for shadow accounts
    shadow_accounts = detect_shadow_accounts(platform_results, query)

    # Extract geo mentions
    geo_mentions = []
    for p in platform_results:
        if p.get("found") and p.get("location"):
            geo_mentions.append({
                "platform": p["platform"],
                "location": p["location"],
            })

    # Build behavioural timeline: merge posts from all platforms
    timeline = []
    for p in platform_results:
        if p.get("found") and p.get("posts"):
            for post in p["posts"]:
                timeline.append({
                    "platform": p["platform"],
                    "title": post.get("title") or post.get("name") or "",
                    "url": post.get("url") or "",
                    "score": post.get("score") or post.get("stars") or post.get("reactions") or 0,
                    "subreddit": post.get("subreddit") or "",
                })

    # Breach check if email provided
    breach_data = None
    if req.email:
        breach_data = await check_haveibeenpwned(req.email.strip())

    # Paste search
    paste_results = []
    try:
        paste_results = await search_pastes(query)
    except Exception:
        pass

    # News & web mentions
    news_articles = []
    try:
        import httpx
        async with httpx.AsyncClient(follow_redirects=True) as client:
            news_articles = await search_news(client, query)
    except Exception:
        pass

    # Legal records check (Indian Kanoon & MCA)
    legal_records = None
    if query and not (req.phone or (query.isdigit() and len(query) >= 10)):
        try:
            legal_records = await run_legal_search(query)
        except Exception:
            pass

    elapsed = round(time.time() - start_time, 2)

    return {
        "query": query,
        "elapsed_seconds": elapsed,
        "platforms_found": sum(1 for p in platform_results if p["found"]),
        "platforms_checked": len(platform_results),
        "risk_score": risk,
        "platforms": platform_results,
        "alias_map": alias_map,
        "shadow_accounts": shadow_accounts,
        "geo_mentions": geo_mentions,
        "timeline": timeline,
        "breach_data": breach_data,
        "paste_results": paste_results,
        "news_articles": news_articles,
        "legal_records": legal_records,
        "timestamp": datetime.utcnow().isoformat(),
    }



@app.post("/api/report")
def generate_report(req: ReportRequest):
    pdf_bytes = generate_65b_report(req.profile_data, req.officer_name, req.case_id)
    return {
        "pdf_base64": base64.b64encode(pdf_bytes).decode(),
        "filename": f"SOCMINT_65B_{req.case_id}.pdf",
    }


@app.post("/api/phone-search")
async def phone_search(req: PhoneSearchRequest):
    if not req.phone or not req.phone.strip():
        raise HTTPException(status_code=400, detail="phone is required")
    result = await phone_intelligence(req.phone.strip(), req.numverify_key or "")
    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@app.post("/api/identity-search")
async def identity_search_endpoint(req: IdentitySearchRequest):
    if not req.full_name.strip() or not req.organization.strip():
        raise HTTPException(status_code=400, detail="full_name and organization are required")
    result = await run_identity_search(
        full_name=req.full_name.strip(),
        organization=req.organization.strip(),
        city=req.city.strip() if req.city else None,
        year=req.year.strip() if req.year else None,
    )
    return result


@app.post("/api/kanoon-search")
async def kanoon_search(req: KanoonRequest):
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="name is required")
    return await run_legal_search(req.name.strip())


@app.post("/api/ai-analysis")
async def ai_analysis(req: AIAnalysisRequest):
    return await run_nexus_analysis(req.profile_data)


@app.post("/api/ai-chat")
async def ai_chat(req: AIChatRequest):
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="question is required")
    return await run_chat_analysis(req.question.strip(), req.profile_data)


@app.post("/api/email-intel")
async def email_intel(req: EmailIntelRequest):
    if not req.email.strip():
        raise HTTPException(status_code=400, detail="email is required")
    return await email_intelligence(req.email.strip())


@app.post("/api/upi-search")
async def upi_search(req: UpiSearchRequest):
    if not req.query.strip() and not req.phone:
        raise HTTPException(status_code=400, detail="query or phone is required")
    return await trace_financial_footprint(req.query.strip(), req.phone)


@app.post("/api/news")
async def get_news(req: NewsRequest):
    import httpx
    if not req.query.strip():
        return []
    async with httpx.AsyncClient(follow_redirects=True) as client:
        return await search_news(client, req.query.strip())


@app.post("/api/graph")
async def build_graph(req: GraphRequest):
    """Convert search results into entity graph nodes and edges."""
    data = req.profile_data
    query = data.get("query", "unknown")
    platforms = data.get("platforms", [])
    alias_map = data.get("alias_map", [])
    geo_mentions = data.get("geo_mentions", [])
    breach_data = data.get("breach_data")

    nodes = []
    edges = []
    node_id = 0

    # Suspect center node
    suspect_id = f"n{node_id}"
    nodes.append({
        "id": suspect_id,
        "type": "suspect",
        "label": query,
        "color": "#00ffff",
        "size": 28,
        "fx": 0,
        "fy": 0,
    })
    node_id += 1

    # Platform nodes
    platform_nodes = {}
    for p in platforms:
        pid = f"n{node_id}"
        found = p.get("found", False)
        nodes.append({
            "id": pid,
            "type": "platform_found" if found else "platform_notfound",
            "label": p.get("platform", ""),
            "color": "#22c55e" if found else "#334155",
            "size": 16 if found else 8,
            "url": p.get("url"),
            "avatar": p.get("avatar"),
            "display_name": p.get("display_name"),
            "bio": (p.get("bio") or "")[:100],
            "followers": p.get("followers"),
            "platform": p.get("platform"),
        })
        platform_nodes[p.get("platform")] = pid
        edge_type = "profile_found" if found else "not_found"
        edges.append({
            "source": suspect_id,
            "target": pid,
            "relationship": edge_type,
            "strength": 1.0 if found else 0.2,
            "dashed": not found,
        })
        node_id += 1

    # Alias nodes
    for a in alias_map:
        if a.get("differs"):
            aid = f"n{node_id}"
            nodes.append({
                "id": aid,
                "type": "alias",
                "label": a.get("display_name", ""),
                "color": "#8b5cf6",
                "size": 12,
                "platform": a.get("platform"),
            })
            edges.append({
                "source": suspect_id,
                "target": aid,
                "relationship": "uses_alias",
                "strength": 0.7,
                "dashed": True,
            })
            # Link alias to its platform
            ppid = platform_nodes.get(a.get("platform"))
            if ppid:
                edges.append({
                    "source": ppid,
                    "target": aid,
                    "relationship": "alias_on_platform",
                    "strength": 0.5,
                    "dashed": True,
                })
            node_id += 1

    # Location nodes
    seen_locs = set()
    for g in geo_mentions:
        loc = g.get("location", "")
        if loc and loc.lower() not in seen_locs:
            seen_locs.add(loc.lower())
            lid = f"n{node_id}"
            nodes.append({
                "id": lid,
                "type": "location",
                "label": loc,
                "color": "#f59e0b",
                "size": 12,
            })
            # Connect to platform that reported this location
            ppid = platform_nodes.get(g.get("platform"))
            if ppid:
                edges.append({
                    "source": ppid,
                    "target": lid,
                    "relationship": "located_at",
                    "strength": 0.6,
                    "dashed": False,
                })
            node_id += 1

    # Breach nodes
    if breach_data and breach_data.get("breached"):
        for b in breach_data.get("breaches", [])[:5]:
            bid = f"n{node_id}"
            nodes.append({
                "id": bid,
                "type": "email_breach",
                "label": b.get("name", "Breach"),
                "color": "#ef4444",
                "size": 14,
                "date": b.get("date"),
                "data_classes": b.get("data_classes", []),
            })
            edges.append({
                "source": suspect_id,
                "target": bid,
                "relationship": "breached_in",
                "strength": 0.9,
                "dashed": False,
            })
            node_id += 1

    # Same display name cross-links
    found_platforms = [p for p in platforms if p.get("found")]
    display_names = {}
    for p in found_platforms:
        dn = (p.get("display_name") or "").lower().strip()
        if dn and dn != query.lower().strip():
            display_names.setdefault(dn, []).append(p.get("platform"))
    for dn, plats in display_names.items():
        if len(plats) >= 2:
            for i in range(len(plats)):
                for j in range(i + 1, len(plats)):
                    p1 = platform_nodes.get(plats[i])
                    p2 = platform_nodes.get(plats[j])
                    if p1 and p2:
                        edges.append({
                            "source": p1,
                            "target": p2,
                            "relationship": "same_display_name",
                            "strength": 0.8,
                            "dashed": False,
                        })

    return {"nodes": nodes, "edges": edges}


@app.post("/api/timeline")
async def build_timeline(req: TimelineRequest):
    """Extract and sort all temporal events from search results."""
    data = req.profile_data
    platforms = data.get("platforms", [])
    events = []

    PLATFORM_COLORS = {
        "GitHub": "#2b3137", "Reddit": "#ff4500", "HackerNews": "#ff6600",
        "Dev.to": "#0a0a0a", "GitLab": "#fc6d26", "Tumblr": "#36465d",
        "Twitter/X": "#1da1f2", "Instagram": "#e1306c", "TikTok": "#010101",
        "LinkedIn": "#0077b5", "Telegram": "#0088cc", "Snapchat": "#fffc00",
        "YouTube": "#ff0000", "Quora": "#b92b27", "Pastebin": "#02456c",
        "Facebook": "#1877f2", "ShareChat": "#ff6347", "Koo": "#f5c518",
        "Discord": "#5865f2", "Josh/Moj": "#ff1493",
    }

    for p in platforms:
        if not p.get("found"):
            continue
        platform_name = p.get("platform", "")
        platform_color = PLATFORM_COLORS.get(platform_name, "#64748b")

        # Account creation event
        created = p.get("created_at")
        if created:
            try:
                dt = datetime.fromisoformat(created.replace("Z", "+00:00").replace("+00:00", ""))
                days_ago = (datetime.utcnow() - dt).days
                if days_ago < 1:
                    human = "Today"
                elif days_ago < 30:
                    human = f"{days_ago} days ago"
                elif days_ago < 365:
                    human = f"{days_ago // 30} months ago"
                else:
                    human = f"{days_ago // 365} years ago"

                events.append({
                    "platform": platform_name,
                    "platform_color": platform_color,
                    "event_type": "account_created",
                    "title": f"Account created on {platform_name}",
                    "url": p.get("url", ""),
                    "date_iso": created,
                    "date_human": human,
                    "content_preview": f"User joined {platform_name}",
                    "metadata": {"display_name": p.get("display_name")},
                })
            except Exception:
                pass

        # Post events
        for post in (p.get("posts") or []):
            post_date = post.get("created_at") or post.get("published_at") or ""
            date_human = ""
            if post_date:
                try:
                    dt = datetime.fromisoformat(post_date.replace("Z", "+00:00").replace("+00:00", ""))
                    days_ago = (datetime.utcnow() - dt).days
                    if days_ago < 1:
                        date_human = "Today"
                    elif days_ago < 30:
                        date_human = f"{days_ago} days ago"
                    elif days_ago < 365:
                        date_human = f"{days_ago // 30} months ago"
                    else:
                        date_human = f"{days_ago // 365} years ago"
                except Exception:
                    pass

            title = post.get("title") or post.get("name") or "Untitled"
            events.append({
                "platform": platform_name,
                "platform_color": platform_color,
                "event_type": "repo_created" if platform_name == "GitHub" else "post_published",
                "title": title[:100],
                "url": post.get("url", ""),
                "date_iso": post_date,
                "date_human": date_human,
                "content_preview": (post.get("description") or "")[:150],
                "metadata": {
                    "score": post.get("score") or post.get("stars") or 0,
                    "subreddit": post.get("subreddit", ""),
                },
            })

    # Sort by date (newest first), putting undated events at the end
    def sort_key(e):
        d = e.get("date_iso", "")
        if d:
            try:
                return datetime.fromisoformat(d.replace("Z", "+00:00").replace("+00:00", ""))
            except Exception:
                pass
        return datetime.min

    events.sort(key=sort_key, reverse=True)

    # Pattern of Life summary
    platform_counts = {}
    earliest = None
    latest = None
    for e in events:
        p = e.get("platform", "")
        platform_counts[p] = platform_counts.get(p, 0) + 1
        d = e.get("date_iso", "")
        if d:
            try:
                dt = datetime.fromisoformat(d.replace("Z", "+00:00").replace("+00:00", ""))
                if earliest is None or dt < earliest:
                    earliest = dt
                if latest is None or dt > latest:
                    latest = dt
            except Exception:
                pass

    most_active = max(platform_counts, key=platform_counts.get) if platform_counts else "N/A"

    summary = {
        "most_active_platform": most_active,
        "total_events": len(events),
        "first_seen": earliest.isoformat() if earliest else None,
        "last_activity": latest.isoformat() if latest else None,
        "first_seen_human": f"{(datetime.utcnow() - earliest).days // 365} years ago" if earliest else "Unknown",
        "last_activity_human": f"{(datetime.utcnow() - latest).days} days ago" if latest else "Unknown",
    }

    return {"events": events, "summary": summary}


@app.post("/api/evasion-timeline")
async def evasion_timeline(req: EvasionTimelineRequest):
    """
    Build a chronological evasion timeline by cross-referencing
    account creations, geo mentions, and legal records.
    """
    data = req.profile_data
    platforms = data.get("platforms", [])
    geo_mentions = data.get("geo_mentions", [])
    query = data.get("query", "")

    # Fetch legal records (use pre-fetched if available, otherwise fetch)
    kanoon_results = []
    legal_records = data.get("legal_records")
    if legal_records and isinstance(legal_records, dict):
        kanoon_results = legal_records.get("court_cases", [])
    elif query:
        try:
            kanoon_data = await run_legal_search(query)
            kanoon_results = kanoon_data.get("court_cases", []) if isinstance(kanoon_data, dict) else []
        except Exception:
            pass

    events = []

    def _parse_date(d):
        if not d:
            return None
        try:
            return datetime.fromisoformat(
                d.replace("Z", "+00:00").replace("+00:00", "")
            )
        except Exception:
            return None

    def _human_date(dt):
        if not dt:
            return "Unknown"
        days = (datetime.utcnow() - dt).days
        if days < 1:
            return "Today"
        if days < 30:
            return f"{days} days ago"
        if days < 365:
            return f"{days // 30} months ago"
        return f"{days // 365} years ago"

    # ── Account creation events ──
    for p in platforms:
        if not p.get("found"):
            continue
        created = p.get("created_at")
        dt = _parse_date(created)
        location = p.get("location") or ""
        events.append({
            "platform": p.get("platform", ""),
            "date_iso": created or "",
            "date_human": _human_date(dt),
            "location": location,
            "event_type": "account_created",
            "title": f"Account created on {p.get('platform', '')}",
            "crimeMatched": None,
            "severity": None,
            "_dt": dt,
        })

    # ── Geo mention events ──
    for g in geo_mentions:
        events.append({
            "platform": g.get("platform", ""),
            "date_iso": "",
            "date_human": "Unknown",
            "location": g.get("location", ""),
            "event_type": "location_mention",
            "title": f"Location mentioned on {g.get('platform', '')}: {g.get('location', '')}",
            "crimeMatched": None,
            "severity": None,
            "_dt": None,
        })

    # ── Post events with dates ──
    for p in platforms:
        if not p.get("found"):
            continue
        for post in (p.get("posts") or []):
            post_date = post.get("created_at") or post.get("published_at") or ""
            dt = _parse_date(post_date)
            events.append({
                "platform": p.get("platform", ""),
                "date_iso": post_date,
                "date_human": _human_date(dt),
                "location": "",
                "event_type": "post",
                "title": (post.get("title") or post.get("name") or "Untitled")[:100],
                "crimeMatched": None,
                "severity": None,
                "_dt": dt,
            })

    # ── Cross-reference: geo + account creation within 15 days ──
    account_events = [e for e in events if e["event_type"] == "account_created" and e["_dt"]]
    geo_events = [e for e in events if e["event_type"] == "location_mention" and e.get("location")]

    for geo_ev in geo_events:
        geo_loc = geo_ev["location"].lower()
        for acc_ev in account_events:
            if acc_ev["_dt"] and acc_ev.get("location") and geo_loc in acc_ev["location"].lower():
                geo_ev["crimeMatched"] = {
                    "type": "proximity_match",
                    "detail": f"Account on {acc_ev['platform']} created near this location",
                }
                geo_ev["severity"] = "WARNING"

    # ── Cross-reference: kanoon legal records ──
    for k in kanoon_results:
        crime_title = k.get("title", "")
        crime_date_str = k.get("date", "")
        crime_dt = _parse_date(crime_date_str)

        # Extract city-like tokens from the legal record title
        crime_words = set(re.sub(r'[^a-zA-Z\s]', '', crime_title.lower()).split())

        for acc_ev in account_events:
            if not acc_ev["_dt"]:
                continue

            # Check date proximity (within 15 days)
            date_close = False
            if crime_dt:
                date_close = abs((acc_ev["_dt"] - crime_dt).days) <= 15

            # Check location match
            loc_match = False
            acc_loc = (acc_ev.get("location") or "").lower()
            if acc_loc:
                loc_words = set(acc_loc.split())
                loc_match = bool(loc_words & crime_words)

            if date_close and loc_match:
                acc_ev["crimeMatched"] = {
                    "type": "legal_record",
                    "title": crime_title[:120],
                    "date": crime_date_str,
                }
                acc_ev["severity"] = "CRITICAL"

    # Clean internal keys and sort chronologically
    import re
    for e in events:
        e.pop("_dt", None)

    def _sort_key(e):
        dt = _parse_date(e.get("date_iso", ""))
        return dt or datetime.min

    events.sort(key=_sort_key)

    return {"events": events, "total": len(events)}
