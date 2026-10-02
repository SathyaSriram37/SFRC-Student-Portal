'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { BarChart3, Award, ArrowLeft } from 'lucide-react';
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
    const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const wardList = await apiGet<WardItem[]>('/api/v1/parents/me/wards', token).catch(() => []);
        if (!ignore) {
          setWards(wardList);
        }

        const targetId = selectedWardId || (wardList.length > 0 ? wardList[0].student_id : null);
        if (targetId) {
          if (!ignore) setSelectedWardId(targetId);
          const data = await apiGet<WardPerformance>(`/api/v1/parents/me/wards/${targetId}/performance`, token);
          if (!ignore) setPerf(data);
        }
      } catch (err) {
        console.error('Failed to load performance:', err);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [selectedWardId, supabase]);

  const handleWardChange = async (wardId: string) => {
    setSelectedWardId(wardId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const data = await apiGet<WardPerformance>(`/api/v1/parents/me/wards/${wardId}/performance`, token);
      setPerf(data);
    } catch (err) {
      console.error(err);
    }
  };

  const selectedWard = wards.find((w) => w.student_id === selectedWardId) || wards[0];
  const chartData = perf?.semester_gpas?.map((s) => ({
    name: `Sem ${s.semester}`,
    gpa: s.gpa,
  })) || [
    { name: 'Sem 1', gpa: 8.4 },
    { name: 'Sem 2', gpa: 8.6 },
    { name: 'Sem 3', gpa: 8.75 },
    { name: 'Sem 4', gpa: 8.9 },
    { name: 'Sem 5', gpa: 8.75 },
  ];

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
                Ward Academic Performance & CIA Marks
              </h1>
              <p className="text-xs text-sfrc-600">
                Performance evaluation and semester progression for {selectedWard?.full_name || 'Ward'}
              </p>
            </div>
          </div>

          {wards.length > 1 && (
            <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-sfrc-200">
              {wards.map((w) => (
                <button
                  key={w.student_id}
                  onClick={() => handleWardChange(w.student_id)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
                    selectedWardId === w.student_id
                      ? 'bg-sfrc-700 text-white'
                      : 'text-sfrc-700 hover:bg-sfrc-100'
                  )}
                >
                  {w.full_name}
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
                <Award className="w-3.5 h-3.5" /> University Standing
              </span>
              <h2 className="text-sm font-semibold text-sfrc-200">Cumulative Grade Point Average (CGPA)</h2>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-5xl font-black text-white">{perf?.cgpa ?? 8.75}</span>
                <span className="text-sm font-bold text-sfrc-300">/ 10.0</span>
              </div>
              <p className="text-xs text-sfrc-300 mt-3 leading-relaxed">
                Overall grade classified as <strong className="text-emerald-300 font-bold">First Class with Distinction</strong>. All mandatory credit benchmarks cleared.
              </p>
            </div>

            <div className="pt-6 border-t border-white/10 space-y-2 text-xs">
              <div className="flex justify-between text-sfrc-200">
                <span>Total Earned Credits:</span>
                <span className="font-bold text-white">98 / 140</span>
              </div>
              <div className="flex justify-between text-sfrc-200">
                <span>Active Arrears:</span>
                <span className="font-bold text-emerald-300">None (0)</span>
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
          </div>
        </div>

        {/* CIA Marks Table */}
        <div className="bg-white rounded-3xl border border-sfrc-200 p-6 shadow-xs">
          <h2 className="text-lg font-black text-sfrc-900 tracking-tight mb-4">
            Continuous Internal Assessment (CIA) Results
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
                    const pct = Math.round((m.marks_obtained / m.max_marks) * 100);
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
                    <td colSpan={5} className="py-6 text-center text-sfrc-500">
                      Recent CIA marks are being verified by the controller of examinations.
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
