"""
Alias Detection Engine for SOCMINT Shield
==========================================
Replaces the naive `display_name != query` approach with a composite
scoring algorithm that combines:
  1. Username (Jaccard) similarity
  2. Writing-style similarity (bio text comparison)
  3. Account-creation timing proximity
"""

import re
from datetime import datetime
from typing import Optional


# ── helpers ──────────────────────────────────────────────────────────────────

def _tokenize_username(name: str) -> set[str]:
    """Split a username into tokens on _, -, ., and digit/letter boundaries."""
    if not name:
        return set()
    # insert a separator at letter/digit boundaries:  "john2024" → "john 2024"
    s = re.sub(r'([a-zA-Z])(\d)', r'\1 \2', name)
    s = re.sub(r'(\d)([a-zA-Z])', r'\1 \2', s)
    tokens = re.split(r'[_.\-\s]+', s.lower())
    return {t for t in tokens if t}


def jaccard(a: set, b: set) -> float:
    if not a and not b:
        return 1.0
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def _punctuation_density(text: str) -> float:
    if not text:
        return 0.0
    puncts = sum(1 for ch in text if ch in '!?.,:;-–—()[]{}')
    return puncts / max(len(text), 1)


def _cap_ratio(text: str) -> float:
    letters = [ch for ch in text if ch.isalpha()]
    if not letters:
        return 0.0
    return sum(1 for ch in letters if ch.isupper()) / len(letters)


# ── individual scores ───────────────────────────────────────────────────────

def username_similarity(name_a: str, name_b: str) -> float:
    """Jaccard similarity on tokenized usernames.  Returns 0-100."""
    tokens_a = _tokenize_username(name_a)
    tokens_b = _tokenize_username(name_b)
    return jaccard(tokens_a, tokens_b) * 100


def writing_style_score(bio_a: str, bio_b: str) -> float:
    """
    Compare two bio strings:
      - word overlap (Jaccard on word sets)
      - punctuation density ratio closeness
      - capitalization ratio closeness
    Returns 0-100.
    """
    if not bio_a or not bio_b:
        return 50  # neutral when data is missing

    words_a = set(re.findall(r'\w+', bio_a.lower()))
    words_b = set(re.findall(r'\w+', bio_b.lower()))
    word_overlap = jaccard(words_a, words_b) * 100

    pd_a, pd_b = _punctuation_density(bio_a), _punctuation_density(bio_b)
    pd_closeness = max(0, 100 - abs(pd_a - pd_b) * 1000)

    cr_a, cr_b = _cap_ratio(bio_a), _cap_ratio(bio_b)
    cr_closeness = max(0, 100 - abs(cr_a - cr_b) * 500)

    return word_overlap * 0.5 + pd_closeness * 0.25 + cr_closeness * 0.25


def timing_score(date_a: Optional[str], date_b: Optional[str]) -> float:
    """
    Score based on how close two account-creation dates are.
      ≤ 7 days  → 100
      ≤ 30 days → 75
      ≤ 180 days → 45
      else       → 20
    Returns 0-100.
    """
    if not date_a or not date_b:
        return 50  # neutral when data is missing
    try:
        def _parse(d: str) -> datetime:
            return datetime.fromisoformat(
                d.replace("Z", "+00:00").replace("+00:00", "")
            )
        dt_a = _parse(date_a)
        dt_b = _parse(date_b)
        diff_days = abs((dt_a - dt_b).days)
        if diff_days <= 7:
            return 100
        if diff_days <= 30:
            return 75
        if diff_days <= 180:
            return 45
        return 20
    except Exception:
        return 50  # unparseable → neutral


def _confidence_label(score: float) -> str:
    if score > 85:
        return "CONFIRMED"
    if score >= 65:
        return "PROBABLE"
    return "POSSIBLE"


# ── public API ───────────────────────────────────────────────────────────────

def detect_aliases(platform_results: list, query: str) -> list:
    """
    Analyse platform_results and produce a scored alias map.

    Each entry contains:
        platform, display_name, username_checked, differs,
        composite_score, confidence, breakdown { username, writing, timing }

    Only aliases with composite >= 40 are included.
    """
    # Collect found profiles
    profiles = [p for p in platform_results if p.get("found")]

    # We compare every profile against the query AND against every other
    # profile, but the main alias_map is query-vs-profile.
    alias_map = []

    for p in profiles:
        display = (p.get("display_name") or "").strip()
        username = (p.get("username_checked") or p.get("username") or "").strip()
        bio = (p.get("bio") or "").strip()
        created = p.get("created_at") or ""
        platform = p.get("platform", "")

        # If the display_name is empty or exactly matches the query, skip
        if not display:
            continue

        # ── Score against query ──
        u_score = username_similarity(query, username or display)

        # For writing style, we compare this profile's bio against
        # the "consensus" bio from all other profiles
        other_bios = [
            (pr.get("bio") or "") for pr in profiles
            if pr.get("platform") != platform and pr.get("bio")
        ]
        consensus_bio = " ".join(other_bios) if other_bios else ""
        w_score = writing_style_score(bio, consensus_bio)

        # For timing, compare against every other profile's created_at
        # and take the average
        other_dates = [
            pr.get("created_at") for pr in profiles
            if pr.get("platform") != platform and pr.get("created_at")
        ]
        if other_dates:
            t_scores = [timing_score(created, d) for d in other_dates]
            t_score = sum(t_scores) / len(t_scores)
        else:
            t_score = 50

        # Weighted composite
        composite = w_score * 0.4 + u_score * 0.3 + t_score * 0.3

        # Did the name actually differ from the query?
        name_differs = display.lower() != query.lower()

        if composite >= 40:
            alias_map.append({
                "platform": platform,
                "display_name": display,
                "username_checked": username,
                "differs": name_differs,
                "composite_score": round(composite, 1),
                "confidence": _confidence_label(composite),
                "breakdown": {
                    "username": round(u_score, 1),
                    "writing": round(w_score, 1),
                    "timing": round(t_score, 1),
                },
            })

    # Sort by composite score descending
    alias_map.sort(key=lambda a: a["composite_score"], reverse=True)
    return alias_map
