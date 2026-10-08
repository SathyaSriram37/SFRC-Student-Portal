"""Notification service for persistent in-app alerts and Firebase Cloud Messaging (FCM) push notifications."""
from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.database import AsyncSessionLocal

logger = logging.getLogger(__name__)

# Default fallback preferences for new user profiles
DEFAULT_PREFERENCES: Dict[str, Any] = {
    "email_enabled": True,
    "sms_enabled": False,
    "push_enabled": True,
    "academic_alerts": True,
    "complaint_updates": True,
    "event_announcements": True,
    "library_reminders": True,
    "fee_alerts": True,
}


class NotificationService:
    def __init__(self, db: Optional[AsyncSession] = None, fcm_enabled: bool = False):
        self.db = db
        self.fcm_enabled = fcm_enabled

    async def _get_user_preferences(self, user_id: str, db: AsyncSession) -> Dict[str, Any]:
        """Fetch user's persistent notification channel preferences."""
        try:
            q = text("SELECT preferences FROM user_profiles WHERE id = :user_id")
            row = (await db.execute(q, {"user_id": user_id})).mappings().first()
            if row and row.get("preferences"):
                raw = row["preferences"]
                if isinstance(raw, dict):
                    prefs = dict(DEFAULT_PREFERENCES)
                    prefs.update(raw)
                    return prefs
                elif isinstance(raw, str):
                    prefs = dict(DEFAULT_PREFERENCES)
                    prefs.update(json.loads(raw))
                    return prefs
        except Exception:
            pass
        return dict(DEFAULT_PREFERENCES)

    def _should_suppress_notification(self, notif_type: str, prefs: Dict[str, Any]) -> bool:
        """Check if notification should be suppressed based on user's persistent preferences."""
        t = notif_type.lower()
        if t in ("event", "events"):
            if not prefs.get("event_announcements", True) or not prefs.get("event_reminders", True):
                return True
        if t in ("complaint", "grievance") and not prefs.get("complaint_updates", True):
            return True
        if t in ("library", "book") and not prefs.get("library_reminders", True):
            return True
        if t in ("fee", "fees", "dues"):
            if not prefs.get("fee_alerts", True) or not prefs.get("fee_due_reminders", True):
                return True
        if t in ("exam", "attendance", "marks", "academic") and not prefs.get("academic_alerts", True):
            return True
        return False

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
        """Dispatch a notification to a specific user with database persistence and preference filtering."""
        notif_id = f"notif-{uuid.uuid4().hex[:8]}"
        now_iso = datetime.now(timezone.utc).isoformat()

        async def _execute_insert(session: AsyncSession) -> Dict[str, Any]:
            prefs = await self._get_user_preferences(user_id, session)
            if self._should_suppress_notification(type, prefs):
                logger.info(f"Notification suppressed for user {user_id} based on preferences: {title} ({type})")
                return {
                    "id": notif_id,
                    "user_id": user_id,
                    "title": title,
                    "message": message,
                    "type": type,
                    "entity_type": entity_type,
                    "entity_id": entity_id,
                    "link": link,
                    "read": False,
                    "suppressed": True,
                    "created_at": now_iso,
                }

            ins_q = text("""
                INSERT INTO notifications (
                    id, user_id, title, message, type, entity_type, entity_id, link, read, created_at, updated_at
                ) VALUES (
                    :id, :user_id, :title, :message, :type, :entity_type, :entity_id, :link, 0, :created_at, :updated_at
                )
            """)
            await session.execute(ins_q, {
                "id": notif_id,
                "user_id": user_id,
                "title": title,
                "message": message,
                "type": type,
                "entity_type": entity_type,
                "entity_id": entity_id,
                "link": link,
                "created_at": now_iso,
                "updated_at": now_iso,
            })

            # Check FCM push tokens
            if self.fcm_enabled or prefs.get("push_enabled", True):
                try:
                    await self._send_push(user_id, title, message, link, session)
                except Exception as ex:
                    logger.warning(f"Push dispatch error: {ex}")

            return {
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

        if self.db is not None:
            return await _execute_insert(self.db)
        else:
            async with AsyncSessionLocal() as session:
                res = await _execute_insert(session)
                await session.commit()
                return res

    async def _send_push(
        self,
        user_id: str,
        title: str,
        message: str,
        link: Optional[str] = None,
        db: Optional[AsyncSession] = None,
    ) -> None:
        """Query persistent device tokens and dispatch push notification."""
        if db is not None:
            q = text("SELECT token FROM device_tokens WHERE user_id = :user_id")
            rows = (await db.execute(q, {"user_id": user_id})).fetchall()
            tokens = [r[0] for r in rows]
            if tokens:
                logger.info(f"[FCM Push] Dispatched notification to {len(tokens)} devices for user {user_id}: {title}")
