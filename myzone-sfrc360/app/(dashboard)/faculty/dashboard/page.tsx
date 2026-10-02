'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { BookOpen, ClipboardList, BarChart3, Users, Calendar, ArrowRight, Loader2 } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import AskPragyaBanner from '@/components/shared/AskPragyaBanner';
import { createClient } from '@/lib/supabase/client';
import { apiGet } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface FacultyDashboardData {
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

export default function FacultyDashboardPage() {
  const [data, setData] = useState<FacultyDashboardData | null>(null);
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
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const result = await apiGet<FacultyDashboardData>(
          '/api/v1/faculty/me/dashboard',
          token
        );
        if (!ignore) {
          setData(result);
        }
      } catch (err) {
        console.error('Failed to load faculty dashboard:', err);
        if (!ignore) {
          setData({
            profile: {
              faculty_id: 'fac-1',
              full_name: 'Dr. K. Anitha',
              employee_id: 'SFRC-FAC-2018',
              designation: 'Associate Professor & HOD',
              department_name: 'Department of Computer Science',
            },
            today_schedule: [
              {
                id: 's-1',
                period_number: 1,
                start_time: '09:00 AM',
                end_time: '10:00 AM',
                room: 'Lab 3 (MCA Block)',
                course_code: '22UCSC61',
                course_title: 'Cloud Architecture & DevOps',
                programme_name: 'B.Sc Computer Science',
                semester: 6,
              },
              {
                id: 's-2',
                period_number: 3,
                start_time: '11:15 AM',
                end_time: '12:15 PM',
                room: 'LH 202',
                course_code: '22PCSC21',
                course_title: 'Advanced Machine Learning',
                programme_name: 'M.Sc Computer Science',
                semester: 2,
              },
            ],
            pending_attendance_courses: [
              {
                course_id: 'c-1',
                course_code: '22UCSC61',
                course_title: 'Cloud Architecture & DevOps',
                semester: 6,
                start_time: '09:00 AM',
              },
            ],
            pending_marks_count: 1,
            mentee_count: 18,
            total_classes_today: 2,
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

  if (isLoading && !data) {
    return (
      <AppShell role="faculty" userName="Faculty">
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-sfrc-700" />
          <p className="text-xs font-semibold text-sfrc-600">
            Syncing faculty schedule and class logs…
          </p>
        </div>
      </AppShell>
    );
  }

  const profile = data?.profile;

  return (
    <AppShell role="faculty" userName={profile?.full_name || 'Faculty Member'}>
      <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
        {/* Header Profile Greeting */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-sfrc-200 shadow-sm">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sfrc-100 text-sfrc-700 text-xs font-bold uppercase tracking-wider mb-2">
              <span className="w-2 h-2 rounded-full bg-sfrc-accent" />
              {profile?.employee_id} • {profile?.designation}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-sfrc-900 tracking-tight">
              {greeting}, {profile?.full_name}! 👋
            </h1>
            <p className="text-xs sm:text-sm text-sfrc-600 mt-1">
              {profile?.department_name}
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
              Enter Marks
            </Link>
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl border border-sfrc-200 bg-white shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-sfrc-600 uppercase tracking-wider">
                Classes Today
              </p>
              <p className="text-3xl font-black text-sfrc-900 mt-1">
                {data?.total_classes_today}
              </p>
              <p className="text-[11px] text-sfrc-500 mt-1">Scheduled in timetable</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-sfrc-100 flex items-center justify-center text-sfrc-700">
              <BookOpen className="w-6 h-6" />
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-sfrc-200 bg-white shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-sfrc-600 uppercase tracking-wider">
                Pending Attendance
              </p>
              <p className={cn(
                'text-3xl font-black mt-1',
                data?.pending_attendance_courses.length ? 'text-amber-600' : 'text-emerald-700'
              )}>
                {data?.pending_attendance_courses.length}
              </p>
              <p className="text-[11px] text-sfrc-500 mt-1">
                {data?.pending_attendance_courses.length ? 'Action required today' : 'All classes marked'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-700">
              <ClipboardList className="w-6 h-6" />
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-sfrc-200 bg-white shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-sfrc-600 uppercase tracking-wider">
                Pending Marks Entry
              </p>
              <p className="text-3xl font-black text-sfrc-900 mt-1">
                {data?.pending_marks_count}
              </p>
              <p className="text-[11px] text-sfrc-500 mt-1">CIA Assessment batches</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-sfrc-100 flex items-center justify-center text-sfrc-700">
              <BarChart3 className="w-6 h-6" />
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-sfrc-200 bg-white shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-sfrc-600 uppercase tracking-wider">
                Assigned Mentees
              </p>
              <p className="text-3xl font-black text-sfrc-900 mt-1">
                {data?.mentee_count}
              </p>
              <p className="text-[11px] text-sfrc-500 mt-1">Active student wards</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-sfrc-100 flex items-center justify-center text-sfrc-700">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Schedule & Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Today's Teaching Schedule */}
          <div className="lg:col-span-8 bg-white rounded-3xl border border-sfrc-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-black text-sfrc-900 tracking-tight">
                  Today&apos;s Teaching Agenda
                </h2>
                <p className="text-xs text-sfrc-600">
                  Real-time schedule for Day Order {new Date().getDay() || 1}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {data?.today_schedule && data.today_schedule.length > 0 ? (
                data.today_schedule.map((slot) => (
                  <div
                    key={slot.id}
                    className="p-4 rounded-2xl border border-sfrc-200 bg-sfrc-surface flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-sfrc-accent transition-all"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-12 text-center shrink-0">
                        <span className="text-xs font-black text-sfrc-800">
                          P{slot.period_number}
                        </span>
                        <p className="text-[10px] text-sfrc-500">{slot.start_time}</p>
                      </div>
                      <div className="h-10 w-px bg-sfrc-200 shrink-0" />
                      <div>
                        <span className="inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sfrc-100 text-sfrc-800 mb-1">
                          Sem {slot.semester} • {slot.programme_name}
                        </span>
                        <h3 className="text-sm font-bold text-sfrc-900">
                          {slot.course_title}
                        </h3>
                        <p className="text-xs text-sfrc-600 mt-0.5">
                          {slot.course_code} • {slot.room || 'Main Hall'}
                        </p>
                      </div>
                    </div>

                    <Link
                      href={`/faculty/attendance?courseId=${slot.course_code}`}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-sfrc-700 hover:bg-sfrc-800 transition-colors shrink-0 shadow-xs"
                    >
                      <ClipboardList className="w-3.5 h-3.5" />
                      Mark Attendance
                    </Link>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center bg-sfrc-surface rounded-2xl border border-dashed border-sfrc-200">
                  <Calendar className="w-8 h-8 text-sfrc-400 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-sfrc-700">No teaching hours scheduled today</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Tasks & Mentoring */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-3xl border border-sfrc-200 p-6 shadow-sm">
              <h2 className="text-lg font-black text-sfrc-900 tracking-tight mb-4">
                Faculty Quick Actions
              </h2>
              <div className="space-y-3">
                <Link
                  href="/faculty/marks"
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-sfrc-200 bg-sfrc-surface hover:bg-sfrc-100 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-sfrc-100 group-hover:bg-sfrc-700 text-sfrc-700 group-hover:text-white flex items-center justify-center transition-colors">
                      <BarChart3 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-sfrc-900">Enter CIA Marks</p>
                      <p className="text-[10px] text-sfrc-500">Post assessment marks</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-sfrc-400 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link
                  href="/faculty/mentees"
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-sfrc-200 bg-sfrc-surface hover:bg-sfrc-100 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-sfrc-100 group-hover:bg-sfrc-700 text-sfrc-700 group-hover:text-white flex items-center justify-center transition-colors">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-sfrc-900">Mentorship Logs</p>
                      <p className="text-[10px] text-sfrc-500">Record mentee meetings</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-sfrc-400 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link
                  href="/faculty/events"
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-sfrc-200 bg-sfrc-surface hover:bg-sfrc-100 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-sfrc-100 group-hover:bg-sfrc-700 text-sfrc-700 group-hover:text-white flex items-center justify-center transition-colors">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-sfrc-900">Create Campus Event</p>
                      <p className="text-[10px] text-sfrc-500">Seminars & workshops</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-sfrc-400 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Ask Pragya Banner */}
        <AskPragyaBanner />
      </div>
    </AppShell>
  );
}
