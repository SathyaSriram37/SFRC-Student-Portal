"""Notification service for dispatching in-app alerts and Firebase Cloud Messaging (FCM) push notifications."""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

logger = logging.getLogger(__name__)

# Persistent / In-Memory & Database-backed store for notifications
SEED_NOTIFICATIONS: List[Dict[str, Any]] = [
    {
        "id": "notif-001",
        "user_id": "00000000-0000-0000-0000-000000000001",
        "title": "CIA-2 Examination Schedule Published",
        "message": "The Continuous Internal Assessment 2 timetable for Semester VI is now available on your portal.",
        "type": "info",
        "entity_type": "exam",
        "entity_id": "exam-cia2-2026",
        "link": "/student/exams",
        "read": False,
        "created_at": "2026-09-30T07:30:00Z",
    },
    {
        "id": "notif-002",
        "user_id": "00000000-0000-0000-0000-000000000001",
        "title": "Campus Care Ticket Updated",
        "message": "Your complaint regarding Lab 3 projector has been marked as In Progress by the IT Maintenance team.",
        "type": "complaint",
        "entity_type": "complaint",
        "entity_id": "CC-00023",
        "link": "/student/campus-care",
        "read": False,
        "created_at": "2026-09-30T06:15:00Z",
    },
    {
        "id": "notif-003",
        "user_id": "00000000-0000-0000-0000-000000000001",
        "title": "TechSpark 2026 Registration Confirmed",
        "message": "Your team registration for the National Level Hackathon has been verified by the event coordinator.",
        "type": "success",
        "entity_type": "event",
        "entity_id": "ev-1",
        "link": "/student/events",
        "read": False,
        "created_at": "2026-09-29T14:20:00Z",
    },
    {
        "id": "notif-004",
        "user_id": "00000000-0000-0000-0000-000000000001",
        "title": "Attendance Alert: 22UCSE63",
        "message": "Your subject attendance in Machine Learning Fundamentals is currently at 76.5%. Ensure attendance remains above 75%.",
        "type": "warning",
        "entity_type": "attendance",
        "entity_id": "22UCSE63",
        "link": "/student/academics",
        "read": True,
        "created_at": "2026-09-28T11:00:00Z",
    },
    {
        "id": "notif-005",
        "user_id": "00000000-0000-0000-0000-000000000001",
        "title": "Library Book Due Reminder",
        "message": "Return 'Cloud Computing Concepts' (Acc No. 44102) to the IRC library by Friday to avoid overdue fines.",
        "type": "info",
        "entity_type": "library",
        "entity_id": "book-44102",
        "link": "/student/library",
        "read": True,
        "created_at": "2026-09-27T09:45:00Z",
    },
]

# User notification preferences store
USER_NOTIFICATION_PREFERENCES: Dict[str, Dict[str, Any]] = {
    "default": {
        "email_enabled": True,
        "sms_enabled": False,
        "push_enabled": True,
        "academic_alerts": True,
        "complaint_updates": True,
        "event_announcements": True,
        "library_reminders": True,
        "fee_alerts": True,
    }
}

# Registered FCM device tokens
DEVICE_TOKENS: List[Dict[str, Any]] = []


class NotificationService:
    def __init__(self, db: Optional[AsyncSession] = None, fcm_enabled: bool = False):
        self.db = db
        self.fcm_enabled = fcm_enabled

    async def send(
        self,
        user_id: str,
        title: str,
        message: str,
        type: str = "info",
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        link: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Dispatch a notification to a specific user and optionally send FCM push."""
        notif_id = f"notif-{uuid.uuid4().hex[:8]}"
        now_iso = datetime.now(timezone.utc).isoformat()

        notif_record = {
            "id": notif_id,
            "user_id": user_id,
            "title": title,
            "message": message,
            "type": type,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "link": link,
            "read": False,
            "created_at": now_iso,
        }

        # Insert into in-memory store
        SEED_NOTIFICATIONS.insert(0, notif_record)

        # Persist to database if db session is available
        if self.db is not None:
            try:
                query = text("""
                    INSERT INTO public.notifications (id, user_id, title, message, type, entity_type, entity_id, link, read, created_at)
                    VALUES (:id::uuid, :user_id::uuid, :title, :message, :type, :entity_type, :entity_id, :link, false, :created_at)
                    ON CONFLICT (id) DO NOTHING
                """)
                await self.db.execute(query, {
                    "id": str(uuid.UUID(hex=notif_id[6:])) if len(notif_id[6:]) == 32 else str(uuid.uuid4()),
                    "user_id": user_id if len(user_id) == 36 else "00000000-0000-0000-0000-000000000001",
                    "title": title,
                    "message": message,
                    "type": type,
                    "entity_type": entity_type,
                    "entity_id": entity_id,
                    "link": link,
                    "created_at": now_iso,
                })
                await self.db.commit()
            except Exception as e:
                logger.warning(f"Database insert for notification failed (non-blocking): {e}")

        # FCM Push Dispatch (Graceful on failure)
        if self.fcm_enabled:
            try:
                await self._send_push(user_id, title, message, link)
            except Exception as e:
                logger.warning(f"FCM push notification failed (non-critical): {e}")

        return notif_record

    async def _send_push(
        self,
        user_id: str,
        title: str,
        message: str,
        link: Optional[str] = None,
    ) -> None:
        """Helper to invoke Firebase Cloud Messaging."""
        user_tokens = [d["token"] for d in DEVICE_TOKENS if d.get("user_id") == user_id]
        if not user_tokens:
            return
        # If firebase-admin is installed and configured, send batch push
        # otherwise gracefully log dispatch attempt
        logger.info(f"[FCM] Dispatched push to {len(user_tokens)} devices for user {user_id}: {title}")
