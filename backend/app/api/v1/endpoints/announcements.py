"""Announcements endpoints — database-backed institutional notices, broadcast dispatch, and audit logging."""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.audit import log_audit_event

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────────────

class AnnouncementItem(BaseModel):
    id: str
    title: str
    content: str
    audience: List[str]
    priority: str = "normal"
    type: str = "info"
    department_id: Optional[str] = None
    created_by: Optional[str] = None
    created_at: str
    updated_at: str


class AnnouncementListResponse(BaseModel):
    announcements: List[AnnouncementItem]
    total: int


class AnnouncementCreate(BaseModel):
    title: str
    content: str
    audience: List[str] = ["student", "faculty", "parent", "admin"]
    priority: str = "normal"
    type: str = "info"
    department_id: Optional[str] = None


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/", response_model=AnnouncementListResponse)
@router.get("", response_model=AnnouncementListResponse)
async def list_announcements(
    audience: Optional[str] = Query(None, description="Filter by audience role"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    department_id: Optional[str] = Query(None, description="Filter by department"),
    limit: int = Query(50, ge=1, le=200),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve official college announcements from database."""
    conditions: list[str] = []
    params: dict[str, Any] = {"limit": limit}

    if priority:
        conditions.append("priority = :priority")
        params["priority"] = priority

    if department_id:
        conditions.append("(department_id = :dept_id OR department_id IS NULL)")
        params["dept_id"] = department_id

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    query = text(f"""
        SELECT id, title, content, audience, priority, type, department_id, created_by, created_at, updated_at
        FROM announcements
        {where_clause}
        ORDER BY created_at DESC
        LIMIT :limit
    """)

    result = await db.execute(query, params)
    rows = result.mappings().all()

    items: list[AnnouncementItem] = []
    for r in rows:
        raw_aud = r.get("audience")
        aud_list: list[str] = ["student", "faculty", "parent", "admin"]
        if isinstance(raw_aud, str):
            try:
                aud_list = json.loads(raw_aud)
            except Exception:
                aud_list = [raw_aud]
        elif isinstance(raw_aud, list):
            aud_list = raw_aud

        # If filtering by audience
        if audience and audience != "all" and audience not in aud_list:
            continue

        items.append(
            AnnouncementItem(
                id=str(r["id"]),
                title=str(r["title"]),
                content=str(r["content"]),
                audience=aud_list,
                priority=str(r.get("priority") or "normal"),
                type=str(r.get("type") or "info"),
                department_id=str(r["department_id"]) if r.get("department_id") else None,
                created_by=str(r["created_by"]) if r.get("created_by") else None,
                created_at=str(r.get("created_at") or datetime.now(timezone.utc).isoformat()),
                updated_at=str(r.get("updated_at") or datetime.now(timezone.utc).isoformat()),
            )
        )

    return AnnouncementListResponse(announcements=items, total=len(items))


@router.post("/", response_model=AnnouncementItem, status_code=status.HTTP_201_CREATED)
@router.post("", response_model=AnnouncementItem, status_code=status.HTTP_201_CREATED)
async def create_announcement(
    body: AnnouncementCreate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new institutional announcement, log audit event, and broadcast notifications to users."""
    role = user.get("role") or "student"
    if role not in ("admin", "faculty"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin and Faculty can broadcast announcements."
        )

    announcement_id = f"ann-{uuid.uuid4().hex[:8]}"
    now_iso = datetime.now(timezone.utc).isoformat()
    aud_json = json.dumps(body.audience)
    created_by = user.get("email") or str(user.get("id") or "admin")

    # Insert into announcements table
    insert_q = text("""
        INSERT INTO announcements (id, title, content, audience, priority, type, department_id, created_by, created_at, updated_at)
        VALUES (:id, :title, :content, :audience, :priority, :type, :department_id, :created_by, :created_at, :updated_at)
    """)
    await db.execute(insert_q, {
        "id": announcement_id,
        "title": body.title,
        "content": body.content,
        "audience": aud_json,
        "priority": body.priority,
        "type": body.type,
        "department_id": body.department_id,
        "created_by": created_by,
        "created_at": now_iso,
        "updated_at": now_iso,
    })

    # Broadcast notification records to all active target users
    try:
        # Find user IDs matching audience roles
        roles_tuple = tuple(body.audience)
        if len(roles_tuple) == 1:
            find_users_q = text("SELECT id FROM user_profiles WHERE role = :r AND is_active = true")
            users_res = await db.execute(find_users_q, {"r": roles_tuple[0]})
        else:
            # Build placeholders
            placeholders = ", ".join([f":r{i}" for i in range(len(roles_tuple))])
            params = {f"r{i}": r for i, r in enumerate(roles_tuple)}
            find_users_q = text(f"SELECT id FROM user_profiles WHERE role IN ({placeholders}) AND is_active = true")
            users_res = await db.execute(find_users_q, params)

        user_rows = users_res.mappings().all()
        for u in user_rows:
            notif_id = f"notif-{uuid.uuid4().hex[:8]}"
            notif_insert = text("""
                INSERT INTO notifications (id, user_id, title, message, type, entity_type, entity_id, link, read, created_at, updated_at)
                VALUES (:id, :user_id, :title, :message, :type, :entity_type, :entity_id, :link, false, :created_at, :updated_at)
            """)
            await db.execute(notif_insert, {
                "id": notif_id,
                "user_id": str(u["id"]),
                "title": body.title,
                "message": body.content[:280],
                "type": body.type or "info",
                "entity_type": "announcement",
                "entity_id": announcement_id,
                "link": "/notifications",
                "created_at": now_iso,
                "updated_at": now_iso,
            })
    except Exception:
        # Non-blocking user broadcast
        pass

    # Audit logging
    await log_audit_event(
        db=db,
        action="ANNOUNCEMENT_BROADCAST",
        user_id=str(user.get("id") or user.get("sub") or ""),
        resource_type="announcements",
        resource_id=announcement_id,
        details={
            "title": body.title,
            "audience": body.audience,
            "priority": body.priority,
            "type": body.type,
        },
    )

    return AnnouncementItem(
        id=announcement_id,
        title=body.title,
        content=body.content,
        audience=body.audience,
        priority=body.priority,
        type=body.type,
        department_id=body.department_id,
        created_by=created_by,
        created_at=now_iso,
        updated_at=now_iso,
    )


@router.delete("/{announcement_id}", status_code=status.HTTP_200_OK)
async def delete_announcement(
    announcement_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete an institutional announcement."""
    role = user.get("role") or "student"
    if role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Administrators can delete announcements."
        )

    del_q = text("DELETE FROM announcements WHERE id = :id")
    await db.execute(del_q, {"id": announcement_id})

    await log_audit_event(
        db=db,
        action="ANNOUNCEMENT_DELETE",
        user_id=str(user.get("id") or user.get("sub") or ""),
        resource_type="announcements",
        resource_id=announcement_id,
        details={"deleted_id": announcement_id},
    )

    return {"message": f"Announcement {announcement_id} deleted successfully."}
