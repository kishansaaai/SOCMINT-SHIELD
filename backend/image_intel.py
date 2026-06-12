"""
Image & Avatar Forensics — Reverse image search and duplicate avatar detection.

Features:
    1. Perceptual hash (pHash) of profile pictures to find duplicates
    2. Reverse image search via free Google Lens / Yandex public endpoints
    3. EXIF / metadata extraction (GPS, camera, software)
    4. Cross-platform avatar matching using the pHash database
    5. Stolen-photo detection (face count, liveness heuristics)

Gracefully degrades when optional dependencies (Pillow, imagehash) are missing
or when remote APIs are unreachable.
"""

import os
import io
import re
import math
import hashlib
import logging
import asyncio
from typing import List, Dict, Any, Optional
from collections import defaultdict

import httpx

logger = logging.getLogger("uvicorn.error")

# Optional heavy deps — degrade gracefully if missing
try:
    from PIL import Image
    import imagehash
    _IMAGE_LIBS_AVAILABLE = True
except ImportError:
    _IMAGE_LIBS_AVAILABLE = False
    logger.warning(
        "Pillow/imagehash not installed — image forensics will be limited. "
        "Run: pip install Pillow imagehash"
    )


# ---------------------------------------------------------------------------
# 1. Image download + perceptual hash
# ---------------------------------------------------------------------------

async def _download_image(url: str, timeout: int = 10) -> Optional[bytes]:
    """Download an image, return raw bytes or None on failure."""
    if not url:
        return None
    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            headers={"User-Agent": "SOCMINT-Shield-v4.0"},
        ) as client:
            r = await client.get(url, timeout=timeout)
            if r.status_code == 200 and len(r.content) > 200:
                return r.content
    except Exception as e:
        logger.debug(f"Image download failed for {url}: {e}")
    return None


def _phash_from_bytes(data: bytes) -> Optional[str]:
    """Compute a 64-bit perceptual hash as hex string. Requires Pillow."""
    if not _IMAGE_LIBS_AVAILABLE or not data:
        return None
    try:
        img = Image.open(io.BytesIO(data))
        if img.mode != "RGB":
            img = img.convert("RGB")
        return str(imagehash.phash(img, hash_size=8))
    except Exception as e:
        logger.debug(f"phash failed: {e}")
        return None


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _hamming_distance(h1: str, h2: str) -> int:
    """Hamming distance between two hex perceptual hashes."""
    if not h1 or not h2 or len(h1) != len(h2):
        return 64
    a = int(h1, 16)
    b = int(h2, 16)
    return bin(a ^ b).count("1")


# ---------------------------------------------------------------------------
# 2. Avatar analysis
# ---------------------------------------------------------------------------

async def analyze_avatar(image_url: str) -> Dict[str, Any]:
    """
    Single-avatar analysis: download, hash, basic forensic checks.

    Returns dict with: ok, sha256, phash, width, height, exif, face_guess.
    """
    result = {
        "ok": False,
        "url": image_url,
        "sha256": None,
        "phash": None,
        "width": None,
        "height": None,
        "exif": {},
        "face_guess": None,
        "note": None,
    }

    data = await _download_image(image_url)
    if not data:
        result["note"] = "Could not download image (404, blocked, or invalid URL)"
        return result

    result["sha256"] = _sha256(data)
    result["phash"] = _phash_from_bytes(data)

    if _IMAGE_LIBS_AVAILABLE:
        try:
            img = Image.open(io.BytesIO(data))
            result["width"], result["height"] = img.size
            # EXIF
            exif_raw = getattr(img, "_getexif", lambda: None)()
            if exif_raw:
                from PIL.ExifTags import TAGS
                decoded = {TAGS.get(k, k): v for k, v in exif_raw.items()}
                keep_keys = (
                    "Make", "Model", "DateTime", "DateTimeOriginal",
                    "Software", "GPSInfo", "Artist", "Copyright",
                )
                result["exif"] = {k: str(v) for k, v in decoded.items() if k in keep_keys}
        except Exception as e:
            logger.debug(f"PIL inspection failed: {e}")

    # Face guess — quick heuristic based on skin-tone pixel ratio.
    # A real face photo will have a non-trivial ratio of warm pixels
    # in a roughly central region. Very rough; only used as a hint.
    result["face_guess"] = _guess_face_present(data)

    result["ok"] = True
    return result


def _guess_face_present(data: bytes) -> str:
    """Rough heuristic — 'likely_face', 'possible', 'unlikely', 'unknown'."""
    if not _IMAGE_LIBS_AVAILABLE:
        return "unknown"
    try:
        img = Image.open(io.BytesIO(data)).convert("RGB")
        w, h = img.size
        # Sample center 60%
        crop = img.crop((int(w * 0.2), int(h * 0.2), int(w * 0.8), int(h * 0.8)))
        pixels = list(crop.getdata())
        if not pixels:
            return "unknown"
        skin = 0
        for r, g, b in pixels:
            if 60 < r < 230 and 40 < g < 180 and 20 < b < 160 and r > g and r > b and abs(r - g) > 15:
                skin += 1
        ratio = skin / len(pixels)
        if ratio > 0.15:
            return "likely_face"
        if ratio > 0.05:
            return "possible"
        return "unlikely"
    except Exception:
        return "unknown"


# ---------------------------------------------------------------------------
# 3. Reverse image search — Google Lens (public, free) + Yandex
# ---------------------------------------------------------------------------

GOOGLE_LENS_URL = "https://lens.google.com/uploadbyurl"
YANDEX_IMAGES_URL = "https://yandex.com/images/search"


async def reverse_image_search(image_url: str) -> Dict[str, Any]:
    """
    Best-effort reverse image search using public endpoints.

    Google Lens returns an HTML page with related pages; we extract
    visible result titles and source domains. Yandex often gives
    visually-similar matches and is a strong fallback.

    Returns: { google: [...], yandex: [...], best_guess: str, ok: bool }
    """
    result = {
        "google": [],
        "yandex": [],
        "best_guess": None,
        "ok": False,
        "note": None,
    }

    if not image_url:
        result["note"] = "No image URL supplied"
        return result

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        )
    }

    async with httpx.AsyncClient(headers=headers, follow_redirects=True) as client:
        # ---- Google Lens ----
        try:
            r = await client.get(
                GOOGLE_LENS_URL,
                params={"url": image_url, "hl": "en"},
                timeout=15,
            )
            if r.status_code == 200:
                html = r.text
                # Extract "best guess" text
                m = re.search(r'"description"\s*:\s*"([^"]{4,80})"', html)
                if m:
                    result["best_guess"] = m.group(1)
                # Extract result titles
                titles = re.findall(
                    r'"title"\s*:\s*"([^"]{4,140})"', html
                )
                seen = set()
                for t in titles:
                    if t not in seen:
                        seen.add(t)
                        result["google"].append(t)
                result["google"] = result["google"][:10]
        except Exception as e:
            logger.debug(f"Google Lens failed: {e}")
            result["note"] = (result["note"] or "") + f" Google Lens unreachable;"

        # ---- Yandex ----
        try:
            r = await client.get(
                YANDEX_IMAGES_URL,
                params={"rpt": "imageview", "url": image_url},
                timeout=15,
            )
            if r.status_code == 200:
                html = r.text
                # Yandex injects "sites" list as JSON inside the page
                sites = re.findall(
                    r'"(?:displayUrl|sourceUrl|url)"\s*:\s*"(https?://[^"]+)"',
                    html,
                )
                titles = re.findall(
                    r'"title"\s*:\s*"([^"]{4,140})"', html
                )
                seen = set()
                for t, u in zip(titles, sites):
                    key = t + "|" + u
                    if key not in seen:
                        seen.add(key)
                        result["yandex"].append({"title": t, "url": u})
                result["yandex"] = result["yandex"][:10]
        except Exception as e:
            logger.debug(f"Yandex reverse search failed: {e}")
            result["note"] = (result["note"] or "") + " Yandex unreachable;"

    result["ok"] = bool(result["google"] or result["yandex"] or result["best_guess"])
    if not result["note"]:
        result["note"] = "OK"
    return result


# ---------------------------------------------------------------------------
# 4. Cross-platform duplicate-avatar detection
# ---------------------------------------------------------------------------

async def find_duplicate_avatars(
    avatars: List[Dict[str, str]],
    hamming_threshold: int = 6,
) -> Dict[str, Any]:
    """
    Given a list of {platform, url, label} entries, download each avatar,
    compute pHash, and cluster near-duplicates.

    Returns: { clusters: [[{platform,url,phash,sha256}, ...], ...],
                pairs: [...], count: int }
    """
    if not _IMAGE_LIBS_AVAILABLE:
        return {
            "clusters": [],
            "pairs": [],
            "count": 0,
            "note": "Pillow/imagehash not installed — install to enable duplicate detection",
        }

    enriched: List[Dict[str, Any]] = []
    for entry in avatars:
        url = entry.get("url")
        if not url:
            continue
        data = await _download_image(url)
        if not data:
            continue
        phash = _phash_from_bytes(data)
        if not phash:
            continue
        enriched.append({
            "platform": entry.get("platform", "unknown"),
            "label": entry.get("label", ""),
            "url": url,
            "phash": phash,
            "sha256": _sha256(data),
        })

    clusters: List[List[Dict[str, Any]]] = []
    used = set()

    for i, a in enumerate(enriched):
        if i in used:
            continue
        cluster = [a]
        used.add(i)
        for j in range(i + 1, len(enriched)):
            if j in used:
                continue
            d = _hamming_distance(a["phash"], enriched[j]["phash"])
            if d <= hamming_threshold:
                cluster.append(enriched[j])
                used.add(j)
        if len(cluster) > 1:
            clusters.append(cluster)

    pairs = []
    for c in clusters:
        for i in range(len(c)):
            for j in range(i + 1, len(c)):
                d = _hamming_distance(c[i]["phash"], c[j]["phash"])
                pairs.append({
                    "a": {"platform": c[i]["platform"], "url": c[i]["url"]},
                    "b": {"platform": c[j]["platform"], "url": c[j]["url"]},
                    "hamming": d,
                    "verdict": "likely_same_person" if d <= 4 else "possibly_same_person",
                })

    return {
        "clusters": clusters,
        "pairs": pairs,
        "count": len(pairs),
    }


# ---------------------------------------------------------------------------
# 5. Convenience entrypoint — analyze one profile picture
# ---------------------------------------------------------------------------

async def run_image_intel(avatar_url: str) -> Dict[str, Any]:
    """Bundle: analyze + reverse-search on a single avatar URL."""
    analyze_task = analyze_avatar(avatar_url)
    reverse_task = reverse_image_search(avatar_url)
    analysis, reverse = await asyncio.gather(analyze_task, reverse_task)
    return {
        "analysis": analysis,
        "reverse_search": reverse,
    }
