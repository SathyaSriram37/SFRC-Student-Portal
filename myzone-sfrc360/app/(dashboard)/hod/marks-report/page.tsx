'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Printer,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  Award,
} from 'lucide-react';
import { apiGet } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface CourseOption {
  id: string;
  code: string;
  title: string;
}

interface MarksRecordItem {
  student_id: string;
  register_number: string;
  full_name: string;
  marks_obtained: number;
  max_marks: number;
  percentage: number;
  grade: string;
  status: string;
}

interface MarksReportResponse {
  courses: CourseOption[];
  selected_course: CourseOption | null;
  assessment_type: string;
  records: MarksRecordItem[];
  summary: {
    total_students: number;
    class_average: number;
    highest_mark: number;
    lowest_mark: number;
    pass_count: number;
    fail_count: number;
    pass_percentage: number;
  };
}

export default function HodMarksReportPage() {
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [assessmentType, setAssessmentType] = useState<string>('CIA1');
  const [records, setRecords] = useState<MarksRecordItem[]>([]);
  const [summary, setSummary] = useState({
    total_students: 0,
    class_average: 0,
    highest_mark: 0,
    lowest_mark: 0,
    pass_count: 0,
    fail_count: 0,
    pass_percentage: 0,
  });
  const [selectedCourse, setSelectedCourse] = useState<CourseOption | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMarksReport() {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (selectedCourseId) params.append('course_id', selectedCourseId);
        params.append('assessment_type', assessmentType);

        const res = await apiGet<MarksReportResponse>(`/api/v1/hod/marks-report?${params.toString()}`);
        if (res) {
          setCourses(res.courses || []);
          setRecords(res.records || []);
          setSummary(
            res.summary || {
              total_students: 0,
              class_average: 0,
              highest_mark: 0,
              lowest_mark: 0,
              pass_count: 0,
              fail_count: 0,
              pass_percentage: 0,
            }
          );
          setSelectedCourse(res.selected_course || null);
          if (!selectedCourseId && res.selected_course) {
            setSelectedCourseId(res.selected_course.id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch marks report:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchMarksReport();
  }, [selectedCourseId, assessmentType]);

  const handlePrint = () => {
    window.print();
  };

  const getGradeBadge = (grade: string) => {
    if (grade === 'A+' || grade === 'A') {
      return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    } else if (grade === 'B+' || grade === 'B') {
      return 'bg-amber-100 text-amber-800 border-amber-300';
    } else if (grade === 'C') {
      return 'bg-orange-100 text-orange-800 border-orange-300';
    } else {
      return 'bg-rose-100 text-rose-800 border-rose-300 font-extrabold';
    }
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
            Academic Performance & Marks Report
          </h1>
          <p className="text-sm text-sfrc-600">
            Internal assessments (CIA), continuous evaluation, and OBE grading analysis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Course Filter */}
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-bold border border-sfrc-200 bg-sfrc-surface dark:bg-card text-sfrc-950 dark:text-foreground focus:outline-none focus:ring-2 focus:ring-sfrc-700"
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.title}
              </option>
            ))}
          </select>

          {/* Assessment Type Filter */}
          <select
            value={assessmentType}
            onChange={(e) => setAssessmentType(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-bold border border-sfrc-200 bg-sfrc-surface dark:bg-card text-sfrc-950 dark:text-foreground focus:outline-none focus:ring-2 focus:ring-sfrc-700"
          >
            <option value="CIA1">CIA 1 (Continuous Assessment 1)</option>
            <option value="CIA2">CIA 2 (Continuous Assessment 2)</option>
            <option value="CIA3">CIA 3 (Continuous Assessment 3)</option>
            <option value="Model">Model Examination</option>
            <option value="Semester">End Semester Exam</option>
          </select>

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
          Assessment Report: {assessmentType} | Course: {selectedCourse ? `${selectedCourse.code} - ${selectedCourse.title}` : 'All Courses'}
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 print:grid-cols-6">
        <div className="bg-sfrc-surface dark:bg-card p-3 rounded-xl border border-sfrc-200 shadow-sm">
          <div className="text-[11px] font-bold text-sfrc-600 uppercase tracking-wider">Class Avg</div>
          <div className="text-xl font-extrabold text-sfrc-950 dark:text-foreground">{summary.class_average}</div>
        </div>
        <div className="bg-sfrc-surface dark:bg-card p-3 rounded-xl border border-sfrc-200 shadow-sm">
          <div className="text-[11px] font-bold text-sfrc-600 uppercase tracking-wider">Highest</div>
          <div className="text-xl font-extrabold text-emerald-700">{summary.highest_mark}</div>
        </div>
        <div className="bg-sfrc-surface dark:bg-card p-3 rounded-xl border border-sfrc-200 shadow-sm">
          <div className="text-[11px] font-bold text-sfrc-600 uppercase tracking-wider">Lowest</div>
          <div className="text-xl font-extrabold text-rose-700">{summary.lowest_mark}</div>
        </div>
        <div className="bg-sfrc-surface dark:bg-card p-3 rounded-xl border border-sfrc-200 shadow-sm">
          <div className="text-[11px] font-bold text-sfrc-600 uppercase tracking-wider">Passed</div>
          <div className="text-xl font-extrabold text-emerald-700">{summary.pass_count}</div>
        </div>
        <div className="bg-sfrc-surface dark:bg-card p-3 rounded-xl border border-sfrc-200 shadow-sm">
          <div className="text-[11px] font-bold text-sfrc-600 uppercase tracking-wider">Failed</div>
          <div className="text-xl font-extrabold text-rose-600">{summary.fail_count}</div>
        </div>
        <div className="bg-sfrc-surface dark:bg-card p-3 rounded-xl border border-sfrc-200 shadow-sm">
          <div className="text-[11px] font-bold text-sfrc-600 uppercase tracking-wider">Pass %</div>
          <div className="text-xl font-extrabold text-sfrc-accent">{summary.pass_percentage}%</div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh] gap-3 text-sfrc-700">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-sm font-semibold">Compiling Assessment Metrics...</span>
        </div>
      ) : (
        <div className="bg-sfrc-surface dark:bg-card rounded-2xl border border-sfrc-200 shadow-sm overflow-hidden print:border-none print:shadow-none">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm print:text-xs">
              <thead>
                <tr className="border-b border-sfrc-200 bg-sfrc-100/50 text-xs font-bold text-sfrc-800 uppercase tracking-wider">
                  <th className="py-3 px-4">Register No</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4 text-center">Marks Obtained</th>
                  <th className="py-3 px-4 text-center">Max Marks</th>
                  <th className="py-3 px-4 text-center">Percentage</th>
                  <th className="py-3 px-4 text-center">Grade</th>
                  <th className="py-3 px-4 text-right">Pass/Fail Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sfrc-200/60">
                {records.map((r) => (
                  <tr
                    key={r.student_id}
                    className={cn(
                      'hover:bg-sfrc-100/30 transition-colors',
                      r.status === 'Fail' && 'bg-rose-50/50 dark:bg-rose-950/20'
                    )}
                  >
                    <td className="py-3 px-4 font-mono font-bold text-sfrc-950 dark:text-foreground">
                      {r.register_number}
                    </td>
                    <td className="py-3 px-4 font-semibold text-sfrc-950 dark:text-foreground">
                      {r.full_name}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-sfrc-900 dark:text-foreground">
                      {r.marks_obtained}
                    </td>
                    <td className="py-3 px-4 text-center text-sfrc-600 font-mono text-xs">
                      {r.max_marks}
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-sfrc-800">
                      {r.percentage}%
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={cn('px-2 py-0.5 rounded text-xs font-bold border', getGradeBadge(r.grade))}>
                        {r.grade}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-xs">
                      {r.status === 'Pass' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Pass
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-600">
                          <XCircle className="w-3.5 h-3.5" /> Fail (Arrear)
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
