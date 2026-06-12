"""
Multilingual NLP analyzer — sentiment, threat keywords, entity extraction.

Languages supported: English, Hindi (Devanagari), Kannada, Tamil, Telugu,
Bengali, Urdu, plus auto-detection fallback to English.

Dependencies (all free / open):
    - langdetect          — language detection
    - vaderSentiment      — English sentiment (rule-based, no model download)
    - IndicTrans2 / stanza — only if installed; otherwise the analyzer
      returns a "language detected" payload and stops at keyword spotting.

This module is intentionally lightweight so it runs on Railway's free
tier without bundling large models.
"""

import os
import re
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger("uvicorn.error")

# Optional deps
try:
    from langdetect import detect as _langdetect
    _LANGDETECT_AVAILABLE = True
except ImportError:
    _LANGDETECT_AVAILABLE = False
    logger.warning("langdetect not installed — install with: pip install langdetect")

try:
    from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
    _VADER = SentimentIntensityAnalyzer()
    _VADER_AVAILABLE = True
except ImportError:
    _VADER = None
    _VADER_AVAILABLE = False
    logger.warning(
        "vaderSentiment not installed — install with: pip install vaderSentiment"
    )


# ---------------------------------------------------------------------------
# Threat keyword dictionary (multilingual)
# ---------------------------------------------------------------------------

THREAT_DICT = {
    "en": {
        "violence": ["kill", "murder", "shoot", "stab", "attack", "bomb", "blast"],
        "extremism": ["jihad", "caliphate", "isis", "al-qaeda", "hezbollah", "terror"],
        "drugs": ["heroin", "cocaine", "meth", "fentanyl", "mdma", "lsd", "ganja",
                  "crystal meth"],
        "fraud": ["phishing", "scam", "fraud", "419", "nigerian prince",
                  "ponzi", "pyramid scheme", "money laundering"],
        "weapons": ["gun", "pistol", "ak-47", "rifle", "explosive", "grenade",
                    "ammunition", "ammo"],
        "csam": ["cp", "child porn", "minor", "underage"],  # 65B-evidentiary
        "radicalization": ["white supremacy", "kys", "incel", "massacre"],
    },
    "hi": {  # Hindi — Devanagari
        "violence": ["मार", "हत्या", "बम", "गोली", "हमला"],
        "extremism": ["जिहाद", "आतंक", "आतंकवाद"],
        "drugs": ["ड्रग्स", "मादक पदार्थ", "गांजा", "अफीम", "स्मैक"],
        "fraud": ["धोखाधड़ी", "ठगी", "फ्रॉड"],
        "weapons": ["बंदूक", "पिस्तौल", "बम"],
    },
    "kn": {  # Kannada
        "violence": ["ಕೊಲೆ", "ಬಾಂಬ್", "ಗುಂಡು"],
        "drugs": ["ಡ್ರಗ್ಸ್", "ಗಾಂಜಾ", "ಅಫೀಮು"],
        "fraud": ["ವಂಚನೆ", "ಮೋಸ"],
        "weapons": ["ಬಂದೂಕು"],
    },
    "ta": {  # Tamil
        "violence": ["கொலை", "குண்டு", "துப்பாக்கி"],
        "drugs": ["போதைப்பொருள்", "கஞ்சா"],
        "fraud": ["மோசடி"],
    },
    "te": {  # Telugu
        "violence": ["హత్య", "బాంబ్", "తుపాకీ"],
        "drugs": ["మాదకద్రవ్యాలు", "గంజాయి"],
        "fraud": ["మోసం"],
    },
}


LANG_NAME = {
    "en": "English", "hi": "Hindi", "kn": "Kannada",
    "ta": "Tamil", "te": "Telugu", "bn": "Bengali",
    "ur": "Urdu", "pa": "Punjabi", "ml": "Malayalam",
    "mr": "Marathi", "gu": "Gujarati",
}


# ---------------------------------------------------------------------------
# 1. Language detection
# ---------------------------------------------------------------------------

SCRIPT_RANGES = [
    ("hi", r"[ऀ-ॿ]"),  # Devanagari
    ("kn", r"[ಀ-೿]"),  # Kannada
    ("ta", r"[஀-௿]"),  # Tamil
    ("te", r"[ఀ-౿]"),  # Telugu
    ("bn", r"[ঀ-৿]"),  # Bengali
    ("ar", r"[؀-ۿ]"),  # Arabic/Urdu
]


def detect_language(text: str) -> Dict[str, Any]:
    """
    Return detected language code + human name.
    Script-based first (more reliable for short social posts),
    langdetect as fallback.
    """
    if not text:
        return {"code": "unknown", "name": "Unknown", "confidence": 0.0}

    for code, pattern in SCRIPT_RANGES:
        if re.search(pattern, text):
            return {
                "code": code,
                "name": LANG_NAME.get(code, code),
                "confidence": 0.95,
                "method": "script",
            }

    if _LANGDETECT_AVAILABLE:
        try:
            code = _langdetect(text)
            return {
                "code": code,
                "name": LANG_NAME.get(code, code),
                "confidence": 0.7,
                "method": "langdetect",
            }
        except Exception:
            pass

    return {"code": "en", "name": "English", "confidence": 0.3, "method": "fallback"}


# ---------------------------------------------------------------------------
# 2. Sentiment analysis
# ---------------------------------------------------------------------------

def sentiment(text: str, lang: str = "en") -> Dict[str, Any]:
    """
    Returns compound score in [-1, 1] and a label.
    Only English (VADER) is currently supported natively; for other
    languages we return 'unavailable' but keep the text for the caller.
    """
    if lang != "en" or not _VADER_AVAILABLE or not text:
        return {
            "compound": None,
            "positive": None,
            "negative": None,
            "neutral": None,
            "label": "unavailable",
            "language": lang,
        }
    vs = _VADER.polarity_scores(text)
    c = vs["compound"]
    if c >= 0.05:
        label = "positive"
    elif c <= -0.05:
        label = "negative"
    else:
        label = "neutral"
    return {
        "compound": c,
        "positive": vs["pos"],
        "negative": vs["neg"],
        "neutral": vs["neu"],
        "label": label,
        "language": lang,
    }


# ---------------------------------------------------------------------------
# 3. Threat keyword spotting (multilingual)
# ---------------------------------------------------------------------------

def threat_keyword_scan(text: str, lang: Optional[str] = None) -> Dict[str, Any]:
    """
    Scan text for the threat categories defined in THREAT_DICT.
    Returns per-category matches + an overall severity score.
    """
    if not text:
        return {"matches": {}, "score": 0, "verdict": "none"}

    if lang is None:
        lang = detect_language(text)["code"]

    text_low = text.lower()
    matches: Dict[str, List[str]] = {}
    categories = list(THREAT_DICT.get("en", {}).keys())  # always include EN

    if lang in THREAT_DICT:
        for cat, kws in THREAT_DICT[lang].items():
            for kw in kws:
                if kw.lower() in text_low:
                    matches.setdefault(cat, []).append(kw)
        for cat, kws in THREAT_DICT["en"].items():
            for kw in kws:
                if kw.lower() in text_low:
                    matches.setdefault(cat, []).append(kw)
    else:
        # Unknown language — only English scan
        for cat, kws in THREAT_DICT["en"].items():
            for kw in kws:
                if kw.lower() in text_low:
                    matches.setdefault(cat, []).append(kw)

    total = sum(len(v) for v in matches.values())

    # Severity weighting
    severity_weights = {
        "csam": 100, "extremism": 30, "violence": 25, "weapons": 25,
        "drugs": 15, "fraud": 10, "radicalization": 30,
    }
    weighted = sum(
        severity_weights.get(cat, 10) * len(kws) for cat, kws in matches.items()
    )
    score = min(100, weighted)

    if any(cat in matches for cat in ("csam", "extremism")) or score >= 60:
        verdict = "critical"
    elif matches:
        verdict = "elevated"
    else:
        verdict = "none"

    return {
        "language": lang,
        "language_name": LANG_NAME.get(lang, lang),
        "matches": matches,
        "score": score,
        "verdict": verdict,
    }


# ---------------------------------------------------------------------------
# 4. Entity extraction (lightweight, regex-based)
# ---------------------------------------------------------------------------

EMAIL_RE = re.compile(r"\b[\w._%+-]+@[\w.-]+\.[A-Za-z]{2,}\b")
PHONE_RE = re.compile(r"(?:\+?91[\s-]?)?[6-9]\d{9}\b")
URL_RE = re.compile(r"https?://[^\s\)\]\}>\"']+")
HANDLE_RE = re.compile(r"(?<!\w)@([A-Za-z0-9_]{3,30})\b")
HASHTAG_RE = re.compile(r"(?<!\w)#([A-Za-z0-9_]{2,50})")


def extract_entities(text: str) -> Dict[str, Any]:
    return {
        "emails": list(set(EMAIL_RE.findall(text))),
        "phones": list(set(PHONE_RE.findall(text))),
        "urls": list(set(URL_RE.findall(text))),
        "handles": list(set(HANDLE_RE.findall(text))),
        "hashtags": list(set(HASHTAG_RE.findall(text))),
    }


# ---------------------------------------------------------------------------
# 5. Full analysis bundle
# ---------------------------------------------------------------------------

def analyze_text(text: str) -> Dict[str, Any]:
    """One-call NLP analysis: detect + sentiment + threat + entities."""
    lang_info = detect_language(text)
    lang = lang_info["code"]
    return {
        "language": lang_info,
        "sentiment": sentiment(text, lang),
        "threat": threat_keyword_scan(text, lang),
        "entities": extract_entities(text),
        "length": len(text),
    }
