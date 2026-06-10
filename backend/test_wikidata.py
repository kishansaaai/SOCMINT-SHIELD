"""Quick test: verify Wikidata discovery returns correct handles."""
import asyncio, httpx, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from platforms import discover_from_wikidata

async def main():
    async with httpx.AsyncClient(follow_redirects=True) as client:
        for name in ["Mahesh Babu", "Hrithik Roshan", "Alakh Pandey", "Virat Kohli"]:
            result = await discover_from_wikidata(client, name)
            print(f"\n=== {name} ===")
            if result:
                for plat, handle in sorted(result.items()):
                    print(f"  {plat:15s} -> {handle}")
            else:
                print("  (no results)")

asyncio.run(main())
