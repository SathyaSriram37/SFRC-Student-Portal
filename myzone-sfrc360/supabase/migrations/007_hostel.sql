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
