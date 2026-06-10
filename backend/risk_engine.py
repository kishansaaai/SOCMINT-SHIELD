"""
Rule-based behavioural risk scoring engine — 0 to 100.
Returns score, level, color, recommendation, signals list, and factor breakdown.
"""

from datetime import datetime

THREAT_KEYWORDS = [
    "kill", "attack", "bomb", "explosive", "jihad", "revenge", "destroy",
    "hack", "ddos", "ransom", "fraud", "scam", "fake", "burner", "anonymous",
    "darkweb", "dark web", "tor", "vpn always", "no trace", "untraceable",
    "swat", "doxx", "dox", "leak", "stalk", "threaten", "violence",
    # Hindi threat keywords
    "मारना", "धमकी", "बदला", "फर्जी", "ठगी", "धोखा", "हमला", "आतंक",
    # Kannada threat keywords
    "ಬೆದರಿಕೆ", "ಮೋಸ", "ನಕಲಿ", "ದಾಳಿ", "ಹಿಂಸೆ",
    # Telugu threat keywords
    "బెదిరింపు", "మోసం", "దాడి", "నకిలీ",
    # Tamil threat keywords
    "மோசடி", "அச்சுறுத்தல்", "தாக்குதல்",
]

# Impersonation keywords — accounts pretending to be official
IMPERSONATION_KEYWORDS = [
    "official", "support", "helpdesk", "help desk", "bank", "customer care",
    "customercare", "service center", "govt", "government", "police",
    "sbi", "hdfc", "icici", "paytm", "phonepe", "gpay",
]


def compute_risk_score(platform_results: list, query: str) -> dict:
    score = 0
    signals = []
    breakdown = {}

    found_platforms = [p for p in platform_results if p.get("found")]

    # ------------------------------------------------------------------
    # Factor 1 — Platform spread (0–20 pts)
    # ------------------------------------------------------------------
    platform_count = len(found_platforms)
    if platform_count >= 10:
        platform_score = 20
        signals.append(f"Present on {platform_count} platforms — extensive digital footprint")
    elif platform_count >= 5:
        platform_score = 12
        signals.append(f"Found on {platform_count} platforms")
    elif platform_count >= 2:
        platform_score = 6
    else:
        platform_score = 0
    score += platform_score
    breakdown["platform_spread"] = platform_score

    # ------------------------------------------------------------------
    # Factor 2 — Account age (0–20 pts)
    # ------------------------------------------------------------------
    age_score = 0
    for p in found_platforms:
        created = p.get("created_at")
        if created:
            try:
                created_dt = datetime.fromisoformat(created.replace("Z", "+00:00").replace("+00:00", ""))
                age_days = (datetime.utcnow() - created_dt).days
                if age_days < 30:
                    age_score = max(age_score, 20)
                    signals.append(f"Very new account on {p['platform']} (< 30 days old)")
                elif age_days < 180:
                    age_score = max(age_score, 10)
                    signals.append(f"Recent account on {p['platform']} (< 6 months old)")
            except Exception:
                pass
    score += age_score
    breakdown["account_age"] = age_score

    # ------------------------------------------------------------------
    # Factor 3 — Keyword analysis (0–25 pts)
    # ------------------------------------------------------------------
    keyword_score = 0
    matched_keywords = []
    for p in found_platforms:
        bio = (p.get("bio") or "").lower()
        posts = p.get("posts") or []
        post_text = " ".join(
            (str(post.get("title", "")) + " " + str(post.get("description", ""))).lower()
            for post in posts
        )
        combined = bio + " " + post_text
        for kw in THREAT_KEYWORDS:
            if kw in combined and kw not in matched_keywords:
                matched_keywords.append(kw)
                keyword_score = min(keyword_score + 5, 25)
    if matched_keywords:
        signals.append(f"Threat keywords detected: {', '.join(matched_keywords[:5])}")
    score += keyword_score
    breakdown["keyword_analysis"] = keyword_score

    # ------------------------------------------------------------------
    # Factor 4 — Anonymity signals (0–20 pts)
    # ------------------------------------------------------------------
    anon_score = 0
    no_bio_count = sum(1 for p in found_platforms if not p.get("bio"))
    no_avatar_count = sum(1 for p in found_platforms if not p.get("avatar"))

    if no_bio_count >= 3:
        anon_score += 10
        signals.append(f"No bio on {no_bio_count} platforms — possible anonymity pattern")
    if no_avatar_count >= 3:
        anon_score += 10
        signals.append(f"No profile picture on {no_avatar_count} platforms")

    anon_score = min(anon_score, 20)
    score += anon_score
    breakdown["anonymity_signals"] = anon_score

    # ------------------------------------------------------------------
    # Factor 5 — Cross-platform inconsistency (0–15 pts)
    # ------------------------------------------------------------------
    names = set()
    for p in found_platforms:
        dn = p.get("display_name")
        if dn and dn.lower().strip() != (query or "").lower().strip():
            names.add(dn.lower().strip())

    if len(names) > 3:
        inc_score = 15
        signals.append("Multiple different display names across platforms — alias pattern detected")
    elif len(names) > 1:
        inc_score = 7
        signals.append(f"{len(names)} different display names found across platforms")
    else:
        inc_score = 0
    score += inc_score
    breakdown["cross_platform_inconsistency"] = inc_score

    # ------------------------------------------------------------------
    # Factor 6 — India-specific signals (0–15 pts)
    # ------------------------------------------------------------------
    india_score = 0
    query_lower = (query or "").lower()

    # Impersonation detection — username contains official/support/bank keywords
    for kw in IMPERSONATION_KEYWORDS:
        if kw in query_lower:
            india_score += 10
            signals.append(f"Impersonation risk: username contains '{kw}' — possible fake official account")
            break

    # UPI ID / phone number mentioned in bio or posts
    import re
    for p in found_platforms:
        bio = p.get("bio") or ""
        if re.search(r"@(?:ybl|ibl|axl|oksbi|okaxis|okicici|paytm|upi)", bio, re.I):
            india_score = min(india_score + 5, 15)
            signals.append(f"UPI ID found in bio on {p['platform']} — financial activity signal")
            break
        if re.search(r"\b[6-9]\d{9}\b", bio):
            india_score = min(india_score + 5, 15)
            signals.append(f"Phone number found in bio on {p['platform']}")
            break

    india_score = min(india_score, 15)
    score += india_score
    breakdown["india_specific"] = india_score

    score = min(score, 100)

    # ------------------------------------------------------------------
    # Level + recommendation
    # ------------------------------------------------------------------
    if score >= 70:
        level = "HIGH"
        color = "#ef4444"
        recommendation = (
            "Immediate investigation recommended. Multiple high-risk indicators detected. "
            "Escalate to senior officer."
        )
    elif score >= 40:
        level = "MEDIUM"
        color = "#f59e0b"
        recommendation = (
            "Further investigation advised. Suspicious behavioural patterns detected. "
            "Cross-reference with existing records."
        )
    elif score >= 15:
        level = "LOW"
        color = "#3b82f6"
        recommendation = "Low immediate risk. Standard monitoring recommended."
    else:
        level = "MINIMAL"
        color = "#22c55e"
        recommendation = "No significant risk indicators detected. Routine file."

    return {
        "score": score,
        "level": level,
        "color": color,
        "recommendation": recommendation,
        "signals": signals,
        "breakdown": breakdown,
    }
