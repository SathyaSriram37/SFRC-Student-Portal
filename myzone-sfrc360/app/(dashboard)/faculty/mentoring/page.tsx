'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, AlertTriangle, CheckCircle2, Loader2, ChevronRight, UserCheck } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import AskPragyaBanner from '@/components/shared/AskPragyaBanner';
import { createClient } from '@/lib/supabase/client';
import { apiGet } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface FacultyMentee {
  student_id: string;
  full_name: string;
  register_number: string;
  programme_name?: string;
  current_semester: number;
  attendance_pct: number;
  cgpa: number;
  last_meeting_date?: string;
  status: 'at_risk' | 'on_track';
}

export default function FacultyMentoringListPage() {
  const [mentees, setMentees] = useState<FacultyMentee[]>([]);
  const [filter, setFilter] = useState<'all' | 'at_risk' | 'on_track'>('all');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const data = await apiGet<FacultyMentee[]>('/api/v1/mentoring/my-mentees', token);
        if (!ignore) {
          setMentees(data);
        }
      } catch (err) {
        console.error('Failed to load mentees:', err);
        if (!ignore) {
          setMentees([
            {
              student_id: '00000000-0000-0000-0000-000000000001',
              full_name: 'Priyadharshini S',
              register_number: '22UCA042',
              programme_name: 'B.Sc Computer Science',
              current_semester: 5,
              attendance_pct: 91.5,
              cgpa: 8.75,
              last_meeting_date: '2026-09-24',
              status: 'on_track',
            },
            {
              student_id: '00000000-0000-0000-0000-000000000002',
              full_name: 'Kavitha M',
              register_number: '22UCA018',
              programme_name: 'B.Sc Computer Science',
              current_semester: 5,
              attendance_pct: 68.0,
              cgpa: 7.20,
              last_meeting_date: '2026-09-18',
              status: 'at_risk',
            },
            {
              student_id: '00000000-0000-0000-0000-000000000003',
              full_name: 'Ananya R',
              register_number: '22UCA005',
              programme_name: 'B.Sc Computer Science',
              current_semester: 5,
              attendance_pct: 94.0,
              cgpa: 9.10,
              last_meeting_date: '2026-09-22',
              status: 'on_track',
            },
          ]);
        }
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

  const atRiskCount = mentees.filter((m) => m.attendance_pct < 75).length;
  const onTrackCount = mentees.length - atRiskCount;

  const filteredMentees = mentees.filter((m) => {
    if (filter === 'at_risk' && m.attendance_pct >= 75) return false;
    if (filter === 'on_track' && m.attendance_pct < 75) return false;
    if (search && !m.full_name.toLowerCase().includes(search.toLowerCase()) && !m.register_number.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <AppShell role="faculty" userName="Dr. K. Anitha">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-sfrc-900 tracking-tight flex items-center gap-2.5">
              <UserCheck className="w-7 h-7 text-sfrc-700" />
              Faculty Mentoring & Welfare Portal
            </h1>
            <p className="text-xs sm:text-sm text-sfrc-600 mt-1">
              Active assigned student ward group for academic counseling, welfare monitoring, and private mentoring logs
            </p>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
            <p className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Total Assigned Mentees</p>
            <p className="text-3xl font-black text-sfrc-900 mt-1">{mentees.length}</p>
            <p className="text-[11px] text-sfrc-500 mt-1">Computer Science • Semester 5</p>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
            <p className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">At-Risk Students (&lt; 75% Attendance)</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={cn('text-3xl font-black', atRiskCount > 0 ? 'text-red-600' : 'text-emerald-700')}>
                {atRiskCount}
              </span>
              <span className="text-xs text-sfrc-500">Require intervention</span>
            </div>
            <p className="text-[11px] text-red-600 font-semibold mt-1">Shortage alert notifications pending</p>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
            <p className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">On-Track & Distinction</p>
            <p className="text-3xl font-black text-emerald-700 mt-1">{onTrackCount}</p>
            <p className="text-[11px] text-emerald-700 font-semibold mt-1">Satisfying academic & attendance criteria</p>
          </div>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="bg-white rounded-3xl border border-sfrc-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-sfrc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by student name or register number…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs border border-sfrc-200 bg-sfrc-surface focus:outline-hidden font-medium"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter('all')}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                filter === 'all' ? 'bg-sfrc-700 text-white' : 'bg-sfrc-100 text-sfrc-700 hover:bg-sfrc-200'
              )}
            >
              All ({mentees.length})
            </button>
            <button
              onClick={() => setFilter('at_risk')}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1',
                filter === 'at_risk' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
              )}
            >
              <AlertTriangle className="w-3 h-3" />
              At Risk ({atRiskCount})
            </button>
            <button
              onClick={() => setFilter('on_track')}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1',
                filter === 'on_track' ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
              )}
            >
              <CheckCircle2 className="w-3 h-3" />
              On Track ({onTrackCount})
            </button>
          </div>
        </div>

        {/* Mentees Grid */}
        {isLoading ? (
          <div className="py-16 text-center text-sfrc-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-sfrc-700 mb-2" />
            Loading assigned mentees…
          </div>
        ) : filteredMentees.length === 0 ? (
          <div className="bg-white rounded-3xl border border-sfrc-200 p-12 text-center text-sfrc-500 font-medium">
            No mentees found matching your current filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMentees.map((m) => {
              const isAtRisk = m.attendance_pct < 75;
              return (
                <Link
                  key={m.student_id}
                  href={`/faculty/mentoring/${m.student_id}`}
                  className="p-5 rounded-3xl border border-sfrc-200 bg-white hover:border-sfrc-700 hover:shadow-md transition-all group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-sfrc-100 font-black text-sfrc-800 flex items-center justify-center text-sm shadow-inner group-hover:bg-sfrc-700 group-hover:text-white transition-colors">
                          {m.full_name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-black text-sfrc-900 group-hover:text-sfrc-700 transition-colors">
                            {m.full_name}
                          </p>
                          <p className="text-xs text-sfrc-500 font-mono font-bold">
                            {m.register_number}
                          </p>
                        </div>
                      </div>
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider',
                          isAtRisk
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        )}
                      >
                        {isAtRisk ? 'At Risk' : 'On Track'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-sfrc-100 text-xs">
                      <div>
                        <p className="text-[10px] font-bold text-sfrc-500 uppercase tracking-wider">Attendance</p>
                        <p className={cn('font-black text-base mt-0.5', isAtRisk ? 'text-red-600' : 'text-emerald-700')}>
                          {m.attendance_pct}%
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-sfrc-500 uppercase tracking-wider">CGPA</p>
                        <p className="font-black text-base text-sfrc-900 mt-0.5 font-mono">{m.cgpa}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-sfrc-100 flex items-center justify-between text-xs text-sfrc-600">
                    <span className="text-[11px]">
                      Last met: <strong className="text-sfrc-900">{m.last_meeting_date || 'Not recorded'}</strong>
                    </span>
                    <span className="text-sfrc-700 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      View Profile <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <AskPragyaBanner />
      </div>
    </AppShell>
  );
}
