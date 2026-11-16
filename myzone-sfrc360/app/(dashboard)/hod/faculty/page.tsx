'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  BookOpen,
  ClipboardList,
  Mail,
  GraduationCap,
  ArrowLeft,
  Loader2,
  CalendarCheck,
} from 'lucide-react';
import { apiGet } from '@/lib/api-client';

interface FacultyItem {
  faculty_id: string;
  full_name: string;
  email: string;
  employee_id: string;
  designation: string;
  department: string;
  qualification: string;
  specialization: string;
  assigned_subjects: string[];
  subjects_count: number;
  attendance_sessions_recorded: number;
  last_activity: string;
}

export default function HodFacultyPage() {
  const [faculty, setFaculty] = useState<FacultyItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFaculty() {
      try {
        setLoading(true);
        const res = await apiGet<{ faculty: FacultyItem[] }>('/api/v1/hod/faculty');
        if (res && res.faculty) {
          setFaculty(res.faculty);
        }
      } catch (err) {
        console.error('Failed to fetch faculty:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchFaculty();
  }, []);

  const filtered = faculty.filter(
    (f) =>
      f.full_name.toLowerCase().includes(search.toLowerCase()) ||
      f.employee_id.toLowerCase().includes(search.toLowerCase()) ||
      f.designation.toLowerCase().includes(search.toLowerCase())
  );

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
            Department Faculty & Teaching Loads
          </h1>
          <p className="text-sm text-sfrc-600">
            Faculty directory, assigned subject portfolios, and lecture attendance session tracking.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-sfrc-600" />
          <input
            type="text"
            placeholder="Search faculty by name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-sm border border-sfrc-200 bg-sfrc-surface dark:bg-card focus:outline-none focus:ring-2 focus:ring-sfrc-700/40 text-sfrc-950 dark:text-foreground"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh] gap-3 text-sfrc-700">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-sm font-semibold">Loading Faculty Roster...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((f) => (
            <div
              key={f.faculty_id}
              className="bg-sfrc-surface dark:bg-card rounded-2xl border border-sfrc-200 p-5 shadow-sm hover:border-sfrc-700/50 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-base text-sfrc-950 dark:text-foreground">
                      {f.full_name}
                    </h3>
                    <div className="text-xs font-medium text-sfrc-700">{f.designation}</div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-sfrc-200 text-sfrc-900">
                    {f.employee_id}
                  </span>
                </div>

                <div className="space-y-2 text-xs text-sfrc-700 border-t border-b border-sfrc-200/60 py-3 my-3">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-sfrc-600 shrink-0" />
                    <span>{f.qualification}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-sfrc-600 shrink-0" />
                    <span className="font-mono text-sfrc-900 dark:text-foreground">{f.email}</span>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold text-sfrc-800 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>Assigned Subjects ({f.subjects_count})</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {f.assigned_subjects.length > 0 ? (
                      f.assigned_subjects.map((sub, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-sfrc-100 dark:bg-card border border-sfrc-200 text-[11px] font-medium text-sfrc-950 dark:text-foreground truncate max-w-full"
                        >
                          {sub}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-sfrc-600 italic">No courses currently assigned</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-sfrc-200/60 flex items-center justify-between text-xs text-sfrc-600">
                <div className="flex items-center gap-1 font-semibold text-emerald-700">
                  <CalendarCheck className="w-3.5 h-3.5" />
                  <span>{f.attendance_sessions_recorded} Attendance Sessions</span>
                </div>
                <span>{f.last_activity}</span>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="col-span-full py-12 text-center text-sm text-sfrc-600 bg-sfrc-surface dark:bg-card rounded-2xl border border-dashed border-sfrc-200">
              No faculty matching &ldquo;{search}&rdquo; found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
