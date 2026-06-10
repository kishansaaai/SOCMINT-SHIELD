"""
Email Intelligence — free sources only.
Sources: Gravatar profile, disposable email detection,
         username extraction, free provider flagging.
"""

import hashlib
import httpx

# ─────────────────────────────────────────────────────────────────────────────
# DISPOSABLE EMAIL PROVIDERS (60+)
# ─────────────────────────────────────────────────────────────────────────────

DISPOSABLE_DOMAINS = {
    "mailinator.com", "tempmail.com", "guerrillamail.com", "10minutemail.com",
    "throwam.com", "yopmail.com", "sharklasers.com", "guerrillamail.info",
    "grr.la", "guerrillamail.biz", "guerrillamail.de", "guerrillamail.net",
    "zoemail.org", "guerrillamailblock.com", "pokemail.net", "spam4.me",
    "bugmenot.com", "trashmail.com", "trashmail.me", "trashmail.net",
    "dispostable.com", "maildrop.cc", "fakeinbox.com", "tempinbox.com",
    "temp-mail.org", "temp-mail.io", "emailondeck.com", "getnada.com",
    "mohmal.com", "burner.kiwi", "discard.email", "discardmail.com",
    "discardmail.de", "mailnesia.com", "mailcatch.com", "mailsac.com",
    "mytemp.email", "throwaway.email", "tmpmail.net", "tmpmail.org",
    "harakirimail.com", "getairmail.com", "mailforspam.com", "safetymail.info",
    "filzmail.com", "inboxalias.com", "jetable.org", "mailexpire.com",
    "mailmoat.com", "mailnull.com", "mailzilla.com", "nomail.xl.cx",
    "spamfree24.org", "spamgourmet.com", "tempomail.fr", "thankyou2010.com",
    "trashemail.de", "trashymail.com", "yopmail.fr", "yopmail.net",
    "mailtemp.info", "tempail.com", "tempr.email", "tempmailaddress.com",
}

FREE_PROVIDERS = {
    "gmail.com", "yahoo.com", "yahoo.in", "yahoo.co.in",
    "hotmail.com", "outlook.com", "live.com",
    "aol.com", "icloud.com", "me.com", "mac.com",
    "protonmail.com", "proton.me", "tutanota.com", "tuta.io",
    "zoho.com", "zoho.in", "rediffmail.com", "rediff.com",
    "mail.com", "gmx.com", "gmx.net", "yandex.com", "yandex.ru",
    "fastmail.com", "hushmail.com",
}


# ─────────────────────────────────────────────────────────────────────────────
# GRAVATAR LOOKUP
# ─────────────────────────────────────────────────────────────────────────────

async def fetch_gravatar(email: str) -> dict:
    """Look up Gravatar profile by email hash."""
    email_clean = email.strip().lower()
    md5_hash = hashlib.md5(email_clean.encode()).hexdigest()

    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                f"https://www.gravatar.com/{md5_hash}.json",
                timeout=10,
            )
            if r.status_code == 200:
                data = r.json()
                entry = data.get("entry", [{}])[0]
                return {
                    "found": True,
                    "display_name": entry.get("displayName", ""),
                    "preferred_username": entry.get("preferredUsername", ""),
                    "about_me": entry.get("aboutMe", ""),
                    "location": entry.get("currentLocation", ""),
                    "avatar_url": entry.get("thumbnailUrl", ""),
                    "profile_url": entry.get("profileUrl", ""),
                    "urls": [
                        {"title": u.get("title", ""), "value": u.get("value", "")}
                        for u in entry.get("urls", [])
                    ],
                    "hash": md5_hash,
                }
            return {"found": False, "hash": md5_hash}
    except Exception:
        return {"found": False, "hash": md5_hash}


# ─────────────────────────────────────────────────────────────────────────────
# USERNAME EXTRACTION
# ─────────────────────────────────────────────────────────────────────────────

def extract_email_info(email: str) -> dict:
    """Extract username, domain, and classification from email."""
    email_clean = email.strip().lower()
    parts = email_clean.split("@")
    if len(parts) != 2:
        return {
            "valid": False,
            "error": "Invalid email format",
        }

    username = parts[0]
    domain = parts[1]

    is_disposable = domain in DISPOSABLE_DOMAINS
    is_free = domain in FREE_PROVIDERS

    # Determine provider type
    if is_disposable:
        provider_type = "disposable"
    elif is_free:
        provider_type = "free"
    else:
        provider_type = "custom_domain"

    return {
        "valid": True,
        "email": email_clean,
        "username": username,
        "domain": domain,
        "is_disposable": is_disposable,
        "is_free_provider": is_free,
        "provider_type": provider_type,
        "disposable_provider": domain if is_disposable else None,
    }


# ─────────────────────────────────────────────────────────────────────────────
# MAIN ORCHESTRATOR
# ─────────────────────────────────────────────────────────────────────────────

async def email_intelligence(email: str) -> dict:
    """Run all email intelligence checks."""
    email_info = extract_email_info(email)
    if not email_info.get("valid"):
        return {"error": "Invalid email format", "valid": False}

    gravatar = await fetch_gravatar(email)

    # Build username candidates from email
    username = email_info["username"]
    username_candidates = [username]

    # Common username variants from email
    # e.g., john.doe → johndoe, john_doe, johndoe123
    if "." in username:
        parts = username.split(".")
        username_candidates.append("".join(parts))
        username_candidates.append("_".join(parts))
    if "+" in username:
        # Gmail plus addressing: user+tag@gmail.com → user
        base = username.split("+")[0]
        if base not in username_candidates:
            username_candidates.append(base)

    # Deduplicate
    username_candidates = list(dict.fromkeys(username_candidates))

    result = {
        "valid": True,
        "email": email_info["email"],
        "email_info": email_info,
        "gravatar": gravatar,
        "username_candidates": username_candidates,
        "risk_signals": [],
    }

    # Risk signals
    if email_info["is_disposable"]:
        result["risk_signals"].append(
            f"Disposable email provider detected: {email_info['domain']} — "
            "commonly used to avoid identity linking"
        )
    if gravatar.get("found"):
        result["risk_signals"].append(
            f"Gravatar profile found — display name: {gravatar.get('display_name', 'N/A')}"
        )

    return result
