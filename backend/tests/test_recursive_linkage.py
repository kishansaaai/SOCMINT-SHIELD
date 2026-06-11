import asyncio
import sys
import os

# Add parent dir to path to import platforms
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from platforms import run_all_platforms

async def main():
    print("Running recursive search check for username 'torvalds'...")
    results = await run_all_platforms(username="torvalds")
    
    linked_profiles = [p for p in results if p.get("linked_via_real_name")]
    
    print(f"Total platforms checked/returned: {len(results)}")
    print(f"Profiles found recursively linked via real name: {len(linked_profiles)}")
    for p in linked_profiles:
        print(f"  - Platform: {p['platform']}, Username: {p.get('display_name')}, Linked via: {p['linked_via_real_name']}")

if __name__ == "__main__":
    asyncio.run(main())
