"""
SFRC ERMS Real Adapter — PLACEHOLDER.

IMPORTANT: This class is intentionally NOT implemented.
Real integration requires an authorized ERMS API from SFRC IT department.
Contact SFRC IT to obtain API credentials and endpoints before enabling.

To enable: set ERMS_INTEGRATION_ENABLED=true and ERMS_API_URL in .env
"""
from __future__ import annotations

from datetime import datetime, timezone

from app.integrations.erms.adapter import ERMSAdapter


class SFRCERMSAdapter(ERMSAdapter):
    """
    PLACEHOLDER for real SFRC ERMS integration.
    All methods raise NotImplementedError until the authorized API is available.
    """

    async def get_student_profile(self, register_number: str) -> dict:
        raise NotImplementedError(
            "Real ERMS integration requires an authorized API. Contact SFRC IT."
        )

    async def get_attendance(self, register_number: str, semester: int) -> dict:
        raise NotImplementedError(
            "Real ERMS integration requires an authorized API. Contact SFRC IT."
        )

    async def get_marks(self, register_number: str, semester: int) -> dict:
        raise NotImplementedError(
            "Real ERMS integration requires an authorized API. Contact SFRC IT."
        )

    async def get_timetable(self, programme_id: str, semester: int) -> dict:
        raise NotImplementedError(
            "Real ERMS integration requires an authorized API. Contact SFRC IT."
        )

    async def health_check(self) -> dict:
        return {
            "mode": "not_configured",
            "status": "unavailable",
            "adapter": "SFRCERMSAdapter",
            "note": "ERMS_INTEGRATION_ENABLED=true but API not yet implemented. Contact SFRC IT.",
            "checked_at": datetime.now(timezone.utc).isoformat(),
        }
