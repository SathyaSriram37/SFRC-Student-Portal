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
