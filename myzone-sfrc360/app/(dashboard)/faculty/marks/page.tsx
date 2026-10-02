'use client';

import { useState, useEffect, useMemo } from 'react';

import { BarChart3, Save, Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';
import AppShell from '@/components/layout/AppShell';
import AskPragyaBanner from '@/components/shared/AskPragyaBanner';
import { createClient } from '@/lib/supabase/client';
import { apiGet, apiPost } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface FacultyCourse {
  id: string;
  code: string;
  title: string;
  programme_name?: string;
  semester: number;
  department_name?: string;
  total_students: number;
}

interface StudentRosterItem {
  student_id: string;
  register_number: string;
  full_name: string;
  avatar_url?: string;
  current_semester: number;
}

const ASSESSMENT_TYPES = [
  { id: 'CIA1', label: 'CIA 1 (Continuous Assessment 1)', maxMarks: 25 },
  { id: 'CIA2', label: 'CIA 2 (Continuous Assessment 2)', maxMarks: 25 },
  { id: 'CIA3', label: 'CIA 3 (Continuous Assessment 3)', maxMarks: 25 },
  { id: 'Model', label: 'Model Examination', maxMarks: 100 },
  { id: 'Assignment', label: 'Course Assignment / Seminar', maxMarks: 15 },
  { id: 'Practical', label: 'Laboratory Practical Exam', maxMarks: 50 },
];

export default function FacultyMarksEntryPage() {
  const [courses, setCourses] = useState<FacultyCourse[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [assessmentType, setAssessmentType] = useState<string>('CIA1');
  const [academicYear, setAcademicYear] = useState<string>('2026-2027');
  const [semester, setSemester] = useState<number>(6);

  const [roster, setRoster] = useState<StudentRosterItem[]>([]);
  const [marksMap, setMarksMap] = useState<Record<string, string>>({});
    const [isLoadingRoster, setIsLoadingRoster] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  const selectedAssessment = useMemo(() => {
    return ASSESSMENT_TYPES.find((a) => a.id === assessmentType) || ASSESSMENT_TYPES[0];
  }, [assessmentType]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const courseList = await apiGet<FacultyCourse[]>('/api/v1/faculty/me/courses', token);
        if (!ignore) {
          setCourses(courseList);
          if (courseList.length > 0) {
            setSelectedCourseId(courseList[0].id);
            setSemester(courseList[0].semester);
          }
        }
      } catch (err) {
        console.error('Failed to load faculty courses for marks:', err);
        if (!ignore) {
          const fallbackCourses: FacultyCourse[] = [
            { id: 'c-1', code: '22UCSC61', title: 'Cloud Architecture & DevOps', semester: 6, total_students: 42 },
            { id: 'c-2', code: '22PCSC21', title: 'Advanced Machine Learning', semester: 2, total_students: 28 },
          ];
          setCourses(fallbackCourses);
          setSelectedCourseId('c-1');
        }
      }
    })();

    return () => {
      ignore = true;
    };
  }, [supabase]);

  const handleLoadStudents = async () => {
    if (!selectedCourseId) return;

    try {
      setIsLoadingRoster(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const students = await apiGet<StudentRosterItem[]>(
        `/api/v1/faculty/courses/${selectedCourseId}/students`,
        token
      );
      setRoster(students);

      // Initialize empty marks
      const initialMap: Record<string, string> = {};
      students.forEach((s) => {
        initialMap[s.student_id] = '';
      });
      setMarksMap(initialMap);
      toast.info(`Loaded ${students.length} students for ${selectedAssessment.id} marks entry.`);
    } catch (err) {
      console.error('Failed to load roster for marks:', err);
      const demoStudents: StudentRosterItem[] = [
        { student_id: 's-1', register_number: '22UCA001', full_name: 'Abinaya R', current_semester: 6 },
        { student_id: 's-2', register_number: '22UCA002', full_name: 'Bhavani M', current_semester: 6 },
        { student_id: 's-3', register_number: '22UCA003', full_name: 'Deepika K', current_semester: 6 },
        { student_id: 's-4', register_number: '22UCA004', full_name: 'Divya S', current_semester: 6 },
        { student_id: 's-5', register_number: '22UCA005', full_name: 'Gayathri P', current_semester: 6 },
        { student_id: 's-6', register_number: '22UCA006', full_name: 'Harini V', current_semester: 6 },
      ];
      setRoster(demoStudents);
      const initialMap: Record<string, string> = {};
      demoStudents.forEach((s) => {
        initialMap[s.student_id] = '';
      });
      setMarksMap(initialMap);
    } finally {
      setIsLoadingRoster(false);
    }
  };

  const handleMarkChange = (studentId: string, val: string) => {
    setMarksMap((prev) => ({ ...prev, [studentId]: val }));
  };

  const handleSubmitMarks = async () => {
    if (roster.length === 0) {
      toast.error('No student marks to submit.');
      return;
    }

    const records = [];
    const maxM = selectedAssessment.maxMarks;

    for (const student of roster) {
      const markStr = marksMap[student.student_id];
      if (markStr === '' || markStr === undefined) {
        toast.error(`Please enter marks for ${student.full_name} (${student.register_number}).`);
        return;
      }

      const markNum = parseFloat(markStr);
      if (isNaN(markNum) || markNum < 0 || markNum > maxM) {
        toast.error(`Invalid marks for ${student.full_name}: must be between 0 and ${maxM}.`);
        return;
      }

      records.push({
        student_id: student.student_id,
        marks_obtained: markNum,
        max_marks: maxM,
      });
    }

    try {
      setIsSubmitting(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const payload = {
        course_id: selectedCourseId,
        assessment_type: assessmentType,
        academic_year: academicYear,
        semester,
        records,
      };

      await apiPost('/api/v1/marks/enter', payload, token);
      toast.success(`Successfully saved ${records.length} assessment marks!`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit marks.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell role="faculty" userName="Faculty">
      <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white p-6 rounded-3xl border border-sfrc-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sfrc-100 text-sfrc-700 text-xs font-bold uppercase tracking-wider mb-2">
              <BarChart3 className="w-3.5 h-3.5" />
              Faculty Assessment Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-sfrc-900 tracking-tight">
              CIA Marks Entry & Grading
            </h1>
            <p className="text-xs sm:text-sm text-sfrc-600 mt-1">
              Enter Continuous Internal Assessment, Model, and Lab practical scores with automatic boundary checks.
            </p>
          </div>
        </div>

        {/* Step 1: Course & Assessment Selection */}
        <div className="bg-white rounded-3xl border border-sfrc-200 p-6 shadow-sm space-y-5">
          <h2 className="text-sm font-bold text-sfrc-900 uppercase tracking-wider">
            Step 1: Assessment Configuration
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-sfrc-700 uppercase tracking-wider">
                Course
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => {
                  setSelectedCourseId(e.target.value);
                  const found = courses.find((c) => c.id === e.target.value);
                  if (found) setSemester(found.semester);
                }}
                className="w-full px-4 py-2.5 rounded-xl border border-sfrc-200 bg-sfrc-surface text-sfrc-900 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sfrc-accent/40"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.title} (Sem {c.semester})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-sfrc-700 uppercase tracking-wider">
                Assessment Type
              </label>
              <select
                value={assessmentType}
                onChange={(e) => setAssessmentType(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-sfrc-200 bg-sfrc-surface text-sfrc-900 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sfrc-accent/40"
              >
                {ASSESSMENT_TYPES.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-sfrc-700 uppercase tracking-wider">
                Academic Year
              </label>
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-sfrc-200 bg-sfrc-surface text-sfrc-900 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sfrc-accent/40"
              >
                <option value="2026-2027">2026-2027 (Current)</option>
                <option value="2025-2026">2025-2026</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex justify-between items-center">
            <span className="text-xs font-bold text-sfrc-700 bg-sfrc-gold/20 px-3 py-1 rounded-full">
              Maximum Marks for {selectedAssessment.id}: {selectedAssessment.maxMarks} Points
            </span>
            <button
              type="button"
              onClick={handleLoadStudents}
              disabled={isLoadingRoster || !selectedCourseId}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-sfrc-700 hover:bg-sfrc-800 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoadingRoster ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
              Load Student Mark Sheet
            </button>
          </div>
        </div>

        {/* Step 2: Student Score Entry Table */}
        {roster.length > 0 && (
          <div className="bg-white rounded-3xl border border-sfrc-200 p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-sfrc-100">
              <div>
                <h2 className="text-base font-black text-sfrc-900 tracking-tight">
                  Student Score Sheet ({roster.length} Enrolled)
                </h2>
                <p className="text-xs text-sfrc-500">
                  Use the Tab key to navigate rapidly across rows. Boundary validation (0 to {selectedAssessment.maxMarks}) is enforced.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-sfrc-200 text-sfrc-600 font-bold uppercase tracking-wider text-[10px]">
                    <th className="pb-3">Register No</th>
                    <th className="pb-3">Student Name</th>
                    <th className="pb-3 text-center">Semester</th>
                    <th className="pb-3 text-right">Marks Obtained (Out of {selectedAssessment.maxMarks})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sfrc-100">
                  {roster.map((student) => {
                    const currentVal = marksMap[student.student_id] || '';
                    const numVal = parseFloat(currentVal);
                    const isInvalid = currentVal !== '' && (isNaN(numVal) || numVal < 0 || numVal > selectedAssessment.maxMarks);

                    return (
                      <tr key={student.student_id} className="hover:bg-sfrc-surface transition-colors">
                        <td className="py-3 font-bold text-sfrc-800">
                          {student.register_number}
                        </td>
                        <td className="py-3 font-semibold text-sfrc-900">
                          {student.full_name}
                        </td>
                        <td className="py-3 text-center text-sfrc-600">
                          Sem {student.current_semester}
                        </td>
                        <td className="py-3 text-right">
                          <div className="inline-flex items-center gap-2">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              max={selectedAssessment.maxMarks}
                              value={currentVal}
                              onChange={(e) => handleMarkChange(student.student_id, e.target.value)}
                              placeholder={`0 - ${selectedAssessment.maxMarks}`}
                              className={cn(
                                'w-28 px-3 py-1.5 rounded-xl border text-xs text-right font-bold transition-all focus:outline-none focus:ring-2',
                                isInvalid
                                  ? 'border-red-500 bg-red-50 text-red-900 focus:ring-red-400'
                                  : 'border-sfrc-200 bg-sfrc-surface text-sfrc-900 focus:ring-sfrc-accent/40'
                              )}
                            />
                            <span className="text-[11px] font-semibold text-sfrc-400">
                              / {selectedAssessment.maxMarks}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Submit Action Bar */}
            <div className="pt-4 border-t border-sfrc-200 flex items-center justify-between">
              <p className="text-xs text-sfrc-500">
                Saving publishes results to the student examination portal immediately.
              </p>
              <button
                type="button"
                onClick={handleSubmitMarks}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-sfrc-700 hover:bg-sfrc-800 text-white font-bold text-sm shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Submit Final Marks
              </button>
            </div>
          </div>
        )}

        {/* Bottom: Ask Pragya Banner */}
        <AskPragyaBanner />
      </div>
    </AppShell>
  );
}
