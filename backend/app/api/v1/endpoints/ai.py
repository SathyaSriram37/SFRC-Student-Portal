"""Pragya AI & RAG endpoints — Chat, Conversations, Knowledge Sources, and Ingestion Jobs."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, HttpUrl
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, get_optional_user
from app.core.capabilities import require_capability
from app.core.audit import log_audit_event
from app.ai.pragya_service import (
    PragyaService,
    AI_CONVERSATIONS,
    AI_MESSAGES,
)
from app.rag.ingestion import (
    SEED_KNOWLEDGE_SOURCES,
    KNOWLEDGE_CHUNKS,
    RAG_JOBS,
    ingest_source,
)
from app.ai.providers.provider_factory import get_embedding_provider

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str  # user | assistant
    content: str


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    history: List[ChatMessage] = []


class ChatResponse(BaseModel):
    reply: str
    conversation_id: str
    sources: List[str] = []
    intent: Optional[str] = None
    buttons: List[str] = []


class ConversationItem(BaseModel):
    id: str
    user_id: str
    title: str
    metadata: Dict[str, Any] = {}
    created_at: str
    updated_at: str


class MessageItem(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    sources: List[str] = []
    intent: Optional[str] = None
    created_at: str


class KnowledgeSourceCreate(BaseModel):
    title: str
    type: str  # manual | url | file
    url: Optional[str] = None
    category: str = "general"
    department: Optional[str] = "General"
    content: str


class KnowledgeSourceItem(BaseModel):
    id: str
    title: str
    type: str
    url: Optional[str] = None
    category: str
    department: Optional[str] = None
    content: str
    status: str
    chunks_count: int
    last_indexed_at: Optional[str] = None
    created_at: str


class RagJobItem(BaseModel):
    id: str
    source_id: str
    source_title: str
    status: str
    chunks: int
    started_at: str
    completed_at: Optional[str] = None


# ── Pragya AI Chat Endpoints ─────────────────────────────────────────────────

@router.post("/pragya/chat", response_model=ChatResponse)
@router.post("/ai/chat", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    user: dict = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """Process a chat message via Pragya AI service with DB tools, RAG, and multi-turn flows."""
    result = await PragyaService.process_chat(
        user_message=body.message,
        user=user,
        conversation_id=body.conversation_id,
        db=db,
    )
    return ChatResponse(**result)


@router.get("/pragya/conversations", response_model=List[ConversationItem])
async def list_conversations(
    user: dict = Depends(get_current_user),
):
    """List recent Pragya conversations for the current user."""
    user_id = user.get("id") or user.get("sub") or "00000000-0000-0000-0000-000000000001"
    user_convs = [c for c in AI_CONVERSATIONS if c["user_id"] == user_id]
    return [ConversationItem(**c) for c in user_convs]


@router.get("/pragya/conversations/{id}/messages", response_model=List[MessageItem])
async def get_conversation_messages(
    id: str,
    user: dict = Depends(get_current_user),
):
    """Retrieve message history for a specific conversation."""
    user_id = user.get("id") or user.get("sub") or "00000000-0000-0000-0000-000000000001"
    conv = next((c for c in AI_CONVERSATIONS if c["id"] == id), None)
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")
    
    if conv["user_id"] != user_id and user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized access to conversation.")

    messages = [m for m in AI_MESSAGES if m["conversation_id"] == id]
    return [MessageItem(**m) for m in messages]


# ── Admin RAG Endpoints ──────────────────────────────────────────────────────

@router.get("/admin/rag/sources", response_model=List[KnowledgeSourceItem])
async def list_rag_sources(
    user: dict = Depends(require_capability("rag_management")),
):
    """List all knowledge sources and their current indexing status."""
    return [KnowledgeSourceItem(**s) for s in SEED_KNOWLEDGE_SOURCES]


@router.post("/admin/rag/sources", response_model=KnowledgeSourceItem, status_code=status.HTTP_201_CREATED)
async def create_rag_source(
    body: KnowledgeSourceCreate,
    user: dict = Depends(require_capability("rag_management")),
    db: AsyncSession = Depends(get_db),
):
    """Add a new knowledge source and automatically queue for ingestion."""
    new_src = {
        "id": f"src-{uuid.uuid4().hex[:8]}",
        "title": body.title.strip(),
        "type": body.type,
        "url": body.url,
        "category": body.category,
        "department": body.department,
        "content": body.content.strip(),
        "status": "Pending",
        "chunks_count": 0,
        "last_indexed_at": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    SEED_KNOWLEDGE_SOURCES.insert(0, new_src)

    # Ingest the newly added source immediately
    embedder = get_embedding_provider()
    try:
        await ingest_source(source_id=new_src["id"], db=db, embedder=embedder)
    except Exception as e:
        print(f"[RAG Ingestion Error] {e}")

    await log_audit_event(
        user_id=user.get("id"),
        action="create_rag_source",
        resource_type="rag_source",
        resource_id=new_src["id"],
        details={"title": new_src["title"], "category": new_src["category"]},
        db=db,
    )

    return KnowledgeSourceItem(**new_src)


@router.post("/admin/rag/ingest/{id}", response_model=Dict[str, Any])
async def trigger_source_ingestion(
    id: str,
    user: dict = Depends(require_capability("rag_management")),
    db: AsyncSession = Depends(get_db),
):
    """Trigger manual re-indexing and chunk generation for a knowledge source."""
    source = next((s for s in SEED_KNOWLEDGE_SOURCES if s["id"] == id), None)
    if not source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Knowledge source not found.")

    embedder = get_embedding_provider()
    result = await ingest_source(source_id=id, db=db, embedder=embedder)

    await log_audit_event(
        user_id=user.get("id"),
        action="reindex_rag_source",
        resource_type="rag_source",
        resource_id=id,
        details=result,
        db=db,
    )

    return result


@router.get("/admin/rag/jobs", response_model=List[RagJobItem])
async def list_rag_jobs(
    user: dict = Depends(require_capability("rag_management")),
):
    """Retrieve indexing job history."""
    return [RagJobItem(**j) for j in RAG_JOBS]
