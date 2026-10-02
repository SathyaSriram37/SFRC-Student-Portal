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
