'use client';

import { useState, useEffect, useMemo } from 'react';

import { ClipboardList, BarChart3, Calendar, BookOpen, AlertTriangle, CheckCircle2, XCircle, Clock, GraduationCap } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import AskPragyaBanner from '@/components/shared/AskPragyaBanner';
import { createClient } from '@/lib/supabase/client';
import { apiGet } from '@/lib/api-client';
import { cn } from '@/lib/utils';

// Types
interface CourseAttendance {
  course_id: string;
  course_code: string;
  course_title: string;
  classes_held: number;
  classes_attended: number;
  percentage: number;
  status: 'good' | 'risk' | 'danger';
  shortage_needed: number;
}

interface AttendanceData {
  overall_percentage: number;
  total_held: number;
  total_attended: number;
  overall_status: string;
  courses: CourseAttendance[];
  shortage_alerts: string[];
  recent_logs: Array<{ date: string; session: string; status: string; course_code: string }>;
}

interface CourseMark {
  course_id: string;
  course_code: string;
  course_title: string;
  cia1?: number;
  cia2?: number;
  cia3?: number;
  assignment?: number;
  model?: number;
  total?: number;
  grade?: string;
}

interface MarksData {
  current_cgpa: number;
  selected_semester: number;
  semester_gpas: Array<{ semester: number; gpa: number }>;
  course_marks: CourseMark[];
}

interface TimetableSlot {
  id: string;
  day_of_week: number; // 1=Mon ... 6=Sat
  period_number: number; // 1-8
  start_time: string;
  end_time: string;
  room?: string;
  course_code: string;
  course_title: string;
  faculty_name?: string;
}

interface TimetableData {
  academic_year: string;
  semester: number;
  programme_name?: string;
  slots: TimetableSlot[];
}

interface AssignmentItem {
  id: string;
  title: string;
  description?: string;
  course_code: string;
  course_title: string;
  faculty_name?: string;
  due_date?: string;
  max_marks: number;
  status: 'pending' | 'submitted' | 'graded';
  marks_obtained?: number;
  is_overdue: boolean;
}

interface ExamScheduleItem {
  id: string;
  date: string;
  day_name: string;
  session: string;
  time_slot: string;
  course_code: string;
  course_title: string;
  venue: string;
  attendance_pct: number;
  is_eligible: boolean;
  ineligibility_reason?: string;
}

const TABS = [
  { id: 'attendance', label: 'Attendance', icon: ClipboardList },
  { id: 'marks', label: 'CIA Marks', icon: BarChart3 },
  { id: 'timetable', label: 'Timetable', icon: Calendar },
  { id: 'assignments', label: 'Assignments', icon: BookOpen },
  { id: 'exams', label: 'Examinations', icon: GraduationCap },
];

export default function StudentAcademicsPage() {
  const [activeTab, setActiveTab] = useState('attendance');
  const [attendance, setAttendance] = useState<AttendanceData | null>(null);
  const [marks, setMarks] = useState<MarksData | null>(null);
  const [timetable, setTimetable] = useState<TimetableData | null>(null);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [exams, setExams] = useState<ExamScheduleItem[]>([]);
  const [assignmentFilter, setAssignmentFilter] = useState<string>('all');
    const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const [attRes, marksRes, ttRes, assignRes, examsRes] = await Promise.allSettled([
          apiGet<AttendanceData>('/api/v1/students/me/attendance', token),
          apiGet<MarksData>('/api/v1/students/me/marks', token),
          apiGet<TimetableData>('/api/v1/students/me/timetable', token),
          apiGet<AssignmentItem[]>('/api/v1/students/me/assignments', token),
          apiGet<ExamScheduleItem[]>('/api/v1/students/me/exam-schedule', token),
        ]);

        if (!ignore) {
          if (attRes.status === 'fulfilled') setAttendance(attRes.value);
          if (marksRes.status === 'fulfilled') setMarks(marksRes.value);
          if (ttRes.status === 'fulfilled') setTimetable(ttRes.value);
          if (assignRes.status === 'fulfilled') setAssignments(assignRes.value);
          if (examsRes.status === 'fulfilled') setExams(examsRes.value);
        }
      } catch (err) {
        console.error('Error fetching student academics data:', err);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [supabase]);

  // Fallbacks if backend initial data is empty during development
  const displayAttendance = attendance || {
    overall_percentage: 88.5,
    total_held: 180,
    total_attended: 160,
    overall_status: 'good',
    courses: [
      { course_id: '1', course_code: '22UCSC61', course_title: 'Cloud Architecture & DevOps', classes_held: 36, classes_attended: 34, percentage: 94.4, status: 'good', shortage_needed: 0 },
      { course_id: '2', course_code: '22UCSC62', course_title: 'Web Application Development', classes_held: 36, classes_attended: 31, percentage: 86.1, status: 'good', shortage_needed: 0 },
      { course_id: '3', course_code: '22UCSE63', course_title: 'Machine Learning Fundamentals', classes_held: 36, classes_attended: 23, percentage: 63.8, status: 'danger', shortage_needed: 16 },
      { course_id: '4', course_code: '22UCSC64', course_title: 'Network Security & Cryptography', classes_held: 36, classes_attended: 26, percentage: 72.2, status: 'risk', shortage_needed: 4 },
      { course_id: '5', course_code: '22UVEC61', course_title: 'Professional Ethics & Human Values', classes_held: 36, classes_attended: 36, percentage: 100.0, status: 'good', shortage_needed: 0 },
    ],
    shortage_alerts: [
      'Need 16 more consecutive classes in 22UCSE63 to reach 75% (currently 63.8%)',
      'Need 4 more consecutive classes in 22UCSC64 to reach 75% (currently 72.2%)',
    ],
    recent_logs: [],
  };

  const displayMarks = marks || {
    current_cgpa: 8.65,
    selected_semester: 6,
    semester_gpas: [
      { semester: 1, gpa: 8.2 },
      { semester: 2, gpa: 8.45 },
      { semester: 3, gpa: 8.6 },
      { semester: 4, gpa: 8.7 },
      { semester: 5, gpa: 8.82 },
    ],
    course_marks: [
      { course_id: '1', course_code: '22UCSC61', course_title: 'Cloud Architecture & DevOps', cia1: 23, cia2: 24, cia3: 22, assignment: 10, model: 88, total: 34, grade: 'O' },
      { course_id: '2', course_code: '22UCSC62', course_title: 'Web Application Development', cia1: 21, cia2: 23, cia3: 20, assignment: 9.5, model: 82, total: 31.5, grade: 'A+' },
      { course_id: '3', course_code: '22UCSE63', course_title: 'Machine Learning Fundamentals', cia1: 24, cia2: 25, cia3: 23, assignment: 10, model: 92, total: 34.5, grade: 'O' },
      { course_id: '4', course_code: '22UCSC64', course_title: 'Network Security & Cryptography', cia1: 19, cia2: 21, cia3: 22, assignment: 9, model: 78, total: 30.5, grade: 'A+' },
      { course_id: '5', course_code: '22UVEC61', course_title: 'Professional Ethics & Values', cia1: 25, cia2: 25, cia3: 24, assignment: 10, model: 96, total: 35, grade: 'O' },
    ],
  };

  const displayTimetable = timetable || {
    academic_year: '2026-2027',
    semester: 6,
    programme_name: 'B.Sc Computer Science',
    slots: [
      { id: '1', day_of_week: 1, period_number: 1, start_time: '09:00 AM', end_time: '10:00 AM', room: 'Lab 3', course_code: '22UCSC61', course_title: 'Cloud Architecture', faculty_name: 'Dr. K. Anitha' },
      { id: '2', day_of_week: 1, period_number: 2, start_time: '10:00 AM', end_time: '11:00 AM', room: 'LH 104', course_code: '22UCSC62', course_title: 'Web App Dev', faculty_name: 'Dr. M. Lakshmi' },
      { id: '3', day_of_week: 1, period_number: 3, start_time: '11:15 AM', end_time: '12:15 PM', room: 'Smart 2', course_code: '22UCSE63', course_title: 'Machine Learning', faculty_name: 'Prof. R. Priya' },
      { id: '4', day_of_week: 2, period_number: 1, start_time: '09:00 AM', end_time: '10:00 AM', room: 'LH 104', course_code: '22UCSC64', course_title: 'Net Security', faculty_name: 'Dr. S. Meena' },
      { id: '5', day_of_week: 2, period_number: 2, start_time: '10:00 AM', end_time: '11:00 AM', room: 'Lab 3', course_code: '22UCSC61', course_title: 'Cloud Architecture', faculty_name: 'Dr. K. Anitha' },
      { id: '6', day_of_week: 3, period_number: 1, start_time: '09:00 AM', end_time: '10:00 AM', room: 'Smart 2', course_code: '22UCSE63', course_title: 'Machine Learning', faculty_name: 'Prof. R. Priya' },
    ],
  };

  const displayAssignments = assignments.length > 0 ? assignments : [
    { id: 'a1', title: 'Kubernetes Container Orchestration Lab', course_code: '22UCSC61', course_title: 'Cloud Architecture & DevOps', faculty_name: 'Dr. K. Anitha', due_date: '2026-10-05T23:59:00', max_marks: 15, status: 'pending', is_overdue: false },
    { id: 'a2', title: 'Next.js 16 Full Stack Authentication Project', course_code: '22UCSC62', course_title: 'Web Application Development', faculty_name: 'Dr. M. Lakshmi', due_date: '2026-09-28T23:59:00', max_marks: 15, status: 'pending', is_overdue: true },
    { id: 'a3', title: 'Gradient Descent Implementation in Python', course_code: '22UCSE63', course_title: 'Machine Learning Fundamentals', faculty_name: 'Prof. R. Priya', due_date: '2026-09-20T23:59:00', max_marks: 15, status: 'graded', marks_obtained: 14.5, is_overdue: false },
  ];

  const displayExams = exams.length > 0 ? exams : [
    { id: 'e1', date: '2026-11-10', day_name: 'Tuesday', session: 'FN', time_slot: '10:00 AM - 01:00 PM', course_code: '22UCSC61', course_title: 'Cloud Architecture & DevOps', venue: 'Hall 102 (MCA Block)', attendance_pct: 94.4, is_eligible: true },
    { id: 'e2', date: '2026-11-12', day_name: 'Thursday', session: 'FN', time_slot: '10:00 AM - 01:00 PM', course_code: '22UCSC62', course_title: 'Web Application Development', venue: 'Hall 104 (MCA Block)', attendance_pct: 86.1, is_eligible: true },
    { id: 'e3', date: '2026-11-14', day_name: 'Saturday', session: 'FN', time_slot: '10:00 AM - 01:00 PM', course_code: '22UCSE63', course_title: 'Machine Learning Fundamentals', venue: 'Hall 108 (Science Block)', attendance_pct: 63.8, is_eligible: false, ineligibility_reason: 'Attendance is 63.8% (Minimum 75% required by Autonomous Regulations)' },
    { id: 'e4', date: '2026-11-17', day_name: 'Tuesday', session: 'FN', time_slot: '10:00 AM - 01:00 PM', course_code: '22UCSC64', course_title: 'Network Security & Cryptography', venue: 'Hall 110 (Science Block)', attendance_pct: 72.2, is_eligible: false, ineligibility_reason: 'Attendance is 72.2% (Minimum 75% required)' },
    { id: 'e5', date: '2026-11-19', day_name: 'Thursday', session: 'AN', time_slot: '02:00 PM - 05:00 PM', course_code: '22UVEC61', course_title: 'Professional Ethics & Human Values', venue: 'Auditorium Hall A', attendance_pct: 100.0, is_eligible: true },
  ];

  const filteredAssignments = displayAssignments.filter((a) => {
    if (assignmentFilter === 'all') return true;
    return a.status === assignmentFilter;
  });

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const periods = [1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="bg-white p-6 rounded-3xl border border-sfrc-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sfrc-100 text-sfrc-700 text-xs font-bold uppercase tracking-wider mb-2">
              <GraduationCap className="w-3.5 h-3.5" />
              Academic Hub • Semester {displayMarks.selected_semester}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-sfrc-900 tracking-tight">
              Academics & Examination Center
            </h1>
            <p className="text-xs sm:text-sm text-sfrc-600 mt-1">
              Live tracking of subject attendance, CIA assessment marks, weekly timetable, and End Semester Examination hall ticket eligibility.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-sfrc-100/70 p-1.5 rounded-2xl border border-sfrc-200 overflow-x-auto no-scrollbar shadow-inner">
          <div className="flex gap-1 min-w-max">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap',
                    isActive
                      ? 'bg-sfrc-700 text-white shadow-sm scale-[1.01]'
                      : 'text-sfrc-700 hover:text-sfrc-900 hover:bg-white/60'
                  )}
                >
                  <Icon className={cn('w-4 h-4', isActive ? 'text-sfrc-gold' : 'text-sfrc-600')} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── TAB 1: ATTENDANCE ──────────────────────────────────────────────── */}
        {activeTab === 'attendance' && (
          <div className="space-y-8">
            {/* Shortage Alerts Banner */}
            {displayAttendance.shortage_alerts.length > 0 && (
              <div className="bg-amber-50 border border-amber-300 rounded-3xl p-5 shadow-sm space-y-2">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>Attendance Shortage Warning (&lt; 75% Requirement)</span>
                </div>
                <div className="space-y-1.5 pl-7">
                  {displayAttendance.shortage_alerts.map((alert, idx) => (
                    <p key={idx} className="text-xs text-amber-800 font-medium">
                      • {alert}
                    </p>
                  ))}
                </div>
                <p className="text-[11px] text-amber-700 pl-7 pt-1 font-semibold">
                  Rule Note: SFRC Autonomous Regulations require a minimum of 75% (68 of 90 working days) to appear for End Semester Examinations.
                </p>
              </div>
            )}

            {/* Overall Percentage Card */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-4 bg-white rounded-3xl border border-sfrc-200 p-6 shadow-sm flex flex-col items-center justify-center text-center">
                <p className="text-xs font-bold text-sfrc-600 uppercase tracking-wider mb-3">
                  Overall Semester Attendance
                </p>

                {/* Circular SVG Ring */}
                <div className="relative w-36 h-36 flex items-center justify-center my-2">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      className="text-sfrc-100 stroke-current"
                      strokeWidth="10"
                      fill="transparent"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      className={cn(
                        'stroke-current transition-all duration-1000',
                        displayAttendance.overall_percentage >= 75 ? 'text-sfrc-700' : 'text-red-500'
                      )}
                      strokeWidth="10"
                      strokeDasharray="251.2"
                      strokeDashoffset={251.2 - (251.2 * displayAttendance.overall_percentage) / 100}
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-2xl font-black text-sfrc-900">
                      {displayAttendance.overall_percentage}%
                    </span>
                    <span className="text-[10px] font-bold text-sfrc-500 uppercase">
                      Calculated
                    </span>
                  </div>
                </div>

                <span className={cn(
                  'mt-3 px-3 py-1 rounded-full text-xs font-bold',
                  displayAttendance.overall_percentage >= 75
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-red-50 text-red-600 border border-red-200'
                )}>
                  {displayAttendance.overall_percentage >= 75 ? 'Good Standing' : 'Condonation / Danger'}
                </span>
                <p className="text-[11px] text-sfrc-500 mt-2">
                  Attended {displayAttendance.total_attended} of {displayAttendance.total_held} recorded periods
                </p>
              </div>

              {/* Course-Wise Table */}
              <div className="md:col-span-8 bg-white rounded-3xl border border-sfrc-200 p-6 shadow-sm overflow-hidden">
                <h2 className="text-lg font-black text-sfrc-900 tracking-tight mb-4">
                  Course-Wise Attendance Roster
                </h2>
                <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-sfrc-200 text-sfrc-600 font-bold uppercase tracking-wider text-[10px]">
                        <th className="pb-3">Code</th>
                        <th className="pb-3">Subject Title</th>
                        <th className="pb-3 text-center">Held</th>
                        <th className="pb-3 text-center">Attended</th>
                        <th className="pb-3 text-center">Percentage</th>
                        <th className="pb-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sfrc-100">
                      {displayAttendance.courses.map((c) => (
                        <tr key={c.course_id} className="hover:bg-sfrc-surface transition-colors">
                          <td className="py-3.5 font-bold text-sfrc-800">{c.course_code}</td>
                          <td className="py-3.5 font-semibold text-sfrc-900 max-w-[200px] truncate">
                            {c.course_title}
                          </td>
                          <td className="py-3.5 text-center text-sfrc-600">{c.classes_held}</td>
                          <td className="py-3.5 text-center font-bold text-sfrc-900">{c.classes_attended}</td>
                          <td className="py-3.5 text-center font-black">
                            <span className={cn(
                              c.percentage >= 75 ? 'text-emerald-700' : (c.percentage >= 65 ? 'text-amber-600' : 'text-red-600')
                            )}>
                              {c.percentage}%
                            </span>
                          </td>
                          <td className="py-3.5 text-right">
                            <span className={cn(
                              'px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider',
                              c.status === 'good'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : (c.status === 'risk' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-red-50 text-red-600 border border-red-200')
                            )}>
                              {c.status === 'good' ? 'Eligible' : (c.status === 'risk' ? 'At Risk' : 'Shortage')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: MARKS ──────────────────────────────────────────────────── */}
        {activeTab === 'marks' && (
          <div className="space-y-8">
            {/* CGPA Header + Semester Chart */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-4 bg-white rounded-3xl border border-sfrc-200 p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-sfrc-600 uppercase tracking-wider">
                    Cumulative Grade Point Average
                  </span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-4xl font-black text-sfrc-900">
                      {displayMarks.current_cgpa}
                    </span>
                    <span className="text-sm font-bold text-sfrc-500">/ 10.0</span>
                  </div>
                  <p className="text-xs text-emerald-700 font-bold mt-1">
                    First Class with Distinction (Exemplary)
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-sfrc-200">
                  <p className="text-xs text-sfrc-600">
                    Grading Scale: <span className="font-bold">10-Point Relative Scale (UGC / NAAC Guidelines)</span>
                  </p>
                </div>
              </div>

              {/* Semester GPA Trend Chart */}
              <div className="md:col-span-8 bg-white rounded-3xl border border-sfrc-200 p-6 shadow-sm">
                <h2 className="text-sm font-bold text-sfrc-900 tracking-tight mb-4">
                  Semester-Wise GPA Progression
                </h2>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={displayMarks.semester_gpas} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8C88A" opacity={0.3} />
                      <XAxis dataKey="semester" tickFormatter={(v) => `Sem ${v}`} tick={{ fontSize: 11, fill: '#5E3012' }} />
                      <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: '#5E3012' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#FBF5EB',
                          borderColor: '#D4A052',
                          borderRadius: '12px',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="gpa" fill="#7B4019" radius={[6, 6, 0, 0]} maxBarSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Continuous Internal Assessment (CIA) Marks Table */}
            <div className="bg-white rounded-3xl border border-sfrc-200 p-6 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-black text-sfrc-900 tracking-tight">
                    Continuous Internal Assessment (CIA) Summary
                  </h2>
                  <p className="text-xs text-sfrc-600">
                    Calculated: Best 2 of CIA 1, CIA 2, CIA 3 (out of 25) + Assignment (10) = Total (35)
                  </p>
                </div>
                <span className="text-xs font-bold text-sfrc-700 bg-sfrc-100 px-3 py-1 rounded-full">
                  Semester {displayMarks.selected_semester}
                </span>
              </div>

              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-sfrc-200 text-sfrc-600 font-bold uppercase tracking-wider text-[10px]">
                      <th className="pb-3">Code</th>
                      <th className="pb-3">Subject Title</th>
                      <th className="pb-3 text-center">CIA 1 (25)</th>
                      <th className="pb-3 text-center">CIA 2 (25)</th>
                      <th className="pb-3 text-center">CIA 3 (25)</th>
                      <th className="pb-3 text-center">Assign (10)</th>
                      <th className="pb-3 text-center">Model (100)</th>
                      <th className="pb-3 text-center">Internal (35)</th>
                      <th className="pb-3 text-right">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sfrc-100">
                    {displayMarks.course_marks.map((m) => (
                      <tr key={m.course_id} className="hover:bg-sfrc-surface transition-colors">
                        <td className="py-3.5 font-bold text-sfrc-800">{m.course_code}</td>
                        <td className="py-3.5 font-semibold text-sfrc-900 max-w-[200px] truncate">
                          {m.course_title}
                        </td>
                        <td className="py-3.5 text-center">{m.cia1 ?? '—'}</td>
                        <td className="py-3.5 text-center">{m.cia2 ?? '—'}</td>
                        <td className="py-3.5 text-center">{m.cia3 ?? '—'}</td>
                        <td className="py-3.5 text-center font-medium">{m.assignment ?? '—'}</td>
                        <td className="py-3.5 text-center text-sfrc-600">{m.model ?? '—'}</td>
                        <td className="py-3.5 text-center font-black text-sfrc-900">{m.total ?? '—'}</td>
                        <td className="py-3.5 text-right font-bold text-emerald-700">{m.grade || 'A+'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: TIMETABLE ──────────────────────────────────────────────── */}
        {activeTab === 'timetable' && (
          <div className="bg-white rounded-3xl border border-sfrc-200 p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-sfrc-900 tracking-tight">
                  Weekly Class Timetable (6-Day Order)
                </h2>
                <p className="text-xs text-sfrc-600">
                  {displayTimetable.programme_name} • Semester {displayTimetable.semester} • Academic Year {displayTimetable.academic_year}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-3 h-3 rounded-md bg-sfrc-700" /> Theory
                <span className="w-3 h-3 rounded-md bg-sfrc-gold ml-2" /> Laboratory
              </div>
            </div>

            {/* Weekly Grid (overflow-x-auto for smooth horizontal mobile scrolling) */}
            <div className="overflow-x-auto no-scrollbar pb-2">
              <div className="min-w-[760px] grid grid-cols-7 gap-2">
                {/* Header Row */}
                <div className="p-2.5 rounded-xl bg-sfrc-100 text-center text-xs font-bold text-sfrc-800">
                  Day / Period
                </div>
                {periods.map((p) => (
                  <div key={p} className="p-2.5 rounded-xl bg-sfrc-100 text-center text-xs font-bold text-sfrc-800">
                    P{p}
                  </div>
                ))}

                {/* Day Rows */}
                {days.map((dayLabel, dayIdx) => {
                  const dayNum = dayIdx + 1;
                  const isToday = new Date().getDay() === dayNum;
                  return (
                    <div key={dayLabel} className="contents">
                      <div className={cn(
                        'p-3 rounded-xl flex items-center justify-center text-xs font-black',
                        isToday ? 'bg-sfrc-700 text-white shadow-xs' : 'bg-sfrc-surface text-sfrc-900'
                      )}>
                        {dayLabel} {isToday && '•'}
                      </div>
                      {periods.map((periodNum) => {
                        const slot = displayTimetable.slots.find(
                          (s) => s.day_of_week === dayNum && s.period_number === periodNum
                        );
                        return (
                          <div
                            key={periodNum}
                            className={cn(
                              'p-2.5 rounded-xl border text-xs flex flex-col justify-between min-h-[72px] transition-all',
                              slot
                                ? 'bg-white border-sfrc-200 hover:border-sfrc-accent shadow-2xs'
                                : 'bg-sfrc-bg/40 border-dashed border-sfrc-200 text-sfrc-400'
                            )}
                          >
                            {slot ? (
                              <>
                                <p className="font-bold text-sfrc-900 truncate text-[11px]">
                                  {slot.course_code}
                                </p>
                                <p className="text-[10px] text-sfrc-600 truncate">
                                  {slot.faculty_name}
                                </p>
                                <span className="text-[9px] text-sfrc-500 mt-auto font-medium">
                                  {slot.room || 'LH 104'}
                                </span>
                              </>
                            ) : (
                              <span className="m-auto text-[10px] opacity-40">—</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 4: ASSIGNMENTS ────────────────────────────────────────────── */}
        {activeTab === 'assignments' && (
          <div className="space-y-6">
            {/* Filter Tabs */}
            <div className="flex items-center gap-2">
              {['all', 'pending', 'submitted', 'graded'].map((f) => (
                <button
                  key={f}
                  onClick={() => setAssignmentFilter(f)}
                  className={cn(
                    'px-4 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer',
                    assignmentFilter === f
                      ? 'bg-sfrc-700 text-white shadow-xs'
                      : 'bg-white border border-sfrc-200 text-sfrc-700 hover:bg-sfrc-100'
                  )}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Assignments List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAssignments.map((assign) => (
                <div
                  key={assign.id}
                  className={cn(
                    'p-5 rounded-3xl bg-white border transition-all shadow-sm flex flex-col justify-between gap-4',
                    assign.is_overdue
                      ? 'border-red-400 ring-1 ring-red-400'
                      : 'border-sfrc-200 hover:border-sfrc-accent'
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-sfrc-100 text-sfrc-800">
                        {assign.course_code}
                      </span>
                      {assign.is_overdue ? (
                        <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-md">
                          OVERDUE
                        </span>
                      ) : (
                        <span className={cn(
                          'text-[10px] font-bold capitalize px-2.5 py-0.5 rounded-md',
                          assign.status === 'graded' ? 'bg-emerald-50 text-emerald-700' : 'bg-sfrc-100 text-sfrc-700'
                        )}>
                          {assign.status}
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-sfrc-900 mb-1">
                      {assign.title}
                    </h3>
                    <p className="text-xs text-sfrc-600 line-clamp-2">
                      {assign.course_title} • {assign.faculty_name}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-sfrc-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-sfrc-500">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Due: {assign.due_date ? new Date(assign.due_date).toLocaleDateString() : 'Next Week'}</span>
                    </div>

                    <div className="font-bold text-sfrc-800">
                      {assign.marks_obtained !== undefined && assign.marks_obtained !== null ? (
                        <span className="text-emerald-700 font-black">Score: {assign.marks_obtained}/{assign.max_marks}</span>
                      ) : (
                        <span>Max: {assign.max_marks} pts</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 5: EXAMINATIONS & HALL TICKET ─────────────────────────────── */}
        {activeTab === 'exams' && (
          <div className="bg-white rounded-3xl border border-sfrc-200 p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-sfrc-900 tracking-tight">
                  End Semester Examination (ESE) Timetable & Eligibility
                </h2>
                <p className="text-xs text-sfrc-600">
                  Hall tickets are automatically validated against the 75% attendance threshold.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-sfrc-200 text-sfrc-600 font-bold uppercase tracking-wider text-[10px]">
                    <th className="pb-3">Date & Day</th>
                    <th className="pb-3 text-center">Session</th>
                    <th className="pb-3">Course Code & Subject</th>
                    <th className="pb-3">Examination Venue</th>
                    <th className="pb-3 text-center">Attendance</th>
                    <th className="pb-3 text-right">Hall Ticket Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sfrc-100">
                  {displayExams.map((ex) => (
                    <tr key={ex.id} className="hover:bg-sfrc-surface transition-colors">
                      <td className="py-4">
                        <p className="font-bold text-sfrc-900">{ex.date}</p>
                        <p className="text-[11px] text-sfrc-500">{ex.day_name}</p>
                      </td>
                      <td className="py-4 text-center">
                        <span className="px-2 py-0.5 rounded-md bg-sfrc-100 text-sfrc-800 font-bold text-[10px]">
                          {ex.session}
                        </span>
                        <p className="text-[9px] text-sfrc-500 mt-0.5">{ex.time_slot}</p>
                      </td>
                      <td className="py-4">
                        <p className="font-bold text-sfrc-800">{ex.course_code}</p>
                        <p className="text-xs text-sfrc-900 font-medium">{ex.course_title}</p>
                      </td>
                      <td className="py-4 text-sfrc-600 font-medium">{ex.venue}</td>
                      <td className="py-4 text-center">
                        <span className={cn(
                          'font-bold',
                          ex.attendance_pct >= 75 ? 'text-emerald-700' : 'text-red-600'
                        )}>
                          {ex.attendance_pct}%
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        {ex.is_eligible ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Eligible
                          </span>
                        ) : (
                          <div className="inline-flex flex-col items-end">
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold bg-red-50 text-red-600 border border-red-200">
                              <XCircle className="w-3.5 h-3.5" /> Ineligible
                            </span>
                            <span className="text-[10px] text-red-500 mt-0.5 max-w-[180px] text-right truncate">
                              {ex.ineligibility_reason || 'Below 75% attendance'}
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Bottom Section: Ask Pragya Banner */}
        <AskPragyaBanner />
      </div>
  );
}
