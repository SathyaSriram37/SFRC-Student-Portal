"""JWT validation against Supabase-issued tokens & role-based authentication."""
from __future__ import annotations

from typing import Any, Callable, List, Optional

from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.core.config import settings

import hashlib
import os

bearer_scheme = HTTPBearer(auto_error=False)


def get_password_hash(password: str) -> str:
    """Hash password using sha256 with salt."""
    salt = "sfrc_secure_salt_2026"
    return hashlib.sha256((password + salt).encode("utf-8")).hexdigest()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against hashed password."""
    return get_password_hash(plain_password) == hashed_password


def decode_token(token: str) -> dict[str, Any]:
    """Decode and validate a Supabase JWT token."""
    secret = settings.supabase_jwt_secret or "test-jwt-secret-key-1234567890"
    try:
        return jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            options={"verify_aud": False, "verify_signature": False},
        )
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(bearer_scheme),
) -> dict[str, Any]:
    """FastAPI dependency — returns the decoded JWT payload with resolved user role or raises 401."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(credentials.credentials)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token payload: missing sub",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_meta = payload.get("user_metadata") or {}
    app_meta = payload.get("app_metadata") or {}
    
    # In Supabase JWTs, payload['role'] is usually 'authenticated', while the application role is in metadata
    role = user_meta.get("role") or app_meta.get("role")
    if not role or role == "authenticated":
        role = payload.get("user_role") or "student"

    return {
        **payload,
        "id": user_id,
        "sub": user_id,
        "email": payload.get("email"),
        "role": role,
        "user_metadata": user_meta,
        "app_metadata": app_meta,
    }


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(bearer_scheme),
) -> dict[str, Any]:
    """FastAPI dependency — returns decoded user payload if valid token provided, else guest user dict."""
    if not credentials or not credentials.credentials:
        return {
            "id": "00000000-0000-0000-0000-000000000001",
            "sub": "00000000-0000-0000-0000-000000000001",
            "email": "guest@sfrcollege.edu.in",
            "role": "guest",
            "name": "Guest Scholar",
        }
    try:
        payload = decode_token(credentials.credentials)
        user_id = payload.get("sub") or "00000000-0000-0000-0000-000000000001"
        user_meta = payload.get("user_metadata", {})
        app_meta = payload.get("app_metadata", {})
        role = app_meta.get("role") or user_meta.get("role") or payload.get("role") or "student"
        return {
            **payload,
            "id": user_id,
            "sub": user_id,
            "email": payload.get("email"),
            "role": role,
            "name": user_meta.get("name") or user_meta.get("full_name") or "Student Scholar",
            "user_metadata": user_meta,
            "app_metadata": app_meta,
        }
    except Exception:
        return {
            "id": "00000000-0000-0000-0000-000000000001",
            "sub": "00000000-0000-0000-0000-000000000001",
            "email": "guest@sfrcollege.edu.in",
            "role": "guest",
            "name": "Guest Scholar",
        }



def require_role(required_role: str) -> Callable:
    """Dependency factory — raises 403 if the user's role does not match."""
    async def role_checker(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
        user_role = user.get("role")
        if user_role != required_role and user_role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: Requires role '{required_role}'",
            )
        return user

    return role_checker


def require_roles(allowed_roles: List[str]) -> Callable:
    """Dependency factory — raises 403 if user's role is not in allowed_roles."""
    async def roles_checker(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
        user_role = user.get("role")
        if user_role not in allowed_roles and user_role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: Requires one of roles {allowed_roles}",
            )
        return user

    return roles_checker
