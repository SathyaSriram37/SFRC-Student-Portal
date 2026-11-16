'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  Search,
  AlertTriangle,
  CheckCircle2,
  Filter,
  ArrowLeft,
  Loader2,
  Phone,
  Mail,
} from 'lucide-react';
import { apiGet } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface StudentItem {
  student_id: string;
  register_number: string;
  roll_number: string;
  full_name: string;
  email: string;
  phone: string;
  current_semester: number;
  department_code: string;
  attendance_pct: number;
  marks_pct: number;
  is_at_risk: boolean;
  risk_reasons: string[];
}

export default function HodStudentsPage() {
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [search, setSearch] = useState('');
  const [riskOnly, setRiskOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStudents() {
      try {
        setLoading(true);
        const res = await apiGet<{ students: StudentItem[] }>('/api/v1/hod/students');
        if (res && res.students) {
          setStudents(res.students);
        }
      } catch (err) {
        console.error('Failed to fetch department students:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStudents();
  }, []);

  const filtered = students.filter((s) => {
    const matchesSearch =
      s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      s.register_number.toLowerCase().includes(search.toLowerCase());
    if (riskOnly) return matchesSearch && s.is_at_risk;
    return matchesSearch;
  });

  const atRiskCount = students.filter((s) => s.is_at_risk).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
            Student Vigilance & Academic Performance
          </h1>
          <p className="text-sm text-sfrc-600">
            Attendance monitoring, assessment grades, and debarment risk identification.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setRiskOnly(!riskOnly)}
            className={cn(
              'px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border',
              riskOnly
                ? 'bg-rose-600 text-white border-rose-700 shadow-sm'
                : 'bg-sfrc-surface dark:bg-card text-rose-700 border-rose-300 hover:bg-rose-50'
            )}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>At-Risk Only ({atRiskCount})</span>
          </button>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-sfrc-600" />
            <input
              type="text"
              placeholder="Search by student name or roll..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl text-sm border border-sfrc-200 bg-sfrc-surface dark:bg-card focus:outline-none focus:ring-2 focus:ring-sfrc-700/40 text-sfrc-950 dark:text-foreground"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh] gap-3 text-sfrc-700">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-sm font-semibold">Loading Student Records...</span>
        </div>
      ) : (
        <div className="bg-sfrc-surface dark:bg-card rounded-2xl border border-sfrc-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-sfrc-200 bg-sfrc-100/50 text-xs font-bold text-sfrc-800 uppercase tracking-wider">
                  <th className="py-3 px-4">Register No</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Semester</th>
                  <th className="py-3 px-4 text-center">Attendance %</th>
                  <th className="py-3 px-4 text-center">Marks Avg %</th>
                  <th className="py-3 px-4 text-center">Risk Status</th>
                  <th className="py-3 px-4">Advisory Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sfrc-200/60">
                {filtered.map((s) => (
                  <tr
                    key={s.student_id}
                    className={cn(
                      'hover:bg-sfrc-100/30 transition-colors',
                      s.is_at_risk && 'bg-rose-50/40 dark:bg-rose-950/10'
                    )}
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-sfrc-950 dark:text-foreground">
                      {s.register_number}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-sfrc-950 dark:text-foreground">{s.full_name}</div>
                      <div className="text-xs text-sfrc-600 flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3" /> {s.phone}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold text-sfrc-700">
                      Sem {s.current_semester} ({s.department_code})
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={cn(
                          'inline-block px-2.5 py-0.5 rounded-full text-xs font-bold',
                          s.attendance_pct < 75.0
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-emerald-100 text-emerald-800'
                        )}
                      >
                        {s.attendance_pct}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-xs text-sfrc-900 dark:text-foreground">
                      {s.marks_pct}%
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {s.is_at_risk ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          <span>At Risk</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Satisfactory</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      {s.is_at_risk ? (
                        <span className="text-rose-700 font-medium">
                          {s.risk_reasons.join(', ')}
                        </span>
                      ) : (
                        <span className="text-sfrc-600">Eligible for end-semester exams</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-sm text-sfrc-600">
                      No students found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
