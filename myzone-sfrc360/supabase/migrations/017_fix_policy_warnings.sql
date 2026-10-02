-- ============================================================
-- 017: Fix remaining security advisor warnings
--
-- Fixes:
--   Warning 2 & 3: Public/Signed-in can execute SECURITY DEFINER functions
--     → REVOKE EXECUTE on set_updated_at from all roles (trigger only)
--     → REVOKE EXECUTE on match_knowledge_chunks from anon (keep authenticated)
--
--   Warning 4: Auth RLS Initialization Plan (56 findings)
--     → All auth.uid() calls wrapped in (SELECT auth.uid())
--
--   Warning 5: Multiple Permissive Policies (180 findings)
--     → Split every FOR ALL admin policy into separate
--       FOR INSERT / FOR UPDATE / FOR DELETE policies
--       so SELECT policies no longer overlap with write policies
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- FIX 2 & 3: SECURITY DEFINER function permissions
-- ════════════════════════════════════════════════════════════

-- set_updated_at is a trigger function — no role should call it via RPC
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM authenticated;

-- match_knowledge_chunks: authenticated users need it for RAG, anon must not
REVOKE EXECUTE ON FUNCTION public.match_knowledge_chunks(public.vector, float8, int4) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.match_knowledge_chunks(public.vector, float8, int4) FROM anon;
GRANT  EXECUTE ON FUNCTION public.match_knowledge_chunks(public.vector, float8, int4) TO authenticated;


-- ════════════════════════════════════════════════════════════
-- FIX 4 & 5: Drop ALL migration-015 policies and recreate
--   • (select auth.uid()) — evaluated once per query, not per row
--   • FOR INSERT / FOR UPDATE / FOR DELETE instead of FOR ALL
--     on admin write policies → eliminates SELECT overlap
-- ════════════════════════════════════════════════════════════

-- ── Drop migration-015 AND migration-017 policies (idempotent) ───────────────
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public'
    AND policyname IN (
      -- migration 015 old names
      'departments_read_auth','departments_admin_write',
      'programmes_read_auth','programmes_admin_write',
      'courses_read_auth','courses_admin_write',
      'timetables_read_auth','timetables_admin_write',
      'sla_policies_read_auth','sla_policies_admin_write',
      'hostels_read_auth','hostels_admin_write',
      'hostel_rooms_read_auth','hostel_rooms_admin_write',
      'library_items_read_auth','library_items_admin_write',
      'placement_companies_read_auth','placement_companies_admin_write',
      'placement_drives_read_auth','placement_drives_admin_write',
      'knowledge_sources_read_auth','knowledge_sources_admin_write',
      'knowledge_chunks_read_auth','knowledge_chunks_admin_write',
      'faculty_read_auth','faculty_own_write','faculty_admin_write',
      'parents_own_record','parents_admin_all',
      'parent_student_parent_read','parent_student_student_read','parent_student_admin_all',
      'enrollments_own_student','enrollments_faculty_read','enrollments_admin_write',
      'assignments_read_auth','assignments_faculty_write','assignments_faculty_update','assignments_admin_all',
      'mentorship_faculty_read','mentorship_student_read','mentorship_admin_all',
      'research_read_auth','research_pi_write','research_admin_all',
      'events_read_auth','events_admin_write',
      'event_reg_own_student','event_reg_admin_all',
      'announcements_read_auth','announcements_admin_write',
      'complaint_assignments_assigned_read','complaint_assignments_admin_all',
      'complaint_updates_own','complaint_updates_insert_auth','complaint_updates_admin_all',
      -- migration 017 new names (makes this migration safe to re-run)
      'dept_select','dept_insert','dept_update','dept_delete',
      'prog_select','prog_insert','prog_update','prog_delete',
      'courses_select','courses_insert','courses_update','courses_delete',
      'tt_select','tt_insert','tt_update','tt_delete',
      'sla_select','sla_insert','sla_update','sla_delete',
      'hostels_select','hostels_insert','hostels_update','hostels_delete',
      'hrooms_select','hrooms_insert','hrooms_update','hrooms_delete',
      'libitem_select','libitem_insert','libitem_update','libitem_delete',
      'pco_select','pco_insert','pco_update','pco_delete',
      'pdrv_select','pdrv_insert','pdrv_update','pdrv_delete',
      'ksrc_select','ksrc_insert','ksrc_update','ksrc_delete',
      'kchunk_select','kchunk_insert','kchunk_update','kchunk_delete',
      'fac_select','fac_update','fac_insert','fac_delete',
      'parents_select','parents_update','parents_insert','parents_delete',
      'ps_select','ps_insert','ps_delete',
      'enroll_select','enroll_insert','enroll_update','enroll_delete',
      'asgn_select','asgn_insert','asgn_update','asgn_delete',
      'mentor_select','mentor_insert','mentor_update','mentor_delete',
      'res_select','res_insert','res_update','res_delete',
      'evt_select','evt_insert','evt_update','evt_delete',
      'evtreg_select','evtreg_insert','evtreg_delete',
      'ann_select','ann_insert','ann_update','ann_delete',
      'ca_select','ca_insert','ca_update','ca_delete',
      'cu_select','cu_insert','cu_update','cu_delete'
    )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;


-- ════════════════════════════════════════════════════════════
-- REFERENCE TABLES — pattern:
--   SELECT: any authenticated user (one open policy, no overlap)
--   INSERT/UPDATE/DELETE: admin only (separate, no SELECT overlap)
-- ════════════════════════════════════════════════════════════

-- ── departments ───────────────────────────────────────────────────────────────
CREATE POLICY "dept_select"  ON public.departments FOR SELECT USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "dept_insert"  ON public.departments FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "dept_update"  ON public.departments FOR UPDATE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "dept_delete"  ON public.departments FOR DELETE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));

-- ── programmes ────────────────────────────────────────────────────────────────
CREATE POLICY "prog_select"  ON public.programmes FOR SELECT USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "prog_insert"  ON public.programmes FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "prog_update"  ON public.programmes FOR UPDATE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "prog_delete"  ON public.programmes FOR DELETE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));

-- ── courses ───────────────────────────────────────────────────────────────────
CREATE POLICY "courses_select" ON public.courses FOR SELECT USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "courses_insert" ON public.courses FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "courses_update" ON public.courses FOR UPDATE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "courses_delete" ON public.courses FOR DELETE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));

-- ── timetables ────────────────────────────────────────────────────────────────
CREATE POLICY "tt_select" ON public.timetables FOR SELECT USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "tt_insert" ON public.timetables FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "tt_update" ON public.timetables FOR UPDATE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "tt_delete" ON public.timetables FOR DELETE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));

-- ── sla_policies ──────────────────────────────────────────────────────────────
CREATE POLICY "sla_select" ON public.sla_policies FOR SELECT USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "sla_insert" ON public.sla_policies FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "sla_update" ON public.sla_policies FOR UPDATE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "sla_delete" ON public.sla_policies FOR DELETE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));

-- ── hostels ───────────────────────────────────────────────────────────────────
CREATE POLICY "hostels_select" ON public.hostels FOR SELECT USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "hostels_insert" ON public.hostels FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "hostels_update" ON public.hostels FOR UPDATE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "hostels_delete" ON public.hostels FOR DELETE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));

-- ── hostel_rooms ──────────────────────────────────────────────────────────────
CREATE POLICY "hrooms_select" ON public.hostel_rooms FOR SELECT USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "hrooms_insert" ON public.hostel_rooms FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "hrooms_update" ON public.hostel_rooms FOR UPDATE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "hrooms_delete" ON public.hostel_rooms FOR DELETE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));

-- ── library_items ─────────────────────────────────────────────────────────────
CREATE POLICY "libitem_select" ON public.library_items FOR SELECT USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "libitem_insert" ON public.library_items FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "libitem_update" ON public.library_items FOR UPDATE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "libitem_delete" ON public.library_items FOR DELETE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));

-- ── placement_companies ───────────────────────────────────────────────────────
CREATE POLICY "pco_select" ON public.placement_companies FOR SELECT USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "pco_insert" ON public.placement_companies FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "pco_update" ON public.placement_companies FOR UPDATE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "pco_delete" ON public.placement_companies FOR DELETE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));

-- ── placement_drives ──────────────────────────────────────────────────────────
CREATE POLICY "pdrv_select" ON public.placement_drives FOR SELECT USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "pdrv_insert" ON public.placement_drives FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "pdrv_update" ON public.placement_drives FOR UPDATE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "pdrv_delete" ON public.placement_drives FOR DELETE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));

-- ── knowledge_sources ─────────────────────────────────────────────────────────
CREATE POLICY "ksrc_select" ON public.knowledge_sources FOR SELECT USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "ksrc_insert" ON public.knowledge_sources FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "ksrc_update" ON public.knowledge_sources FOR UPDATE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "ksrc_delete" ON public.knowledge_sources FOR DELETE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));

-- ── knowledge_chunks ──────────────────────────────────────────────────────────
CREATE POLICY "kchunk_select" ON public.knowledge_chunks FOR SELECT USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "kchunk_insert" ON public.knowledge_chunks FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "kchunk_update" ON public.knowledge_chunks FOR UPDATE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "kchunk_delete" ON public.knowledge_chunks FOR DELETE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));


-- ════════════════════════════════════════════════════════════
-- PEOPLE TABLES
-- ════════════════════════════════════════════════════════════

-- ── faculty ───────────────────────────────────────────────────────────────────
CREATE POLICY "fac_select" ON public.faculty FOR SELECT USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "fac_update" ON public.faculty FOR UPDATE
  USING (user_id = (select auth.uid()) OR EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "fac_insert" ON public.faculty FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "fac_delete" ON public.faculty FOR DELETE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));

-- ── parents ───────────────────────────────────────────────────────────────────
-- Consolidated: own record OR admin — single policy per operation, no overlap
CREATE POLICY "parents_select" ON public.parents FOR SELECT
  USING (user_id = (select auth.uid()) OR EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "parents_update" ON public.parents FOR UPDATE
  USING (user_id = (select auth.uid()) OR EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "parents_insert" ON public.parents FOR INSERT
  WITH CHECK (user_id = (select auth.uid()) OR EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "parents_delete" ON public.parents FOR DELETE
  USING (user_id = (select auth.uid()) OR EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));

-- ── parent_student ────────────────────────────────────────────────────────────
CREATE POLICY "ps_select" ON public.parent_student FOR SELECT
  USING (
    parent_id  IN (SELECT p.id FROM public.parents p WHERE p.user_id = (select auth.uid()))
    OR student_id IN (SELECT s.id FROM public.students s WHERE s.user_id = (select auth.uid()))
    OR EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin')
  );
CREATE POLICY "ps_insert" ON public.parent_student FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "ps_delete" ON public.parent_student FOR DELETE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));


-- ════════════════════════════════════════════════════════════
-- ACADEMIC TABLES
-- ════════════════════════════════════════════════════════════

-- ── enrollments ───────────────────────────────────────────────────────────────
CREATE POLICY "enroll_select" ON public.enrollments FOR SELECT
  USING (
    student_id IN (SELECT s.id FROM public.students s WHERE s.user_id = (select auth.uid()))
    OR EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role IN ('faculty','admin'))
  );
CREATE POLICY "enroll_insert" ON public.enrollments FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "enroll_update" ON public.enrollments FOR UPDATE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "enroll_delete" ON public.enrollments FOR DELETE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));

-- ── assignments ───────────────────────────────────────────────────────────────
CREATE POLICY "asgn_select" ON public.assignments FOR SELECT USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "asgn_insert" ON public.assignments FOR INSERT
  WITH CHECK (
    faculty_id IN (SELECT f.id FROM public.faculty f WHERE f.user_id = (select auth.uid()))
    OR EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin')
  );
CREATE POLICY "asgn_update" ON public.assignments FOR UPDATE
  USING (
    faculty_id IN (SELECT f.id FROM public.faculty f WHERE f.user_id = (select auth.uid()))
    OR EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin')
  );
CREATE POLICY "asgn_delete" ON public.assignments FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));

-- ── mentorship_assignments ────────────────────────────────────────────────────
CREATE POLICY "mentor_select" ON public.mentorship_assignments FOR SELECT
  USING (
    faculty_id  IN (SELECT f.id FROM public.faculty f WHERE f.user_id = (select auth.uid()))
    OR student_id IN (SELECT s.id FROM public.students s WHERE s.user_id = (select auth.uid()))
    OR EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin')
  );
CREATE POLICY "mentor_insert" ON public.mentorship_assignments FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "mentor_update" ON public.mentorship_assignments FOR UPDATE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "mentor_delete" ON public.mentorship_assignments FOR DELETE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));

-- ── research_projects ─────────────────────────────────────────────────────────
CREATE POLICY "res_select" ON public.research_projects FOR SELECT USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "res_insert" ON public.research_projects FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "res_update" ON public.research_projects FOR UPDATE
  USING (
    principal_investigator IN (SELECT f.id FROM public.faculty f WHERE f.user_id = (select auth.uid()))
    OR EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin')
  );
CREATE POLICY "res_delete" ON public.research_projects FOR DELETE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));


-- ════════════════════════════════════════════════════════════
-- EVENTS & ANNOUNCEMENTS
-- ════════════════════════════════════════════════════════════

-- ── events ────────────────────────────────────────────────────────────────────
CREATE POLICY "evt_select" ON public.events FOR SELECT USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "evt_insert" ON public.events FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role IN ('admin','faculty')));
CREATE POLICY "evt_update" ON public.events FOR UPDATE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role IN ('admin','faculty')));
CREATE POLICY "evt_delete" ON public.events FOR DELETE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));

-- ── event_registrations ───────────────────────────────────────────────────────
CREATE POLICY "evtreg_select" ON public.event_registrations FOR SELECT
  USING (
    student_id IN (SELECT s.id FROM public.students s WHERE s.user_id = (select auth.uid()))
    OR EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role IN ('admin','faculty'))
  );
CREATE POLICY "evtreg_insert" ON public.event_registrations FOR INSERT
  WITH CHECK (
    student_id IN (SELECT s.id FROM public.students s WHERE s.user_id = (select auth.uid()))
    OR EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role IN ('admin','faculty'))
  );
CREATE POLICY "evtreg_delete" ON public.event_registrations FOR DELETE
  USING (
    student_id IN (SELECT s.id FROM public.students s WHERE s.user_id = (select auth.uid()))
    OR EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin')
  );

-- ── announcements ─────────────────────────────────────────────────────────────
CREATE POLICY "ann_select" ON public.announcements FOR SELECT USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "ann_insert" ON public.announcements FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role IN ('admin','faculty')));
CREATE POLICY "ann_update" ON public.announcements FOR UPDATE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role IN ('admin','faculty')));
CREATE POLICY "ann_delete" ON public.announcements FOR DELETE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));


-- ════════════════════════════════════════════════════════════
-- COMPLAINT SUPPORT TABLES
-- ════════════════════════════════════════════════════════════

-- ── complaint_assignments ─────────────────────────────────────────────────────
CREATE POLICY "ca_select" ON public.complaint_assignments FOR SELECT
  USING (assigned_to = (select auth.uid()) OR EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "ca_insert" ON public.complaint_assignments FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "ca_update" ON public.complaint_assignments FOR UPDATE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "ca_delete" ON public.complaint_assignments FOR DELETE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));

-- ── complaint_updates ─────────────────────────────────────────────────────────
CREATE POLICY "cu_select" ON public.complaint_updates FOR SELECT
  USING (updated_by = (select auth.uid()) OR EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "cu_insert" ON public.complaint_updates FOR INSERT
  WITH CHECK ((select auth.uid()) IS NOT NULL);
CREATE POLICY "cu_update" ON public.complaint_updates FOR UPDATE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));
CREATE POLICY "cu_delete" ON public.complaint_updates FOR DELETE USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (select auth.uid()) AND up.role = 'admin'));


-- ── Verify: policy counts (no table should have overlapping SELECT policies) ──
SELECT tablename, COUNT(*) AS policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
