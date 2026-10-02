"""
Integration sync log helper — writes DB-side audit entries for ERMS adapter calls.

Uses raw SQLAlchemy text queries to avoid circular import with the full model layer.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def create_sync_log(
    db: AsyncSession,
    provider: str,
    operation: str,
    reference: str,
    status: str,
    records_processed: int = 1,
) -> None:
    """
    Insert a sync log row into integration_sync_logs table.
    The table is created by the migration in init_db if not already present.
    Silently skips if the table does not exist yet.
    """
    try:
        await db.execute(
            text(
                """
                INSERT INTO integration_sync_logs
                    (id, provider, operation, reference, status, records_processed, synced_at)
                VALUES
                    (:id, :provider, :operation, :reference, :status, :records, :ts)
                """
            ),
            {
                "id": str(uuid.uuid4()),
                "provider": provider,
                "operation": operation,
                "reference": reference,
                "status": status,
                "records": records_processed,
                "ts": datetime.now(timezone.utc),
            },
        )
        await db.commit()
    except Exception:
        await db.rollback()
        # Non-fatal — log tables missing in test environments is acceptable
        pass
