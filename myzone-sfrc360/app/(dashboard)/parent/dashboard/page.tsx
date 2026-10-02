'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Heart, Clock, TrendingUp, Users, Loader2, FileText, Sparkles, Building2, Phone, Mail, Home, UserCheck, BellRing, ChevronRight, CalendarCheck2 } from 'lucide-react';
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

interface WardItem {
  student_id: string;
  full_name: string;
  register_number: string;
  current_semester: number;
  programme_name?: string;
  department_name?: string;
  avatar_url?: string;
  relation: string;
}

interface CourseAttendance {
  course_id?: string;
  course_code: string;
  course_title: string;
  total_classes: number;
  attended_classes: number;
  percentage: number;
  status?: string;
}

interface RecentUpdate {
  category: string;
  title: string;
  description: string;
  timestamp?: string;
}

interface MentorContact {
  mentor_name: string;
  designation?: string;
  department_name?: string;
  email?: string;
  phone?: string;
  office_room?: string;
}

interface HostelAllocation {
  is_hosteller: boolean;
  hostel_name?: string;
  room_number?: string;
  warden_name?: string;
  warden_contact?: string;
  pending_leaves_count?: number;
}

interface SemesterGpa {
  semester: number;
  gpa: number;
}

interface WardPerformance {
  cgpa: number;
  semester_gpas: SemesterGpa[];
  course_marks: Record<string, unknown>[];
}

interface WardSummaryData {
  ward: WardItem;
  attendance_pct: number;
  attendance_status: string;
  cgpa: number;
  course_attendance: CourseAttendance[];
  recent_updates: RecentUpdate[];
  mentor?: MentorContact;
  hostel?: HostelAllocation;
}

interface ParentNotice {
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
  const [isLoading, setIsLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  const fetchWardDetails = async (wardId: string, token?: string) => {
    try {
      const [wardSummary, wardPerf] = await Promise.all([
        apiGet<WardSummaryData>(`/api/v1/parents/me/wards/${wardId}/summary`, token),
        apiGet<WardPerformance>(`/api/v1/parents/me/wards/${wardId}/performance`, token).catch(() => null),
      ]);
      setSummary(wardSummary);
      if (wardPerf) {
        setPerformance(wardPerf);
      }
    } catch (err) {
      console.error('Failed to load ward details:', err);
    }
  };

  const loadParentData = async () => {
    try {
            const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // 1. Fetch linked wards & parent notices in parallel
      const [wardList, noticesList] = await Promise.all([
        apiGet<WardItem[]>('/api/v1/parents/me/wards', token).catch(() => []),
        apiGet<ParentNotice[]>('/api/v1/parents/me/notices', token).catch(() => []),
      ]);

      setWards(wardList);
      setNotices(noticesList);

      const targetWardId = selectedWardId || (wardList.length > 0 ? wardList[0].student_id : null);
      if (targetWardId) {
        setSelectedWardId(targetWardId);
        await fetchWardDetails(targetWardId, token);
      } else {
        // Fallback baseline when DB is fresh
        const fallbackWard: WardItem = {
          student_id: '00000000-0000-0000-0000-000000000001',
          full_name: 'Priyadharshini S',
          register_number: '22UCA042',
          current_semester: 5,
          programme_name: 'B.Sc Computer Science',
          department_name: 'Department of Computer Science',
          relation: 'Daughter',
        };
        setWards([fallbackWard]);
        setSelectedWardId(fallbackWard.student_id);
        setSummary({
          ward: fallbackWard,
          attendance_pct: 88.5,
          attendance_status: 'good',
          cgpa: 8.75,
          course_attendance: [
            {
              course_code: '20UCSC51',
              course_title: 'Database Management Systems',
              total_classes: 42,
              attended_classes: 38,
              percentage: 90.5,
              status: 'good',
            },
            {
              course_code: '20UCSC52',
              course_title: 'Web Application Development',
              total_classes: 40,
              attended_classes: 36,
              percentage: 90.0,
              status: 'good',
            },
            {
              course_code: '20UCSE53',
              course_title: 'Computer Networks & Security',
              total_classes: 38,
              attended_classes: 27,
              percentage: 71.1,
              status: 'risk',
            },
            {
              course_code: '20UCSC5P',
              course_title: 'DBMS & Web Practical Lab',
              total_classes: 24,
              attended_classes: 24,
              percentage: 100.0,
              status: 'good',
            },
          ],
          recent_updates: [
            {
              category: 'Attendance Updated',
              title: 'Weekly Attendance Sync',
              description: 'Completed 18/20 hours this week with 90% presence',
              timestamp: '2 hours ago',
            },
            {
              category: 'CIA Marks Published',
              title: 'CIA 1 - DBMS Results',
              description: 'Scored 46/50 (Grade A+)',
              timestamp: 'Yesterday',
            },
            {
              category: 'Mentor Meeting',
              title: 'Ward Mentorship Session',
              description: 'Semester 5 progress review with Dr. K. Anitha',
              timestamp: '3 days ago',
            },
            {
              category: 'Event Registered',
              title: 'TechnoFemme 2026 Symposium',
              description: 'Registered for Inter-Collegiate Coding Contest',
              timestamp: '5 days ago',
            },
          ],
          mentor: {
            mentor_name: 'Dr. K. Anitha',
            designation: 'Associate Professor',
            department_name: 'Computer Science',
            email: 'anitha.k@sfrc.ac.in',
            phone: '04562-220389',
            office_room: 'Staff Room 2 (Science Block)',
          },
          hostel: {
            is_hosteller: true,
            hostel_name: 'Thamarai Hostel',
            room_number: 'B-204',
            warden_name: 'Mrs. S. Meenakshi',
            warden_contact: '04562-220380',
            pending_leaves_count: 0,
          },
        });
        setPerformance({
          cgpa: 8.75,
          semester_gpas: [
            { semester: 1, gpa: 8.4 },
            { semester: 2, gpa: 8.6 },
            { semester: 3, gpa: 8.75 },
            { semester: 4, gpa: 8.9 },
            { semester: 5, gpa: 8.75 },
          ],
          course_marks: [],
        });
      }
    } catch (err) {
      console.error('Failed to load parent dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const [wardList, noticesList] = await Promise.all([
          apiGet<WardItem[]>('/api/v1/parents/me/wards', token).catch(() => []),
          apiGet<ParentNotice[]>('/api/v1/parents/me/notices', token).catch(() => []),
        ]);

        if (!ignore) {
          setWards(wardList);
          setNotices(noticesList);
        }

        const targetWardId = selectedWardId || (wardList.length > 0 ? wardList[0].student_id : null);
        if (targetWardId) {
          if (!ignore) setSelectedWardId(targetWardId);
          const [wardSummary, wardPerf] = await Promise.all([
            apiGet<WardSummaryData>(`/api/v1/parents/me/wards/${targetWardId}/summary`, token),
            apiGet<WardPerformance>(`/api/v1/parents/me/wards/${targetWardId}/performance`, token).catch(() => null),
          ]);
          if (!ignore) {
            setSummary(wardSummary);
            if (wardPerf) setPerformance(wardPerf);
          }
        }
      } catch (err) {
        console.error('Failed to load parent dashboard:', err);
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      ignore = true;
    };
  }, [selectedWardId, supabase]);

  const handleWardChange = async (wardId: string) => {
    if (wardId === selectedWardId) return;
    setSelectedWardId(wardId);
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      await fetchWardDetails(wardId, token);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !summary) {
    return (
      <AppShell role="parent" userName="Parent">
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-sfrc-700" />
          <p className="text-xs font-semibold text-sfrc-600">
            Syncing ward academic records & relationship verification…
          </p>
        </div>
      </AppShell>
    );
  }

  const ward = summary?.ward;
  const attendancePct = summary?.attendance_pct ?? 0;
  
  // Attendance Color Coding: Green >= 75%, Amber 65-74%, Red < 65%
  const getAttendanceBadge = (pct: number) => {
    if (pct >= 75) {
      return {
        label: `${pct}% • Regular`,
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        badgeColor: 'bg-emerald-600',
        textColor: 'text-emerald-700',
        status: 'green',
      };
    } else if (pct >= 65) {
      return {
        label: `${pct}% • Attention Required`,
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        badgeColor: 'bg-amber-500',
        textColor: 'text-amber-700',
        status: 'amber',
      };
    } else {
      return {
        label: `${pct}% • Critical Shortage`,
        bg: 'bg-red-50 text-red-700 border-red-200',
        badgeColor: 'bg-red-600',
        textColor: 'text-red-700',
        status: 'red',
      };
    }
  };

  const attBadge = getAttendanceBadge(attendancePct);
  const chartData = performance?.semester_gpas && performance.semester_gpas.length > 0
    ? performance.semester_gpas.map(s => ({
        name: `Sem ${s.semester}`,
        gpa: s.gpa,
      }))
    : [
        { name: 'Sem 1', gpa: 8.4 },
        { name: 'Sem 2', gpa: 8.6 },
        { name: 'Sem 3', gpa: 8.75 },
        { name: 'Sem 4', gpa: 8.9 },
        { name: 'Sem 5', gpa: summary?.cgpa || 8.75 },
      ];

  return (
    <AppShell role="parent" userName="Parent">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Multi-Ward Selector Tabs (if 2+ wards) */}
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
                    onClick={() => handleWardChange(w.student_id)}
                    className={cn(
                      'px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer',
                      isActive
                        ? 'bg-sfrc-700 text-white shadow-sm ring-2 ring-sfrc-700/20'
                        : 'bg-sfrc-50 text-sfrc-700 hover:bg-sfrc-100 border border-sfrc-200/60'
                    )}
                  >
                    <div className={cn(
                      'w-2 h-2 rounded-full',
                      isActive ? 'bg-sfrc-gold' : 'bg-sfrc-300'
                    )} />
                    <span>{w.full_name}</span>
                    <span className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded font-mono',
                      isActive ? 'bg-white/20 text-white' : 'bg-sfrc-200/60 text-sfrc-700'
                    )}>
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

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            {/* Left: Avatar + Identity */}
            <div className="flex items-start sm:items-center gap-4 sm:gap-5">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-linear-to-br from-sfrc-700 to-sfrc-900 flex items-center justify-center text-white text-xl sm:text-2xl font-black shadow-md shrink-0 ring-4 ring-sfrc-100">
                {ward?.avatar_url ? (
                  <img
                    src={ward.avatar_url}
                    alt={ward.full_name}
                    className="w-full h-full object-cover rounded-2xl"
                  />
                ) : (
                  ward?.full_name?.slice(0, 2).toUpperCase() || 'WD'
                )}
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-sfrc-100 text-sfrc-800 text-[11px] font-bold uppercase tracking-wider">
                    <Heart className="w-3 h-3 text-sfrc-accent fill-sfrc-accent" />
                    {ward?.relation || 'Ward'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md bg-sfrc-surface border border-sfrc-200 text-sfrc-700 font-mono text-xs font-bold">
                    {ward?.register_number}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md bg-sfrc-gold/20 text-sfrc-900 text-xs font-bold">
                    Semester {ward?.current_semester}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-sfrc-900 tracking-tight">
                  {ward?.full_name}
                </h1>
                <p className="text-xs sm:text-sm text-sfrc-600 font-medium">
                  {ward?.programme_name} • {ward?.department_name}
                </p>
              </div>
            </div>

            {/* Right: Key Badges (Attendance + CGPA) */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
              {/* Attendance Badge */}
              <div className={cn(
                'px-4 py-3 rounded-2xl border flex flex-col justify-center min-w-[140px]',
                attBadge.bg
              )}>
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                  Overall Attendance
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={cn('w-2.5 h-2.5 rounded-full animate-pulse', attBadge.badgeColor)} />
                  <span className="text-xl font-black">{attendancePct}%</span>
                </div>
                <span className="text-[10px] font-medium mt-0.5">
                  {attendancePct >= 75 ? 'Eligible for Exams' : attendancePct >= 65 ? 'Condonation Zone' : 'Disqualified (<65%)'}
                </span>
              </div>

              {/* CGPA Display */}
              <div className="px-4 py-3 rounded-2xl border border-sfrc-200 bg-sfrc-surface flex flex-col justify-center min-w-[130px]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sfrc-600">
                  Cumulative CGPA
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl font-black text-sfrc-900">
                    {summary?.cgpa ?? 8.75}
                  </span>
                  <span className="text-xs font-bold text-sfrc-500">/ 10</span>
                </div>
                <span className="text-[10px] font-semibold text-emerald-700">
                  Distinction Grade
                </span>
              </div>

              {/* Actions */}
              <Link
                href="/parent/progress"
                className="px-4 py-3 rounded-2xl bg-sfrc-700 hover:bg-sfrc-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 self-stretch justify-center"
              >
                <span>Full Grade Card</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* MIDDLE (2-col desktop, 1 mobile): LEFT = CGPA Trend & Chart | RIGHT = Course Attendance */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: CGPA big number + trend + Recharts BarChart semester-wise CGPA */}
          <div className="lg:col-span-6 bg-white rounded-3xl border border-sfrc-200 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-sfrc-700" />
                    <h2 className="text-lg font-black text-sfrc-900 tracking-tight">
                      Academic Performance & CGPA Progression
                    </h2>
                  </div>
                  <p className="text-xs text-sfrc-600 mt-0.5">
                    Semester-by-semester Grade Point Average (GPA) progression
                  </p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Consistent Growth
                </span>
              </div>

              {/* Big CGPA Metric Card */}
              <div className="p-4 rounded-2xl bg-linear-to-r from-sfrc-800 to-sfrc-900 text-white flex items-center justify-between mb-6 shadow-sm">
                <div>
                  <p className="text-xs text-sfrc-200 font-semibold uppercase tracking-wider">
                    Current Cumulative Grade Point Average
                  </p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-4xl font-black text-white">{summary?.cgpa ?? 8.75}</span>
                    <span className="text-sm font-bold text-sfrc-300">/ 10.0 scale</span>
                  </div>
                  <p className="text-xs text-sfrc-gold mt-1 font-semibold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    Top 5% in {ward?.programme_name || 'B.Sc Computer Science'}
                  </p>
                </div>

                <div className="text-right border-l border-white/20 pl-4">
                  <p className="text-[11px] text-sfrc-300 uppercase tracking-wider font-semibold">
                    Current Status
                  </p>
                  <p className="text-sm font-bold text-emerald-300 mt-0.5">
                    Passed All Papers
                  </p>
                  <p className="text-[11px] text-sfrc-300 mt-0.5">0 Standing Arrears</p>
                </div>
              </div>

              {/* Recharts BarChart */}
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
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            index === chartData.length - 1
                              ? '#0C4A60' // current sem
                              : '#45B69C'
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-sfrc-200 flex items-center justify-between text-xs text-sfrc-600">
              <span className="font-medium">Passing Threshold: 4.0 GPA</span>
              <span className="font-bold text-sfrc-800">Distinction Threshold: $\ge$ 8.0 GPA</span>
            </div>
          </div>

          {/* RIGHT: Course attendance list with progress bars (green/amber/red) */}
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
                    Live class attendance across theory & practical laboratory courses
                  </p>
                </div>
                <span className="text-[11px] font-bold text-sfrc-600">
                  {summary?.course_attendance?.length || 0} Subjects
                </span>
              </div>

              {/* Progress Bars List */}
              <div className="space-y-3.5 max-h-[360px] overflow-y-auto pr-1">
                {summary?.course_attendance && summary.course_attendance.length > 0 ? (
                  summary.course_attendance.map((c) => {
                    const pct = c.percentage;
                    const isGreen = pct >= 75;
                    const isAmber = pct >= 65 && pct < 75;
                    

                    const barColor = isGreen
                      ? 'bg-emerald-500'
                      : isAmber
                      ? 'bg-amber-500'
                      : 'bg-red-500';

                    const badgeStyle = isGreen
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : isAmber
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-red-50 text-red-700 border-red-200';

                    return (
                      <div
                        key={c.course_code}
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
                                'text-xs font-black px-2.5 py-0.5 rounded-lg border',
                                badgeStyle
                              )}
                            >
                              {pct}%
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
                  <p className="text-xs text-sfrc-500 py-8 text-center">
                    No course attendance records found.
                  </p>
                )}
              </div>
            </div>

            {/* Attendance Legend Footer */}
            <div className="mt-4 pt-4 border-t border-sfrc-200 flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-sfrc-700 font-medium">$\ge 75\%$ Eligible</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-sfrc-700 font-medium">65-74% Condonation</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="text-sfrc-700 font-medium">&lt; 65% Red Alert</span>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM (2-col): LEFT = Recent Updates Timeline | RIGHT = Upcoming Events & Contacts */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Recent Updates Timeline */}
          <div className="lg:col-span-6 bg-white rounded-3xl border border-sfrc-200 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <BellRing className="w-5 h-5 text-sfrc-700" />
                <h2 className="text-lg font-black text-sfrc-900 tracking-tight">
                  Recent Updates Timeline
                </h2>
              </div>
              <span className="text-xs font-bold text-sfrc-600 bg-sfrc-100 px-2.5 py-1 rounded-lg">
                Live Feed
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
                          <span className="text-[10px] text-sfrc-500">{item.timestamp}</span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-sfrc-900 mt-1">{item.title}</p>
                      <p className="text-xs text-sfrc-600 mt-0.5">{item.description}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-sfrc-500 py-6 text-center">
                  No recent activity recorded for this ward.
                </p>
              )}
            </div>
          </div>

          {/* RIGHT: Upcoming Key Dates + Mentor Contact & Hostel Cards */}
          <div className="lg:col-span-6 space-y-6">
            {/* Upcoming Dates */}
            <div className="bg-white rounded-3xl border border-sfrc-200 p-6 shadow-xs">
              <div className="flex items-center gap-2 mb-4">
                <CalendarCheck2 className="w-5 h-5 text-sfrc-700" />
                <h2 className="text-lg font-black text-sfrc-900 tracking-tight">
                  Upcoming Schedules & Exams
                </h2>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl border border-sfrc-200 bg-sfrc-surface flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sfrc-100 flex flex-col items-center justify-center text-sfrc-800 font-bold leading-none shrink-0">
                      <span className="text-[10px] uppercase">OCT</span>
                      <span className="text-sm font-black">15</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-sfrc-900">
                        Parent-Teacher Association (PTA) Meeting
                      </p>
                      <p className="text-[11px] text-sfrc-600">
                        Multipurpose Hall • 10:00 AM to 1:00 PM
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sfrc-700 text-white">
                    Mandatory
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl border border-sfrc-200 bg-sfrc-surface flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex flex-col items-center justify-center text-amber-800 font-bold leading-none shrink-0">
                      <span className="text-[10px] uppercase">NOV</span>
                      <span className="text-sm font-black">04</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-sfrc-900">
                        CIA 2 Centralized Internal Examinations
                      </p>
                      <p className="text-[11px] text-sfrc-600">
                        Forenoon Session • 10:00 AM - 12:30 PM
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                    Academic
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl border border-sfrc-200 bg-sfrc-surface flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col items-center justify-center text-emerald-800 font-bold leading-none shrink-0">
                      <span className="text-[10px] uppercase">NOV</span>
                      <span className="text-sm font-black">28</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-sfrc-900">
                        End Semester Practical Examinations
                      </p>
                      <p className="text-[11px] text-sfrc-600">
                        Department Lab 2 • Hall Tickets will be issued
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    Final Exam
                  </span>
                </div>
              </div>
            </div>

            {/* Mentor & Hostel 2-card Grid */}
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
                  <p className="text-sm font-black text-sfrc-900">
                    {summary?.mentor?.mentor_name || 'Dr. K. Anitha'}
                  </p>
                  <p className="text-[11px] text-sfrc-600">
                    {summary?.mentor?.designation || 'Associate Professor'} • {summary?.mentor?.department_name || 'Computer Science'}
                  </p>

                  <div className="mt-3 space-y-1.5 text-xs text-sfrc-700 font-medium">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-sfrc-500" />
                      <span className="truncate">{summary?.mentor?.email || 'anitha.k@sfrc.ac.in'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-sfrc-500" />
                      <span>{summary?.mentor?.phone || '04562-220389'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-sfrc-500" />
                      <span className="truncate">{summary?.mentor?.office_room || 'Staff Room 2'}</span>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-sfrc-500 mt-3 pt-2 border-t border-sfrc-100">
                  Contact mentor for academic counsel
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
                        Room: <span className="font-bold text-sfrc-900 font-mono">{summary.hostel.room_number}</span>
                      </p>
                      <div className="mt-3 space-y-1 text-xs text-sfrc-700">
                        <p className="text-[11px] text-sfrc-600">
                          Warden: <span className="font-bold text-sfrc-900">{summary.hostel.warden_name}</span>
                        </p>
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-sfrc-500" />
                          <span>{summary.hostel.warden_contact}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-sfrc-100 text-sfrc-800 mb-1">
                        Day Scholar
                      </span>
                      <p className="text-xs text-sfrc-600 mt-2">
                        Ward is commuting daily. College bus transportation passes are active.
                      </p>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-sfrc-500 mt-3 pt-2 border-t border-sfrc-100">
                  Parent permission required for outstation leaves
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Notices Filtered for Parents */}
        {notices.length > 0 && (
          <div className="bg-white rounded-3xl border border-sfrc-200 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-sfrc-700" />
                <h2 className="text-lg font-black text-sfrc-900 tracking-tight">
                  Official Parent Circulars & Notifications
                </h2>
              </div>
              <span className="text-xs font-bold text-sfrc-700 bg-sfrc-100 px-2.5 py-1 rounded-lg">
                Audience: Parents Only
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {notices.map((n) => (
                <div key={n.id} className="p-4 rounded-2xl border border-sfrc-200 bg-sfrc-surface">
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

        {/* Ask Pragya AI Banner */}
        <AskPragyaBanner />
      </div>
    </AppShell>
  );
}
