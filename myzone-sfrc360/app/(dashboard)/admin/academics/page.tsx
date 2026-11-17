'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  BookOpen,
  Users,
  Search,
  PlusCircle,
  FileCheck,
  Calendar,
  Layers,
  Award,
  ChevronRight,
  Clock,
  Building2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Download,
  Filter,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import AskPragyaBanner from '@/components/shared/AskPragyaBanner';
import { createClient } from '@/lib/supabase/client';
import { apiGet, apiPost } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface ProgrammeItem {
  id: string;
  name: string;
  code: string;
  degree_level: string; // UG / PG / Ph.D
  department: string;
  sanctioned_intake: number;
  enrolled_count: number;
  hod_name: string;
  regulation_batch: string;
}

interface CourseItem {
  id: string;
  code: string;
  title: string;
  department: string;
  semester: number;
  credits: number;
  hours_per_week: number;
  course_type: string; // Core / Elective / Skill-Based / NME
  faculty_name: string;
  syllabus_status: 'Approved' | 'Draft' | 'Under Review';
}

const DEFAULT_PROGRAMMES: ProgrammeItem[] = [];

export default function AdminAcademicsPage() {
  const [activeTab, setActiveTab] = useState<'programmes' | 'courses' | 'assignments' | 'bos' | 'curriculum'>('programmes');
  const [searchTerm, setSearchTerm] = useState('');
  const [degreeFilter, setDegreeFilter] = useState('ALL');
  const [programmes, setProgrammes] = useState<ProgrammeItem[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Modal States
  const [isAddProgOpen, setIsAddProgOpen] = useState(false);
  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false);

  // Form States
  const [progForm, setProgForm] = useState({
    name: '',
    code: '',
    degree_level: 'UG',
    sanctioned_intake: 60,
    regulation_batch: '2023 - 2026 (OBE)',
  });

  const [courseForm, setCourseForm] = useState({
    code: '',
    title: '',
    semester: 1,
    credits: 4,
    hours_per_week: 5,
    course_type: 'Major Core',
  });

  // Module 2.5: Academic Assignment Management State
  const [departmentsList, setDepartmentsList] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [facultyList, setFacultyList] = useState<Array<{ id: string; full_name: string; employee_id?: string; department_name?: string }>>([]);
  const [assignForm, setAssignForm] = useState({
    department: '',
    academic_year: '2025-2026',
    semester: 4,
    course_code: '',
    faculty_id: '',
  });

  const [assignments, setAssignments] = useState<any[]>([]);

  const supabase = useMemo(() => createClient(), []);

  // Fetch live programmes & courses & departments & faculty from DB
  const loadAcademics = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const [progRes, courseRes, deptRes, facRes] = await Promise.allSettled([
        apiGet<ProgrammeItem[]>('/api/v1/admin/academics/programmes', token),
        apiGet<CourseItem[]>('/api/v1/admin/academics/courses', token),
        apiGet<Array<{ id: string; name: string; code: string }>>('/api/v1/admin/departments', token),
        apiGet<{ data: Array<any> }>('/api/v1/admin/users?role=faculty&limit=100', token),
      ]);

      if (progRes.status === 'fulfilled' && progRes.value && progRes.value.length > 0) {
        setProgrammes(progRes.value);
      }
      if (courseRes.status === 'fulfilled' && courseRes.value && courseRes.value.length > 0) {
        setCourses(courseRes.value);
        if (courseRes.value.length > 0) {
          const mapped = courseRes.value
            .filter((c: any) => c.faculty_name && c.faculty_name !== 'Allocated Faculty' && c.faculty_name !== 'Unassigned')
            .map((c: any) => ({
              id: `asgn-${c.id}`,
              code: c.code,
              title: c.title,
              department: c.department,
              semester: c.semester,
              faculty_name: c.faculty_name,
              academic_year: '2025-2026',
              hours: c.hours_per_week || 5,
              status: 'Active',
            }));
          if (mapped.length > 0) {
            setAssignments(mapped);
          }
        }
      }
      if (deptRes.status === 'fulfilled' && deptRes.value) {
        setDepartmentsList(deptRes.value);
      }
      if (facRes.status === 'fulfilled' && facRes.value?.data) {
        setFacultyList(facRes.value.data);
      }
    } catch (err) {
      console.error('Failed to load academic data from DB:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.course_code || !assignForm.faculty_id) {
      toast.error('Please select both a course code and a faculty member.');
      return;
    }
    try {
      setSubmitting(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res: any = await apiPost('/api/v1/admin/academics/courses/assign', {
        course_id: assignForm.course_code,
        faculty_id: assignForm.faculty_id,
        academic_year: assignForm.academic_year,
      }, token);
      toast.success(res?.message || 'Faculty assigned to course successfully!');
      await loadAcademics();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to assign faculty to course');
    } finally {
      setSubmitting(false);
    }
  };


  useEffect(() => {
    loadAcademics();
  }, [supabase]);

  // Handle Programme Submit
  const handleCreateProgramme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!progForm.name || !progForm.code) {
      toast.error('Please provide Programme Name and Code.');
      return;
    }
    try {
      setSubmitting(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      await apiPost('/api/v1/admin/academics/programmes', progForm, token);
      toast.success(`Programme "${progForm.name}" created and saved to database!`);
      setIsAddProgOpen(false);
      setProgForm({ name: '', code: '', degree_level: 'UG', sanctioned_intake: 60, regulation_batch: '2023 - 2026 (OBE)' });
      loadAcademics();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create programme in database.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Course Submit
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseForm.code || !courseForm.title) {
      toast.error('Please enter Course Code and Title.');
      return;
    }
    try {
      setSubmitting(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      await apiPost('/api/v1/admin/academics/courses', courseForm, token);
      toast.success(`Course "${courseForm.title}" registered in curriculum database!`);
      setIsAddCourseOpen(false);
      setCourseForm({ code: '', title: '', semester: 1, credits: 4, hours_per_week: 5, course_type: 'Major Core' });
      loadAcademics();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to register course in database.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered Programmes
  const filteredProgrammes = useMemo(() => {
    return programmes.filter((p) => {
      const matchDegree = degreeFilter === 'ALL' || p.degree_level === degreeFilter;
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.department && p.department.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchDegree && matchSearch;
    });
  }, [programmes, degreeFilter, searchTerm]);

  // Filtered Courses
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      return (
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.department && c.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.faculty_name && c.faculty_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    });
  }, [courses, searchTerm]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* ── Top Header Banner ──────────────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-3xl border border-sfrc-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sfrc-100 text-sfrc-700 text-xs font-bold uppercase tracking-wider mb-2">
            <GraduationCap className="w-3.5 h-3.5" />
            Autonomous Academic Council & Curriculum Cell
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-sfrc-900 tracking-tight">
            Academic Operations & Curriculum Hub
          </h1>
          <p className="text-xs sm:text-sm text-sfrc-600 mt-1">
            Manage degree programmes, Board of Studies (BOS) syllabus approvals, and faculty course allocations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAddCourseOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-sfrc-200 bg-sfrc-50 text-sfrc-800 text-xs font-bold hover:bg-sfrc-100 transition-colors shadow-2xs cursor-pointer"
          >
            <BookOpen className="w-4 h-4" />
            <span>Add Course</span>
          </button>
          <button
            onClick={() => setIsAddProgOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sfrc-700 text-white text-xs font-bold hover:bg-sfrc-800 transition-colors shadow-sm cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Programme</span>
          </button>
        </div>
      </div>

      {/* ── Metric Summary Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Active Programmes</span>
            <div className="w-8 h-8 rounded-xl bg-sfrc-100 flex items-center justify-center text-sfrc-700">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-sfrc-900 mt-2 font-mono">28</p>
          <p className="text-xs text-sfrc-600 mt-0.5 font-medium">18 UG • 8 PG • 2 Ph.D</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Total Courses</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2 font-mono">246</p>
          <p className="text-xs text-sfrc-600 mt-0.5 font-medium">Outcome Based Education</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Faculty Allocations</span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-blue-700 mt-2 font-mono">186</p>
          <p className="text-xs text-sfrc-600 mt-0.5 font-medium">100% Workload Assigned</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">BOS Regulation</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-amber-700 mt-2 font-mono">2023 - 2026</p>
          <p className="text-xs text-sfrc-600 mt-0.5 font-medium">NAAC 'A++' Accredited</p>
        </div>
      </div>

      {/* ── Navigation Tabs ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 border-b border-sfrc-200">
        {[
          { id: 'programmes', label: 'Programmes & Sanctioned Intake', icon: GraduationCap },
          { id: 'courses', label: 'Course Catalogue & Allocations', icon: BookOpen },
          { id: 'assignments', label: 'Faculty–Subject Allocations (2.5)', icon: Users },
          { id: 'bos', label: 'Board of Studies (BOS) Approvals', icon: FileCheck },
          { id: 'curriculum', label: 'Academic Regulations & Credits', icon: Layers },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-150',
                isActive
                  ? 'bg-sfrc-700 text-white shadow-sm'
                  : 'text-sfrc-700 hover:bg-sfrc-100 hover:text-sfrc-900'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Search & Degree Level Filter ──────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-sfrc-200">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-sfrc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by code, title, or department..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-sfrc-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sfrc-500"
          />
        </div>

        {activeTab === 'programmes' && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-bold text-sfrc-600">Level:</span>
            {['ALL', 'UG', 'PG'].map((deg) => (
              <button
                key={deg}
                onClick={() => setDegreeFilter(deg)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors',
                  degreeFilter === deg
                    ? 'bg-sfrc-900 text-white'
                    : 'bg-sfrc-100 text-sfrc-700 hover:bg-sfrc-200'
                )}
              >
                {deg}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── TAB 1: PROGRAMMES DIRECTORY ───────────────────────────────────── */}
      {activeTab === 'programmes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProgrammes.map((prog) => {
            const occupancyPct = Math.round((prog.enrolled_count / prog.sanctioned_intake) * 100);
            return (
              <div
                key={prog.id}
                className="bg-white rounded-3xl border border-sfrc-200 p-6 shadow-sm hover:border-sfrc-400 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-md bg-sfrc-100 text-sfrc-800 font-mono font-bold text-xs">
                      {prog.code}
                    </span>
                    <span
                      className={cn(
                        'px-2.5 py-0.5 rounded-full text-xs font-bold',
                        prog.degree_level === 'UG'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-violet-100 text-violet-800'
                      )}
                    >
                      {prog.degree_level} Programme
                    </span>
                  </div>

                  <h3 className="text-base font-black text-sfrc-900 tracking-tight leading-snug">
                    {prog.name}
                  </h3>
                  <p className="text-xs text-sfrc-600">{prog.department}</p>

                  <div className="pt-2 border-t border-sfrc-100 space-y-1.5 text-xs text-sfrc-700">
                    <p>
                      <span className="font-semibold text-sfrc-500">Head of Dept:</span>{' '}
                      <span className="font-bold text-sfrc-900">{prog.hod_name}</span>
                    </p>
                    <p>
                      <span className="font-semibold text-sfrc-500">Regulation:</span>{' '}
                      <span className="font-mono font-medium text-sfrc-800">{prog.regulation_batch}</span>
                    </p>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-sfrc-100 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-sfrc-600 font-medium">Enrolment Seat Fill:</span>
                    <span className="font-bold text-sfrc-900 font-mono">
                      {prog.enrolled_count} / {prog.sanctioned_intake} ({occupancyPct}%)
                    </span>
                  </div>
                  <div className="w-full bg-sfrc-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        occupancyPct >= 90 ? 'bg-emerald-600' : 'bg-sfrc-700'
                      )}
                      style={{ width: `${occupancyPct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── TAB 2: COURSE CATALOGUE & ALLOCATIONS ─────────────────────────── */}
      {activeTab === 'courses' && (
        <div className="bg-white rounded-3xl border border-sfrc-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-sfrc-200 bg-sfrc-50/50 flex items-center justify-between">
            <h3 className="text-sm font-black text-sfrc-900 uppercase tracking-wider">
              Autonomous Course Catalogue & Instructor Matrix
            </h3>
            <span className="text-xs font-bold text-sfrc-600 font-mono">
              {filteredCourses.length} Courses Listed
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-sfrc-100/70 text-sfrc-800 font-bold border-b border-sfrc-200 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Course Code</th>
                  <th className="px-5 py-3">Course Title</th>
                  <th className="px-5 py-3">Department</th>
                  <th className="px-5 py-3">Sem</th>
                  <th className="px-5 py-3">Credits</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Assigned Faculty</th>
                  <th className="px-5 py-3">Syllabus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sfrc-100 font-medium text-sfrc-900">
                {filteredCourses.map((c) => (
                  <tr key={c.id} className="hover:bg-sfrc-50/70 transition-colors">
                    <td className="px-5 py-3 font-mono font-bold text-sfrc-700">{c.code}</td>
                    <td className="px-5 py-3 font-bold text-sfrc-950">{c.title}</td>
                    <td className="px-5 py-3 text-sfrc-700">{c.department}</td>
                    <td className="px-5 py-3 font-mono">Sem {c.semester}</td>
                    <td className="px-5 py-3 font-mono font-bold text-sfrc-800">{c.credits}</td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 rounded-md bg-sfrc-100 text-sfrc-800 text-[11px] font-bold">
                        {c.course_type}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-bold text-sfrc-900 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-sfrc-500" />
                      {c.faculty_name}
                    </td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {c.syllabus_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB: FACULTY–SUBJECT ASSIGNMENT MANAGEMENT (MODULE 2.5) ────────── */}
      {activeTab === 'assignments' && (
        <div className="space-y-6">
          {/* Allocation Form Card */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-sfrc-200 shadow-sm space-y-6">
            <div className="border-b border-sfrc-200 pb-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sfrc-100 text-sfrc-700 text-xs font-bold uppercase tracking-wider mb-2">
                <Users className="w-3.5 h-3.5" />
                Academic Assignment Governance (Module 2.5)
              </div>
              <h3 className="text-xl font-black text-sfrc-900">
                Allocate Subject to Faculty Member
              </h3>
              <p className="text-xs sm:text-sm text-sfrc-600 mt-1">
                Assign curriculum subjects to eligible department faculty. Automatically validates departmental eligibility, academic period, and prevents duplicate allocations.
              </p>
            </div>

            <form onSubmit={handleAssignFaculty} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
              <div>
                <label className="block text-xs font-bold text-sfrc-800 uppercase tracking-wider mb-1.5">
                  Department*
                </label>
                <select
                  value={assignForm.department}
                  onChange={(e) => setAssignForm({ ...assignForm, department: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-sfrc-200 text-xs font-medium bg-sfrc-50 text-sfrc-900 focus:outline-none focus:ring-2 focus:ring-sfrc-700"
                >
                  <option value="">-- Select Department --</option>
                  {departmentsList.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-sfrc-800 uppercase tracking-wider mb-1.5">
                  Academic Year*
                </label>
                <select
                  value={assignForm.academic_year}
                  onChange={(e) => setAssignForm({ ...assignForm, academic_year: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-sfrc-200 text-xs font-medium bg-sfrc-50 text-sfrc-900 focus:outline-none focus:ring-2 focus:ring-sfrc-700"
                >
                  <option value="2025-2026">2025 - 2026 (Active)</option>
                  <option value="2026-2027">2026 - 2027 (Upcoming)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-sfrc-800 uppercase tracking-wider mb-1.5">
                  Semester*
                </label>
                <select
                  value={assignForm.semester}
                  onChange={(e) => setAssignForm({ ...assignForm, semester: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-sfrc-200 text-xs font-medium bg-sfrc-50 text-sfrc-900 focus:outline-none focus:ring-2 focus:ring-sfrc-700"
                >
                  <option value={1}>Semester I</option>
                  <option value={2}>Semester II</option>
                  <option value={3}>Semester III</option>
                  <option value={4}>Semester IV</option>
                  <option value={5}>Semester V</option>
                  <option value={6}>Semester VI</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-sfrc-800 uppercase tracking-wider mb-1.5">
                  Subject (Filtered)*
                </label>
                <select
                  value={assignForm.course_code}
                  onChange={(e) => setAssignForm({ ...assignForm, course_code: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-sfrc-200 text-xs font-medium bg-sfrc-50 text-sfrc-900 focus:outline-none focus:ring-2 focus:ring-sfrc-700 font-mono"
                >
                  <option value="">-- Choose Course --</option>
                  {courses
                    .filter((c) =>
                      assignForm.department === 'ALL' ||
                      c.department.toLowerCase().includes(assignForm.department.toLowerCase().slice(0, 5)) ||
                      (assignForm.department.includes('Data') && c.code.includes('UDS'))
                    )
                    .map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} — {c.title.slice(0, 30)}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-sfrc-800 uppercase tracking-wider mb-1.5">
                  Faculty Member*
                </label>
                <select
                  value={assignForm.faculty_id}
                  onChange={(e) => setAssignForm({ ...assignForm, faculty_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-sfrc-200 text-xs font-medium bg-sfrc-50 text-sfrc-900 focus:outline-none focus:ring-2 focus:ring-sfrc-700"
                >
                  <option value="">-- Select Faculty --</option>
                  {facultyList.length > 0 ? (
                    facultyList.map((f: any) => (
                      <option key={f.id} value={f.id}>
                        {f.full_name} ({f.employee_id || f.department_name || 'Faculty'})
                      </option>
                    ))
                  ) : (
                    <option disabled value="">No active faculty records found in database</option>
                  )}
                </select>
              </div>


              <div className="sm:col-span-2 lg:col-span-5 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-sfrc-700 text-white font-bold text-xs hover:bg-sfrc-800 transition-colors shadow-sm cursor-pointer flex items-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Confirm Faculty Allocation</span>
                </button>
              </div>
            </form>
          </div>

          {/* Current Allocations Table */}
          <div className="bg-white rounded-3xl border border-sfrc-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-sfrc-200 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-base text-sfrc-900">Active Course-Faculty Allocations</h4>
                <p className="text-xs text-sfrc-600">Committed teaching workload for the autonomous curriculum session</p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-sfrc-100 text-sfrc-800">
                {assignments.length} Allocated Subjects
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-sfrc-200 bg-sfrc-50/70 font-bold text-sfrc-700 uppercase tracking-wider">
                    <th className="py-3 px-5">Course Code</th>
                    <th className="py-3 px-5">Course Title</th>
                    <th className="py-3 px-5">Department</th>
                    <th className="py-3 px-5 text-center">Semester</th>
                    <th className="py-3 px-5">Allocated Faculty</th>
                    <th className="py-3 px-5 text-center">Workload Hours</th>
                    <th className="py-3 px-5 text-right">Allocation Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sfrc-200/60 font-medium">
                  {assignments.map((a) => (
                    <tr key={a.id} className="hover:bg-sfrc-50/40 transition-colors">
                      <td className="py-3 px-5 font-mono font-bold text-sfrc-900">{a.code}</td>
                      <td className="py-3 px-5 font-semibold text-sfrc-950">{a.title}</td>
                      <td className="py-3 px-5 text-sfrc-700">{a.department}</td>
                      <td className="py-3 px-5 text-center font-bold text-sfrc-900">Sem {a.semester}</td>
                      <td className="py-3 px-5 font-bold text-sfrc-900 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-sfrc-500" />
                        {a.faculty_name}
                      </td>
                      <td className="py-3 px-5 text-center font-mono text-sfrc-700">{a.hours} hrs/wk</td>
                      <td className="py-3 px-5 text-right">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: BOARD OF STUDIES (BOS) ─────────────────────────────────── */}
      {activeTab === 'bos' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-sfrc-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-sfrc-200 pb-3">
              <div>
                <h3 className="text-base font-black text-sfrc-900">
                  Board of Studies (BOS) Annual Meeting Minutes & Approvals
                </h3>
                <p className="text-xs text-sfrc-600 mt-0.5">
                  Academic year 2025 - 2026 curriculum revisions approved under UGC Autonomous guidelines.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                BOS Passed (100%)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {[
                {
                  dept: 'Department of Computer Science',
                  date: 'Approved on May 18, 2025',
                  changes: 'Added Cloud Architecture & AI Electives to Semester 5 & 6.',
                  bos_chair: 'Dr. S. Meenakshi',
                },
                {
                  dept: 'Department of Commerce (CA)',
                  date: 'Approved on May 20, 2025',
                  changes: 'Integrated GST ERP & Corporate Tax Analytics software practicals.',
                  bos_chair: 'Dr. V. Lakshmi',
                },
                {
                  dept: 'Department of Mathematics',
                  date: 'Approved on May 22, 2025',
                  changes: 'Introduced Mathematical Modeling and Python for Scientific Computing.',
                  bos_chair: 'Dr. R. Kamala',
                },
                {
                  dept: 'Department of Physics',
                  date: 'Approved on May 24, 2025',
                  changes: 'Smart Materials, Nanotechnology and Sensor systems lab inclusion.',
                  bos_chair: 'Dr. M. Geetha',
                },
              ].map((b, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-sfrc-50 border border-sfrc-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-sfrc-900 text-sm">{b.dept}</p>
                    <span className="text-[11px] text-sfrc-500 font-semibold">{b.date}</span>
                  </div>
                  <p className="text-xs text-sfrc-700">{b.changes}</p>
                  <p className="text-xs text-sfrc-600 pt-1 font-medium">
                    Chairperson: <span className="font-bold text-sfrc-900">{b.bos_chair}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: CURRICULUM & REGULATIONS ──────────────────────────────── */}
      {activeTab === 'curriculum' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-sfrc-200 shadow-sm space-y-6">
          <div className="border-b border-sfrc-200 pb-4">
            <h3 className="text-lg font-bold text-sfrc-900">
              UGC Autonomous Evaluation & Credit Structure
            </h3>
            <p className="text-xs sm:text-sm text-sfrc-600">
              Continuous Internal Assessment (CIA) & End Semester Examination (ESE) weightage guidelines.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-sfrc-50 border border-sfrc-200 space-y-2">
              <p className="text-xs font-bold text-sfrc-600 uppercase">Undergraduate (UG)</p>
              <p className="text-2xl font-black text-sfrc-900 font-mono">140 Credits</p>
              <p className="text-xs text-sfrc-600">
                Minimum 140 credits across 6 semesters (Core, Allied, Skill-Based, Extension Activities).
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-sfrc-50 border border-sfrc-200 space-y-2">
              <p className="text-xs font-bold text-sfrc-600 uppercase">Postgraduate (PG)</p>
              <p className="text-2xl font-black text-sfrc-900 font-mono">90 Credits</p>
              <p className="text-xs text-sfrc-600">
                Minimum 90 credits across 4 semesters including mandatory Research Project & Viva.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-sfrc-50 border border-sfrc-200 space-y-2">
              <p className="text-xs font-bold text-sfrc-600 uppercase">CIA : ESE Ratio</p>
              <p className="text-2xl font-black text-emerald-700 font-mono">40 : 60</p>
              <p className="text-xs text-sfrc-600">
                40 marks Continuous Internal Assessment + 60 marks Autonomous End-Semester Examination.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom Pragya AI Assistant ────────────────────────────────────── */}
      <AskPragyaBanner />

      {/* ── ADD PROGRAMME MODAL ─────────────────────────────────────────────── */}
      {isAddProgOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-sfrc-200 relative">
            <button
              onClick={() => setIsAddProgOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-xl text-sfrc-400 hover:text-sfrc-700 hover:bg-sfrc-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-sfrc-100 flex items-center justify-center text-sfrc-800">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-sfrc-900">Add Degree Programme</h3>
                <p className="text-xs text-sfrc-500">Autonomous curriculum registry persistence</p>
              </div>
            </div>

            <form onSubmit={handleCreateProgramme} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-sfrc-700 uppercase mb-1">Programme Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. B.Sc Artificial Intelligence & Data Science"
                  value={progForm.name}
                  onChange={(e) => setProgForm({ ...progForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-sfrc-200 text-xs font-medium focus:ring-2 focus:ring-sfrc-700 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-sfrc-700 uppercase mb-1">Programme Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. UAID"
                    value={progForm.code}
                    onChange={(e) => setProgForm({ ...progForm, code: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-sfrc-200 text-xs font-medium focus:ring-2 focus:ring-sfrc-700 focus:outline-hidden uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-sfrc-700 uppercase mb-1">Degree Level</label>
                  <select
                    value={progForm.degree_level}
                    onChange={(e) => setProgForm({ ...progForm, degree_level: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-sfrc-200 text-xs font-medium focus:ring-2 focus:ring-sfrc-700 focus:outline-hidden"
                  >
                    <option value="UG">Undergraduate (UG)</option>
                    <option value="PG">Postgraduate (PG)</option>
                    <option value="Ph.D">Doctoral (Ph.D)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-sfrc-700 uppercase mb-1">Sanctioned Intake</label>
                  <input
                    type="number"
                    min={10}
                    max={200}
                    value={progForm.sanctioned_intake}
                    onChange={(e) => setProgForm({ ...progForm, sanctioned_intake: parseInt(e.target.value) || 60 })}
                    className="w-full px-4 py-2.5 rounded-xl border border-sfrc-200 text-xs font-medium focus:ring-2 focus:ring-sfrc-700 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-sfrc-700 uppercase mb-1">Regulation Batch</label>
                  <input
                    type="text"
                    value={progForm.regulation_batch}
                    onChange={(e) => setProgForm({ ...progForm, regulation_batch: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-sfrc-200 text-xs font-medium focus:ring-2 focus:ring-sfrc-700 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddProgOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-sfrc-600 hover:bg-sfrc-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-sfrc-700 hover:bg-sfrc-800 text-white transition-colors shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Saving to Database…' : 'Create Programme'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ADD COURSE MODAL ────────────────────────────────────────────────── */}
      {isAddCourseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-sfrc-200 relative">
            <button
              onClick={() => setIsAddCourseOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-xl text-sfrc-400 hover:text-sfrc-700 hover:bg-sfrc-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-800">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-sfrc-900">Add Curriculum Course</h3>
                <p className="text-xs text-sfrc-500">Autonomous syllabus & credit matrix registration</p>
              </div>
            </div>

            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-sfrc-700 uppercase mb-1">Course Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed Computing & Microservices"
                  value={courseForm.title}
                  onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-sfrc-200 text-xs font-medium focus:ring-2 focus:ring-sfrc-700 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-sfrc-700 uppercase mb-1">Course Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 23UCSC63"
                    value={courseForm.code}
                    onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-sfrc-200 text-xs font-medium focus:ring-2 focus:ring-sfrc-700 focus:outline-hidden uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-sfrc-700 uppercase mb-1">Semester</label>
                  <select
                    value={courseForm.semester}
                    onChange={(e) => setCourseForm({ ...courseForm, semester: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2.5 rounded-xl border border-sfrc-200 text-xs font-medium focus:ring-2 focus:ring-sfrc-700 focus:outline-hidden"
                  >
                    {[1, 2, 3, 4, 5, 6].map((s) => (
                      <option key={s} value={s}>Semester {s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-sfrc-700 uppercase mb-1">Credits</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={courseForm.credits}
                    onChange={(e) => setCourseForm({ ...courseForm, credits: parseInt(e.target.value) || 4 })}
                    className="w-full px-4 py-2.5 rounded-xl border border-sfrc-200 text-xs font-medium focus:ring-2 focus:ring-sfrc-700 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-sfrc-700 uppercase mb-1">Hours / Wk</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={courseForm.hours_per_week}
                    onChange={(e) => setCourseForm({ ...courseForm, hours_per_week: parseInt(e.target.value) || 5 })}
                    className="w-full px-4 py-2.5 rounded-xl border border-sfrc-200 text-xs font-medium focus:ring-2 focus:ring-sfrc-700 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-sfrc-700 uppercase mb-1">Type</label>
                  <select
                    value={courseForm.course_type}
                    onChange={(e) => setCourseForm({ ...courseForm, course_type: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-sfrc-200 text-xs font-medium focus:ring-2 focus:ring-sfrc-700 focus:outline-hidden"
                  >
                    <option value="Major Core">Major Core</option>
                    <option value="Core Practical">Core Practical</option>
                    <option value="Elective">Elective</option>
                    <option value="Skill-Based">Skill-Based</option>
                    <option value="NME">NME</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddCourseOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-sfrc-600 hover:bg-sfrc-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition-colors shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Registering…' : 'Add Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
