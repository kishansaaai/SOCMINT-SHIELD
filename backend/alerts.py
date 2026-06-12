"""
Real-time Alert & Notification System.

Two channels out of the box (both free):
    1. Webhook delivery (POST to a URL)
    2. Local JSON-line audit log

Optional channels (auto-enabled if env vars are set):
    3. Email via SMTP (Gmail, SendGrid, etc.)
    4. Telegram bot message

Alert events:
    - target username newly registered on a platform
    - breach detected for monitored email
    - target mentioned in new paste
    - risk-score threshold crossed (e.g. >= 70)
    - dormant account suddenly active
    - dark-web mention
"""

import os
import json
import time
import uuid
import asyncio
import smtplib
import logging
import sqlite3
from email.mime.text import MIMEText
from typing import List, Dict, Any, Optional, Callable, Awaitable

import httpx

logger = logging.getLogger("uvicorn.error")

ALERTS_DB = os.getenv(
    "SOCMINT_ALERTS_DB",
    os.path.join(os.path.dirname(__file__), "alerts.db"),
)

# ---------------------------------------------------------------------------
# Storage
# ---------------------------------------------------------------------------

class AlertStore:
    """SQLite-backed alert subscriptions + delivery log."""

    def __init__(self, path: str = ALERTS_DB):
        self.path = path
        self._init()

    def _conn(self):
        return sqlite3.connect(self.path)

    def _init(self):
        with self._conn() as c:
            c.execute(
                """
                CREATE TABLE IF NOT EXISTS subscriptions (
                    id TEXT PRIMARY KEY,
                    officer TEXT NOT NULL,
                    target TEXT NOT NULL,
                    target_type TEXT,
                    webhook_url TEXT,
                    email_to TEXT,
                    telegram_chat_id TEXT,
                    min_risk INTEGER DEFAULT 0,
                    created_at INTEGER NOT NULL,
                    active INTEGER DEFAULT 1
                )
                """
            )
            c.execute(
                """
                CREATE TABLE IF NOT EXISTS events (
                    id TEXT PRIMARY KEY,
                    subscription_id TEXT,
                    target TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    severity TEXT,
                    message TEXT,
                    payload TEXT,
                    delivered INTEGER DEFAULT 0,
                    delivery_log TEXT,
                    created_at INTEGER NOT NULL
                )
                """
            )

    # -- subscriptions ------------------------------------------------------

    def subscribe(
        self,
        officer: str,
        target: str,
        target_type: str = "username",
        webhook_url: str = "",
        email_to: str = "",
        telegram_chat_id: str = "",
        min_risk: int = 0,
    ) -> str:
        sid = f"SUB-{uuid.uuid4().hex[:8].upper()}"
        with self._conn() as c:
            c.execute(
                "INSERT INTO subscriptions VALUES (?,?,?,?,?,?,?,?,?,?)",
                (
                    sid, officer, target, target_type,
                    webhook_url, email_to, telegram_chat_id, min_risk,
                    int(time.time()), 1,
                ),
            )
        return sid

    def unsubscribe(self, sub_id: str) -> bool:
        with self._conn() as c:
            cur = c.execute(
                "UPDATE subscriptions SET active=0 WHERE id=?", (sub_id,)
            )
            return cur.rowcount > 0

    def get_subscriptions(self, target: str) -> List[Dict[str, Any]]:
        with self._conn() as c:
            rows = c.execute(
                "SELECT * FROM subscriptions WHERE target=? AND active=1",
                (target,),
            ).fetchall()
        cols = [d[0] for d in c.description] if rows else []
        return [dict(zip(cols, r)) for r in rows]

    def list_all_subscriptions(self) -> List[Dict[str, Any]]:
        with self._conn() as c:
            rows = c.execute(
                "SELECT * FROM subscriptions WHERE active=1 ORDER BY created_at DESC"
            ).fetchall()
        cols = [d[0] for d in c.description] if rows else []
        return [dict(zip(cols, r)) for r in rows]

    # -- events ------------------------------------------------------------

    def record_event(
        self,
        target: str,
        event_type: str,
        message: str,
        severity: str = "info",
        payload: Optional[Dict[str, Any]] = None,
        subscription_id: str = "",
    ) -> str:
        eid = f"EVT-{uuid.uuid4().hex[:10].upper()}"
        with self._conn() as c:
            c.execute(
                "INSERT INTO events VALUES (?,?,?,?,?,?,?,?,?)",
                (
                    eid, subscription_id, target, event_type, severity,
                    message, json.dumps(payload or {}, default=str),
                    0, "", int(time.time()),
                ),
            )
        return eid

    def mark_event_delivered(self, event_id: str, log_text: str):
        with self._conn() as c:
            c.execute(
                "UPDATE events SET delivered=1, delivery_log=? WHERE id=?",
                (log_text, event_id),
            )

    def recent_events(self, target: str, limit: int = 50) -> List[Dict[str, Any]]:
        with self._conn() as c:
            rows = c.execute(
                "SELECT * FROM events WHERE target=? ORDER BY created_at DESC LIMIT ?",
                (target, limit),
            ).fetchall()
        cols = [d[0] for d in c.description] if rows else []
        return [dict(zip(cols, r)) for r in rows]


# ---------------------------------------------------------------------------
# Delivery channels
# ---------------------------------------------------------------------------

async def deliver_webhook(url: str, event: Dict[str, Any]) -> Dict[str, Any]:
    if not url:
        return {"ok": False, "note": "no webhook url"}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(url, json=event)
            return {
                "ok": r.status_code < 400,
                "status": r.status_code,
                "body": r.text[:200],
            }
    except Exception as e:
        return {"ok": False, "error": str(e)}


SMTP_HOST = os.getenv("ALERTS_SMTP_HOST", "")
SMTP_PORT = int(os.getenv("ALERTS_SMTP_PORT", "587"))
SMTP_USER = os.getenv("ALERTS_SMTP_USER", "")
SMTP_PASS = os.getenv("ALERTS_SMTP_PASS", "")
SMTP_FROM = os.getenv("ALERTS_SMTP_FROM", "alerts@socmint-shield.local")


def deliver_email(to: str, event: Dict[str, Any]) -> Dict[str, Any]:
    if not all([SMTP_HOST, SMTP_USER, SMTP_PASS]):
        return {"ok": False, "note": "SMTP not configured"}
    try:
        body = (
            f"SOCMINT Shield Alert\n"
            f"===================\n"
            f"Target: {event.get('target')}\n"
            f"Event:  {event.get('event_type')}\n"
            f"Severity: {event.get('severity')}\n"
            f"Message: {event.get('message')}\n"
            f"Time:   {event.get('created_at_iso')}\n"
        )
        msg = MIMEText(body)
        msg["Subject"] = f"[SOCMINT] {event.get('severity').upper()} — {event.get('event_type')}"
        msg["From"] = SMTP_FROM
        msg["To"] = to

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as s:
            s.starttls()
            s.login(SMTP_USER, SMTP_PASS)
            s.send_message(msg)
        return {"ok": True}
    except Exception as e:
        return {"ok": False, "error": str(e)}


TG_BOT_TOKEN = os.getenv("ALERTS_TELEGRAM_BOT_TOKEN", "")


async def deliver_telegram(chat_id: str, event: Dict[str, Any]) -> Dict[str, Any]:
    if not TG_BOT_TOKEN or not chat_id:
        return {"ok": False, "note": "Telegram not configured"}
    text = (
        f"🚨 *SOCMINT Alert*\n"
        f"Target: `{event.get('target')}`\n"
        f"Event: *{event.get('event_type')}*\n"
        f"Severity: {event.get('severity')}\n"
        f"_{event.get('message', '')}_"
    )
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(
                f"https://api.telegram.org/bot{TG_BOT_TOKEN}/sendMessage",
                json={
                    "chat_id": chat_id,
                    "text": text,
                    "parse_mode": "Markdown",
                },
            )
            return {
                "ok": r.status_code == 200,
                "status": r.status_code,
                "body": r.text[:200],
            }
    except Exception as e:
        return {"ok": False, "error": str(e)}


# ---------------------------------------------------------------------------
# Public entrypoint
# ---------------------------------------------------------------------------

_store: Optional[AlertStore] = None


def get_alert_store() -> AlertStore:
    global _store
    if _store is None:
        _store = AlertStore()
    return _store


async def fire_alert(
    target: str,
    event_type: str,
    message: str,
    severity: str = "info",
    payload: Optional[Dict[str, Any]] = None,
    min_severity: str = "info",
) -> List[Dict[str, Any]]:
    """
    Look up all subscriptions for `target`, record an event, and deliver
    to every configured channel.  Returns a list of delivery results.
    """
    sev_rank = {"info": 0, "low": 1, "medium": 2, "high": 3, "critical": 4}
    if sev_rank.get(severity, 0) < sev_rank.get(min_severity, 0):
        return []

    store = get_alert_store()
    subs = store.get_subscriptions(target)
    if not subs:
        # Always log to events even if no subscribers
        eid = store.record_event(
            target, event_type, message, severity, payload
        )
        return [{"subscription_id": None, "event_id": eid, "delivered": False,
                 "note": "no subscriptions for this target"}]

    results = []
    for sub in subs:
        eid = store.record_event(
            target, event_type, message, severity, payload,
            subscription_id=sub["id"],
        )
        event = {
            "event_id": eid,
            "target": target,
            "event_type": event_type,
            "severity": severity,
            "message": message,
            "payload": payload or {},
            "created_at_iso": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }

        channels = []

        # Webhook
        if sub.get("webhook_url"):
            channels.append(("webhook", await deliver_webhook(sub["webhook_url"], event)))

        # Email (synchronous SMTP)
        if sub.get("email_to"):
            channels.append(("email", deliver_email(sub["email_to"], event)))

        # Telegram
        if sub.get("telegram_chat_id"):
            channels.append(("telegram", await deliver_telegram(sub["telegram_chat_id"], event)))

        delivered = any(c[1].get("ok") for c in channels)
        log_text = json.dumps(channels, default=str)
        if delivered:
            store.mark_event_delivered(eid, log_text)

        results.append({
            "subscription_id": sub["id"],
            "event_id": eid,
            "delivered": delivered,
            "channels": channels,
        })

    return results
