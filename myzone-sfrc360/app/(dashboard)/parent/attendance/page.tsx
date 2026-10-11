'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { ClipboardList, AlertTriangle, CheckCircle2, ArrowLeft, Loader2, Users } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import AskPragyaBanner from '@/components/shared/AskPragyaBanner';
import { createClient } from '@/lib/supabase/client';
import { apiGet } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface WardItem {
  student_id: string;
  full_name: string;
  register_number: string;
  current_semester: number;
  programme_name?: string;
  section?: string;
  batch?: string;
}

interface CourseAttendance {
  course_id?: string;
  course_code: string;
  course_title: string;
  total_classes: number;
  attended_classes: number;
  absent_classes?: number;
  percentage: number;
  status: string;
}

export default function ParentAttendancePage() {
  const [wards, setWards] = useState<WardItem[]>([]);
  const [selectedWardId, setSelectedWardId] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<CourseAttendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let ignore = false;
    (async () => {
      setIsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const wardList = await apiGet<WardItem[]>('/api/v1/parents/me/wards', token).catch(() => []);
        if (ignore) return;
        setWards(wardList || []);

        const targetId = selectedWardId || (wardList && wardList.length > 0 ? wardList[0].student_id : null);
        if (targetId) {
          setSelectedWardId(targetId);
          setIsLoadingAttendance(true);
          const data = await apiGet<CourseAttendance[]>(`/api/v1/parents/me/wards/${encodeURIComponent(targetId)}/attendance`, token);
          if (!ignore) setAttendance(data || []);
        }
      } catch (err) {
        console.error('Failed to load attendance:', err);
      } finally {
        if (!ignore) {
          setIsLoading(false);
          setIsLoadingAttendance(false);
        }
      }
    })();

    return () => {
      ignore = true;
    };
  }, [supabase]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleWardChange = async (wardId: string) => {
    if (wardId === selectedWardId) return;
    setSelectedWardId(wardId);
    setAttendance([]);
    setIsLoadingAttendance(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const data = await apiGet<CourseAttendance[]>(`/api/v1/parents/me/wards/${encodeURIComponent(wardId)}/attendance`, token);
      setAttendance(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingAttendance(false);
    }
  };

  if (isLoading) {
    return (
      <AppShell role="parent" userName="Parent">
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-sfrc-700" />
          <p className="text-xs font-semibold text-sfrc-600">Loading attendance records…</p>
        </div>
      </AppShell>
    );
  }

  if (wards.length === 0) {
    return (
      <AppShell role="parent" userName="Parent">
        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
          <div className="bg-white rounded-3xl border border-sfrc-200 p-8 sm:p-12 text-center shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-800 mb-4">
              <Users className="w-8 h-8" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-sfrc-900 tracking-tight">
              No Linked Students
            </h1>
            <p className="text-sm text-sfrc-600 mt-2 max-w-lg mx-auto">
              No students are linked to your parent account yet. Please contact the college administrator.
            </p>
          </div>
          <AskPragyaBanner />
        </div>
      </AppShell>
    );
  }

  const selectedWard = wards.find((w) => w.student_id === selectedWardId) || wards[0];
  const totalAttended = attendance.reduce((sum, c) => sum + (c.attended_classes || 0), 0);
  const totalHeld = attendance.reduce((sum, c) => sum + (c.total_classes || 0), 0);
  const totalAbsent = Math.max(0, totalHeld - totalAttended);
  const overallPct = totalHeld > 0 ? Math.round((totalAttended / totalHeld) * 1000) / 10 : 0;

  return (
    <AppShell role="parent" userName="Parent">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/parent/dashboard"
              className="w-10 h-10 rounded-2xl bg-white border border-sfrc-200 flex items-center justify-center text-sfrc-700 hover:bg-sfrc-50 transition-colors shadow-xs"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-sfrc-900 tracking-tight flex items-center gap-2">
                <ClipboardList className="w-6 h-6 text-sfrc-700" />
                Ward Course Attendance Records
              </h1>
              <p className="text-xs text-sfrc-600">
                Live attendance records for {selectedWard?.full_name} ({selectedWard?.register_number})
              </p>
            </div>
          </div>

          {/* Multi-Ward Switcher if 2+ */}
          {wards.length > 1 && (
            <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-sfrc-200">
              {wards.map((w) => (
                <button
                  key={w.student_id}
                  type="button"
                  onClick={() => handleWardChange(w.student_id)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                    selectedWardId === w.student_id
                      ? 'bg-sfrc-700 text-white shadow-xs'
                      : 'text-sfrc-700 hover:bg-sfrc-100'
                  )}
                >
                  {w.full_name} ({w.register_number})
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Overall Summary Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
            <p className="text-xs font-bold uppercase tracking-wider text-sfrc-600">Overall Attendance</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={cn(
                'text-3xl font-black',
                overallPct >= 75 ? 'text-emerald-700' : overallPct >= 65 ? 'text-amber-700' : 'text-red-600'
              )}>
                {totalHeld > 0 ? `${overallPct}%` : 'N/A'}
              </span>
              <span className="text-xs text-sfrc-500 font-medium">({totalAttended}/{totalHeld} Hours)</span>
            </div>
            <p className="text-[11px] text-sfrc-500 mt-1">
              Attended: <strong className="text-emerald-700 font-mono">{totalAttended}</strong> • Absent: <strong className="text-red-600 font-mono">{totalAbsent}</strong>
            </p>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
            <p className="text-xs font-bold uppercase tracking-wider text-sfrc-600">Exam Eligibility</p>
            <div className="mt-1 flex items-center gap-2">
              {totalHeld === 0 ? (
                <span className="text-xs text-sfrc-500 font-medium">No classes recorded yet</span>
              ) : overallPct >= 75 ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4" /> Eligible (No Condonation Fee)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-xl bg-red-50 text-red-700 border border-red-200">
                  <AlertTriangle className="w-4 h-4" /> Attendance Shortage
                </span>
              )}
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
            <p className="text-xs font-bold uppercase tracking-wider text-sfrc-600">Academic Standing</p>
            <p className="text-sm font-bold text-sfrc-900 mt-1.5">
              Semester {selectedWard?.current_semester || 1} • {selectedWard?.programme_name || 'Academic Course'}
            </p>
          </div>
        </div>

        {/* Subject Breakdown Table / Cards */}
        <div className="bg-white rounded-3xl border border-sfrc-200 p-6 shadow-xs">
          <h2 className="text-lg font-black text-sfrc-900 tracking-tight mb-4">
            Subject-Wise Attendance Details
          </h2>

          {isLoadingAttendance ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-sfrc-700" />
              <p className="text-xs text-sfrc-500">Loading course breakdown…</p>
            </div>
          ) : attendance.length === 0 ? (
            <div className="py-12 text-center text-xs text-sfrc-500 bg-sfrc-surface/50 rounded-2xl border border-dashed border-sfrc-200">
              No attendance records recorded for this ward yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-sfrc-200 text-sfrc-600 font-bold uppercase tracking-wider">
                    <th className="pb-3 px-3">Course Code</th>
                    <th className="pb-3 px-3">Course Title</th>
                    <th className="pb-3 px-3 text-center">Classes Held</th>
                    <th className="pb-3 px-3 text-center">Attended</th>
                    <th className="pb-3 px-3 text-center">Absent</th>
                    <th className="pb-3 px-3">Percentage & Progress</th>
                    <th className="pb-3 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sfrc-100">
                  {attendance.map((c) => {
                    const isGreen = c.percentage >= 75;
                    const isAmber = c.percentage >= 65 && c.percentage < 75;
                    const cAbsent = c.absent_classes ?? Math.max(0, c.total_classes - c.attended_classes);

                    return (
                      <tr key={c.course_code || c.course_id} className="hover:bg-sfrc-surface/60 transition-colors">
                        <td className="py-3.5 px-3 font-mono font-bold text-sfrc-900">{c.course_code}</td>
                        <td className="py-3.5 px-3 font-bold text-sfrc-900">{c.course_title}</td>
                        <td className="py-3.5 px-3 text-center font-mono">{c.total_classes}</td>
                        <td className="py-3.5 px-3 text-center font-mono font-bold text-emerald-800">{c.attended_classes}</td>
                        <td className="py-3.5 px-3 text-center font-mono text-red-600">{cAbsent}</td>
                        <td className="py-3.5 px-3 min-w-45">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-sfrc-200 h-2 rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  'h-full rounded-full',
                                  isGreen ? 'bg-emerald-500' : isAmber ? 'bg-amber-500' : 'bg-red-500'
                                )}
                                style={{ width: `${Math.min(c.percentage, 100)}%` }}
                              />
                            </div>
                            <span className="font-bold text-sfrc-900 font-mono w-12 text-right">
                              {c.total_classes > 0 ? `${c.percentage.toFixed(1)}%` : '—'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <span
                            className={cn(
                              'px-2.5 py-1 rounded-lg text-[11px] font-bold border',
                              c.total_classes === 0
                                ? 'bg-slate-100 text-slate-700 border-slate-200'
                                : isGreen
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : isAmber
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                            )}
                          >
                            {c.total_classes === 0 ? 'Not Started' : isGreen ? 'Regular' : isAmber ? 'At Risk' : 'Critical'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <AskPragyaBanner />
      </div>
    </AppShell>
  );
}
