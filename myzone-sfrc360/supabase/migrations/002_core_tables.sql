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
