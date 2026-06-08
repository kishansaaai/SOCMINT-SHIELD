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

app = FastAPI(title="SOCMINT Shield API", version="2.0.0")

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


@app.get("/")
def root():
    return {"status": "SOCMINT Shield API v2.0 running", "platforms": 20}


@app.get("/api/health")
def health():
    return {"status": "ok", "time": datetime.utcnow().isoformat(), "version": "2.0.0"}


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
