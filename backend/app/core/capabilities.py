"""Role-Based Access Control (RBAC) & Capability Matrix for MyZone SFRC 360."""
from __future__ import annotations

from typing import Any, Callable, Dict, List

from fastapi import Depends, HTTPException, status

from app.core.security import get_current_user

# Master capability mapping per role
CAPABILITIES: Dict[str, List[str]] = {
    "admin": [
        "*",
    ],
    "faculty": [
        "attendance:mark",
        "attendance:view",
        "marks:enter",
        "marks:view",
        "leave:approve",
        "mentorship:log",
        "courses:manage",
        "courses:view",
        "complaints:view",
        "complaints:update",
        "reports:view",
        "announcements:create",
        "announcements:view",
        "events:create",
        "events:view",
    ],
    "student": [
        "attendance:view",
        "marks:view",
        "leave:apply",
        "leave:view",
        "courses:view",
        "complaints:create",
        "complaints:view_own",
        "library:search",
        "library:loan_view",
        "fees:view",
        "placements:apply",
        "placements:view",
        "announcements:view",
        "events:register",
        "events:view",
        "mentoring:view",
        "ai:chat",
    ],
    "parent": [
        "attendance:view_ward",
        "marks:view_ward",
        "fees:view_ward",
        "leave:view_ward",
        "leave:apply_ward",
        "announcements:view",
        "events:view",
        "complaints:view_ward",
    ],
}


def get_capabilities_for_role(role: str) -> List[str]:
    """Return all capabilities granted to a given role."""
    return CAPABILITIES.get(role, [])


def has_capability(user_role: str, capability: str) -> bool:
    """Check if a given role possesses a capability or wildcard superuser privileges."""
    role_caps = CAPABILITIES.get(user_role, [])
    if "*" in role_caps:
        return True
    return capability in role_caps


def require_capability(capability: str) -> Callable:
    """FastAPI dependency factory to enforce granular action capabilities."""
    async def capability_checker(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
        user_role = user.get("role", "student")
        if not has_capability(user_role, capability):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: User lacks required capability '{capability}'",
            )
        return user

    return capability_checker
