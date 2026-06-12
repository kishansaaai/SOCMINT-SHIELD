"""Test script: verify Domain & IP Intel module functions correctly."""
import asyncio
import os
import sys

# Ensure backend folder is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from domain_intel import run_domain_intel, validate_input


async def main():
    print("=== Testing Domain & IP Validation ===")
    test_queries = ["google.com", "8.8.8.8", "invalid_query", "sub.domain.co.uk"]
    for q in test_queries:
        parsed = validate_input(q)
        print(f"Query: '{q}' | Valid: {parsed['valid']} | Is IP: {parsed['is_ip']} | Is Domain: {parsed['is_domain']}")

    print("\n=== Running Live Scan on 'google.com' ===")
    res_domain = await run_domain_intel("google.com")
    print(f"Success: {res_domain.get('valid')}")
    print(f"Is IP: {res_domain.get('is_ip')}")
    print(f"Resolved IP: {res_domain.get('resolved_ip')}")
    print(f"DNS records count: {len(res_domain.get('dns', []))}")
    print(f"Whois info note/status: {res_domain.get('whois', {}).get('note') or 'OK'}")
    print(f"SSL cert Valid: {res_domain.get('ssl', {}).get('valid')}")
    print(f"Reputation status: {res_domain.get('reputation', {}).get('status')}")

    print("\n=== Running Live Scan on '8.8.8.8' ===")
    res_ip = await run_domain_intel("8.8.8.8")
    print(f"Success: {res_ip.get('valid')}")
    print(f"Is IP: {res_ip.get('is_ip')}")
    print(f"Geolocation: {res_ip.get('geolocation', {}).get('country')} ({res_ip.get('geolocation', {}).get('countryCode')})")
    print(f"Reputation Status: {res_ip.get('reputation', {}).get('status')}")


if __name__ == "__main__":
    asyncio.run(main())
