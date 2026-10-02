-- ============================================================
-- 001: PostgreSQL Extensions
-- Run this FIRST in Supabase SQL Editor
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Verify
SELECT extname, extversion FROM pg_extension WHERE extname IN ('uuid-ossp','vector');


-- ============================================================
-- 002: Core User / Role Tables
-- ============================================================

CREATE TABLE public.user_profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT        NOT NULL CHECK (role IN ('student','faculty','parent','admin')),
  full_name   TEXT        NOT NULL,
  email       TEXT        UNIQUE NOT NULL,
  phone       TEXT,
  avatar_url  TEXT,
  department_id UUID,
  is_active   BOOLEAN     DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.departments (
  id          UUID  PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT  NOT NULL,
  code        TEXT  UNIQUE NOT NULL,
  hod_name    TEXT,
  is_active   BOOLEAN DEFAULT true
);

CREATE TABLE public.programmes (
  id               UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             TEXT    NOT NULL,
  code             TEXT    UNIQUE NOT NULL,
  type             TEXT    CHECK (type IN ('UG','PG','PhD','Certificate','Diploma','Skill')),
  category         TEXT    CHECK (category IN ('Regular','SF')),
  department_id    UUID    REFERENCES public.departments(id),
  duration_years   INTEGER DEFAULT 3,
  is_active        BOOLEAN DEFAULT true
);

CREATE TABLE public.students (
  id                UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID    UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  register_number   TEXT    UNIQUE NOT NULL,
  programme_id      UUID    REFERENCES public.programmes(id),
  department_id     UUID    REFERENCES public.departments(id),
  current_semester  INTEGER DEFAULT 1,
  batch_year        INTEGER NOT NULL,
  date_of_joining   DATE,
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.faculty (
  id              UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID    UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id     TEXT    UNIQUE NOT NULL,
  department_id   UUID    REFERENCES public.departments(id),
  designation     TEXT,
  specialization  TEXT,
  is_active       BOOLEAN DEFAULT true
);

CREATE TABLE public.parents (
  id        UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id   UUID    UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  relation  TEXT    DEFAULT 'Parent',
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE public.parent_student (
  parent_id   UUID REFERENCES public.parents(id) ON DELETE CASCADE,
  student_id  UUID REFERENCES public.students(id) ON DELETE CASCADE,
  PRIMARY KEY (parent_id, student_id)
);

-- Add FK from user_profiles to departments (deferred so departments exists first)
ALTER TABLE public.user_profiles
  ADD CONSTRAINT fk_user_profiles_department
  FOREIGN KEY (department_id) REFERENCES public.departments(id);


-- ============================================================
-- 003: Academic Tables (courses, enrolments, attendance, marks, timetable, assignments)
-- ============================================================

CREATE TABLE public.courses (
  id            UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  code          TEXT    UNIQUE NOT NULL,
  title         TEXT    NOT NULL,
  credits       INTEGER DEFAULT 4,
  semester      INTEGER NOT NULL,
  programme_id  UUID    REFERENCES public.programmes(id),
  department_id UUID    REFERENCES public.departments(id),
  is_active     BOOLEAN DEFAULT true
);

CREATE TABLE public.enrollments (
  id            UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id    UUID    REFERENCES public.students(id),
  course_id     UUID    REFERENCES public.courses(id),
  academic_year TEXT    NOT NULL,
  semester      INTEGER NOT NULL,
  UNIQUE(student_id, course_id, academic_year, semester)
);

CREATE TABLE public.attendance_records (
  id          UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id  UUID    REFERENCES public.students(id),
  course_id   UUID    REFERENCES public.courses(id),
  date        DATE    NOT NULL,
  session     TEXT    CHECK (session IN ('FN','AN')),
  status      TEXT    CHECK (status IN ('present','absent','od','medical')),
  marked_by   UUID    REFERENCES public.faculty(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, course_id, date, session)
);

CREATE TABLE public.marks (
  id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id       UUID         REFERENCES public.students(id),
  course_id        UUID         REFERENCES public.courses(id),
  assessment_type  TEXT         CHECK (assessment_type IN ('CIA1','CIA2','CIA3','Model','External','Assignment','Practical')),
  marks_obtained   NUMERIC(5,2),
  max_marks        NUMERIC(5,2) DEFAULT 100,
  academic_year    TEXT,
  semester         INTEGER,
  entered_by       UUID         REFERENCES public.faculty(id),
  created_at       TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE public.timetables (
  id            UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  day_of_week   INTEGER CHECK (day_of_week BETWEEN 1 AND 6),
  period_number INTEGER,
  start_time    TIME    NOT NULL,
  end_time      TIME    NOT NULL,
  course_id     UUID    REFERENCES public.courses(id),
  faculty_id    UUID    REFERENCES public.faculty(id),
  programme_id  UUID    REFERENCES public.programmes(id),
  semester      INTEGER,
  room          TEXT,
  academic_year TEXT
);

CREATE TABLE public.assignments (
  id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       TEXT         NOT NULL,
  description TEXT,
  course_id   UUID         REFERENCES public.courses(id),
  faculty_id  UUID         REFERENCES public.faculty(id),
  due_date    TIMESTAMPTZ,
  max_marks   NUMERIC(5,2),
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);


-- ============================================================
-- 004: Mentoring
-- ============================================================

CREATE TABLE public.mentorship_assignments (
  id            UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  faculty_id    UUID    REFERENCES public.faculty(id),
  student_id    UUID    REFERENCES public.students(id),
  academic_year TEXT,
  is_active     BOOLEAN DEFAULT true,
  UNIQUE(faculty_id, student_id, academic_year)
);

CREATE TABLE public.mentoring_records (
  id              UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id   UUID    REFERENCES public.mentorship_assignments(id),
  meeting_date    DATE    NOT NULL,
  meeting_type    TEXT    DEFAULT 'individual',
  academic_notes  TEXT,
  personal_notes  TEXT,
  goals           TEXT,
  follow_up       TEXT,
  next_meeting    DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- 005: Events & Announcements
-- ============================================================

CREATE TABLE public.events (
  id                    UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  title                 TEXT    NOT NULL,
  description           TEXT,
  category              TEXT,
  department_id         UUID    REFERENCES public.departments(id),
  organizer_name        TEXT,
  event_date            DATE,
  event_time            TIME,
  venue                 TEXT,
  is_registration_open  BOOLEAN DEFAULT false,
  max_participants      INTEGER,
  image_url             TEXT,
  created_by            UUID    REFERENCES auth.users(id),
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.event_registrations (
  id           UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id     UUID    REFERENCES public.events(id),
  student_id   UUID    REFERENCES public.students(id),
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  attended     BOOLEAN DEFAULT false,
  UNIQUE(event_id, student_id)
);

CREATE TABLE public.announcements (
  id              UUID      PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           TEXT      NOT NULL,
  content         TEXT      NOT NULL,
  audience        TEXT[]    DEFAULT ARRAY['student','faculty','parent','admin'],
  priority        TEXT      DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  department_id   UUID      REFERENCES public.departments(id),
  publish_from    TIMESTAMPTZ DEFAULT NOW(),
  publish_until   TIMESTAMPTZ,
  created_by      UUID      REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- 006: Library
-- ============================================================

CREATE TABLE public.library_items (
  id                UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  title             TEXT    NOT NULL,
  author            TEXT,
  isbn              TEXT,
  publisher         TEXT,
  edition           TEXT,
  category          TEXT,
  total_copies      INTEGER DEFAULT 1,
  available_copies  INTEGER DEFAULT 1,
  department_id     UUID    REFERENCES public.departments(id)
);

CREATE TABLE public.library_loans (
  id             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id        UUID         REFERENCES public.library_items(id),
  student_id     UUID         REFERENCES public.students(id),
  issued_date    DATE         DEFAULT CURRENT_DATE,
  due_date       DATE,
  returned_date  DATE,
  fine_amount    NUMERIC(6,2) DEFAULT 0,
  status         TEXT         DEFAULT 'active' CHECK (status IN ('active','returned','overdue'))
);


-- ============================================================
-- 007: Hostel Management
-- ============================================================

CREATE TABLE public.hostels (
  id               UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             TEXT    NOT NULL,
  type             TEXT,
  total_rooms      INTEGER,
  warden_name      TEXT,
  warden_contact   TEXT
);

-- Seed hostel data
INSERT INTO public.hostels (name, type, total_rooms, warden_name) VALUES
  ('Priyadharshini Hostel', 'UG', 80, 'Mrs. Vasantha'),
  ('New Hostel',            'UG', 60, 'Mrs. Kamala'),
  ('PG Hostel',             'PG', 30, 'Mrs. Meenakshi');

CREATE TABLE public.hostel_rooms (
  id                  UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  hostel_id           UUID    REFERENCES public.hostels(id),
  room_number         TEXT    NOT NULL,
  capacity            INTEGER DEFAULT 4,
  current_occupancy   INTEGER DEFAULT 0,
  UNIQUE(hostel_id, room_number)
);

CREATE TABLE public.hostel_allocations (
  id            UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id    UUID    UNIQUE REFERENCES public.students(id),
  room_id       UUID    REFERENCES public.hostel_rooms(id),
  academic_year TEXT,
  is_active     BOOLEAN DEFAULT true
);

CREATE TABLE public.hostel_leave_requests (
  id               UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id       UUID    REFERENCES public.students(id),
  from_date        DATE    NOT NULL,
  to_date          DATE    NOT NULL,
  reason           TEXT,
  parent_approved  BOOLEAN DEFAULT false,
  warden_approved  BOOLEAN DEFAULT false,
  status           TEXT    DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- 008: CivicFix / Campus Care Complaints System
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS complaint_seq START 1;

CREATE TABLE public.complaints (
  id                UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_number  TEXT    UNIQUE DEFAULT ('CC-' || LPAD(nextval('complaint_seq')::TEXT, 5, '0')),
  reporter_id       UUID    REFERENCES auth.users(id),
  title             TEXT    NOT NULL,
  description       TEXT    NOT NULL,
  category          TEXT    NOT NULL,
  location          TEXT,
  image_urls        TEXT[]  DEFAULT '{}',
  severity          TEXT    DEFAULT 'medium' CHECK (severity IN ('critical','high','medium','low')),
  priority          TEXT    DEFAULT 'medium' CHECK (priority IN ('critical','high','medium','low')),
  status            TEXT    DEFAULT 'open'   CHECK (status IN ('open','assigned','in_progress','resolved','closed','duplicate')),
  ai_category       TEXT,
  ai_summary        TEXT,
  duplicate_of      UUID    REFERENCES public.complaints(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.complaint_assignments (
  id            UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_id  UUID    REFERENCES public.complaints(id),
  assigned_to   UUID    REFERENCES auth.users(id),
  assigned_by   UUID    REFERENCES auth.users(id),
  notes         TEXT,
  assigned_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.complaint_updates (
  id            UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_id  UUID    REFERENCES public.complaints(id),
  updated_by    UUID    REFERENCES auth.users(id),
  status        TEXT,
  notes         TEXT,
  evidence_urls TEXT[]  DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.sla_policies (
  id             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  priority       TEXT         UNIQUE NOT NULL,
  target_hours   NUMERIC(5,1),
  warning_hours  NUMERIC(5,1)
);

-- Seed SLA policies
INSERT INTO public.sla_policies (priority, target_hours, warning_hours) VALUES
  ('critical', 0.5,  0.25),
  ('high',     2,    1),
  ('medium',   8,    6),
  ('low',      24,   20);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER complaints_updated_at
  BEFORE UPDATE ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- 009: Placement & Research
-- ============================================================

CREATE TABLE public.placement_companies (
  id         UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT    NOT NULL,
  industry   TEXT,
  logo_url   TEXT,
  website    TEXT,
  is_active  BOOLEAN DEFAULT true
);

CREATE TABLE public.placement_drives (
  id                      UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id              UUID    REFERENCES public.placement_companies(id),
  role                    TEXT    NOT NULL,
  ctc                     TEXT,
  eligibility_criteria    TEXT,
  drive_date              DATE,
  registration_deadline   DATE,
  status                  TEXT    DEFAULT 'upcoming',
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.research_projects (
  id                       UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  title                    TEXT         NOT NULL,
  principal_investigator   UUID         REFERENCES public.faculty(id),
  department_id            UUID         REFERENCES public.departments(id),
  funding_agency           TEXT,
  amount                   NUMERIC(12,2),
  start_date               DATE,
  end_date                 DATE,
  status                   TEXT         DEFAULT 'ongoing'
);


-- ============================================================
-- 010: Notifications & Audit Logs
-- ============================================================

CREATE TABLE public.notifications (
  id          UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID    REFERENCES auth.users(id),
  title       TEXT    NOT NULL,
  message     TEXT    NOT NULL,
  type        TEXT    DEFAULT 'info',
  link        TEXT,
  is_read     BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.audit_logs (
  id             UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID    REFERENCES auth.users(id),
  action         TEXT    NOT NULL,
  resource_type  TEXT,
  resource_id    TEXT,
  details        JSONB   DEFAULT '{}',
  ip_address     TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient per-user notification queries
CREATE INDEX idx_notifications_user_id     ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread      ON public.notifications(user_id) WHERE is_read = false;

-- Index for audit log queries
CREATE INDEX idx_audit_logs_user_id        ON public.audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_resource       ON public.audit_logs(resource_type, resource_id);


-- ============================================================
-- 011: RAG Knowledge Base (pgvector)
-- ============================================================

CREATE TABLE public.knowledge_sources (
  id            UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT    NOT NULL,
  source_url    TEXT,
  category      TEXT,
  last_indexed  TIMESTAMPTZ,
  is_active     BOOLEAN DEFAULT true
);

CREATE TABLE public.knowledge_chunks (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id   UUID        REFERENCES public.knowledge_sources(id),
  content     TEXT        NOT NULL,
  metadata    JSONB       DEFAULT '{}',
  embedding   vector(1536),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- IVFFlat index for fast approximate cosine similarity search
CREATE INDEX knowledge_chunks_embedding_idx
  ON public.knowledge_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Full-text search index on chunk content
CREATE INDEX knowledge_chunks_content_fts
  ON public.knowledge_chunks
  USING gin(to_tsvector('english', content));

-- Similarity search helper function
CREATE OR REPLACE FUNCTION public.match_knowledge_chunks(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count     INT   DEFAULT 5
)
RETURNS TABLE (
  id         UUID,
  content    TEXT,
  metadata   JSONB,
  source_id  UUID,
  similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    kc.id,
    kc.content,
    kc.metadata,
    kc.source_id,
    1 - (kc.embedding <=> query_embedding) AS similarity
  FROM public.knowledge_chunks kc
  WHERE 1 - (kc.embedding <=> query_embedding) > match_threshold
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
$$;


-- ============================================================
-- 012: AI Conversations (Pragya AI)
-- ============================================================

CREATE TABLE public.ai_conversations (
  id          UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID    REFERENCES auth.users(id),
  title       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.ai_messages (
  id                UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id   UUID    REFERENCES public.ai_conversations(id),
  role              TEXT    CHECK (role IN ('user','assistant')),
  content           TEXT    NOT NULL,
  intent            TEXT,
  source_ref        TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for conversation retrieval
CREATE INDEX idx_ai_conversations_user ON public.ai_conversations(user_id, created_at DESC);
CREATE INDEX idx_ai_messages_conv      ON public.ai_messages(conversation_id, created_at ASC);


-- ============================================================
-- 013: Row Level Security (RLS) Policies
-- Run AFTER all tables are created
-- All subqueries use explicit table aliases to prevent
-- "column reference id is ambiguous" errors in PostgreSQL
-- ============================================================

-- Enable RLS on all sensitive tables
ALTER TABLE public.user_profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marks               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentoring_records   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_loans       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hostel_allocations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hostel_leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages         ENABLE ROW LEVEL SECURITY;

-- ── user_profiles ─────────────────────────────────────────────────────────────
-- Users can view/edit their own profile
CREATE POLICY "own_profile"
  ON public.user_profiles FOR ALL
  USING (auth.uid() = id);

-- Admins can see all profiles
-- NOTE: alias 'up' on the subquery prevents ambiguity when outer table is also user_profiles
CREATE POLICY "admin_all_profiles"
  ON public.user_profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  );

-- ── students ──────────────────────────────────────────────────────────────────
CREATE POLICY "own_student_record"
  ON public.students FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "faculty_admin_students"
  ON public.students FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role IN ('faculty','admin')
    )
  );

-- ── attendance_records ────────────────────────────────────────────────────────
CREATE POLICY "own_attendance"
  ON public.attendance_records FOR SELECT
  USING (
    student_id IN (
      SELECT s.id FROM public.students s WHERE s.user_id = auth.uid()
    )
  );

CREATE POLICY "faculty_mark_attendance"
  ON public.attendance_records FOR INSERT
  WITH CHECK (
    marked_by IN (
      SELECT f.id FROM public.faculty f WHERE f.user_id = auth.uid()
    )
  );

CREATE POLICY "faculty_update_attendance"
  ON public.attendance_records FOR UPDATE
  USING (
    marked_by IN (
      SELECT f.id FROM public.faculty f WHERE f.user_id = auth.uid()
    )
  );

CREATE POLICY "admin_all_attendance"
  ON public.attendance_records FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  );

-- ── marks ─────────────────────────────────────────────────────────────────────
CREATE POLICY "own_marks"
  ON public.marks FOR SELECT
  USING (
    student_id IN (
      SELECT s.id FROM public.students s WHERE s.user_id = auth.uid()
    )
  );

CREATE POLICY "faculty_enter_marks"
  ON public.marks FOR INSERT
  WITH CHECK (
    entered_by IN (
      SELECT f.id FROM public.faculty f WHERE f.user_id = auth.uid()
    )
  );

CREATE POLICY "admin_all_marks"
  ON public.marks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  );

-- ── mentoring_records ─────────────────────────────────────────────────────────
-- CRITICAL FIX: was SELECT id with JOIN — both tables have id, must use ma.id
CREATE POLICY "faculty_own_mentoring"
  ON public.mentoring_records FOR ALL
  USING (
    assignment_id IN (
      SELECT ma.id
      FROM public.mentorship_assignments ma
      JOIN public.faculty f ON f.id = ma.faculty_id
      WHERE f.user_id = auth.uid()
    )
  );

-- ── complaints ────────────────────────────────────────────────────────────────
CREATE POLICY "own_complaints"
  ON public.complaints FOR SELECT
  USING (reporter_id = auth.uid());

CREATE POLICY "auth_create_complaint"
  ON public.complaints FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "admin_all_complaints"
  ON public.complaints FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  );

-- ── notifications ─────────────────────────────────────────────────────────────
CREATE POLICY "own_notifications"
  ON public.notifications FOR ALL
  USING (user_id = auth.uid());

-- ── audit_logs ────────────────────────────────────────────────────────────────
CREATE POLICY "admin_audit_logs"
  ON public.audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  );

CREATE POLICY "system_insert_audit"
  ON public.audit_logs FOR INSERT
  WITH CHECK (true);

-- ── library_loans ─────────────────────────────────────────────────────────────
CREATE POLICY "own_library_loans"
  ON public.library_loans FOR SELECT
  USING (
    student_id IN (
      SELECT s.id FROM public.students s WHERE s.user_id = auth.uid()
    )
  );

-- ── hostel ────────────────────────────────────────────────────────────────────
CREATE POLICY "own_hostel_allocation"
  ON public.hostel_allocations FOR SELECT
  USING (
    student_id IN (
      SELECT s.id FROM public.students s WHERE s.user_id = auth.uid()
    )
  );

CREATE POLICY "own_leave_requests"
  ON public.hostel_leave_requests FOR ALL
  USING (
    student_id IN (
      SELECT s.id FROM public.students s WHERE s.user_id = auth.uid()
    )
  );

-- ── ai_conversations ──────────────────────────────────────────────────────────
CREATE POLICY "own_ai_conversations"
  ON public.ai_conversations FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "own_ai_messages"
  ON public.ai_messages FOR ALL
  USING (
    conversation_id IN (
      SELECT ac.id FROM public.ai_conversations ac WHERE ac.user_id = auth.uid()
    )
  );


-- ============================================================
-- 014: Seed Data — Departments & Programmes
-- Run AFTER 001–013 are complete
-- ============================================================

-- ── Departments ───────────────────────────────────────────────────────────────
INSERT INTO public.departments (name, code) VALUES
  ('Computer Science',        'CS'),
  ('Mathematics',             'MATH'),
  ('Commerce',                'COM'),
  ('Physics',                 'PHY'),
  ('Chemistry',               'CHEM'),
  ('English',                 'ENG'),
  ('Tamil',                   'TAM'),
  ('Botany',                  'BOT'),
  ('Microbiology',            'MIC'),
  ('BCA',                     'BCA'),
  ('History',                 'HIST'),
  ('Nutrition & Dietetics',   'NUT'),
  ('Costume Design',          'CDT'),
  ('Psychology',              'PSY'),
  ('Data Science',            'DS'),
  ('Geography',               'GEO'),
  ('Business Administration', 'BBA'),
  ('Pharmacy',                'PHARM'),
  ('Library',                 'LIB')
ON CONFLICT (code) DO NOTHING;

-- ── Sample Programmes ─────────────────────────────────────────────────────────
-- Using scalar subqueries for department_id — avoids any UNION ALL ambiguity
INSERT INTO public.programmes (name, code, type, category, duration_years, department_id)
VALUES
  ('B.Sc Computer Science',      'BSC-CS',   'UG', 'Regular', 3, (SELECT dept.id FROM public.departments dept WHERE dept.code = 'CS')),
  ('B.Sc Mathematics',           'BSC-MATH', 'UG', 'Regular', 3, (SELECT dept.id FROM public.departments dept WHERE dept.code = 'MATH')),
  ('B.Com',                      'BCOM',     'UG', 'Regular', 3, (SELECT dept.id FROM public.departments dept WHERE dept.code = 'COM')),
  ('B.Sc Physics',               'BSC-PHY',  'UG', 'Regular', 3, (SELECT dept.id FROM public.departments dept WHERE dept.code = 'PHY')),
  ('B.Sc Chemistry',             'BSC-CHEM', 'UG', 'Regular', 3, (SELECT dept.id FROM public.departments dept WHERE dept.code = 'CHEM')),
  ('BCA',                        'BCA',      'UG', 'SF',      3, (SELECT dept.id FROM public.departments dept WHERE dept.code = 'BCA')),
  ('M.Sc Computer Science',      'MSC-CS',   'PG', 'Regular', 2, (SELECT dept.id FROM public.departments dept WHERE dept.code = 'CS')),
  ('M.Sc Mathematics',           'MSC-MATH', 'PG', 'Regular', 2, (SELECT dept.id FROM public.departments dept WHERE dept.code = 'MATH')),
  ('B.Sc Microbiology',          'BSC-MIC',  'UG', 'Regular', 3, (SELECT dept.id FROM public.departments dept WHERE dept.code = 'MIC')),
  ('B.Sc Nutrition & Dietetics', 'BSC-NUT',  'UG', 'SF',      3, (SELECT dept.id FROM public.departments dept WHERE dept.code = 'NUT')),
  ('B.Sc Data Science',          'BSC-DS',   'UG', 'SF',      3, (SELECT dept.id FROM public.departments dept WHERE dept.code = 'DS')),
  ('B.B.A',                      'BBA',      'UG', 'SF',      3, (SELECT dept.id FROM public.departments dept WHERE dept.code = 'BBA')),
  ('M.Sc Data Science',          'MSC-DS',   'PG', 'SF',      2, (SELECT dept.id FROM public.departments dept WHERE dept.code = 'DS'))
ON CONFLICT (code) DO NOTHING;

-- ── Verify ────────────────────────────────────────────────────────────────────
SELECT
  d.code,
  d.name,
  COUNT(p.id) AS programme_count
FROM public.departments d
LEFT JOIN public.programmes p ON p.department_id = d.id
GROUP BY d.code, d.name
ORDER BY d.code;


-- ============================================================
-- 015: Enable RLS on remaining 24 tables
-- Run in Supabase SQL Editor AFTER migration 013
-- All subqueries use explicit table aliases to prevent
-- "column reference id is ambiguous" errors
-- ============================================================

-- ── Enable RLS ────────────────────────────────────────────────────────────────
ALTER TABLE public.departments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programmes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parents               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_student        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetables            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorship_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hostels               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hostel_rooms          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_updates     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_policies          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.placement_companies   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.placement_drives      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_projects     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_sources     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_chunks      ENABLE ROW LEVEL SECURITY;


-- ════════════════════════════════════════════════════════════
-- REFERENCE / LOOKUP TABLES
-- Pattern: any authenticated user can SELECT; only admins write
-- ════════════════════════════════════════════════════════════

-- ── departments ───────────────────────────────────────────────────────────────
CREATE POLICY "departments_read_auth"
  ON public.departments FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "departments_admin_write"
  ON public.departments FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  );

-- ── programmes ────────────────────────────────────────────────────────────────
CREATE POLICY "programmes_read_auth"
  ON public.programmes FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "programmes_admin_write"
  ON public.programmes FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  );

-- ── courses ───────────────────────────────────────────────────────────────────
CREATE POLICY "courses_read_auth"
  ON public.courses FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "courses_admin_write"
  ON public.courses FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  );

-- ── timetables ────────────────────────────────────────────────────────────────
CREATE POLICY "timetables_read_auth"
  ON public.timetables FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "timetables_admin_write"
  ON public.timetables FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  );

-- ── sla_policies ──────────────────────────────────────────────────────────────
CREATE POLICY "sla_policies_read_auth"
  ON public.sla_policies FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "sla_policies_admin_write"
  ON public.sla_policies FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  );

-- ── hostels ───────────────────────────────────────────────────────────────────
CREATE POLICY "hostels_read_auth"
  ON public.hostels FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "hostels_admin_write"
  ON public.hostels FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  );

-- ── hostel_rooms ──────────────────────────────────────────────────────────────
CREATE POLICY "hostel_rooms_read_auth"
  ON public.hostel_rooms FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "hostel_rooms_admin_write"
  ON public.hostel_rooms FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  );

-- ── library_items ─────────────────────────────────────────────────────────────
CREATE POLICY "library_items_read_auth"
  ON public.library_items FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "library_items_admin_write"
  ON public.library_items FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  );

-- ── placement_companies ───────────────────────────────────────────────────────
CREATE POLICY "placement_companies_read_auth"
  ON public.placement_companies FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "placement_companies_admin_write"
  ON public.placement_companies FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  );

-- ── placement_drives ──────────────────────────────────────────────────────────
CREATE POLICY "placement_drives_read_auth"
  ON public.placement_drives FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "placement_drives_admin_write"
  ON public.placement_drives FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  );

-- ── knowledge_sources ─────────────────────────────────────────────────────────
CREATE POLICY "knowledge_sources_read_auth"
  ON public.knowledge_sources FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "knowledge_sources_admin_write"
  ON public.knowledge_sources FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  );

-- ── knowledge_chunks ──────────────────────────────────────────────────────────
-- Readable by all authenticated (required for RAG retrieval via match_knowledge_chunks RPC)
CREATE POLICY "knowledge_chunks_read_auth"
  ON public.knowledge_chunks FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "knowledge_chunks_admin_write"
  ON public.knowledge_chunks FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  );


-- ════════════════════════════════════════════════════════════
-- PEOPLE TABLES
-- ════════════════════════════════════════════════════════════

-- ── faculty ───────────────────────────────────────────────────────────────────
-- Faculty see their own record; all authenticated can read basic faculty info
CREATE POLICY "faculty_read_auth"
  ON public.faculty FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "faculty_own_write"
  ON public.faculty FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "faculty_admin_write"
  ON public.faculty FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  );

-- ── parents ───────────────────────────────────────────────────────────────────
CREATE POLICY "parents_own_record"
  ON public.parents FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "parents_admin_all"
  ON public.parents FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  );

-- ── parent_student ────────────────────────────────────────────────────────────
-- Parents see their own links; students see who their parent is; admin sees all
CREATE POLICY "parent_student_parent_read"
  ON public.parent_student FOR SELECT
  USING (
    parent_id IN (
      SELECT p.id FROM public.parents p WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "parent_student_student_read"
  ON public.parent_student FOR SELECT
  USING (
    student_id IN (
      SELECT s.id FROM public.students s WHERE s.user_id = auth.uid()
    )
  );

CREATE POLICY "parent_student_admin_all"
  ON public.parent_student FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  );


-- ════════════════════════════════════════════════════════════
-- ACADEMIC TABLES
-- ════════════════════════════════════════════════════════════

-- ── enrollments ───────────────────────────────────────────────────────────────
CREATE POLICY "enrollments_own_student"
  ON public.enrollments FOR SELECT
  USING (
    student_id IN (
      SELECT s.id FROM public.students s WHERE s.user_id = auth.uid()
    )
  );

CREATE POLICY "enrollments_faculty_read"
  ON public.enrollments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role IN ('faculty', 'admin')
    )
  );

CREATE POLICY "enrollments_admin_write"
  ON public.enrollments FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  );

-- ── assignments ───────────────────────────────────────────────────────────────
-- Students see assignments for their enrolled courses; faculty see their own
CREATE POLICY "assignments_read_auth"
  ON public.assignments FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "assignments_faculty_write"
  ON public.assignments FOR INSERT
  WITH CHECK (
    faculty_id IN (
      SELECT f.id FROM public.faculty f WHERE f.user_id = auth.uid()
    )
  );

CREATE POLICY "assignments_faculty_update"
  ON public.assignments FOR UPDATE
  USING (
    faculty_id IN (
      SELECT f.id FROM public.faculty f WHERE f.user_id = auth.uid()
    )
  );

CREATE POLICY "assignments_admin_all"
  ON public.assignments FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  );

-- ── mentorship_assignments ────────────────────────────────────────────────────
CREATE POLICY "mentorship_faculty_read"
  ON public.mentorship_assignments FOR SELECT
  USING (
    faculty_id IN (
      SELECT f.id FROM public.faculty f WHERE f.user_id = auth.uid()
    )
  );

CREATE POLICY "mentorship_student_read"
  ON public.mentorship_assignments FOR SELECT
  USING (
    student_id IN (
      SELECT s.id FROM public.students s WHERE s.user_id = auth.uid()
    )
  );

CREATE POLICY "mentorship_admin_all"
  ON public.mentorship_assignments FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  );

-- ── research_projects ─────────────────────────────────────────────────────────
CREATE POLICY "research_read_auth"
  ON public.research_projects FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "research_pi_write"
  ON public.research_projects FOR UPDATE
  USING (
    principal_investigator IN (
      SELECT f.id FROM public.faculty f WHERE f.user_id = auth.uid()
    )
  );

CREATE POLICY "research_admin_all"
  ON public.research_projects FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  );


-- ════════════════════════════════════════════════════════════
-- EVENTS & ANNOUNCEMENTS
-- ════════════════════════════════════════════════════════════

-- ── events ────────────────────────────────────────────────────────────────────
CREATE POLICY "events_read_auth"
  ON public.events FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "events_admin_write"
  ON public.events FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role IN ('admin', 'faculty')
    )
  );

-- ── event_registrations ───────────────────────────────────────────────────────
CREATE POLICY "event_reg_own_student"
  ON public.event_registrations FOR ALL
  USING (
    student_id IN (
      SELECT s.id FROM public.students s WHERE s.user_id = auth.uid()
    )
  );

CREATE POLICY "event_reg_admin_all"
  ON public.event_registrations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role IN ('admin', 'faculty')
    )
  );

-- ── announcements ─────────────────────────────────────────────────────────────
CREATE POLICY "announcements_read_auth"
  ON public.announcements FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "announcements_admin_write"
  ON public.announcements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role IN ('admin', 'faculty')
    )
  );


-- ════════════════════════════════════════════════════════════
-- COMPLAINT SUPPORT TABLES
-- ════════════════════════════════════════════════════════════

-- ── complaint_assignments ─────────────────────────────────────────────────────
-- Admin can manage; assigned person can view their own
CREATE POLICY "complaint_assignments_assigned_read"
  ON public.complaint_assignments FOR SELECT
  USING (assigned_to = auth.uid());

CREATE POLICY "complaint_assignments_admin_all"
  ON public.complaint_assignments FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  );

-- ── complaint_updates ─────────────────────────────────────────────────────────
-- Anyone who updated can see their own; admin sees all
CREATE POLICY "complaint_updates_own"
  ON public.complaint_updates FOR SELECT
  USING (updated_by = auth.uid());

CREATE POLICY "complaint_updates_insert_auth"
  ON public.complaint_updates FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "complaint_updates_admin_all"
  ON public.complaint_updates FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  );


-- ── Verify: all 24 tables now have RLS enabled ────────────────────────────────
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = true
ORDER BY tablename;


-- ============================================================
-- 016: Security Hardening — Fix all Warning-level advisories
-- Run in Supabase SQL Editor AFTER migrations 013–015
--
-- Fixes:
--   1. Function Search Path Mutable (set_updated_at, match_knowledge_chunks)
--   2. Auth RLS Initialization Plan — wrap auth.uid() in (SELECT auth.uid())
--      so it is evaluated ONCE per query, not once per row
--   3. Multiple Permissive Policies — consolidate overlapping policies
--      on user_profiles, students, attendance_records, marks, complaints
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- 1. FIX: Function Search Path Mutable
--    Add SET search_path = '' to prevent search_path hijacking
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.match_knowledge_chunks(
  query_embedding public.vector(1536),
  match_threshold  FLOAT DEFAULT 0.7,
  match_count      INT   DEFAULT 5
)
RETURNS TABLE (
  id         UUID,
  content    TEXT,
  metadata   JSONB,
  source_id  UUID,
  similarity FLOAT
)
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    kc.id,
    kc.content,
    kc.metadata,
    kc.source_id,
    1 - (kc.embedding <=> query_embedding) AS similarity
  FROM public.knowledge_chunks kc
  WHERE 1 - (kc.embedding <=> query_embedding) > match_threshold
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
$$;


-- ════════════════════════════════════════════════════════════
-- 2 & 3. FIX: Auth RLS Initialization + Multiple Permissive Policies
--
-- Strategy:
--   a) Drop all redundant / overlapping policies on the 5 affected tables
--   b) Recreate as SINGLE combined policies using OR logic
--   c) Wrap all auth.uid() calls in (SELECT auth.uid()) for plan-time
--      evaluation (one lookup per query, not per row)
-- ════════════════════════════════════════════════════════════

-- ── user_profiles ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "own_profile"         ON public.user_profiles;
DROP POLICY IF EXISTS "admin_all_profiles"  ON public.user_profiles;

-- Consolidated: own row OR admin — evaluated once per query
CREATE POLICY "user_profiles_select"
  ON public.user_profiles FOR SELECT
  USING (
    id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
    )
  );

CREATE POLICY "user_profiles_insert"
  ON public.user_profiles FOR INSERT
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "user_profiles_update"
  ON public.user_profiles FOR UPDATE
  USING (
    id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
    )
  );

CREATE POLICY "user_profiles_delete"
  ON public.user_profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
    )
  );


-- ── students ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "own_student_record"    ON public.students;
DROP POLICY IF EXISTS "faculty_admin_students" ON public.students;

-- Consolidated: own row OR faculty OR admin
CREATE POLICY "students_select"
  ON public.students FOR SELECT
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role IN ('faculty', 'admin')
    )
  );

CREATE POLICY "students_admin_write"
  ON public.students FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
    )
  );


-- ── attendance_records ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "own_attendance"       ON public.attendance_records;
DROP POLICY IF EXISTS "admin_all_attendance" ON public.attendance_records;

-- Consolidated read: own student OR admin/faculty
CREATE POLICY "attendance_select"
  ON public.attendance_records FOR SELECT
  USING (
    student_id IN (
      SELECT s.id FROM public.students s WHERE s.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role IN ('faculty', 'admin')
    )
  );

-- Keep faculty write policies but update auth.uid() calls
DROP POLICY IF EXISTS "faculty_mark_attendance"   ON public.attendance_records;
DROP POLICY IF EXISTS "faculty_update_attendance" ON public.attendance_records;

CREATE POLICY "attendance_faculty_insert"
  ON public.attendance_records FOR INSERT
  WITH CHECK (
    marked_by IN (
      SELECT f.id FROM public.faculty f WHERE f.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
    )
  );

CREATE POLICY "attendance_faculty_update"
  ON public.attendance_records FOR UPDATE
  USING (
    marked_by IN (
      SELECT f.id FROM public.faculty f WHERE f.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
    )
  );


-- ── marks ─────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "own_marks"        ON public.marks;
DROP POLICY IF EXISTS "admin_all_marks"  ON public.marks;

-- Consolidated read: own student OR faculty OR admin
CREATE POLICY "marks_select"
  ON public.marks FOR SELECT
  USING (
    student_id IN (
      SELECT s.id FROM public.students s WHERE s.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role IN ('faculty', 'admin')
    )
  );

DROP POLICY IF EXISTS "faculty_enter_marks" ON public.marks;

CREATE POLICY "marks_faculty_insert"
  ON public.marks FOR INSERT
  WITH CHECK (
    entered_by IN (
      SELECT f.id FROM public.faculty f WHERE f.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
    )
  );

CREATE POLICY "marks_admin_update_delete"
  ON public.marks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
    )
  );


-- ── complaints ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "own_complaints"       ON public.complaints;
DROP POLICY IF EXISTS "admin_all_complaints" ON public.complaints;

-- Consolidated read: own reporter OR admin
CREATE POLICY "complaints_select"
  ON public.complaints FOR SELECT
  USING (
    reporter_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
    )
  );

-- Keep insert / update policies
DROP POLICY IF EXISTS "auth_create_complaint" ON public.complaints;

CREATE POLICY "complaints_insert_auth"
  ON public.complaints FOR INSERT
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "complaints_admin_update"
  ON public.complaints FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
    )
  );


-- ════════════════════════════════════════════════════════════
-- Fix (SELECT auth.uid()) in remaining policies from migration 013
-- that still use bare auth.uid() — performance improvement
-- ════════════════════════════════════════════════════════════

-- mentoring_records
DROP POLICY IF EXISTS "faculty_own_mentoring" ON public.mentoring_records;
CREATE POLICY "mentoring_faculty_all"
  ON public.mentoring_records FOR ALL
  USING (
    assignment_id IN (
      SELECT ma.id
      FROM public.mentorship_assignments ma
      JOIN public.faculty f ON f.id = ma.faculty_id
      WHERE f.user_id = (SELECT auth.uid())
    )
  );

-- notifications
DROP POLICY IF EXISTS "own_notifications" ON public.notifications;
CREATE POLICY "notifications_own"
  ON public.notifications FOR ALL
  USING (user_id = (SELECT auth.uid()));

-- audit_logs
DROP POLICY IF EXISTS "admin_audit_logs"    ON public.audit_logs;
DROP POLICY IF EXISTS "system_insert_audit" ON public.audit_logs;
CREATE POLICY "audit_logs_admin_read"
  ON public.audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
    )
  );
CREATE POLICY "audit_logs_insert"
  ON public.audit_logs FOR INSERT
  WITH CHECK (true);

-- library_loans
DROP POLICY IF EXISTS "own_library_loans" ON public.library_loans;
CREATE POLICY "library_loans_own"
  ON public.library_loans FOR SELECT
  USING (
    student_id IN (
      SELECT s.id FROM public.students s WHERE s.user_id = (SELECT auth.uid())
    )
  );

-- hostel_allocations
DROP POLICY IF EXISTS "own_hostel_allocation" ON public.hostel_allocations;
CREATE POLICY "hostel_allocations_own"
  ON public.hostel_allocations FOR SELECT
  USING (
    student_id IN (
      SELECT s.id FROM public.students s WHERE s.user_id = (SELECT auth.uid())
    )
  );

-- hostel_leave_requests
DROP POLICY IF EXISTS "own_leave_requests" ON public.hostel_leave_requests;
CREATE POLICY "leave_requests_own"
  ON public.hostel_leave_requests FOR ALL
  USING (
    student_id IN (
      SELECT s.id FROM public.students s WHERE s.user_id = (SELECT auth.uid())
    )
  );

-- ai_conversations
DROP POLICY IF EXISTS "own_ai_conversations" ON public.ai_conversations;
CREATE POLICY "ai_conversations_own"
  ON public.ai_conversations FOR ALL
  USING (user_id = (SELECT auth.uid()));

-- ai_messages
DROP POLICY IF EXISTS "own_ai_messages" ON public.ai_messages;
CREATE POLICY "ai_messages_own"
  ON public.ai_messages FOR ALL
  USING (
    conversation_id IN (
      SELECT ac.id FROM public.ai_conversations ac
      WHERE ac.user_id = (SELECT auth.uid())
    )
  );


-- ════════════════════════════════════════════════════════════
-- NOTE: Extension in Public (vector in public schema)
-- This warning cannot be fixed by DROP+RECREATE without
-- dropping the knowledge_chunks table column. This is a
-- Supabase-managed advisory; the vector extension works
-- correctly in the public schema and poses no runtime risk.
-- Supabase themselves install it there on managed projects.
-- ════════════════════════════════════════════════════════════


-- ── Verify: check policy counts per table ─────────────────────────────────────
SELECT
  schemaname,
  tablename,
  COUNT(*) AS policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;


-- ============================================================
-- 017: Fix remaining security advisor warnings
--
-- Fixes:
--   Warning 2 & 3: Public/Signed-in can execute SECURITY DEFINER functions
--     → REVOKE EXECUTE on set_updated_at from all roles (trigger only)
--     → REVOKE EXECUTE on match_knowledge_chunks from anon (keep authenticated)
--
--   Warning 4: Auth RLS Initialization Plan (56 findings)
--     → All auth.uid() calls wrapped in (SELECT auth.uid())
--
--   Warning 5: Multiple Permissive Policies (180 findings)
--     → Split every FOR ALL admin policy into separate
--       FOR INSERT / FOR UPDATE / FOR DELETE policies
--       so SELECT policies no longer overlap with write policies
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- FIX 2 & 3: SECURITY DEFINER function permissions
-- ════════════════════════════════════════════════════════════

-- set_updated_at is a trigger function — no role should call it via RPC
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM authenticated;

-- match_knowledge_chunks: authenticated users need it for RAG, anon must not
REVOKE EXECUTE ON FUNCTION public.match_knowledge_chunks(public.vector, float8, int4) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.match_knowledge_chunks(public.vector, float8, int4) FROM anon;
GRANT  EXECUTE ON FUNCTION public.match_knowledge_chunks(public.vector, float8, int4) TO authenticated;


-- ════════════════════════════════════════════════════════════
-- FIX 4 & 5: Drop ALL migration-015 policies and recreate
--   • (select auth.uid()) — evaluated once per query, not per row
--   • FOR INSERT / FOR UPDATE / FOR DELETE instead of FOR ALL
--     on admin write policies → eliminates SELECT overlap
-- ════════════════════════════════════════════════════════════

-- ── Drop migration-015 AND migration-017 policies (idempotent) ───────────────
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public'
    AND policyname IN (
      -- migration 015 old names
      'departments_read_auth','departments_admin_write',
      'programmes_read_auth','programmes_admin_write',
      'courses_read_auth','courses_admin_write',
      'timetables_read_auth','timetables_admin_write',
      'sla_policies_read_auth','sla_policies_admin_write',
      'hostels_read_auth','hostels_admin_write',
      'hostel_rooms_read_auth','hostel_rooms_admin_write',
      'library_items_read_auth','library_items_admin_write',
      'placement_companies_read_auth','placement_companies_admin_write',
      'placement_drives_read_auth','placement_drives_admin_write',
      'knowledge_sources_read_auth','knowledge_sources_admin_write',
      'knowledge_chunks_read_auth','knowledge_chunks_admin_write',
      'faculty_read_auth','faculty_own_write','faculty_admin_write',
      'parents_own_record','parents_admin_all',
      'parent_student_parent_read','parent_student_student_read','parent_student_admin_all',
      'enrollments_own_student','enrollments_faculty_read','enrollments_admin_write',
      'assignments_read_auth','assignments_faculty_write','assignments_faculty_update','assignments_admin_all',
      'mentorship_faculty_read','mentorship_student_read','mentorship_admin_all',
      'research_read_auth','research_pi_write','research_admin_all',
      'events_read_auth','events_admin_write',
      'event_reg_own_student','event_reg_admin_all',
      'announcements_read_auth','announcements_admin_write',
      'complaint_assignments_assigned_read','complaint_assignments_admin_all',
      'complaint_updates_own','complaint_updates_insert_auth','complaint_updates_admin_all',
      -- migration 017 new names (makes this migration safe to re-run)
      'dept_select','dept_insert','dept_update','dept_delete',
      'prog_select','prog_insert','prog_update','prog_delete',
      'courses_select','courses_insert','courses_update','courses_delete',
      'tt_select','tt_insert','tt_update','tt_delete',
      'sla_select','sla_insert','sla_update','sla_delete',
      'hostels_select','hostels_insert','hostels_update','hostels_delete',
      'hrooms_select','hrooms_insert','hrooms_update','hrooms_delete',
      'libitem_select','libitem_insert','libitem_update','libitem_delete',
      'pco_select','pco_insert','pco_update','pco_delete',
      'pdrv_select','pdrv_insert','pdrv_update','pdrv_delete',
      'ksrc_select','ksrc_insert','ksrc_update','ksrc_delete',
      'kchunk_select','kchunk_insert','kchunk_update','kchunk_delete',
      'fac_select','fac_update','fac_insert','fac_delete',
      'parents_select','parents_update','parents_insert','parents_delete',
      'ps_select','ps_insert','ps_delete',
      'enroll_select','enroll_insert','enroll_update','enroll_delete',
      'asgn_select','asgn_insert','asgn_update','asgn_delete',
      'mentor_select','mentor_insert','mentor_update','mentor_delete',
      'res_select','res_insert','res_update','res_delete',
      'evt_select','evt_insert','evt_update','evt_delete',
      'evtreg_select','evtreg_insert','evtreg_delete',
      'ann_select','ann_insert','ann_update','ann_delete',
      'ca_select','ca_insert','ca_update','ca_delete',
      'cu_select','cu_insert','cu_update','cu_delete'
    )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;


-- ════════════════════════════════════════════════════════════
-- REFERENCE TABLES — pattern:
--   SELECT: any authenticated user (one open policy, no overlap)
--   INSERT/UPDATE/DELETE: admin only (separate, no SELECT overlap)
-- ════════════════════════════════════════════════════════════

-- ── departments ───────────────────────────────────────────────────────────────
CREATE POLICY "dept_select"  ON public.departments FOR SELECT USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "dept_insert"  ON public.departments FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "dept_update"  ON public.departments FOR UPDATE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "dept_delete"  ON public.departments FOR DELETE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));

-- ── programmes ────────────────────────────────────────────────────────────────
CREATE POLICY "prog_select"  ON public.programmes FOR SELECT USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "prog_insert"  ON public.programmes FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "prog_update"  ON public.programmes FOR UPDATE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "prog_delete"  ON public.programmes FOR DELETE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));

-- ── courses ───────────────────────────────────────────────────────────────────
CREATE POLICY "courses_select" ON public.courses FOR SELECT USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "courses_insert" ON public.courses FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "courses_update" ON public.courses FOR UPDATE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "courses_delete" ON public.courses FOR DELETE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));

-- ── timetables ────────────────────────────────────────────────────────────────
CREATE POLICY "tt_select" ON public.timetables FOR SELECT USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "tt_insert" ON public.timetables FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "tt_update" ON public.timetables FOR UPDATE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "tt_delete" ON public.timetables FOR DELETE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));

-- ── sla_policies ──────────────────────────────────────────────────────────────
CREATE POLICY "sla_select" ON public.sla_policies FOR SELECT USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "sla_insert" ON public.sla_policies FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "sla_update" ON public.sla_policies FOR UPDATE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "sla_delete" ON public.sla_policies FOR DELETE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));

-- ── hostels ───────────────────────────────────────────────────────────────────
CREATE POLICY "hostels_select" ON public.hostels FOR SELECT USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "hostels_insert" ON public.hostels FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "hostels_update" ON public.hostels FOR UPDATE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "hostels_delete" ON public.hostels FOR DELETE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));

-- ── hostel_rooms ──────────────────────────────────────────────────────────────
CREATE POLICY "hrooms_select" ON public.hostel_rooms FOR SELECT USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "hrooms_insert" ON public.hostel_rooms FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "hrooms_update" ON public.hostel_rooms FOR UPDATE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "hrooms_delete" ON public.hostel_rooms FOR DELETE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));

-- ── library_items ─────────────────────────────────────────────────────────────
CREATE POLICY "libitem_select" ON public.library_items FOR SELECT USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "libitem_insert" ON public.library_items FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "libitem_update" ON public.library_items FOR UPDATE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "libitem_delete" ON public.library_items FOR DELETE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));

-- ── placement_companies ───────────────────────────────────────────────────────
CREATE POLICY "pco_select" ON public.placement_companies FOR SELECT USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "pco_insert" ON public.placement_companies FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "pco_update" ON public.placement_companies FOR UPDATE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "pco_delete" ON public.placement_companies FOR DELETE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));

-- ── placement_drives ──────────────────────────────────────────────────────────
CREATE POLICY "pdrv_select" ON public.placement_drives FOR SELECT USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "pdrv_insert" ON public.placement_drives FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "pdrv_update" ON public.placement_drives FOR UPDATE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "pdrv_delete" ON public.placement_drives FOR DELETE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));

-- ── knowledge_sources ─────────────────────────────────────────────────────────
CREATE POLICY "ksrc_select" ON public.knowledge_sources FOR SELECT USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "ksrc_insert" ON public.knowledge_sources FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "ksrc_update" ON public.knowledge_sources FOR UPDATE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "ksrc_delete" ON public.knowledge_sources FOR DELETE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));

-- ── knowledge_chunks ──────────────────────────────────────────────────────────
CREATE POLICY "kchunk_select" ON public.knowledge_chunks FOR SELECT USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "kchunk_insert" ON public.knowledge_chunks FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "kchunk_update" ON public.knowledge_chunks FOR UPDATE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "kchunk_delete" ON public.knowledge_chunks FOR DELETE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));


-- ════════════════════════════════════════════════════════════
-- PEOPLE TABLES
-- ════════════════════════════════════════════════════════════

-- ── faculty ───────────────────────────────────────────────────────────────────
CREATE POLICY "fac_select" ON public.faculty FOR SELECT USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "fac_update" ON public.faculty FOR UPDATE
  USING (user_id = (select auth.uid()) OR EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "fac_insert" ON public.faculty FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "fac_delete" ON public.faculty FOR DELETE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));

-- ── parents ───────────────────────────────────────────────────────────────────
-- Consolidated: own record OR admin — single policy per operation, no overlap
CREATE POLICY "parents_select" ON public.parents FOR SELECT
  USING (user_id = (select auth.uid()) OR EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "parents_update" ON public.parents FOR UPDATE
  USING (user_id = (select auth.uid()) OR EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "parents_insert" ON public.parents FOR INSERT
  WITH CHECK (user_id = (select auth.uid()) OR EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "parents_delete" ON public.parents FOR DELETE
  USING (user_id = (select auth.uid()) OR EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));

-- ── parent_student ────────────────────────────────────────────────────────────
CREATE POLICY "ps_select" ON public.parent_student FOR SELECT
  USING (
    parent_id  IN (SELECT p.id FROM public.parents p WHERE p.user_id = (select auth.uid()))
    OR student_id IN (SELECT s.id FROM public.students s WHERE s.user_id = (select auth.uid()))
    OR EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin')
  );
CREATE POLICY "ps_insert" ON public.parent_student FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "ps_delete" ON public.parent_student FOR DELETE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));


-- ════════════════════════════════════════════════════════════
-- ACADEMIC TABLES
-- ════════════════════════════════════════════════════════════

-- ── enrollments ───────────────────────────────────────────────────────────────
CREATE POLICY "enroll_select" ON public.enrollments FOR SELECT
  USING (
    student_id IN (SELECT s.id FROM public.students s WHERE s.user_id = (select auth.uid()))
    OR EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role IN ('faculty','admin'))
  );
CREATE POLICY "enroll_insert" ON public.enrollments FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "enroll_update" ON public.enrollments FOR UPDATE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "enroll_delete" ON public.enrollments FOR DELETE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));

-- ── assignments ───────────────────────────────────────────────────────────────
CREATE POLICY "asgn_select" ON public.assignments FOR SELECT USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "asgn_insert" ON public.assignments FOR INSERT
  WITH CHECK (
    faculty_id IN (SELECT f.id FROM public.faculty f WHERE f.user_id = (select auth.uid()))
    OR EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin')
  );
CREATE POLICY "asgn_update" ON public.assignments FOR UPDATE
  USING (
    faculty_id IN (SELECT f.id FROM public.faculty f WHERE f.user_id = (select auth.uid()))
    OR EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin')
  );
CREATE POLICY "asgn_delete" ON public.assignments FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));

-- ── mentorship_assignments ────────────────────────────────────────────────────
CREATE POLICY "mentor_select" ON public.mentorship_assignments FOR SELECT
  USING (
    faculty_id  IN (SELECT f.id FROM public.faculty f WHERE f.user_id = (select auth.uid()))
    OR student_id IN (SELECT s.id FROM public.students s WHERE s.user_id = (select auth.uid()))
    OR EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin')
  );
CREATE POLICY "mentor_insert" ON public.mentorship_assignments FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "mentor_update" ON public.mentorship_assignments FOR UPDATE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "mentor_delete" ON public.mentorship_assignments FOR DELETE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));

-- ── research_projects ─────────────────────────────────────────────────────────
CREATE POLICY "res_select" ON public.research_projects FOR SELECT USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "res_insert" ON public.research_projects FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "res_update" ON public.research_projects FOR UPDATE
  USING (
    principal_investigator IN (SELECT f.id FROM public.faculty f WHERE f.user_id = (select auth.uid()))
    OR EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin')
  );
CREATE POLICY "res_delete" ON public.research_projects FOR DELETE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));


-- ════════════════════════════════════════════════════════════
-- EVENTS & ANNOUNCEMENTS
-- ════════════════════════════════════════════════════════════

-- ── events ────────────────────────────────────────────────────────────────────
CREATE POLICY "evt_select" ON public.events FOR SELECT USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "evt_insert" ON public.events FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role IN ('admin','faculty')));
CREATE POLICY "evt_update" ON public.events FOR UPDATE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role IN ('admin','faculty')));
CREATE POLICY "evt_delete" ON public.events FOR DELETE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));

-- ── event_registrations ───────────────────────────────────────────────────────
CREATE POLICY "evtreg_select" ON public.event_registrations FOR SELECT
  USING (
    student_id IN (SELECT s.id FROM public.students s WHERE s.user_id = (select auth.uid()))
    OR EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role IN ('admin','faculty'))
  );
CREATE POLICY "evtreg_insert" ON public.event_registrations FOR INSERT
  WITH CHECK (
    student_id IN (SELECT s.id FROM public.students s WHERE s.user_id = (select auth.uid()))
    OR EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role IN ('admin','faculty'))
  );
CREATE POLICY "evtreg_delete" ON public.event_registrations FOR DELETE
  USING (
    student_id IN (SELECT s.id FROM public.students s WHERE s.user_id = (select auth.uid()))
    OR EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin')
  );

-- ── announcements ─────────────────────────────────────────────────────────────
CREATE POLICY "ann_select" ON public.announcements FOR SELECT USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "ann_insert" ON public.announcements FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role IN ('admin','faculty')));
CREATE POLICY "ann_update" ON public.announcements FOR UPDATE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role IN ('admin','faculty')));
CREATE POLICY "ann_delete" ON public.announcements FOR DELETE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));


-- ════════════════════════════════════════════════════════════
-- COMPLAINT SUPPORT TABLES
-- ════════════════════════════════════════════════════════════

-- ── complaint_assignments ─────────────────────────────────────────────────────
CREATE POLICY "ca_select" ON public.complaint_assignments FOR SELECT
  USING (assigned_to = (select auth.uid()) OR EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "ca_insert" ON public.complaint_assignments FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "ca_update" ON public.complaint_assignments FOR UPDATE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "ca_delete" ON public.complaint_assignments FOR DELETE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));

-- ── complaint_updates ─────────────────────────────────────────────────────────
CREATE POLICY "cu_select" ON public.complaint_updates FOR SELECT
  USING (updated_by = (select auth.uid()) OR EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "cu_insert" ON public.complaint_updates FOR INSERT
  WITH CHECK ((select auth.uid()) IS NOT NULL);
CREATE POLICY "cu_update" ON public.complaint_updates FOR UPDATE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "cu_delete" ON public.complaint_updates FOR DELETE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));


-- ── Verify: policy counts (no table should have overlapping SELECT policies) ──
SELECT tablename, COUNT(*) AS policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;


