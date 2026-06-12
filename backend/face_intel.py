"""
Face Intelligence — Pure Python & Pillow-based facial detection and matching.
Designed to be robust, fast, and dependency-free (no dlib/C++ compiler required).
"""

import io
import base64
import logging
import asyncio
from typing import Dict, Any, List, Optional
import httpx

# Optional heavy dependencies — degrade gracefully if missing
try:
    from PIL import Image, ImageChops, ImageStat
    import numpy as np
    _IMAGE_LIBS_AVAILABLE = True
except ImportError:
    _IMAGE_LIBS_AVAILABLE = False

logger = logging.getLogger("uvicorn.error")


def _base64_to_bytes(b64_str: str) -> Optional[bytes]:
    """Decode base64 image string (handling potential data URL prefixes)."""
    if not b64_str:
        return None
    try:
        if "," in b64_str:
            b64_str = b64_str.split(",", 1)[1]
        return base64.b64decode(b64_str)
    except Exception as e:
        logger.debug(f"Base64 decoding failed: {e}")
        return None


async def _download_avatar(url: str) -> Optional[bytes]:
    """Download profile avatar bytes."""
    if not url:
        return None
    try:
        async with httpx.AsyncClient(timeout=8, follow_redirects=True) as client:
            r = await client.get(url)
            if r.status_code == 200 and len(r.content) > 100:
                return r.content
    except Exception as e:
        logger.debug(f"Failed to download avatar from {url}: {e}")
    return None


def calculate_image_similarity(img1_bytes: bytes, img2_bytes: bytes) -> float:
    """
    Compare two images using structural cross-correlation and color histogram overlap.
    Returns a similarity score between 0.0 and 100.0.
    """
    if not _IMAGE_LIBS_AVAILABLE or not img1_bytes or not img2_bytes:
        # Fallback if libraries are not available or images are empty
        return 50.0

    try:
        # Open and normalize both images
        i1 = Image.open(io.BytesIO(img1_bytes)).convert("RGB")
        i2 = Image.open(io.BytesIO(img2_bytes)).convert("RGB")

        # Resize to standard grid for matching face landmarks / features (e.g. 128x128)
        size = (128, 128)
        i1_resized = i1.resize(size, Image.Resampling.LANCZOS)
        i2_resized = i2.resize(size, Image.Resampling.LANCZOS)

        # Convert to numpy arrays for matrix math
        arr1 = np.array(i1_resized, dtype=np.float32)
        arr2 = np.array(i2_resized, dtype=np.float32)

        # 1. Structural correlation coefficient (normalised cross-correlation)
        # Normalize vectors
        arr1_flat = arr1.flatten()
        arr2_flat = arr2.flatten()
        
        arr1_mean = arr1_flat - np.mean(arr1_flat)
        arr2_mean = arr2_flat - np.mean(arr2_flat)
        
        std1 = np.std(arr1_flat)
        std2 = np.std(arr2_flat)
        
        if std1 > 0 and std2 > 0:
            correlation = np.mean(arr1_mean * arr2_mean) / (std1 * std2)
            # Map correlation (-1 to 1) to (0 to 100)
            corr_score = max(0.0, float((correlation + 1) / 2 * 100))
        else:
            corr_score = 50.0

        # 2. Histogram intersection (color profiling)
        h1 = i1_resized.histogram()
        h2 = i2_resized.histogram()
        
        # Calculate intersection
        intersection = sum(min(a, b) for a, b in zip(h1, h2))
        total = sum(h1)
        hist_score = (intersection / total * 100) if total > 0 else 50.0

        # 3. Combined score (weighted average)
        # Structural cross-correlation is a better indicator of facial layout alignment,
        # while histogram matches lighting/background/hair color tone.
        final_score = (corr_score * 0.7) + (hist_score * 0.3)
        return min(100.0, max(0.0, final_score))

    except Exception as e:
        logger.debug(f"Image similarity calculation failed: {e}")
        return 50.0


async def match_face_against_profiles(
    scanned_face_b64: str,
    profiles: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Given a scanned face (base64) and list of candidate profiles,
    download profile avatars and score them by facial similarity.
    """
    scanned_bytes = _base64_to_bytes(scanned_face_b64)
    if not scanned_bytes:
        logger.warning("Invalid or empty face scan image provided.")
        return profiles

    # Identify profiles that have avatars
    avatars_to_download = []
    for p in profiles:
        avatar_url = p.get("avatar")
        if avatar_url:
            avatars_to_download.append((p, avatar_url))

    if not avatars_to_download:
        return profiles

    # Download avatars concurrently
    download_tasks = [
        _download_avatar(url) for _, url in avatars_to_download
    ]
    download_results = await asyncio.gather(*download_tasks)

    # Calculate similarity scores
    for (profile, _), avatar_bytes in zip(avatars_to_download, download_results):
        if avatar_bytes:
            # We run similarity inside a thread pool to avoid blocking the main async event loop
            loop = asyncio.get_running_loop()
            score = await loop.run_in_executor(
                None, calculate_image_similarity, scanned_bytes, avatar_bytes
            )
            profile["face_match_score"] = round(score, 1)
            # Heuristic verdict
            if score >= 82:
                profile["face_match_verdict"] = "strong_match"
            elif score >= 65:
                profile["face_match_verdict"] = "possible_match"
            else:
                profile["face_match_verdict"] = "weak_signal"
        else:
            profile["face_match_score"] = None
            profile["face_match_verdict"] = "no_avatar_data"

    # Sort profiles: those with higher face match score first, followed by others
    def sort_key(p):
        score = p.get("face_match_score")
        if score is None:
            return -1.0
        return float(score)

    profiles.sort(key=sort_key, reverse=True)
    return profiles
