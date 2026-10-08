"""Notification endpoints — User alerts, unread badges, bulk actions, preferences, and FCM tokens backed by PostgreSQL/Supabase database."""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.database import get_db
from app.core.security import get_current_user
from app.services.notification_service import (
    DEFAULT_PREFERENCES,
    NotificationService,
)

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────────────

class NotificationItem(BaseModel):
    id: str
    user_id: str
    title: str
    message: str
    type: str  # info | success | warning | complaint | event
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    link: Optional[str] = None
    read: bool
    created_at: str


class NotificationListResponse(BaseModel):
    notifications: List[NotificationItem]
    total: int
    unread_count: int
    page: int
    limit: int


class NotificationPreferenceItem(BaseModel):
    email_enabled: bool = True
    sms_enabled: bool = False
    push_enabled: bool = True
    academic_alerts: bool = True
    complaint_updates: bool = True
    event_announcements: bool = True
    library_reminders: bool = True
    fee_alerts: bool = True


class DeviceTokenRequest(BaseModel):
    token: str
    device_type: Optional[str] = "web"  # web | android | ios


def row_to_notification(r: dict[str, Any]) -> NotificationItem:
    return NotificationItem(
        id=str(r["id"]),
        user_id=str(r["user_id"]),
        title=r["title"],
        message=r["message"],
        type=r.get("type") or "info",
        entity_type=r.get("entity_type"),
        entity_id=r.get("entity_id"),
        link=r.get("link"),
        read=bool(r.get("read")),
        created_at=str(r.get("created_at") or datetime.now(timezone.utc).isoformat()),
    )


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/notifications", response_model=NotificationListResponse)
@router.get("/notifications/", response_model=NotificationListResponse)
async def list_notifications(
    read: Optional[bool] = Query(None, description="Filter by read status"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve notifications for the current authenticated user directly from the database."""
    user_id = str(user.get("id") or user.get("sub") or "00000000-0000-0000-0000-000000000001")

    # Count unread for user
    unread_q = text("""
        SELECT count(*) FROM notifications
        WHERE user_id = :user_id AND (read = 0 OR read = false)
    """)
    unread_count = (await db.execute(unread_q, {"user_id": user_id})).scalar() or 0

    # Build query
    conditions = ["user_id = :user_id"]
    params: dict[str, Any] = {"user_id": user_id}

    if read is not None:
        if read:
            conditions.append("(read = 1 OR read = true)")
        else:
            conditions.append("(read = 0 OR read = false)")

    where_clause = f"WHERE {' AND '.join(conditions)}"
    total_q = text(f"SELECT count(*) FROM notifications {where_clause}")
    total = (await db.execute(total_q, params)).scalar() or 0

    offset = (page - 1) * limit
    params["limit"] = limit
    params["offset"] = offset

    fetch_q = text(f"""
        SELECT * FROM notifications
        {where_clause}
        ORDER BY created_at DESC
        LIMIT :limit OFFSET :offset
    """)
    rows = (await db.execute(fetch_q, params)).mappings().all()

    return NotificationListResponse(
        notifications=[row_to_notification(dict(r)) for r in rows],
        total=total,
        unread_count=unread_count,
        page=page,
        limit=limit,
    )


@router.post("/notifications/{id}/read", response_model=NotificationItem)
@router.patch("/notifications/{id}/read", response_model=NotificationItem)
@router.put("/notifications/{id}/read", response_model=NotificationItem)
async def mark_notification_read(
    id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark a single notification as read in the database with recipient ownership validation."""
    user_id = str(user.get("id") or user.get("sub") or "")
    role = user.get("role", "student")

    find_q = text("SELECT * FROM notifications WHERE id = :id")
    row = (await db.execute(find_q, {"id": id})).mappings().first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")

    if role != "admin" and str(row["user_id"]) != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to modify this notification.")

    now_iso = datetime.now(timezone.utc).isoformat()
    update_q = text("UPDATE notifications SET read = 1, updated_at = :updated_at WHERE id = :id")
    await db.execute(update_q, {"id": id, "updated_at": now_iso})

    updated_row = (await db.execute(find_q, {"id": id})).mappings().first()
    return row_to_notification(dict(updated_row))


@router.post("/notifications/read-all", response_model=Dict[str, Any])
@router.put("/notifications/read-all", response_model=Dict[str, Any])
async def mark_all_notifications_read(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark all unread notifications as read for the authenticated user in the database."""
    user_id = str(user.get("id") or user.get("sub") or "00000000-0000-0000-0000-000000000001")
    now_iso = datetime.now(timezone.utc).isoformat()

    # Count how many will be updated
    count_q = text("SELECT count(*) FROM notifications WHERE user_id = :user_id AND (read = 0 OR read = false)")
    unread_count = (await db.execute(count_q, {"user_id": user_id})).scalar() or 0

    update_q = text("""
        UPDATE notifications
        SET read = 1, updated_at = :updated_at
        WHERE user_id = :user_id AND (read = 0 OR read = false)
    """)
    await db.execute(update_q, {"user_id": user_id, "updated_at": now_iso})

    return {"message": "All notifications marked as read.", "count": unread_count}


@router.delete("/notifications/{id}", status_code=status.HTTP_200_OK)
async def delete_notification(
    id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a notification from the database with ownership enforcement."""
    user_id = str(user.get("id") or user.get("sub") or "")
    role = user.get("role", "student")

    find_q = text("SELECT * FROM notifications WHERE id = :id")
    row = (await db.execute(find_q, {"id": id})).mappings().first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")

    if role != "admin" and str(row["user_id"]) != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to delete this notification.")

    del_q = text("DELETE FROM notifications WHERE id = :id")
    await db.execute(del_q, {"id": id})

    return {"message": f"Notification {id} deleted successfully."}


@router.get("/notifications/preferences", response_model=NotificationPreferenceItem)
async def get_notification_preferences(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Retrieve notification channel preferences for current user directly from user_profiles table in DB."""
    user_id = str(user.get("id") or user.get("sub") or "")
    query = text("SELECT preferences FROM user_profiles WHERE id = :uid")
    row = (await db.execute(query, {"uid": user_id})).mappings().first()
    
    prefs = dict(DEFAULT_PREFERENCES)
    if row and row.get("preferences"):
        raw_prefs = row["preferences"]
        if isinstance(raw_prefs, dict):
            prefs.update(raw_prefs)
        elif isinstance(raw_prefs, str):
            try:
                prefs.update(json.loads(raw_prefs))
            except Exception:
                pass

    return NotificationPreferenceItem(**prefs)


@router.put("/notifications/preferences", response_model=NotificationPreferenceItem)
async def update_notification_preferences(
    body: NotificationPreferenceItem,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update and persist notification preferences to user_profiles table in database."""
    user_id = str(user.get("id") or user.get("sub") or "")
    prefs_dict = body.model_dump()
    prefs_json = json.dumps(prefs_dict)
    
    # Check if user profile exists
    check_q = text("SELECT id, preferences FROM user_profiles WHERE id = :uid")
    p_row = (await db.execute(check_q, {"uid": user_id})).mappings().first()

    now_iso = datetime.now(timezone.utc).isoformat()
    if p_row:
        existing_prefs = {}
        raw = p_row.get("preferences")
        if isinstance(raw, str):
            try:
                existing_prefs = json.loads(raw)
            except Exception:
                pass
        elif isinstance(raw, dict):
            existing_prefs = raw
        existing_prefs.update(prefs_dict)

        update_q = text("UPDATE user_profiles SET preferences = :prefs, updated_at = :updated_at WHERE id = :uid")
        await db.execute(update_q, {"prefs": json.dumps(existing_prefs), "updated_at": now_iso, "uid": user_id})
    else:
        # Insert minimal profile
        insert_q = text("""
            INSERT INTO user_profiles (id, email, role, full_name, preferences, created_at, updated_at)
            VALUES (:uid, :email, :role, :full_name, :prefs, :created_at, :updated_at)
        """)
        await db.execute(insert_q, {
            "uid": user_id,
            "email": user.get("email") or f"{user_id}@sfrc.edu.in",
            "role": user.get("role") or "student",
            "full_name": user.get("full_name") or user.get("name") or "User",
            "prefs": prefs_json,
            "created_at": now_iso,
            "updated_at": now_iso,
        })

    return body


@router.post("/device-tokens", status_code=status.HTTP_201_CREATED)
async def register_device_token(
    body: DeviceTokenRequest,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Register an FCM push notification token for user's device in database."""
    user_id = str(user.get("id") or user.get("sub") or "00000000-0000-0000-0000-000000000001")
    now_iso = datetime.now(timezone.utc).isoformat()

    check_q = text("SELECT id FROM device_tokens WHERE token = :token")
    row = (await db.execute(check_q, {"token": body.token})).mappings().first()

    if row:
        update_q = text("""
            UPDATE device_tokens
            SET user_id = :user_id, device_type = :device_type, updated_at = :updated_at
            WHERE token = :token
        """)
        await db.execute(update_q, {
            "token": body.token,
            "user_id": user_id,
            "device_type": body.device_type,
            "updated_at": now_iso,
        })
    else:
        new_tok_id = f"tok-{uuid.uuid4().hex[:8]}"
        insert_q = text("""
            INSERT INTO device_tokens (id, user_id, token, device_type, created_at, updated_at)
            VALUES (:id, :user_id, :token, :device_type, :created_at, :updated_at)
        """)
        await db.execute(insert_q, {
            "id": new_tok_id,
            "user_id": user_id,
            "token": body.token,
            "device_type": body.device_type,
            "created_at": now_iso,
            "updated_at": now_iso,
        })

    return {"status": "registered", "token": body.token[:12] + "..."}
