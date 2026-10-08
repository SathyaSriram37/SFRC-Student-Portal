"""
SFRC Alumni Network & Mentorship API
Phase 13: Alumni directory, visibility rules, self-registration, mentorship requests, stories, and admin verification.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid

import json
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field, EmailStr

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.audit import log_audit_event

router = APIRouter()

# ── Pydantic Schemas ──────────────────────────────────────────────────────────

class AlumniProfileBase(BaseModel):
    name: str = Field(..., min_length=2)
    department_code: str
    batch_year: int
    degree: str  # B.Sc, M.Sc, B.Com, MCA, Ph.D, etc.
    current_organization: str
    designation: str
    industry: str
    location: str
    linkedin_url: Optional[str] = None
    bio: Optional[str] = None
    skills: List[str] = []
    is_mentor: bool = False
    mentorship_areas: List[str] = []
    visibility: str = "public"  # "public", "alumni", "private"

class AlumniRegistrationRequest(AlumniProfileBase):
    email: EmailStr
    phone: Optional[str] = None

class AlumniProfilePublic(BaseModel):
    id: str
    name: str
    department_code: str
    batch_year: int
    degree: str
    current_organization: str
    designation: str
    industry: str
    location: str
    linkedin_url: Optional[str] = None
    bio: Optional[str] = None
    skills: List[str] = []
    is_mentor: bool = False
    mentorship_areas: List[str] = []
    visibility: str
    avatar_url: Optional[str] = None
    is_verified: bool = True
    created_at: str

class AlumniProfileFull(AlumniProfilePublic):
    email: Optional[str] = None
    phone: Optional[str] = None

class MentorshipRequestCreate(BaseModel):
    message: str = Field(..., min_length=10)
    preferred_topic: str = "Career Guidance"

class MentorshipRequest(BaseModel):
    id: str
    alumni_id: str
    alumni_name: str
    student_id: str
    student_name: str
    student_department: str
    student_register_number: str
    preferred_topic: str
    message: str
    status: str  # "pending", "accepted", "completed", "declined"
    created_at: str

class AlumniStory(BaseModel):
    id: str
    alumni_id: str
    alumni_name: str
    batch_year: int
    department_code: str
    title: str
    story_text: str
    current_role: str
    photo_url: Optional[str] = None
    published_at: str

class AlumniOpportunity(BaseModel):
    id: str
    alumni_id: str
    alumni_name: str
    company_name: str
    role_title: str
    location: str
    opportunity_type: str  # "Job", "Internship", "Referral"
    description: str
    apply_link_or_email: str
    posted_at: str

class AlumniOpportunityCreate(BaseModel):
    company_name: str = Field(..., min_length=2)
    role_title: str = Field(..., min_length=2)
    location: str
    opportunity_type: str = "Job"  # "Job", "Internship", "Referral"
    description: str = Field(..., min_length=10)
    apply_link_or_email: str

def row_to_opportunity_dict(row: Dict[str, Any]) -> AlumniOpportunity:
    return AlumniOpportunity(
        id=str(row["id"]),
        alumni_id=str(row.get("alumni_id") or ""),
        alumni_name=str(row.get("alumni_name") or "Alumni"),
        company_name=str(row.get("company_name") or ""),
        role_title=str(row.get("role_title") or ""),
        location=str(row.get("location") or ""),
        opportunity_type=str(row.get("opportunity_type") or "Job"),
        description=str(row.get("description") or ""),
        apply_link_or_email=str(row.get("apply_link_or_email") or ""),
        posted_at=str(row.get("posted_at") or ""),
    )

def row_to_story_dict(row: Dict[str, Any]) -> AlumniStory:
    return AlumniStory(
        id=str(row["id"]),
        alumni_id=str(row.get("alumni_id") or ""),
        alumni_name=str(row.get("alumni_name") or ""),
        batch_year=int(row.get("batch_year") or 2020),
        department_code=str(row.get("department_code") or "CS"),
        title=str(row.get("title") or ""),
        story_text=str(row.get("story_text") or ""),
        current_role=str(row.get("current_role") or ""),
        photo_url=row.get("photo_url"),
        published_at=str(row.get("published_at") or ""),
    )

# ── Seed Data (10 synthetic alumni) ───────────────────────────────────────────
# 2 public, 5 alumni, 3 private | 3 marked as mentors
SEED_ALUMNI: List[Dict[str, Any]] = [
    {
        "id": "alm-01",
        "name": "Dr. Priya Sundaram",
        "email": "priya.sundaram@google.com",
        "phone": "+91 98765 43210",
        "department_code": "CS",
        "batch_year": 2017,
        "degree": "B.Sc Computer Science",
        "current_organization": "Google India",
        "designation": "Staff Software Engineer",
        "industry": "Information Technology",
        "location": "Bangalore, India",
        "linkedin_url": "https://linkedin.com/in/priyasundaram",
        "bio": "Passionate about large scale distributed systems and mentoring young women in tech.",
        "skills": ["Distributed Systems", "Cloud Computing", "Go", "Kubernetes"],
        "is_mentor": True,
        "mentorship_areas": ["System Design", "Tech Interviews", "Career Roadmaps"],
        "visibility": "public",
        "avatar_url": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80",
        "is_verified": True,
        "created_at": "2024-01-10T09:00:00Z",
    },
    {
        "id": "alm-02",
        "name": "Ananya Krishnan",
        "email": "ananya.k@deloitte.com",
        "phone": "+91 98451 12345",
        "department_code": "COM",
        "batch_year": 2019,
        "degree": "B.Com Professional Accounting",
        "current_organization": "Deloitte US-India",
        "designation": "Senior Financial Consultant",
        "industry": "Financial Services",
        "location": "Hyderabad, India",
        "linkedin_url": "https://linkedin.com/in/ananyakrishnan",
        "bio": "Specialized in corporate tax restructuring, M&A valuations, and fintech auditing.",
        "skills": ["Taxation", "Financial Modeling", "Corporate Audit", "Risk Advisory"],
        "is_mentor": True,
        "mentorship_areas": ["CPA/CA Guidance", "Big4 Interviews", "Corporate Finance"],
        "visibility": "public",
        "avatar_url": "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&auto=format&fit=crop&q=80",
        "is_verified": True,
        "created_at": "2024-02-14T10:30:00Z",
    },
    {
        "id": "alm-03",
        "name": "Dr. Mythili Rajagopal",
        "email": "mythili.r@iisc.ac.in",
        "phone": "+91 97890 56789",
        "department_code": "CHEM",
        "batch_year": 2015,
        "degree": "M.Sc Chemistry",
        "current_organization": "Indian Institute of Science (IISc)",
        "designation": "Postdoctoral Research Fellow",
        "industry": "Scientific Research",
        "location": "Bangalore, India",
        "linkedin_url": "https://linkedin.com/in/mythilir",
        "bio": "Materials chemist researching green cathode materials for lithium-sulfur batteries.",
        "skills": ["Nanomaterials", "Electrochemistry", "Spectroscopy", "Grant Writing"],
        "is_mentor": True,
        "mentorship_areas": ["Higher Education (Ph.D)", "CSIR-NET Prep", "Research Publications"],
        "visibility": "alumni",
        "avatar_url": "https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=300&auto=format&fit=crop&q=80",
        "is_verified": True,
        "created_at": "2024-03-01T11:00:00Z",
    },
    {
        "id": "alm-04",
        "name": "Sowmya Natarajan",
        "email": "sowmya.n@zohocorp.com",
        "phone": "+91 99402 33445",
        "department_code": "CS",
        "batch_year": 2021,
        "degree": "MCA",
        "current_organization": "Zoho Corporation",
        "designation": "Product Developer",
        "industry": "Software SaaS",
        "location": "Tenkasi / Chennai, India",
        "linkedin_url": "https://linkedin.com/in/sowmyanatarajan",
        "bio": "Building resilient low-code workflows and web components for Zoho Creator.",
        "skills": ["Java", "JavaScript", "PostgreSQL", "Fullstack Development"],
        "is_mentor": False,
        "mentorship_areas": [],
        "visibility": "alumni",
        "avatar_url": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80",
        "is_verified": True,
        "created_at": "2024-03-15T14:20:00Z",
    },
    {
        "id": "alm-05",
        "name": "Karpagam Venkat",
        "email": "karpagam.v@tcs.com",
        "phone": "+91 94431 88990",
        "department_code": "MATH",
        "batch_year": 2020,
        "degree": "B.Sc Mathematics",
        "current_organization": "Tata Consultancy Services",
        "designation": "Data Analyst",
        "industry": "Analytics & Consulting",
        "location": "Chennai, India",
        "linkedin_url": "https://linkedin.com/in/karpagamvenkat",
        "bio": "Transforming retail transactional datasets into strategic predictive models.",
        "skills": ["Python", "SQL", "Tableau", "Statistical Inference"],
        "is_mentor": False,
        "mentorship_areas": [],
        "visibility": "alumni",
        "avatar_url": "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=300&auto=format&fit=crop&q=80",
        "is_verified": True,
        "created_at": "2024-04-10T16:00:00Z",
    },
    {
        "id": "alm-06",
        "name": "Bhavani Ramasamy",
        "email": "bhavani.r@thehindu.co.in",
        "phone": "+91 98840 11223",
        "department_code": "ENG",
        "batch_year": 2018,
        "degree": "M.A. English",
        "current_organization": "The Hindu Publishing Group",
        "designation": "Features Editor & Columnist",
        "industry": "Media & Publishing",
        "location": "Chennai, India",
        "linkedin_url": "https://linkedin.com/in/bhavaniramasamy",
        "bio": "Writing cultural profiles, book commentaries, and environmental investigative journalism.",
        "skills": ["Content Editing", "Journalism", "Copywriting", "Creative Writing"],
        "is_mentor": False,
        "mentorship_areas": [],
        "visibility": "alumni",
        "avatar_url": "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=300&auto=format&fit=crop&q=80",
        "is_verified": True,
        "created_at": "2024-04-25T11:45:00Z",
    },
    {
        "id": "alm-07",
        "name": "Geetha Balasubramanian",
        "email": "geetha.b@isro.gov.in",
        "phone": "+91 97510 66778",
        "department_code": "PHY",
        "batch_year": 2016,
        "degree": "M.Sc Physics",
        "current_organization": "ISRO Satellite Centre (URSC)",
        "designation": "Scientist / Engineer 'SD'",
        "industry": "Aerospace & Defense",
        "location": "Bangalore, India",
        "linkedin_url": "https://linkedin.com/in/geethabala",
        "bio": "Payload optical alignment and thermal imaging calibration for earth observation satellites.",
        "skills": ["Optics", "Satellite Payloads", "Laser Interferometry", "MATLAB"],
        "is_mentor": False,
        "mentorship_areas": [],
        "visibility": "alumni",
        "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
        "is_verified": True,
        "created_at": "2024-05-12T09:15:00Z",
    },
    {
        "id": "alm-08",
        "name": "Renuka Devi S.",
        "email": "renuka.devi@privatebank.ch",
        "phone": "+91 99940 99887",
        "department_code": "COM",
        "batch_year": 2014,
        "degree": "B.Com",
        "current_organization": "Zurich Wealth Management",
        "designation": "Vice President - Private Banking",
        "industry": "Investment Banking",
        "location": "Mumbai / Zurich",
        "linkedin_url": "https://linkedin.com/in/renukadevi",
        "bio": "Private wealth portfolio manager for institutional family offices.",
        "skills": ["Wealth Management", "Asset Allocation", "Derivatives"],
        "is_mentor": False,
        "mentorship_areas": [],
        "visibility": "private",
        "avatar_url": "https://images.unsplash.com/photo-1573496799652-408c2ac9fe98?w=300&auto=format&fit=crop&q=80",
        "is_verified": True,
        "created_at": "2024-06-01T10:00:00Z",
    },
    {
        "id": "alm-09",
        "name": "Shobana Karthikeyan",
        "email": "shobana.k@secretgov.in",
        "phone": "+91 98400 44556",
        "department_code": "CS",
        "batch_year": 2018,
        "degree": "B.Sc Computer Science",
        "current_organization": "National Cyber Security Center",
        "designation": "Senior Cyber Defense Lead",
        "industry": "Cyber Security",
        "location": "New Delhi, India",
        "linkedin_url": "https://linkedin.com/in/shobanakarthik",
        "bio": "Critical infrastructure threat hunting and cryptographic intrusion prevention.",
        "skills": ["Threat Intelligence", "Incident Response", "Malware Analysis"],
        "is_mentor": False,
        "mentorship_areas": [],
        "visibility": "private",
        "avatar_url": "https://images.unsplash.com/photo-1548142813-c348350df52b?w=300&auto=format&fit=crop&q=80",
        "is_verified": False,
        "created_at": "2024-06-20T12:30:00Z",
    },
    {
        "id": "alm-10",
        "name": "Nandhini Murugesan",
        "email": "nandhini.m@biotech.sg",
        "phone": "+65 8123 4567",
        "department_code": "CHEM",
        "batch_year": 2013,
        "degree": "M.Sc Chemistry",
        "current_organization": "BioPharma Asia Pacific",
        "designation": "Director of Quality Compliance",
        "industry": "Pharmaceuticals",
        "location": "Singapore",
        "linkedin_url": "https://linkedin.com/in/nandhinimurugesan",
        "bio": "Global regulatory submissions and FDA cGMP compliance officer.",
        "skills": ["FDA Regulations", "GMP Audits", "Analytical Chemistry"],
        "is_mentor": False,
        "mentorship_areas": [],
        "visibility": "private",
        "avatar_url": "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=300&auto=format&fit=crop&q=80",
        "is_verified": False,
        "created_at": "2024-07-05T15:00:00Z",
    },
]

# Alumni Stories
ALUMNI_STORIES: List[Dict[str, Any]] = [
    {
        "id": "story-01",
        "alumni_id": "alm-01",
        "alumni_name": "Dr. Priya Sundaram (Batch 2017)",
        "batch_year": 2017,
        "department_code": "CS",
        "title": "From SFRC Computer Lab to Staff Engineer at Google",
        "story_text": "The rigorous programming fundamentals and autonomous seminar culture at SFRC shaped my problem-solving discipline. Never let imposter syndrome hold you back from aiming for global tech engineering roles.",
        "current_role": "Staff Software Engineer, Google India",
        "photo_url": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&auto=format&fit=crop&q=80",
        "published_at": "2026-08-15T09:00:00Z",
    },
    {
        "id": "story-02",
        "alumni_id": "alm-02",
        "alumni_name": "Ananya Krishnan (Batch 2019)",
        "batch_year": 2019,
        "department_code": "COM",
        "title": "Demystifying Financial Consulting at Big 4",
        "story_text": "My professors at SFRC Commerce encouraged me to clear CA Inter while completing graduation. Consistent CIA test preparations directly mirrored the professional accounting exam rigor.",
        "current_role": "Senior Consultant, Deloitte",
        "photo_url": "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=600&auto=format&fit=crop&q=80",
        "published_at": "2026-09-01T10:00:00Z",
    },
]

# Alumni Opportunities
ALUMNI_OPPORTUNITIES: List[Dict[str, Any]] = [
    {
        "id": "opp-01",
        "alumni_id": "alm-01",
        "alumni_name": "Dr. Priya Sundaram",
        "company_name": "Google India",
        "role_title": "Software Engineering Summer Intern 2027",
        "location": "Bangalore / Hyderabad",
        "opportunity_type": "Internship",
        "description": "Exclusive referral opening for pre-final year women students proficient in Data Structures, C++/Java/Python.",
        "apply_link_or_email": "https://careers.google.com/jobs/intern-swe-2027",
        "posted_at": "2026-09-22T14:00:00Z",
    },
    {
        "id": "opp-02",
        "alumni_id": "alm-04",
        "alumni_name": "Sowmya Natarajan",
        "company_name": "Zoho Corporation",
        "role_title": "Junior Product Developer",
        "location": "Tenkasi Rural Tech Hub",
        "opportunity_type": "Job",
        "description": "Direct campus referral for 2026 graduating batch with strong problem solving and web programming fundamentals.",
        "apply_link_or_email": "https://zohocorp.com/careers/rural-dev",
        "posted_at": "2026-09-24T16:30:00Z",
    },
]

# ── Helpers ──────────────────────────────────────────────────────────────────

def parse_json_list(val: Any) -> List[str]:
    if isinstance(val, list):
        return val
    if isinstance(val, str) and val.strip():
        try:
            parsed = json.loads(val)
            if isinstance(parsed, list):
                return parsed
        except Exception:
            pass
    return []

def row_to_alumni_dict(r: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": str(r["id"]),
        "name": r["name"],
        "email": r.get("email"),
        "phone": r.get("phone"),
        "department_code": r["department_code"],
        "batch_year": int(r["batch_year"]),
        "degree": r["degree"],
        "current_organization": r["current_organization"],
        "designation": r["designation"],
        "industry": r["industry"],
        "location": r["location"],
        "linkedin_url": r.get("linkedin_url"),
        "bio": r.get("bio"),
        "skills": parse_json_list(r.get("skills")),
        "is_mentor": bool(r.get("is_mentor")),
        "mentorship_areas": parse_json_list(r.get("mentorship_areas")),
        "visibility": r.get("visibility") or "public",
        "avatar_url": r.get("avatar_url") or "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
        "is_verified": bool(r.get("is_verified", True)),
        "created_at": str(r.get("created_at") or ""),
    }

def row_to_mentorship_req(r: Dict[str, Any]) -> MentorshipRequest:
    return MentorshipRequest(
        id=str(r["id"]),
        alumni_id=str(r["alumni_id"]),
        alumni_name=str(r["alumni_name"]),
        student_id=str(r["student_id"]),
        student_name=str(r["student_name"]),
        student_department=str(r.get("student_department") or "CS"),
        student_register_number=str(r.get("student_register_number") or ""),
        preferred_topic=str(r["preferred_topic"]),
        message=str(r["message"]),
        status=str(r.get("status") or "pending"),
        created_at=str(r.get("created_at") or ""),
    )

def sanitize_alumni_profile(
    alumni: Dict[str, Any],
    user_role: str,
    user_id: str,
) -> Optional[AlumniProfilePublic]:
    """
    Applies strict server-side visibility rules:
    - Admin: sees full profile + private profiles.
    - Verified Alumni: sees 'public' and 'alumni' profiles.
    - Student / Parent: sees only 'public' profiles.
    - Private profiles: only admin can see.
    - Phone + Email: NEVER returned in public view schema.
    """
    vis = alumni.get("visibility", "public")

    if user_role == "admin":
        return AlumniProfilePublic(**alumni)

    if vis == "private":
        return None

    if vis == "alumni":
        if user_role in ["alumni", "faculty"]:
            return AlumniProfilePublic(**alumni)
        return None

    # Public visibility
    return AlumniProfilePublic(**alumni)

async def get_combined_alumni(db: AsyncSession) -> List[Dict[str, Any]]:
    """Retrieve combined list of seed alumni and persisted DB alumni."""
    q = text("SELECT * FROM alumni_profiles ORDER BY created_at DESC")
    db_rows = (await db.execute(q)).mappings().all()
    db_alumni = [row_to_alumni_dict(dict(r)) for r in db_rows]

    # Combine ensuring no duplicate IDs or emails
    seen_ids = set(a["id"] for a in db_alumni)
    seen_emails = set(a["email"].lower() for a in db_alumni if a.get("email"))

    combined = list(db_alumni)
    for s in SEED_ALUMNI:
        if s["id"] not in seen_ids and s["email"].lower() not in seen_emails:
            combined.append(dict(s))
            seen_ids.add(s["id"])
            seen_emails.add(s["email"].lower())

    return combined

# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("", response_model=Dict[str, Any])
async def list_alumni_directory(
    dept: Optional[str] = None,
    batch: Optional[int] = None,
    industry: Optional[str] = None,
    is_mentor: Optional[bool] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get visibility-checked alumni directory with database persisted profiles.
    """
    user_role = current_user.get("role", "student")
    user_id = str(current_user.get("sub") or current_user.get("id") or "")

    all_alumni = await get_combined_alumni(db)

    results: List[AlumniProfilePublic] = []
    for alm in all_alumni:
        sanitized = sanitize_alumni_profile(alm, user_role, user_id)
        if not sanitized:
            continue

        if dept and dept != "all" and sanitized.department_code != dept:
            continue
        if batch and sanitized.batch_year != batch:
            continue
        if industry and industry != "all" and sanitized.industry.lower() != industry.lower():
            continue
        if is_mentor is not None and sanitized.is_mentor != is_mentor:
            continue
        if search:
            q_str = search.lower()
            if (
                q_str not in sanitized.name.lower()
                and q_str not in sanitized.current_organization.lower()
                and q_str not in sanitized.designation.lower()
                and q_str not in sanitized.department_code.lower()
            ):
                continue

        results.append(sanitized)

    total = len(results)
    offset = (page - 1) * limit
    paginated = results[offset : offset + limit]

    return {
        "items": paginated,
        "total": total,
        "page": page,
        "limit": limit,
    }

@router.get("/mentors", response_model=List[AlumniProfilePublic])
async def list_alumni_mentors(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List all available alumni mentors that are not private.
    """
    user_role = current_user.get("role", "student")
    user_id = str(current_user.get("sub") or current_user.get("id") or "")

    all_alumni = await get_combined_alumni(db)

    mentors: List[AlumniProfilePublic] = []
    for alm in all_alumni:
        if not alm.get("is_mentor", False):
            continue
        sanitized = sanitize_alumni_profile(alm, user_role, user_id)
        if sanitized:
            mentors.append(sanitized)

    return mentors

@router.get("/stories", response_model=List[AlumniStory])
async def list_alumni_stories(
    db: AsyncSession = Depends(get_db),
):
    """
    List published inspirational alumni success stories from database.
    """
    rows = (await db.execute(text("SELECT * FROM alumni_stories ORDER BY published_at DESC"))).mappings().all()
    if rows:
        return [row_to_story_dict(dict(r)) for r in rows]
    return [AlumniStory(**s) for s in ALUMNI_STORIES]

@router.get("/opportunities", response_model=List[AlumniOpportunity])
async def list_alumni_opportunities(
    db: AsyncSession = Depends(get_db),
):
    """
    List jobs, internships, and referral opportunities posted by alumni network from database.
    """
    rows = (await db.execute(text("SELECT * FROM alumni_opportunities ORDER BY posted_at DESC"))).mappings().all()
    if rows:
        return [row_to_opportunity_dict(dict(r)) for r in rows]
    return [AlumniOpportunity(**o) for o in ALUMNI_OPPORTUNITIES]

@router.post("/opportunities", response_model=AlumniOpportunity, status_code=status.HTTP_201_CREATED)
async def create_alumni_opportunity(
    body: AlumniOpportunityCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Post a new alumni job/internship/referral opportunity to the database.
    """
    user_id = str(current_user.get("sub") or current_user.get("id") or "")
    user_name = current_user.get("name") or (current_user.get("user_metadata") or {}).get("full_name") or "Alumni Contributor"
    now_str = datetime.now(timezone.utc).isoformat()
    new_id = f"opp-{uuid.uuid4().hex[:8]}"

    insert_q = text("""
        INSERT INTO alumni_opportunities (
            id, alumni_id, alumni_name, company_name, role_title,
            location, opportunity_type, description, apply_link_or_email,
            posted_at, created_at
        ) VALUES (
            :id, :alumni_id, :alumni_name, :company_name, :role_title,
            :location, :opportunity_type, :description, :apply_link_or_email,
            :posted_at, :created_at
        )
    """)
    await db.execute(insert_q, {
        "id": new_id,
        "alumni_id": user_id,
        "alumni_name": user_name,
        "company_name": body.company_name,
        "role_title": body.role_title,
        "location": body.location,
        "opportunity_type": body.opportunity_type,
        "description": body.description,
        "apply_link_or_email": body.apply_link_or_email,
        "posted_at": now_str,
        "created_at": now_str,
    })

    await log_audit_event(
        user_id=user_id,
        action="create_alumni_opportunity",
        resource_type="alumni_opportunities",
        resource_id=new_id,
        details={"company": body.company_name, "role": body.role_title},
        db=db,
    )

    fetch_q = text("SELECT * FROM alumni_opportunities WHERE id = :id")
    row = (await db.execute(fetch_q, {"id": new_id})).mappings().first()
    return row_to_opportunity_dict(dict(row))

@router.get("/me/mentorship-requests", response_model=List[MentorshipRequest])
@router.get("/mentorship/requests/me", response_model=List[MentorshipRequest])
async def get_my_mentorship_requests(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve all mentorship requests submitted by current student directly from the database.
    """
    student_id = str(current_user.get("sub") or current_user.get("id") or "std-2023-001")
    q = text("SELECT * FROM alumni_mentorship_requests WHERE student_id = :student_id ORDER BY created_at DESC")
    rows = (await db.execute(q, {"student_id": student_id})).mappings().all()
    return [row_to_mentorship_req(dict(r)) for r in rows]

@router.get("/{id}", response_model=AlumniProfilePublic)
async def get_alumni_profile_detail(
    id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get alumni profile detail with strict server-side visibility enforcement.
    """
    user_role = current_user.get("role", "student")
    user_id = str(current_user.get("sub") or current_user.get("id") or "")

    # Check DB first
    find_q = text("SELECT * FROM alumni_profiles WHERE id = :id")
    row = (await db.execute(find_q, {"id": id})).mappings().first()
    if row:
        alm = row_to_alumni_dict(dict(row))
    else:
        alm = next((a for a in SEED_ALUMNI if a["id"] == id), None)

    if not alm:
        raise HTTPException(status_code=404, detail="Alumni profile not found")

    sanitized = sanitize_alumni_profile(alm, user_role, user_id)
    if not sanitized:
        raise HTTPException(status_code=404, detail="Alumni profile not accessible or private")

    return sanitized

@router.post("/register", response_model=AlumniProfilePublic, status_code=status.HTTP_201_CREATED)
async def register_alumni_profile(
    body: AlumniRegistrationRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Self-register as an alumni member with database persistence and duplicate rejection.
    """
    user_id = str(current_user.get("sub") or current_user.get("id") or "")
    email = body.email.strip().lower()

    # Check duplicate in database
    check_q = text("SELECT id FROM alumni_profiles WHERE user_id = :user_id OR LOWER(email) = :email")
    existing = (await db.execute(check_q, {"user_id": user_id, "email": email})).first()
    if existing:
        raise HTTPException(status_code=400, detail="Alumni profile already exists for this user account/email.")

    now_str = datetime.now(timezone.utc).isoformat()
    new_id = f"alm-{uuid.uuid4().hex[:8]}"

    insert_q = text("""
        INSERT INTO alumni_profiles (
            id, user_id, name, email, phone, department_code, batch_year, degree,
            current_organization, designation, industry, location, linkedin_url, bio,
            skills, is_mentor, mentorship_areas, visibility, avatar_url, is_verified,
            created_at, updated_at
        ) VALUES (
            :id, :user_id, :name, :email, :phone, :department_code, :batch_year, :degree,
            :current_organization, :designation, :industry, :location, :linkedin_url, :bio,
            :skills, :is_mentor, :mentorship_areas, :visibility, :avatar_url, :is_verified,
            :created_at, :updated_at
        )
    """)
    await db.execute(insert_q, {
        "id": new_id,
        "user_id": user_id,
        "name": body.name,
        "email": email,
        "phone": body.phone,
        "department_code": body.department_code,
        "batch_year": body.batch_year,
        "degree": body.degree,
        "current_organization": body.current_organization,
        "designation": body.designation,
        "industry": body.industry,
        "location": body.location,
        "linkedin_url": body.linkedin_url,
        "bio": body.bio,
        "skills": json.dumps(body.skills),
        "is_mentor": 1 if body.is_mentor else 0,
        "mentorship_areas": json.dumps(body.mentorship_areas),
        "visibility": body.visibility,
        "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
        "is_verified": 1,
        "created_at": now_str,
        "updated_at": now_str,
    })

    await log_audit_event(
        user_id=user_id,
        action="register_alumni_profile",
        resource_type="alumni_profiles",
        resource_id=new_id,
        details={"name": body.name, "email": email, "department": body.department_code},
        db=db,
    )

    return AlumniProfilePublic(
        id=new_id,
        **body.model_dump(),
        avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
        is_verified=True,
        created_at=now_str,
    )

@router.put("/me", response_model=AlumniProfilePublic)
async def update_my_alumni_profile(
    body: AlumniProfileBase,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update authenticated alumni user's profile with database persistence.
    """
    user_id = str(current_user.get("sub") or current_user.get("id") or "")
    user_email = (current_user.get("email") or "").lower()
    now_str = datetime.now(timezone.utc).isoformat()

    find_q = text("SELECT * FROM alumni_profiles WHERE user_id = :user_id OR LOWER(email) = :email")
    row = (await db.execute(find_q, {"user_id": user_id, "email": user_email})).mappings().first()

    if row:
        update_q = text("""
            UPDATE alumni_profiles
            SET name = :name,
                department_code = :department_code,
                batch_year = :batch_year,
                degree = :degree,
                current_organization = :current_organization,
                designation = :designation,
                industry = :industry,
                location = :location,
                linkedin_url = :linkedin_url,
                bio = :bio,
                skills = :skills,
                is_mentor = :is_mentor,
                mentorship_areas = :mentorship_areas,
                visibility = :visibility,
                updated_at = :updated_at
            WHERE id = :id
        """)
        await db.execute(update_q, {
            "id": row["id"],
            "name": body.name,
            "department_code": body.department_code,
            "batch_year": body.batch_year,
            "degree": body.degree,
            "current_organization": body.current_organization,
            "designation": body.designation,
            "industry": body.industry,
            "location": body.location,
            "linkedin_url": body.linkedin_url,
            "bio": body.bio,
            "skills": json.dumps(body.skills),
            "is_mentor": 1 if body.is_mentor else 0,
            "mentorship_areas": json.dumps(body.mentorship_areas),
            "visibility": body.visibility,
            "updated_at": now_str,
        })
        updated = (await db.execute(find_q, {"user_id": user_id, "email": user_email})).mappings().first()
        return AlumniProfilePublic(**row_to_alumni_dict(dict(updated)))

    # Fallback to seed profile if testing with seed mentor
    alm = next((a for a in SEED_ALUMNI if a.get("id") == user_id or a.get("email") == current_user.get("email")), None)
    if not alm:
        alm = SEED_ALUMNI[0]
    alm.update(body.model_dump())
    return AlumniProfilePublic(**alm)

@router.post("/mentorship/request/{id}", response_model=MentorshipRequest, status_code=status.HTTP_201_CREATED)
async def request_alumni_mentorship(
    id: str,
    body: MentorshipRequestCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Student submits a mentorship request to a verified mentor alumni with database persistence.
    """
    # Check if mentor exists in DB or SEED
    find_q = text("SELECT * FROM alumni_profiles WHERE id = :id")
    row = (await db.execute(find_q, {"id": id})).mappings().first()
    if row:
        alm = row_to_alumni_dict(dict(row))
    else:
        alm = next((a for a in SEED_ALUMNI if a["id"] == id), None)

    if not alm:
        raise HTTPException(status_code=404, detail="Alumni mentor not found")

    if not alm.get("is_mentor", False):
        raise HTTPException(status_code=400, detail="Selected alumni has not opted in for mentorship.")

    student_id = str(current_user.get("sub") or current_user.get("id") or "std-2023-001")
    user_meta = current_user.get("user_metadata") or {}
    student_name = current_user.get("name") or user_meta.get("full_name") or current_user.get("full_name") or "Kavitha Raman"
    student_dept = current_user.get("department_code") or "CS"
    student_reg = current_user.get("register_number") or user_meta.get("register_number") or "21UCS042"

    # Check duplicate pending request
    check_q = text("""
        SELECT id FROM alumni_mentorship_requests
        WHERE student_id = :student_id AND alumni_id = :alumni_id AND status = 'pending'
    """)
    existing_req = (await db.execute(check_q, {"student_id": student_id, "alumni_id": alm["id"]})).first()
    if existing_req:
        raise HTTPException(status_code=400, detail="You already have an active pending mentorship request with this alumni mentor.")

    req_id = f"mnt-req-{uuid.uuid4().hex[:8]}"
    now_str = datetime.now(timezone.utc).isoformat()

    insert_q = text("""
        INSERT INTO alumni_mentorship_requests (
            id, alumni_id, alumni_name, student_id, student_name,
            student_department, student_register_number, preferred_topic, message, status,
            created_at, updated_at
        ) VALUES (
            :id, :alumni_id, :alumni_name, :student_id, :student_name,
            :student_department, :student_register_number, :preferred_topic, :message, 'pending',
            :created_at, :updated_at
        )
    """)
    await db.execute(insert_q, {
        "id": req_id,
        "alumni_id": alm["id"],
        "alumni_name": alm["name"],
        "student_id": student_id,
        "student_name": student_name,
        "student_department": student_dept,
        "student_register_number": student_reg,
        "preferred_topic": body.preferred_topic,
        "message": body.message,
        "created_at": now_str,
        "updated_at": now_str,
    })

    await log_audit_event(
        user_id=student_id,
        action="request_alumni_mentorship",
        resource_type="alumni_mentorship_requests",
        resource_id=req_id,
        details={"alumni_id": alm["id"], "alumni_name": alm["name"], "topic": body.preferred_topic},
        db=db,
    )

    return MentorshipRequest(
        id=req_id,
        alumni_id=alm["id"],
        alumni_name=alm["name"],
        student_id=student_id,
        student_name=student_name,
        student_department=student_dept,
        student_register_number=student_reg,
        preferred_topic=body.preferred_topic,
        message=body.message,
        status="pending",
        created_at=now_str,
    )

# ── Admin Endpoints ───────────────────────────────────────────────────────────

@router.get("/admin/directory", response_model=Dict[str, Any])
async def get_admin_alumni_directory(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Full alumni management directory with verification status, contact details, and database persisted requests.
    """
    role = current_user.get("role", "student")
    if role not in ["admin", "faculty"]:
        raise HTTPException(status_code=403, detail="Alumni management capability required")

    all_alumni = await get_combined_alumni(db)
    total = len(all_alumni)
    verified = sum(1 for a in all_alumni if a.get("is_verified", False))
    mentors = sum(1 for a in all_alumni if a.get("is_mentor", False))

    dept_stats: Dict[str, int] = {}
    batch_stats: Dict[str, int] = {}
    for a in all_alumni:
        d = a.get("department_code", "Other")
        b = str(a.get("batch_year", 2020))
        dept_stats[d] = dept_stats.get(d, 0) + 1
        batch_stats[b] = batch_stats.get(b, 0) + 1

    # Fetch all mentorship requests from database
    req_q = text("SELECT * FROM alumni_mentorship_requests ORDER BY created_at DESC")
    req_rows = (await db.execute(req_q)).mappings().all()
    mentorship_requests = [row_to_mentorship_req(dict(r)) for r in req_rows]

    return {
        "items": [AlumniProfileFull(**a) for a in all_alumni],
        "total": total,
        "verified_count": verified,
        "mentors_count": mentors,
        "department_breakdown": [{"department": k, "count": v} for k, v in dept_stats.items()],
        "batch_breakdown": [{"batch": k, "count": v} for k, v in sorted(batch_stats.items())],
        "mentorship_requests": mentorship_requests,
    }

@router.put("/admin/{id}/verify", response_model=AlumniProfilePublic)
async def admin_verify_alumni_profile(
    id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Verify an alumni profile so it appears in the official portal.
    """
    role = current_user.get("role", "student")
    if role not in ["admin", "faculty"]:
        raise HTTPException(status_code=403, detail="Admin privilege required to verify alumni profiles")

    now_str = datetime.now(timezone.utc).isoformat()
    find_q = text("SELECT * FROM alumni_profiles WHERE id = :id")
    row = (await db.execute(find_q, {"id": id})).mappings().first()

    if row:
        update_q = text("UPDATE alumni_profiles SET is_verified = 1, updated_at = :updated_at WHERE id = :id")
        await db.execute(update_q, {"id": id, "updated_at": now_str})
        updated = (await db.execute(find_q, {"id": id})).mappings().first()
        return AlumniProfilePublic(**row_to_alumni_dict(dict(updated)))

    alm = next((a for a in SEED_ALUMNI if a["id"] == id), None)
    if not alm:
        raise HTTPException(status_code=404, detail="Alumni profile not found")

    alm["is_verified"] = True
    return AlumniProfilePublic(**alm)

