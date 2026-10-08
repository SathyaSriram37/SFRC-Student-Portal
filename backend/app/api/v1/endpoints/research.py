"""SFRC Research & Innovation Hub API — Funded research projects, faculty publications, grants, and department analytics backed by PostgreSQL/Supabase database."""
from __future__ import annotations

import json
import re
import uuid
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.audit import log_audit_event

DOI_REGEX = re.compile(
    r"^(?:10\.\d{4,9}/[-._;()/:A-Za-z0-9]+|https?://(?:dx\.)?doi\.org/10\.\d{4,9}/[-._;()/:A-Za-z0-9]+|https?://[^\s]+)$",
    re.IGNORECASE,
)

def validate_doi_or_url(val: Optional[str]) -> None:
    if val and val.strip():
        if not DOI_REGEX.match(val.strip()):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid DOI or URL format. Must follow '10.XXXX/...' format or be a valid HTTP(S) URL.",
            )

router = APIRouter()


# ── Pydantic Schemas ──────────────────────────────────────────────────────────

class ResearchProjectCreate(BaseModel):
    title: str = Field(..., min_length=3)
    principal_investigator: str
    co_investigator: Optional[str] = None
    department_code: str
    funding_agency: str  # e.g. UGC, DST-SERB, CSIR, ICMR, TNSCST
    project_type: str = "Major"  # Major, Minor, Seed Grant, Industry Sponsored
    sanctioned_amount: float
    start_date: str
    end_date: str
    status: str = "Ongoing"  # Ongoing, Completed, Sanctioned
    description: Optional[str] = None
    grant_sanction_order: Optional[str] = None


class ResearchProjectUpdate(BaseModel):
    title: Optional[str] = None
    principal_investigator: Optional[str] = None
    co_investigator: Optional[str] = None
    department_code: Optional[str] = None
    funding_agency: Optional[str] = None
    project_type: Optional[str] = None
    sanctioned_amount: Optional[float] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None
    grant_sanction_order: Optional[str] = None


class ResearchProject(ResearchProjectCreate):
    id: str
    faculty_id: str
    created_at: str
    updated_at: str


class PublicationCreate(BaseModel):
    title: str = Field(..., min_length=3)
    authors: List[str]
    department_code: str
    journal_name: str
    indexing: str = "Scopus"  # Scopus, Web of Science, UGC-CARE, IEEE
    impact_factor: Optional[float] = None
    issn_isbn: Optional[str] = None
    volume_issue_pages: Optional[str] = None
    publication_year: int = 2026
    doi_or_url: Optional[str] = None
    paper_type: str = "Journal"  # Journal, Conference, Book Chapter, Patent


class PublicationUpdate(BaseModel):
    title: Optional[str] = None
    authors: Optional[List[str]] = None
    department_code: Optional[str] = None
    journal_name: Optional[str] = None
    indexing: Optional[str] = None
    impact_factor: Optional[float] = None
    issn_isbn: Optional[str] = None
    volume_issue_pages: Optional[str] = None
    publication_year: Optional[int] = None
    doi_or_url: Optional[str] = None
    paper_type: Optional[str] = None


class Publication(PublicationCreate):
    id: str
    faculty_id: str
    faculty_name: str
    created_at: str
    updated_at: Optional[str] = None


def row_to_project(r: dict[str, Any]) -> ResearchProject:
    return ResearchProject(
        id=str(r["id"]),
        faculty_id=str(r.get("faculty_id") or "fac-cs-01"),
        title=r["title"],
        principal_investigator=r["principal_investigator"],
        co_investigator=r.get("co_investigator"),
        department_code=r["department_code"],
        funding_agency=r["funding_agency"],
        project_type=r.get("project_type") or "Major",
        sanctioned_amount=float(r["sanctioned_amount"]),
        start_date=str(r["start_date"]),
        end_date=str(r["end_date"]),
        status=r.get("status") or "Ongoing",
        description=r.get("description"),
        grant_sanction_order=r.get("grant_sanction_order"),
        created_at=str(r.get("created_at") or datetime.now(timezone.utc).isoformat()),
        updated_at=str(r.get("updated_at") or datetime.now(timezone.utc).isoformat()),
    )


def row_to_pub(r: dict[str, Any]) -> Publication:
    authors_raw = r.get("authors")
    if isinstance(authors_raw, str):
        try:
            authors = json.loads(authors_raw)
        except Exception:
            authors = [a.strip() for a in authors_raw.split(",") if a.strip()]
    elif isinstance(authors_raw, list):
        authors = authors_raw
    else:
        authors = []

    return Publication(
        id=str(r["id"]),
        faculty_id=str(r.get("faculty_id") or "fac-cs-01"),
        faculty_name=r.get("faculty_name") or "Dr. SFRC Faculty",
        title=r["title"],
        authors=authors,
        department_code=r["department_code"],
        journal_name=r["journal_name"],
        indexing=r.get("indexing") or "Scopus",
        impact_factor=float(r["impact_factor"]) if r.get("impact_factor") is not None else None,
        issn_isbn=r.get("issn_isbn"),
        volume_issue_pages=r.get("volume_issue_pages"),
        publication_year=int(r["publication_year"]),
        doi_or_url=r.get("doi_or_url"),
        paper_type=r.get("paper_type") or "Journal",
        created_at=str(r.get("created_at") or datetime.now(timezone.utc).isoformat()),
        updated_at=str(r.get("updated_at") or datetime.now(timezone.utc).isoformat()),
    )


# ── Projects Endpoints ────────────────────────────────────────────────────────

@router.get("/projects", response_model=List[ResearchProject])
async def list_research_projects(
    dept: Optional[str] = None,
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """List all institutional research projects and funded grants directly from database."""
    conditions = []
    params: dict[str, Any] = {}

    if dept and dept.lower() != "all":
        conditions.append("LOWER(department_code) = :dept")
        params["dept"] = dept.lower()

    if status_filter and status_filter.lower() != "all":
        conditions.append("LOWER(status) = :status_filter")
        params["status_filter"] = status_filter.lower()

    if search:
        conditions.append("(LOWER(title) LIKE :search OR LOWER(principal_investigator) LIKE :search OR LOWER(funding_agency) LIKE :search)")
        params["search"] = f"%{search.lower()}%"

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    query_str = f"SELECT * FROM research_projects {where_clause} ORDER BY created_at DESC"
    rows = (await db.execute(text(query_str), params)).mappings().all()

    return [row_to_project(dict(r)) for r in rows]


@router.post("/projects", response_model=ResearchProject, status_code=status.HTTP_201_CREATED)
async def create_research_project(
    body: ResearchProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Submit a new funded research grant or institutional project with database persistence."""
    role = current_user.get("role", "student")
    if role not in ["faculty", "admin"]:
        raise HTTPException(status_code=403, detail="Only faculty and administrators can register research projects.")

    user_id = str(current_user.get("sub") or current_user.get("id") or "fac-custom")
    new_id = f"proj-{uuid.uuid4().hex[:8]}"
    now_str = datetime.now(timezone.utc).isoformat()

    ins_q = text("""
        INSERT INTO research_projects (
            id, faculty_id, title, principal_investigator, co_investigator,
            department_code, funding_agency, project_type, sanctioned_amount,
            start_date, end_date, status, description, grant_sanction_order,
            created_at, updated_at
        ) VALUES (
            :id, :faculty_id, :title, :principal_investigator, :co_investigator,
            :department_code, :funding_agency, :project_type, :sanctioned_amount,
            :start_date, :end_date, :status, :description, :grant_sanction_order,
            :created_at, :updated_at
        )
    """)
    await db.execute(ins_q, {
        "id": new_id,
        "faculty_id": user_id,
        "title": body.title,
        "principal_investigator": body.principal_investigator,
        "co_investigator": body.co_investigator,
        "department_code": body.department_code,
        "funding_agency": body.funding_agency,
        "project_type": body.project_type,
        "sanctioned_amount": body.sanctioned_amount,
        "start_date": body.start_date,
        "end_date": body.end_date,
        "status": body.status,
        "description": body.description,
        "grant_sanction_order": body.grant_sanction_order,
        "created_at": now_str,
        "updated_at": now_str,
    })

    await log_audit_event(
        db=db,
        user_id=user_id,
        action="RESEARCH_PROJECT_CREATED",
        resource_type="research_projects",
        resource_id=new_id,
        details={"title": body.title, "funding_agency": body.funding_agency, "amount": body.sanctioned_amount},
    )

    fetch_q = text("SELECT * FROM research_projects WHERE id = :id")
    created = (await db.execute(fetch_q, {"id": new_id})).mappings().first()
    return row_to_project(dict(created))


@router.put("/projects/{id}", response_model=ResearchProject)
async def update_research_project(
    id: str,
    body: ResearchProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Edit research project details with ownership enforcement and database persistence."""
    role = current_user.get("role", "student")
    user_id = str(current_user.get("sub") or current_user.get("id") or "")

    find_q = text("SELECT * FROM research_projects WHERE id = :id")
    row = (await db.execute(find_q, {"id": id})).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Research project not found")

    if role != "admin" and str(row["faculty_id"]) != user_id:
        raise HTTPException(status_code=403, detail="You do not have permission to update this research project.")

    now_str = datetime.now(timezone.utc).isoformat()
    fields = []
    params: dict[str, Any] = {"id": id, "updated_at": now_str}

    for k, v in body.model_dump(exclude_unset=True).items():
        if v is not None:
            fields.append(f"{k} = :{k}")
            params[k] = v

    if fields:
        fields.append("updated_at = :updated_at")
        update_sql = f"UPDATE research_projects SET {', '.join(fields)} WHERE id = :id"
        await db.execute(text(update_sql), params)

    updated = (await db.execute(find_q, {"id": id})).mappings().first()
    return row_to_project(dict(updated))


@router.delete("/projects/{id}")
async def delete_research_project(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Delete research project record with ownership enforcement and database persistence."""
    role = current_user.get("role", "student")
    user_id = str(current_user.get("sub") or current_user.get("id") or "")

    find_q = text("SELECT * FROM research_projects WHERE id = :id")
    row = (await db.execute(find_q, {"id": id})).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Research project not found")

    if role != "admin" and str(row["faculty_id"]) != user_id:
        raise HTTPException(status_code=403, detail="You do not have permission to delete this research project.")

    await db.execute(text("DELETE FROM research_projects WHERE id = :id"), {"id": id})

    await log_audit_event(
        db=db,
        user_id=user_id,
        action="RESEARCH_PROJECT_DELETED",
        resource_type="research_projects",
        resource_id=id,
        details={"title": row["title"]},
    )

    return {"status": "success", "message": "Research project deleted successfully."}


# ── Publications Endpoints ────────────────────────────────────────────────────

@router.get("/publications", response_model=List[Publication])
async def list_publications(
    dept: Optional[str] = None,
    indexing: Optional[str] = None,
    year: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
):
    """List indexed faculty and scholar publications directly from database."""
    conditions = []
    params: dict[str, Any] = {}

    if dept and dept.lower() != "all":
        conditions.append("LOWER(department_code) = :dept")
        params["dept"] = dept.lower()

    if indexing and indexing.lower() != "all":
        conditions.append("LOWER(indexing) = :indexing")
        params["indexing"] = indexing.lower()

    if year:
        conditions.append("publication_year = :year")
        params["year"] = year

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    query_str = f"SELECT * FROM faculty_publications {where_clause} ORDER BY publication_year DESC, created_at DESC"
    rows = (await db.execute(text(query_str), params)).mappings().all()

    return [row_to_pub(dict(r)) for r in rows]


@router.post("/publications", response_model=Publication, status_code=status.HTTP_201_CREATED)
async def create_publication(
    body: PublicationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Add a new research publication record with database persistence."""
    role = current_user.get("role", "student")
    if role not in ["faculty", "admin"]:
        raise HTTPException(status_code=403, detail="Faculty privilege required to submit publications.")

    validate_doi_or_url(body.doi_or_url)

    user_id = str(current_user.get("sub") or current_user.get("id") or "fac-custom")
    faculty_name = current_user.get("name") or current_user.get("user_metadata", {}).get("full_name") or "Dr. SFRC Faculty"
    new_id = f"pub-{uuid.uuid4().hex[:8]}"
    now_str = datetime.now(timezone.utc).isoformat()
    authors_json = json.dumps(body.authors)

    ins_q = text("""
        INSERT INTO faculty_publications (
            id, faculty_id, faculty_name, title, authors, department_code,
            journal_name, indexing, impact_factor, issn_isbn, volume_issue_pages,
            publication_year, doi_or_url, paper_type, created_at, updated_at
        ) VALUES (
            :id, :faculty_id, :faculty_name, :title, :authors, :department_code,
            :journal_name, :indexing, :impact_factor, :issn_isbn, :volume_issue_pages,
            :publication_year, :doi_or_url, :paper_type, :created_at, :updated_at
        )
    """)
    await db.execute(ins_q, {
        "id": new_id,
        "faculty_id": user_id,
        "faculty_name": faculty_name,
        "title": body.title,
        "authors": authors_json,
        "department_code": body.department_code,
        "journal_name": body.journal_name,
        "indexing": body.indexing,
        "impact_factor": body.impact_factor,
        "issn_isbn": body.issn_isbn,
        "volume_issue_pages": body.volume_issue_pages,
        "publication_year": body.publication_year,
        "doi_or_url": body.doi_or_url,
        "paper_type": body.paper_type,
        "created_at": now_str,
        "updated_at": now_str,
    })

    await log_audit_event(
        db=db,
        user_id=user_id,
        action="PUBLICATION_CREATED",
        resource_type="faculty_publications",
        resource_id=new_id,
        details={"title": body.title, "journal": body.journal_name, "indexing": body.indexing},
    )

    fetch_q = text("SELECT * FROM faculty_publications WHERE id = :id")
    created = (await db.execute(fetch_q, {"id": new_id})).mappings().first()
    return row_to_pub(dict(created))


@router.put("/publications/{id}", response_model=Publication)
async def update_publication(
    id: str,
    body: PublicationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Edit research publication details with ownership enforcement and database persistence."""
    role = current_user.get("role", "student")
    user_id = str(current_user.get("sub") or current_user.get("id") or "")

    if body.doi_or_url is not None:
        validate_doi_or_url(body.doi_or_url)

    find_q = text("SELECT * FROM faculty_publications WHERE id = :id")
    row = (await db.execute(find_q, {"id": id})).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Publication record not found")

    if role != "admin" and str(row["faculty_id"]) != user_id:
        raise HTTPException(status_code=403, detail="You do not have permission to update this publication.")

    now_str = datetime.now(timezone.utc).isoformat()
    fields = []
    params: dict[str, Any] = {"id": id, "updated_at": now_str}

    for k, v in body.model_dump(exclude_unset=True).items():
        if v is not None:
            if k == "authors":
                fields.append("authors = :authors")
                params["authors"] = json.dumps(v)
            else:
                fields.append(f"{k} = :{k}")
                params[k] = v

    if fields:
        fields.append("updated_at = :updated_at")
        update_sql = f"UPDATE faculty_publications SET {', '.join(fields)} WHERE id = :id"
        await db.execute(text(update_sql), params)

    updated = (await db.execute(find_q, {"id": id})).mappings().first()
    return row_to_pub(dict(updated))


@router.delete("/publications/{id}")
async def delete_publication(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Delete publication record with ownership enforcement and database persistence."""
    role = current_user.get("role", "student")
    user_id = str(current_user.get("sub") or current_user.get("id") or "")

    find_q = text("SELECT * FROM faculty_publications WHERE id = :id")
    row = (await db.execute(find_q, {"id": id})).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Publication record not found")

    if role != "admin" and str(row["faculty_id"]) != user_id:
        raise HTTPException(status_code=403, detail="You do not have permission to delete this publication.")

    await db.execute(text("DELETE FROM faculty_publications WHERE id = :id"), {"id": id})

    await log_audit_event(
        db=db,
        user_id=user_id,
        action="PUBLICATION_DELETED",
        resource_type="faculty_publications",
        resource_id=id,
        details={"title": row["title"]},
    )

    return {"status": "success", "message": "Publication record deleted successfully."}


# ── Summary & Analytics ───────────────────────────────────────────────────────

@router.get("/summary", response_model=Dict[str, Any])
async def get_research_summary(
    db: AsyncSession = Depends(get_db),
):
    """Department-wise research summary, total grants, and publication leaderboard directly from database."""
    proj_rows = (await db.execute(text("SELECT * FROM research_projects"))).mappings().all()
    pub_rows = (await db.execute(text("SELECT * FROM faculty_publications"))).mappings().all()

    total_grant_inr = sum(float(p["sanctioned_amount"] or 0.0) for p in proj_rows)
    ongoing_count = sum(1 for p in proj_rows if (p.get("status") or "").lower() == "ongoing")
    completed_count = sum(1 for p in proj_rows if (p.get("status") or "").lower() == "completed")

    dept_map: Dict[str, Dict[str, Any]] = {}
    for p in proj_rows:
        d = p["department_code"]
        if d not in dept_map:
            dept_map[d] = {"department": d, "projects": 0, "grant_amount": 0.0, "publications": 0}
        dept_map[d]["projects"] += 1
        dept_map[d]["grant_amount"] += float(p["sanctioned_amount"] or 0.0)

    for pub in pub_rows:
        d = pub["department_code"]
        if d in dept_map:
            dept_map[d]["publications"] += 1
        else:
            dept_map[d] = {"department": d, "projects": 0, "grant_amount": 0.0, "publications": 1}

    leaderboard_map: Dict[str, Dict[str, Any]] = {}
    for pub in pub_rows:
        name = pub["faculty_name"]
        if name not in leaderboard_map:
            leaderboard_map[name] = {"faculty_name": name, "department": pub["department_code"], "papers": 0, "top_indexing": pub["indexing"]}
        leaderboard_map[name]["papers"] += 1

    return {
        "total_projects": len(proj_rows),
        "ongoing_projects": ongoing_count,
        "completed_projects": completed_count,
        "total_grants_sanctioned_inr": total_grant_inr,
        "total_publications": len(pub_rows),
        "department_summary": list(dept_map.values()),
        "faculty_leaderboard": list(leaderboard_map.values()),
    }
