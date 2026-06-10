"""
NEXUS AI Analysis — powered by Google Gemini (free tier).
Generates structured investigator intelligence from profile data.
"""
import os
import json
import httpx

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"


def generate_local_fallback_analysis(profile_data: dict, reason: str = "") -> dict:
    query = profile_data.get("query", "unknown")
    platforms = profile_data.get("platforms", [])
    found = [p for p in platforms if p.get("found")]
    risk = profile_data.get("risk_score", {})
    risk_level = risk.get("level", "MINIMAL")
    aliases = profile_data.get("alias_map", [])
    geo = profile_data.get("geo_mentions", [])
    breach = profile_data.get("breach_data", {}) or {}
    
    alias_count = len([a for a in aliases if a.get("differs")])
    if len(found) >= 5 and alias_count == 0:
        identity_confidence = "HIGH"
    elif len(found) >= 3:
        identity_confidence = "MEDIUM"
    else:
        identity_confidence = "LOW"
        
    if risk_level == "HIGH" or (breach and breach.get("breached")) or alias_count > 1:
        investigator_priority = "HIGH"
    elif risk_level == "MEDIUM" or len(found) >= 3:
        investigator_priority = "MEDIUM"
    else:
        investigator_priority = "LOW"

    found_platforms_str = ", ".join([p["platform"] for p in found[:3]])
    if found:
        key_finding = f"Suspect matches found across {len(found)} platforms ({found_platforms_str}) with {risk_level.lower()} risk profile."
    else:
        key_finding = f"No public social media profiles discovered for suspect '{query}' under checked resources."

    if risk_level == "HIGH":
        threat_assessment = f"Suspect exhibits high-risk indicators. Broad digital footprint with active profiles on key communication channels. Actionable leads include location markers and data breach history."
    elif risk_level == "MEDIUM":
        threat_assessment = f"Moderate threat level detected. Profiles are active but show standard personal usage. Investigation should focus on verifying geographical consistency."
    else:
        threat_assessment = f"Minimal immediate threat found. Digital footprint is sparse or highly private. Standard monitoring recommended."

    signals = []
    for p in found[:4]:
        signals.append(f"Active presence on {p['platform']}")
    if alias_count > 0:
        signals.append(f"Alias deviation detected ({alias_count} handles)")
    if breach and breach.get("breached"):
        signals.append(f"Credentials compromised in {breach.get('total', 0)} data breaches")
    if geo:
        signals.append(f"Geographic footprints identified in {', '.join(set(g.get('location') for g in geo if g.get('location')))}")
    if not signals:
        signals = ["No significant external digital signals found"]

    anomalies = []
    if alias_count > 0:
        anomalies.append(f"Suspect uses alternate display names on different platforms")
    if breach and breach.get("breached"):
        anomalies.append(f"Suspect's primary email address has been leaked publicly")
    if len(geo) > 1:
        locations = set(g.get("location") for g in geo if g.get("location"))
        if len(locations) > 1:
            anomalies.append(f"Geographical location inconsistency detected: {', '.join(locations)}")
    if not anomalies:
        anomalies = ["No behavioral anomalies or mismatching patterns identified"]

    actions = []
    if found:
        actions.append("Conduct manual verification of links and post contents on found profiles")
    if breach and breach.get("breached"):
        actions.append("Initiate password reset/re-use risk analysis on leaked credentials")
    if alias_count > 0:
        actions.append("Map and track the alternate handles for secondary aliases")
    actions.append("Generate Section 65B compliance report to preserve current digital evidence state")
    
    if found:
        behavioral_pattern = f"Multi-platform digital footprint. Active posts and interactions suggest regular online presence."
    else:
        behavioral_pattern = "Undetectable or highly obfuscated behavioral footprint."

    if investigator_priority == "HIGH":
        nexus_verdict = "Recommend active escalation and deep-dive forensic search of cross-referenced aliases."
    else:
        nexus_verdict = "Routine intelligence check complete. No escalation required at this stage."

    return {
        "key_finding": f"[Local Fallback] {key_finding}",
        "threat_assessment": threat_assessment,
        "connected_signals": signals[:4],
        "anomalies": anomalies[:3],
        "investigator_priority": investigator_priority,
        "recommended_actions": actions[:3],
        "behavioral_pattern": behavioral_pattern,
        "identity_confidence": identity_confidence,
        "nexus_verdict": nexus_verdict,
        "available": True,
        "model": "Local Heuristic (Fallback)",
        "fallback_reason": reason
    }


def generate_local_chat_fallback(question: str, profile_data: dict, reason: str = "") -> dict:
    query = profile_data.get("query", "unknown")
    platforms = [p for p in profile_data.get("platforms", []) if p.get("found")]
    risk = profile_data.get("risk_score", {})
    risk_score = risk.get("score", 0)
    
    q_lower = question.lower()
    
    if "risk" in q_lower or "score" in q_lower:
        answer = f"The suspect '{query}' has a calculated risk score of {risk_score}/100. This is based on digital footprint size, credentials exposure, and profile verification status."
    elif "platform" in q_lower or "found" in q_lower or "site" in q_lower:
        if platforms:
            plat_list = ", ".join([p["platform"] for p in platforms])
            answer = f"The suspect was found active on the following platforms: {plat_list}. The remaining checked platforms did not yield immediate matches."
        else:
            answer = f"No active social media or platform accounts were found for suspect '{query}' during the scanning process."
    elif "location" in q_lower or "where" in q_lower or "city" in q_lower or "geo" in q_lower:
        geo = profile_data.get("geo_mentions", [])
        if geo:
            locs = [f"{g.get('platform')}: {g.get('location')}" for g in geo if g.get('location')]
            answer = f"Geographic mentions found for '{query}': {', '.join(locs)}. You should manually verify these locations."
        else:
            answer = f"No geographic location metadata was found in the public profiles for suspect '{query}'."
    elif "breach" in q_lower or "pwn" in q_lower or "leak" in q_lower or "email" in q_lower:
        breach = profile_data.get("breach_data", {})
        if breach and breach.get("breached"):
            answer = f"Yes, the email associated with the suspect was found in {breach.get('total', 0)} data breaches. This increases the risk of credential reuse."
        else:
            answer = f"No data breaches or credential leaks were detected for this suspect's email address."
    elif "alias" in q_lower or "handle" in q_lower or "name" in q_lower:
        aliases = profile_data.get("alias_map", [])
        diff_aliases = [a for a in aliases if a.get("differs")]
        if diff_aliases:
            alias_str = ", ".join([f"{a['platform']} (@{a['display_name']})" for a in diff_aliases])
            answer = f"We detected different handles/display names on: {alias_str}. These could indicate attempts at obfuscation or natural variation in user handles."
        else:
            answer = f"The suspect uses consistent display names/handles across all identified platforms."
    elif any(kw in q_lower for kw in ("news", "article", "media", "report", "mention", "press", "headline")):
        news = profile_data.get("news_articles", [])
        if news:
            bullets = [f"• {a.get('title', 'Untitled')}: {(a.get('snippet') or '')[:120]}" for a in news[:6]]
            answer = (
                f"Found {len(news)} news/web mention(s) for '{query}'. Summary:\n"
                + "\n".join(bullets)
            )
        else:
            answer = f"No news or web mentions were found for suspect '{query}' in open-web intelligence sources."
    else:
        answer = f"As a local analyst fallback: Suspect '{query}' has a risk level of {risk.get('level', 'MINIMAL')}. Found on {len(platforms)} platforms. Please check the 'Workflow' and 'Overview' tabs for complete structured data."

    return {
        "answer": f"[Local Fallback] {answer}",
        "available": True,
        "model": "Local Chat Fallback",
        "fallback_reason": reason
    }


async def run_nexus_analysis(profile_data: dict) -> dict:
    """Generate AI-powered intelligence summary using Gemini, with local fallback."""
    if not GEMINI_API_KEY:
        return generate_local_fallback_analysis(profile_data, "GEMINI_API_KEY not configured")

    # Build a compact summary for the prompt
    query      = profile_data.get("query", "unknown")
    platforms  = profile_data.get("platforms", [])
    found      = [p for p in platforms if p.get("found")]
    risk       = profile_data.get("risk_score", {})
    aliases    = profile_data.get("alias_map", [])
    timeline   = profile_data.get("timeline", [])[:10]
    geo        = profile_data.get("geo_mentions", [])

    platform_summary = "\n".join([
        f"- {p['platform']}: @{p.get('display_name','?')}, bio: {str(p.get('bio',''))[:80]}, location: {p.get('location','N/A')}, followers: {p.get('followers','N/A')}"
        for p in found[:10]
    ])
    alias_summary = ", ".join([f"{a['platform']}→{a['display_name']}" for a in aliases[:6]])
    geo_summary   = ", ".join([f"{g['platform']}:{g['location']}" for g in geo[:5]])
    post_sample   = "\n".join([f"  [{t['platform']}] {t['title'][:60]}" for t in timeline[:5]])

    prompt = f"""You are NEXUS — an AI intelligence analyst for Karnataka CID SOCMINT Shield.
Analyse this suspect digital profile and return a structured JSON response.

SUSPECT: {query}
RISK SCORE: {risk.get('score', 0)}/100 ({risk.get('level', 'UNKNOWN')})
PLATFORMS FOUND: {len(found)}/20
ALIASES: {alias_summary or 'none detected'}
LOCATIONS: {geo_summary or 'none'}
PLATFORM DETAILS:
{platform_summary}
RECENT POSTS SAMPLE:
{post_sample or 'none available'}

Return ONLY valid JSON with this exact structure:
{{
  "key_finding": "One sentence most important finding about this suspect",
  "threat_assessment": "2-3 sentence threat narrative for an investigating officer",
  "connected_signals": ["signal1", "signal2", "signal3"],
  "anomalies": ["anomaly1", "anomaly2"],
  "investigator_priority": "HIGH | MEDIUM | LOW",
  "recommended_actions": ["action1", "action2", "action3"],
  "behavioral_pattern": "Brief behavioral pattern description",
  "identity_confidence": "HIGH | MEDIUM | LOW",
  "nexus_verdict": "One sentence final verdict"
}}"""

    try:
        async with httpx.AsyncClient() as client:
            r = await client.post(
                f"{GEMINI_URL}?key={GEMINI_API_KEY}",
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {
                        "temperature": 0.3,
                        "maxOutputTokens": 1024,
                        "responseMimeType": "application/json",
                    },
                },
                timeout=30,
            )
            if r.status_code != 200:
                # Fallback to local heuristic on rate limit/quota errors
                return generate_local_fallback_analysis(profile_data, f"Gemini API error {r.status_code}")

            resp = r.json()
            text = resp["candidates"][0]["content"]["parts"][0]["text"]

            # Parse JSON from response
            text = text.strip()
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            analysis = json.loads(text)
            analysis["available"] = True
            analysis["model"] = "gemini-2.0-flash"
            return analysis

    except Exception as e:
        return generate_local_fallback_analysis(profile_data, f"Exception: {str(e)}")


async def _get_news_articles(profile_data: dict) -> list:
    """Return cached news articles or fetch them on demand."""
    news = profile_data.get("news_articles") or []
    if news:
        return news
    query = profile_data.get("query", "")
    if not query:
        return []
    try:
        from platforms import search_news
        async with httpx.AsyncClient(follow_redirects=True) as client:
            return await search_news(client, query)
    except Exception:
        return []


def _format_news_context(news_articles: list) -> str:
    if not news_articles:
        return "News & web mentions: none found"
    lines = []
    for i, a in enumerate(news_articles[:10], 1):
        title = a.get("title", "Untitled")
        snippet = (a.get("snippet") or "")[:180]
        lines.append(f"{i}. {title} — {snippet}")
    return f"News & web mentions ({len(news_articles)} articles):\n" + "\n".join(lines)


async def run_chat_analysis(question: str, profile_data: dict) -> dict:
    """Answer investigator questions about a suspect profile, with local fallback."""
    news_articles = await _get_news_articles(profile_data)
    profile_data = {**profile_data, "news_articles": news_articles}

    if not GEMINI_API_KEY:
        return generate_local_chat_fallback(question, profile_data, "GEMINI_API_KEY not configured")

    query     = profile_data.get("query", "unknown")
    platforms = [p for p in profile_data.get("platforms", []) if p.get("found")]
    risk      = profile_data.get("risk_score", {})
    news_ctx  = _format_news_context(news_articles)

    context = f"""You are NEXUS — an AI intelligence analyst for Karnataka CID.
Suspect: {query}
Risk: {risk.get('score',0)}/100 ({risk.get('level','?')})
Found on: {', '.join(p['platform'] for p in platforms)}
Aliases: {', '.join(a['display_name'] for a in profile_data.get('alias_map',[])[:5])}
Locations: {', '.join(g['location'] for g in profile_data.get('geo_mentions',[])[:5])}
{news_ctx}

When asked about news, media coverage, or web mentions, summarize the articles above.
Answer the investigator's question concisely and professionally. Be direct, factual, and helpful."""

    try:
        async with httpx.AsyncClient() as client:
            r = await client.post(
                f"{GEMINI_URL}?key={GEMINI_API_KEY}",
                json={
                    "contents": [
                        {"role": "user", "parts": [{"text": context}]},
                        {"role": "model", "parts": [{"text": "Understood. I am NEXUS, ready to assist with your investigation."}]},
                        {"role": "user", "parts": [{"text": question}]},
                    ],
                    "generationConfig": {"temperature": 0.4, "maxOutputTokens": 512},
                },
                timeout=20,
            )
            if r.status_code != 200:
                return generate_local_chat_fallback(question, profile_data, f"Gemini error {r.status_code}")
            text = r.json()["candidates"][0]["content"]["parts"][0]["text"]
            return {"answer": text, "available": True}
    except Exception as e:
        return generate_local_chat_fallback(question, profile_data, f"Exception: {str(e)}")
