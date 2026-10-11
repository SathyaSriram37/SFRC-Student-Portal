'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { BarChart3, Award, ArrowLeft, Loader2, Users, BookOpen } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
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
}

interface SemesterGpa {
  semester: number;
  gpa: number;
}

interface CourseMark {
  course_code: string;
  course_title: string;
  assessment_type: string;
  marks_obtained: number;
  max_marks: number;
  percentage?: number;
  semester?: number;
  academic_year?: string;
}

interface WardPerformance {
  cgpa: number;
  semester_gpas: SemesterGpa[];
  course_marks: CourseMark[];
}

export default function ParentPerformancePage() {
  const [wards, setWards] = useState<WardItem[]>([]);
  const [selectedWardId, setSelectedWardId] = useState<string | null>(null);
  const [perf, setPerf] = useState<WardPerformance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPerf, setIsLoadingPerf] = useState(false);

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
          setIsLoadingPerf(true);
          const data = await apiGet<WardPerformance>(`/api/v1/parents/me/wards/${encodeURIComponent(targetId)}/performance`, token);
          if (!ignore) setPerf(data);
        }
      } catch (err) {
        console.error('Failed to load performance:', err);
      } finally {
        if (!ignore) {
          setIsLoading(false);
          setIsLoadingPerf(false);
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
    setPerf(null);
    setIsLoadingPerf(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const data = await apiGet<WardPerformance>(`/api/v1/parents/me/wards/${encodeURIComponent(wardId)}/performance`, token);
      setPerf(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingPerf(false);
    }
  };

  if (isLoading) {
    return (
      <AppShell role="parent" userName="Parent">
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-sfrc-700" />
          <p className="text-xs font-semibold text-sfrc-600">Loading performance data…</p>
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
  const semesterGpas = perf?.semester_gpas || [];
  const hasMarksData = semesterGpas.length > 0;
  const chartData = semesterGpas.map((s) => ({
    name: `Sem ${s.semester}`,
    gpa: Number(s.gpa.toFixed(2)),
  }));

  return (
    <AppShell role="parent" userName="Parent">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
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
                <BarChart3 className="w-6 h-6 text-sfrc-700" />
                Ward Academic Performance & Assessment Marks
              </h1>
              <p className="text-xs text-sfrc-600">
                Performance evaluation and semester progression for {selectedWard?.full_name} ({selectedWard?.register_number})
              </p>
            </div>
          </div>

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

        {/* CGPA Summary Banner & Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-linear-to-br from-sfrc-800 to-sfrc-950 text-white rounded-3xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-md bg-white/10 text-sfrc-gold uppercase tracking-wider mb-3">
                <Award className="w-3.5 h-3.5" /> Academic Evaluation
              </span>
              <h2 className="text-sm font-semibold text-sfrc-200">Cumulative Grade Point Average (CGPA)</h2>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-5xl font-black text-white">
                  {perf?.cgpa && perf.cgpa > 0 ? perf.cgpa.toFixed(2) : 'N/A'}
                </span>
                {perf?.cgpa && perf.cgpa > 0 ? (
                  <span className="text-sm font-bold text-sfrc-300">/ 10.0</span>
                ) : null}
              </div>
              <p className="text-xs text-sfrc-300 mt-3 leading-relaxed">
                {perf?.cgpa && perf.cgpa >= 8.0
                  ? 'First Class with Distinction'
                  : perf?.cgpa && perf.cgpa >= 6.0
                  ? 'First Class Standing'
                  : perf?.cgpa && perf.cgpa > 0
                  ? 'Satisfactory Academic Performance'
                  : 'No marks published for this ward yet.'}
              </p>
            </div>

            <div className="pt-6 border-t border-white/10 space-y-2 text-xs">
              <div className="flex justify-between text-sfrc-200">
                <span>Published Semesters:</span>
                <span className="font-bold text-white font-mono">{semesterGpas.length} Semesters</span>
              </div>
              <div className="flex justify-between text-sfrc-200">
                <span>Academic Office:</span>
                <span className="font-bold text-sfrc-gold">Autonomous Examination Cell</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 bg-white rounded-3xl border border-sfrc-200 p-6 shadow-xs">
            <h2 className="text-lg font-black text-sfrc-900 tracking-tight mb-1">
              Semester-wise GPA Progression
            </h2>
            <p className="text-xs text-sfrc-600 mb-6">
              Continuous assessment performance across all completed semesters
            </p>

            {isLoadingPerf ? (
              <div className="h-64 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-sfrc-700" />
                <p className="text-xs text-sfrc-500">Loading semester marks…</p>
              </div>
            ) : hasMarksData ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }} tickLine={false} />
                    <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }} tickLine={false} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-sfrc-900 text-white px-3 py-2 rounded-xl text-xs shadow-lg">
                              <p className="font-bold">{label}</p>
                              <p className="text-sfrc-gold mt-0.5 font-mono">GPA: {Number(payload[0].value).toFixed(2)}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="gpa" radius={[8, 8, 0, 0]} maxBarSize={48}>
                      {chartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={index === chartData.length - 1 ? '#0C4A60' : '#45B69C'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center p-6 text-center bg-sfrc-surface/50 rounded-2xl border border-dashed border-sfrc-200">
                <BookOpen className="w-8 h-8 text-sfrc-400 mb-2" />
                <p className="text-xs font-bold text-sfrc-800">No Semester Marks Recorded</p>
                <p className="text-[11px] text-sfrc-500 mt-1 max-w-xs">
                  Continuous internal assessments or semester results have not yet been entered for this ward.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Assessment Marks Table */}
        <div className="bg-white rounded-3xl border border-sfrc-200 p-6 shadow-xs">
          <h2 className="text-lg font-black text-sfrc-900 tracking-tight mb-4">
            Course-Wise Assessment Marks
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-sfrc-200 text-sfrc-600 font-bold uppercase tracking-wider">
                  <th className="pb-3 px-3">Course Code</th>
                  <th className="pb-3 px-3">Course Title</th>
                  <th className="pb-3 px-3">Assessment Type</th>
                  <th className="pb-3 px-3 text-center">Score</th>
                  <th className="pb-3 px-3 text-center">Percentage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sfrc-100">
                {perf?.course_marks && perf.course_marks.length > 0 ? (
                  perf.course_marks.map((m, idx) => {
                    const pct = m.max_marks > 0 ? Math.round((m.marks_obtained / m.max_marks) * 100) : 0;
                    return (
                      <tr key={idx} className="hover:bg-sfrc-surface/60 transition-colors">
                        <td className="py-3.5 px-3 font-mono font-bold text-sfrc-900">{m.course_code}</td>
                        <td className="py-3.5 px-3 font-bold text-sfrc-900">{m.course_title}</td>
                        <td className="py-3.5 px-3">
                          <span className="px-2 py-0.5 rounded bg-sfrc-100 text-sfrc-800 font-semibold text-[11px]">
                            {m.assessment_type}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono font-bold text-sfrc-900">
                          {m.marks_obtained} / {m.max_marks}
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono font-bold text-emerald-700">
                          {pct}%
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sfrc-500">
                      No assessment marks published for this ward yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <AskPragyaBanner />
      </div>
    </AppShell>
  );
}
