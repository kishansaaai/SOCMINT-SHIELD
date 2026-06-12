"""
SOCMINT Shield — new feature endpoints.

Drop this file in `backend/` and register its router in `main.py`:

    from addons import router as addons_router
    app.include_router(addons_router)

Endpoints added:
    /api/case/create             POST   — create investigation case
    /api/case/{case_id}          GET    — fetch case + chain of custody
    /api/case/{case_id}/update   POST   — change status / notes / sharing
    /api/case/{case_id}/snapshot POST   — append a search snapshot
    /api/case/{case_id}/verify   GET    — verify chain-of-custody hashes
    /api/case/list               GET    — list cases (filterable)
    /api/case/{case_id}/delete   DELETE — soft delete

    /api/image/analyze           POST   — analyze one avatar URL
    /api/image/reverse           POST   — reverse image search
    /api/image/duplicates        POST   — cross-platform avatar dedup
    /api/image/intel             POST   — bundled image intel

    /api/crypto/trace            POST   — auto-detect chain, full trace
    /api/crypto/cluster          POST   — BTC common-input cluster
    /api/crypto/validate         POST   — chain detection only

    /api/darkweb/run             POST   — Telegram + paste + darkweb scan
    /api/darkweb/telegram        POST   — scrape single channel
    /api/darkweb/pastes          POST   — search paste aggregators
    /api/darkweb/bot-score       POST   — bot-likelihood for a profile

    /api/nlp/analyze             POST   — full text NLP bundle
    /api/nlp/sentiment           POST   — sentiment only
    /api/nlp/threat              POST   — threat keyword scan
    /api/nlp/entities            POST   — entity extraction
    /api/nlp/language            POST   — language detection

    /api/alerts/subscribe        POST   — create a subscription
    /api/alerts/unsubscribe      POST   — disable a subscription
    /api/alerts/list             GET    — list subscriptions
    /api/alerts/fire             POST   — fire an alert manually
    /api/alerts/recent/{target}  GET    — recent events for a target
"""

import os
import logging
from typing import Dict, Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

import auth
from case_manager import get_store
import image_intel
import crypto_trace
import darkweb_intel
import nlp_analysis
import alerts
import domain_intel
import face_intel

logger = logging.getLogger("uvicorn.error")
router = APIRouter()


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------

class CaseCreateReq(BaseModel):
    target: str
    target_type: str = "username"
    case_title: str = ""
    notes: str = ""
    officer: str = "unknown"
    shared_with: List[str] = []


class CaseUpdateReq(BaseModel):
    officer: str = "unknown"
    status: Optional[str] = None
    notes: Optional[str] = None
    add_shared: Optional[str] = None
    remove_shared: Optional[str] = None


class SnapshotReq(BaseModel):
    officer: str = "unknown"
    label: str = "search"
    snapshot: Dict[str, Any]


class ImageAnalyzeReq(BaseModel):
    image_url: str


class ImageReverseReq(BaseModel):
    image_url: str


class AvatarEntry(BaseModel):
    platform: str
    url: str
    label: str = ""


class ImageDupesReq(BaseModel):
    avatars: List[AvatarEntry]
    hamming_threshold: int = 6


class ImageIntelReq(BaseModel):
    avatar_url: str


class DomainIntelReq(BaseModel):
    query: str


class FaceSearchReq(BaseModel):
    name: str
    image_base64: str


class CryptoTraceReq(BaseModel):
    address: str


class CryptoClusterReq(BaseModel):
    address: str
    depth: int = 1


class DarkwebRunReq(BaseModel):
    query: str


class TelegramReq(BaseModel):
    channel: str
    max_posts: int = 30


class PasteReq(BaseModel):
    query: str
    max_results: int = 15


class BotScoreReq(BaseModel):
    followers: int = 0
    following: int = 0
    posts: int = 0
    account_age_days: int = 1
    has_avatar: bool = True
    bio_length: int = 0


class NlpReq(BaseModel):
    text: str


class SubscribeReq(BaseModel):
    officer: str
    target: str
    target_type: str = "username"
    webhook_url: str = ""
    email_to: str = ""
    telegram_chat_id: str = ""
    min_risk: int = 0


class UnsubscribeReq(BaseModel):
    subscription_id: str


class FireAlertReq(BaseModel):
    target: str
    event_type: str
    message: str
    severity: str = "info"
    payload: Optional[Dict[str, Any]] = None


# ---------------------------------------------------------------------------
# CASE MANAGEMENT
# ---------------------------------------------------------------------------

@router.post("/api/case/create")
async def api_case_create(req: CaseCreateReq, _: str = Depends(auth.require_auth)):
    case = get_store().create_case(
        target=req.target,
        officer=req.officer,
        target_type=req.target_type,
        case_title=req.case_title,
        notes=req.notes,
        shared_with=req.shared_with,
    )
    return case


@router.get("/api/case/list")
async def api_case_list(
    status: Optional[str] = None,
    _: str = Depends(auth.require_auth),
):
    return {"cases": get_store().list_cases(status=status)}


@router.get("/api/case/{case_id}")
async def api_case_get(case_id: str, _: str = Depends(auth.require_auth)):
    c = get_store().get_case(case_id)
    if not c:
        raise HTTPException(404, "case not found")
    return c


@router.post("/api/case/{case_id}/update")
async def api_case_update(
    case_id: str, req: CaseUpdateReq, _: str = Depends(auth.require_auth)
):
    c = get_store().update_case(
        case_id, req.officer, req.status, req.notes,
        req.add_shared, req.remove_shared,
    )
    if not c:
        raise HTTPException(404, "case not found")
    return c


@router.post("/api/case/{case_id}/snapshot")
async def api_case_snapshot(
    case_id: str, req: SnapshotReq, _: str = Depends(auth.require_auth)
):
    snap = get_store().add_snapshot(
        case_id, req.officer, req.snapshot, req.label
    )
    if not snap:
        raise HTTPException(404, "case not found")
    return snap


@router.get("/api/case/{case_id}/verify")
async def api_case_verify(case_id: str, _: str = Depends(auth.require_auth)):
    return get_store().verify_integrity(case_id)


@router.delete("/api/case/{case_id}/delete")
async def api_case_delete(
    case_id: str,
    officer: str = Query("unknown"),
    _: str = Depends(auth.require_auth),
):
    ok = get_store().delete_case(case_id, officer)
    if not ok:
        raise HTTPException(404, "case not found")
    return {"ok": True}


# ---------------------------------------------------------------------------
# IMAGE FORENSICS
# ---------------------------------------------------------------------------

@router.post("/api/image/analyze")
async def api_image_analyze(req: ImageAnalyzeReq, _: str = Depends(auth.require_auth)):
    return await image_intel.analyze_avatar(req.image_url)


@router.post("/api/image/reverse")
async def api_image_reverse(req: ImageReverseReq, _: str = Depends(auth.require_auth)):
    return await image_intel.reverse_image_search(req.image_url)


@router.post("/api/image/duplicates")
async def api_image_duplicates(req: ImageDupesReq, _: str = Depends(auth.require_auth)):
    return await image_intel.find_duplicate_avatars(
        [a.dict() for a in req.avatars],
        hamming_threshold=req.hamming_threshold,
    )


@router.post("/api/image/intel")
async def api_image_intel(req: ImageIntelReq, _: str = Depends(auth.require_auth)):
    return await image_intel.run_image_intel(req.avatar_url)


# ---------------------------------------------------------------------------
# CRYPTO
# ---------------------------------------------------------------------------

@router.post("/api/crypto/trace")
async def api_crypto_trace(req: CryptoTraceReq, _: str = Depends(auth.require_auth)):
    return await crypto_trace.trace_address(req.address)


@router.post("/api/crypto/cluster")
async def api_crypto_cluster(req: CryptoClusterReq, _: str = Depends(auth.require_auth)):
    return await crypto_trace.cluster_btc_addresses(req.address, req.depth)


@router.post("/api/crypto/validate")
async def api_crypto_validate(req: CryptoTraceReq, _: str = Depends(auth.require_auth)):
    return {
        "address": req.address,
        "chain": crypto_trace.detect_chain(req.address),
    }


# ---------------------------------------------------------------------------
# DOMAIN / IP INTELLIGENCE
# ---------------------------------------------------------------------------

@router.post("/api/domain/intel")
async def api_domain_intel(req: DomainIntelReq, _: str = Depends(auth.require_auth)):
    return await domain_intel.run_domain_intel(req.query)


# ---------------------------------------------------------------------------
# FACE RECOGNITION SEARCH
# ---------------------------------------------------------------------------

@router.post("/api/face-search")
async def api_face_search(req: FaceSearchReq, _: str = Depends(auth.require_auth)):
    from identity_search import identity_search
    # 1. Fetch matching identity profiles by name
    identity_res = await identity_search(
        full_name=req.name,
        organization="",
    )
    candidates = identity_res.get("candidates", [])
    
    # 2. Run face recognition matching across the profiles
    matched_profiles = await face_intel.match_face_against_profiles(
        req.image_base64,
        candidates
    )
    
    return {
        "query": {
            "name": req.name,
        },
        "profiles": matched_profiles,
        "total": len(matched_profiles),
    }


# ---------------------------------------------------------------------------
# DARKWEB / TELEGRAM / BOT
# ---------------------------------------------------------------------------

@router.post("/api/darkweb/run")
async def api_darkweb_run(req: DarkwebRunReq, _: str = Depends(auth.require_auth)):
    return await darkweb_intel.run_darkweb_intel(req.query)


@router.post("/api/darkweb/telegram")
async def api_darkweb_telegram(req: TelegramReq, _: str = Depends(auth.require_auth)):
    return await darkweb_intel.scrape_telegram_channel(req.channel, req.max_posts)


@router.post("/api/darkweb/pastes")
async def api_darkweb_pastes(req: PasteReq, _: str = Depends(auth.require_auth)):
    return await darkweb_intel.search_paste_sites(req.query, req.max_results)


@router.post("/api/darkweb/bot-score")
async def api_darkweb_bot_score(req: BotScoreReq, _: str = Depends(auth.require_auth)):
    return darkweb_intel.bot_score(req.dict())


# ---------------------------------------------------------------------------
# NLP
# ---------------------------------------------------------------------------

@router.post("/api/nlp/analyze")
async def api_nlp_analyze(req: NlpReq, _: str = Depends(auth.require_auth)):
    return nlp_analysis.analyze_text(req.text)


@router.post("/api/nlp/sentiment")
async def api_nlp_sentiment(req: NlpReq, _: str = Depends(auth.require_auth)):
    lang = nlp_analysis.detect_language(req.text)["code"]
    return nlp_analysis.sentiment(req.text, lang)


@router.post("/api/nlp/threat")
async def api_nlp_threat(req: NlpReq, _: str = Depends(auth.require_auth)):
    return nlp_analysis.threat_keyword_scan(req.text)


@router.post("/api/nlp/entities")
async def api_nlp_entities(req: NlpReq, _: str = Depends(auth.require_auth)):
    return nlp_analysis.extract_entities(req.text)


@router.post("/api/nlp/language")
async def api_nlp_language(req: NlpReq, _: str = Depends(auth.require_auth)):
    return nlp_analysis.detect_language(req.text)


# ---------------------------------------------------------------------------
# ALERTS
# ---------------------------------------------------------------------------

@router.post("/api/alerts/subscribe")
async def api_alerts_subscribe(req: SubscribeReq, _: str = Depends(auth.require_auth)):
    sid = alerts.get_alert_store().subscribe(
        req.officer, req.target, req.target_type,
        req.webhook_url, req.email_to, req.telegram_chat_id, req.min_risk,
    )
    return {"subscription_id": sid, "ok": True}


@router.post("/api/alerts/unsubscribe")
async def api_alerts_unsubscribe(req: UnsubscribeReq, _: str = Depends(auth.require_auth)):
    ok = alerts.get_alert_store().unsubscribe(req.subscription_id)
    return {"ok": ok}


@router.get("/api/alerts/list")
async def api_alerts_list(_: str = Depends(auth.require_auth)):
    return {"subscriptions": alerts.get_alert_store().list_all_subscriptions()}


@router.post("/api/alerts/fire")
async def api_alerts_fire(req: FireAlertReq, _: str = Depends(auth.require_auth)):
    deliveries = await alerts.fire_alert(
        req.target, req.event_type, req.message,
        req.severity, req.payload,
    )
    return {"deliveries": deliveries}


@router.get("/api/alerts/recent/{target}")
async def api_alerts_recent(
    target: str,
    limit: int = 50,
    _: str = Depends(auth.require_auth),
):
    return {
        "events": alerts.get_alert_store().recent_events(target, limit)
    }
