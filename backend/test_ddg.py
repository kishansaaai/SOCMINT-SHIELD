import asyncio
import httpx
from platforms import discover_real_usernames

async def main():
    async with httpx.AsyncClient(follow_redirects=True) as client:
        res = await discover_real_usernames(client, "Alakh Pandey")
        print("Final Discovered Usernames for 'Alakh Pandey':")
        print(res)

if __name__ == "__main__":
    asyncio.run(main())
