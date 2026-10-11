"""Authentication endpoints — login, token refresh, current user profile & capabilities."""
from __future__ import annotations

from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr
import httpx

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.core.capabilities import get_capabilities_for_role
from app.core.audit import log_audit_event
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


class ResolveIdentifierResponse(BaseModel):
    found: bool
    email: Optional[str] = None
    role: Optional[str] = None
    is_active: bool = False


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


@router.get("/resolve-identifier", response_model=ResolveIdentifierResponse)
async def resolve_identifier(
    identifier: str,
    db: AsyncSession = Depends(get_db),
):
    """Resolve an entered identifier (email, student register number, or parent/user phone number)
    to its corresponding login email and role.
    Used by portal login so parents and students can log in with phone or register number.
    """
    clean_id = identifier.strip()
    if not clean_id:
        return ResolveIdentifierResponse(found=False)

    digits_only = "".join(ch for ch in clean_id if ch.isdigit())

    # 1. Check direct email match in user_profiles
    email_query = text("""
        SELECT email, role, is_active
        FROM user_profiles
        WHERE LOWER(email) = LOWER(:identifier)
        LIMIT 1
    """)
    row = (await db.execute(email_query, {"identifier": clean_id})).mappings().first()
    if row:
        return ResolveIdentifierResponse(
            found=True,
            email=row["email"],
            role=row["role"],
            is_active=bool(row["is_active"]),
        )

    # 2. Check student register number in students table
    reg_query = text("""
        SELECT up.email, up.role, up.is_active
        FROM students s
        JOIN user_profiles up ON s.user_id = up.id
        WHERE LOWER(s.register_number) = LOWER(:identifier)
        LIMIT 1
    """)
    reg_row = (await db.execute(reg_query, {"identifier": clean_id})).mappings().first()
    if reg_row:
        return ResolveIdentifierResponse(
            found=True,
            email=reg_row["email"],
            role=reg_row["role"] or "student",
            is_active=bool(reg_row["is_active"]),
        )

    # 3. Check phone number in user_profiles
    if digits_only and len(digits_only) >= 10:
        phone_last_10 = digits_only[-10:]
        phone_query = text("""
            SELECT email, role, is_active, phone
            FROM user_profiles
            WHERE phone LIKE :phone_pattern
            LIMIT 1
        """)
        phone_row = (await db.execute(phone_query, {"phone_pattern": f"%{phone_last_10}%"})).mappings().first()
        if phone_row:
            resolved_email = phone_row["email"]
            if not resolved_email and phone_row["role"] == "parent":
                resolved_email = f"parent.{phone_last_10}@parent.sfrc.ac.in"
            return ResolveIdentifierResponse(
                found=True,
                email=resolved_email,
                role=phone_row["role"],
                is_active=bool(phone_row["is_active"]),
            )

    return ResolveIdentifierResponse(found=False)


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
    actual_role = (user_metadata.get("role") or app_metadata.get("role") or "student").lower()

    if body.role:
        portal_role = body.role.lower()
        role_matches = False
        if portal_role == "admin" and actual_role in ("admin", "super_admin", "administrator"):
            role_matches = True
        elif portal_role == "faculty" and actual_role in ("faculty", "teacher", "staff", "hod", "dean", "mentor"):
            role_matches = True
        elif portal_role == "parent" and actual_role in ("parent", "guardian"):
            role_matches = True
        elif portal_role == "student" and actual_role == "student":
            role_matches = True

        if not role_matches:
            client_ip = request.client.host if request.client else None
            await log_audit_event(
                user_id=user_id,
                action="AUTH_LOGIN_ROLE_MISMATCH",
                resource_type="auth",
                resource_id=user_id,
                details={"email": body.email, "attempted_role": portal_role, "actual_role": actual_role},
                ip_address=client_ip,
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
            )

    role = actual_role
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
