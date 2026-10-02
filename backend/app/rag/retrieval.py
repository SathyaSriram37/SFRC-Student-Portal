"""RAG retrieval — embed query and fetch relevant knowledge chunks with source citations."""
from __future__ import annotations

import math
import re
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.ai.providers.base import EmbeddingProvider
from app.ai.providers.provider_factory import get_embedding_provider
from app.rag.ingestion import KNOWLEDGE_CHUNKS, SEED_KNOWLEDGE_SOURCES
from app.core.config import settings


def _cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """Compute cosine similarity between two float vectors."""
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return dot / (norm_a * norm_b)


def _keyword_similarity(query: str, content: str) -> float:
    """Compute lexical match score between query and chunk content."""
    q_words = set(re.findall(r'\w+', query.lower()))
    if not q_words:
        return 0.0
    c_words = set(re.findall(r'\w+', content.lower()))
    intersection = q_words.intersection(c_words)
    if not intersection:
        return 0.0
    return len(intersection) / len(q_words)


async def retrieve(
    query: str,
    top_k: Optional[int] = None,
    threshold: Optional[float] = None,
    embedder: Optional[EmbeddingProvider] = None,
    db: Optional[AsyncSession] = None,
) -> List[Dict[str, Any]]:
    """
    Retrieve knowledge chunks matching query.
    Uses vector embedding similarity if embedder available, otherwise keyword score matching.
    """
    k = top_k or settings.rag_top_k or 5
    sim_threshold = threshold if threshold is not None else 0.25

    if not query or not query.strip():
        return []

    # 1. Try vector retrieval if embedder is active
    q_vec: Optional[List[float]] = None
    if embedder is not None:
        try:
            q_vec = await embedder.embed(query)
        except Exception as e:
            print(f"[RAG Retrieval] Embed query failed: {e}")

    results: List[Dict[str, Any]] = []

    for chunk in KNOWLEDGE_CHUNKS:
        score = 0.0
        if q_vec is not None and chunk.get("embedding"):
            score = _cosine_similarity(q_vec, chunk["embedding"])
        else:
            score = _keyword_similarity(query, chunk["content"])

        if score >= sim_threshold:
            results.append({
                "source_id": chunk["source_id"],
                "source_title": chunk["source_title"],
                "chunk_index": chunk["chunk_index"],
                "content": chunk["content"],
                "score": round(score, 3),
            })

    # Sort descending by score
    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:k]


async def retrieve_context(
    query: str,
    top_k: Optional[int] = None,
    threshold: Optional[float] = None,
) -> List[str]:
    """Legacy helper returning chunk string list with citations."""
    embedder = get_embedding_provider()
    matches = await retrieve(query=query, top_k=top_k, threshold=threshold, embedder=embedder)
    return [
        f"[Source: {m['source_title']}] {m['content']}"
        for m in matches
    ]
