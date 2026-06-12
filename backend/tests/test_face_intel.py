"""Test script: verify face_intel module functionality."""
import asyncio
import base64
import io
import os
import sys
from PIL import Image

# Ensure backend folder is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from face_intel import calculate_image_similarity, match_face_against_profiles


def generate_test_image(color, text):
    """Generate a simple colored image with text for testing."""
    img = Image.new("RGB", (128, 128), color=color)
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format="JPEG")
    return img_byte_arr.getvalue()


async def main():
    print("=== Generating Test Image Bytes ===")
    img_red = generate_test_image("red", "Target A")
    img_red_copy = generate_test_image("red", "Target A")
    img_blue = generate_test_image("blue", "Target B")

    print("\n=== Testing Image Similarity Calculations ===")
    score_identical = calculate_image_similarity(img_red, img_red_copy)
    print(f"Identical Image Score: {score_identical}% (Expected: ~100.0%)")

    score_different = calculate_image_similarity(img_red, img_blue)
    print(f"Different Image Score: {score_different}% (Expected: <60.0%)")

    # Encode to base64 for target query simulation
    b64_scanned_face = base64.b64encode(img_red).decode("utf-8")

    print("\n=== Testing Face Profile Matcher (Simulation) ===")
    # Create mock candidates
    # In a real run, these avatar URLs would be downloaded. 
    # For testing, we mock the downloads by injecting the score results or checking execution flows.
    candidates = [
        {"platform": "GitHub", "username": "dev-red", "avatar": "http://localhost/red.jpg"},
        {"platform": "Instagram", "username": "dev-blue", "avatar": "http://localhost/blue.jpg"},
    ]

    # Run the orchestrator match (it will attempt to download or fall back gracefully)
    matched = await match_face_against_profiles(b64_scanned_face, candidates)
    print("Execution completed.")
    for m in matched:
        print(f"Candidate: {m['platform']}/{m['username']} | Match Score: {m.get('face_match_score')}% | Verdict: {m.get('face_match_verdict')}")


if __name__ == "__main__":
    asyncio.run(main())
