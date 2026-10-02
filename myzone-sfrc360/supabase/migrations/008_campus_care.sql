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
