"""Database table auto-provisioning and schema synchronization."""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from sqlalchemy import text
from app.core.database import engine

logger = logging.getLogger("app.init_db")

SCHEMA_DDL = """
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    avatar_url TEXT,
    department_id UUID,
    is_active BOOLEAN DEFAULT true,
    preferences TEXT DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS programmes (
    id UUID PRIMARY KEY,
    department_id UUID,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    degree_level VARCHAR(50) NOT NULL,
    sanctioned_intake INTEGER DEFAULT 60,
    regulation_batch VARCHAR(100) DEFAULT '2023 - 2026 (OBE)',
    duration_years INTEGER DEFAULT 3,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY,
    programme_id UUID,
    department_id UUID,
    code VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    credits INTEGER NOT NULL,
    semester INTEGER NOT NULL,
    course_type VARCHAR(50) DEFAULT 'core',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    register_number VARCHAR(50) NOT NULL UNIQUE,
    roll_number VARCHAR(50),
    department_id UUID,
    programme_id UUID,
    current_semester INTEGER DEFAULT 1,
    batch_year VARCHAR(50),
    section VARCHAR(10) DEFAULT 'A',
    shift VARCHAR(50) DEFAULT 'Regular',
    admission_date DATE,
    dob DATE,
    blood_group VARCHAR(10),
    is_hosteller BOOLEAN DEFAULT false,
    hostel_block VARCHAR(50),
    room_number VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS faculty (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    employee_id VARCHAR(50) NOT NULL UNIQUE,
    designation VARCHAR(100) NOT NULL,
    department_id UUID,
    qualification VARCHAR(255),
    specialization VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS parents (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    student_id UUID NOT NULL,
    relationship VARCHAR(50) NOT NULL,
    occupation VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS facility_bookings (
    id UUID PRIMARY KEY,
    facility_name VARCHAR(255) NOT NULL,
    department VARCHAR(255) NOT NULL,
    event_name VARCHAR(255),
    booking_date DATE NOT NULL,
    start_time VARCHAR(50) NOT NULL,
    end_time VARCHAR(50) NOT NULL,
    purpose TEXT NOT NULL,
    attendees_count INTEGER DEFAULT 50,
    status VARCHAR(50) DEFAULT 'approved',
    booked_by UUID,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    department VARCHAR(255) NOT NULL,
    venue VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    time VARCHAR(100) NOT NULL,
    max_capacity INTEGER DEFAULT 100,
    registered_count INTEGER DEFAULT 0,
    is_registration_open BOOLEAN DEFAULT true,
    poster_url TEXT,
    speaker_details TEXT,
    status VARCHAR(50) DEFAULT 'upcoming',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS event_registrations (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL,
    user_id UUID NOT NULL,
    registration_number VARCHAR(100),
    status VARCHAR(50) DEFAULT 'registered',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS library_books (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    isbn VARCHAR(100),
    accession_no VARCHAR(100) NOT NULL,
    department VARCHAR(255),
    category VARCHAR(100) DEFAULT 'General',
    total_copies INTEGER DEFAULT 1,
    available_copies INTEGER DEFAULT 1,
    shelf_location VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS library_loans (
    id UUID PRIMARY KEY,
    book_id UUID,
    student_register_number VARCHAR(100) NOT NULL,
    student_name VARCHAR(255),
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    return_date DATE,
    fine_amount NUMERIC(10,2) DEFAULT 0.0,
    status VARCHAR(50) DEFAULT 'issued',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS outpasses (
    id UUID PRIMARY KEY,
    student_id UUID,
    user_id UUID,
    student_name VARCHAR(255),
    register_number VARCHAR(100),
    hostel_block VARCHAR(100),
    room_number VARCHAR(50),
    outpass_type VARCHAR(50) DEFAULT 'Day Outpass',
    departure_time TIMESTAMPTZ NOT NULL,
    expected_return TIMESTAMPTZ NOT NULL,
    reason TEXT NOT NULL,
    parent_consent_status VARCHAR(50) DEFAULT 'verified',
    warden_approval_status VARCHAR(50) DEFAULT 'pending',
    actual_return_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS student_leaves (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    student_id UUID,
    student_name VARCHAR(255),
    register_number VARCHAR(100),
    leave_type VARCHAR(100) NOT NULL,
    reason TEXT NOT NULL,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    total_days NUMERIC(4,1) DEFAULT 1.0,
    status VARCHAR(50) DEFAULT 'pending',
    approval_remarks TEXT,
    approved_by UUID,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS placement_drives (
    id UUID PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    role_title VARCHAR(255) NOT NULL,
    ctc_lpa NUMERIC(10,2) NOT NULL,
    drive_date DATE NOT NULL,
    venue VARCHAR(255) NOT NULL,
    eligibility_criteria TEXT,
    eligible_programmes TEXT DEFAULT '[]',
    status VARCHAR(50) DEFAULT 'upcoming',
    registered_count INTEGER DEFAULT 0,
    selected_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS placement_applications (
    id UUID PRIMARY KEY,
    drive_id VARCHAR(100) NOT NULL,
    student_id VARCHAR(100) NOT NULL,
    user_id UUID,
    register_number VARCHAR(100),
    student_name VARCHAR(255),
    department VARCHAR(100),
    company_name VARCHAR(255),
    role_title VARCHAR(255),
    ctc_range VARCHAR(100),
    cgpa_at_application NUMERIC(4,2),
    attendance_at_application NUMERIC(5,2),
    status VARCHAR(50) DEFAULT 'applied',
    interview_date VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS student_grievances (
    id UUID PRIMARY KEY,
    reference VARCHAR(100) NOT NULL UNIQUE,
    user_id UUID NOT NULL,
    reporter_name VARCHAR(255),
    reporter_email VARCHAR(255),
    category VARCHAR(100) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    is_anonymous BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'Received',
    admin_response_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS sports_memberships (
    id UUID PRIMARY KEY,
    team_id VARCHAR(100) NOT NULL,
    user_id UUID NOT NULL,
    student_name VARCHAR(255),
    register_number VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS club_members (
    id UUID PRIMARY KEY,
    club_id VARCHAR(100) NOT NULL,
    user_id UUID NOT NULL,
    student_name VARCHAR(255),
    register_number VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ywed_enrollments (
    id UUID PRIMARY KEY,
    course_id VARCHAR(100) NOT NULL,
    user_id UUID NOT NULL,
    student_name VARCHAR(255),
    register_number VARCHAR(100),
    status VARCHAR(50) DEFAULT 'enrolled',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alumni_profiles (
    id UUID PRIMARY KEY,
    user_id UUID,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50),
    department_code VARCHAR(50) NOT NULL,
    batch_year INTEGER NOT NULL,
    degree VARCHAR(100) NOT NULL,
    current_organization VARCHAR(255) NOT NULL,
    designation VARCHAR(255) NOT NULL,
    industry VARCHAR(100) NOT NULL,
    location VARCHAR(255) NOT NULL,
    linkedin_url TEXT,
    bio TEXT,
    skills TEXT DEFAULT '[]',
    is_mentor BOOLEAN DEFAULT false,
    mentorship_areas TEXT DEFAULT '[]',
    visibility VARCHAR(50) DEFAULT 'public',
    avatar_url TEXT,
    is_verified BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alumni_mentorship_requests (
    id UUID PRIMARY KEY,
    alumni_id VARCHAR(100) NOT NULL,
    alumni_name VARCHAR(255) NOT NULL,
    student_id UUID NOT NULL,
    student_name VARCHAR(255) NOT NULL,
    student_department VARCHAR(100) NOT NULL,
    student_register_number VARCHAR(100) NOT NULL,
    preferred_topic VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS iedc_projects (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    lead_student VARCHAR(255) NOT NULL,
    faculty_mentor VARCHAR(255) NOT NULL,
    domain VARCHAR(100) NOT NULL,
    funding_agency VARCHAR(255) DEFAULT 'IEDC DST / MSME',
    grant_amount NUMERIC(12,2) DEFAULT 25000.0,
    trl_level INTEGER DEFAULT 4,
    status VARCHAR(50) DEFAULT 'Incubating',
    patent_filed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ict_assets (
    id UUID PRIMARY KEY,
    asset_tag VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    location VARCHAR(255) NOT NULL,
    specifications TEXT,
    warranty_end_date DATE,
    vendor VARCHAR(255),
    health_status VARCHAR(50) DEFAULT 'Operational',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS student_clubs (
    id UUID PRIMARY KEY,
    activity_name VARCHAR(255) NOT NULL,
    unit_type VARCHAR(100) NOT NULL,
    activity_date DATE NOT NULL,
    venue VARCHAR(255) NOT NULL,
    description TEXT,
    volunteer_count INTEGER DEFAULT 50,
    credits INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY,
    user_id UUID,
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    details TEXT DEFAULT '{}',
    ip_address VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS e_content (
    id VARCHAR(100) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    course_code VARCHAR(50) NOT NULL,
    course_title VARCHAR(255) NOT NULL,
    semester INTEGER DEFAULT 1,
    faculty_id VARCHAR(100) NOT NULL,
    faculty_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(50) DEFAULT 'file',
    file_url TEXT,
    signed_url TEXT,
    external_url TEXT,
    thumbnail_url TEXT,
    duration_minutes INTEGER DEFAULT 20,
    tags TEXT DEFAULT '[]',
    status VARCHAR(50) DEFAULT 'published',
    views_count INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS econtent_bookmarks (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    content_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS econtent_progress (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    content_id VARCHAR(100) NOT NULL,
    progress_percentage INTEGER DEFAULT 0,
    last_position_seconds INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS research_projects (
    id VARCHAR(100) PRIMARY KEY,
    faculty_id VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    principal_investigator VARCHAR(255) NOT NULL,
    co_investigator VARCHAR(255),
    department_code VARCHAR(50) NOT NULL,
    funding_agency VARCHAR(255) NOT NULL,
    project_type VARCHAR(100) DEFAULT 'Major',
    sanctioned_amount NUMERIC(14,2) NOT NULL,
    start_date VARCHAR(50) NOT NULL,
    end_date VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'Ongoing',
    description TEXT,
    grant_sanction_order VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS faculty_publications (
    id VARCHAR(100) PRIMARY KEY,
    faculty_id VARCHAR(100) NOT NULL,
    faculty_name VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    authors TEXT DEFAULT '[]',
    department_code VARCHAR(50) NOT NULL,
    journal_name VARCHAR(255) NOT NULL,
    indexing VARCHAR(100) DEFAULT 'Scopus',
    impact_factor NUMERIC(6,2),
    issn_isbn VARCHAR(100),
    volume_issue_pages VARCHAR(255),
    publication_year INTEGER NOT NULL,
    doi_or_url TEXT,
    paper_type VARCHAR(100) DEFAULT 'Journal',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mentoring_records (
    id VARCHAR(100) PRIMARY KEY,
    student_id VARCHAR(100) NOT NULL,
    faculty_id VARCHAR(100) NOT NULL,
    meeting_date VARCHAR(50) NOT NULL,
    meeting_type VARCHAR(100) NOT NULL,
    academic_notes TEXT,
    personal_notes TEXT,
    goals TEXT,
    follow_up TEXT,
    next_meeting VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mentoring_goals (
    id VARCHAR(100) PRIMARY KEY,
    student_id VARCHAR(100) NOT NULL,
    faculty_id VARCHAR(100),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    target_date VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mentorship_assignments (
    id VARCHAR(100) PRIMARY KEY,
    student_id VARCHAR(100) NOT NULL,
    faculty_id VARCHAR(100) NOT NULL,
    assigned_date VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    entity_type VARCHAR(100),
    entity_id VARCHAR(100),
    link TEXT,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS device_tokens (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    token TEXT NOT NULL UNIQUE,
    device_type VARCHAR(50) DEFAULT 'web',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS iqac_meetings (
    id VARCHAR(100) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    meeting_number VARCHAR(100) NOT NULL,
    meeting_date VARCHAR(50) NOT NULL,
    venue VARCHAR(255) DEFAULT 'IQAC Conference Room',
    attendees TEXT DEFAULT '[]',
    agenda TEXT DEFAULT '[]',
    minutes TEXT,
    decisions TEXT DEFAULT '[]',
    action_items_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS iqac_action_items (
    id VARCHAR(100) PRIMARY KEY,
    meeting_id VARCHAR(100),
    title VARCHAR(255) NOT NULL,
    responsible_person_or_dept VARCHAR(255) NOT NULL,
    target_date VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    evidence_url TEXT,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS iqac_initiatives (
    id VARCHAR(100) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    academic_year VARCHAR(50) DEFAULT '2025-2026',
    coordinator VARCHAR(255) NOT NULL,
    objectives TEXT NOT NULL,
    target_kpi TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'Active',
    impact_metrics TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS iqac_feedback_cycles (
    id VARCHAR(100) PRIMARY KEY,
    academic_year VARCHAR(50) NOT NULL,
    cycle_name VARCHAR(255) NOT NULL,
    stakeholder_type VARCHAR(100) NOT NULL,
    start_date VARCHAR(50) NOT NULL,
    end_date VARCHAR(50) NOT NULL,
    total_responses INTEGER DEFAULT 0,
    satisfaction_rate REAL DEFAULT 0.0,
    status VARCHAR(50) DEFAULT 'Active',
    action_taken_report_url TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS iqac_aqar_documents (
    id VARCHAR(100) PRIMARY KEY,
    academic_year VARCHAR(50) NOT NULL,
    criteria_number INTEGER DEFAULT 1,
    criteria_name VARCHAR(255) NOT NULL,
    file_title VARCHAR(255) NOT NULL,
    document_url TEXT NOT NULL,
    submitted_to_naac BOOLEAN DEFAULT true,
    submission_date VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alumni_opportunities (
    id VARCHAR(100) PRIMARY KEY,
    alumni_id VARCHAR(100) NOT NULL,
    alumni_name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    role_title VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    opportunity_type VARCHAR(50) DEFAULT 'Job',
    description TEXT NOT NULL,
    apply_link_or_email VARCHAR(255) NOT NULL,
    posted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alumni_stories (
    id VARCHAR(100) PRIMARY KEY,
    alumni_id VARCHAR(100) NOT NULL,
    alumni_name VARCHAR(255) NOT NULL,
    batch_year INTEGER NOT NULL,
    department_code VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    story_text TEXT NOT NULL,
    current_role VARCHAR(255) NOT NULL,
    photo_url TEXT,
    published_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS acide_startups (
    id VARCHAR(100) PRIMARY KEY,
    startup_name VARCHAR(255) NOT NULL,
    founder_names TEXT DEFAULT '[]',
    department VARCHAR(255) NOT NULL,
    founded_year INTEGER DEFAULT 2024,
    tagline TEXT,
    description TEXT,
    revenue_stage VARCHAR(100) DEFAULT 'Incubated',
    logo_url TEXT,
    website_url TEXT,
    mentors TEXT DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transport_routes (
    id VARCHAR(100) PRIMARY KEY,
    route_number VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    start_point VARCHAR(255) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    bus_registration VARCHAR(100) NOT NULL,
    driver_name VARCHAR(255) NOT NULL,
    driver_phone VARCHAR(50) NOT NULL,
    total_stops INTEGER DEFAULT 0,
    morning_departure VARCHAR(50) NOT NULL,
    morning_arrival_sfrc VARCHAR(50) NOT NULL,
    evening_departure_sfrc VARCHAR(50) NOT NULL,
    evening_arrival_terminus VARCHAR(50) NOT NULL,
    capacity INTEGER DEFAULT 40,
    occupied_seats INTEGER DEFAULT 0,
    note TEXT,
    stops TEXT DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
"""


async def init_database():
    """Execute schema creation statements on startup to guarantee all tables exist."""
    try:
        async with engine.begin() as conn:
            for statement in SCHEMA_DDL.strip().split(";"):
                stmt = statement.strip()
                if stmt:
                    try:
                        await conn.execute(text(stmt))
                    except Exception as ex:
                        logger.warning(f"Table statement notice: {ex}")
            
            # Safe column migrations
            migrations = [
                "ALTER TABLE user_profiles ADD COLUMN preferences TEXT DEFAULT '{}'",
                "ALTER TABLE placement_applications ADD COLUMN user_id UUID",
                "ALTER TABLE placement_applications ADD COLUMN department VARCHAR(100)",
                "ALTER TABLE placement_applications ADD COLUMN company_name VARCHAR(255)",
                "ALTER TABLE placement_applications ADD COLUMN role_title VARCHAR(255)",
                "ALTER TABLE placement_applications ADD COLUMN ctc_range VARCHAR(100)",
                "ALTER TABLE placement_applications ADD COLUMN cgpa_at_application NUMERIC(4,2)",
                "ALTER TABLE placement_applications ADD COLUMN attendance_at_application NUMERIC(5,2)",
                "ALTER TABLE placement_applications ADD COLUMN updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP",
            ]
            for mig in migrations:
                try:
                    await conn.execute(text(mig))
                except Exception:
                    pass

            # Seed Phase 5 default records if tables are empty
            try:
                econtent_count = (await conn.execute(text("SELECT count(*) FROM e_content"))).scalar()
                if not econtent_count:
                    seeds_ec = [
                        ("ec-01", "Data Structures & Algorithms: Visual Mindmap & Complexity Trees", "Comprehensive visual memory map covering binary search trees, AVL rotations, graph traversals, and Big-O asymptotics.", "Mindmap", "Computer Science", "CS201", "Data Structures & Algorithms", 3, "fac-01", "Dr. K. Anitha", "file", "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80", None, "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80", 15, '["Data Structures", "Mindmap", "Algorithms", "Trees", "Sorting"]', "published", 840, 142),
                        ("ec-02", "Python for Data Science: NumPy, Pandas & Matplotlib Masterclass", "Full lecture recording covering data cleaning, multi-dimensional array manipulation, and statistical visualization pipelines.", "Video", "Computer Science", "CS304", "Python for Data Analytics", 5, "fac-02", "Dr. M. Rajesh", "external_url", None, None, "https://www.youtube.com/watch?v=rfscVS0vtbw", "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80", 45, '["Python", "Data Science", "NumPy", "Pandas", "Video"]', "published", 1250, 310),
                        ("ec-03", "Computer Networks: OSI & TCP/IP Protocol Architecture Mindmap", "Detailed conceptual chart detailing header encapsulation, subnetting, BGP/OSPF routing, and transport handshake mechanisms.", "Mindmap", "Computer Science", "CS206", "Computer Networks", 4, "fac-01", "Dr. K. Anitha", "file", "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=1200&q=80", None, "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=600&q=80", 20, '["Networks", "OSI Model", "TCP/IP", "Protocols", "Mindmap"]', "published", 620, 98),
                        ("ec-04", "Organic Chemistry Laboratory Safety Protocols & Reagent Handling", "Standard Operating Procedures (SOP), chemical fume hood guidelines, MSDS compliance, and emergency spill containment guide.", "Document", "Chemistry", "CHE101", "General & Organic Chemistry Practical", 1, "fac-03", "Dr. P. Sundaram", "file", "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", None, "https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?auto=format&fit=crop&w=600&q=80", 25, '["Chemistry", "Lab Safety", "SOP", "Document", "PDF"]', "published", 480, 65),
                        ("ec-05", "Differential & Integral Calculus: Multi-Variable Interactive Module", "Interactive HTML5 learning simulation with gradient vectors, double integrals in polar coordinates, and 3D surface visualizations.", "E-Learning", "Mathematics", "MAT201", "Calculus & Vector Analysis", 3, "fac-04", "Dr. A. Bhuvaneshwari", "external_url", None, None, "https://nptel.ac.in/courses/111105122", "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=600&q=80", 50, '["Mathematics", "Calculus", "Interactive", "E-Learning", "NPTEL"]', "published", 790, 135),
                        ("ec-06", "Professional Communication & Corporate Presentation Skills", "Masterclass on executive presentation delivery, business email etiquette, cross-cultural communication, and interview readiness.", "Video", "English", "ENG102", "Professional Communication", 2, "fac-05", "Mrs. V. Lakshmi", "external_url", None, None, "https://www.youtube.com/watch?v=dEB1wY_Vn6w", "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=600&q=80", 35, '["English", "Communication", "Soft Skills", "Video", "Career"]', "published", 910, 210),
                        ("ec-07", "Corporate Accounting: Double Entry Bookkeeping & Final Accounts", "Explanatory study module and case problems on trial balances, ledger adjustments, depreciation accounting, and balance sheet preparation.", "Document", "Commerce", "COM101", "Financial Accounting I", 1, "fac-06", "Dr. R. Kavitha", "file", "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", None, "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80", 30, '["Commerce", "Accounting", "Financials", "Document", "PDF"]', "published", 680, 112),
                        ("ec-08", "Modern Optics & Laser Physics: Audio Lecture Series (Episode 1)", "High-fidelity audio lecture on wave-particle duality, stimulated photon emission, population inversion, and semiconductor diode lasers.", "Audio", "Physics", "PHY302", "Optics & Quantum Physics", 5, "fac-07", "Dr. S. Meenakshi", "file", "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", None, "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=600&q=80", 28, '["Physics", "Optics", "Lasers", "Audio", "Podcast"]', "published", 530, 88),
                    ]
                    for s in seeds_ec:
                        await conn.execute(text("""
                            INSERT INTO e_content (id, title, description, category, department, course_code, course_title, semester, faculty_id, faculty_name, content_type, file_url, signed_url, external_url, thumbnail_url, duration_minutes, tags, status, views_count, likes_count)
                            VALUES (:id, :title, :description, :category, :department, :course_code, :course_title, :semester, :faculty_id, :faculty_name, :content_type, :file_url, :signed_url, :external_url, :thumbnail_url, :duration_minutes, :tags, :status, :views_count, :likes_count)
                        """), {
                            "id": s[0], "title": s[1], "description": s[2], "category": s[3], "department": s[4], "course_code": s[5], "course_title": s[6], "semester": s[7], "faculty_id": s[8], "faculty_name": s[9], "content_type": s[10], "file_url": s[11], "signed_url": s[12], "external_url": s[13], "thumbnail_url": s[14], "duration_minutes": s[15], "tags": s[16], "status": s[17], "views_count": s[18], "likes_count": s[19]
                        })
            except Exception as e:
                logger.warning(f"E-content seeding notice: {e}")

            try:
                proj_count = (await conn.execute(text("SELECT count(*) FROM research_projects"))).scalar()
                if not proj_count:
                    seeds_proj = [
                        ("proj-cs-01", "fac-cs-01", "AI-Driven Precision Agriculture & Pest Detection in Cotton Fields", "Dr. R. Meenakshi", "Dr. S. Kavitha", "CS", "DST-SERB (Science & Engineering Research Board)", "Major", 2850000.0, "2024-04-01", "2027-03-31", "Ongoing", "Developing deep learning edge inference architectures for real-time mobile disease diagnostics for regional farmers.", "DST/SERB/CRG/2024/004921"),
                        ("proj-chem-02", "fac-chem-01", "Green Synthesis of Bio-Nanocomposites for Industrial Wastewater Remediation", "Dr. K. Arulmozhi", None, "CHEM", "UGC (University Grants Commission)", "Major", 1650000.0, "2023-08-01", "2026-07-31", "Ongoing", "Utilizing agricultural waste extracts for catalytic dye degradation and heavy metal removal from textile effluents.", "UGC/MRP/CHEM/2023/1182"),
                        ("proj-phy-03", "fac-phy-01", "Fabrication of Perovskite Thin-Film Solar Cells for High Efficiency Photovoltaics", "Dr. P. Suganya", "Dr. M. Deepa", "PHY", "TNSCST (Tamil Nadu State Council for Science and Technology)", "Minor", 450000.0, "2025-01-10", "2026-12-31", "Ongoing", "Exploring novel doping techniques in organometallic halide crystals to enhance atmospheric thermal stability.", "TNSCST/STP/2025/084"),
                        ("proj-math-04", "fac-math-01", "Stochastic Modeling & Stability Analysis in Biological Epidemic Networks", "Dr. V. Gomathi", None, "MATH", "SFRC Institutional Seed Grant", "Seed Grant", 150000.0, "2025-06-01", "2026-05-31", "Completed", "Formulating fractional differential dynamical models for multi-strain pathogen transmission vectors.", "SFRC/ISG/2025/012"),
                    ]
                    for p in seeds_proj:
                        await conn.execute(text("""
                            INSERT INTO research_projects (id, faculty_id, title, principal_investigator, co_investigator, department_code, funding_agency, project_type, sanctioned_amount, start_date, end_date, status, description, grant_sanction_order)
                            VALUES (:id, :faculty_id, :title, :principal_investigator, :co_investigator, :department_code, :funding_agency, :project_type, :sanctioned_amount, :start_date, :end_date, :status, :description, :grant_sanction_order)
                        """), {
                            "id": p[0], "faculty_id": p[1], "title": p[2], "principal_investigator": p[3], "co_investigator": p[4], "department_code": p[5], "funding_agency": p[6], "project_type": p[7], "sanctioned_amount": p[8], "start_date": p[9], "end_date": p[10], "status": p[11], "description": p[12], "grant_sanction_order": p[13]
                        })
            except Exception as e:
                logger.warning(f"Research projects seeding notice: {e}")

            try:
                pub_count = (await conn.execute(text("SELECT count(*) FROM faculty_publications"))).scalar()
                if not pub_count:
                    seeds_pub = [
                        ("pub-001", "fac-cs-01", "Dr. R. Meenakshi", "Lightweight Transformer Network for Early Foliar Disease Classification in Edge Devices", '["R. Meenakshi", "S. Kavitha", "K. Raman"]', "CS", "IEEE Transactions on Agri-Food Electronics & Computing", "Scopus", 4.8, "2690-5421", "Vol. 12, Issue 3, pp. 245-258", 2026, "https://doi.org/10.1109/TAFEC.2026.3190241", "Journal"),
                        ("pub-002", "fac-chem-01", "Dr. K. Arulmozhi", "Ecofriendly Biosynthesis of ZnO Nanoparticles from Moringa Oleifera: Photocatalytic and Antimicrobial Efficacy", '["K. Arulmozhi", "T. Selvi"]', "CHEM", "Journal of Environmental Chemical Engineering", "Web of Science", 7.4, "2213-3437", "Vol. 14, pp. 109823", 2025, "https://doi.org/10.1016/j.jece.2025.109823", "Journal"),
                        ("pub-003", "fac-phy-01", "Dr. P. Suganya", "Influence of Halide Substitution on Bandgap Tuning in Lead-Free Double Perovskites", '["P. Suganya", "M. Deepa"]', "PHY", "Applied Surface Science Advances", "Scopus", 5.1, "2666-5239", "Vol. 22, pp. 100589", 2026, "https://doi.org/10.1016/j.apsadv.2026.100589", "Journal"),
                    ]
                    for pb in seeds_pub:
                        await conn.execute(text("""
                            INSERT INTO faculty_publications (id, faculty_id, faculty_name, title, authors, department_code, journal_name, indexing, impact_factor, issn_isbn, volume_issue_pages, publication_year, doi_or_url, paper_type)
                            VALUES (:id, :faculty_id, :faculty_name, :title, :authors, :department_code, :journal_name, :indexing, :impact_factor, :issn_isbn, :volume_issue_pages, :publication_year, :doi_or_url, :paper_type)
                        """), {
                            "id": pb[0], "faculty_id": pb[1], "faculty_name": pb[2], "title": pb[3], "authors": pb[4], "department_code": pb[5], "journal_name": pb[6], "indexing": pb[7], "impact_factor": pb[8], "issn_isbn": pb[9], "volume_issue_pages": pb[10], "publication_year": pb[11], "doi_or_url": pb[12], "paper_type": pb[13]
                        })
            except Exception as e:
                logger.warning(f"Publications seeding notice: {e}")

            try:
                notif_count = (await conn.execute(text("SELECT count(*) FROM notifications"))).scalar()
                if not notif_count:
                    seeds_notif = [
                        ("notif-001", "00000000-0000-0000-0000-000000000001", "CIA-2 Examination Schedule Published", "The Continuous Internal Assessment 2 timetable for Semester VI is now available on your portal.", "info", "exam", "exam-cia2-2026", "/student/exams", False, "2026-09-30T07:30:00Z"),
                        ("notif-002", "00000000-0000-0000-0000-000000000001", "Campus Care Ticket Updated", "Your complaint regarding Lab 3 projector has been marked as In Progress by the IT Maintenance team.", "complaint", "complaint", "CC-00023", "/student/campus-care", False, "2026-09-30T06:15:00Z"),
                        ("notif-003", "00000000-0000-0000-0000-000000000001", "TechSpark 2026 Registration Confirmed", "Your team registration for the National Level Hackathon has been verified by the event coordinator.", "event", "event", "ev-1", "/student/events", False, "2026-09-29T14:20:00Z"),
                        ("notif-004", "00000000-0000-0000-0000-000000000001", "Attendance Alert: 22UCSE63", "Your subject attendance in Machine Learning Fundamentals is currently at 76.5%. Ensure attendance remains above 75%.", "attendance", "attendance", "22UCSE63", "/student/academics", True, "2026-09-28T11:00:00Z"),
                        ("notif-005", "00000000-0000-0000-0000-000000000001", "Library Book Due Reminder", "Return 'Cloud Computing Concepts' (Acc No. 44102) to the IRC library by Friday to avoid overdue fines.", "library", "library", "book-44102", "/student/library", True, "2026-09-27T09:45:00Z"),
                    ]
                    for n in seeds_notif:
                        await conn.execute(text("""
                            INSERT INTO notifications (id, user_id, title, message, type, entity_type, entity_id, link, read, created_at, updated_at)
                            VALUES (:id, :user_id, :title, :message, :type, :entity_type, :entity_id, :link, :read, :created_at, :created_at)
                        """), {
                            "id": n[0], "user_id": n[1], "title": n[2], "message": n[3], "type": n[4], "entity_type": n[5], "entity_id": n[6], "link": n[7], "read": 1 if n[8] else 0, "created_at": n[9]
                        })
            except Exception as e:
                logger.warning(f"Notifications seeding notice: {e}")

            # Seed Phase 9: IQAC, Alumni Opportunities, Stories, ACIDE Startups, Transport Routes
            try:
                iqac_m_count = (await conn.execute(text("SELECT count(*) FROM iqac_meetings"))).scalar()
                if not iqac_m_count:
                    seeds_iqac_m = [
                        ("meet-01", "IQAC Statutory Meeting I — Curriculum Enrichment & OBE Review", "IQAC/2026/M1", "2026-06-15", "IQAC Board Room", '["Dr. R. Sudha (Principal / Chairperson)", "Dr. S. Sivakama Sundari (IQAC Coordinator)", "Dr. R. Meenakshi (CS HOD)", "Dr. K. Arulmozhi (Chem)", "Mr. G. Sundar (Industry Expert)"]', '["Review of Outcome-Based Education (OBE) course attainment matrices for 2025-2026", "AI and Data Science curriculum integration across UG sciences", "Faculty development workshop on digital pedagogy"]', "The chairperson commended all departments for achieving 88% overall attainment target. Resolved to introduce 20% AI micro-modules across all discipline electives.", '["Implement rubric-based continuous internal evaluation for all laboratory courses", "Sanction institutional seed grant of ₹5 Lakhs for student IoT prototypes"]', 2, "2026-06-16T10:00:00Z", "2026-06-18T14:00:00Z"),
                        ("meet-02", "IQAC Statutory Meeting II — NAAC SSR Criteria Assessment", "IQAC/2026/M2", "2026-08-20", "IQAC Board Room", '["Dr. R. Sudha", "Dr. S. Sivakama Sundari", "Dr. P. Stella", "Dr. M. Deepalakshmi", "Ms. Ananya K. (Alumni Rep)"]', '["Review of NAAC Criterion 3 (Research, Innovations & Extension)", "Campus Care CivicFix SLA analytics compliance", "Green campus energy audit report presentation"]', "Evaluated the Scopus publication trajectory. Recommended establishing ACIDE student entrepreneurship demo day in October.", '["Approve annual energy audit contract with certified BEE auditor", "Mandate all PG scholars to register for at least 1 Swayam/NPTEL MOOC"]', 2, "2026-08-21T11:30:00Z", "2026-08-22T09:00:00Z"),
                        ("meet-03", "IQAC Statutory Meeting III — Student Satisfaction Survey & Infrastructure", "IQAC/2026/M3", "2026-09-10", "IQAC Board Room", '["Dr. R. Sudha", "Dr. S. Sivakama Sundari", "Dr. K. Chitra", "Dr. G. Uma Maheswari", "Dr. V. Gomathi"]', '["Analysis of Student Satisfaction Survey (SSS) responses", "Expansion of high-bandwidth Wi-Fi access in women hostel blocks", "YWED vocational training certifications review"]', "Student satisfaction scored 92.4% across teaching quality and library facilities. Hostel Wi-Fi upgrade approved.", '["Authorize high-speed fiber backbone expansion for Block C and D", "Launch 5 new short-term YWED crafts courses for rural artisans"]', 1, "2026-09-11T14:00:00Z", "2026-09-12T16:00:00Z"),
                    ]
                    for im in seeds_iqac_m:
                        await conn.execute(text("""
                            INSERT INTO iqac_meetings (id, title, meeting_number, meeting_date, venue, attendees, agenda, minutes, decisions, action_items_count, created_at, updated_at)
                            VALUES (:id, :title, :meeting_number, :meeting_date, :venue, :attendees, :agenda, :minutes, :decisions, :action_items_count, :created_at, :updated_at)
                        """), {
                            "id": im[0], "title": im[1], "meeting_number": im[2], "meeting_date": im[3], "venue": im[4], "attendees": im[5], "agenda": im[6], "minutes": im[7], "decisions": im[8], "action_items_count": im[9], "created_at": im[10], "updated_at": im[11]
                        })

                iqac_act_count = (await conn.execute(text("SELECT count(*) FROM iqac_action_items"))).scalar()
                if not iqac_act_count:
                    seeds_iqac_act = [
                        ("act-01", "meet-01", "Formulate 20% AI & Data Literacy micro-syllabus for all UG Science majors", "Dean of Academic Affairs & CS Board of Studies", "2026-07-30", "Completed", "https://sfrc.edu.in/iqac/evidence/BOS_AI_Curriculum_2026.pdf", "Approved by Academic Council on July 28, 2026.", "2026-06-16T10:00:00Z", "2026-07-29T11:00:00Z"),
                        ("act-02", "meet-01", "Conduct Faculty Development Workshop on Digital Assessment & Question Banks", "Dr. S. Sivakama Sundari (IQAC)", "2026-08-10", "Completed", "https://sfrc.edu.in/iqac/evidence/FDP_Digital_Pedagogy_Report.pdf", "128 faculty members attended and certified.", "2026-06-16T10:00:00Z", "2026-08-11T15:30:00Z"),
                        ("act-03", "meet-02", "Establish Atal Community Innovation (ACIDE) startup demo kiosk in main foyer", "IEDC / ACIDE Cell Coordinators", "2026-10-15", "In Progress", None, "Structural design finalized; 7 student startups ready with products.", "2026-08-21T11:30:00Z", "2026-09-20T10:00:00Z"),
                        ("act-04", "meet-02", "Conduct Green Energy & Carbon Footprint Audit with BEE Accredited Auditor", "Department of Physics & Environmental Club", "2026-11-01", "In Progress", None, "Field data collection underway across solar rooftops and water recharge pits.", "2026-08-21T11:30:00Z", "2026-09-25T12:00:00Z"),
                        ("act-05", "meet-03", "Upgrade Gigabit Wi-Fi Access Points in Hostels Block C and D", "Campus Network & IT Systems Team", "2026-10-30", "Pending", None, "Hardware quotation approved; installation scheduled for next week.", "2026-09-11T14:00:00Z", "2026-09-11T14:00:00Z"),
                    ]
                    for ia in seeds_iqac_act:
                        await conn.execute(text("""
                            INSERT INTO iqac_action_items (id, meeting_id, title, responsible_person_or_dept, target_date, status, evidence_url, remarks, created_at, updated_at)
                            VALUES (:id, :meeting_id, :title, :responsible_person_or_dept, :target_date, :status, :evidence_url, :remarks, :created_at, :updated_at)
                        """), {
                            "id": ia[0], "meeting_id": ia[1], "title": ia[2], "responsible_person_or_dept": ia[3], "target_date": ia[4], "status": ia[5], "evidence_url": ia[6], "remarks": ia[7], "created_at": ia[8], "updated_at": ia[9]
                        })

                iqac_init_count = (await conn.execute(text("SELECT count(*) FROM iqac_initiatives"))).scalar()
                if not iqac_init_count:
                    seeds_iqac_init = [
                        ("init-01", "Project Pragya — AI-Powered Autonomous Learning & Personalized Mentoring", "2025-2026", "Dr. R. Meenakshi & Dr. S. Sivakama Sundari", "Deploy localized LLM agents to deliver 24/7 syllabus tutoring, CIA marks analytics, and early shortage alerts.", "100% student adoption with >= 85% attendance attainment across all departments.", "Active", "Reduced academic grievance resolution time by 60% and increased CIA pass rate to 96.2%.", "2025-07-01T09:00:00Z"),
                        ("init-02", "EmpowHer Rural Skills — YWED Micro-Enterprise Incubator", "2025-2026", "Dr. G. Uma Maheswari", "Provide hands-on vocational certifications in traditional handloom, bio-cosmetics, and eco-jute products for economic independence.", "Certify 500+ women students annually with minimum 5 campus revenue startups.", "Active", "7 thriving startups incubated under ACIDE with over ₹8.5 Lakhs generated in campus craft sales.", "2025-07-15T10:00:00Z"),
                    ]
                    for ii in seeds_iqac_init:
                        await conn.execute(text("""
                            INSERT INTO iqac_initiatives (id, title, academic_year, coordinator, objectives, target_kpi, status, impact_metrics, created_at)
                            VALUES (:id, :title, :academic_year, :coordinator, :objectives, :target_kpi, :status, :impact_metrics, :created_at)
                        """), {
                            "id": ii[0], "title": ii[1], "academic_year": ii[2], "coordinator": ii[3], "objectives": ii[4], "target_kpi": ii[5], "status": ii[6], "impact_metrics": ii[7], "created_at": ii[8]
                        })

                iqac_fb_count = (await conn.execute(text("SELECT count(*) FROM iqac_feedback_cycles"))).scalar()
                if not iqac_fb_count:
                    seeds_iqac_fb = [
                        ("fb-01", "2025-2026", "Mid-Term Student Satisfaction Survey (SSS)", "Students", "2026-08-01", "2026-08-20", 2840, 92.4, "Analyzed", "https://sfrc.edu.in/iqac/feedback/SSS_ATR_2026.pdf", "2026-08-01T09:00:00Z"),
                        ("fb-02", "2025-2026", "Annual Alumni Curriculum Feedback & Industry Readiness", "Alumni", "2026-09-01", "2026-09-30", 612, 94.8, "Active", None, "2026-09-01T09:00:00Z"),
                    ]
                    for ifb in seeds_iqac_fb:
                        await conn.execute(text("""
                            INSERT INTO iqac_feedback_cycles (id, academic_year, cycle_name, stakeholder_type, start_date, end_date, total_responses, satisfaction_rate, status, action_taken_report_url, created_at)
                            VALUES (:id, :academic_year, :cycle_name, :stakeholder_type, :start_date, :end_date, :total_responses, :satisfaction_rate, :status, :action_taken_report_url, :created_at)
                        """), {
                            "id": ifb[0], "academic_year": ifb[1], "cycle_name": ifb[2], "stakeholder_type": ifb[3], "start_date": ifb[4], "end_date": ifb[5], "total_responses": ifb[6], "satisfaction_rate": ifb[7], "status": ifb[8], "action_taken_report_url": ifb[9], "created_at": ifb[10]
                        })

                iqac_aq_count = (await conn.execute(text("SELECT count(*) FROM iqac_aqar_documents"))).scalar()
                if not iqac_aq_count:
                    seeds_iqac_aq = [
                        ("aqar-01", "2024-2025", 1, "Curricular Aspects (Criterion I)", "SFRC_AQAR_2024-25_Criterion_I_Curricular_Enrichment.pdf", "https://sfrc.edu.in/iqac/aqar/2024-25/Criterion_1_Curricular.pdf", True, "2025-12-18", "2025-12-19T10:00:00Z"),
                    ]
                    for iaq in seeds_iqac_aq:
                        await conn.execute(text("""
                            INSERT INTO iqac_aqar_documents (id, academic_year, criteria_number, criteria_name, file_title, document_url, submitted_to_naac, submission_date, created_at)
                            VALUES (:id, :academic_year, :criteria_number, :criteria_name, :file_title, :document_url, :submitted_to_naac, :submission_date, :created_at)
                        """), {
                            "id": iaq[0], "academic_year": iaq[1], "criteria_number": iaq[2], "criteria_name": iaq[3], "file_title": iaq[4], "document_url": iaq[5], "submitted_to_naac": 1 if iaq[6] else 0, "submission_date": iaq[7], "created_at": iaq[8]
                        })

                alumni_opp_count = (await conn.execute(text("SELECT count(*) FROM alumni_opportunities"))).scalar()
                if not alumni_opp_count:
                    seeds_alumni_opp = [
                        ("opp-01", "alm-01", "Dr. Priya Sundaram", "Google Cloud", "Software Engineering Intern - Cloud Core", "Bangalore (Hybrid)", "Internship", "Looking for pre-final and final year CS/IT students with strong data structures and Go/Java fundamentals.", "careers.google.com/jobs/results/12345", "2026-09-15T10:00:00Z"),
                        ("opp-02", "alm-02", "Ananya Krishnan", "Deloitte USI", "Associate Financial Analyst (Off-Campus Drive)", "Hyderabad", "Job", "Opportunity for B.Com/BBA graduates with skills in financial modeling and corporate taxation.", "deloitte.com/careers/opp-02", "2026-09-20T14:30:00Z"),
                        ("opp-03", "alm-04", "Dr. Sharmila Devi", "AstraZeneca India", "Research Associate — Computational Drug Discovery", "Chennai", "Job", "Postgraduates in Chemistry/Biotechnology invited for direct employee referral.", "referrals.astrazeneca.com/ref-9821", "2026-09-22T09:15:00Z"),
                    ]
                    for ao in seeds_alumni_opp:
                        await conn.execute(text("""
                            INSERT INTO alumni_opportunities (id, alumni_id, alumni_name, company_name, role_title, location, opportunity_type, description, apply_link_or_email, posted_at, created_at)
                            VALUES (:id, :alumni_id, :alumni_name, :company_name, :role_title, :location, :opportunity_type, :description, :apply_link_or_email, :posted_at, :posted_at)
                        """), {
                            "id": ao[0], "alumni_id": ao[1], "alumni_name": ao[2], "company_name": ao[3], "role_title": ao[4], "location": ao[5], "opportunity_type": ao[6], "description": ao[7], "apply_link_or_email": ao[8], "posted_at": ao[9]
                        })

                acide_count = (await conn.execute(text("SELECT count(*) FROM acide_startups"))).scalar()
                if not acide_count:
                    seeds_acide = [
                        ("startup-01", "Kissan Innova", '["Kavitha R.", "Pooja M."]', "Computer Science & Agriculture Tech", 2023, "Smart IoT & AI sensors for soil moisture optimization and automated drip irrigation.", "Kissan Innova manufactures solar-powered IoT probe stations paired with vernacular mobile advisory for regional cotton and maize farmers.", "Revenue Generating", "https://images.unsplash.com/photo-1586771107445-d3ca888129ff?w=300&auto=format&fit=crop&q=80", "https://kissaninnova.sfrc.in", '["Dr. R. Meenakshi", "Er. G. Sundar (AgriTech Advisor)"]', "2023-08-15T10:00:00Z"),
                        ("startup-02", "Yos Deliza", '["Yogitha S.", "Deepika K."]', "Home Science & Food Processing", 2024, "Nutritious farm-to-fork millet bakery products and natural health snack bars.", "Yos Deliza produces zero-preservative, gluten-free ragi, barnyard, and foxtail millet cookies and protein bars distributed across South Tamil Nadu retail outlets.", "Incubated", "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&auto=format&fit=crop&q=80", "https://yosdeliza.sfrc.in", '["Dr. S. Sivakama Sundari", "Chef M. Ramesh"]', "2024-01-20T11:00:00Z"),
                        ("startup-03", "Kraftiga", '["Archana P.", "Lavanya N."]', "Fine Arts & Design", 2023, "Handcrafted sustainable event mementos, terracotta arts, and biodegradable corporate gifts.", "Kraftiga empowers rural women artisans by upcycling natural clay, palm leaves, and jute into premium corporate hampers and artistic merchandise.", "Revenue Generating", "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=300&auto=format&fit=crop&q=80", "https://kraftiga.sfrc.in", '["Dr. G. Uma Maheswari", "Ms. Ananya K. (Alumni)"]', "2023-11-10T14:00:00Z"),
                        ("startup-04", "Thukhil", '["Revathi M.", "Swathi B."]', "Costume Design & Fashion", 2022, "Contemporary ethnic wear and eco-friendly organic cotton apparel.", "Thukhil blends traditional handloom artistry with modern silhouettes for sustainable everyday fashion.", "Scaled", "https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=300&auto=format&fit=crop&q=80", "https://thukhiltextiles.sfrc.in", '["Dr. P. Stella"]', "2022-09-01T10:00:00Z"),
                        ("startup-05", "Belle", '["Harini V.", "Divya T."]', "Chemistry & Cosmetology", 2024, "Ayurvedic botanical skincare formulations and herbal face elixirs.", "Belle formulates certified chemical-free, cold-pressed facial care items made from organic campus garden botanicals.", "Incubated", "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=300&auto=format&fit=crop&q=80", "https://bellebotanics.sfrc.in", '["Dr. K. Arulmozhi"]', "2024-01-10T10:00:00Z"),
                        ("startup-06", "ChemEmpor", '["Sharmila K.", "Janani R."]', "Chemistry", 2023, "Non-toxic biodegradable laboratory cleaning agents and disinfectants.", "ChemEmpor manufactures eco-safe green detergents and industrial lab sanitation compounds.", "Revenue Generating", "https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=300&auto=format&fit=crop&q=80", "https://chemempor.sfrc.in", '["Dr. K. Arulmozhi"]', "2023-08-15T10:00:00Z"),
                        ("startup-07", "Explora", '["Keerthana M.", "Aishwarya S."]', "Computer Science & Education", 2024, "Interactive AR/VR science laboratory simulations for school students.", "Explora builds immersive 3D virtual chemistry and physics experiment modules for rural schools.", "Incubated", "https://images.unsplash.com/photo-1603006905003-be475563bc59?w=300&auto=format&fit=crop&q=80", "https://explorastudios.sfrc.in", '["Dr. R. Sudha"]', "2024-02-20T10:00:00Z"),
                    ]
                    for ac in seeds_acide:
                        await conn.execute(text("""
                            INSERT INTO acide_startups (id, startup_name, founder_names, department, founded_year, tagline, description, revenue_stage, logo_url, website_url, mentors, created_at)
                            VALUES (:id, :startup_name, :founder_names, :department, :founded_year, :tagline, :description, :revenue_stage, :logo_url, :website_url, :mentors, :created_at)
                        """), {
                            "id": ac[0], "startup_name": ac[1], "founder_names": ac[2], "department": ac[3], "founded_year": ac[4], "tagline": ac[5], "description": ac[6], "revenue_stage": ac[7], "logo_url": ac[8], "website_url": ac[9], "mentors": ac[10], "created_at": ac[11]
                        })

                trans_count = (await conn.execute(text("SELECT count(*) FROM transport_routes"))).scalar()
                if not trans_count:
                    import json
                    from app.api.v1.endpoints.transport import SEED_TRANSPORT_ROUTES
                    for tr in SEED_TRANSPORT_ROUTES:
                        await conn.execute(text("""
                            INSERT INTO transport_routes (id, route_number, name, start_point, destination, bus_registration, driver_name, driver_phone, total_stops, morning_departure, morning_arrival_sfrc, evening_departure_sfrc, evening_arrival_terminus, capacity, occupied_seats, note, stops, created_at)
                            VALUES (:id, :route_number, :name, :start_point, :destination, :bus_registration, :driver_name, :driver_phone, :total_stops, :morning_departure, :morning_arrival_sfrc, :evening_departure_sfrc, :evening_arrival_terminus, :capacity, :occupied_seats, :note, :stops, :created_at)
                        """), {
                            "id": tr["id"],
                            "route_number": tr["route_number"],
                            "name": tr["name"],
                            "start_point": tr["start_point"],
                            "destination": tr["destination"],
                            "bus_registration": tr["bus_registration"],
                            "driver_name": tr["driver_name"],
                            "driver_phone": tr["driver_phone"],
                            "total_stops": tr["total_stops"],
                            "morning_departure": tr["morning_departure"],
                            "morning_arrival_sfrc": tr["morning_arrival_sfrc"],
                            "evening_departure_sfrc": tr["evening_departure_sfrc"],
                            "evening_arrival_terminus": tr["evening_arrival_terminus"],
                            "capacity": tr["capacity"],
                            "occupied_seats": tr["occupied_seats"],
                            "note": tr.get("note") or "",
                            "stops": json.dumps(tr.get("stops") or []),
                            "created_at": datetime.now(timezone.utc).isoformat(),
                        })
            except Exception as e:
                logger.warning(f"Phase 9 tables seeding notice: {e}")

        logger.info("Database schema initialized successfully.")
    except Exception as e:
        logger.warning(f"Database auto-init skipped or partial: {e}")


