"""
ERMS Adapter factory.

Returns MockERMSAdapter by default.
Returns SFRCERMSAdapter only when ERMS_INTEGRATION_ENABLED=true AND ERMS_API_URL is set.
"""
from __future__ import annotations

import os

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.integrations.erms.adapter import ERMSAdapter


def get_erms_adapter(db: AsyncSession) -> ERMSAdapter:
    """
    Factory: resolve the appropriate ERMS adapter based on environment config.

    Default behavior (ERMS_INTEGRATION_ENABLED=false):
        -> MockERMSAdapter using MyZone's own PostgreSQL database.

    When ERMS_INTEGRATION_ENABLED=true AND ERMS_API_URL is set:
        -> SFRCERMSAdapter (currently a NotImplementedError stub until authorized API is ready).
    """
    if settings.erms_integration_enabled and os.getenv("ERMS_API_URL"):
        from app.integrations.erms.sfrc_erms_adapter import SFRCERMSAdapter
        return SFRCERMSAdapter()

    # Default: use MockERMSAdapter with MyZone's own DB
    from app.integrations.erms.mock_adapter import MockERMSAdapter
    return MockERMSAdapter(db)
