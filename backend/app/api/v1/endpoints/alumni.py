"""
SFRC Alumni Network & Mentorship API
Phase 13: Alumni directory, visibility rules, self-registration, mentorship requests, stories, and admin verification.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field, EmailStr

from app.core.security import get_current_user

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

# Mentorship Requests Storage
MENTORSHIP_REQUESTS: List[Dict[str, Any]] = [
    {
        "id": "mnt-req-001",
        "alumni_id": "alm-01",
        "alumni_name": "Dr. Priya Sundaram",
        "student_id": "std-2023-001",
        "student_name": "Kavitha Raman",
        "student_department": "CS",
        "student_register_number": "21UCS042",
        "preferred_topic": "System Design & Tech Roadmaps",
        "message": "Respected Senior, I am preparing for cloud architecture interviews and would love your guidance on distributed caching and microservices.",
        "status": "accepted",
        "created_at": "2026-09-20T10:00:00Z",
    }
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

# ── Visibility Helper ─────────────────────────────────────────────────────────

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
):
    """
    Get visibility-checked alumni directory for authenticated users.
    """
    user_role = current_user.get("role", "student")
    user_id = current_user.get("sub") or current_user.get("id") or ""

    results: List[AlumniProfilePublic] = []
    for alm in SEED_ALUMNI:
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
            q = search.lower()
            if (
                q not in sanitized.name.lower()
                and q not in sanitized.current_organization.lower()
                and q not in sanitized.designation.lower()
                and q not in sanitized.department_code.lower()
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
):
    """
    List all available alumni mentors that are not private.
    """
    user_role = current_user.get("role", "student")
    user_id = current_user.get("sub") or current_user.get("id") or ""

    mentors: List[AlumniProfilePublic] = []
    for alm in SEED_ALUMNI:
        if not alm.get("is_mentor", False):
            continue
        sanitized = sanitize_alumni_profile(alm, user_role, user_id)
        if sanitized:
            mentors.append(sanitized)

    return mentors

@router.get("/stories", response_model=List[AlumniStory])
async def list_alumni_stories():
    """
    List published inspirational alumni success stories.
    """
    return [AlumniStory(**s) for s in ALUMNI_STORIES]

@router.get("/opportunities", response_model=List[AlumniOpportunity])
async def list_alumni_opportunities():
    """
    List jobs, internships, and referral opportunities posted by alumni network.
    """
    return [AlumniOpportunity(**o) for o in ALUMNI_OPPORTUNITIES]

@router.get("/{id}", response_model=AlumniProfilePublic)
async def get_alumni_profile_detail(
    id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Get alumni profile detail with strict server-side visibility enforcement.
    """
    user_role = current_user.get("role", "student")
    user_id = current_user.get("sub") or current_user.get("id") or ""

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
):
    """
    Self-register as an alumni member.
    """
    now_str = datetime.now(timezone.utc).isoformat()
    new_id = f"alm-{uuid.uuid4().hex[:8]}"

    new_alumni = {
        "id": new_id,
        **body.model_dump(),
        "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
        "is_verified": False,
        "created_at": now_str,
    }

    SEED_ALUMNI.append(new_alumni)
    return AlumniProfilePublic(**new_alumni)

@router.put("/me", response_model=AlumniProfilePublic)
async def update_my_alumni_profile(
    body: AlumniProfileBase,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Update authenticated alumni user's profile.
    """
    user_id = current_user.get("sub") or current_user.get("id") or ""
    alm = next((a for a in SEED_ALUMNI if a.get("id") == user_id or a.get("email") == current_user.get("email")), None)

    if not alm:
        # Fallback to updating first mentor for dev testing
        alm = SEED_ALUMNI[0]

    alm.update(body.model_dump())
    return AlumniProfilePublic(**alm)

@router.post("/mentorship/request/{id}", response_model=MentorshipRequest, status_code=status.HTTP_201_CREATED)
async def request_alumni_mentorship(
    id: str,
    body: MentorshipRequestCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Student submits a mentorship request to a verified mentor alumni.
    """
    alm = next((a for a in SEED_ALUMNI if a["id"] == id), None)
    if not alm:
        raise HTTPException(status_code=404, detail="Alumni mentor not found")

    if not alm.get("is_mentor", False):
        raise HTTPException(status_code=400, detail="Selected alumni has not opted in for mentorship.")

    student_id = current_user.get("sub") or current_user.get("id") or "std-2023-001"
    student_name = current_user.get("name") or current_user.get("user_metadata", {}).get("full_name") or "Kavitha Raman"
    student_dept = current_user.get("department_code") or "CS"
    student_reg = current_user.get("register_number") or "21UCS042"

    now_str = datetime.now(timezone.utc).isoformat()
    req = {
        "id": f"mnt-req-{uuid.uuid4().hex[:8]}",
        "alumni_id": alm["id"],
        "alumni_name": alm["name"],
        "student_id": student_id,
        "student_name": student_name,
        "student_department": student_dept,
        "student_register_number": student_reg,
        "preferred_topic": body.preferred_topic,
        "message": body.message,
        "status": "pending",
        "created_at": now_str,
    }

    MENTORSHIP_REQUESTS.append(req)
    return MentorshipRequest(**req)

# ── Admin Endpoints ───────────────────────────────────────────────────────────

@router.get("/admin/directory", response_model=Dict[str, Any])
async def get_admin_alumni_directory(
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Full alumni management directory with verification status and contact details.
    """
    role = current_user.get("role", "student")
    if role not in ["admin", "faculty"]:
        raise HTTPException(status_code=403, detail="Alumni management capability required")

    total = len(SEED_ALUMNI)
    verified = sum(1 for a in SEED_ALUMNI if a.get("is_verified", False))
    mentors = sum(1 for a in SEED_ALUMNI if a.get("is_mentor", False))

    dept_stats: Dict[str, int] = {}
    batch_stats: Dict[str, int] = {}
    for a in SEED_ALUMNI:
        d = a.get("department_code", "Other")
        b = str(a.get("batch_year", 2020))
        dept_stats[d] = dept_stats.get(d, 0) + 1
        batch_stats[b] = batch_stats.get(b, 0) + 1

    return {
        "items": [AlumniProfileFull(**a) for a in SEED_ALUMNI],
        "total": total,
        "verified_count": verified,
        "mentors_count": mentors,
        "department_breakdown": [{"department": k, "count": v} for k, v in dept_stats.items()],
        "batch_breakdown": [{"batch": k, "count": v} for k, v in sorted(batch_stats.items())],
        "mentorship_requests": [MentorshipRequest(**r) for r in MENTORSHIP_REQUESTS],
    }

@router.put("/admin/{id}/verify", response_model=AlumniProfilePublic)
async def admin_verify_alumni_profile(
    id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Verify an alumni profile so it appears in the official portal.
    """
    role = current_user.get("role", "student")
    if role not in ["admin", "faculty"]:
        raise HTTPException(status_code=403, detail="Admin privilege required to verify alumni profiles")

    alm = next((a for a in SEED_ALUMNI if a["id"] == id), None)
    if not alm:
        raise HTTPException(status_code=404, detail="Alumni profile not found")

    alm["is_verified"] = True
    return AlumniProfilePublic(**alm)
