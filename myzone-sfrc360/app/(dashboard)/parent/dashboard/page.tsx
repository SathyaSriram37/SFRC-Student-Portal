'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Heart,
  Clock,
  TrendingUp,
  Users,
  Loader2,
  FileText,
  Building2,
  Phone,
  Mail,
  Home,
  UserCheck,
  BellRing,
  ChevronRight,
  GraduationCap,
  AlertCircle,
  BookOpen,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import AppShell from '@/components/layout/AppShell';
import AskPragyaBanner from '@/components/shared/AskPragyaBanner';
import { createClient } from '@/lib/supabase/client';
import { apiGet } from '@/lib/api-client';
import { cn } from '@/lib/utils';

export interface WardItem {
  student_id: string;
  full_name: string;
  register_number: string;
  current_semester: number;
  programme_name?: string;
  department_name?: string;
  section?: string;
  batch?: string;
  avatar_url?: string;
  relation: string;
}

export interface CourseAttendance {
  course_id?: string;
  course_code: string;
  course_title: string;
  total_classes: number;
  attended_classes: number;
  absent_classes?: number;
  percentage: number;
  status?: string;
}

export interface RecentUpdate {
  category: string;
  title: string;
  description: string;
  timestamp?: string;
}

export interface MentorContact {
  mentor_name: string;
  designation?: string;
  department_name?: string;
  email?: string;
  phone?: string;
  office_room?: string;
}

export interface HostelAllocation {
  is_hosteller: boolean;
  hostel_name?: string;
  room_number?: string;
  warden_name?: string;
  warden_contact?: string;
  pending_leaves_count?: number;
}

export interface SemesterGpa {
  semester: number;
  gpa: number;
}

export interface CourseMarkDetail {
  course_id: string;
  course_code: string;
  course_title: string;
  assessment_type: string;
  marks_obtained: number;
  max_marks: number;
  percentage?: number;
  semester: number;
  academic_year?: string;
  created_at?: string;
}

export interface WardPerformance {
  cgpa: number;
  semester_gpas: SemesterGpa[];
  course_marks: CourseMarkDetail[];
}

export interface WardSummaryData {
  ward: WardItem;
  attendance_pct: number;
  attendance_status: string;
  total_classes?: number;
  attended_classes?: number;
  absent_classes?: number;
  cgpa: number;
  course_attendance: CourseAttendance[];
  recent_updates: RecentUpdate[];
  mentor?: MentorContact;
  hostel?: HostelAllocation;
}

export interface ParentNotice {
  id: string;
  title: string;
  content: string;
  priority: string;
  publish_from?: string;
}

export default function ParentDashboardPage() {
  const [wards, setWards] = useState<WardItem[]>([]);
  const [selectedWardId, setSelectedWardId] = useState<string | null>(null);
  const [summary, setSummary] = useState<WardSummaryData | null>(null);
  const [performance, setPerformance] = useState<WardPerformance | null>(null);
  const [notices, setNotices] = useState<ParentNotice[]>([]);
  const [isLoadingWards, setIsLoadingWards] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  // Fetch full details for a verified ward
  const fetchWardDetails = useCallback(async (wardId: string, token?: string) => {
    setIsLoadingDetails(true);
    setErrorMessage(null);
    try {
      const [wardSummary, wardPerf] = await Promise.all([
        apiGet<WardSummaryData>(`/api/v1/parents/me/wards/${encodeURIComponent(wardId)}/summary`, token),
        apiGet<WardPerformance>(`/api/v1/parents/me/wards/${encodeURIComponent(wardId)}/performance`, token).catch(() => null),
      ]);
      setSummary(wardSummary);
      setPerformance(wardPerf);
    } catch (err: unknown) {
      console.error('Failed to load ward details:', err);
      const msg = err instanceof Error ? err.message : 'Failed to retrieve academic records for this ward.';
      setErrorMessage(msg);
      setSummary(null);
      setPerformance(null);
    } finally {
      setIsLoadingDetails(false);
    }
  }, []);

  // Initial load of parent wards & announcements
  useEffect(() => {
    let ignore = false;

    async function initializeDashboard() {
      setIsLoadingWards(true);
      setErrorMessage(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const [wardList, noticesList] = await Promise.all([
          apiGet<WardItem[]>('/api/v1/parents/me/wards', token).catch(() => []),
          apiGet<ParentNotice[]>('/api/v1/parents/me/notices', token).catch(() => []),
        ]);

        if (ignore) return;

        setWards(wardList || []);
        setNotices(noticesList || []);

        if (wardList && wardList.length > 0) {
          const firstWard = wardList[0];
          setSelectedWardId(firstWard.student_id);
          await fetchWardDetails(firstWard.student_id, token);
        } else {
          // Explicit empty state - NO mock/demo fallbacks
          setSelectedWardId(null);
          setSummary(null);
          setPerformance(null);
        }
      } catch (err: unknown) {
        if (!ignore) {
          console.error('Failed to initialize parent dashboard:', err);
          const msg = err instanceof Error ? err.message : 'Unable to load parent dashboard.';
          setErrorMessage(msg);
        }
      } finally {
        if (!ignore) {
          setIsLoadingWards(false);
        }
      }
    }

    initializeDashboard();

    return () => {
      ignore = true;
    };
  }, [supabase, fetchWardDetails]);

  // Handle switching between multiple wards
  const handleWardChange = async (wardId: string) => {
    if (wardId === selectedWardId) return;
    setSelectedWardId(wardId);
    // Clear previous student's data immediately to avoid stale data display
    setSummary(null);
    setPerformance(null);

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    await fetchWardDetails(wardId, token);
  };

  // Helper for attendance badge styling based on real percentage
  const getAttendanceBadge = (pct: number) => {
    if (pct >= 75) {
      return {
        label: `${pct.toFixed(1)}% • Regular`,
        bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        badgeColor: 'bg-emerald-600',
        textColor: 'text-emerald-700',
        statusText: 'Eligible for Examinations',
      };
    } else if (pct >= 65) {
      return {
        label: `${pct.toFixed(1)}% • Attention Required`,
        bg: 'bg-amber-50 text-amber-800 border-amber-200',
        badgeColor: 'bg-amber-500',
        textColor: 'text-amber-700',
        statusText: 'Condonation Zone (65-74%)',
      };
    } else {
      return {
        label: `${pct.toFixed(1)}% • Critical Shortage`,
        bg: 'bg-red-50 text-red-800 border-red-200',
        badgeColor: 'bg-red-600',
        textColor: 'text-red-700',
        statusText: 'Disqualified (<65% Attendance)',
      };
    }
  };

  // Loading state when initial wards are loading
  if (isLoadingWards) {
    return (
      <AppShell role="parent" userName="Parent">
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-sfrc-700" />
          <p className="text-xs font-semibold text-sfrc-600">
            Verifying parent credentials & syncing linked student records…
          </p>
        </div>
      </AppShell>
    );
  }

  // Clear Empty State when authenticated parent has NO linked students
  if (!isLoadingWards && wards.length === 0) {
    return (
      <AppShell role="parent" userName="Parent">
        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
          <div className="bg-white rounded-3xl border border-sfrc-200 p-8 sm:p-12 text-center shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-800 mb-4">
              <Users className="w-8 h-8" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-sfrc-900 tracking-tight">
              No Linked Students
            </h1>
            <p className="text-sm text-sfrc-600 mt-2 max-w-lg mx-auto">
              No students are linked to your parent account yet. Please contact the college administrator or the Controller of Examinations office to register your relationship.
            </p>

            <div className="mt-6 p-4 rounded-2xl bg-sfrc-surface border border-sfrc-200/80 inline-block text-left text-xs text-sfrc-700 space-y-1.5">
              <p className="font-bold text-sfrc-900">Administrative Helpdesk:</p>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-sfrc-500" />
                <span>support@sfrc.ac.in / admin@sfrc.ac.in</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-sfrc-500" />
                <span>04562-220389 (Administrative Office)</span>
              </div>
            </div>
          </div>

          {/* Notices filtered for Parents (if any) */}
          {notices.length > 0 && (
            <div className="bg-white rounded-3xl border border-sfrc-200 p-6 shadow-xs">
              <h2 className="text-base font-black text-sfrc-900 tracking-tight mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-sfrc-700" />
                Institutional Circulars for Parents
              </h2>
              <div className="space-y-3">
                {notices.map((n) => (
                  <div key={n.id} className="p-3.5 rounded-xl border border-sfrc-200 bg-sfrc-surface">
                    <p className="text-xs font-bold text-sfrc-900">{n.title}</p>
                    <p className="text-xs text-sfrc-600 mt-1 line-clamp-2">{n.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <AskPragyaBanner />
        </div>
      </AppShell>
    );
  }

  const currentWard = summary?.ward || wards.find((w) => w.student_id === selectedWardId) || wards[0];
  const attendancePct = summary?.attendance_pct ?? 0;
  const attBadge = getAttendanceBadge(attendancePct);

  // Real chart data from database semester GPAs only (NO fallback fake bars)
  const semesterGpas = performance?.semester_gpas || [];
  const hasMarksData = semesterGpas.length > 0;
  const chartData = semesterGpas.map((s) => ({
    name: `Sem ${s.semester}`,
    gpa: Number(s.gpa.toFixed(2)),
  }));

  const totalConducted = summary?.total_classes ?? (
    summary?.course_attendance?.reduce((acc, c) => acc + (c.total_classes || 0), 0) ?? 0
  );
  const totalAttended = summary?.attended_classes ?? (
    summary?.course_attendance?.reduce((acc, c) => acc + (c.attended_classes || 0), 0) ?? 0
  );
  const totalAbsent = summary?.absent_classes ?? Math.max(0, totalConducted - totalAttended);

  return (
    <AppShell role="parent" userName="Parent">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Error Notification if any */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-3">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <p className="font-medium">{errorMessage}</p>
          </div>
        )}

        {/* Multi-Ward Selector Tabs (Rendered ONLY when 2 or more wards exist) */}
        {wards.length > 1 && (
          <div className="bg-white p-3 rounded-2xl border border-sfrc-200 flex items-center gap-3 overflow-x-auto shadow-xs">
            <span className="text-xs font-bold text-sfrc-800 px-2 uppercase tracking-wider shrink-0 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-sfrc-700" />
              Select Ward:
            </span>
            <div className="flex items-center gap-2">
              {wards.map((w) => {
                const isActive = selectedWardId === w.student_id;
                return (
                  <button
                    key={w.student_id}
                    type="button"
                    onClick={() => handleWardChange(w.student_id)}
                    className={cn(
                      'px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer',
                      isActive
                        ? 'bg-sfrc-700 text-white shadow-sm ring-2 ring-sfrc-700/20'
                        : 'bg-sfrc-50 text-sfrc-700 hover:bg-sfrc-100 border border-sfrc-200/60'
                    )}
                  >
                    <div
                      className={cn(
                        'w-2 h-2 rounded-full',
                        isActive ? 'bg-sfrc-gold' : 'bg-sfrc-300'
                      )}
                    />
                    <span>{w.full_name}</span>
                    <span
                      className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded font-mono font-bold',
                        isActive ? 'bg-white/20 text-white' : 'bg-sfrc-200/60 text-sfrc-700'
                      )}
                    >
                      {w.register_number}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* TOP: Ward Profile Card */}
        <div className="bg-white rounded-3xl border border-sfrc-200 p-6 sm:p-7 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-sfrc-100/40 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

          {isLoadingDetails ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-sfrc-700" />
              <p className="text-xs text-sfrc-500 font-medium">Loading ward records…</p>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              {/* Left: Avatar + Identity */}
              <div className="flex items-start sm:items-center gap-4 sm:gap-5">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-linear-to-br from-sfrc-700 to-sfrc-900 flex items-center justify-center text-white text-xl sm:text-2xl font-black shadow-md shrink-0 ring-4 ring-sfrc-100">
                  {currentWard?.avatar_url ? (
                    <img
                      src={currentWard.avatar_url}
                      alt={currentWard.full_name}
                      className="w-full h-full object-cover rounded-2xl"
                    />
                  ) : (
                    currentWard?.full_name?.slice(0, 2).toUpperCase() || 'WD'
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-sfrc-100 text-sfrc-800 text-[11px] font-bold uppercase tracking-wider">
                      <Heart className="w-3 h-3 text-sfrc-accent fill-sfrc-accent" />
                      {currentWard?.relation || 'Ward'}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md bg-sfrc-surface border border-sfrc-200 text-sfrc-700 font-mono text-xs font-bold">
                      {currentWard?.register_number}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md bg-sfrc-gold/20 text-sfrc-900 text-xs font-bold">
                      Semester {currentWard?.current_semester || 1}
                    </span>
                    {currentWard?.section && (
                      <span className="px-2 py-0.5 rounded-md bg-sfrc-100 text-sfrc-700 text-xs font-bold">
                        Section {currentWard.section}
                      </span>
                    )}
                    {currentWard?.batch && (
                      <span className="text-[11px] text-sfrc-500 font-medium">
                        ({currentWard.batch})
                      </span>
                    )}
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-black text-sfrc-900 tracking-tight">
                    {currentWard?.full_name}
                  </h1>
                  <p className="text-xs sm:text-sm text-sfrc-600 font-medium">
                    {currentWard?.programme_name || 'Academic Programme'}
                    {currentWard?.department_name ? ` • ${currentWard.department_name}` : ''}
                  </p>
                </div>
              </div>

              {/* Right: Key Badges (Attendance + CGPA) */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
                {/* Attendance Metric Card */}
                <div
                  className={cn(
                    'px-4 py-3 rounded-2xl border flex flex-col justify-center min-w-[150px]',
                    attBadge.bg
                  )}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                    Overall Attendance
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={cn('w-2.5 h-2.5 rounded-full animate-pulse', attBadge.badgeColor)} />
                    <span className="text-xl font-black">
                      {totalConducted > 0 ? `${attendancePct.toFixed(1)}%` : 'N/A'}
                    </span>
                  </div>
                  <span className="text-[10px] font-medium mt-0.5">
                    {totalConducted > 0 ? attBadge.statusText : 'No attendance recorded'}
                  </span>
                </div>

                {/* CGPA Display */}
                <div className="px-4 py-3 rounded-2xl border border-sfrc-200 bg-sfrc-surface flex flex-col justify-center min-w-[130px]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sfrc-600">
                    Cumulative CGPA
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-xl font-black text-sfrc-900">
                      {summary?.cgpa && summary.cgpa > 0 ? summary.cgpa.toFixed(2) : 'N/A'}
                    </span>
                    {summary?.cgpa && summary.cgpa > 0 ? (
                      <span className="text-xs font-bold text-sfrc-500">/ 10</span>
                    ) : null}
                  </div>
                  <span className="text-[10px] font-semibold text-sfrc-700">
                    {summary?.cgpa && summary.cgpa >= 8.0
                      ? 'Distinction Grade'
                      : summary?.cgpa && summary.cgpa >= 6.0
                      ? 'First Class'
                      : summary?.cgpa && summary.cgpa > 0
                      ? 'Satisfactory'
                      : 'No marks published'}
                  </span>
                </div>

                {/* Navigation to Attendance / Progress */}
                <Link
                  href="/parent/attendance"
                  className="px-4 py-3 rounded-2xl bg-sfrc-700 hover:bg-sfrc-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 self-stretch justify-center"
                >
                  <span>Attendance Log</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* MIDDLE SECTION: Academic Performance & Subject Attendance */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Academic Performance & CGPA Progression */}
          <div className="lg:col-span-6 bg-white rounded-3xl border border-sfrc-200 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-sfrc-700" />
                    <h2 className="text-lg font-black text-sfrc-900 tracking-tight">
                      Academic Performance & CGPA
                    </h2>
                  </div>
                  <p className="text-xs text-sfrc-600 mt-0.5">
                    Semester-by-semester Grade Point Average (GPA) progression
                  </p>
                </div>
                {summary?.cgpa && summary.cgpa > 0 ? (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Active Progress
                  </span>
                ) : null}
              </div>

              {/* Big CGPA Metric Card */}
              <div className="p-4 rounded-2xl bg-linear-to-r from-sfrc-800 to-sfrc-900 text-white flex items-center justify-between mb-6 shadow-sm">
                <div>
                  <p className="text-xs text-sfrc-200 font-semibold uppercase tracking-wider">
                    Cumulative Grade Point Average
                  </p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-4xl font-black text-white">
                      {summary?.cgpa && summary.cgpa > 0 ? summary.cgpa.toFixed(2) : 'N/A'}
                    </span>
                    {summary?.cgpa && summary.cgpa > 0 ? (
                      <span className="text-sm font-bold text-sfrc-300">/ 10.0 scale</span>
                    ) : null}
                  </div>
                  <p className="text-xs text-sfrc-gold mt-1 font-semibold flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5" />
                    {currentWard?.programme_name || 'Academic Record'}
                  </p>
                </div>

                <div className="text-right border-l border-white/20 pl-4">
                  <p className="text-[11px] text-sfrc-300 uppercase tracking-wider font-semibold">
                    Published Semesters
                  </p>
                  <p className="text-sm font-bold text-white mt-0.5">
                    {semesterGpas.length > 0 ? `${semesterGpas.length} Semesters` : 'Pending'}
                  </p>
                  <p className="text-[11px] text-sfrc-300 mt-0.5">Controller of Exams</p>
                </div>
              </div>

              {/* Recharts BarChart or Meaningful Empty State */}
              {hasMarksData ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }}
                        tickLine={false}
                        axisLine={{ stroke: '#CBD5E1' }}
                      />
                      <YAxis
                        domain={[0, 10]}
                        ticks={[0, 2, 4, 6, 8, 10]}
                        tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }}
                        tickLine={false}
                        axisLine={{ stroke: '#CBD5E1' }}
                      />
                      <Tooltip
                        cursor={{ fill: '#F1F5F9', radius: 8 }}
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-sfrc-900 text-white px-3 py-2 rounded-xl text-xs shadow-lg border border-sfrc-700">
                                <p className="font-bold">{label}</p>
                                <p className="text-sfrc-gold mt-0.5 font-mono">
                                  GPA: {Number(payload[0].value).toFixed(2)} / 10.0
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="gpa" radius={[8, 8, 0, 0]} maxBarSize={48}>
                        {chartData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={index === chartData.length - 1 ? '#0C4A60' : '#45B69C'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center p-6 text-center bg-sfrc-surface/50 rounded-2xl border border-dashed border-sfrc-200">
                  <BookOpen className="w-8 h-8 text-sfrc-400 mb-2" />
                  <p className="text-xs font-bold text-sfrc-800">
                    No Examination Marks Published
                  </p>
                  <p className="text-[11px] text-sfrc-500 mt-1 max-w-xs">
                    Semester-end or internal assessment marks have not yet been published by the academic department for this ward.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-sfrc-200 flex items-center justify-between text-xs text-sfrc-600">
              <span className="font-medium">Passing Threshold: 4.0 GPA</span>
              <span className="font-bold text-sfrc-800">Distinction Threshold: $\ge$ 8.0 GPA</span>
            </div>
          </div>

          {/* RIGHT: Course Attendance Breakdown */}
          <div className="lg:col-span-6 bg-white rounded-3xl border border-sfrc-200 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-sfrc-700" />
                    <h2 className="text-lg font-black text-sfrc-900 tracking-tight">
                      Subject-Wise Attendance Breakdown
                    </h2>
                  </div>
                  <p className="text-xs text-sfrc-600 mt-0.5">
                    Live class attendance across theory & practical courses
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-bold text-sfrc-700 bg-sfrc-100 px-2 py-0.5 rounded-lg">
                    {summary?.course_attendance?.length || 0} Courses
                  </span>
                </div>
              </div>

              {/* Attendance Counts Summary (Conducted, Attended, Absent) */}
              {totalConducted > 0 && (
                <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-sfrc-surface border border-sfrc-200/80 mb-4 text-center">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-sfrc-500">Conducted</p>
                    <p className="text-sm font-black text-sfrc-900 font-mono mt-0.5">{totalConducted} hrs</p>
                  </div>
                  <div className="border-x border-sfrc-200">
                    <p className="text-[10px] font-bold uppercase text-emerald-700">Attended</p>
                    <p className="text-sm font-black text-emerald-800 font-mono mt-0.5">{totalAttended} hrs</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-red-600">Absent</p>
                    <p className="text-sm font-black text-red-700 font-mono mt-0.5">{totalAbsent} hrs</p>
                  </div>
                </div>
              )}

              {/* Progress Bars List or Empty State */}
              <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                {summary?.course_attendance && summary.course_attendance.length > 0 ? (
                  summary.course_attendance.map((c) => {
                    const pct = c.percentage;
                    const isZero = c.total_classes === 0;
                    const isGreen = pct >= 75;
                    const isAmber = pct >= 65 && pct < 75;

                    const barColor = isZero
                      ? 'bg-slate-300'
                      : isGreen
                      ? 'bg-emerald-500'
                      : isAmber
                      ? 'bg-amber-500'
                      : 'bg-red-500';

                    const badgeStyle = isZero
                      ? 'bg-slate-100 text-slate-700 border-slate-200'
                      : isGreen
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : isAmber
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-red-50 text-red-700 border-red-200';

                    return (
                      <div
                        key={c.course_code || c.course_id}
                        className="p-3.5 rounded-2xl border border-sfrc-200/80 bg-sfrc-surface/50 hover:bg-sfrc-surface transition-colors"
                      >
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-sfrc-900 truncate">
                              {c.course_title}
                            </p>
                            <p className="text-[11px] text-sfrc-500 font-mono">
                              {c.course_code}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] font-semibold text-sfrc-600">
                              {c.attended_classes}/{c.total_classes} hrs
                            </span>
                            <span
                              className={cn(
                                'text-xs font-black px-2.5 py-0.5 rounded-lg border font-mono',
                                badgeStyle
                              )}
                            >
                              {c.total_classes > 0 ? `${pct.toFixed(1)}%` : '—'}
                            </span>
                          </div>
                        </div>

                        {/* Progress track */}
                        <div className="w-full bg-sfrc-200/70 h-2 rounded-full overflow-hidden">
                          <div
                            className={cn('h-full rounded-full transition-all duration-500', barColor)}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-12 text-center bg-sfrc-surface/50 rounded-2xl border border-dashed border-sfrc-200 p-6">
                    <Clock className="w-8 h-8 text-sfrc-400 mx-auto mb-2" />
                    <p className="text-xs font-bold text-sfrc-800">
                      No Attendance Records Found
                    </p>
                    <p className="text-[11px] text-sfrc-500 mt-1 max-w-xs mx-auto">
                      Attendance has not yet been marked for this ward by faculty members.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Attendance Legend Footer */}
            <div className="mt-4 pt-4 border-t border-sfrc-200 flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-sfrc-700 font-medium">$\ge 75\%$ Regular</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-sfrc-700 font-medium">65-74% Condonation</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="text-sfrc-700 font-medium">&lt; 65% Shortage</span>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: Recent Academic Timeline & Key Contacts */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Recent Updates Timeline */}
          <div className="lg:col-span-6 bg-white rounded-3xl border border-sfrc-200 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <BellRing className="w-5 h-5 text-sfrc-700" />
                <h2 className="text-lg font-black text-sfrc-900 tracking-tight">
                  Recent Academic Timeline
                </h2>
              </div>
              <span className="text-xs font-bold text-sfrc-600 bg-sfrc-100 px-2.5 py-1 rounded-lg">
                Real-Time
              </span>
            </div>

            <div className="space-y-4 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-sfrc-200">
              {summary?.recent_updates && summary.recent_updates.length > 0 ? (
                summary.recent_updates.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-4 relative">
                    <div className="w-7 h-7 rounded-full bg-sfrc-100 border-2 border-white flex items-center justify-center shrink-0 z-10 text-sfrc-700 shadow-xs">
                      <div className="w-2.5 h-2.5 rounded-full bg-sfrc-700" />
                    </div>
                    <div className="flex-1 p-3.5 rounded-2xl border border-sfrc-200 bg-sfrc-surface/60">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-sfrc-accent">
                          {item.category}
                        </span>
                        {item.timestamp && (
                          <span className="text-[10px] text-sfrc-500">{item.timestamp.slice(0, 10)}</span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-sfrc-900 mt-1">{item.title}</p>
                      <p className="text-xs text-sfrc-600 mt-0.5">{item.description}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center">
                  <p className="text-xs text-sfrc-500 font-medium">
                    No recent academic updates recorded for this ward.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Mentor Contact & Hostel Allocation Cards */}
          <div className="lg:col-span-6 space-y-6">
            {/* Mentor & Hostel Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Mentor Contact Card */}
              <div className="p-5 rounded-3xl border border-sfrc-200 bg-white shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <UserCheck className="w-4 h-4 text-sfrc-700" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-sfrc-700">
                      Faculty Mentor
                    </h3>
                  </div>

                  {summary?.mentor ? (
                    <>
                      <p className="text-sm font-black text-sfrc-900">
                        {summary.mentor.mentor_name}
                      </p>
                      <p className="text-[11px] text-sfrc-600">
                        {summary.mentor.designation || 'Faculty'} • {summary.mentor.department_name || 'Academic Dept'}
                      </p>

                      <div className="mt-3 space-y-1.5 text-xs text-sfrc-700 font-medium">
                        {summary.mentor.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-sfrc-500" />
                            <span className="truncate">{summary.mentor.email}</span>
                          </div>
                        )}
                        {summary.mentor.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-sfrc-500" />
                            <span>{summary.mentor.phone}</span>
                          </div>
                        )}
                        {summary.mentor.office_room && (
                          <div className="flex items-center gap-2">
                            <Building2 className="w-3.5 h-3.5 text-sfrc-500" />
                            <span className="truncate">{summary.mentor.office_room}</span>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="py-4">
                      <p className="text-xs font-bold text-sfrc-800">No Mentor Assigned</p>
                      <p className="text-[11px] text-sfrc-500 mt-1">
                        Mentorship allocation will be updated by the department coordinator.
                      </p>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-sfrc-500 mt-3 pt-2 border-t border-sfrc-100">
                  Contact mentor for student academic counseling
                </p>
              </div>

              {/* Hostel Allocation Card */}
              <div className="p-5 rounded-3xl border border-sfrc-200 bg-white shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Home className="w-4 h-4 text-sfrc-700" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-sfrc-700">
                      Hostel & Residence
                    </h3>
                  </div>

                  {summary?.hostel?.is_hosteller ? (
                    <div>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 mb-1">
                        Hostel Resident
                      </span>
                      <p className="text-sm font-black text-sfrc-900">
                        {summary.hostel.hostel_name}
                      </p>
                      <p className="text-xs text-sfrc-600">
                        Room: <span className="font-bold text-sfrc-900 font-mono">{summary.hostel.room_number || 'Allocated'}</span>
                      </p>
                      {summary.hostel.warden_name && (
                        <div className="mt-3 space-y-1 text-xs text-sfrc-700">
                          <p className="text-[11px] text-sfrc-600">
                            Warden: <span className="font-bold text-sfrc-900">{summary.hostel.warden_name}</span>
                          </p>
                          {summary.hostel.warden_contact && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-3.5 h-3.5 text-sfrc-500" />
                              <span>{summary.hostel.warden_contact}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-sfrc-100 text-sfrc-800 mb-1">
                        Day Scholar
                      </span>
                      <p className="text-xs text-sfrc-600 mt-2">
                        Ward commutes daily to the campus. Campus transportation and bus pass facilities are applicable.
                      </p>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-sfrc-500 mt-3 pt-2 border-t border-sfrc-100">
                  Parent permission required for residential leaves
                </p>
              </div>
            </div>

            {/* Official Notices Filtered for Parents */}
            {notices.length > 0 && (
              <div className="bg-white rounded-3xl border border-sfrc-200 p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-sfrc-700" />
                    <h2 className="text-base font-black text-sfrc-900 tracking-tight">
                      Official Parent Circulars
                    </h2>
                  </div>
                  <span className="text-[11px] font-bold text-sfrc-700 bg-sfrc-100 px-2.5 py-0.5 rounded-lg">
                    Announcements
                  </span>
                </div>

                <div className="space-y-3">
                  {notices.slice(0, 3).map((n) => (
                    <div key={n.id} className="p-3.5 rounded-2xl border border-sfrc-200 bg-sfrc-surface">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-sfrc-accent">
                          {n.priority} Priority
                        </span>
                        {n.publish_from && (
                          <span className="text-[10px] text-sfrc-500">{n.publish_from.slice(0, 10)}</span>
                        )}
                      </div>
                      <h3 className="text-xs font-bold text-sfrc-900 mt-1">{n.title}</h3>
                      <p className="text-xs text-sfrc-600 mt-1 line-clamp-2">{n.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Ask Pragya AI Banner */}
        <AskPragyaBanner />
      </div>
    </AppShell>
  );
}
