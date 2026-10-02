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
