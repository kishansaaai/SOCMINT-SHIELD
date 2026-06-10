import json
import os
from datetime import datetime

LOG_FILE = "query_log.jsonl"

def log_query(officer_token: str, query: str, query_type: str, ip: str, platforms_found: int):
    entry = {
        "ts": datetime.utcnow().isoformat(),
        "officer_token": officer_token or "dev-mode-bypass",
        "query": query,
        "query_type": query_type,
        "ip": ip,
        "platforms_found": platforms_found
    }
    
    # Append-only write
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry) + "\n")
    except Exception as e:
        print(f"Failed to write query log: {e}")
