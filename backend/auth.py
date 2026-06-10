import os
import secrets
import logging
from fastapi import Security, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

logger = logging.getLogger("uvicorn.error")

security = HTTPBearer(auto_error=False)

def require_auth(credentials: HTTPAuthorizationCredentials = Security(security)):
    api_key = os.getenv("SOCMINT_API_KEY")
    if not api_key:
        logger.warning("WARNING: SOCMINT_API_KEY is not set in environment. Running in DEV MODE with auth bypassed.")
        return None
        
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header or invalid credentials scheme",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # Compare digests securely
    if not secrets.compare_digest(credentials.credentials, api_key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    return credentials.credentials
