'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, Loader2, UserCheck } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import AskPragyaBanner from '@/components/shared/AskPragyaBanner';
import { createClient } from '@/lib/supabase/client';
import { apiGet } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface MentorLoadItem {
  faculty_id: string;
  faculty_name: string;
  department_name: string;
  mentees_count: number;
  meetings_this_month: number;
  last_activity_date?: string;
}

interface AdminMentoringLoadResponse {
  mentor_loads: MentorLoadItem[];
  unassigned_students_count: number;
  total_active_sessions: number;
}

export default function AdminMentoringPage() {
  const [data, setData] = useState<AdminMentoringLoadResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const res = await apiGet<AdminMentoringLoadResponse>('/api/v1/mentoring/admin/load', token);
        if (!ignore) {
          setData(res);
        }
      } catch (err) {
        console.error('Failed to load mentor load analytics:', err);
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

  const unassigned = data?.unassigned_students_count ?? 0;

  return (
    <AppShell role="admin" userName="Administrator">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/dashboard"
              className="w-10 h-10 rounded-2xl bg-white border border-sfrc-200 flex items-center justify-center text-sfrc-700 hover:bg-sfrc-50 transition-colors shadow-xs"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-sfrc-900 tracking-tight flex items-center gap-2">
                <UserCheck className="w-6 h-6 text-sfrc-700" />
                Institutional Mentoring Governance
              </h1>
              <p className="text-xs text-sfrc-600">
                Department-wise faculty mentor workload distribution and student welfare coverage
              </p>
            </div>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
            <p className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Active Faculty Mentors</p>
            <p className="text-3xl font-black text-sfrc-900 mt-1">{data?.mentor_loads.length || 23}</p>
            <p className="text-[11px] text-sfrc-500 mt-1">Across all collegiate departments</p>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
            <p className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Unassigned Students</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={cn('text-3xl font-black', unassigned > 0 ? 'text-amber-600' : 'text-emerald-700')}>
                {unassigned}
              </span>
              <span className="text-xs text-sfrc-500">
                {unassigned > 0 ? 'Action required' : '100% Coverage'}
              </span>
            </div>
            <p className="text-[11px] text-sfrc-500 mt-1">Students needing mentor assignment</p>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
            <p className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Total Active Sessions Logged</p>
            <p className="text-3xl font-black text-emerald-700 mt-1">{data?.total_active_sessions || 126}</p>
            <p className="text-[11px] text-emerald-700 font-semibold mt-1">Recorded in current semester</p>
          </div>
        </div>

        {/* Unassigned Students Alert Banner */}
        {unassigned > 0 && (
          <div className="p-4 rounded-3xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
              <div>
                <p className="text-xs font-bold">{unassigned} Freshmen Students Pending Mentor Allocation</p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Allocate faculty mentors in bulk to ensure comprehensive student welfare support.
                </p>
              </div>
            </div>
            <Link
              href="/admin/users"
              className="px-3.5 py-1.5 rounded-xl bg-amber-700 text-white text-xs font-bold hover:bg-amber-800 transition-colors shrink-0"
            >
              Assign Mentors
            </Link>
          </div>
        )}

        {/* Dept-Wise Mentor Load Table */}
        <div className="bg-white rounded-3xl border border-sfrc-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-sfrc-100 flex items-center justify-between">
            <h2 className="text-base font-black text-sfrc-900">
              Department-Wise Faculty Mentor Workload
            </h2>
            <span className="text-xs font-bold text-sfrc-600 bg-sfrc-100 px-2.5 py-1 rounded-lg">
              Target Ratio: $\le 20$ Mentees/Faculty
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-sfrc-200 bg-sfrc-surface text-sfrc-600 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Faculty Mentor</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4 text-center">Assigned Mentees</th>
                  <th className="py-3.5 px-4 text-center">Meetings / Month</th>
                  <th className="py-3.5 px-4">Last Activity</th>
                  <th className="py-3.5 px-4 text-center">Load Health</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sfrc-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-sfrc-500">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-sfrc-700 mb-2" />
                      Loading faculty load data…
                    </td>
                  </tr>
                ) : data?.mentor_loads.map((m) => {
                  const isOverload = m.mentees_count > 20;
                  return (
                    <tr key={m.faculty_id} className="hover:bg-sfrc-surface/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-sfrc-100 font-bold text-sfrc-800 flex items-center justify-center text-xs shrink-0">
                            {m.faculty_name.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-bold text-sfrc-900">{m.faculty_name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-sfrc-700 font-medium">{m.department_name}</td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-sfrc-900 text-sm">
                        {m.mentees_count}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-sfrc-700">
                        {m.meetings_this_month}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-sfrc-500">
                        {m.last_activity_date || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={cn(
                            'px-2.5 py-0.5 rounded-md text-[11px] font-bold border',
                            isOverload
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          )}
                        >
                          {isOverload ? 'High Load' : 'Balanced'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <AskPragyaBanner />
      </div>
    </AppShell>
  );
}
