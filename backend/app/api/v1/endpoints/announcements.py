"""Announcements endpoints."""
from typing import List, Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.core.security import get_current_user

router = APIRouter()


class AnnouncementCreate(BaseModel):
    title: str
    content: str
    audience: List[str] = ["student", "faculty", "parent", "admin"]
    priority: str = "normal"
    department_id: Optional[str] = None


@router.get("/")
async def list_announcements(
    audience: Optional[str] = None,
    limit: int = 10,
    user: dict = Depends(get_current_user),
):
    return {"announcements": [], "total": 0}


@router.post("/")
async def create_announcement(body: AnnouncementCreate, user: dict = Depends(get_current_user)):
    return {"status": "created", "announcement": body.model_dump()}
