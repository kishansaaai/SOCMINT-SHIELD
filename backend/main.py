from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import time
import base64
from datetime import datetime
from dotenv import load_dotenv
load_dotenv()

from platforms import run_all_platforms
from risk_engine import compute_risk_score
from report_gen import generate_65b_report
from identity_search import identity_search as run_identity_search
from phone_intel import phone_intelligence
from kanoon import run_legal_search
from ai_analysis import run_nexus_analysis, run_chat_analysis
from breach_check import check_haveibeenpwned
from email_intel import email_intelligence
from paste_search import search_pastes

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


class EmailIntelRequest(BaseModel):
    email: str


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

    # Extract alias map
    alias_map = []
    for p in platform_results:
        if p.get("found") and p.get("display_name"):
            alias_map.append({
                "platform": p["platform"],
                "display_name": p["display_name"],
                "differs": p["display_name"].lower().strip() != (query or "").lower().strip(),
            })

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

    elapsed = round(time.time() - start_time, 2)

    return {
        "query": query,
        "elapsed_seconds": elapsed,
        "platforms_found": sum(1 for p in platform_results if p["found"]),
        "platforms_checked": len(platform_results),
        "risk_score": risk,
        "platforms": platform_results,
        "alias_map": alias_map,
        "geo_mentions": geo_mentions,
        "timeline": timeline,
        "breach_data": breach_data,
        "paste_results": paste_results,
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
