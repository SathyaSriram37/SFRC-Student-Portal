-- ============================================================
-- 013: Row Level Security (RLS) Policies
-- Run AFTER all tables are created
-- All subqueries use explicit table aliases to prevent
-- "column reference id is ambiguous" errors in PostgreSQL
-- ============================================================

-- Enable RLS on all sensitive tables
ALTER TABLE public.user_profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marks               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentoring_records   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_loans       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hostel_allocations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hostel_leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages         ENABLE ROW LEVEL SECURITY;

-- ── user_profiles ─────────────────────────────────────────────────────────────
-- Users can view/edit their own profile
CREATE POLICY "own_profile"
  ON public.user_profiles FOR ALL
  USING (auth.uid() = id);

-- Admins can see all profiles
-- NOTE: alias 'up' on the subquery prevents ambiguity when outer table is also user_profiles
CREATE POLICY "admin_all_profiles"
  ON public.user_profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  );

-- ── students ──────────────────────────────────────────────────────────────────
CREATE POLICY "own_student_record"
  ON public.students FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "faculty_admin_students"
  ON public.students FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role IN ('faculty','admin')
    )
  );

-- ── attendance_records ────────────────────────────────────────────────────────
CREATE POLICY "own_attendance"
  ON public.attendance_records FOR SELECT
  USING (
    student_id IN (
      SELECT s.id FROM public.students s WHERE s.user_id = auth.uid()
    )
  );

CREATE POLICY "faculty_mark_attendance"
  ON public.attendance_records FOR INSERT
  WITH CHECK (
    marked_by IN (
      SELECT f.id FROM public.faculty f WHERE f.user_id = auth.uid()
    )
  );

CREATE POLICY "faculty_update_attendance"
  ON public.attendance_records FOR UPDATE
  USING (
    marked_by IN (
      SELECT f.id FROM public.faculty f WHERE f.user_id = auth.uid()
    )
  );

CREATE POLICY "admin_all_attendance"
  ON public.attendance_records FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  );

-- ── marks ─────────────────────────────────────────────────────────────────────
CREATE POLICY "own_marks"
  ON public.marks FOR SELECT
  USING (
    student_id IN (
      SELECT s.id FROM public.students s WHERE s.user_id = auth.uid()
    )
  );

CREATE POLICY "faculty_enter_marks"
  ON public.marks FOR INSERT
  WITH CHECK (
    entered_by IN (
      SELECT f.id FROM public.faculty f WHERE f.user_id = auth.uid()
    )
  );

CREATE POLICY "admin_all_marks"
  ON public.marks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  );

-- ── mentoring_records ─────────────────────────────────────────────────────────
-- CRITICAL FIX: was SELECT id with JOIN — both tables have id, must use ma.id
CREATE POLICY "faculty_own_mentoring"
  ON public.mentoring_records FOR ALL
  USING (
    assignment_id IN (
      SELECT ma.id
      FROM public.mentorship_assignments ma
      JOIN public.faculty f ON f.id = ma.faculty_id
      WHERE f.user_id = auth.uid()
    )
  );

-- ── complaints ────────────────────────────────────────────────────────────────
CREATE POLICY "own_complaints"
  ON public.complaints FOR SELECT
  USING (reporter_id = auth.uid());

CREATE POLICY "auth_create_complaint"
  ON public.complaints FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "admin_all_complaints"
  ON public.complaints FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  );

-- ── notifications ─────────────────────────────────────────────────────────────
CREATE POLICY "own_notifications"
  ON public.notifications FOR ALL
  USING (user_id = auth.uid());

-- ── audit_logs ────────────────────────────────────────────────────────────────
CREATE POLICY "admin_audit_logs"
  ON public.audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  );

CREATE POLICY "system_insert_audit"
  ON public.audit_logs FOR INSERT
  WITH CHECK (true);

-- ── library_loans ─────────────────────────────────────────────────────────────
CREATE POLICY "own_library_loans"
  ON public.library_loans FOR SELECT
  USING (
    student_id IN (
      SELECT s.id FROM public.students s WHERE s.user_id = auth.uid()
    )
  );

-- ── hostel ────────────────────────────────────────────────────────────────────
CREATE POLICY "own_hostel_allocation"
  ON public.hostel_allocations FOR SELECT
  USING (
    student_id IN (
      SELECT s.id FROM public.students s WHERE s.user_id = auth.uid()
    )
  );

CREATE POLICY "own_leave_requests"
  ON public.hostel_leave_requests FOR ALL
  USING (
    student_id IN (
      SELECT s.id FROM public.students s WHERE s.user_id = auth.uid()
    )
  );

-- ── ai_conversations ──────────────────────────────────────────────────────────
CREATE POLICY "own_ai_conversations"
  ON public.ai_conversations FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "own_ai_messages"
  ON public.ai_messages FOR ALL
  USING (
    conversation_id IN (
      SELECT ac.id FROM public.ai_conversations ac WHERE ac.user_id = auth.uid()
    )
  );
