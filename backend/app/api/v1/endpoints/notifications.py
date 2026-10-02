"""Notification endpoints — User alerts, unread badges, bulk actions, preferences, and FCM tokens."""
from __future__ import annotations

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
    SEED_NOTIFICATIONS,
    USER_NOTIFICATION_PREFERENCES,
    DEVICE_TOKENS,
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


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/notifications", response_model=NotificationListResponse)
async def list_notifications(
    read: Optional[bool] = Query(None, description="Filter by read status"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve notifications for the current authenticated user with pagination and unread count."""
    user_id = user.get("id") or user.get("sub") or "00000000-0000-0000-0000-000000000001"

    # Filter by user (or global defaults)
    user_notifs = [n for n in SEED_NOTIFICATIONS if n["user_id"] == user_id or n["user_id"] == "00000000-0000-0000-0000-000000000001"]

    if read is not None:
        filtered = [n for n in user_notifs if n["read"] is read]
    else:
        filtered = user_notifs

    unread_count = sum(1 for n in user_notifs if not n["read"])

    offset = (page - 1) * limit
    paginated = filtered[offset : offset + limit]

    return NotificationListResponse(
        notifications=[NotificationItem(**n) for n in paginated],
        total=len(filtered),
        unread_count=unread_count,
        page=page,
        limit=limit,
    )


@router.post("/notifications/{id}/read", response_model=NotificationItem)
async def mark_notification_read(
    id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark a single notification as read."""
    notif = next((n for n in SEED_NOTIFICATIONS if n["id"] == id), None)
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")

    notif["read"] = True

    if db is not None:
        try:
            query = text("UPDATE public.notifications SET read = true WHERE id = :id::uuid")
            await db.execute(query, {"id": id if len(id) == 36 else None})
            await db.commit()
        except Exception:
            pass

    return NotificationItem(**notif)


@router.post("/notifications/read-all", response_model=Dict[str, Any])
async def mark_all_notifications_read(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark all notifications as read for the authenticated user."""
    user_id = user.get("id") or user.get("sub") or "00000000-0000-0000-0000-000000000001"

    updated_count = 0
    for n in SEED_NOTIFICATIONS:
        if n["user_id"] == user_id or n["user_id"] == "00000000-0000-0000-0000-000000000001":
            if not n["read"]:
                n["read"] = True
                updated_count += 1

    if db is not None:
        try:
            query = text("UPDATE public.notifications SET read = true WHERE user_id = :user_id::uuid")
            await db.execute(query, {"user_id": user_id if len(user_id) == 36 else None})
            await db.commit()
        except Exception:
            pass

    return {"message": "All notifications marked as read.", "count": updated_count}


@router.delete("/notifications/{id}", status_code=status.HTTP_200_OK)
async def delete_notification(
    id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a notification."""
    global SEED_NOTIFICATIONS
    notif = next((n for n in SEED_NOTIFICATIONS if n["id"] == id), None)
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")

    SEED_NOTIFICATIONS = [n for n in SEED_NOTIFICATIONS if n["id"] != id]

    if db is not None:
        try:
            query = text("DELETE FROM public.notifications WHERE id = :id::uuid")
            await db.execute(query, {"id": id if len(id) == 36 else None})
            await db.commit()
        except Exception:
            pass

    return {"message": f"Notification {id} deleted successfully."}


@router.get("/notifications/preferences", response_model=NotificationPreferenceItem)
async def get_notification_preferences(
    user: dict = Depends(get_current_user),
):
    """Retrieve notification channel preferences for current user."""
    user_id = user.get("id") or user.get("sub") or "default"
    prefs = USER_NOTIFICATION_PREFERENCES.get(user_id, USER_NOTIFICATION_PREFERENCES["default"])
    return NotificationPreferenceItem(**prefs)


@router.put("/notifications/preferences", response_model=NotificationPreferenceItem)
async def update_notification_preferences(
    body: NotificationPreferenceItem,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update notification preferences."""
    user_id = user.get("id") or user.get("sub") or "default"
    USER_NOTIFICATION_PREFERENCES[user_id] = body.model_dump()
    return body


@router.post("/device-tokens", status_code=status.HTTP_201_CREATED)
async def register_device_token(
    body: DeviceTokenRequest,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Register an FCM push notification token for user's device."""
    user_id = user.get("id") or user.get("sub") or "00000000-0000-0000-0000-000000000001"

    # Upsert token
    existing = next((d for d in DEVICE_TOKENS if d["token"] == body.token), None)
    if existing:
        existing["user_id"] = user_id
        existing["device_type"] = body.device_type
        existing["updated_at"] = datetime.now(timezone.utc).isoformat()
    else:
        DEVICE_TOKENS.append({
            "id": f"tok-{uuid.uuid4().hex[:8]}",
            "user_id": user_id,
            "token": body.token,
            "device_type": body.device_type,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })

    return {"status": "registered", "token": body.token[:12] + "..."}
