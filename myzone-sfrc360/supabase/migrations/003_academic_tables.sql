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
