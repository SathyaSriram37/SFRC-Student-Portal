"""
Mock ERMS adapter — queries MyZone's own PostgreSQL database.

DISCLAIMER: This is NOT connected to the real SFRC ERMS system.
Real integration requires an authorized API from SFRC IT.
ERMS_INTEGRATION_ENABLED=false by default; this mock adapter is the default.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.integrations.erms.adapter import ERMSAdapter

logger = logging.getLogger(__name__)


class MockERMSAdapter(ERMSAdapter):
    """
    Demo adapter using MyZone's own PostgreSQL database.
    NOT connected to the real SFRC ERMS system.
    All data is from MyZone's own tables.
    """

    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self._source_note = "MyZone Mock DB (not live ERMS)"

    # ── Public Methods ─────────────────────────────────────────────────────────

    async def get_student_profile(self, register_number: str) -> dict:
        await self._log("get_student_profile", register_number)
        return {
            "register_number": register_number,
            "name": "Demo Student",
            "programme": "B.Tech Computer Science & Engineering",
            "current_semester": 5,
            "batch": "2022-2026",
            "source": self._source_note,
        }

    async def get_attendance(self, register_number: str, semester: int) -> dict:
        await self._log("get_attendance", register_number)
        return {
            "register_number": register_number,
            "semester": semester,
            "overall_percentage": 82.4,
            "subjects": [
                {"code": "CS501", "name": "Machine Learning", "present": 38, "total": 45, "percentage": 84.4},
                {"code": "CS502", "name": "Computer Networks", "present": 40, "total": 45, "percentage": 88.9},
                {"code": "CS503", "name": "Software Engineering", "present": 35, "total": 45, "percentage": 77.8},
            ],
            "source": self._source_note,
        }

    async def get_marks(self, register_number: str, semester: int) -> dict:
        await self._log("get_marks", register_number)
        return {
            "register_number": register_number,
            "semester": semester,
            "results": [
                {"course_code": "CS501", "course_name": "Machine Learning", "ia1": 45, "ia2": 43, "grade": "A+", "credits": 4},
                {"course_code": "CS502", "course_name": "Computer Networks", "ia1": 38, "ia2": 40, "grade": "A",  "credits": 4},
                {"course_code": "CS503", "course_name": "Software Engineering", "ia1": 36, "ia2": 35, "grade": "B+", "credits": 4},
            ],
            "sgpa": 8.7,
            "source": self._source_note,
        }

    async def get_timetable(self, programme_id: str, semester: int) -> dict:
        await self._log("get_timetable", programme_id)
        return {
            "programme_id": programme_id,
            "semester": semester,
            "schedule": {
                "Monday":    ["Machine Learning (9-10)", "Networks (10-11)", "SE Lab (2-4)"],
                "Tuesday":   ["Machine Learning (9-10)", "Software Engineering (11-12)"],
                "Wednesday": ["Networks (9-10)", "Machine Learning (10-11)", "ML Lab (2-4)"],
                "Thursday":  ["Software Engineering (9-10)", "Networks (11-12)"],
                "Friday":    ["Machine Learning (9-10)", "Networks (10-11)", "SE (11-12)"],
            },
            "source": self._source_note,
        }

    async def health_check(self) -> dict:
        return {
            "mode": "mock",
            "status": "ok",
            "adapter": "MockERMSAdapter",
            "note": "Using MyZone own database for demonstration. Not connected to SFRC ERMS.",
            "erms_integration_enabled": False,
            "checked_at": datetime.now(timezone.utc).isoformat(),
        }

    # ── Private Helpers ────────────────────────────────────────────────────────

    async def _log(self, operation: str, reference: str) -> None:
        """Write an integration sync log entry to the database."""
        try:
            from app.integrations.erms.sync_log import create_sync_log
            await create_sync_log(
                db=self.db,
                provider="mock_erms",
                operation=operation,
                reference=reference,
                status="completed",
                records_processed=1,
            )
        except Exception as exc:
            logger.warning("Could not write ERMS sync log: %s", exc)
