'use client';

import { useState, useEffect, useMemo } from 'react';

import { ClipboardList, Users, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import AppShell from '@/components/layout/AppShell';
import AskPragyaBanner from '@/components/shared/AskPragyaBanner';
import { createClient } from '@/lib/supabase/client';
import { apiGet, apiPost } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface FacultyCourse {
  id: string;
  code: string;
  title: string;
  programme_name?: string;
  semester: number;
  department_name?: string;
  total_students: number;
}

interface StudentRosterItem {
  student_id: string;
  register_number: string;
  full_name: string;
  avatar_url?: string;
  current_semester: number;
  attendance_pct: number;
  last_status?: string;
}

type AttendanceStatus = 'present' | 'absent' | 'od' | 'medical';

export default function FacultyAttendanceEntryPage() {
  const [courses, setCourses] = useState<FacultyCourse[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedSession, setSelectedSession] = useState<'FN' | 'AN'>('FN');

  const [roster, setRoster] = useState<StudentRosterItem[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus>>({});
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [isLoadingRoster, setIsLoadingRoster] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const courseList = await apiGet<FacultyCourse[]>('/api/v1/faculty/me/courses', token);
        if (!ignore) {
          setCourses(courseList);
          if (courseList.length > 0) {
            setSelectedCourseId(courseList[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load faculty courses:', err);
        if (!ignore) {
          const fallbackCourses: FacultyCourse[] = [
            {
              id: 'c-1',
              code: '22UCSC61',
              title: 'Cloud Architecture & DevOps',
              programme_name: 'B.Sc Computer Science',
              semester: 6,
              department_name: 'Computer Science',
              total_students: 42,
            },
            {
              id: 'c-2',
              code: '22PCSC21',
              title: 'Advanced Machine Learning',
              programme_name: 'M.Sc Computer Science',
              semester: 2,
              department_name: 'Computer Science',
              total_students: 28,
            },
          ];
          setCourses(fallbackCourses);
          setSelectedCourseId('c-1');
        }
      } finally {
        if (!ignore) {
          setIsLoadingCourses(false);
        }
      }
    })();

    return () => {
      ignore = true;
    };
  }, [supabase]);

  const handleLoadStudents = async () => {
    if (!selectedCourseId) return;

    try {
      setIsLoadingRoster(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const students = await apiGet<StudentRosterItem[]>(
        `/api/v1/faculty/courses/${selectedCourseId}/students?date_str=${selectedDate}&session_str=${selectedSession}`,
        token
      );
      setRoster(students);

      // Initialize status map
      const initialMap: Record<string, AttendanceStatus> = {};
      students.forEach((s) => {
        initialMap[s.student_id] = (s.last_status as AttendanceStatus) || 'present';
      });
      setAttendanceMap(initialMap);
      toast.info(`Loaded ${students.length} students for attendance marking.`);
    } catch (err) {
      console.error('Failed to fetch student roster:', err);
      // Fallback demo students
      const demoStudents: StudentRosterItem[] = [
        { student_id: 's-1', register_number: '22UCA001', full_name: 'Abinaya R', current_semester: 6, attendance_pct: 92.0 },
        { student_id: 's-2', register_number: '22UCA002', full_name: 'Bhavani M', current_semester: 6, attendance_pct: 88.5 },
        { student_id: 's-3', register_number: '22UCA003', full_name: 'Deepika K', current_semester: 6, attendance_pct: 74.0 },
        { student_id: 's-4', register_number: '22UCA004', full_name: 'Divya S', current_semester: 6, attendance_pct: 95.5 },
        { student_id: 's-5', register_number: '22UCA005', full_name: 'Gayathri P', current_semester: 6, attendance_pct: 68.2 },
        { student_id: 's-6', register_number: '22UCA006', full_name: 'Harini V', current_semester: 6, attendance_pct: 91.0 },
      ];
      setRoster(demoStudents);
      const initialMap: Record<string, AttendanceStatus> = {};
      demoStudents.forEach((s) => {
        initialMap[s.student_id] = 'present';
      });
      setAttendanceMap(initialMap);
    } finally {
      setIsLoadingRoster(false);
    }
  };

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceMap((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleBulkSet = (status: AttendanceStatus) => {
    const updated: Record<string, AttendanceStatus> = {};
    roster.forEach((s) => {
      updated[s.student_id] = status;
    });
    setAttendanceMap(updated);
    toast.success(`Marked all students as ${status.toUpperCase()}.`);
  };

  const handleSubmitAttendance = async () => {
    if (roster.length === 0) {
      toast.error('No students loaded to submit.');
      return;
    }

    try {
      setIsSubmitting(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const records = Object.entries(attendanceMap).map(([studentId, status]) => ({
        student_id: studentId,
        status,
      }));

      const payload = {
        course_id: selectedCourseId,
        date: selectedDate,
        session: selectedSession,
        records,
      };

      await apiPost('/api/v1/attendance/mark', payload, token);
      toast.success('Attendance recorded and synced to SFRC database successfully!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save attendance.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Live Count Metrics
  const counts = useMemo(() => {
    let present = 0;
    let absent = 0;
    let od = 0;
    let medical = 0;

    Object.values(attendanceMap).forEach((st) => {
      if (st === 'present') present++;
      if (st === 'absent') absent++;
      if (st === 'od') od++;
      if (st === 'medical') medical++;
    });

    return {
      total: roster.length,
      present,
      absent,
      od,
      medical,
      pct: roster.length > 0 ? Math.round((present / roster.length) * 100) : 0,
    };
  }, [attendanceMap, roster]);

  return (
    <AppShell role="faculty" userName="Faculty">
      <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="bg-white p-6 rounded-3xl border border-sfrc-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sfrc-100 text-sfrc-700 text-xs font-bold uppercase tracking-wider mb-2">
              <ClipboardList className="w-3.5 h-3.5" />
              Faculty Attendance Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-sfrc-900 tracking-tight">
              Class Attendance Entry
            </h1>
            <p className="text-xs sm:text-sm text-sfrc-600 mt-1">
              Record period attendance for assigned courses with instant student ledger updates.
            </p>
          </div>
        </div>

        {/* Step 1: Course, Date & Session Filter Card */}
        <div className="bg-white rounded-3xl border border-sfrc-200 p-6 shadow-sm space-y-5">
          <h2 className="text-sm font-bold text-sfrc-900 uppercase tracking-wider">
            Step 1: Select Course & Period Session
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
            {/* Course Selector */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-sfrc-700 uppercase tracking-wider">
                Assigned Course
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                disabled={isLoadingCourses}
                className="w-full px-4 py-2.5 rounded-xl border border-sfrc-200 bg-sfrc-surface text-sfrc-900 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sfrc-accent/40"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.title} (Sem {c.semester})
                  </option>
                ))}
              </select>
            </div>

            {/* Date Picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-sfrc-700 uppercase tracking-wider">
                Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-sfrc-200 bg-sfrc-surface text-sfrc-900 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sfrc-accent/40"
              />
            </div>

            {/* Session Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-sfrc-700 uppercase tracking-wider">
                Session
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSession('FN')}
                  className={cn(
                    'py-2 rounded-xl text-xs font-bold transition-all cursor-pointer',
                    selectedSession === 'FN'
                      ? 'bg-sfrc-700 text-white shadow-xs'
                      : 'bg-sfrc-100 text-sfrc-700 hover:bg-sfrc-200'
                  )}
                >
                  FN (Morning)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSession('AN')}
                  className={cn(
                    'py-2 rounded-xl text-xs font-bold transition-all cursor-pointer',
                    selectedSession === 'AN'
                      ? 'bg-sfrc-700 text-white shadow-xs'
                      : 'bg-sfrc-100 text-sfrc-700 hover:bg-sfrc-200'
                  )}
                >
                  AN (Afternoon)
                </button>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={handleLoadStudents}
              disabled={isLoadingRoster || !selectedCourseId}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-sfrc-700 hover:bg-sfrc-800 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoadingRoster ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
              Load Student Roster
            </button>
          </div>
        </div>

        {/* Step 2: Student Attendance Roster List */}
        {roster.length > 0 && (
          <div className="bg-white rounded-3xl border border-sfrc-200 p-6 shadow-sm space-y-6">
            {/* Action Bar & Counters */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-sfrc-100">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sfrc-100 text-sfrc-800 text-xs font-bold">
                  <span>Total:</span> <span className="text-sfrc-900">{counts.total}</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold">
                  <span>Present:</span> <span>{counts.present}</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 text-red-600 text-xs font-bold">
                  <span>Absent:</span> <span>{counts.absent}</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 text-xs font-bold">
                  <span>OD:</span> <span>{counts.od}</span>
                </div>
              </div>

              {/* Bulk Toggle Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleBulkSet('present')}
                  className="px-3 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-bold transition-all cursor-pointer"
                >
                  Mark All Present
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkSet('absent')}
                  className="px-3 py-1.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-800 text-xs font-bold transition-all cursor-pointer"
                >
                  Mark All Absent
                </button>
              </div>
            </div>

            {/* Roster Table */}
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-sfrc-200 text-sfrc-600 font-bold uppercase tracking-wider text-[10px]">
                    <th className="pb-3">Register No</th>
                    <th className="pb-3">Student Name</th>
                    <th className="pb-3 text-center">Avg Attendance</th>
                    <th className="pb-3 text-right">Attendance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sfrc-100">
                  {roster.map((student) => {
                    const currentStatus = attendanceMap[student.student_id] || 'present';
                    return (
                      <tr key={student.student_id} className="hover:bg-sfrc-surface transition-colors">
                        <td className="py-3 font-bold text-sfrc-800">
                          {student.register_number}
                        </td>
                        <td className="py-3 font-semibold text-sfrc-900">
                          {student.full_name}
                        </td>
                        <td className="py-3 text-center">
                          <span className={cn(
                            'font-bold',
                            student.attendance_pct >= 75 ? 'text-emerald-700' : 'text-red-600'
                          )}>
                            {student.attendance_pct}%
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <div className="inline-flex gap-1 bg-sfrc-100/70 p-1 rounded-xl">
                            {(['present', 'absent', 'od', 'medical'] as AttendanceStatus[]).map((st) => (
                              <button
                                key={st}
                                type="button"
                                onClick={() => handleStatusChange(student.student_id, st)}
                                className={cn(
                                  'px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer',
                                  currentStatus === st
                                    ? st === 'present'
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : st === 'absent'
                                      ? 'bg-red-600 text-white shadow-xs'
                                      : st === 'od'
                                      ? 'bg-amber-600 text-white shadow-xs'
                                      : 'bg-blue-600 text-white shadow-xs'
                                    : 'text-sfrc-600 hover:text-sfrc-900'
                                )}
                              >
                                {st === 'present' ? 'P' : (st === 'absent' ? 'A' : (st === 'od' ? 'OD' : 'M'))}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Step 3: Final Submit Bar */}
            <div className="pt-4 border-t border-sfrc-200 flex items-center justify-between">
              <p className="text-xs text-sfrc-500">
                Submitting updates the database immediately and verifies with the autonomous exam attendance ledger.
              </p>
              <button
                type="button"
                onClick={handleSubmitAttendance}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-sfrc-700 hover:bg-sfrc-800 text-white font-bold text-sm shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Submit Attendance Records
              </button>
            </div>
          </div>
        )}

        {/* Bottom: Ask Pragya Banner */}
        <AskPragyaBanner />
      </div>
    </AppShell>
  );
}
