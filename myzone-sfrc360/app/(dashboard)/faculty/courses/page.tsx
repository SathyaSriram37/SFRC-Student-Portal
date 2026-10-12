'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Users,
  GraduationCap,
  Calendar,
  ClipboardList,
  BarChart3,
  FileText,
  Search,
  Loader2,
  ChevronRight,
  Award,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import AppShell from '@/components/layout/AppShell';
import { createClient } from '@/lib/supabase/client';
import { apiGet } from '@/lib/api-client';

interface FacultyCourseItem {
  id: string;
  code: string;
  title: string;
  programme_name?: string;
  semester: number;
  department_name?: string;
  credits: number;
  total_students: number;
}

interface EnrolledStudentItem {
  student_id: string;
  register_number: string;
  full_name: string;
  avatar_url?: string;
  current_semester: number;
  attendance_pct: number;
  last_status?: string;
}

export default function FacultyCoursesPage() {
  const [userName, setUserName] = useState('Faculty');
  const [courses, setCourses] = useState<FacultyCourseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<FacultyCourseItem | null>(null);
  const [roster, setRoster] = useState<EnrolledStudentItem[]>([]);
  const [isLoadingRoster, setIsLoadingRoster] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setIsLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        const metaName = session?.user?.user_metadata?.full_name;
        if (!ignore && metaName) setUserName(metaName);

        const token = session?.access_token;
        const res = await apiGet<FacultyCourseItem[]>('/api/v1/faculty/me/courses', token);
        if (!ignore && res) {
          setCourses(res);
        }
      } catch (err: unknown) {
        console.error('Failed to load faculty courses:', err);
        const msg = err instanceof Error ? err.message : 'Failed to fetch assigned courses.';
        toast.error(msg);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [supabase]);

  const handleOpenRoster = async (course: FacultyCourseItem) => {
    setSelectedCourse(course);
    try {
      setIsLoadingRoster(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const students = await apiGet<EnrolledStudentItem[]>(
        `/api/v1/faculty/courses/${course.id}/students`,
        token
      );
      setRoster(students);
    } catch (err: unknown) {
      console.error('Failed to load roster:', err);
      const msg = err instanceof Error ? err.message : 'Failed to fetch enrolled students.';
      toast.error(msg);
      setRoster([]);
    } finally {
      setIsLoadingRoster(false);
    }
  };

  const filteredCourses = courses.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.code.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      (c.programme_name && c.programme_name.toLowerCase().includes(q))
    );
  });

  return (
    <AppShell role="faculty" userName={userName}>
      <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
        {/* Header Banner */}
        <div className="bg-white p-6 rounded-3xl border border-sfrc-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sfrc-100 text-sfrc-700 text-xs font-bold uppercase tracking-wider mb-2">
              <BookOpen className="w-3.5 h-3.5" />
              Academic Course Management
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-sfrc-900 tracking-tight">
              My Teaching Courses & Rosters
            </h1>
            <p className="text-xs sm:text-sm text-sfrc-600 mt-1">
              Active assigned courses, curriculum credits, syllabus tracking, and enrolled student cohorts.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-2xl bg-sfrc-50 border border-sfrc-200 text-xs font-medium text-sfrc-700">
              Total Courses: <strong className="text-sfrc-900 font-bold">{courses.length}</strong>
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-sfrc-200 shadow-sm">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-sfrc-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by code, title, or degree..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-sfrc-200 bg-sfrc-50 text-xs text-sfrc-900 focus:outline-none focus:ring-2 focus:ring-sfrc-500"
            />
          </div>
          <span className="text-xs text-sfrc-500">
            Showing {filteredCourses.length} of {courses.length} assigned courses
          </span>
        </div>

        {/* Courses Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20 bg-white rounded-3xl border border-sfrc-200">
            <Loader2 className="w-8 h-8 animate-spin text-sfrc-600" />
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="bg-white rounded-3xl border border-sfrc-200 p-12 text-center space-y-3">
            <BookOpen className="w-12 h-12 text-sfrc-300 mx-auto" />
            <h3 className="text-base font-bold text-sfrc-900">No Courses Found</h3>
            <p className="text-xs text-sfrc-500 max-w-md mx-auto">
              No teaching courses match your filter criteria or have been mapped to your faculty profile in the database.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-3xl border border-sfrc-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-5"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-sfrc-100 text-sfrc-800 font-mono text-xs font-bold">
                      {c.code}
                    </span>
                    <span className="text-xs font-semibold text-sfrc-500">
                      Semester {c.semester}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-sfrc-900 line-clamp-2">
                    {c.title}
                  </h3>
                  <p className="text-xs text-sfrc-600">
                    {c.programme_name || c.department_name}
                  </p>

                  <div className="flex items-center gap-4 pt-2 text-xs text-sfrc-500">
                    <div className="flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-sfrc-400" />
                      <span>{c.credits} Credits</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-sfrc-400" />
                      <span>{c.total_students} Enrolled</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-sfrc-100 space-y-2">
                  <button
                    onClick={() => handleOpenRoster(c)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-sfrc-50 hover:bg-sfrc-100 text-sfrc-800 text-xs font-bold transition-colors"
                  >
                    <Users className="w-3.5 h-3.5" />
                    View Student Roster
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href="/faculty/attendance"
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold transition-colors"
                    >
                      <ClipboardList className="w-3 h-3" />
                      Attendance
                    </Link>
                    <Link
                      href="/faculty/marks"
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold transition-colors"
                    >
                      <BarChart3 className="w-3 h-3" />
                      Enter Marks
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Roster Modal / Bottom Sheet */}
        {selectedCourse && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] shadow-2xl flex flex-col border border-sfrc-200 overflow-hidden">
              <div className="p-6 border-b border-sfrc-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono font-bold text-sfrc-600 bg-sfrc-100 px-2 py-0.5 rounded">
                    {selectedCourse.code}
                  </span>
                  <h3 className="text-lg font-bold text-sfrc-900 mt-1">
                    {selectedCourse.title} — Student Cohort
                  </h3>
                  <p className="text-xs text-sfrc-500">
                    Semester {selectedCourse.semester} • {selectedCourse.programme_name}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedCourse(null)}
                  className="w-8 h-8 rounded-full bg-sfrc-100 hover:bg-sfrc-200 flex items-center justify-center text-sfrc-700 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                {isLoadingRoster ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-sfrc-600" />
                  </div>
                ) : roster.length === 0 ? (
                  <div className="text-center py-10 text-sfrc-500 text-xs">
                    No enrolled students recorded for this course in the database.
                  </div>
                ) : (
                  <div className="divide-y divide-sfrc-100">
                    {roster.map((s, idx) => (
                      <div
                        key={s.student_id}
                        className="py-3 flex items-center justify-between gap-4 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 text-sfrc-400 font-mono text-center font-bold">
                            {idx + 1}
                          </span>
                          <div>
                            <span className="font-bold text-sfrc-900 block">
                              {s.full_name}
                            </span>
                            <span className="font-mono text-sfrc-500 text-[11px]">
                              {s.register_number}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-[11px]">
                            {s.attendance_pct}% Att.
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 bg-sfrc-50 border-t border-sfrc-100 flex justify-between items-center text-xs">
                <span className="text-sfrc-600 font-medium">
                  Total Enrolled: <strong>{roster.length} students</strong>
                </span>
                <button
                  onClick={() => setSelectedCourse(null)}
                  className="px-4 py-2 rounded-xl bg-sfrc-900 text-white font-bold text-xs"
                >
                  Close Roster
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
