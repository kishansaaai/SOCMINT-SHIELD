"""
Breach & Leak Detection — HaveIBeenPwned integration.
Checks if an email has appeared in known data breaches.
Degrades gracefully when API key is not configured.
"""

import os
import httpx

HIBP_API_KEY = os.getenv("HIBP_API_KEY", "")


async def check_haveibeenpwned(email: str, api_key: str = "") -> dict:
    """
    Check HaveIBeenPwned for data breaches associated with an email.

    If no API key is configured, returns a manual lookup URL so
    investigators can check manually.
    """
    key = api_key or HIBP_API_KEY
    manual_url = f"https://haveibeenpwned.com/account/{email}"

    if not key:
        return {
            "available": False,
            "breached": False,
            "breaches": [],
            "total": 0,
            "manual_url": manual_url,
            "note": "HIBP_API_KEY not configured — check manually at haveibeenpwned.com",
        }

    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                f"https://haveibeenpwned.com/api/v3/breachedaccount/{email}",
                headers={
                    "hibp-api-key": key,
                    "User-Agent": "SOCMINT-Shield-v4.0",
                },
                params={"truncateResponse": "false"},
                timeout=15,
            )

            if r.status_code == 200:
                raw_breaches = r.json()
                breaches = []
                for b in raw_breaches:
                    breaches.append({
                        "name": b.get("Name", ""),
                        "title": b.get("Title", ""),
                        "domain": b.get("Domain", ""),
                        "date": b.get("BreachDate", ""),
                        "added_date": b.get("AddedDate", ""),
                        "pwn_count": b.get("PwnCount", 0),
                        "data_classes": b.get("DataClasses", []),
                        "description": b.get("Description", ""),
                        "is_verified": b.get("IsVerified", False),
                        "is_sensitive": b.get("IsSensitive", False),
                    })
                return {
                    "available": True,
                    "breached": True,
                    "breaches": breaches,
                    "total": len(breaches),
                    "manual_url": manual_url,
                }

            elif r.status_code == 404:
                # Not found in any breaches — clean
                return {
                    "available": True,
                    "breached": False,
                    "breaches": [],
                    "total": 0,
                    "manual_url": manual_url,
                    "note": "Email not found in any known breaches",
                }

            elif r.status_code == 401:
                return {
                    "available": False,
                    "breached": False,
                    "breaches": [],
                    "total": 0,
                    "manual_url": manual_url,
                    "note": "HIBP API key is invalid — check your key at haveibeenpwned.com/API/Key",
                }

            elif r.status_code == 429:
                return {
                    "available": False,
                    "breached": False,
                    "breaches": [],
                    "total": 0,
                    "manual_url": manual_url,
                    "note": "HIBP rate limit exceeded — try again in a few seconds",
                }

            else:
                return {
                    "available": False,
                    "breached": False,
                    "breaches": [],
                    "total": 0,
                    "manual_url": manual_url,
                    "note": f"HIBP returned status {r.status_code}",
                }

    except Exception as e:
        return {
            "available": False,
            "breached": False,
            "breaches": [],
            "total": 0,
            "manual_url": manual_url,
            "note": f"HIBP request failed: {str(e)}",
        }
