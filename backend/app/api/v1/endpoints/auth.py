"""Authentication endpoints — login, token refresh, current user profile & capabilities."""
from __future__ import annotations

from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr
import httpx

from app.core.config import settings
from app.core.security import get_current_user
from app.core.capabilities import get_capabilities_for_role
from app.core.audit import log_audit_event

router = APIRouter()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    role: Optional[str] = None


class UserProfileResponse(BaseModel):
    id: str
    email: Optional[str] = None
    role: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    department_id: Optional[str] = None
    capabilities: List[str]


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserProfileResponse


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest, request: Request):
    """Authenticate via Supabase and return JWT tokens with user capabilities and audit log."""
    url = f"{settings.supabase_url}/auth/v1/token?grant_type=password"
    headers = {
        "apikey": settings.supabase_anon_key,
        "Content-Type": "application/json",
    }
    
    async with httpx.AsyncClient() as client:
        try:
            r = await client.post(
                url,
                json={"email": body.email, "password": body.password},
                headers=headers,
                timeout=10.0,
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Authentication service unavailable: {str(exc)}",
            )

    if r.status_code != 200:
        error_resp = r.json()
        detail = error_resp.get("error_description") or error_resp.get("msg") or "Invalid credentials"
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)

    data = r.json()
    raw_user = data.get("user", {})
    user_id = raw_user.get("id")
    user_metadata = raw_user.get("user_metadata", {}) or {}
    app_metadata = raw_user.get("app_metadata", {}) or {}

    role = body.role or user_metadata.get("role") or app_metadata.get("role") or "student"
    full_name = user_metadata.get("full_name") or user_metadata.get("name") or raw_user.get("email", "").split("@")[0]
    avatar_url = user_metadata.get("avatar_url")
    capabilities = get_capabilities_for_role(role)

    # Record login audit event
    client_ip = request.client.host if request.client else None
    await log_audit_event(
        user_id=user_id,
        action="AUTH_LOGIN_SUCCESS",
        resource_type="auth",
        resource_id=user_id,
        details={"email": body.email, "role": role},
        ip_address=client_ip,
    )

    return LoginResponse(
        access_token=data["access_token"],
        refresh_token=data["refresh_token"],
        token_type=data.get("token_type", "bearer"),
        user=UserProfileResponse(
            id=user_id,
            email=raw_user.get("email"),
            role=role,
            full_name=full_name,
            avatar_url=avatar_url,
            capabilities=capabilities,
        ),
    )


@router.get("/me", response_model=UserProfileResponse)
async def get_me(user: dict[str, Any] = Depends(get_current_user)):
    """Return the authenticated user profile along with granted RBAC capabilities."""
    user_meta = user.get("user_metadata", {}) or {}
    role = user.get("role", "student")
    full_name = user_meta.get("full_name") or user_meta.get("name") or (user.get("email", "").split("@")[0] if user.get("email") else "User")
    avatar_url = user_meta.get("avatar_url")
    capabilities = get_capabilities_for_role(role)

    return UserProfileResponse(
        id=user.get("id") or user.get("sub"),
        email=user.get("email"),
        role=role,
        full_name=full_name,
        avatar_url=avatar_url,
        department_id=user_meta.get("department_id"),
        capabilities=capabilities,
    )


@router.post("/refresh")
async def refresh(body: RefreshRequest):
    """Refresh an expired access token."""
    url = f"{settings.supabase_url}/auth/v1/token?grant_type=refresh_token"
    headers = {"apikey": settings.supabase_anon_key, "Content-Type": "application/json"}
    async with httpx.AsyncClient() as client:
        try:
            r = await client.post(url, json={"refresh_token": body.refresh_token}, headers=headers, timeout=10.0)
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Auth service unreachable: {str(exc)}",
            )
    if r.status_code != 200:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    return r.json()
