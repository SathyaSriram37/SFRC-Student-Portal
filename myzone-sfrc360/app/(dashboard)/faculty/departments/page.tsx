'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Building2,
  Search,
  Users,
  GraduationCap,
  BookOpen,
  ArrowLeft,
  ChevronRight,
  TrendingUp,
  Award,
  Shield,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { apiGet } from '@/lib/api-client';
import { createClient } from '@/lib/supabase/client';

interface DepartmentSummary {
  id: string;
  name: string;
  code: string;
  students_count: number;
  faculty_count: number;
  courses_count: number;
  hod_name: string;
  avg_attendance: number;
  pass_rate: number;
}

interface OverviewResponse {
  departments: DepartmentSummary[];
  kpi: {
    total_students: number;
    total_faculty: number;
    total_programmes: number;
    total_courses: number;
    overall_attendance_pct: number;
    overall_pass_pct: number;
    naac_grade: string;
    nirf_band: string;
  };
}

export default function DepartmentsOversightPage() {
  const [departments, setDepartments] = useState<DepartmentSummary[]>([]);
  const [kpi, setKpi] = useState<OverviewResponse['kpi'] | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState<DepartmentSummary | null>(null);

  useEffect(() => {
    async function loadDepts() {
      try {
        setLoading(true);
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const res = await apiGet<OverviewResponse>('/api/v1/faculty/principal/overview', token);
        if (res && res.departments) {
          setDepartments(res.departments);
          setKpi(res.kpi);
        }
      } catch (err) {
        console.error('Failed to load departments oversight:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDepts();
  }, []);

  const filtered = useMemo(() => {
    return departments.filter(
      (d) =>
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.code.toLowerCase().includes(search.toLowerCase()) ||
        d.hod_name.toLowerCase().includes(search.toLowerCase())
    );
  }, [departments, search]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header breadcrumb & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/faculty/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-sfrc-600 hover:text-sfrc-900 transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-sfrc-900 tracking-tight flex items-center gap-2.5">
            <Building2 className="w-7 h-7 text-sfrc-700" />
            All Academic Departments Oversight
          </h1>
          <p className="text-xs sm:text-sm text-sfrc-600 mt-1">
            Real-time institutional governance across all 19 autonomous academic departments.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-sfrc-100 text-sfrc-800 text-xs font-black">
          <Shield className="w-4 h-4 text-sfrc-700" />
          19 Autonomous Departments Active
        </div>
      </div>

      {/* KPI Summary Cards */}
      {kpi && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-sfrc-200 shadow-2xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-sfrc-500">Total Enrolled</p>
            <p className="text-2xl font-black text-sfrc-900 mt-1">{kpi.total_students}</p>
            <p className="text-[10px] text-emerald-600 font-bold mt-0.5">Students Across College</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-sfrc-200 shadow-2xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-sfrc-500">Faculty Strength</p>
            <p className="text-2xl font-black text-sfrc-900 mt-1">{kpi.total_faculty}</p>
            <p className="text-[10px] text-blue-600 font-bold mt-0.5">Teaching Faculty</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-sfrc-200 shadow-2xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-sfrc-500">Institutional Attendance</p>
            <p className="text-2xl font-black text-sfrc-900 mt-1">{kpi.overall_attendance_pct}%</p>
            <p className="text-[10px] text-emerald-600 font-bold mt-0.5">Threshold: 75%</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-sfrc-200 shadow-2xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-sfrc-500">Institutional Pass Rate</p>
            <p className="text-2xl font-black text-sfrc-900 mt-1">{kpi.overall_pass_pct}%</p>
            <p className="text-[10px] text-emerald-600 font-bold mt-0.5">CIA & Sem Exams</p>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-sfrc-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by department name, code (e.g. DS, BOT, CHEM), or Head of Department..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-sfrc-200 bg-white text-xs sm:text-sm text-sfrc-900 focus:outline-none focus:ring-2 focus:ring-sfrc-500"
        />
      </div>

      {/* Departments Table */}
      <div className="bg-white rounded-2xl border border-sfrc-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-sfrc-500 text-xs">
            <Loader2 className="w-6 h-6 animate-spin text-sfrc-700" />
            Loading live department governance records...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-xs text-sfrc-500">
            No departments matched your search query.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-sfrc-50 text-sfrc-600 uppercase tracking-wider text-[10px] font-bold border-b border-sfrc-100">
                <tr>
                  <th className="p-3.5">Department</th>
                  <th className="p-3.5">Code</th>
                  <th className="p-3.5">Head of Department</th>
                  <th className="p-3.5 text-center">Students</th>
                  <th className="p-3.5 text-center">Faculty</th>
                  <th className="p-3.5 text-center">Courses</th>
                  <th className="p-3.5 text-center">Avg Attendance</th>
                  <th className="p-3.5 text-center">Pass Rate</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sfrc-100">
                {filtered.map((dept) => (
                  <tr key={dept.id} className="hover:bg-sfrc-50/70 transition-colors">
                    <td className="p-3.5 font-black text-sfrc-900">
                      {dept.name}
                    </td>
                    <td className="p-3.5">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-sfrc-100 text-sfrc-800">
                        {dept.code}
                      </span>
                    </td>
                    <td className="p-3.5 font-semibold text-sfrc-700">{dept.hod_name}</td>
                    <td className="p-3.5 text-center font-bold text-sfrc-900">{dept.students_count}</td>
                    <td className="p-3.5 text-center font-bold text-sfrc-900">{dept.faculty_count}</td>
                    <td className="p-3.5 text-center font-bold text-sfrc-700">{dept.courses_count}</td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          dept.avg_attendance >= 75
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                      >
                        {dept.avg_attendance}%
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="font-bold text-emerald-700">{dept.pass_rate}%</span>
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => setSelectedDept(dept)}
                        className="px-3 py-1 rounded-lg text-xs font-bold text-sfrc-700 bg-sfrc-100 hover:bg-sfrc-200 transition-colors"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Department Detail Modal */}
      {selectedDept && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-sfrc-200 animate-fadeIn">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sfrc-100 text-sfrc-800">
                  {selectedDept.code}
                </span>
                <h3 className="text-lg font-black text-sfrc-900 mt-1">{selectedDept.name}</h3>
                <p className="text-xs text-sfrc-600 mt-0.5">Head of Department: {selectedDept.hod_name}</p>
              </div>
              <button
                onClick={() => setSelectedDept(null)}
                className="text-sfrc-400 hover:text-sfrc-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-sfrc-50 border border-sfrc-100">
                <p className="text-[10px] uppercase font-bold text-sfrc-500">Students Active</p>
                <p className="text-xl font-black text-sfrc-900 mt-0.5">{selectedDept.students_count}</p>
              </div>
              <div className="p-3 rounded-xl bg-sfrc-50 border border-sfrc-100">
                <p className="text-[10px] uppercase font-bold text-sfrc-500">Faculty Allocated</p>
                <p className="text-xl font-black text-sfrc-900 mt-0.5">{selectedDept.faculty_count}</p>
              </div>
              <div className="p-3 rounded-xl bg-sfrc-50 border border-sfrc-100">
                <p className="text-[10px] uppercase font-bold text-sfrc-500">Average Attendance</p>
                <p className="text-xl font-black text-emerald-700 mt-0.5">{selectedDept.avg_attendance}%</p>
              </div>
              <div className="p-3 rounded-xl bg-sfrc-50 border border-sfrc-100">
                <p className="text-[10px] uppercase font-bold text-sfrc-500">CIA Pass Rate</p>
                <p className="text-xl font-black text-emerald-700 mt-0.5">{selectedDept.pass_rate}%</p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedDept(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-sfrc-900 text-white hover:bg-sfrc-800 transition-colors"
              >
                Close Oversight
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
