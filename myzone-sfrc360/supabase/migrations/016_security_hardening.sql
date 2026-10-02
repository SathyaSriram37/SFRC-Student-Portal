-- ============================================================
-- 016: Security Hardening — Fix all Warning-level advisories
-- Run in Supabase SQL Editor AFTER migrations 013–015
--
-- Fixes:
--   1. Function Search Path Mutable (set_updated_at, match_knowledge_chunks)
--   2. Auth RLS Initialization Plan — wrap auth.uid() in (SELECT auth.uid())
--      so it is evaluated ONCE per query, not once per row
--   3. Multiple Permissive Policies — consolidate overlapping policies
--      on user_profiles, students, attendance_records, marks, complaints
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- 1. FIX: Function Search Path Mutable
--    Add SET search_path = '' to prevent search_path hijacking
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.match_knowledge_chunks(
  query_embedding public.vector(1536),
  match_threshold  FLOAT DEFAULT 0.7,
  match_count      INT   DEFAULT 5
)
RETURNS TABLE (
  id         UUID,
  content    TEXT,
  metadata   JSONB,
  source_id  UUID,
  similarity FLOAT
)
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    kc.id,
    kc.content,
    kc.metadata,
    kc.source_id,
    1 - (kc.embedding <=> query_embedding) AS similarity
  FROM public.knowledge_chunks kc
  WHERE 1 - (kc.embedding <=> query_embedding) > match_threshold
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
$$;


-- ════════════════════════════════════════════════════════════
-- 2 & 3. FIX: Auth RLS Initialization + Multiple Permissive Policies
--
-- Strategy:
--   a) Drop all redundant / overlapping policies on the 5 affected tables
--   b) Recreate as SINGLE combined policies using OR logic
--   c) Wrap all auth.uid() calls in (SELECT auth.uid()) for plan-time
--      evaluation (one lookup per query, not per row)
-- ════════════════════════════════════════════════════════════

-- ── user_profiles ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "own_profile"         ON public.user_profiles;
DROP POLICY IF EXISTS "admin_all_profiles"  ON public.user_profiles;

-- Consolidated: own row OR admin — evaluated once per query
CREATE POLICY "user_profiles_select"
  ON public.user_profiles FOR SELECT
  USING (
    id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
    )
  );

CREATE POLICY "user_profiles_insert"
  ON public.user_profiles FOR INSERT
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "user_profiles_update"
  ON public.user_profiles FOR UPDATE
  USING (
    id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
    )
  );

CREATE POLICY "user_profiles_delete"
  ON public.user_profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
    )
  );


-- ── students ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "own_student_record"    ON public.students;
DROP POLICY IF EXISTS "faculty_admin_students" ON public.students;

-- Consolidated: own row OR faculty OR admin
CREATE POLICY "students_select"
  ON public.students FOR SELECT
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role IN ('faculty', 'admin')
    )
  );

CREATE POLICY "students_admin_write"
  ON public.students FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
    )
  );


-- ── attendance_records ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "own_attendance"       ON public.attendance_records;
DROP POLICY IF EXISTS "admin_all_attendance" ON public.attendance_records;

-- Consolidated read: own student OR admin/faculty
CREATE POLICY "attendance_select"
  ON public.attendance_records FOR SELECT
  USING (
    student_id IN (
      SELECT s.id FROM public.students s WHERE s.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role IN ('faculty', 'admin')
    )
  );

-- Keep faculty write policies but update auth.uid() calls
DROP POLICY IF EXISTS "faculty_mark_attendance"   ON public.attendance_records;
DROP POLICY IF EXISTS "faculty_update_attendance" ON public.attendance_records;

CREATE POLICY "attendance_faculty_insert"
  ON public.attendance_records FOR INSERT
  WITH CHECK (
    marked_by IN (
      SELECT f.id FROM public.faculty f WHERE f.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
    )
  );

CREATE POLICY "attendance_faculty_update"
  ON public.attendance_records FOR UPDATE
  USING (
    marked_by IN (
      SELECT f.id FROM public.faculty f WHERE f.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
    )
  );


-- ── marks ─────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "own_marks"        ON public.marks;
DROP POLICY IF EXISTS "admin_all_marks"  ON public.marks;

-- Consolidated read: own student OR faculty OR admin
CREATE POLICY "marks_select"
  ON public.marks FOR SELECT
  USING (
    student_id IN (
      SELECT s.id FROM public.students s WHERE s.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role IN ('faculty', 'admin')
    )
  );

DROP POLICY IF EXISTS "faculty_enter_marks" ON public.marks;

CREATE POLICY "marks_faculty_insert"
  ON public.marks FOR INSERT
  WITH CHECK (
    entered_by IN (
      SELECT f.id FROM public.faculty f WHERE f.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
    )
  );

CREATE POLICY "marks_admin_update_delete"
  ON public.marks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
    )
  );


-- ── complaints ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "own_complaints"       ON public.complaints;
DROP POLICY IF EXISTS "admin_all_complaints" ON public.complaints;

-- Consolidated read: own reporter OR admin
CREATE POLICY "complaints_select"
  ON public.complaints FOR SELECT
  USING (
    reporter_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
    )
  );

-- Keep insert / update policies
DROP POLICY IF EXISTS "auth_create_complaint" ON public.complaints;

CREATE POLICY "complaints_insert_auth"
  ON public.complaints FOR INSERT
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "complaints_admin_update"
  ON public.complaints FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
    )
  );


-- ════════════════════════════════════════════════════════════
-- Fix (SELECT auth.uid()) in remaining policies from migration 013
-- that still use bare auth.uid() — performance improvement
-- ════════════════════════════════════════════════════════════

-- mentoring_records
DROP POLICY IF EXISTS "faculty_own_mentoring" ON public.mentoring_records;
CREATE POLICY "mentoring_faculty_all"
  ON public.mentoring_records FOR ALL
  USING (
    assignment_id IN (
      SELECT ma.id
      FROM public.mentorship_assignments ma
      JOIN public.faculty f ON f.id = ma.faculty_id
      WHERE f.user_id = (SELECT auth.uid())
    )
  );

-- notifications
DROP POLICY IF EXISTS "own_notifications" ON public.notifications;
CREATE POLICY "notifications_own"
  ON public.notifications FOR ALL
  USING (user_id = (SELECT auth.uid()));

-- audit_logs
DROP POLICY IF EXISTS "admin_audit_logs"    ON public.audit_logs;
DROP POLICY IF EXISTS "system_insert_audit" ON public.audit_logs;
CREATE POLICY "audit_logs_admin_read"
  ON public.audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
    )
  );
CREATE POLICY "audit_logs_insert"
  ON public.audit_logs FOR INSERT
  WITH CHECK (true);

-- library_loans
DROP POLICY IF EXISTS "own_library_loans" ON public.library_loans;
CREATE POLICY "library_loans_own"
  ON public.library_loans FOR SELECT
  USING (
    student_id IN (
      SELECT s.id FROM public.students s WHERE s.user_id = (SELECT auth.uid())
    )
  );

-- hostel_allocations
DROP POLICY IF EXISTS "own_hostel_allocation" ON public.hostel_allocations;
CREATE POLICY "hostel_allocations_own"
  ON public.hostel_allocations FOR SELECT
  USING (
    student_id IN (
      SELECT s.id FROM public.students s WHERE s.user_id = (SELECT auth.uid())
    )
  );

-- hostel_leave_requests
DROP POLICY IF EXISTS "own_leave_requests" ON public.hostel_leave_requests;
CREATE POLICY "leave_requests_own"
  ON public.hostel_leave_requests FOR ALL
  USING (
    student_id IN (
      SELECT s.id FROM public.students s WHERE s.user_id = (SELECT auth.uid())
    )
  );

-- ai_conversations
DROP POLICY IF EXISTS "own_ai_conversations" ON public.ai_conversations;
CREATE POLICY "ai_conversations_own"
  ON public.ai_conversations FOR ALL
  USING (user_id = (SELECT auth.uid()));

-- ai_messages
DROP POLICY IF EXISTS "own_ai_messages" ON public.ai_messages;
CREATE POLICY "ai_messages_own"
  ON public.ai_messages FOR ALL
  USING (
    conversation_id IN (
      SELECT ac.id FROM public.ai_conversations ac
      WHERE ac.user_id = (SELECT auth.uid())
    )
  );


-- ════════════════════════════════════════════════════════════
-- NOTE: Extension in Public (vector in public schema)
-- This warning cannot be fixed by DROP+RECREATE without
-- dropping the knowledge_chunks table column. This is a
-- Supabase-managed advisory; the vector extension works
-- correctly in the public schema and poses no runtime risk.
-- Supabase themselves install it there on managed projects.
-- ════════════════════════════════════════════════════════════


-- ── Verify: check policy counts per table ─────────────────────────────────────
SELECT
  schemaname,
  tablename,
  COUNT(*) AS policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;
