"""
SFRC Student Life, Clubs, Extension, Entrepreneurship (ACIDE) & YWED API
Phase 12: Official clubs, NSS/NCC units, student startups, and vocational certificate tracks.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.core.security import get_current_user

router = APIRouter()

# ── Pydantic Schemas ──────────────────────────────────────────────────────────

class ClubItem(BaseModel):
    id: str
    name: str
    category: str  # "club" or "extension" (NSS/NCC/YRC)
    description: str
    faculty_in_charge: str
    meeting_venue: str
    meeting_day: str
    icon_name: Optional[str] = None
    banner_url: Optional[str] = None
    member_count: int
    is_member: bool = False

class YWEDCourse(BaseModel):
    id: str
    course_name: str
    course_type: str  # "long_term" (1 year) or "short_term" (3-6 months)
    instructor: str
    duration: str
    skills_acquired: List[str]
    max_intake: int
    enrolled_count: int
    syllabus_outline: str
    is_enrolled: bool = False

class StartupShowcase(BaseModel):
    id: str
    startup_name: str
    founder_names: List[str]
    department: str
    founded_year: int
    tagline: str
    description: str
    revenue_stage: str  # Ideation, Revenue Generating, Incubated, Scaled
    logo_url: Optional[str] = None
    website_url: Optional[str] = None
    mentors: List[str]

class StudentCertificate(BaseModel):
    id: str
    certificate_title: str
    issued_by: str  # e.g., "SFRC ACIDE Incubation Cell", "YWED Vocational Center", "NSS Unit II"
    issue_date: str
    certificate_type: str  # "course", "event", "club", "startup"
    verification_code: str
    download_url: str

# ── Seed Data: Official SFRC Clubs & NSS/NCC Units ─────────────────────────────

SEED_CLUBS: List[Dict[str, Any]] = [
    # Official Clubs (10)
    {
        "id": "club-01",
        "name": "Student Union",
        "category": "club",
        "description": "The central apex student council orchestrating college governance, flagship cultural symposia, student welfare, and leadership initiatives.",
        "faculty_in_charge": "Dr. S. Sivakama Sundari",
        "meeting_venue": "College Assembly Hall",
        "meeting_day": "Every Tuesday, 3:30 PM",
        "icon_name": "Users",
        "banner_url": "https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=600&auto=format&fit=crop&q=80",
        "member_count": 120,
    },
    {
        "id": "club-02",
        "name": "Literary Club",
        "category": "club",
        "description": "Fostering creative writing, elocution, poetry recitations, and multilingual literary appreciation across Tamil and English languages.",
        "faculty_in_charge": "Dr. P. Stella",
        "meeting_venue": "English Seminar Hall",
        "meeting_day": "Every Wednesday, 3:45 PM",
        "icon_name": "BookOpen",
        "banner_url": "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=600&auto=format&fit=crop&q=80",
        "member_count": 85,
    },
    {
        "id": "club-03",
        "name": "Science Club",
        "category": "club",
        "description": "Promoting scientific temper through intercollegiate science quizzes, lab exhibitions, STEM outreach, and expert guest lectures.",
        "faculty_in_charge": "Dr. R. Anuradha",
        "meeting_venue": "Physics Smart Hall",
        "meeting_day": "Every Thursday, 3:30 PM",
        "icon_name": "FlaskConical",
        "banner_url": "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=600&auto=format&fit=crop&q=80",
        "member_count": 92,
    },
    {
        "id": "club-04",
        "name": "Computer Club",
        "category": "club",
        "description": "Coding hackathons, web development bootcamps, open-source workshops, AI hack nights, and tech symposium coordination.",
        "faculty_in_charge": "Dr. M. Deepalakshmi",
        "meeting_venue": "Main MCA Cloud Lab",
        "meeting_day": "Every Monday, 4:00 PM",
        "icon_name": "Terminal",
        "banner_url": "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=600&auto=format&fit=crop&q=80",
        "member_count": 140,
    },
    {
        "id": "club-05",
        "name": "Fine Arts Club",
        "category": "club",
        "description": "Nurturing creative expressions across traditional Bharatanatyam, contemporary dance, pencil sketching, water-color painting, and street theatre.",
        "faculty_in_charge": "Dr. G. Uma Maheswari",
        "meeting_venue": "Open Air Auditorium",
        "meeting_day": "Every Friday, 3:30 PM",
        "icon_name": "Palette",
        "banner_url": "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=600&auto=format&fit=crop&q=80",
        "member_count": 110,
    },
    {
        "id": "club-06",
        "name": "Commerce Club",
        "category": "club",
        "description": "Financial modeling, stock market simulation games, budget analysis discussions, and entrepreneurship talks for commerce scholars.",
        "faculty_in_charge": "Dr. K. Jayanthi",
        "meeting_venue": "Commerce Seminar Hall",
        "meeting_day": "Every Wednesday, 3:30 PM",
        "icon_name": "TrendingUp",
        "banner_url": "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=600&auto=format&fit=crop&q=80",
        "member_count": 78,
    },
    {
        "id": "club-07",
        "name": "Nature Club",
        "category": "club",
        "description": "Campus biodiversity cataloguing, botanical garden conservation, bird watching walks, and herbal plantation drives.",
        "faculty_in_charge": "Dr. T. Geetha",
        "meeting_venue": "Botany Herbarium",
        "meeting_day": "Alternate Saturdays, 9:00 AM",
        "icon_name": "Trees",
        "banner_url": "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=600&auto=format&fit=crop&q=80",
        "member_count": 65,
    },
    {
        "id": "club-08",
        "name": "Photography Club",
        "category": "club",
        "description": "Visual storytelling, DSLR framing workshops, photojournalism coverage for college events, and campus annual photography exhibitions.",
        "faculty_in_charge": "Dr. N. Saravanan",
        "meeting_venue": "Media Center Studio",
        "meeting_day": "Every Tuesday, 4:00 PM",
        "icon_name": "Camera",
        "banner_url": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&auto=format&fit=crop&q=80",
        "member_count": 55,
    },
    {
        "id": "club-09",
        "name": "Debate Club",
        "category": "club",
        "description": "Parliamentary debate training, critical thinking discourse, public policy analysis, and Model United Nations (MUN) delegations.",
        "faculty_in_charge": "Dr. S. Mythili",
        "meeting_venue": "Smart Classroom 104",
        "meeting_day": "Every Thursday, 4:00 PM",
        "icon_name": "MessageSquare",
        "banner_url": "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=600&auto=format&fit=crop&q=80",
        "member_count": 70,
    },
    {
        "id": "club-10",
        "name": "Cultural Club",
        "category": "club",
        "description": "Organizing cultural festivals, folk traditions, music bands, choir ensembles, and regional heritage celebrations.",
        "faculty_in_charge": "Dr. C. Vanitha",
        "meeting_venue": "Main Auditorium",
        "meeting_day": "Every Friday, 4:00 PM",
        "icon_name": "Music",
        "banner_url": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80",
        "member_count": 130,
    },

    # Extension Activities (11)
    {
        "id": "ext-01",
        "name": "National Service Scheme (NSS)",
        "category": "extension",
        "description": "Community upliftment, 7-day rural immersion camps, health checkups, literacy drives, and civic responsibility under Ministry of Youth Affairs.",
        "faculty_in_charge": "Dr. R. Sudha & Dr. M. Karpagam",
        "meeting_venue": "NSS Office Unit I & II",
        "meeting_day": "Saturdays, 8:00 AM",
        "icon_name": "HeartHandshake",
        "banner_url": "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=600&auto=format&fit=crop&q=80",
        "member_count": 250,
    },
    {
        "id": "ext-02",
        "name": "National Cadet Corps (NCC)",
        "category": "extension",
        "description": "7(TN) Girls Battalion NCC imparting military drill discipline, rifle marksmanship, obstacle training, and Republic Day Camp (RDC) grooming.",
        "faculty_in_charge": "Capt. Dr. K. Chitra",
        "meeting_venue": "NCC Parade Ground",
        "meeting_day": "Tuesdays & Fridays, 6:00 AM",
        "icon_name": "ShieldAlert",
        "banner_url": "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=600&auto=format&fit=crop&q=80",
        "member_count": 160,
    },
    {
        "id": "ext-03",
        "name": "Youth Red Cross (YRC)",
        "category": "extension",
        "description": "First aid certification, disaster preparedness drills, international humanitarian law seminars, and voluntary blood donation camps.",
        "faculty_in_charge": "Dr. V. Bhuvaneswari",
        "meeting_venue": "Health Care Center",
        "meeting_day": "Alternate Wednesdays, 3:30 PM",
        "icon_name": "PlusCircle",
        "banner_url": "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=600&auto=format&fit=crop&q=80",
        "member_count": 115,
    },
    {
        "id": "ext-04",
        "name": "Red Ribbon Club",
        "category": "extension",
        "description": "Youth health awareness, HIV/AIDS prevention advocacy, adolescent mental health support, and peer education campaigns.",
        "faculty_in_charge": "Dr. A. Meena",
        "meeting_venue": "Zoology Seminar Hall",
        "meeting_day": "Every Thursday, 3:30 PM",
        "icon_name": "Ribbon",
        "banner_url": "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=600&auto=format&fit=crop&q=80",
        "member_count": 95,
    },
    {
        "id": "ext-05",
        "name": "Social Service League",
        "category": "extension",
        "description": "Support programs for local orphanages, elder care visits, cloth donation drives, and vocational training for underprivileged women.",
        "faculty_in_charge": "Dr. S. Selvakumari",
        "meeting_venue": "Social Work Dept",
        "meeting_day": "Every Friday, 3:45 PM",
        "icon_name": "Heart",
        "banner_url": "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=600&auto=format&fit=crop&q=80",
        "member_count": 80,
    },
    {
        "id": "ext-06",
        "name": "Citizen Consumer Club",
        "category": "extension",
        "description": "Consumer protection rights, fair trade awareness, product adulteration detection workshops, and Consumer Protection Act (CPA) literacy.",
        "faculty_in_charge": "Dr. K. Mahalakshmi",
        "meeting_venue": "Economics Lab",
        "meeting_day": "Alternate Mondays, 3:30 PM",
        "icon_name": "ShoppingBag",
        "banner_url": "https://images.unsplash.com/photo-1555421689-491a97ff2040?w=600&auto=format&fit=crop&q=80",
        "member_count": 60,
    },
    {
        "id": "ext-07",
        "name": "Environmental Club",
        "category": "extension",
        "description": "Plastic-free campus initiatives, rainwater harvesting auditing, solar awareness, and waste segregation drives.",
        "faculty_in_charge": "Dr. D. Vijaya",
        "meeting_venue": "Eco-Campus Hub",
        "meeting_day": "Every Wednesday, 4:00 PM",
        "icon_name": "Leaf",
        "banner_url": "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600&auto=format&fit=crop&q=80",
        "member_count": 90,
    },
    {
        "id": "ext-08",
        "name": "Financial Literacy Club",
        "category": "extension",
        "description": "Empowering women scholars with personal budgeting, mutual funds, digital banking security, and government savings schemes.",
        "faculty_in_charge": "Dr. B. Shanthi",
        "meeting_venue": "Bank Training Hall",
        "meeting_day": "Every Tuesday, 3:30 PM",
        "icon_name": "Wallet",
        "banner_url": "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=600&auto=format&fit=crop&q=80",
        "member_count": 75,
    },
    {
        "id": "ext-09",
        "name": "Self Defence Club",
        "category": "extension",
        "description": "Martial arts fundamentals, Silambam, Karate self-protection techniques, situational threat awareness, and physical agility conditioning.",
        "faculty_in_charge": "Physical Directress Dr. M. Rani",
        "meeting_venue": "Gymnasium / Indoor Stadium",
        "meeting_day": "Mondays & Thursdays, 6:30 AM",
        "icon_name": "Shield",
        "banner_url": "https://images.unsplash.com/photo-1555597673-b21d5c935865?w=600&auto=format&fit=crop&q=80",
        "member_count": 135,
    },
    {
        "id": "ext-10",
        "name": "SWACHTA Club",
        "category": "extension",
        "description": "Swachh Bharat Abhiyan campus sanitization drives, zero-waste composting, hygienic public space advocacy, and recycling campaigns.",
        "faculty_in_charge": "Dr. S. Rajeshwari",
        "meeting_venue": "Eco Center",
        "meeting_day": "Every Saturday, 7:30 AM",
        "icon_name": "Sparkles",
        "banner_url": "https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?w=600&auto=format&fit=crop&q=80",
        "member_count": 105,
    },
    {
        "id": "ext-11",
        "name": "Unnat Bharat Abhiyan (UBA)",
        "category": "extension",
        "description": "Adopted 5 village development clusters near Sivakasi focusing on drinking water testing, rural school STEM teaching, and cottage industry tech support.",
        "faculty_in_charge": "Dr. T. Saradha",
        "meeting_venue": "UBA Village Liaison Cell",
        "meeting_day": "Saturdays, 9:00 AM",
        "icon_name": "Globe",
        "banner_url": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80",
        "member_count": 150,
    },
]

# Track student memberships: club_id -> set of student_ids
STUDENT_CLUB_MEMBERSHIPS: Dict[str, List[str]] = {
    "club-01": ["std-2023-001"],
    "club-04": ["std-2023-001"],
    "ext-01": ["std-2023-001"],
}

# ── Seed Data: ACIDE Startups (7) ─────────────────────────────────────────────

SEED_ACIDE_STARTUPS: List[Dict[str, Any]] = [
    {
        "id": "startup-01",
        "startup_name": "Kissan Innova",
        "founder_names": ["Kavitha R.", "Pooja M."],
        "department": "Computer Science & Agriculture Tech",
        "founded_year": 2023,
        "tagline": "Smart IoT & AI sensors for soil moisture optimization and automated drip irrigation.",
        "description": "Kissan Innova manufactures solar-powered IoT probe stations paired with vernacular mobile advisory for regional cotton and maize farmers.",
        "revenue_stage": "Revenue Generating",
        "logo_url": "https://images.unsplash.com/photo-1586771107445-d3ca888129ff?w=300&auto=format&fit=crop&q=80",
        "website_url": "https://kissaninnova.sfrc.in",
        "mentors": ["Dr. R. Meenakshi", "Er. G. Sundar (AgriTech Advisor)"],
    },
    {
        "id": "startup-02",
        "startup_name": "Yos Deliza",
        "founder_names": ["Yogitha S.", "Deepika K."],
        "department": "Home Science & Food Processing",
        "founded_year": 2024,
        "tagline": "Nutritious farm-to-fork millet bakery products and natural health snack bars.",
        "description": "Yos Deliza produces zero-preservative, gluten-free ragi, barnyard, and foxtail millet cookies and protein bars distributed across South Tamil Nadu retail outlets.",
        "revenue_stage": "Incubated",
        "logo_url": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&auto=format&fit=crop&q=80",
        "website_url": "https://yosdeliza.sfrc.in",
        "mentors": ["Dr. S. Sivakama Sundari", "Chef M. Ramesh"],
    },
    {
        "id": "startup-03",
        "startup_name": "Kraftiga",
        "founder_names": ["Archana P.", "Lavanya N."],
        "department": "Fine Arts & Design",
        "founded_year": 2023,
        "tagline": "Handcrafted sustainable event mementos, terracotta arts, and biodegradable corporate gifts.",
        "description": "Kraftiga empowers rural women artisans by upcycling natural clay, palm leaves, and jute into premium corporate hampers and artistic merchandise.",
        "revenue_stage": "Revenue Generating",
        "logo_url": "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=300&auto=format&fit=crop&q=80",
        "website_url": "https://kraftiga.sfrc.in",
        "mentors": ["Dr. G. Uma Maheswari", "Mr. A. Vignesh (Craft Exporter)"],
    },
    {
        "id": "startup-04",
        "startup_name": "Thukhil",
        "founder_names": ["Revathi M.", "Swathi B."],
        "department": "Costume Design & Fashion",
        "founded_year": 2022,
        "tagline": "Contemporary ethnic wear handcrafted with natural organic dyes and traditional loom weaving.",
        "description": "Thukhil blends traditional Chettinad and Madurai handloom textiles into modern fusion college wear, ethically dyed using vegetable and marigold extracts.",
        "revenue_stage": "Scaled",
        "logo_url": "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=300&auto=format&fit=crop&q=80",
        "website_url": "https://thukhiltextiles.sfrc.in",
        "mentors": ["Dr. P. Stella", "Ms. K. Nithya (Fashion Designer)"],
    },
    {
        "id": "startup-05",
        "startup_name": "Belle",
        "founder_names": ["Harini V.", "Divya T."],
        "department": "Chemistry & Cosmetology",
        "founded_year": 2024,
        "tagline": "Ayurvedic botanical skincare, organic cold-pressed lip balms, and herbal hair elixirs.",
        "description": "Belle formulates chemical-free personal care cosmetics validated through institutional biochemistry lab safety and hypoallergenic testing.",
        "revenue_stage": "Incubated",
        "logo_url": "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=300&auto=format&fit=crop&q=80",
        "website_url": "https://bellebotanics.sfrc.in",
        "mentors": ["Dr. K. Arulmozhi", "Dr. V. Gomathi"],
    },
    {
        "id": "startup-06",
        "startup_name": "ChemEmpor",
        "founder_names": ["Sharmila K.", "Janani R."],
        "department": "Chemistry",
        "founded_year": 2023,
        "tagline": "Non-toxic biodegradable laboratory cleaning solvents and eco-friendly home sanitizers.",
        "description": "ChemEmpor manufactures eco-safe citrus enzyme-based floor cleaners and laboratory glassware detergents replacing hazardous synthetic chemicals.",
        "revenue_stage": "Revenue Generating",
        "logo_url": "https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=300&auto=format&fit=crop&q=80",
        "website_url": "https://chemempor.sfrc.in",
        "mentors": ["Dr. K. Arulmozhi", "Dr. P. Suganya"],
    },
    {
        "id": "startup-07",
        "startup_name": "Explora",
        "founder_names": ["Keerthana M.", "Aishwarya S."],
        "department": "Computer Science & Education",
        "founded_year": 2024,
        "tagline": "Interactive AR/VR science lab simulations and gamified school STEM kits.",
        "description": "Explora builds affordable web-based 3D virtual science experiments enabling rural school students to perform physics and chemistry lab practicals safely on low-cost smartphones.",
        "revenue_stage": "Incubated",
        "logo_url": "https://images.unsplash.com/photo-1593508512255-86ab42a8e620?w=300&auto=format&fit=crop&q=80",
        "website_url": "https://explorastudios.sfrc.in",
        "mentors": ["Dr. R. Meenakshi", "Dr. M. Deepalakshmi"],
    },
]

# ── Seed Data: YWED Courses (5 Long-term + 12 Short-term) ──────────────────────

SEED_YWED_COURSES: List[Dict[str, Any]] = [
    # 5 Long-Term Courses (1 Year Certificate)
    {
        "id": "ywed-lt-01",
        "course_name": "Typewriting (English & Tamil Junior/Senior)",
        "course_type": "long_term",
        "instructor": "Mrs. M. Banumathi (Approved Technical Instructor)",
        "duration": "1 Academic Year (120 Hours)",
        "skills_acquired": ["Speed typing (45 WPM)", "Official correspondence drafting", "TN Technical Board Exam Prep"],
        "max_intake": 60,
        "enrolled_count": 48,
        "syllabus_outline": "Keyboard mastery, speed drills, tabular statements, government order formatting, Tamil typewriting fonts.",
    },
    {
        "id": "ywed-lt-02",
        "course_name": "Tailoring & Garment Construction",
        "course_type": "long_term",
        "instructor": "Mrs. S. Parameshwari",
        "duration": "1 Academic Year (100 Hours)",
        "skills_acquired": ["Pattern drafting", "Blouse & Salwar cutting", "Sewing machine maintenance", "Boutique stitching"],
        "max_intake": 50,
        "enrolled_count": 42,
        "syllabus_outline": "Body measurement principles, neckline variations, zipper and collar attachment, modern apparel fitting.",
    },
    {
        "id": "ywed-lt-03",
        "course_name": "Shorthand (English Stenography)",
        "course_type": "long_term",
        "instructor": "Mr. K. Narayanan",
        "duration": "1 Academic Year (100 Hours)",
        "skills_acquired": ["Pitman shorthand symbols", "80-120 WPM transcription", "Court reporting techniques"],
        "max_intake": 40,
        "enrolled_count": 28,
        "syllabus_outline": "Consonants, vowel indicators, grammalogues, phraseography, rapid dictation transcription.",
    },
    {
        "id": "ywed-lt-04",
        "course_name": "Computer Office Automation (COA)",
        "course_type": "long_term",
        "instructor": "Mrs. R. Jeyanthi (MCA)",
        "duration": "1 Academic Year (120 Hours)",
        "skills_acquired": ["Advanced MS Office / LibreOffice", "Spreadsheet formulas & pivot tables", "Tally ERP basics"],
        "max_intake": 60,
        "enrolled_count": 55,
        "syllabus_outline": "Operating system utilities, document formatting, database records, macro automation, digital signatures.",
    },
    {
        "id": "ywed-lt-05",
        "course_name": "Jute Products Making & Eco-Packaging",
        "course_type": "long_term",
        "instructor": "Mrs. T. Dhanalakshmi (Master Artisan)",
        "duration": "1 Academic Year (90 Hours)",
        "skills_acquired": ["Industrial jute cutting", "Multi-compartment bag design", "Lamination & silk-screen printing on jute"],
        "max_intake": 45,
        "enrolled_count": 36,
        "syllabus_outline": "Raw fiber grading, reinforced stitching, handles attachment, waterproof linings, commercial export packing.",
    },

    # 12 Short-Term Courses (30-45 Hours)
    {
        "id": "ywed-st-01",
        "course_name": "Aari Work & Zardosi Designing",
        "course_type": "short_term",
        "instructor": "Mrs. K. Anandhi",
        "duration": "45 Hours (3 Months)",
        "skills_acquired": ["Aari needle control", "Bead & sequin stitching", "Bridal blouse embellishment"],
        "max_intake": 35,
        "enrolled_count": 30,
        "syllabus_outline": "Chain stitch, stone fixing, French knot, cut work, border designing on bridal silk.",
    },
    {
        "id": "ywed-st-02",
        "course_name": "Lippan Art (Mud & Mirror Mural Craft)",
        "course_type": "short_term",
        "instructor": "Mrs. G. Priya",
        "duration": "30 Hours (2 Months)",
        "skills_acquired": ["Clay relief modeling", "Convex mirror placement", "Traditional Kutch mural finishing"],
        "max_intake": 30,
        "enrolled_count": 26,
        "syllabus_outline": "Dough preparation, geometric border charting, glass inlaying, weatherproofing varnish application.",
    },
    {
        "id": "ywed-st-03",
        "course_name": "Hand Embroidery & Fabric Ornamentation",
        "course_type": "short_term",
        "instructor": "Mrs. S. Meena",
        "duration": "35 Hours (2.5 Months)",
        "skills_acquired": ["25 basic embroidery stitches", "Shadow work", "Ribbon flower stitching"],
        "max_intake": 35,
        "enrolled_count": 32,
        "syllabus_outline": "Satin stitch, herringbone, bullions, mirror work, handkerchief and dress border embellishments.",
    },
    {
        "id": "ywed-st-04",
        "course_name": "Beautician & Bridal Makeup Artistry",
        "course_type": "short_term",
        "instructor": "Mrs. R. Shenbagam (Certified Cosmetologist)",
        "duration": "45 Hours (3 Months)",
        "skills_acquired": ["Skin tone analysis", "HD bridal contouring", "Hair styling & saree draping"],
        "max_intake": 40,
        "enrolled_count": 38,
        "syllabus_outline": "Skin care regimes, facial techniques, professional makeup tools, traditional and modern bridal hair styling.",
    },
    {
        "id": "ywed-st-05",
        "course_name": "Veena & Carnatic Music Foundations",
        "course_type": "short_term",
        "instructor": "Gurusmt. V. Saraswathi",
        "duration": "40 Hours (3 Months)",
        "skills_acquired": ["Finger plucking technique", "Sarali varisai & Geethams", "Tala coordination"],
        "max_intake": 20,
        "enrolled_count": 18,
        "syllabus_outline": "Instrument tuning, fundamental swaras, ragam identification, devotional keerthanas.",
    },
    {
        "id": "ywed-st-06",
        "course_name": "String Art & Geometric Thread Crafts",
        "course_type": "short_term",
        "instructor": "Mrs. D. Revathi",
        "duration": "30 Hours (2 Months)",
        "skills_acquired": ["Nail template layout", "Radial yarn layering", "Custom typographic portraits"],
        "max_intake": 30,
        "enrolled_count": 22,
        "syllabus_outline": "Wood base preparation, hammering precision, tension balancing, multi-color gradient weave.",
    },
    {
        "id": "ywed-st-07",
        "course_name": "Millet Snacks & Confectionery Making",
        "course_type": "short_term",
        "instructor": "Dr. S. Sivakama Sundari (Food Tech)",
        "duration": "35 Hours (2.5 Months)",
        "skills_acquired": ["FSSAI hygiene standards", "Millet murukku & laddoo recipes", "Vacuum packaging"],
        "max_intake": 35,
        "enrolled_count": 34,
        "syllabus_outline": "Grain soaking and roasting ratios, baking low-glycemic cookies, shelf-life extension methods.",
    },
    {
        "id": "ywed-st-08",
        "course_name": "Smocking Cushions & Fabric Quilting",
        "course_type": "short_term",
        "instructor": "Mrs. V. Kamala",
        "duration": "30 Hours (2 Months)",
        "skills_acquired": ["Canadian smocking grids", "Velvet cushion gathers", "Quilted table runners"],
        "max_intake": 30,
        "enrolled_count": 24,
        "syllabus_outline": "Grid marking on satin/velvet, leaf and flower smocking folds, zipper and piping finishing.",
    },
    {
        "id": "ywed-st-09",
        "course_name": "Arathi Plate Decoration & Wedding Trays",
        "course_type": "short_term",
        "instructor": "Mrs. M. Vasanthi",
        "duration": "30 Hours (2 Months)",
        "skills_acquired": ["Silk thread tray wrapping", "Clay miniature figurines", "Jewelled wedding trousseau styling"],
        "max_intake": 35,
        "enrolled_count": 31,
        "syllabus_outline": "Kundan stone pasting, peacock and coconut decor, LED illuminated bridal thali arrangements.",
    },
    {
        "id": "ywed-st-10",
        "course_name": "Hoop Art & Modern Fiber Decor",
        "course_type": "short_term",
        "instructor": "Mrs. T. Anitha",
        "duration": "30 Hours (2 Months)",
        "skills_acquired": ["Wooden embroidery hoop framing", "Punch needle loops", "Botanical wall hangings"],
        "max_intake": 30,
        "enrolled_count": 25,
        "syllabus_outline": "Monks cloth tensioning, yarn threading, 3D textured loops, backing seal and gift packing.",
    },
    {
        "id": "ywed-st-11",
        "course_name": "Saree Embellishment & Tassel Kuchu Making",
        "course_type": "short_term",
        "instructor": "Mrs. P. Shanthi",
        "duration": "30 Hours (2 Months)",
        "skills_acquired": ["Silk thread tassel knotting", "Crochet saree borders", "Kundan pallu designing"],
        "max_intake": 35,
        "enrolled_count": 33,
        "syllabus_outline": "Color palette matching, bead spacing, crochet hook slip stitch, double-tassel wedding kuchu.",
    },
    {
        "id": "ywed-st-12",
        "course_name": "Resin Art & Botanical Jewellery Making",
        "course_type": "short_term",
        "instructor": "Mrs. L. Nithya",
        "duration": "35 Hours (2.5 Months)",
        "skills_acquired": ["Epoxy resin mixing (2:1 ratio)", "Flower preservation", "Silicone casting & polishing"],
        "max_intake": 30,
        "enrolled_count": 29,
        "syllabus_outline": "Degassing techniques, UV resin pendant curing, gold leaf inlays, ocean wave coasters.",
    },
]

# Track student YWED enrollments
STUDENT_YWED_ENROLLMENTS: Dict[str, List[str]] = {
    "std-2023-001": ["ywed-lt-04", "ywed-st-01"],
}

# ── Seed Data: Student Certificates ───────────────────────────────────────────

SEED_CERTIFICATES: List[Dict[str, Any]] = [
    {
        "id": "cert-01",
        "certificate_title": "Computer Office Automation (COA) Diploma",
        "issued_by": "SFRC Center for Young Women Entrepreneurship Development",
        "issue_date": "2026-03-25",
        "certificate_type": "course",
        "verification_code": "SFRC-YWED-2026-8891",
        "download_url": "/api/v1/student-life/certificates/cert-01/download",
    },
    {
        "id": "cert-02",
        "certificate_title": "Certificate of Merit - Best Paper in Student TechFest",
        "issued_by": "SFRC PG & Research Department of Computer Science",
        "issue_date": "2026-02-18",
        "certificate_type": "event",
        "verification_code": "SFRC-CS-EVT-2026-104",
        "download_url": "/api/v1/student-life/certificates/cert-02/download",
    },
    {
        "id": "cert-03",
        "certificate_title": "National Service Scheme 240-Hour Completion Honor",
        "issued_by": "NSS Unit I, The Standard Fireworks Rajaratnam College",
        "issue_date": "2025-12-10",
        "certificate_type": "club",
        "verification_code": "SFRC-NSS-2025-042",
        "download_url": "/api/v1/student-life/certificates/cert-03/download",
    },
]

# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/clubs", response_model=List[ClubItem])
async def list_clubs(
    category: Optional[str] = None,
    search: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    List all official SFRC clubs & NSS/NCC units with current user's membership status.
    """
    student_id = current_user.get("sub") or current_user.get("id") or "std-2023-001"

    results: List[ClubItem] = []
    for c in SEED_CLUBS:
        if category and category != "all" and c["category"] != category:
            continue
        if search:
            q = search.lower()
            if q not in c["name"].lower() and q not in c["description"].lower():
                continue

        is_member = student_id in STUDENT_CLUB_MEMBERSHIPS.get(c["id"], [])
        results.append(ClubItem(**c, is_member=is_member))

    return results

@router.post("/clubs/{id}/join", response_model=Dict[str, Any])
async def join_club(
    id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Toggle or enroll student into a club or extension unit.
    """
    club = next((c for c in SEED_CLUBS if c["id"] == id), None)
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")

    student_id = current_user.get("sub") or current_user.get("id") or "std-2023-001"

    if id not in STUDENT_CLUB_MEMBERSHIPS:
        STUDENT_CLUB_MEMBERSHIPS[id] = []

    if student_id in STUDENT_CLUB_MEMBERSHIPS[id]:
        STUDENT_CLUB_MEMBERSHIPS[id].remove(student_id)
        club["member_count"] = max(0, club["member_count"] - 1)
        is_member = False
        msg = f"Successfully un-enrolled from {club['name']}."
    else:
        STUDENT_CLUB_MEMBERSHIPS[id].append(student_id)
        club["member_count"] += 1
        is_member = True
        msg = f"🎉 Welcome! You are now a registered member of {club['name']}."

    return {
        "club_id": id,
        "is_member": is_member,
        "member_count": club["member_count"],
        "message": msg,
    }

@router.get("/student-life/ywed-courses", response_model=Dict[str, Any])
async def list_ywed_courses(
    course_type: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    List available YWED vocational courses (5 long-term + 12 short-term) with student's enrollment status.
    """
    student_id = current_user.get("sub") or current_user.get("id") or "std-2023-001"
    my_enrolled = STUDENT_YWED_ENROLLMENTS.get(student_id, [])

    results = []
    for crs in SEED_YWED_COURSES:
        if course_type and course_type != "all" and crs["course_type"] != course_type:
            continue
        is_enrolled = crs["id"] in my_enrolled
        results.append(YWEDCourse(**crs, is_enrolled=is_enrolled))

    return {
        "courses": results,
        "total": len(results),
        "policy_note": "Every SFRC student is required to complete either 1 Long-term course OR 2 Short-term courses per academic year for graduation credits.",
    }

@router.post("/student-life/ywed-courses/{id}/enroll", response_model=Dict[str, Any])
async def enroll_ywed_course(
    id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Enroll student into a YWED course.
    """
    course = next((c for c in SEED_YWED_COURSES if c["id"] == id), None)
    if not course:
        raise HTTPException(status_code=404, detail="YWED Course not found")

    student_id = current_user.get("sub") or current_user.get("id") or "std-2023-001"
    if student_id not in STUDENT_YWED_ENROLLMENTS:
        STUDENT_YWED_ENROLLMENTS[student_id] = []

    if id in STUDENT_YWED_ENROLLMENTS[student_id]:
        STUDENT_YWED_ENROLLMENTS[student_id].remove(id)
        course["enrolled_count"] = max(0, course["enrolled_count"] - 1)
        is_enrolled = False
        msg = f"Dropped enrollment for {course['course_name']}."
    else:
        STUDENT_YWED_ENROLLMENTS[student_id].append(id)
        course["enrolled_count"] += 1
        is_enrolled = True
        msg = f"Enrolled in {course['course_name']}."

    return {
        "course_id": id,
        "is_enrolled": is_enrolled,
        "enrolled_count": course["enrolled_count"],
        "message": msg,
    }

@router.get("/student-life/acide-startups", response_model=List[StartupShowcase])
async def list_acide_startups():
    """
    List all 7 SFRC student-founded startups supported by ACIDE.
    """
    return [StartupShowcase(**s) for s in SEED_ACIDE_STARTUPS]

@router.get("/student-life/certificates", response_model=List[StudentCertificate])
async def list_student_certificates(
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    List all digital completion credentials and merit certificates for current student.
    """
    return [StudentCertificate(**c) for c in SEED_CERTIFICATES]
