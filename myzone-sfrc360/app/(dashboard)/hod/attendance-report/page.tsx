'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ClipboardList,
  Printer,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';
import { apiGet } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface CourseOption {
  id: string;
  code: string;
  title: string;
}

interface AttendanceReportItem {
  student_id: string;
  register_number: string;
  full_name: string;
  classes_held: number;
  present_count: number;
  absent_count: number;
  attendance_pct: number;
  status: string;
  is_below_75: boolean;
}

interface AttendanceReportResponse {
  courses: CourseOption[];
  selected_course: CourseOption | null;
  report: AttendanceReportItem[];
  summary: {
    total_students: number;
    below_75_count: number;
    class_average_pct: number;
  };
}

export default function HodAttendanceReportPage() {
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [report, setReport] = useState<AttendanceReportItem[]>([]);
  const [summary, setSummary] = useState({
    total_students: 0,
    below_75_count: 0,
    class_average_pct: 0,
  });
  const [selectedCourse, setSelectedCourse] = useState<CourseOption | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReport() {
      try {
        setLoading(true);
        const url = selectedCourseId
          ? `/api/v1/hod/attendance-report?course_id=${selectedCourseId}`
          : '/api/v1/hod/attendance-report';
        const res = await apiGet<AttendanceReportResponse>(url);
        if (res) {
          setCourses(res.courses || []);
          setReport(res.report || []);
          setSummary(res.summary || { total_students: 0, below_75_count: 0, class_average_pct: 0 });
          setSelectedCourse(res.selected_course || null);
          if (!selectedCourseId && res.selected_course) {
            setSelectedCourseId(res.selected_course.id);
          }
        }
      } catch (err) {
        console.error('Failed to load attendance report:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, [selectedCourseId]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header and Print Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/hod/dashboard"
              className="text-xs font-semibold text-sfrc-700 hover:text-sfrc-900 flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </Link>
          </div>
          <h1 className="text-2xl font-extrabold text-sfrc-950 dark:text-foreground">
            Department Attendance Audit Report
          </h1>
          <p className="text-sm text-sfrc-600">
            Subject-wise attendance breakdown, class thresholds, and debarment warning verification.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Subject Filter */}
          <div className="relative">
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold border border-sfrc-200 bg-sfrc-surface dark:bg-card text-sfrc-950 dark:text-foreground focus:outline-none focus:ring-2 focus:ring-sfrc-700"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.title}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-sfrc-700 text-white hover:bg-sfrc-800 transition-colors flex items-center gap-2 shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>Export as PDF / Print</span>
          </button>
        </div>
      </div>

      {/* Printable Institutional Header */}
      <div className="hidden print:block text-center border-b pb-4 mb-6">
        <h2 className="text-lg font-bold text-gray-900 uppercase">
          The Standard Fireworks Rajaratnam College for Women, Sivakasi
        </h2>
        <h3 className="text-sm font-semibold text-gray-700">Department of Computer Applications</h3>
        <p className="text-xs text-gray-500 mt-1">
          Attendance Audit Report | Course: {selectedCourse ? `${selectedCourse.code} - ${selectedCourse.title}` : 'All Courses'}
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:grid-cols-3">
        <div className="bg-sfrc-surface dark:bg-card p-4 rounded-xl border border-sfrc-200 shadow-sm">
          <div className="text-xs font-bold text-sfrc-600 uppercase tracking-wider mb-1">Total Enrolled</div>
          <div className="text-2xl font-extrabold text-sfrc-950 dark:text-foreground">{summary.total_students}</div>
          <div className="text-xs text-sfrc-600">Students in this cohort</div>
        </div>

        <div className="bg-sfrc-surface dark:bg-card p-4 rounded-xl border border-sfrc-200 shadow-sm">
          <div className="text-xs font-bold text-sfrc-600 uppercase tracking-wider mb-1">Class Average</div>
          <div className="text-2xl font-extrabold text-emerald-700">{summary.class_average_pct}%</div>
          <div className="text-xs text-sfrc-600">Overall class attendance rate</div>
        </div>

        <div className="bg-sfrc-surface dark:bg-card p-4 rounded-xl border border-sfrc-200 shadow-sm">
          <div className="text-xs font-bold text-sfrc-600 uppercase tracking-wider mb-1">Shortage &lt; 75%</div>
          <div className="text-2xl font-extrabold text-rose-600">{summary.below_75_count}</div>
          <div className="text-xs text-rose-600/80 font-medium">Debarred / Condonation notice</div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh] gap-3 text-sfrc-700">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-sm font-semibold">Generating Attendance Audit...</span>
        </div>
      ) : (
        <div className="bg-sfrc-surface dark:bg-card rounded-2xl border border-sfrc-200 shadow-sm overflow-hidden print:border-none print:shadow-none">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm print:text-xs">
              <thead>
                <tr className="border-b border-sfrc-200 bg-sfrc-100/50 text-xs font-bold text-sfrc-800 uppercase tracking-wider">
                  <th className="py-3 px-4">Register Number</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4 text-center">Classes Held</th>
                  <th className="py-3 px-4 text-center">Attended</th>
                  <th className="py-3 px-4 text-center">Absent</th>
                  <th className="py-3 px-4 text-center">Attendance %</th>
                  <th className="py-3 px-4 text-right">Eligibility Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sfrc-200/60">
                {report.map((r) => (
                  <tr
                    key={r.student_id}
                    className={cn(
                      'hover:bg-sfrc-100/30 transition-colors',
                      r.is_below_75 && 'bg-rose-50/50 dark:bg-rose-950/20'
                    )}
                  >
                    <td className="py-3 px-4 font-mono font-bold text-sfrc-950 dark:text-foreground">
                      {r.register_number}
                    </td>
                    <td className="py-3 px-4 font-semibold text-sfrc-950 dark:text-foreground">
                      {r.full_name}
                    </td>
                    <td className="py-3 px-4 text-center text-sfrc-700 font-medium">{r.classes_held}</td>
                    <td className="py-3 px-4 text-center text-emerald-700 font-bold">{r.present_count}</td>
                    <td className="py-3 px-4 text-center text-rose-700 font-bold">{r.absent_count}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={cn(
                          'inline-block px-2.5 py-0.5 rounded-full text-xs font-bold',
                          r.is_below_75 ? 'bg-rose-600 text-white shadow-xs' : 'bg-emerald-100 text-emerald-800'
                        )}
                      >
                        {r.attendance_pct}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {r.is_below_75 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>{r.status}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{r.status}</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
