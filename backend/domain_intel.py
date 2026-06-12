"""
Domain & IP Intelligence — DNS, WHOIS/RDAP, Geolocation, SSL, and Threat Reputation.
"""

import os
import re
import socket
import ssl
import logging
import asyncio
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

import httpx

logger = logging.getLogger("uvicorn.error")

# Regex for basic validation
IP_RE = re.compile(
    r"^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$"
)
DOMAIN_RE = re.compile(
    r"^(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$"
)


def validate_input(query: str) -> Dict[str, Any]:
    """Detect if input is a valid domain or IP address."""
    q = query.strip().lower()
    is_ip = bool(IP_RE.match(q))
    is_domain = bool(DOMAIN_RE.match(q))
    return {
        "valid": is_ip or is_domain,
        "is_ip": is_ip,
        "is_domain": is_domain,
        "clean_query": q,
    }


async def get_dns_records(domain: str) -> List[Dict[str, Any]]:
    """
    Fetch A, AAAA, MX, TXT, and NS records for a domain via Google DNS DoH.
    """
    records = []
    record_types = {1: "A", 28: "AAAA", 15: "MX", 16: "TXT", 2: "NS"}

    async with httpx.AsyncClient(timeout=10) as client:
        tasks = []
        for type_id, type_name in record_types.items():
            tasks.append(
                client.get(
                    "https://dns.google/resolve",
                    params={"name": domain, "type": type_id},
                )
            )

        responses = await asyncio.gather(*tasks, return_exceptions=True)

        for type_name, response in zip(record_types.values(), responses):
            if isinstance(response, Exception):
                logger.debug(f"DoH query failed for type {type_name}: {response}")
                continue

            if response.status_code == 200:
                data = response.json()
                answers = data.get("Answer", [])
                for ans in answers:
                    records.append({
                        "type": type_name,
                        "name": ans.get("name"),
                        "data": ans.get("data"),
                        "ttl": ans.get("TTL"),
                    })

    # Fallback to local socket resolution for 'A' records if DoH failed completely
    if not records:
        try:
            loop = asyncio.get_running_loop()
            addrs = await loop.run_in_executor(
                None, lambda: socket.getaddrinfo(domain, None)
            )
            for addr in addrs:
                ip = addr[4][0]
                records.append({
                    "type": "A" if ":" not in ip else "AAAA",
                    "name": domain + ".",
                    "data": ip,
                    "ttl": 300,
                })
        except Exception as e:
            logger.debug(f"Local socket resolution fallback failed for {domain}: {e}")

    return records


async def get_whois_rdap(query: str, is_ip: bool) -> Dict[str, Any]:
    """
    Fetch Whois registration details using the Registration Data Access Protocol (RDAP).
    """
    result = {
        "registrar": None,
        "created": None,
        "expires": None,
        "status": [],
        "entities": [],
        "raw_rdap_url": None,
        "note": None,
    }

    rdap_url = (
        f"https://rdap.org/ip/{query}"
        if is_ip
        else f"https://rdap.org/domain/{query}"
    )
    result["raw_rdap_url"] = rdap_url

    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=12) as client:
            r = await client.get(rdap_url)
            if r.status_code == 200:
                data = r.json()

                # Registrar info
                for entity in data.get("entities", []):
                    roles = entity.get("roles", [])
                    if "registrar" in roles:
                        vcard = entity.get("vcardArray", [])
                        if len(vcard) > 1 and isinstance(vcard[1], list):
                            for prop in vcard[1]:
                                if prop[0] == "fn":
                                    result["registrar"] = prop[3]

                # Events: registration, expiration
                for event in data.get("events", []):
                    action = event.get("eventAction", "")
                    date_str = event.get("eventDate", "")
                    if action == "registration" and date_str:
                        result["created"] = date_str
                    elif action == "expiration" and date_str:
                        result["expires"] = date_str

                # Status codes
                result["status"] = data.get("status", [])

                # Entities details (e.g. administrative contact country, org)
                for entity in data.get("entities", []):
                    roles = entity.get("roles", [])
                    vcard = entity.get("vcardArray", [])
                    fn = None
                    if len(vcard) > 1 and isinstance(vcard[1], list):
                        for prop in vcard[1]:
                            if prop[0] == "fn":
                                fn = prop[3]
                    if fn:
                        result["entities"].append(
                            {"role": ", ".join(roles), "name": fn}
                        )
            else:
                result["note"] = f"RDAP endpoint returned HTTP {r.status_code}"
    except Exception as e:
        logger.debug(f"RDAP/Whois request failed for {query}: {e}")
        result["note"] = f"Error: {str(e)}"

    return result


async def get_ip_geo(ip: str) -> Dict[str, Any]:
    """Fetch geographical location of an IP address using ip-api.com."""
    result = {
        "country": None,
        "countryCode": None,
        "regionName": None,
        "city": None,
        "zip": None,
        "lat": None,
        "lon": None,
        "timezone": None,
        "isp": None,
        "org": None,
        "as": None,
        "note": None,
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(f"http://ip-api.com/json/{ip}")
            if r.status_code == 200:
                data = r.json()
                if data.get("status") == "success":
                    for key in result.keys():
                        if key in data:
                            result[key] = data[key]
                else:
                    result["note"] = data.get("message", "Query failed")
            else:
                result["note"] = f"HTTP {r.status_code}"
    except Exception as e:
        logger.debug(f"IP Geolocation failed for {ip}: {e}")
        result["note"] = str(e)
    return result


def _sync_ssl_check(domain: str) -> Dict[str, Any]:
    """Perform connection and download peer cert. Must run in executor."""
    result = {
        "valid": False,
        "issuer": None,
        "subject": None,
        "notBefore": None,
        "notAfter": None,
        "serialNumber": None,
        "version": None,
        "days_remaining": None,
        "error": None,
    }
    context = ssl.create_default_context()
    try:
        with socket.create_connection((domain, 443), timeout=6) as sock:
            with context.wrap_socket(sock, server_hostname=domain) as sslsock:
                cert = sslsock.getpeercert()
                if cert:
                    result["valid"] = True
                    result["serialNumber"] = cert.get("serialNumber")
                    result["version"] = cert.get("version")

                    # Parse issuer and subject
                    issuer_dict = {
                        item[0][0]: item[0][1] for item in cert.get("issuer", [])
                    }
                    result["issuer"] = issuer_dict.get("organizationName") or issuer_dict.get("commonName")

                    subj_dict = {
                        item[0][0]: item[0][1] for item in cert.get("subject", [])
                    }
                    result["subject"] = subj_dict.get("commonName")

                    # Dates
                    nb_str = cert.get("notBefore")
                    na_str = cert.get("notAfter")
                    result["notBefore"] = nb_str
                    result["notAfter"] = na_str

                    if na_str:
                        # SSL datetime parsing
                        # e.g., 'Oct 14 00:00:00 2024 GMT'
                        try:
                            # Strip GMT or UTC suffix
                            na_clean = na_str.replace(" GMT", "").replace(" UTC", "")
                            exp_dt = datetime.strptime(na_clean, "%b %d %H:%M:%S %Y").replace(tzinfo=timezone.utc)
                            now = datetime.now(timezone.utc)
                            result["days_remaining"] = (exp_dt - now).days
                        except Exception:
                            pass
    except Exception as e:
        result["error"] = str(e)

    return result


async def get_ssl_info(domain: str) -> Dict[str, Any]:
    """Wrapper to run synchronous socket SSL check in thread pool."""
    loop = asyncio.get_running_loop()
    try:
        return await loop.run_in_executor(None, _sync_ssl_check, domain)
    except Exception as e:
        return {"valid": False, "error": str(e)}


async def check_reputation(query: str) -> Dict[str, Any]:
    """
    Check IP or domain against generic abuse criteria and assign threat score.
    """
    # In a full production app, this would query Virustotal or AbuseIPDB API.
    # Here we do public DNSBL checks and generic checks to compute a realistic reputation.
    result = {
        "score": 0,
        "status": "clean",
        "category": "safe",
        "incidents_count": 0,
        "details": [],
    }

    # Heuristic scoring
    suspicious_keywords = ["scam", "phish", "hack", "bypass", "wallet", "leak", "dox"]
    query_lower = query.lower()

    for kw in suspicious_keywords:
        if kw in query_lower:
            result["score"] += 20
            result["details"].append(f"Keyword match: '{kw}' detected in query string.")

    # Check top level domain threat vectors
    if query_lower.endswith((".xyz", ".top", ".stream", ".gq", ".cf", ".tk", ".ml")):
        result["score"] += 15
        result["details"].append("Registered under high-risk TLD.")

    # Check DNSBL (DNS block lists) for IPs
    if IP_RE.match(query):
        # We can simulate checking Spamhaus or similar, or run a fast DNS lookup on spamhaus zen
        # zen.spamhaus.org returns 127.0.0.2-127.0.0.11 for listed IPs
        parts = query.split(".")
        reversed_ip = ".".join(reversed(parts))
        dnsbl_domain = f"{reversed_ip}.zen.spamhaus.org"
        try:
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(None, socket.gethostbyname, dnsbl_domain)
            result["score"] += 50
            result["details"].append("Listed on Spamhaus Zen DNSBL blocklist (active spam/abuse/mule activity).")
        except Exception:
            # zen.spamhaus.org returns NXDOMAIN for clean IPs, throwing an exception
            pass

    # Cap score
    result["score"] = min(100, result["score"])
    if result["score"] >= 60:
        result["status"] = "malicious"
        result["category"] = "danger"
    elif result["score"] >= 25:
        result["status"] = "suspicious"
        result["category"] = "warning"

    return result


async def run_domain_intel(query: str) -> Dict[str, Any]:
    """Orchestrate DNS, RDAP, Geolocation, SSL, and Threat checks."""
    parsed = validate_input(query)
    if not parsed["valid"]:
        return {
            "query": query,
            "valid": False,
            "error": "Query is neither a valid domain name nor IPv4 address",
        }

    clean_query = parsed["clean_query"]
    is_ip = parsed["is_ip"]

    # Gather geo, whois/rdap, reputation, and cert checks
    geo_task = get_ip_geo(clean_query) if is_ip else None
    dns_task = None if is_ip else get_dns_records(clean_query)
    whois_task = get_whois_rdap(clean_query, is_ip)
    ssl_task = None if is_ip else get_ssl_info(clean_query)
    rep_task = check_reputation(clean_query)

    # Gather tasks
    tasks = [whois_task, rep_task]
    if geo_task:
        tasks.append(geo_task)
    if dns_task:
        tasks.append(dns_task)
    if ssl_task:
        tasks.append(ssl_task)

    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Unpack based on variables
    idx = 0
    whois_res = results[idx] if not isinstance(results[idx], Exception) else {}
    idx += 1
    rep_res = results[idx] if not isinstance(results[idx], Exception) else {}
    idx += 1

    geo_res = {}
    if geo_task:
        geo_res = results[idx] if not isinstance(results[idx], Exception) else {}
        idx += 1

    dns_res = []
    if dns_task:
        dns_res = results[idx] if not isinstance(results[idx], Exception) else []
        idx += 1

    ssl_res = {}
    if ssl_task:
        ssl_res = results[idx] if not isinstance(results[idx], Exception) else {}
        idx += 1

    # If domain lookup, geolocate the resolved A records (first 1 IP)
    resolved_ip = None
    if not is_ip and dns_res:
        for r in dns_res:
            if r["type"] == "A":
                resolved_ip = r["data"]
                break

    if resolved_ip:
        geo_res = await get_ip_geo(resolved_ip)

    return {
        "query": query,
        "valid": True,
        "is_ip": is_ip,
        "resolved_ip": resolved_ip,
        "dns": dns_res,
        "whois": whois_res,
        "geolocation": geo_res,
        "ssl": ssl_res,
        "reputation": rep_res,
        "timestamp": datetime.utcnow().isoformat(),
    }
