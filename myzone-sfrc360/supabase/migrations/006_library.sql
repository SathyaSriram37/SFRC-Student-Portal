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
