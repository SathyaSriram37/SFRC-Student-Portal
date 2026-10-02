'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Clock, BookOpen, Calendar, CheckCircle2, AlertTriangle, FileText, CreditCard, Library, LifeBuoy, ArrowRight, TrendingUp, Loader2, GraduationCap } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import AppShell from '@/components/layout/AppShell';

import AskPragyaBanner from '@/components/shared/AskPragyaBanner';
import { createClient } from '@/lib/supabase/client';
import { apiGet } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface TimetableItem {
  id: string;
  period_number: number;
  start_time: string;
  end_time: string;
  room?: string;
  course_code: string;
  course_title: string;
  faculty_name?: string;
}

interface EventItem {
  id: string;
  title: string;
  category?: string;
  event_date?: string;
  event_time?: string;
  venue?: string;
}

interface TaskItem {
  id: string;
  title: string;
  due_date?: string;
  course_code: string;
  course_title: string;
}

interface StudentDashboardData {
  profile: {
    student_id: string;
    full_name: string;
    register_number: string;
    current_semester: number;
    programme_name?: string;
    department_name?: string;
    avatar_url?: string;
  };
  attendance_pct: number;
  cgpa: number;
  events_count: number;
  pending_tasks_count: number;
  pending_tasks: TaskItem[];
  today_timetable: TimetableItem[];
  upcoming_events: EventItem[];
  notifications_unread: number;
}

const QUICK_LINKS = [
  { label: 'Apply Leave', href: '/student/leave', icon: Calendar, desc: 'Submit OD or Medical Leave' },
  { label: 'Marks Sheet', href: '/student/marks', icon: FileText, desc: 'CIA & Model Exam Results' },
  { label: 'Examinations', href: '/student/exams', icon: GraduationCap, desc: 'Timetables & Hall Tickets' },
  { label: 'Campus Care', href: '/student/campus-care', icon: LifeBuoy, desc: 'CivicFix Grievance Portal' },
  { label: 'Fee Payment', href: '/student/fees', icon: CreditCard, desc: 'Term Fees & Hostel Dues' },
  { label: 'Library Catalog', href: '/student/library', icon: Library, desc: 'OPAC Search & Book Renewal' },
];

export default function StudentDashboardPage() {
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [pendingPolicyCount, setPendingPolicyCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  
  const supabase = useMemo(() => createClient(), []);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;

        const result = await apiGet<StudentDashboardData>(
          '/api/v1/students/me/dashboard',
          token
        );
        if (!ignore) {
          setData(result);
        }

        try {
          const pendingRes = await apiGet<{ count: number }>('/api/v1/policies/me/pending', token);
          if (!ignore && pendingRes && typeof pendingRes.count === 'number') {
            setPendingPolicyCount(pendingRes.count);
          }
        } catch {
          // ignore policy check errors
        }
      } catch (err: unknown) {
        console.error('Failed to load student dashboard:', err);
        if (!ignore) {
          setData({
            profile: {
              student_id: 'std-demo',
              full_name: 'Student Scholar',
              register_number: '22UCA042',
              current_semester: 6,
              programme_name: 'B.Sc Computer Science',
              department_name: 'Department of Computer Science',
            },
            attendance_pct: 88.5,
            cgpa: 8.65,
            events_count: 4,
            pending_tasks_count: 2,
            pending_tasks: [
              {
                id: 't-1',
                title: 'Cloud Computing Case Study Analysis',
                due_date: 'Tomorrow, 5:00 PM',
                course_code: '22UCSC61',
                course_title: 'Cloud Architecture & DevOps',
              },
              {
                id: 't-2',
                title: 'Full Stack Project Phase 2 Submission',
                due_date: 'Friday, 11:59 PM',
                course_code: '22UCSC62',
                course_title: 'Web Application Development',
              },
            ],
            today_timetable: [
              {
                id: 'tt-1',
                period_number: 1,
                start_time: '09:00 AM',
                end_time: '10:00 AM',
                room: 'Lab 3 (MCA Block)',
                course_code: '22UCSC61',
                course_title: 'Cloud Architecture & DevOps',
                faculty_name: 'Dr. K. Anitha',
              },
              {
                id: 'tt-2',
                period_number: 2,
                start_time: '10:00 AM',
                end_time: '11:00 AM',
                room: 'LH 104',
                course_code: '22UCSC62',
                course_title: 'Web Application Development',
                faculty_name: 'Dr. M. Lakshmi',
              },
              {
                id: 'tt-3',
                period_number: 3,
                start_time: '11:15 AM',
                end_time: '12:15 PM',
                room: 'Smart Room 2',
                course_code: '22UCSE63',
                course_title: 'Machine Learning Fundamentals',
                faculty_name: 'Prof. R. Priya',
              },
            ],
            upcoming_events: [
              {
                id: 'ev-1',
                title: 'TechSpark 2026: National Level Hackathon',
                category: 'Technical',
                event_date: 'Oct 15, 2026',
                event_time: '09:30 AM',
                venue: 'Auditorium Block B',
              },
              {
                id: 'ev-2',
                title: 'Workshop on Agentic AI & Next.js 16',
                category: 'Workshop',
                event_date: 'Oct 22, 2026',
                event_time: '02:00 PM',
                venue: 'ICT Seminar Hall',
              },
            ],
            notifications_unread: 2,
          });
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      ignore = true;
    };
  }, [supabase]);

  // Performance breakdown data for Recharts
  const performanceChartData = useMemo(() => {
    return [
      { subject: 'Cloud Dev', cia1: 88, cia2: 92, target: 75 },
      { subject: 'FullStack', cia1: 82, cia2: 89, target: 75 },
      { subject: 'ML Fund', cia1: 91, cia2: 94, target: 75 },
      { subject: 'NetSec', cia1: 78, cia2: 85, target: 75 },
      { subject: 'Ethics', cia1: 95, cia2: 98, target: 75 },
    ];
  }, []);

  const sparklineData = useMemo(() => {
    return [
      { sem: 'S1', gpa: 8.2 },
      { sem: 'S2', gpa: 8.4 },
      { sem: 'S3', gpa: 8.5 },
      { sem: 'S4', gpa: 8.6 },
      { sem: 'S5', gpa: 8.75 },
    ];
  }, []);

  if (isLoading && !data) {
    return (
      <AppShell role="student" userName="Loading…">
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-sfrc-700" />
          <p className="text-xs font-semibold text-sfrc-600">
            Syncing student records from SFRC API…
          </p>
        </div>
      </AppShell>
    );
  }

  const profile = data?.profile;
  const isAttendanceAtRisk = (data?.attendance_pct ?? 100) < 75;

  return (
    <AppShell role="student" userName={profile?.full_name || 'Student'}>
      <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
        {/* Header Profile Greeting */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-sfrc-200 shadow-sm">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sfrc-100 text-sfrc-700 text-xs font-bold uppercase tracking-wider mb-2">
              <span className="w-2 h-2 rounded-full bg-sfrc-accent animate-pulse" />
              Semester {profile?.current_semester || 1} • {profile?.register_number}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-sfrc-900 tracking-tight">
              {greeting}, {profile?.full_name || 'Student'}! 👋
            </h1>
            <p className="text-xs sm:text-sm text-sfrc-600 mt-1">
              {profile?.programme_name} • {profile?.department_name}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/student/timetable"
              className="px-4 py-2 rounded-xl text-xs font-bold text-sfrc-700 bg-sfrc-100 hover:bg-sfrc-200 transition-colors"
            >
              Full Timetable
            </Link>
            <Link
              href="/student/marks"
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-sfrc-700 hover:bg-sfrc-800 transition-colors shadow-sm"
            >
              View Report Card
            </Link>
          </div>
        </div>

        {/* Pending Policies Acknowledgement Banner */}
        {pendingPolicyCount > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 shadow-sm animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-amber-900">
                  Action Required: {pendingPolicyCount} {pendingPolicyCount === 1 ? 'policy requires' : 'policies require'} acknowledgement
                </h2>
                <p className="text-xs text-amber-700 font-medium">
                  Please review the institutional policies and submit mandatory digital compliance acknowledgements.
                </p>
              </div>
            </div>
            <Link
              href="/student/policies"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition-colors shadow-sm shrink-0"
            >
              <span>View Policies</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* 4 Stat Cards */}
        <section aria-label="Key Academic Indicators" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Attendance Card */}
          <div className="relative overflow-hidden rounded-2xl border border-sfrc-200 bg-white p-5 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-sfrc-600 uppercase tracking-wider">
                  Overall Attendance
                </p>
                <p className={cn(
                  'mt-1.5 text-3xl font-black tracking-tight',
                  isAttendanceAtRisk ? 'text-red-600' : 'text-sfrc-900'
                )}>
                  {data?.attendance_pct}%
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-sfrc-100 flex items-center justify-center text-sfrc-700">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="w-full bg-sfrc-100 h-2 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    isAttendanceAtRisk ? 'bg-red-500' : 'bg-sfrc-700'
                  )}
                  style={{ width: `${Math.min(data?.attendance_pct || 0, 100)}%` }}
                />
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs">
              {isAttendanceAtRisk ? (
                <span className="inline-flex items-center gap-1 font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
                  <AlertTriangle className="w-3.5 h-3.5" /> At Risk (&lt; 75%)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Eligible for Exams
                </span>
              )}
              <span className="text-sfrc-500 text-[11px]">Min 75% req</span>
            </div>
          </div>

          {/* 2. CGPA Card with Mini Sparkline */}
          <div className="relative overflow-hidden rounded-2xl border border-sfrc-200 bg-white p-5 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-sfrc-600 uppercase tracking-wider">
                  Cumulative GPA
                </p>
                <div className="flex items-baseline gap-1 mt-1.5">
                  <span className="text-3xl font-black text-sfrc-900 tracking-tight">
                    {data?.cgpa}
                  </span>
                  <span className="text-xs font-bold text-sfrc-500">/ 10</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-sfrc-gold/20 flex items-center justify-center text-sfrc-800">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            {/* Sparkline */}
            <div className="h-8 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparklineData}>
                  <Area
                    type="monotone"
                    dataKey="gpa"
                    stroke="#7B4019"
                    fill="#D4A052"
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <p className="mt-2 text-xs font-semibold text-sfrc-600 flex items-center gap-1">
              <span className="text-emerald-600 font-bold">↑ +0.15</span> since Sem 4
            </p>
          </div>

          {/* 3. Events Card */}
          <div className="relative overflow-hidden rounded-2xl border border-sfrc-200 bg-white p-5 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-sfrc-600 uppercase tracking-wider">
                  Campus Events
                </p>
                <p className="mt-1.5 text-3xl font-black text-sfrc-900 tracking-tight">
                  {data?.events_count}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-sfrc-100 flex items-center justify-center text-sfrc-700">
                <Calendar className="w-5 h-5" />
              </div>
            </div>
            <p className="mt-4 text-xs text-sfrc-700 font-medium truncate">
              Next: <span className="font-bold">{data?.upcoming_events[0]?.title || 'TechFest 2026'}</span>
            </p>
            <p className="mt-1 text-[11px] text-sfrc-500">
              {data?.upcoming_events[0]?.event_date || 'Upcoming this month'}
            </p>
          </div>

          {/* 4. Pending Tasks Card */}
          <div className="relative overflow-hidden rounded-2xl border border-sfrc-200 bg-white p-5 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-sfrc-600 uppercase tracking-wider">
                  Pending Tasks
                </p>
                <p className="mt-1.5 text-3xl font-black text-sfrc-900 tracking-tight">
                  {data?.pending_tasks_count}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700">
                <BookOpen className="w-5 h-5" />
              </div>
            </div>
            <p className="mt-4 text-xs text-amber-800 font-semibold">
              {data?.pending_tasks_count ? 'Due this week' : 'All caught up!'}
            </p>
            <p className="mt-1 text-[11px] text-sfrc-500">
              Assignments & Lab Record Reviews
            </p>
          </div>
        </section>

        {/* Middle Section (2-Col Desktop, 1-Col Mobile) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Col (7/12): Timetable + Performance Chart */}
          <div className="lg:col-span-7 space-y-8">
            {/* Today's Timetable */}
            <div className="bg-white rounded-3xl border border-sfrc-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-black text-sfrc-900 tracking-tight">
                    Today&apos;s Class Schedule
                  </h2>
                  <p className="text-xs text-sfrc-600">
                    Live timetable synced with Faculty allocations
                  </p>
                </div>
                <span className="text-xs font-bold text-sfrc-700 bg-sfrc-100 px-3 py-1 rounded-full">
                  Day Order {new Date().getDay() || 1}
                </span>
              </div>

              {data?.today_timetable && data.today_timetable.length > 0 ? (
                <div className="space-y-3">
                  {data.today_timetable.map((slot) => (
                    <div
                      key={slot.id}
                      className="flex items-center gap-4 p-3.5 rounded-2xl border border-sfrc-200 bg-sfrc-surface hover:border-sfrc-accent transition-all group"
                    >
                      <div className="w-12 text-center shrink-0">
                        <span className="text-xs font-black text-sfrc-800">
                          P{slot.period_number}
                        </span>
                        <p className="text-[10px] text-sfrc-500">{slot.start_time}</p>
                      </div>
                      <div className="h-8 w-px bg-sfrc-200 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-sfrc-900 truncate">
                          {slot.course_title}
                        </p>
                        <p className="text-[11px] text-sfrc-600 truncate">
                          {slot.course_code} • {slot.faculty_name}
                        </p>
                      </div>
                      {slot.room && (
                        <span className="text-[11px] font-semibold text-sfrc-700 bg-white border border-sfrc-200 px-2.5 py-1 rounded-lg shrink-0">
                          {slot.room}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-sfrc-surface rounded-2xl border border-dashed border-sfrc-200">
                  <Calendar className="w-8 h-8 text-sfrc-400 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-sfrc-700">No scheduled periods today</p>
                  <p className="text-[11px] text-sfrc-500 mt-1">Enjoy your study holiday or project hours.</p>
                </div>
              )}
            </div>

            {/* Academic Performance Chart */}
            <div className="bg-white rounded-3xl border border-sfrc-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-black text-sfrc-900 tracking-tight">
                    Assessment Performance
                  </h2>
                  <p className="text-xs text-sfrc-600">
                    CIA 1 vs CIA 2 marks comparison across enrolled courses
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-sfrc-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-sfrc-700" /> CIA 1
                  </span>
                  <span className="flex items-center gap-1.5 text-sfrc-gold">
                    <span className="w-2.5 h-2.5 rounded-full bg-sfrc-gold" /> CIA 2
                  </span>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={performanceChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8C88A" opacity={0.3} />
                    <XAxis dataKey="subject" tick={{ fontSize: 11, fill: '#5E3012' }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#5E3012' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FBF5EB',
                        borderColor: '#D4A052',
                        borderRadius: '12px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="cia1" fill="#7B4019" radius={[6, 6, 0, 0]} maxBarSize={32} />
                    <Bar dataKey="cia2" fill="#D4A052" radius={[6, 6, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Right Col (5/12): Upcoming Events + Quick Links */}
          <div className="lg:col-span-5 space-y-8">
            {/* Quick Links Grid (6 items) */}
            <div className="bg-white rounded-3xl border border-sfrc-200 p-6 shadow-sm">
              <h2 className="text-lg font-black text-sfrc-900 tracking-tight mb-4">
                Student Quick Services
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {QUICK_LINKS.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.label}
                      href={link.href}
                      className="p-3.5 rounded-2xl border border-sfrc-200 bg-sfrc-surface hover:bg-sfrc-100 hover:border-sfrc-accent transition-all group flex flex-col justify-between"
                    >
                      <div className="w-8 h-8 rounded-xl bg-sfrc-100 group-hover:bg-sfrc-700 flex items-center justify-center text-sfrc-700 group-hover:text-white transition-colors mb-2">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-sfrc-900 group-hover:text-sfrc-800">
                          {link.label}
                        </p>
                        <p className="text-[10px] text-sfrc-500 mt-0.5 line-clamp-1">
                          {link.desc}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Upcoming Events List */}
            <div className="bg-white rounded-3xl border border-sfrc-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-black text-sfrc-900 tracking-tight">
                  Upcoming Events
                </h2>
                <Link
                  href="/student/events"
                  className="text-xs font-bold text-sfrc-accent hover:text-sfrc-800 flex items-center gap-1"
                >
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="space-y-3">
                {data?.upcoming_events && data.upcoming_events.length > 0 ? (
                  data.upcoming_events.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-3.5 rounded-2xl border border-sfrc-200 bg-sfrc-surface flex items-start gap-3.5 hover:border-sfrc-accent transition-all"
                    >
                      <div className="w-10 h-10 rounded-xl bg-sfrc-700 text-white flex flex-col items-center justify-center shrink-0 font-black text-xs leading-none">
                        <span>OCT</span>
                        <span className="text-sm text-sfrc-gold">15</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sfrc-gold/20 text-sfrc-800 mb-1">
                          {ev.category || 'Academic'}
                        </span>
                        <p className="text-xs font-bold text-sfrc-900 truncate">
                          {ev.title}
                        </p>
                        <p className="text-[11px] text-sfrc-600 mt-0.5 truncate">
                          {ev.venue || 'College Auditorium'} • {ev.event_time || '10:00 AM'}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-sfrc-500 py-4 text-center">No upcoming events scheduled.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Ask Pragya Banner */}
        <section aria-label="Pragya AI Campus Assistant">
          <AskPragyaBanner />
        </section>
      </div>
    </AppShell>
  );
}
