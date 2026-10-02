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
