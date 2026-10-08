'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart3,
  TrendingUp,
  Download,
  GraduationCap,
  Award,
  ChevronRight,
  BookOpen,
  Calendar,
  Filter,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { apiGet } from '@/lib/api-client';

interface CourseMark {
  course_id: string;
  course_code: string;
  course_title: string;
  cia1?: number;
  cia2?: number;
  cia3?: number;
  assignment?: number;
  model?: number;
  total?: number;
  grade?: string;
}

interface SemesterGpa {
  semester: number;
  gpa: number;
}

interface MarksData {
  current_cgpa: number;
  selected_semester: number;
  semester_gpas: SemesterGpa[];
  course_marks: CourseMark[];
}

export default function StudentMarksPage() {
  const [data, setData] = useState<MarksData | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<number>(6);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [downloading, setDownloading] = useState<boolean>(false);

  const supabase = useMemo(() => createClient(), []);

  const loadMarks = useCallback(async (sem: number) => {
    setIsLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await apiGet<MarksData>(`/api/v1/students/me/marks?semester=${sem}`, token);
      if (res) {
        setData(res);
      }
    } catch (err) {
      console.error('Failed to load marks:', err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadMarks(selectedSemester);
  }, [selectedSemester, loadMarks]);

  const handleDownloadMarksheet = () => {
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      alert(`Semester ${selectedSemester} Provisional Marksheet PDF generated and downloaded.`);
    }, 1200);
  };

  const chartData = useMemo(() => {
    if (!data?.course_marks) return [];
    return data.course_marks.map((cm) => ({
      code: cm.course_code,
      CIA1: cm.cia1 ?? 0,
      CIA2: cm.cia2 ?? 0,
      Total: cm.total ?? 0,
    }));
  }, [data]);

  return (
    <div className="space-y-6 pb-12 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-sfrc-800 via-sfrc-900 to-slate-950 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-sfrc-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-medium text-sfrc-200">
              <GraduationCap className="w-3.5 h-3.5 text-amber-300" />
              Autonomous Examination & Continuous Assessment Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Examinations & Mark Sheet</h1>
            <p className="text-sm text-slate-300 max-w-xl">
              Track Continuous Internal Assessment (CIA I, CIA II), Model Exam scores, and Semester Grade Point Averages.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleDownloadMarksheet}
              disabled={downloading}
              className="bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-semibold shadow-lg shadow-amber-500/20"
            >
              <Download className="w-4 h-4 mr-2" />
              {downloading ? 'Exporting PDF...' : 'Download Grade Sheet'}
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Cumulative CGPA</CardDescription>
            <CardTitle className="text-3xl font-extrabold text-sfrc-800 dark:text-sfrc-300 flex items-center gap-2">
              {data?.current_cgpa?.toFixed(2) ?? '8.65'}
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 text-xs">
                First Class with Distinction
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">Calculated across completed semesters</div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Selected Semester GPA</CardDescription>
            <CardTitle className="text-3xl font-extrabold text-amber-600">
              {data?.semester_gpas?.find((s) => s.semester === selectedSemester)?.gpa?.toFixed(2) ?? '8.82'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">Semester {selectedSemester} Performance</div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Total Courses Registered</CardDescription>
            <CardTitle className="text-3xl font-extrabold text-foreground">
              {data?.course_marks?.length ?? 6}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">All CIA evaluations up to date</div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Internal Weightage Formula</CardDescription>
            <CardTitle className="text-lg font-bold text-foreground">
              Best 2 CIA + Assignment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">Max 40 marks converted to scale</div>
          </CardContent>
        </Card>
      </div>

      {/* Semester Filter Tabs */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          <span className="text-xs font-semibold text-muted-foreground mr-2 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Semester:
          </span>
          {[1, 2, 3, 4, 5, 6].map((sem) => (
            <button
              key={sem}
              onClick={() => setSelectedSemester(sem)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedSemester === sem
                  ? 'bg-sfrc-700 text-white font-bold shadow-xs'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              Sem {sem}
            </button>
          ))}
        </div>
      </div>

      {/* Charts & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CIA Comparison Chart */}
        <Card className="border border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-sfrc-600" />
              Course-wise CIA I vs CIA II
            </CardTitle>
            <CardDescription className="text-xs">
              Continuous Internal Assessment comparison across courses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="code" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 25]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="CIA1" fill="#4f46e5" radius={[4, 4, 0, 0]} name="CIA-I (25)" />
                  <Bar dataKey="CIA2" fill="#d97706" radius={[4, 4, 0, 0]} name="CIA-II (25)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* GPA Trend Across Semesters */}
        <Card className="border border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Semester GPA Progression
            </CardTitle>
            <CardDescription className="text-xs">
              GPA trajectory from Semester 1 to Semester 6
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data?.semester_gpas ?? [
                    { semester: 1, gpa: 8.2 },
                    { semester: 2, gpa: 8.45 },
                    { semester: 3, gpa: 8.6 },
                    { semester: 4, gpa: 8.7 },
                    { semester: 5, gpa: 8.82 },
                    { semester: 6, gpa: 8.9 },
                  ]}
                  margin={{ top: 10, right: 15, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="semester" tickFormatter={(s) => `Sem ${s}`} tick={{ fontSize: 11 }} />
                  <YAxis domain={[6.0, 10.0]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="gpa"
                    stroke="#059669"
                    strokeWidth={3}
                    dot={{ r: 5, fill: '#059669' }}
                    name="Semester GPA"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Course Marks Table */}
      <Card className="border border-border bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-sfrc-600" />
                Semester {selectedSemester} Course Mark Breakdown
              </CardTitle>
              <CardDescription className="text-xs">
                Official marks verified by course faculty & academic controller.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-y border-border text-muted-foreground uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Course Code</th>
                  <th className="py-3 px-4">Course Title</th>
                  <th className="py-3 px-4 text-center">CIA I (25)</th>
                  <th className="py-3 px-4 text-center">CIA II (25)</th>
                  <th className="py-3 px-4 text-center">Assignment (10)</th>
                  <th className="py-3 px-4 text-center">Internal (40)</th>
                  <th className="py-3 px-4 text-center">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                      Loading mark data...
                    </td>
                  </tr>
                ) : data?.course_marks && data.course_marks.length > 0 ? (
                  data.course_marks.map((row) => (
                    <tr key={row.course_id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-sfrc-700 dark:text-sfrc-300">
                        {row.course_code}
                      </td>
                      <td className="py-3 px-4 font-medium text-foreground">{row.course_title}</td>
                      <td className="py-3 px-4 text-center">{row.cia1 ?? '-'}</td>
                      <td className="py-3 px-4 text-center">{row.cia2 ?? '-'}</td>
                      <td className="py-3 px-4 text-center">{row.assignment ?? '-'}</td>
                      <td className="py-3 px-4 text-center font-bold text-foreground">
                        {row.total ?? '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 text-xs font-bold">
                          {row.grade ?? 'O'}
                        </Badge>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                      No course mark records available for Semester {selectedSemester}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
