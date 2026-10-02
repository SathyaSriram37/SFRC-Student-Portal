"""Audit logging utilities for recording critical user actions and administrative changes."""
from __future__ import annotations

import json
from typing import Any, Optional
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal


async def log_audit_event(
    user_id: Optional[str],
    action: str,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    details: Optional[dict[str, Any]] = None,
    ip_address: Optional[str] = None,
    session: Optional[AsyncSession] = None,
    db: Optional[AsyncSession] = None,
) -> None:
    """Log an audit event asynchronously to the audit_logs table."""
    active_session = session or db
    query = text("""
        INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, details, ip_address)
        VALUES (:user_id, :action, :resource_type, :resource_id, :details::jsonb, :ip_address)
    """)
    params = {
        "user_id": user_id,
        "action": action,
        "resource_type": resource_type,
        "resource_id": resource_id,
        "details": json.dumps(details or {}),
        "ip_address": ip_address,
    }

    if active_session:
        try:
            await active_session.execute(query, params)
        except Exception as e:
            # Audit log failures shouldn't block primary user flows, but should be logged
            print(f"[Audit Log Error]: {e}")
    else:
        try:
            async with AsyncSessionLocal() as db:
                await db.execute(query, params)
                await db.commit()
        except Exception as e:
            print(f"[Audit Log Error]: {e}")
