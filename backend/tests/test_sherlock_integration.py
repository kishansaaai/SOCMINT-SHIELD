import asyncio
import sys
import os

# Add parent dir to path to import platforms
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from platforms import run_all_platforms

async def main():
    print("Running platform checks for username 'torvalds'...")
    results = await run_all_platforms(username="torvalds")
    
    found_count = sum(1 for p in results if p.get("found"))
    sherlock_count = sum(1 for p in results if p.get("source") == "sherlock")
    sherlock_found = sum(1 for p in results if p.get("source") == "sherlock" and p.get("found"))
    
    print(f"Total platforms checked (including Sherlock and base): {len(results)}")
    print(f"Total profiles found: {found_count}")
    print(f"Sherlock platforms in result (found only): {sherlock_count}")
    print(f"Sherlock profiles found: {sherlock_found}")
    
    # Print a few Sherlock finds
    sherlock_finds = [p["platform"] for p in results if p.get("source") == "sherlock" and p.get("found")]
    if sherlock_finds:
        print(f"Sample Sherlock finds: {', '.join(sherlock_finds[:10])}")
    else:
        print("No Sherlock profiles found (something might be wrong).")

if __name__ == "__main__":
    asyncio.run(main())
