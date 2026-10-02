-- ============================================================
-- 015: Enable RLS on remaining 24 tables
-- Run in Supabase SQL Editor AFTER migration 013
-- All subqueries use explicit table aliases to prevent
-- "column reference id is ambiguous" errors
-- ============================================================

-- ── Enable RLS ────────────────────────────────────────────────────────────────
ALTER TABLE public.departments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programmes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parents               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_student        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetables            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorship_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hostels               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hostel_rooms          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_updates     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_policies          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.placement_companies   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.placement_drives      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_projects     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_sources     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_chunks      ENABLE ROW LEVEL SECURITY;


-- ════════════════════════════════════════════════════════════
-- REFERENCE / LOOKUP TABLES
-- Pattern: any authenticated user can SELECT; only admins write
-- ════════════════════════════════════════════════════════════

-- ── departments ───────────────────────────────────────────────────────────────
CREATE POLICY "departments_read_auth"
  ON public.departments FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "departments_admin_write"
  ON public.departments FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  );

-- ── programmes ────────────────────────────────────────────────────────────────
CREATE POLICY "programmes_read_auth"
  ON public.programmes FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "programmes_admin_write"
  ON public.programmes FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  );

-- ── courses ───────────────────────────────────────────────────────────────────
CREATE POLICY "courses_read_auth"
  ON public.courses FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "courses_admin_write"
  ON public.courses FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  );

-- ── timetables ────────────────────────────────────────────────────────────────
CREATE POLICY "timetables_read_auth"
  ON public.timetables FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "timetables_admin_write"
  ON public.timetables FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  );

-- ── sla_policies ──────────────────────────────────────────────────────────────
CREATE POLICY "sla_policies_read_auth"
  ON public.sla_policies FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "sla_policies_admin_write"
  ON public.sla_policies FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  );

-- ── hostels ───────────────────────────────────────────────────────────────────
CREATE POLICY "hostels_read_auth"
  ON public.hostels FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "hostels_admin_write"
  ON public.hostels FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  );

-- ── hostel_rooms ──────────────────────────────────────────────────────────────
CREATE POLICY "hostel_rooms_read_auth"
  ON public.hostel_rooms FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "hostel_rooms_admin_write"
  ON public.hostel_rooms FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  );

-- ── library_items ─────────────────────────────────────────────────────────────
CREATE POLICY "library_items_read_auth"
  ON public.library_items FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "library_items_admin_write"
  ON public.library_items FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  );

-- ── placement_companies ───────────────────────────────────────────────────────
CREATE POLICY "placement_companies_read_auth"
  ON public.placement_companies FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "placement_companies_admin_write"
  ON public.placement_companies FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  );

-- ── placement_drives ──────────────────────────────────────────────────────────
CREATE POLICY "placement_drives_read_auth"
  ON public.placement_drives FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "placement_drives_admin_write"
  ON public.placement_drives FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  );

-- ── knowledge_sources ─────────────────────────────────────────────────────────
CREATE POLICY "knowledge_sources_read_auth"
  ON public.knowledge_sources FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "knowledge_sources_admin_write"
  ON public.knowledge_sources FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  );

-- ── knowledge_chunks ──────────────────────────────────────────────────────────
-- Readable by all authenticated (required for RAG retrieval via match_knowledge_chunks RPC)
CREATE POLICY "knowledge_chunks_read_auth"
  ON public.knowledge_chunks FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "knowledge_chunks_admin_write"
  ON public.knowledge_chunks FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  );


-- ════════════════════════════════════════════════════════════
-- PEOPLE TABLES
-- ════════════════════════════════════════════════════════════

-- ── faculty ───────────────────────────────────────────────────────────────────
-- Faculty see their own record; all authenticated can read basic faculty info
CREATE POLICY "faculty_read_auth"
  ON public.faculty FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "faculty_own_write"
  ON public.faculty FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "faculty_admin_write"
  ON public.faculty FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  );

-- ── parents ───────────────────────────────────────────────────────────────────
CREATE POLICY "parents_own_record"
  ON public.parents FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "parents_admin_all"
  ON public.parents FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  );

-- ── parent_student ────────────────────────────────────────────────────────────
-- Parents see their own links; students see who their parent is; admin sees all
CREATE POLICY "parent_student_parent_read"
  ON public.parent_student FOR SELECT
  USING (
    parent_id IN (
      SELECT p.id FROM public.parents p WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "parent_student_student_read"
  ON public.parent_student FOR SELECT
  USING (
    student_id IN (
      SELECT s.id FROM public.students s WHERE s.user_id = auth.uid()
    )
  );

CREATE POLICY "parent_student_admin_all"
  ON public.parent_student FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  );


-- ════════════════════════════════════════════════════════════
-- ACADEMIC TABLES
-- ════════════════════════════════════════════════════════════

-- ── enrollments ───────────────────────────────────────────────────────────────
CREATE POLICY "enrollments_own_student"
  ON public.enrollments FOR SELECT
  USING (
    student_id IN (
      SELECT s.id FROM public.students s WHERE s.user_id = auth.uid()
    )
  );

CREATE POLICY "enrollments_faculty_read"
  ON public.enrollments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role IN ('faculty', 'admin')
    )
  );

CREATE POLICY "enrollments_admin_write"
  ON public.enrollments FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  );

-- ── assignments ───────────────────────────────────────────────────────────────
-- Students see assignments for their enrolled courses; faculty see their own
CREATE POLICY "assignments_read_auth"
  ON public.assignments FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "assignments_faculty_write"
  ON public.assignments FOR INSERT
  WITH CHECK (
    faculty_id IN (
      SELECT f.id FROM public.faculty f WHERE f.user_id = auth.uid()
    )
  );

CREATE POLICY "assignments_faculty_update"
  ON public.assignments FOR UPDATE
  USING (
    faculty_id IN (
      SELECT f.id FROM public.faculty f WHERE f.user_id = auth.uid()
    )
  );

CREATE POLICY "assignments_admin_all"
  ON public.assignments FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  );

-- ── mentorship_assignments ────────────────────────────────────────────────────
CREATE POLICY "mentorship_faculty_read"
  ON public.mentorship_assignments FOR SELECT
  USING (
    faculty_id IN (
      SELECT f.id FROM public.faculty f WHERE f.user_id = auth.uid()
    )
  );

CREATE POLICY "mentorship_student_read"
  ON public.mentorship_assignments FOR SELECT
  USING (
    student_id IN (
      SELECT s.id FROM public.students s WHERE s.user_id = auth.uid()
    )
  );

CREATE POLICY "mentorship_admin_all"
  ON public.mentorship_assignments FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  );

-- ── research_projects ─────────────────────────────────────────────────────────
CREATE POLICY "research_read_auth"
  ON public.research_projects FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "research_pi_write"
  ON public.research_projects FOR UPDATE
  USING (
    principal_investigator IN (
      SELECT f.id FROM public.faculty f WHERE f.user_id = auth.uid()
    )
  );

CREATE POLICY "research_admin_all"
  ON public.research_projects FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  );


-- ════════════════════════════════════════════════════════════
-- EVENTS & ANNOUNCEMENTS
-- ════════════════════════════════════════════════════════════

-- ── events ────────────────────────────────────────────────────────────────────
CREATE POLICY "events_read_auth"
  ON public.events FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "events_admin_write"
  ON public.events FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role IN ('admin', 'faculty')
    )
  );

-- ── event_registrations ───────────────────────────────────────────────────────
CREATE POLICY "event_reg_own_student"
  ON public.event_registrations FOR ALL
  USING (
    student_id IN (
      SELECT s.id FROM public.students s WHERE s.user_id = auth.uid()
    )
  );

CREATE POLICY "event_reg_admin_all"
  ON public.event_registrations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role IN ('admin', 'faculty')
    )
  );

-- ── announcements ─────────────────────────────────────────────────────────────
CREATE POLICY "announcements_read_auth"
  ON public.announcements FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "announcements_admin_write"
  ON public.announcements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role IN ('admin', 'faculty')
    )
  );


-- ════════════════════════════════════════════════════════════
-- COMPLAINT SUPPORT TABLES
-- ════════════════════════════════════════════════════════════

-- ── complaint_assignments ─────────────────────────────────────────────────────
-- Admin can manage; assigned person can view their own
CREATE POLICY "complaint_assignments_assigned_read"
  ON public.complaint_assignments FOR SELECT
  USING (assigned_to = auth.uid());

CREATE POLICY "complaint_assignments_admin_all"
  ON public.complaint_assignments FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  );

-- ── complaint_updates ─────────────────────────────────────────────────────────
-- Anyone who updated can see their own; admin sees all
CREATE POLICY "complaint_updates_own"
  ON public.complaint_updates FOR SELECT
  USING (updated_by = auth.uid());

CREATE POLICY "complaint_updates_insert_auth"
  ON public.complaint_updates FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "complaint_updates_admin_all"
  ON public.complaint_updates FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  );


-- ── Verify: all 24 tables now have RLS enabled ────────────────────────────────
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = true
ORDER BY tablename;
