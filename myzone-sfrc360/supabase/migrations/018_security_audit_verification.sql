-- ============================================================
-- 018: Phase 19 Security Audit Verification Suite
-- MyZone SFRC 360 - Database Role Isolation & RLS Audit
-- ============================================================

-- Test 1: Student A cannot see Student B marks (Expect 0 rows)
-- Simulation helper: checks RLS on public.marks
CREATE OR REPLACE FUNCTION test_student_marks_isolation(
  p_current_student_user_id UUID,
  p_target_student_id UUID
)
RETURNS TABLE(marks_id UUID, marks_obtained NUMERIC)
LANGUAGE sql
SECURITY INVOKER
AS $$
  SELECT m.id AS marks_id, m.marks_obtained
  FROM public.marks m
  JOIN public.students s ON m.student_id = s.id
  WHERE m.student_id = p_target_student_id
    AND s.user_id <> p_current_student_user_id;
$$;

-- Test 2: Parent can only see linked ward attendance (Expect 0 rows for unlinked)
CREATE OR REPLACE FUNCTION test_parent_ward_isolation(
  p_parent_user_id UUID,
  p_unlinked_student_id UUID
)
RETURNS TABLE(record_id UUID, student_id UUID)
LANGUAGE sql
SECURITY INVOKER
AS $$
  SELECT ar.id AS record_id, ar.student_id
  FROM public.attendance_records ar
  WHERE ar.student_id = p_unlinked_student_id
    AND ar.student_id NOT IN (
      SELECT ps.student_id 
      FROM public.parent_student ps 
      JOIN public.parents p ON ps.parent_id = p.id
      WHERE p.user_id = p_parent_user_id
    );
$$;

-- Test 3: Draft e-content blocked for regular students (Expect 0 rows)
CREATE OR REPLACE FUNCTION test_student_cannot_view_draft_econtent()
RETURNS TABLE(item_id UUID, title TEXT, status TEXT)
LANGUAGE sql
SECURITY INVOKER
AS $$
  SELECT id AS item_id, title, status
  FROM public.econtent_items
  WHERE status = 'draft';
$$;

-- Test 4: Private alumni profiles inaccessible to students (Expect 0 rows)
CREATE OR REPLACE FUNCTION test_student_cannot_view_private_alumni()
RETURNS TABLE(alumni_id UUID, full_name TEXT, profile_visibility TEXT)
LANGUAGE sql
SECURITY INVOKER
AS $$
  SELECT id AS alumni_id, full_name, profile_visibility
  FROM public.alumni_profiles
  WHERE profile_visibility = 'private';
$$;

-- Test 5: Verify RLS is enabled on all core tables
CREATE OR REPLACE VIEW v_security_audit_rls_status AS
SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'marks',
    'attendance_records',
    'econtent_items',
    'alumni_profiles',
    'mentoring_records',
    'complaints',
    'audit_logs'
  );
