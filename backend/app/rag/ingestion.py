"""RAG knowledge ingestion pipeline and source storage."""
from __future__ import annotations

import uuid
import math
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.ai.providers.base import EmbeddingProvider
from app.ai.providers.provider_factory import get_embedding_provider


# In-Memory + DB synchronized store for Knowledge Sources
SEED_KNOWLEDGE_SOURCES: List[Dict[str, Any]] = [
    {
        "id": "src-1",
        "title": "SFRC Library Information",
        "type": "manual",
        "url": None,
        "category": "library",
        "department": "Library & IRC",
        "content": (
            "SFRC Information Resource Centre (IRC) Library houses 64,795 volumes, 120 national and international "
            "print journals, and extensive digital subscriptions including J-Gate, DELNET, and INFLIBNET N-List. "
            "Library hours are Monday to Saturday: 8:00 AM to 8:00 PM (Saturday closes at 5:00 PM). "
            "Access is granted via valid SFRC student and faculty smart RFID ID cards. "
            "Facilities include digital browsing lab with 40 workstations, reprographic center, OPAC terminals, and quiet study zones."
        ),
        "status": "Indexed",
        "chunks_count": 1,
        "last_indexed_at": "2026-09-28T10:00:00Z",
        "created_at": "2026-06-01T08:00:00Z",
    },
    {
        "id": "src-2",
        "title": "SFRC Examination Rules",
        "type": "url",
        "url": "sfrcollege.edu.in/examination/rules-and-regulations",
        "category": "examination",
        "department": "Controller of Examinations",
        "content": (
            "SFRC Autonomous Examination Rules and Regulations: Minimum attendance requirement for appearing in "
            "End Semester Examinations (ESE) is 75%. Continuous Internal Assessment (CIA) accounts for 25% to 40% "
            "of the total mark weightage depending on the programme regulations. Passing minimum in ESE is 40% for UG "
            "and 50% for PG courses. Revaluation application must be submitted within 10 days of results publication "
            "through the Controller of Examinations portal."
        ),
        "status": "Indexed",
        "chunks_count": 1,
        "last_indexed_at": "2026-09-28T10:15:00Z",
        "created_at": "2026-06-01T08:00:00Z",
    },
    {
        "id": "src-3",
        "title": "SFRC Hostel Rules",
        "type": "manual",
        "url": None,
        "category": "hostel",
        "department": "Hostel Administration",
        "content": (
            "SFRC Residential Hostel Rules & Code of Living: Resident students must adhere to evening roll call at 6:30 PM. "
            "Outing and leave permission must be pre-approved by the Chief Warden / Deputy Warden with parent consent "
            "registered via portal. Quiet study hours are strictly observed between 8:30 PM and 10:30 PM. "
            "Visitors are permitted in the hostel visitor lounge on designated visiting days with identity verification."
        ),
        "status": "Indexed",
        "chunks_count": 1,
        "last_indexed_at": "2026-09-28T10:30:00Z",
        "created_at": "2026-06-01T08:00:00Z",
    },
    {
        "id": "src-4",
        "title": "SFRC Academic Departments Directory",
        "type": "manual",
        "url": None,
        "category": "departments",
        "department": "Academic Affairs",
        "content": (
            "SFRC Academic Departments: UG Aided programmes include Department of Tamil (HOD: Dr. B. Ponni), "
            "Department of English (HOD: Dr. K. Muthamil Selvi), Department of Mathematics, Department of Physics (HOD: Dr. S. Jayanthi), "
            "Department of Chemistry (HOD: Dr. M. Murugalakshmi), Department of Botany (HOD: Dr.(Mrs). B. Deepa). "
            "UG Self-Finance programmes include Department of Computer Science (HOD: Mrs. P. Prescilla), "
            "Department of Data Science (HOD: Mrs. D. Gangadevi), Department of Computer Applications, Department of Commerce, "
            "Department of Commerce CA. PG Programmes: M.Sc Computer Science, M.Sc Data Science, M.Com. "
            "Ph.D Research Programmes: Tamil, Commerce, Computer Science."
        ),
        "status": "Indexed",
        "chunks_count": 1,
        "last_indexed_at": "2026-10-01T08:00:00Z",
        "created_at": "2026-10-01T08:00:00Z",
    },
    {
        "id": "src-5",
        "title": "SFRC Faculty Registry",
        "type": "manual",
        "url": None,
        "category": "faculty",
        "department": "Human Resources & Dean of Faculty",
        "content": (
            "SFRC Faculty Details: Dr. B. Ponni (Associate Professor & Head of Tamil, M.A., M.Phil., Ph.D., ponni-tam@sfrcollege.edu.in), "
            "Dr.(Mrs.) B. Deepa (Associate Professor & Head of Botany, M.Sc., M.Phil., Ph.D., deepa-bot@sfrcollege.edu.in), "
            "Dr. V. Meenakshi (Assistant Professor & Head of Commerce, M.Com., M.Phil., Ph.D., meenakshi-com@sfrcollege.edu.in), "
            "Dr. K. Muthamil Selvi (Associate Professor & Head of English, MA., M.Phil., B.Ed., Ph.D., muthamil-eng@sfrcollege.edu.in), "
            "Dr. S. Jayanthi (Associate Professor & Head of Physics, M.Sc., Ph.D., jayanthi-phy@sfrcollege.edu.in), "
            "Dr. M. Murugalakshmi (Associate Professor & Head of Chemistry, M.Sc., M.Phil., Ph.D., murugalakshmi-chem@sfrcollege.edu.in), "
            "Mrs. P. Prescilla (Assistant Professor & Head of Computer Science, MCA, M.Phil, prescilla-cs@sfrcollege.edu.in), "
            "Mrs. D. Gangadevi (Assistant Professor & Head of Data Science, MCA, M.Phil, SET, NET, gangadevi-ds@sfrcollege.edu.in)."
        ),
        "status": "Indexed",
        "chunks_count": 1,
        "last_indexed_at": "2026-10-01T08:00:00Z",
        "created_at": "2026-10-01T08:00:00Z",
    },
    {
        "id": "src-6",
        "title": "SFRC Fee Schedule & Tuition Fees",
        "type": "manual",
        "url": None,
        "category": "fees",
        "department": "Finance & Accounts",
        "content": (
            "SFRC Department Tuition & Special Fees: Department of Data Science: Tuition Fee ₹19,000, Other Fee ₹970. "
            "Department of Computer Science: Tuition Fee ₹18,500, Other Fee ₹950. Department of English: Tuition Fee ₹2,500, Other Fee ₹650. "
            "Department of Tamil: Tuition Fee ₹2,200, Other Fee ₹650. Department of Physics: Tuition Fee ₹3,200, Other Fee ₹850. "
            "Department of Chemistry: Tuition Fee ₹3,200, Other Fee ₹850. Department of Botany: Tuition Fee ₹3,000, Other Fee ₹800. "
            "Department of Mathematics: Tuition Fee ₹2,800, Other Fee ₹700. Department of Commerce: Tuition Fee ₹14,000, Other Fee ₹850."
        ),
        "status": "Indexed",
        "chunks_count": 1,
        "last_indexed_at": "2026-10-01T08:00:00Z",
        "created_at": "2026-10-01T08:00:00Z",
    },
    {
        "id": "src-7",
        "title": "SFRC Transport & Bus Routes",
        "type": "manual",
        "url": None,
        "category": "transport",
        "department": "Transport Office",
        "content": (
            "SFRC Campus Transport Services: Route 1 (Bus SFRC-01, Driver: Mr. Murugan, +91 98421 11223): Thiruthangal (07:45 AM) -> Sivakasi New Bus Stand (08:00 AM) -> SFRC Campus (08:20 AM). "
            "Route 2 (Bus SFRC-02, Driver: Mr. Ramasamy, +91 98421 44556): Sattur (07:30 AM) -> Thayilpatti (07:50 AM) -> SFRC Campus (08:25 AM). "
            "Route 3 (Bus SFRC-03, Driver: Mr. Selvam, +91 98421 77889): Srivilliputhur (07:20 AM) -> Rajapalayam (07:45 AM) -> SFRC Campus (08:25 AM)."
        ),
        "status": "Indexed",
        "chunks_count": 1,
        "last_indexed_at": "2026-10-01T08:00:00Z",
        "created_at": "2026-10-01T08:00:00Z",
    },
    {
        "id": "src-8",
        "title": "SFRC Research & Ph.D Guides",
        "type": "manual",
        "url": None,
        "category": "research",
        "department": "Research Advisory Committee",
        "content": (
            "SFRC Recognized Ph.D Guides: Dr. B. Ponni (Tamil - Modern & Sangam Literature, ponni-tam@sfrcollege.edu.in), "
            "Dr. V. Meenakshi (Commerce - Banking & Financial Services, meenakshi-com@sfrcollege.edu.in), "
            "Dr. K. Muthamil Selvi (English - Indian Writing in English, muthamil-eng@sfrcollege.edu.in), "
            "Dr. S. Jayanthi (Physics - Crystal Growth & Thin Films, jayanthi-phy@sfrcollege.edu.in)."
        ),
        "status": "Indexed",
        "chunks_count": 1,
        "last_indexed_at": "2026-10-01T08:00:00Z",
        "created_at": "2026-10-01T08:00:00Z",
    },
    {
        "id": "src-9",
        "title": "SFRC Admissions & Official Contact Information",
        "type": "manual",
        "url": None,
        "category": "contact",
        "department": "Admissions & Administration",
        "content": (
            "The Standard Fireworks Rajaratnam College for Women (Autonomous), Thiruthangal Road, Sivakasi - 626123, Tamil Nadu. "
            "Phone: +91 4562 220389, Email: sfrc@sfrcollege.edu.in, Principal Email: principal@sfrcollege.edu.in. "
            "Admissions open for UG, PG, and Ph.D programmes."
        ),
        "status": "Indexed",
        "chunks_count": 1,
        "last_indexed_at": "2026-10-01T08:00:00Z",
        "created_at": "2026-10-01T08:00:00Z",
    },

]

# Knowledge Chunks Registry
KNOWLEDGE_CHUNKS: List[Dict[str, Any]] = []

# Ingestion Job History
RAG_JOBS: List[Dict[str, Any]] = [
    {
        "id": "job-001",
        "source_id": "src-1",
        "source_title": "SFRC Library Information",
        "status": "Completed",
        "chunks": 1,
        "started_at": "2026-09-28T10:00:00Z",
        "completed_at": "2026-09-28T10:00:02Z",
    },
    {
        "id": "job-002",
        "source_id": "src-2",
        "source_title": "SFRC Examination Rules",
        "status": "Completed",
        "chunks": 1,
        "started_at": "2026-09-28T10:15:00Z",
        "completed_at": "2026-09-28T10:15:03Z",
    },
    {
        "id": "job-003",
        "source_id": "src-3",
        "source_title": "SFRC Hostel Rules",
        "status": "Completed",
        "chunks": 1,
        "started_at": "2026-09-28T10:30:00Z",
        "completed_at": "2026-09-28T10:30:02Z",
    },
]


def chunk_text(text: str, max_tokens: int = 500, overlap: int = 50) -> List[str]:
    """Split text into overlapping chunks for embedding."""
    if not text or not text.strip():
        return []
    words = text.split()
    if len(words) <= max_tokens:
        return [text.strip()]

    chunks = []
    step = max(1, max_tokens - overlap)
    for i in range(0, len(words), step):
        chunk = " ".join(words[i : i + max_tokens])
        if chunk.strip():
            chunks.append(chunk.strip())
    return chunks


async def initialize_seed_chunks():
    """Ensure seed knowledge chunks are populated on startup."""
    global KNOWLEDGE_CHUNKS
    if not KNOWLEDGE_CHUNKS:
        for src in SEED_KNOWLEDGE_SOURCES:
            chunks = chunk_text(src["content"], max_tokens=500, overlap=50)
            for idx, c in enumerate(chunks):
                KNOWLEDGE_CHUNKS.append({
                    "id": f"chk-{src['id']}-{idx}",
                    "source_id": src["id"],
                    "source_title": src["title"],
                    "chunk_index": idx,
                    "content": c,
                    "embedding": None,
                    "created_at": src["created_at"],
                })


# Initialize default chunks
for _src in SEED_KNOWLEDGE_SOURCES:
    _c_list = chunk_text(_src["content"], max_tokens=500, overlap=50)
    for _idx, _c in enumerate(_c_list):
        KNOWLEDGE_CHUNKS.append({
            "id": f"chk-{_src['id']}-{_idx}",
            "source_id": _src["id"],
            "source_title": _src["title"],
            "chunk_index": _idx,
            "content": _c,
            "embedding": None,
            "created_at": _src["created_at"],
        })


async def ingest_source(
    source_id: str,
    db: Optional[AsyncSession] = None,
    embedder: Optional[EmbeddingProvider] = None,
) -> Dict[str, Any]:
    """
    Ingest or re-index a knowledge source:
    1. Look up source content
    2. Chunk text
    3. Generate embeddings if embedder is provided
    4. Store chunks in memory and database
    5. Record job history
    """
    source = next((s for s in SEED_KNOWLEDGE_SOURCES if s["id"] == source_id), None)
    if not source:
        raise ValueError(f"Knowledge source '{source_id}' not found.")

    started_at = datetime.now(timezone.utc).isoformat()
    job_id = f"job-{uuid.uuid4().hex[:8]}"
    job_entry = {
        "id": job_id,
        "source_id": source_id,
        "source_title": source["title"],
        "status": "Processing",
        "chunks": 0,
        "started_at": started_at,
        "completed_at": None,
    }
    RAG_JOBS.insert(0, job_entry)

    # 1. Chunk content
    chunks = chunk_text(source["content"], max_tokens=500, overlap=50)

    # 2. Clear old chunks for this source
    global KNOWLEDGE_CHUNKS
    KNOWLEDGE_CHUNKS = [c for c in KNOWLEDGE_CHUNKS if c["source_id"] != source_id]

    # 3. Embed and store
    for i, chunk in enumerate(chunks):
        embedding: Optional[List[float]] = None
        if embedder is not None:
            try:
                embedding = await embedder.embed(chunk)
            except Exception as e:
                print(f"[RAG Ingestion] Embedding warning for chunk {i}: {e}")

        chunk_record = {
            "id": f"chk-{source_id}-{i}-{uuid.uuid4().hex[:4]}",
            "source_id": source_id,
            "source_title": source["title"],
            "chunk_index": i,
            "content": chunk,
            "embedding": embedding,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        KNOWLEDGE_CHUNKS.append(chunk_record)

        # Also insert into database if session is available
        if db is not None:
            try:
                query = text("""
                    INSERT INTO public.knowledge_chunks (source_id, chunk_index, content, embedding)
                    VALUES (:source_id::uuid, :chunk_index, :content, :embedding::vector)
                    ON CONFLICT DO NOTHING
                """)
                await db.execute(query, {
                    "source_id": source_id if len(source_id) == 36 else None,
                    "chunk_index": i,
                    "content": chunk,
                    "embedding": str(embedding) if embedding else None,
                })
            except Exception:
                pass

    # 4. Update source metadata
    now_iso = datetime.now(timezone.utc).isoformat()
    source["last_indexed_at"] = now_iso
    source["status"] = "Indexed"
    source["chunks_count"] = len(chunks)

    # 5. Complete job
    job_entry["status"] = "Completed"
    job_entry["chunks"] = len(chunks)
    job_entry["completed_at"] = now_iso

    return {
        "job_id": job_id,
        "source_id": source_id,
        "chunks_indexed": len(chunks),
        "status": "Completed",
    }
