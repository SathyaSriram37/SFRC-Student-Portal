"""
SFRC Research & Innovation Hub API
Phase 12: Funded research projects, faculty publications, grants, and department analytics.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.core.security import get_current_user

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

class Publication(PublicationCreate):
    id: str
    faculty_id: str
    faculty_name: str
    created_at: str

# ── Seed Research Data ─────────────────────────────────────────────────────────

SEED_RESEARCH_PROJECTS: List[Dict[str, Any]] = [
    {
        "id": "proj-cs-01",
        "faculty_id": "fac-cs-01",
        "title": "AI-Driven Precision Agriculture & Pest Detection in Cotton Fields",
        "principal_investigator": "Dr. R. Meenakshi",
        "co_investigator": "Dr. S. Kavitha",
        "department_code": "CS",
        "funding_agency": "DST-SERB (Science & Engineering Research Board)",
        "project_type": "Major",
        "sanctioned_amount": 2850000.0,
        "start_date": "2024-04-01",
        "end_date": "2027-03-31",
        "status": "Ongoing",
        "description": "Developing deep learning edge inference architectures for real-time mobile disease diagnostics for regional farmers.",
        "grant_sanction_order": "DST/SERB/CRG/2024/004921",
        "created_at": "2024-04-10T10:00:00Z",
        "updated_at": "2026-09-20T12:00:00Z",
    },
    {
        "id": "proj-chem-02",
        "faculty_id": "fac-chem-01",
        "title": "Green Synthesis of Bio-Nanocomposites for Industrial Wastewater Remediation",
        "principal_investigator": "Dr. K. Arulmozhi",
        "co_investigator": None,
        "department_code": "CHEM",
        "funding_agency": "UGC (University Grants Commission)",
        "project_type": "Major",
        "sanctioned_amount": 1650000.0,
        "start_date": "2023-08-01",
        "end_date": "2026-07-31",
        "status": "Ongoing",
        "description": "Utilizing agricultural waste extracts for catalytic dye degradation and heavy metal removal from textile effluents.",
        "grant_sanction_order": "UGC/MRP/CHEM/2023/1182",
        "created_at": "2023-08-15T09:30:00Z",
        "updated_at": "2026-09-15T11:00:00Z",
    },
    {
        "id": "proj-phy-03",
        "faculty_id": "fac-phy-01",
        "title": "Fabrication of Perovskite Thin-Film Solar Cells for High Efficiency Photovoltaics",
        "principal_investigator": "Dr. P. Suganya",
        "co_investigator": "Dr. M. Deepa",
        "department_code": "PHY",
        "funding_agency": "TNSCST (Tamil Nadu State Council for Science and Technology)",
        "project_type": "Minor",
        "sanctioned_amount": 450000.0,
        "start_date": "2025-01-10",
        "end_date": "2026-12-31",
        "status": "Ongoing",
        "description": "Exploring novel doping techniques in organometallic halide crystals to enhance atmospheric thermal stability.",
        "grant_sanction_order": "TNSCST/STP/2025/084",
        "created_at": "2025-01-20T14:00:00Z",
        "updated_at": "2026-09-10T16:00:00Z",
    },
    {
        "id": "proj-math-04",
        "faculty_id": "fac-math-01",
        "title": "Stochastic Modeling & Stability Analysis in Biological Epidemic Networks",
        "principal_investigator": "Dr. V. Gomathi",
        "co_investigator": None,
        "department_code": "MATH",
        "funding_agency": "SFRC Institutional Seed Grant",
        "project_type": "Seed Grant",
        "sanctioned_amount": 150000.0,
        "start_date": "2025-06-01",
        "end_date": "2026-05-31",
        "status": "Completed",
        "description": "Formulating fractional differential dynamical models for multi-strain pathogen transmission vectors.",
        "grant_sanction_order": "SFRC/ISG/2025/012",
        "created_at": "2025-06-05T10:00:00Z",
        "updated_at": "2026-06-01T15:00:00Z",
    },
]

SEED_PUBLICATIONS: List[Dict[str, Any]] = [
    {
        "id": "pub-001",
        "faculty_id": "fac-cs-01",
        "faculty_name": "Dr. R. Meenakshi",
        "title": "Lightweight Transformer Network for Early Foliar Disease Classification in Edge Devices",
        "authors": ["R. Meenakshi", "S. Kavitha", "K. Raman"],
        "department_code": "CS",
        "journal_name": "IEEE Transactions on Agri-Food Electronics & Computing",
        "indexing": "Scopus",
        "impact_factor": 4.8,
        "issn_isbn": "2690-5421",
        "volume_issue_pages": "Vol. 12, Issue 3, pp. 245-258",
        "publication_year": 2026,
        "doi_or_url": "https://doi.org/10.1109/TAFEC.2026.3190241",
        "paper_type": "Journal",
        "created_at": "2026-02-15T11:00:00Z",
    },
    {
        "id": "pub-002",
        "faculty_id": "fac-chem-01",
        "faculty_name": "Dr. K. Arulmozhi",
        "title": "Ecofriendly Biosynthesis of ZnO Nanoparticles from Moringa Oleifera: Photocatalytic and Antimicrobial Efficacy",
        "authors": ["K. Arulmozhi", "T. Selvi"],
        "department_code": "CHEM",
        "journal_name": "Journal of Environmental Chemical Engineering",
        "indexing": "Web of Science",
        "impact_factor": 7.4,
        "issn_isbn": "2213-3437",
        "volume_issue_pages": "Vol. 14, pp. 109823",
        "publication_year": 2025,
        "doi_or_url": "https://doi.org/10.1016/j.jece.2025.109823",
        "paper_type": "Journal",
        "created_at": "2025-11-20T10:00:00Z",
    },
    {
        "id": "pub-003",
        "faculty_id": "fac-phy-01",
        "faculty_name": "Dr. P. Suganya",
        "title": "Influence of Halide Substitution on Bandgap Tuning in Lead-Free Double Perovskites",
        "authors": ["P. Suganya", "M. Deepa"],
        "department_code": "PHY",
        "journal_name": "Applied Surface Science Advances",
        "indexing": "Scopus",
        "impact_factor": 5.1,
        "issn_isbn": "2666-5239",
        "volume_issue_pages": "Vol. 22, pp. 100589",
        "publication_year": 2026,
        "doi_or_url": "https://doi.org/10.1016/j.apsadv.2026.100589",
        "paper_type": "Journal",
        "created_at": "2026-03-01T15:00:00Z",
    },
]

# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/projects", response_model=List[ResearchProject])
async def list_research_projects(
    dept: Optional[str] = None,
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
):
    """
    List all institutional research projects and funded grants.
    """
    results = SEED_RESEARCH_PROJECTS
    if dept and dept != "all":
        results = [p for p in results if p["department_code"] == dept]
    if status_filter and status_filter != "all":
        results = [p for p in results if p["status"].lower() == status_filter.lower()]
    if search:
        q = search.lower()
        results = [
            p for p in results
            if q in p["title"].lower()
            or q in p["principal_investigator"].lower()
            or q in p["funding_agency"].lower()
        ]

    return [ResearchProject(**p) for p in results]

@router.post("/projects", response_model=ResearchProject, status_code=status.HTTP_201_CREATED)
async def create_research_project(
    body: ResearchProjectCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Submit a new funded research grant or institutional project.
    """
    role = current_user.get("role", "student")
    if role not in ["faculty", "admin"]:
        raise HTTPException(status_code=403, detail="Only faculty and administrators can register research projects.")

    now_str = datetime.now(timezone.utc).isoformat()
    new_proj = {
        "id": f"proj-{uuid.uuid4().hex[:8]}",
        "faculty_id": current_user.get("sub") or current_user.get("id") or "fac-custom",
        **body.model_dump(),
        "created_at": now_str,
        "updated_at": now_str,
    }

    SEED_RESEARCH_PROJECTS.insert(0, new_proj)
    return ResearchProject(**new_proj)

@router.get("/publications", response_model=List[Publication])
async def list_publications(
    dept: Optional[str] = None,
    indexing: Optional[str] = None,
    year: Optional[int] = None,
):
    """
    List indexed faculty and scholar publications.
    """
    results = SEED_PUBLICATIONS
    if dept and dept != "all":
        results = [p for p in results if p["department_code"] == dept]
    if indexing and indexing != "all":
        results = [p for p in results if p["indexing"].lower() == indexing.lower()]
    if year:
        results = [p for p in results if p["publication_year"] == year]

    return [Publication(**p) for p in results]

@router.post("/publications", response_model=Publication, status_code=status.HTTP_201_CREATED)
async def create_publication(
    body: PublicationCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Add a new research publication record.
    """
    role = current_user.get("role", "student")
    if role not in ["faculty", "admin"]:
        raise HTTPException(status_code=403, detail="Faculty privilege required to submit publications.")

    now_str = datetime.now(timezone.utc).isoformat()
    faculty_name = current_user.get("name") or current_user.get("user_metadata", {}).get("full_name") or "Dr. SFRC Faculty"

    new_pub = {
        "id": f"pub-{uuid.uuid4().hex[:8]}",
        "faculty_id": current_user.get("sub") or current_user.get("id") or "fac-custom",
        "faculty_name": faculty_name,
        **body.model_dump(),
        "created_at": now_str,
    }

    SEED_PUBLICATIONS.insert(0, new_pub)
    return Publication(**new_pub)

@router.get("/summary", response_model=Dict[str, Any])
async def get_research_summary():
    """
    Department-wise research summary, total grants, and publication leaderboard.
    """
    total_grant_inr = sum(p["sanctioned_amount"] for p in SEED_RESEARCH_PROJECTS)
    ongoing_count = sum(1 for p in SEED_RESEARCH_PROJECTS if p["status"] == "Ongoing")
    completed_count = sum(1 for p in SEED_RESEARCH_PROJECTS if p["status"] == "Completed")

    # Department breakdown
    dept_map: Dict[str, Dict[str, Any]] = {}
    for p in SEED_RESEARCH_PROJECTS:
        d = p["department_code"]
        if d not in dept_map:
            dept_map[d] = {"department": d, "projects": 0, "grant_amount": 0.0, "publications": 0}
        dept_map[d]["projects"] += 1
        dept_map[d]["grant_amount"] += p["sanctioned_amount"]

    for pub in SEED_PUBLICATIONS:
        d = pub["department_code"]
        if d in dept_map:
            dept_map[d]["publications"] += 1
        else:
            dept_map[d] = {"department": d, "projects": 0, "grant_amount": 0.0, "publications": 1}

    # Leaderboard by faculty
    leaderboard_map: Dict[str, Dict[str, Any]] = {}
    for pub in SEED_PUBLICATIONS:
        name = pub["faculty_name"]
        if name not in leaderboard_map:
            leaderboard_map[name] = {"faculty_name": name, "department": pub["department_code"], "papers": 0, "top_indexing": pub["indexing"]}
        leaderboard_map[name]["papers"] += 1

    return {
        "total_projects": len(SEED_RESEARCH_PROJECTS),
        "ongoing_projects": ongoing_count,
        "completed_projects": completed_count,
        "total_grants_sanctioned_inr": total_grant_inr,
        "total_publications": len(SEED_PUBLICATIONS),
        "department_summary": list(dept_map.values()),
        "faculty_leaderboard": list(leaderboard_map.values()),
    }
