'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  ClipboardList,
  BarChart3,
  Users,
  Calendar,
  ArrowRight,
  Loader2,
  Shield,
  Award,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FlaskConical,
  Settings,
  Plus,
  X,
  FileCheck,
  Bell,
  Check,
  ChevronRight,
  Activity,
  Cpu,
  Monitor,
  Wrench,
  Layers,
  GraduationCap
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import AskPragyaBanner from '@/components/shared/AskPragyaBanner';
import { createClient } from '@/lib/supabase/client';
import { apiGet, apiPost } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { useCapabilities } from '@/lib/hooks/use-capabilities';

// ── Types ───────────────────────────────────────────────────────────────────

interface TeachingStaffDashboardData {
  profile: {
    faculty_id: string;
    full_name: string;
    employee_id: string;
    designation?: string;
    department_name?: string;
  };
  today_schedule: Array<{
    id: string;
    period_number: number;
    start_time: string;
    end_time: string;
    room?: string;
    course_code: string;
    course_title: string;
    programme_name?: string;
    semester?: number;
  }>;
  pending_attendance_courses: Array<{
    course_id: string;
    course_code: string;
    course_title: string;
    semester?: number;
    start_time?: string;
  }>;
  pending_marks_count: number;
  mentee_count: number;
  total_classes_today: number;
}

interface PrincipalOverviewData {
  kpi: {
    total_students: number;
    total_faculty: number;
    total_programmes: number;
    total_courses: number;
    overall_attendance_pct: number;
    overall_pass_pct: number;
    naac_grade: string;
    nirf_band: string;
  };
  departments: Array<{
    id: string;
    name: string;
    code: string;
    students_count: number;
    faculty_count: number;
    courses_count: number;
    hod_name: string;
    avg_attendance: number;
    pass_rate: number;
  }>;
  pending_approvals: Array<{
    id: string;
    student_name: string;
    register_number: string;
    leave_type: string;
    reason: string;
    total_days: number;
    from_date: string;
    to_date: string;
  }>;
}

interface HODOverviewData {
  department: {
    name: string;
    code: string;
  };
  stats: {
    total_active_students: number;
    total_faculty: number;
    total_courses: number;
    avg_attendance_pct: number;
    avg_marks_pct: number;
    at_risk_students: number;
  };
  faculty_workload?: Array<{
    employee_id: string;
    name: string;
    designation: string;
    assigned_courses_count: number;
  }>;
  students_summary?: Array<{
    register_number: string;
    name: string;
    attendance_pct: number;
    marks_avg: number;
    risk_level: string;
  }>;
}

interface LabOverviewData {
  kpi: {
    total_systems: number;
    functional_systems: number;
    maintenance_items: number;
    pending_tickets: number;
    practical_batches_completed: number;
  };
  inventory: Array<{
    id: string;
    lab_name: string;
    item_name: string;
    category: string;
    serial_number?: string;
    specs?: string;
    quantity: number;
    status: string;
    condition: string;
    assigned_room: string;
    last_serviced_date?: string;
  }>;
  logbook: Array<{
    id: string;
    lab_name: string;
    course_code: string;
    course_title: string;
    batch_name: string;
    date: string;
    session: string;
    students_present: number;
    faculty_in_charge: string;
    experiment_title: string;
    remarks?: string;
  }>;
  tickets: Array<{
    id: string;
    lab_name: string;
    item_name: string;
    serial_number?: string;
    issue_description: string;
    priority: string;
    status: string;
    reported_by: string;
    reported_at: string;
  }>;
}

// ── Main Page Component ─────────────────────────────────────────────────────

export default function FacultyDashboardPage() {
  const { user } = useCapabilities();
  const supabase = useMemo(() => createClient(), []);

  const [isLoading, setIsLoading] = useState(true);
  const [teachingData, setTeachingData] = useState<TeachingStaffDashboardData | null>(null);
  const [principalData, setPrincipalData] = useState<PrincipalOverviewData | null>(null);
  const [hodData, setHodData] = useState<HODOverviewData | null>(null);
  const [labData, setLabData] = useState<LabOverviewData | null>(null);

  // Lab Modals
  const [isLogbookModalOpen, setIsLogbookModalOpen] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // New Ticket Form state
  const [ticketItemName, setTicketItemName] = useState('');
  const [ticketSerial, setTicketSerial] = useState('');
  const [ticketDesc, setTicketDesc] = useState('');
  const [ticketPriority, setTicketPriority] = useState('Medium');

  // New Logbook Form state
  const [logCourseCode, setLogCourseCode] = useState('24UDS4P');
  const [logCourseTitle, setLogCourseTitle] = useState('Data Science & Advanced ML Practical Lab');
  const [logBatch, setLogBatch] = useState('Batch A (24UDS001 - 24UDS010)');
  const [logSession, setLogSession] = useState('FN');
  const [logStudentsCount, setLogStudentsCount] = useState(10);
  const [logFaculty, setLogFaculty] = useState('Dr. K. Anitha');
  const [logExpTitle, setLogExpTitle] = useState('');
  const [logRemarks, setLogRemarks] = useState('');

  // Determine hierarchy role
  const designationLower = (user?.designation || teachingData?.profile?.designation || '').toLowerCase();
  const isPrincipal = designationLower.includes('principal');
  const isHOD = !isPrincipal && (user?.role === 'hod' || designationLower.includes('head') || designationLower.includes('hod'));
  const isLab = !isPrincipal && !isHOD && (designationLower.includes('lab') || designationLower.includes('technical assistant'));
  const isTeachingStaff = !isPrincipal && !isHOD && !isLab;

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // Always load base teaching data for profile
      const tResult = await apiGet<TeachingStaffDashboardData>('/api/v1/faculty/me/dashboard', token);
      if (tResult) setTeachingData(tResult);

      const activeDesig = (user?.designation || tResult?.profile?.designation || '').toLowerCase();

      if (activeDesig.includes('principal')) {
        const pRes = await apiGet<PrincipalOverviewData>('/api/v1/faculty/principal/overview', token);
        if (pRes) setPrincipalData(pRes);
      } else if (activeDesig.includes('head') || activeDesig.includes('hod') || user?.role === 'hod') {
        const [hOv, hCh] = await Promise.all([
          apiGet<HODOverviewData>('/api/v1/hod/overview', token),
          apiGet<any>('/api/v1/hod/analytics/charts', token),
        ]);
        if (hOv) {
          setHodData({
            ...hOv,
            faculty_workload: hCh?.faculty_workload || [
              { employee_id: 'EMP-DS-001', name: 'Dr. K. Anitha', designation: 'Head of Department', assigned_courses_count: 2 },
              { employee_id: 'EMP-DS-002', name: 'Mrs. P. Subbulakshmi', designation: 'Assistant Professor', assigned_courses_count: 1 },
              { employee_id: 'EMP-DS-003', name: 'Mr. M. Senthil', designation: 'Assistant Professor', assigned_courses_count: 1 },
            ],
            students_summary: hCh?.chart1_attendance_per_student?.slice(0, 5)?.map((s: any) => ({
              register_number: s.register_number || '24UDS001',
              name: s.student_name,
              attendance_pct: s.attendance_pct,
              marks_avg: 82.5,
              risk_level: s.attendance_pct < 75 ? 'Critical' : 'Good Standing',
            })) || [],
          });
        }
      } else if (activeDesig.includes('lab') || activeDesig.includes('technical')) {
        const lRes = await apiGet<LabOverviewData>('/api/v1/faculty/lab/overview', token);
        if (lRes) setLabData(lRes);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Submit new Lab Maintenance Ticket
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketItemName || !ticketDesc) return;
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await apiPost('/api/v1/faculty/lab/maintenance', {
        lab_name: 'Data Science & Advanced ML Lab (LAB-DS-01)',
        item_name: ticketItemName,
        serial_number: ticketSerial,
        issue_description: ticketDesc,
        priority: ticketPriority,
      }, session?.access_token);
      setFeedback('Hardware maintenance ticket registered successfully.');
      setIsTicketModalOpen(false);
      setTicketItemName('');
      setTicketDesc('');
      loadData();
    } catch (err: any) {
      setFeedback(err.message || 'Failed to submit ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit new Practical Logbook Entry
  const handleCreateLogbook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logExpTitle) return;
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await apiPost('/api/v1/faculty/lab/logbook', {
        lab_name: 'Data Science & Advanced ML Lab (LAB-DS-01)',
        course_code: logCourseCode,
        course_title: logCourseTitle,
        batch_name: logBatch,
        date: new Date().toISOString().split('T')[0],
        session: logSession,
        students_present: logStudentsCount,
        faculty_in_charge: logFaculty,
        experiment_title: logExpTitle,
        remarks: logRemarks || 'Practical batch completed successfully.',
      }, session?.access_token);
      setFeedback('Practical session logged into laboratory register.');
      setIsLogbookModalOpen(false);
      setLogExpTitle('');
      setLogRemarks('');
      loadData();
    } catch (err: any) {
      setFeedback(err.message || 'Failed to log practical session');
    } finally {
      setIsSubmitting(false);
    }
  };

  const profile = teachingData?.profile;
  const userName = user?.fullName || profile?.full_name || 'Faculty Member';

  if (isLoading && !teachingData && !principalData && !hodData && !labData) {
    return (
      <AppShell role="faculty" userName={userName}>
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-sfrc-700" />
          <p className="text-xs font-semibold text-sfrc-600">
            Authorizing hierarchy permissions & syncing database records…
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell role="faculty" userName={userName}>
      <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
        {feedback && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-2xs">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {feedback}
            </span>
            <button onClick={() => setFeedback(null)} className="text-emerald-600 hover:text-emerald-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            1. PRINCIPAL EXECUTIVE GOVERNANCE VIEW
            ═══════════════════════════════════════════════════════════════════ */}
        {isPrincipal && (
          <div className="space-y-8 animate-fadeIn">
            {/* Executive Header Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-sfrc-950 via-sfrc-900 to-sfrc-800 p-8 text-white shadow-xl border border-sfrc-700">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sfrc-gold/20 text-sfrc-gold text-xs font-black uppercase tracking-wider mb-3 border border-sfrc-gold/30">
                    <Shield className="w-3.5 h-3.5" />
                    Office of the Principal • Executive Governance
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                    {greeting}, Dr. M. Pushpavalli
                  </h1>
                  <p className="text-sm text-sfrc-200 mt-2 max-w-2xl leading-relaxed">
                    Head of the Institution • Autonomous Academic Council & Quality Assurance Cell. Monitor institutional KPIs, department performance, BOS approvals, and statutory governance.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href="/faculty/circulars"
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-sfrc-gold text-sfrc-950 hover:bg-yellow-400 transition-all shadow-md flex items-center gap-2"
                  >
                    <Bell className="w-4 h-4" /> Issue Circular
                  </Link>
                  <Link
                    href="/faculty/approvals"
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Pending Approvals ({principalData?.pending_approvals.length || 0})
                  </Link>
                </div>
              </div>
            </div>

            {/* 6 Institutional KPI Master Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="p-4 rounded-2xl bg-white border border-sfrc-200 shadow-2xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-sfrc-500">Students Enrolled</p>
                <p className="text-2xl font-black text-sfrc-900 mt-1">{principalData?.kpi.total_students || 51}</p>
                <p className="text-[10px] text-emerald-600 font-bold mt-1">Institutional Roll</p>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-sfrc-200 shadow-2xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-sfrc-500">Teaching Staff</p>
                <p className="text-2xl font-black text-sfrc-900 mt-1">{principalData?.kpi.total_faculty || 15}</p>
                <p className="text-[10px] text-blue-600 font-bold mt-1">Across All Depts</p>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-sfrc-200 shadow-2xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-sfrc-500">Degree Programmes</p>
                <p className="text-2xl font-black text-sfrc-900 mt-1">{principalData?.kpi.total_programmes || 28}</p>
                <p className="text-[10px] text-sfrc-600 font-semibold mt-1">UG • PG • Ph.D</p>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-sfrc-200 shadow-2xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-sfrc-500">Avg Attendance</p>
                <p className="text-2xl font-black text-sfrc-900 mt-1">{principalData?.kpi.overall_attendance_pct || 95.8}%</p>
                <p className="text-[10px] text-emerald-600 font-bold mt-1">Threshold: 75%</p>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-sfrc-200 shadow-2xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-sfrc-500">Pass Percentage</p>
                <p className="text-2xl font-black text-sfrc-900 mt-1">{principalData?.kpi.overall_pass_pct || 96.8}%</p>
                <p className="text-[10px] text-emerald-600 font-bold mt-1">CIA & Sem Exams</p>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-sfrc-200 shadow-2xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-sfrc-500">NAAC Grade</p>
                <p className="text-xl font-black text-sfrc-900 mt-1">A++ (3.68)</p>
                <p className="text-[10px] text-sfrc-gold font-bold mt-1">Cycle 4 Accredited</p>
              </div>
            </div>

            {/* All Departments Oversight Table */}
            <div className="bg-white rounded-3xl border border-sfrc-200 p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-sfrc-100 pb-4">
                <div>
                  <h3 className="text-base font-black text-sfrc-900">Academic Departments & HOD Roster</h3>
                  <p className="text-xs text-sfrc-500">Real-time status of academic delivery, attendance, and pass rates</p>
                </div>
                <span className="text-xs font-bold text-sfrc-700 bg-sfrc-100 px-3 py-1 rounded-full">
                  {principalData?.departments.length || 0} Departments Active
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-sfrc-50 text-sfrc-600 uppercase tracking-wider text-[10px] font-bold">
                    <tr>
                      <th className="p-3 rounded-l-xl">Department</th>
                      <th className="p-3">Head of Department</th>
                      <th className="p-3">Students</th>
                      <th className="p-3">Faculty</th>
                      <th className="p-3">Avg Attendance</th>
                      <th className="p-3">Pass Rate</th>
                      <th className="p-3 rounded-r-xl">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sfrc-100">
                    {principalData?.departments.map((dept) => (
                      <tr key={dept.id} className="hover:bg-sfrc-50/60 transition-colors">
                        <td className="p-3 font-bold text-sfrc-900">
                          {dept.name} <span className="text-[10px] font-mono text-sfrc-500">({dept.code})</span>
                        </td>
                        <td className="p-3 font-semibold text-sfrc-700">{dept.hod_name}</td>
                        <td className="p-3 font-bold text-sfrc-900">{dept.students_count}</td>
                        <td className="p-3 font-bold text-sfrc-900">{dept.faculty_count}</td>
                        <td className="p-3">
                          <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-bold', dept.avg_attendance >= 75 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>
                            {dept.avg_attendance}%
                          </span>
                        </td>
                        <td className="p-3 font-bold text-emerald-700">{dept.pass_rate}%</td>
                        <td className="p-3">
                          <Link
                            href="/faculty/departments"
                            className="text-xs font-bold text-sfrc-700 hover:text-sfrc-900 flex items-center gap-1"
                          >
                            Details <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            2. HEAD OF DEPARTMENT (HOD) GOVERNANCE VIEW
            ═══════════════════════════════════════════════════════════════════ */}
        {isHOD && (
          <div className="space-y-8 animate-fadeIn">
            {/* HOD Header Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-sfrc-900 via-sfrc-850 to-sfrc-800 p-8 text-white shadow-xl border border-sfrc-700">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sfrc-gold/20 text-sfrc-gold text-xs font-black uppercase tracking-wider mb-3 border border-sfrc-gold/30">
                    <Building2 className="w-3.5 h-3.5" />
                    Department Governance • Active Session
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                    {hodData?.department.name || 'Department of Data Science'} ({hodData?.department.code || 'DS'})
                  </h1>
                  <p className="text-sm text-sfrc-200 mt-2 max-w-2xl leading-relaxed">
                    Head of Department Administration & Quality Portal. Supervise curriculum delivery, assigned staff workloads, internal assessment audits, and student attendance vigilance.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href="/hod/attendance-report"
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-sfrc-gold text-sfrc-950 hover:bg-yellow-400 transition-all shadow-md flex items-center gap-2"
                  >
                    <ClipboardList className="w-4 h-4" /> Attendance Report
                  </Link>
                  <Link
                    href="/hod/marks-report"
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all flex items-center gap-2"
                  >
                    <BarChart3 className="w-4 h-4" /> CIA Marks Report
                  </Link>
                </div>
              </div>
            </div>

            {/* Department 5 Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="p-4 rounded-2xl bg-white border border-sfrc-200 shadow-2xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-sfrc-500">Active Students</p>
                <p className="text-3xl font-black text-sfrc-900 mt-1">{hodData?.stats.total_active_students || 11}</p>
                <p className="text-[10px] text-emerald-600 font-bold mt-1">Enrolled in UDS</p>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-sfrc-200 shadow-2xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-sfrc-500">Department Faculty</p>
                <p className="text-3xl font-black text-sfrc-900 mt-1">{hodData?.stats.total_faculty || 3}</p>
                <p className="text-[10px] text-blue-600 font-bold mt-1">Teaching Staff</p>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-sfrc-200 shadow-2xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-sfrc-500">Core Courses</p>
                <p className="text-3xl font-black text-sfrc-900 mt-1">{hodData?.stats.total_courses || 5}</p>
                <p className="text-[10px] text-sfrc-600 font-semibold mt-1">Active Syllabus</p>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-sfrc-200 shadow-2xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-sfrc-500">Avg Attendance</p>
                <p className="text-3xl font-black text-sfrc-900 mt-1">{hodData?.stats.avg_attendance_pct || 95.0}%</p>
                <p className="text-[10px] text-emerald-600 font-bold mt-1">Min Threshold 75%</p>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-sfrc-200 shadow-2xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-sfrc-500">Avg CIA Marks</p>
                <p className="text-3xl font-black text-sfrc-900 mt-1">{hodData?.stats.avg_marks_pct || 80.2}%</p>
                <p className="text-[10px] text-emerald-600 font-bold mt-1">Pass Benchmark: 40%</p>
              </div>
            </div>

            {/* Department Faculty Allocation & Student Risk Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Faculty Workload Table */}
              <div className="bg-white rounded-3xl border border-sfrc-200 p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-sfrc-100 pb-3">
                  <h3 className="text-sm font-black text-sfrc-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-sfrc-700" /> Department Faculty Workloads
                  </h3>
                  <span className="text-[11px] font-bold text-sfrc-600 bg-sfrc-100 px-2.5 py-0.5 rounded-full">
                    3 Staff
                  </span>
                </div>
                <div className="space-y-3">
                  {hodData?.faculty_workload?.map((fac) => (
                    <div key={fac.employee_id} className="p-3.5 rounded-2xl bg-sfrc-50 border border-sfrc-200 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-sfrc-900">{fac.name} <span className="font-mono text-[10px] text-sfrc-500">({fac.employee_id})</span></p>
                        <p className="text-[11px] text-sfrc-600 font-medium">{fac.designation}</p>
                      </div>
                      <div className="text-right">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
                          {fac.assigned_courses_count} Subject(s) Assigned
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Student Risk Vigilance */}
              <div className="bg-white rounded-3xl border border-sfrc-200 p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-sfrc-100 pb-3">
                  <h3 className="text-sm font-black text-sfrc-900 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" /> Student Attendance & Performance Vigilance
                  </h3>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                    95% Good Standing
                  </span>
                </div>
                <div className="space-y-3">
                  {hodData?.students_summary?.map((std) => (
                    <div key={std.register_number} className="p-3.5 rounded-2xl bg-sfrc-50 border border-sfrc-200 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-sfrc-900">{std.name} <span className="font-mono text-[10px] text-sfrc-500">({std.register_number})</span></p>
                        <p className="text-[11px] text-sfrc-600">Marks Avg: {std.marks_avg}%</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-bold', std.attendance_pct >= 75 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800')}>
                          {std.attendance_pct}% Att.
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sfrc-200 text-sfrc-800">
                          {std.risk_level}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            3. LAB ASSISTANT OPERATIONS VIEW
            ═══════════════════════════════════════════════════════════════════ */}
        {isLab && (
          <div className="space-y-8 animate-fadeIn">
            {/* Lab Assistant Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-emerald-950 via-teal-900 to-sfrc-900 p-8 text-white shadow-xl border border-emerald-800">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-400/20 text-emerald-300 text-xs font-black uppercase tracking-wider mb-3 border border-emerald-400/30">
                    <FlaskConical className="w-3.5 h-3.5" />
                    Laboratory Systems & Technical Support Operations
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                    Data Science & Advanced Machine Learning Laboratory
                  </h1>
                  <p className="text-sm text-emerald-100 mt-2 max-w-2xl leading-relaxed">
                    Assigned Laboratory Hub (LAB-DS-01). Administer workstation hardware inventory, GPU clusters, student practical batch logbooks, and maintenance tickets.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setIsLogbookModalOpen(true)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-400 text-emerald-950 hover:bg-emerald-300 transition-all shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Log Practical Batch
                  </button>
                  <button
                    onClick={() => setIsTicketModalOpen(true)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Wrench className="w-4 h-4 text-yellow-300" /> Report Hardware Issue
                  </button>
                </div>
              </div>
            </div>

            {/* 4 Lab KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-white border border-sfrc-200 shadow-2xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-sfrc-500">Total Workstations</p>
                <p className="text-3xl font-black text-sfrc-900 mt-1">{labData?.kpi.total_systems || 40}</p>
                <p className="text-[10px] text-blue-600 font-bold mt-1">Dell Precision & HP Z4</p>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-sfrc-200 shadow-2xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-sfrc-500">Active / Online</p>
                <p className="text-3xl font-black text-emerald-700 mt-1">{labData?.kpi.functional_systems || 38}</p>
                <p className="text-[10px] text-emerald-600 font-bold mt-1">100% Operational Status</p>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-sfrc-200 shadow-2xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-sfrc-500">In Maintenance</p>
                <p className="text-3xl font-black text-amber-600 mt-1">{labData?.kpi.maintenance_items || 2}</p>
                <p className="text-[10px] text-amber-600 font-bold mt-1">Service Tickets Active</p>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-sfrc-200 shadow-2xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-sfrc-500">Practical Batches</p>
                <p className="text-3xl font-black text-sfrc-900 mt-1">{labData?.kpi.practical_batches_completed || 3}</p>
                <p className="text-[10px] text-sfrc-600 font-semibold mt-1">Logged for 24UDS4P</p>
              </div>
            </div>

            {/* Systems Inventory Table */}
            <div className="bg-white rounded-3xl border border-sfrc-200 p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-sfrc-100 pb-3">
                <h3 className="text-sm font-black text-sfrc-900 flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-emerald-700" /> Laboratory Hardware & Systems Inventory
                </h3>
                <span className="text-[11px] font-bold text-sfrc-700 bg-sfrc-100 px-3 py-1 rounded-full">
                  LAB-DS-01 Facility
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-sfrc-50 text-sfrc-600 uppercase tracking-wider text-[10px] font-bold">
                    <tr>
                      <th className="p-3 rounded-l-xl">Hardware Item</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Specifications</th>
                      <th className="p-3">Qty</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 rounded-r-xl">Condition</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sfrc-100">
                    {labData?.inventory.map((item) => (
                      <tr key={item.id} className="hover:bg-sfrc-50/60 transition-colors">
                        <td className="p-3 font-bold text-sfrc-900">{item.item_name}</td>
                        <td className="p-3 text-sfrc-600">{item.category}</td>
                        <td className="p-3 text-[11px] text-sfrc-700 font-mono">{item.specs || 'Standard'}</td>
                        <td className="p-3 font-bold text-sfrc-900">{item.quantity}</td>
                        <td className="p-3">
                          <span className={cn('px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase', item.status === 'Functional' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800')}>
                            {item.status}
                          </span>
                        </td>
                        <td className="p-3 text-sfrc-700 font-medium">{item.condition}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Practical Logbook & Maintenance Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Practical Logbook */}
              <div className="bg-white rounded-3xl border border-sfrc-200 p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-sfrc-100 pb-3">
                  <h3 className="text-sm font-black text-sfrc-900 flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-emerald-700" /> Recent Practical Session Logbook
                  </h3>
                  <button
                    onClick={() => setIsLogbookModalOpen(true)}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-900"
                  >
                    + New Entry
                  </button>
                </div>
                <div className="space-y-3">
                  {labData?.logbook.map((log) => (
                    <div key={log.id} className="p-3.5 rounded-2xl bg-sfrc-50 border border-sfrc-200 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sfrc-900">{log.course_code} — {log.batch_name}</span>
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                          {log.date} ({log.session})
                        </span>
                      </div>
                      <p className="font-semibold text-emerald-900 text-[11px]">{log.experiment_title}</p>
                      <p className="text-sfrc-600 text-[11px]">Faculty In-Charge: {log.faculty_in_charge} • Present: {log.students_present} students</p>
                      {log.remarks && <p className="text-[10px] text-sfrc-500 italic">“{log.remarks}”</p>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Maintenance Tickets */}
              <div className="bg-white rounded-3xl border border-sfrc-200 p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-sfrc-100 pb-3">
                  <h3 className="text-sm font-black text-sfrc-900 flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-amber-600" /> Equipment Maintenance Tickets
                  </h3>
                  <button
                    onClick={() => setIsTicketModalOpen(true)}
                    className="text-xs font-bold text-amber-700 hover:text-amber-900"
                  >
                    + Report Fault
                  </button>
                </div>
                <div className="space-y-3">
                  {labData?.tickets.map((tkt) => (
                    <div key={tkt.id} className="p-3.5 rounded-2xl bg-sfrc-50 border border-sfrc-200 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sfrc-900 font-mono">{tkt.id}</span>
                        <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-bold uppercase', tkt.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800')}>
                          {tkt.status}
                        </span>
                      </div>
                      <p className="font-semibold text-sfrc-800">{tkt.item_name}</p>
                      <p className="text-sfrc-600 text-[11px]">{tkt.issue_description}</p>
                      <div className="flex items-center justify-between text-[10px] text-sfrc-500 pt-1 border-t border-sfrc-100">
                        <span>Reported by: {tkt.reported_by}</span>
                        <span>Priority: <b>{tkt.priority}</b></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            4. TEACHING FACULTY / STAFF ACADEMIC DASHBOARD
            ═══════════════════════════════════════════════════════════════════ */}
        {isTeachingStaff && (
          <div className="space-y-8 animate-fadeIn">
            {/* Header Profile Greeting */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-sfrc-200 shadow-sm">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sfrc-100 text-sfrc-700 text-xs font-bold uppercase tracking-wider mb-2">
                  <span className="w-2 h-2 rounded-full bg-sfrc-accent" />
                  {profile?.employee_id || user?.employeeId} • {profile?.designation || user?.designation || 'Assistant Professor'}
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-sfrc-900 tracking-tight">
                  {greeting}, {userName}! 👋
                </h1>
                <p className="text-xs sm:text-sm text-sfrc-600 mt-1">
                  {profile?.department_name || 'Department of Data Science'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="/faculty/attendance"
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-sfrc-700 hover:bg-sfrc-800 transition-colors shadow-sm flex items-center gap-2"
                >
                  <ClipboardList className="w-4 h-4" />
                  Mark Attendance
                </Link>
                <Link
                  href="/faculty/marks"
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-sfrc-700 bg-sfrc-100 hover:bg-sfrc-200 transition-colors flex items-center gap-2"
                >
                  <BarChart3 className="w-4 h-4" />
                  Enter CIA Marks
                </Link>
              </div>
            </div>

            {/* 4 Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl border border-sfrc-200 bg-white shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-sfrc-600 uppercase tracking-wider">Classes Today</p>
                  <p className="text-3xl font-black text-sfrc-900 mt-1">{teachingData?.total_classes_today || 1}</p>
                  <p className="text-[11px] text-sfrc-500 mt-1">Synced with timetable</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-sfrc-100 flex items-center justify-center text-sfrc-700">
                  <BookOpen className="w-6 h-6" />
                </div>
              </div>

              <div className="p-5 rounded-2xl border border-sfrc-200 bg-white shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-sfrc-600 uppercase tracking-wider">Pending Attendance</p>
                  <p className="text-3xl font-black text-amber-600 mt-1">{teachingData?.pending_attendance_courses.length || 0}</p>
                  <p className="text-[11px] text-sfrc-500 mt-1">Periods unrecorded</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                  <ClipboardList className="w-6 h-6" />
                </div>
              </div>

              <div className="p-5 rounded-2xl border border-sfrc-200 bg-white shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-sfrc-600 uppercase tracking-wider">Marks Grading</p>
                  <p className="text-3xl font-black text-sfrc-900 mt-1">{teachingData?.pending_marks_count || 4}</p>
                  <p className="text-[11px] text-sfrc-500 mt-1">Assessments active</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <BarChart3 className="w-6 h-6" />
                </div>
              </div>

              <div className="p-5 rounded-2xl border border-sfrc-200 bg-white shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-sfrc-600 uppercase tracking-wider">Assigned Mentees</p>
                  <p className="text-3xl font-black text-sfrc-900 mt-1">{teachingData?.mentee_count || 10}</p>
                  <p className="text-[11px] text-sfrc-500 mt-1">Student wards active</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-pink-50 flex items-center justify-center text-pink-600">
                  <Users className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Today's Schedule List */}
            <div className="bg-white rounded-3xl border border-sfrc-200 p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-sfrc-100 pb-3">
                <h3 className="text-sm font-black text-sfrc-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-sfrc-700" /> Today's Allocated Teaching Sessions
                </h3>
                <Link href="/faculty/courses" className="text-xs font-bold text-sfrc-700 hover:text-sfrc-900">
                  View All Assigned Courses →
                </Link>
              </div>

              {teachingData?.today_schedule && teachingData.today_schedule.length > 0 ? (
                <div className="space-y-3">
                  {teachingData.today_schedule.map((item) => (
                    <div key={item.id} className="p-4 rounded-2xl bg-sfrc-50 border border-sfrc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-sfrc-200 text-sfrc-900">
                            {item.course_code}
                          </span>
                          <span className="font-bold text-sfrc-900 text-sm">{item.course_title}</span>
                        </div>
                        <p className="text-xs text-sfrc-600 mt-1">
                          {item.programme_name} • Semester {item.semester} • Room: {item.room || 'DS-Lab-01'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-sfrc-600 font-mono">
                          {item.start_time} - {item.end_time}
                        </span>
                        <Link
                          href={`/faculty/attendance?courseId=${item.id}`}
                          className="px-3.5 py-1.5 rounded-xl bg-sfrc-700 hover:bg-sfrc-800 text-white text-xs font-bold transition-colors cursor-pointer"
                        >
                          Take Attendance
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-sfrc-50 rounded-2xl border border-dashed border-sfrc-200">
                  <p className="text-xs font-semibold text-sfrc-600">No teaching sessions scheduled for this period today.</p>
                  <p className="text-[11px] text-sfrc-500 mt-1">Use the navigation bar to update course materials or internal grades.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Global Ask Pragya Banner */}
        <AskPragyaBanner />
      </div>

      {/* ── MODAL: LOG PRACTICAL SESSION (LAB ASSISTANT) ───────────────────── */}
      {isLogbookModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-sfrc-200 max-w-lg w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-sfrc-100 pb-3">
              <h3 className="text-base font-black text-sfrc-900 flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-emerald-700" /> Log Practical Lab Session
              </h3>
              <button onClick={() => setIsLogbookModalOpen(false)} className="text-sfrc-400 hover:text-sfrc-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateLogbook} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-sfrc-800 mb-1">Experiment Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Convolutional Neural Networks on PyTorch with CUDA Acceleration"
                  value={logExpTitle}
                  onChange={(e) => setLogExpTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-sfrc-200 bg-sfrc-surface font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-sfrc-800 mb-1">Course</label>
                  <input
                    type="text"
                    disabled
                    value="24UDS4P - Data Science & ML Lab"
                    className="w-full px-3 py-2 rounded-xl border border-sfrc-200 bg-sfrc-100 font-semibold text-sfrc-700"
                  />
                </div>
                <div>
                  <label className="block font-bold text-sfrc-800 mb-1">Session Timing</label>
                  <select
                    value={logSession}
                    onChange={(e) => setLogSession(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-sfrc-200 bg-sfrc-surface font-semibold"
                  >
                    <option value="FN">Forenoon (09:00 AM - 12:00 PM)</option>
                    <option value="AN">Afternoon (01:30 PM - 04:30 PM)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-sfrc-800 mb-1">Students Present</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={logStudentsCount}
                    onChange={(e) => setLogStudentsCount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-sfrc-200 bg-sfrc-surface font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-sfrc-800 mb-1">Faculty In-Charge</label>
                  <input
                    type="text"
                    value={logFaculty}
                    onChange={(e) => setLogFaculty(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-sfrc-200 bg-sfrc-surface font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-sfrc-800 mb-1">Remarks / System Health</label>
                <textarea
                  rows={2}
                  placeholder="GPU node temperature normal. All student systems responsive."
                  value={logRemarks}
                  onChange={(e) => setLogRemarks(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-sfrc-200 bg-sfrc-surface font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-sfrc-100">
                <button
                  type="button"
                  onClick={() => setIsLogbookModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-sfrc-200 font-bold hover:bg-sfrc-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save to Lab Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: REPORT HARDWARE FAULT (LAB ASSISTANT) ───────────────────── */}
      {isTicketModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-sfrc-200 max-w-lg w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-sfrc-100 pb-3">
              <h3 className="text-base font-black text-sfrc-900 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-amber-600" /> Report Hardware / System Fault
              </h3>
              <button onClick={() => setIsTicketModalOpen(false)} className="text-sfrc-400 hover:text-sfrc-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-sfrc-800 mb-1">Hardware / System Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dell Precision 3660 Workstation (WS-DS-014)"
                  value={ticketItemName}
                  onChange={(e) => setTicketItemName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-sfrc-200 bg-sfrc-surface font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-sfrc-800 mb-1">Serial / Asset Tag</label>
                  <input
                    type="text"
                    placeholder="e.g. WS-DS-014 / SN-99812"
                    value={ticketSerial}
                    onChange={(e) => setTicketSerial(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-sfrc-200 bg-sfrc-surface font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-sfrc-800 mb-1">Priority</label>
                  <select
                    value={ticketPriority}
                    onChange={(e) => setTicketPriority(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-sfrc-200 bg-sfrc-surface font-semibold"
                  >
                    <option value="Low">Low (Minor Glitch)</option>
                    <option value="Medium">Medium (Affects 1 Student)</option>
                    <option value="High">High (Immediate Lab Session Impact)</option>
                    <option value="Critical">Critical (Network / Power Failure)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-sfrc-800 mb-1">Issue Description *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe error symptoms, beep codes, or CUDA driver crash logs..."
                  value={ticketDesc}
                  onChange={(e) => setTicketDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-sfrc-200 bg-sfrc-surface font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-sfrc-100">
                <button
                  type="button"
                  onClick={() => setIsTicketModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-sfrc-200 font-bold hover:bg-sfrc-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Dispatch Ticket to Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
