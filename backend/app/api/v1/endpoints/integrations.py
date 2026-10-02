"""
ERMS Integration endpoints (Phase 18).

Routes:
  GET  /api/v1/integrations/erms/health        -> health check + mode
  GET  /api/v1/admin/integrations/sync-logs    -> paginated sync log history
  POST /api/v1/admin/integrations/erms/sync    -> demo sync trigger (admin only)

IMPORTANT: ERMS_INTEGRATION_ENABLED=false by default.
All responses use MockERMSAdapter (MyZone own DB). Not connected to SFRC ERMS.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.audit import log_audit_event
from app.integrations.erms.factory import get_erms_adapter

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────────────────

class ERMSHealthResponse(BaseModel):
    mode: str
    status: str
    adapter: Optional[str] = None
    note: str
    erms_integration_enabled: bool = False
    checked_at: str


class SyncLogItem(BaseModel):
    id: str
    provider: str
    operation: str
    reference: Optional[str] = None
    status: str
    records_processed: int
    synced_at: str


class SyncLogsResponse(BaseModel):
    items: List[SyncLogItem]
    total: int
    page: int
    page_size: int


class SyncTriggerResponse(BaseModel):
    success: bool
    message: str
    records_synced: int
    mode: str


# ── Helpers ────────────────────────────────────────────────────────────────────

async def _ensure_sync_log_table(db: AsyncSession) -> None:
    """Ensure the integration_sync_logs table exists (idempotent DDL)."""
    await db.execute(text("""
        CREATE TABLE IF NOT EXISTS integration_sync_logs (
            id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
            provider          TEXT NOT NULL,
            operation         TEXT NOT NULL,
            reference         TEXT,
            status            TEXT NOT NULL DEFAULT 'completed',
            records_processed INTEGER NOT NULL DEFAULT 0,
            error_message     TEXT,
            synced_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """))
    await db.commit()


async def _get_sync_logs(
    db: AsyncSession,
    page: int,
    page_size: int,
    provider: Optional[str] = None,
) -> tuple[List[Dict[str, Any]], int]:
    """Fetch paginated sync logs from the database."""
    await _ensure_sync_log_table(db)

    where_clause = "WHERE provider = :provider" if provider else ""
    params: Dict[str, Any] = {"limit": page_size, "offset": (page - 1) * page_size}
    if provider:
        params["provider"] = provider

    rows = await db.execute(
        text(f"""
            SELECT id, provider, operation, reference, status, records_processed, synced_at
            FROM integration_sync_logs
            {where_clause}
            ORDER BY synced_at DESC
            LIMIT :limit OFFSET :offset
        """),
        params,
    )
    items = [dict(r._mapping) for r in rows.fetchall()]

    count_row = await db.execute(
        text(f"SELECT COUNT(*) FROM integration_sync_logs {where_clause}"),
        {k: v for k, v in params.items() if k not in ("limit", "offset")},
    )
    total: int = count_row.scalar_one()
    return items, total


# ── Public Endpoints ───────────────────────────────────────────────────────────

@router.get(
    "/integrations/erms/health",
    response_model=ERMSHealthResponse,
    tags=["ERMS Integration"],
    summary="ERMS Health Check",
    description=(
        "Returns the health status and operating mode of the ERMS integration adapter. "
        "mode='mock' indicates MyZone own DB is in use. Not connected to SFRC ERMS."
    ),
)
async def erms_health(db: AsyncSession = Depends(get_db)) -> ERMSHealthResponse:
    adapter = get_erms_adapter(db)
    result = await adapter.health_check()
    return ERMSHealthResponse(**result)


# ── Admin Endpoints ────────────────────────────────────────────────────────────

@router.get(
    "/admin/integrations/sync-logs",
    response_model=SyncLogsResponse,
    tags=["ERMS Integration"],
    summary="Integration Sync Log History (Admin)",
)
async def get_sync_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    provider: Optional[str] = Query(None, description="Filter by provider name"),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SyncLogsResponse:
    items, total = await _get_sync_logs(db, page, page_size, provider)
    return SyncLogsResponse(
        items=[
            SyncLogItem(
                id=str(r["id"]),
                provider=r["provider"],
                operation=r["operation"],
                reference=r.get("reference"),
                status=r["status"],
                records_processed=int(r["records_processed"]),
                synced_at=r["synced_at"].isoformat() if hasattr(r["synced_at"], "isoformat") else str(r["synced_at"]),
            )
            for r in items
        ],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post(
    "/admin/integrations/erms/sync",
    response_model=SyncTriggerResponse,
    tags=["ERMS Integration"],
    summary="Trigger Demo ERMS Sync (Admin)",
    description=(
        "Triggers a demonstration sync using MockERMSAdapter. "
        "No live ERMS data is fetched. A sync log entry is written to the database."
    ),
)
async def trigger_erms_sync(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SyncTriggerResponse:
    adapter = get_erms_adapter(db)
    health = await adapter.health_check()

    # Trigger a demo operation to produce a sync log
    await adapter.get_student_profile("DEMO-SYNC")

    await log_audit_event(
        db=db,
        actor_id=current_user.get("sub", "unknown"),
        actor_role=current_user.get("role", "admin"),
        action="erms_sync_triggered",
        resource_type="integration",
        resource_id="mock_erms",
        details={"mode": health.get("mode"), "note": "Demo sync — not connected to live ERMS"},
    )

    return SyncTriggerResponse(
        success=True,
        message="Demo sync completed using MockERMSAdapter (MyZone own DB). Not connected to SFRC ERMS.",
        records_synced=1,
        mode=health.get("mode", "mock"),
    )
