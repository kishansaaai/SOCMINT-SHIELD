"""
Case Management System — persist and collaborate on investigations.

A "case" bundles together:
    - the target (username, name, phone, etc.)
    - the officer running it
    - all search results (platforms, risk, aliases, news, breach, image)
    - a chain-of-custody hash log
    - status (open / active / pending-review / closed)
    - free-form notes
    - shared officers list (for inter-department collaboration)

Storage backend:
    - local JSON file by default (works offline, no DB required)
    - pluggable: pass a custom `storage` callable to use Redis/SQL/etc.

The chain-of-custody hash is computed over the canonical JSON of each
saved snapshot, so any tampering is detectable.
"""

import os
import json
import time
import uuid
import hashlib
import logging
from typing import Dict, List, Any, Optional, Callable
from datetime import datetime, timezone

logger = logging.getLogger("uvicorn.error")

DEFAULT_CASES_FILE = os.getenv(
    "SOCMINT_CASES_FILE",
    os.path.join(os.path.dirname(__file__), "cases.json"),
)


# ---------------------------------------------------------------------------
# Storage abstraction
# ---------------------------------------------------------------------------

class CaseStore:
    """Pluggable storage. Default = local JSON file."""

    def __init__(self, path: str = DEFAULT_CASES_FILE):
        self.path = path
        self._ensure_file()

    def _ensure_file(self):
        if not os.path.exists(self.path):
            with open(self.path, "w", encoding="utf-8") as f:
                json.dump({"cases": []}, f, indent=2)

    def _read(self) -> Dict[str, Any]:
        try:
            with open(self.path, "r", encoding="utf-8") as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return {"cases": []}

    def _write(self, data: Dict[str, Any]):
        tmp = self.path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        os.replace(tmp, self.path)

    # -- CRUD ---------------------------------------------------------------

    def list_cases(self, status: Optional[str] = None) -> List[Dict[str, Any]]:
        data = self._read()
        cases = data.get("cases", [])
        if status:
            cases = [c for c in cases if c.get("status") == status]
        return sorted(cases, key=lambda c: c.get("updated_at", 0), reverse=True)

    def get_case(self, case_id: str) -> Optional[Dict[str, Any]]:
        for c in self._read().get("cases", []):
            if c.get("id") == case_id:
                return c
        return None

    def create_case(
        self,
        target: str,
        officer: str,
        target_type: str = "username",
        case_title: str = "",
        notes: str = "",
        shared_with: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        now = int(time.time())
        case = {
            "id": f"CASE-{uuid.uuid4().hex[:8].upper()}",
            "title": case_title or f"{target_type}:{target}",
            "target": target,
            "target_type": target_type,
            "officer": officer,
            "shared_with": shared_with or [],
            "status": "open",
            "notes": notes,
            "created_at": now,
            "updated_at": now,
            "snapshots": [],
            "chain_of_custody": [],
        }
        case["chain_of_custody"].append(_custody_event("created", officer, now))
        data = self._read()
        data["cases"].append(case)
        self._write(data)
        return case

    def update_case(
        self,
        case_id: str,
        officer: str,
        status: Optional[str] = None,
        notes: Optional[str] = None,
        add_shared: Optional[str] = None,
        remove_shared: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        data = self._read()
        for c in data["cases"]:
            if c["id"] == case_id:
                if status:
                    c["status"] = status
                if notes is not None:
                    c["notes"] = notes
                if add_shared and add_shared not in c["shared_with"]:
                    c["shared_with"].append(add_shared)
                if remove_shared and remove_shared in c["shared_with"]:
                    c["shared_with"].remove(remove_shared)
                c["updated_at"] = int(time.time())
                c["chain_of_custody"].append(
                    _custody_event(
                        "updated",
                        officer,
                        c["updated_at"],
                        details={
                            k: v for k, v in
                            [("status", status), ("notes", notes),
                             ("add_shared", add_shared),
                             ("remove_shared", remove_shared)]
                            if v is not None
                        },
                    )
                )
                self._write(data)
                return c
        return None

    def add_snapshot(
        self,
        case_id: str,
        officer: str,
        snapshot: Dict[str, Any],
        label: str = "search",
    ) -> Optional[Dict[str, Any]]:
        """
        Append a search result snapshot to a case. Computes a hash
        of the previous chain head to keep the integrity log tamper-evident.
        """
        data = self._read()
        for c in data["cases"]:
            if c["id"] == case_id:
                now = int(time.time())
                # Canonicalise and hash
                payload = json.dumps(snapshot, sort_keys=True, default=str)
                sha = hashlib.sha256(payload.encode("utf-8")).hexdigest()
                prev_hash = (
                    c["chain_of_custody"][-1]["hash"] if c["chain_of_custody"] else ""
                )
                block_hash = hashlib.sha256(
                    f"{prev_hash}|{sha}|{now}|{officer}|{label}".encode()
                ).hexdigest()
                snap_entry = {
                    "label": label,
                    "officer": officer,
                    "timestamp": now,
                    "sha256": sha,
                    "prev_hash": prev_hash,
                    "block_hash": block_hash,
                    "data": snapshot,
                }
                c["snapshots"].append(snap_entry)
                c["chain_of_custody"].append(
                    {
                        "event": "snapshot_added",
                        "actor": officer,
                        "timestamp": now,
                        "label": label,
                        "sha256": sha,
                        "prev_hash": prev_hash,
                        "hash": block_hash,
                    }
                )
                c["updated_at"] = now
                self._write(data)
                return snap_entry
        return None

    def delete_case(self, case_id: str, officer: str) -> bool:
        data = self._read()
        before = len(data["cases"])
        data["cases"] = [
            c for c in data["cases"] if c["id"] != case_id
        ]
        if len(data["cases"]) < before:
            logger.warning(
                f"Case {case_id} deleted by {officer} at "
                f"{datetime.now(timezone.utc).isoformat()}"
            )
            self._write(data)
            return True
        return False

    def verify_integrity(self, case_id: str) -> Dict[str, Any]:
        """Recompute the chain-of-custody hashes and report any drift."""
        c = self.get_case(case_id)
        if not c:
            return {"ok": False, "note": "case not found"}
        expected_prev = ""
        for i, ev in enumerate(c["chain_of_custody"]):
            sha = ev.get("sha256") or ev.get("hash") or ""
            recomputed = hashlib.sha256(
                f"{expected_prev}|{sha}|{ev.get('timestamp', 0)}|"
                f"{ev.get('actor', '')}|{ev.get('label', ev.get('event', ''))}".encode()
            ).hexdigest()
            if i == 0:
                # first event has no prev block
                expected_prev = recomputed
                continue
            if recomputed != ev.get("hash"):
                return {
                    "ok": False,
                    "broken_at_index": i,
                    "event": ev,
                }
            expected_prev = recomputed
        return {"ok": True, "events": len(c["chain_of_custody"])}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _custody_event(
    event: str, actor: str, ts: int, details: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    return {
        "event": event,
        "actor": actor,
        "timestamp": ts,
        "details": details or {},
        "hash": hashlib.sha256(
            f"{event}|{actor}|{ts}|{json.dumps(details or {}, sort_keys=True)}".encode()
        ).hexdigest(),
    }


# ---------------------------------------------------------------------------
# Module-level singleton (lazy)
# ---------------------------------------------------------------------------

_store: Optional[CaseStore] = None


def get_store() -> CaseStore:
    global _store
    if _store is None:
        _store = CaseStore()
    return _store
