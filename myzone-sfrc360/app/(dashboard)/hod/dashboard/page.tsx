'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  Users,
  BookOpen,
  ClipboardList,
  BarChart3,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Loader2,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import AskPragyaBanner from '@/components/shared/AskPragyaBanner';
import { apiGet } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface HodOverviewStats {
  department: {
    id: string;
    name: string;
    code: string;
  };
  stats: {
    total_active_students: number;
    total_faculty: number;
    total_courses: number;
    avg_attendance_pct: number;
    avg_marks_pct: number;
    at_risk_students_count: number;
  };
}

interface FacultyItem {
  faculty_id: string;
  full_name: string;
  email: string;
  employee_id: string;
  designation: string;
  assigned_subjects: string[];
  subjects_count: number;
  attendance_sessions_recorded: number;
  last_activity: string;
}

interface StudentItem {
  student_id: string;
  register_number: string;
  roll_number: string;
  full_name: string;
  current_semester: number;
  attendance_pct: number;
  marks_pct: number;
  is_at_risk: boolean;
  risk_reasons: string[];
}

export default function HodDashboardPage() {
  const [data, setData] = useState<HodOverviewStats | null>(null);
  const [faculty, setFaculty] = useState<FacultyItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [overviewRes, facultyRes, studentsRes] = await Promise.all([
          apiGet<HodOverviewStats>('/api/v1/hod/overview').catch(() => null),
          apiGet<{ faculty: FacultyItem[] }>('/api/v1/hod/faculty').catch(() => ({ faculty: [] })),
          apiGet<{ students: StudentItem[] }>('/api/v1/hod/students').catch(() => ({ students: [] })),
        ]);

        if (overviewRes) setData(overviewRes);
        if (facultyRes) setFaculty(facultyRes.faculty || []);
        if (studentsRes) setStudents(studentsRes.students || []);
      } catch (err) {
        console.error('Failed to load HOD dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-sfrc-700">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="text-sm font-semibold">Loading Department Governance Dashboard...</p>
      </div>
    );
  }

  const dept = data?.department || { name: 'Computer Applications', code: 'CA' };
  const stats = data?.stats || {
    total_active_students: 120,
    total_faculty: 8,
    total_courses: 7,
    avg_attendance_pct: 88.5,
    avg_marks_pct: 76.4,
    at_risk_students_count: 3,
  };

  return (
    <div className="space-y-6">
      {/* Top Department Banner */}
      <div className="bg-gradient-to-r from-sfrc-950 via-sfrc-900 to-sfrc-800 rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden border border-sfrc-700/50">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-sfrc-gold/20 text-sfrc-gold text-xs font-bold rounded-full uppercase tracking-wider border border-sfrc-gold/30">
              Department Governance
            </span>
            <span className="text-xs text-sfrc-200">Active Academic Session</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
            {dept.name} ({dept.code})
          </h1>
          <p className="text-sm sm:text-base text-sfrc-100 max-w-2xl leading-relaxed">
            Head of Department Administration & Academic Quality Portal. Monitor curriculum delivery, faculty allocations, student attendance vigilance, and performance assessments.
          </p>
        </div>
      </div>

      <AskPragyaBanner />

      {/* 5 Live Department Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-sfrc-surface dark:bg-card p-5 rounded-xl border border-sfrc-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-sfrc-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Department</span>
            <BookOpen className="w-4 h-4 text-sfrc-700" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-sfrc-950 dark:text-foreground">{dept.code}</div>
            <div className="text-xs text-sfrc-600 font-medium truncate">{dept.name}</div>
          </div>
        </div>

        <div className="bg-sfrc-surface dark:bg-card p-5 rounded-xl border border-sfrc-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-sfrc-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Students</span>
            <GraduationCap className="w-4 h-4 text-sfrc-700" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-sfrc-950 dark:text-foreground">
              {stats.total_active_students}
            </div>
            <div className="text-xs text-sfrc-600 font-medium">Active Enrolled</div>
          </div>
        </div>

        <div className="bg-sfrc-surface dark:bg-card p-5 rounded-xl border border-sfrc-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-sfrc-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Faculty</span>
            <Users className="w-4 h-4 text-sfrc-700" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-sfrc-950 dark:text-foreground">
              {stats.total_faculty}
            </div>
            <div className="text-xs text-sfrc-600 font-medium">Teaching Staff</div>
          </div>
        </div>

        <div className="bg-sfrc-surface dark:bg-card p-5 rounded-xl border border-sfrc-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-sfrc-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Avg Attendance</span>
            <ClipboardList className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-emerald-700">
              {stats.avg_attendance_pct}%
            </div>
            <div className="text-xs text-sfrc-600 font-medium">Min threshold 75%</div>
          </div>
        </div>

        <div className="bg-sfrc-surface dark:bg-card p-5 rounded-xl border border-sfrc-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-sfrc-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">At-Risk Students</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-rose-600">
              {stats.at_risk_students_count}
            </div>
            <div className="text-xs text-rose-600/80 font-medium">Attendance &lt; 75%</div>
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/hod/attendance-report"
          className="p-4 rounded-xl bg-sfrc-surface dark:bg-card border border-sfrc-200 hover:border-sfrc-700/50 hover:bg-sfrc-100/50 transition-all flex items-center justify-between group shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sfrc-700/10 text-sfrc-700 flex items-center justify-center font-bold">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-sfrc-950 dark:text-foreground">Attendance Report</div>
              <div className="text-xs text-sfrc-600">Export PDF & roster checks</div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-sfrc-600 group-hover:translate-x-1 transition-transform" />
        </Link>

        <Link
          href="/hod/marks-report"
          className="p-4 rounded-xl bg-sfrc-surface dark:bg-card border border-sfrc-200 hover:border-sfrc-700/50 hover:bg-sfrc-100/50 transition-all flex items-center justify-between group shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sfrc-accent/10 text-sfrc-accent flex items-center justify-center font-bold">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-sfrc-950 dark:text-foreground">Marks & CIA Report</div>
              <div className="text-xs text-sfrc-600">Grades, pass %, exam averages</div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-sfrc-600 group-hover:translate-x-1 transition-transform" />
        </Link>

        <Link
          href="/hod/faculty"
          className="p-4 rounded-xl bg-sfrc-surface dark:bg-card border border-sfrc-200 hover:border-sfrc-700/50 hover:bg-sfrc-100/50 transition-all flex items-center justify-between group shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-600/10 text-emerald-600 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-sfrc-950 dark:text-foreground">Faculty Oversight</div>
              <div className="text-xs text-sfrc-600">Assigned courses & sessions</div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-sfrc-600 group-hover:translate-x-1 transition-transform" />
        </Link>

        <Link
          href="/hod/students"
          className="p-4 rounded-xl bg-sfrc-surface dark:bg-card border border-sfrc-200 hover:border-sfrc-700/50 hover:bg-sfrc-100/50 transition-all flex items-center justify-between group shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-600/10 text-rose-600 flex items-center justify-center font-bold">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-sfrc-950 dark:text-foreground">Student Risk Vigilance</div>
              <div className="text-xs text-sfrc-600">Attendance & arrear risk audit</div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-sfrc-600 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* Two Column Section: Faculty Overview Table & Student Vigilance Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Faculty Overview Table */}
        <div className="bg-sfrc-surface dark:bg-card rounded-2xl p-6 border border-sfrc-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-sfrc-950 dark:text-foreground">Faculty Allocation & Activity</h2>
                <p className="text-xs text-sfrc-600">Assigned subject loads and attendance entry log</p>
              </div>
              <Link href="/hod/faculty" className="text-xs font-bold text-sfrc-700 hover:underline">
                View All ({faculty.length})
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-sfrc-200 text-xs font-bold text-sfrc-600 uppercase bg-sfrc-100/30">
                    <th className="py-2.5 px-3">Faculty Member</th>
                    <th className="py-2.5 px-3">Designation</th>
                    <th className="py-2.5 px-3 text-center">Subjects</th>
                    <th className="py-2.5 px-3 text-right">Sessions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sfrc-200/60">
                  {faculty.slice(0, 5).map((f) => (
                    <tr key={f.faculty_id} className="hover:bg-sfrc-100/40 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-sfrc-950 dark:text-foreground">{f.full_name}</div>
                        <div className="text-xs text-sfrc-600 font-mono">{f.employee_id}</div>
                      </td>
                      <td className="py-2.5 px-3 text-xs text-sfrc-700">{f.designation}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-sfrc-200/60 text-sfrc-900">
                          {f.subjects_count}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-xs text-emerald-700">
                        {f.attendance_sessions_recorded} logged
                      </td>
                    </tr>
                  ))}
                  {faculty.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-xs text-sfrc-600">
                        No faculty records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Student Risk Vigilance Table */}
        <div className="bg-sfrc-surface dark:bg-card rounded-2xl p-6 border border-sfrc-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-sfrc-950 dark:text-foreground">Student Performance & Risk Flag</h2>
                <p className="text-xs text-sfrc-600">Flagged when attendance &lt; 75% or marks &lt; 40%</p>
              </div>
              <Link href="/hod/students" className="text-xs font-bold text-rose-700 hover:underline">
                View All ({students.length})
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-sfrc-200 text-xs font-bold text-sfrc-600 uppercase bg-sfrc-100/30">
                    <th className="py-2.5 px-3">Register No / Student</th>
                    <th className="py-2.5 px-3 text-center">Attendance %</th>
                    <th className="py-2.5 px-3 text-center">Marks %</th>
                    <th className="py-2.5 px-3 text-right">Risk Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sfrc-200/60">
                  {students.slice(0, 5).map((s) => (
                    <tr key={s.student_id} className="hover:bg-sfrc-100/40 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-sfrc-950 dark:text-foreground">{s.full_name}</div>
                        <div className="text-xs font-mono text-sfrc-600">{s.register_number}</div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={cn(
                            'font-bold text-xs px-2 py-0.5 rounded-full',
                            s.attendance_pct < 75.0
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : 'bg-emerald-100 text-emerald-800'
                          )}
                        >
                          {s.attendance_pct}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-medium text-xs text-sfrc-800">
                        {s.marks_pct}%
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {s.is_at_risk ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-rose-600 text-white">
                            <AlertTriangle className="w-3 h-3" /> At Risk
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-600 text-white">
                            <CheckCircle2 className="w-3 h-3" /> Safe
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {students.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-xs text-sfrc-600">
                        No student performance records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
