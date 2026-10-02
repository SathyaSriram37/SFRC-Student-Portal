"""User profile endpoints."""
from fastapi import APIRouter, Depends
from app.core.security import get_current_user

router = APIRouter()


@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    """Return the authenticated user's profile."""
    return {"user_id": user.get("sub"), "email": user.get("email"), "role": (user.get("user_metadata") or {}).get("role")}
