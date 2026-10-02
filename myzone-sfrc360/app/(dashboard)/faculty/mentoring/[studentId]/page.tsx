'use client';

import { useEffect, useState, useMemo, use } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Calendar, Phone, Home, Lock, Plus, ArrowLeft, Loader2, X, Target } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import AskPragyaBanner from '@/components/shared/AskPragyaBanner';
import { createClient } from '@/lib/supabase/client';
import { apiGet, apiPost, apiPatch } from '@/lib/api-client';
import { cn } from '@/lib/utils';

const meetingSchema = z.object({
  meeting_date: z.string().min(1, 'Meeting date is required'),
  meeting_type: z.string().min(1, 'Meeting type is required'),
  academic_notes: z.string().optional(),
  personal_notes: z.string().optional(),
  goals: z.string().optional(),
  follow_up: z.string().optional(),
  next_meeting: z.string().optional(),
});

type MeetingFormData = z.infer<typeof meetingSchema>;

interface CourseAttendance {
  course_code: string;
  course_title: string;
  percentage: number;
}

interface MarkItem {
  course_code: string;
  assessment: string;
  marks: number;
  max: number;
}

interface MeetingRecord {
  id: string;
  meeting_date: string;
  meeting_type: string;
  academic_notes?: string;
  personal_notes?: string;
  goals?: string;
  follow_up?: string;
  next_meeting?: string;
  created_at?: string;
}

interface GoalItem {
  id: string;
  title: string;
  description?: string;
  target_date?: string;
  status: 'pending' | 'in_progress' | 'completed';
}

interface MenteeDetailData {
  mentee: {
    student_id: string;
    full_name: string;
    register_number: string;
    programme_name?: string;
    current_semester: number;
    attendance_pct: number;
    cgpa: number;
  };
  parent_name?: string;
  parent_contact?: string;
  is_hosteller: boolean;
  hostel_name?: string;
  room_number?: string;
  course_attendance: CourseAttendance[];
  recent_marks: MarkItem[];
  meeting_records: MeetingRecord[];
  goals: GoalItem[];
}

export default function FacultyMenteeDetailPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const resolvedParams = use(params);
  const studentId = resolvedParams.studentId;

  const [data, setData] = useState<MenteeDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDesc, setNewGoalDesc] = useState('');
  const [newGoalDate, setNewGoalDate] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<MeetingFormData>({
    resolver: zodResolver(meetingSchema),
    defaultValues: {
      meeting_date: new Date().toISOString().slice(0, 10),
      meeting_type: 'Routine Academic Review',
    },
  });

  const loadMentee = async () => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await apiGet<MenteeDetailData>(`/api/v1/mentoring/mentees/${studentId}`, token);
      setData(res);
    } catch (err) {
      console.error('Failed to load mentee details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const res = await apiGet<MenteeDetailData>(`/api/v1/mentoring/mentees/${studentId}`, token);
        if (!ignore) {
          setData(res);
        }
      } catch (err) {
        console.error('Failed to load mentee details:', err);
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      ignore = true;
    };
  }, [studentId, supabase]);

  const handleAddMeeting = async (formData: MeetingFormData) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      await apiPost(
        '/api/v1/mentoring/records',
        {
          student_id: studentId,
          ...formData,
        },
        token
      );

      setFeedback('Mentoring meeting recorded successfully.');
      reset();
      setIsMeetingModalOpen(false);
      loadMentee();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      await apiPost(
        '/api/v1/mentoring/goals',
        {
          student_id: studentId,
          title: newGoalTitle,
          description: newGoalDesc,
          target_date: newGoalDate || undefined,
          status: 'in_progress',
        },
        token
      );

      setNewGoalTitle('');
      setNewGoalDesc('');
      setNewGoalDate('');
      setIsGoalModalOpen(false);
      loadMentee();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleGoalStatus = async (goalId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'completed' ? 'in_progress' : 'completed';
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      await apiPatch(`/api/v1/mentoring/goals/${goalId}/status`, { status: nextStatus }, token);
      loadMentee();
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading && !data) {
    return (
      <AppShell role="faculty" userName="Faculty Mentor">
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-sfrc-700" />
          <p className="text-xs font-semibold text-sfrc-600">
            Fetching mentee academic history & welfare records…
          </p>
        </div>
      </AppShell>
    );
  }

  const mentee = data?.mentee;
  const isAtRisk = (mentee?.attendance_pct ?? 100) < 75;

  return (
    <AppShell role="faculty" userName="Dr. K. Anitha">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/faculty/mentoring"
              className="w-10 h-10 rounded-2xl bg-white border border-sfrc-200 flex items-center justify-center text-sfrc-700 hover:bg-sfrc-50 transition-colors shadow-xs"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sfrc-100 text-sfrc-800 uppercase tracking-wider">
                  Mentee Snapshot
                </span>
                <span className="text-xs font-mono text-sfrc-500 font-bold">{mentee?.register_number}</span>
              </div>
              <h1 className="text-2xl font-black text-sfrc-900 tracking-tight mt-0.5">
                {mentee?.full_name}
              </h1>
            </div>
          </div>

          <button
            onClick={() => setIsMeetingModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-sfrc-700 hover:bg-sfrc-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Log Mentoring Session
          </button>
        </div>

        {feedback && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center justify-between">
            <span>{feedback}</span>
            <button onClick={() => setFeedback(null)}>✕</button>
          </div>
        )}

        {/* SECTION 1: Snapshot (Attendance Circle, CGPA, Hostel, Parent contact) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Attendance */}
          <div className="p-5 rounded-3xl border border-sfrc-200 bg-white shadow-xs">
            <p className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Attendance Status</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={cn('text-3xl font-black', isAtRisk ? 'text-red-600' : 'text-emerald-700')}>
                {mentee?.attendance_pct}%
              </span>
              <span className="text-xs text-sfrc-500">{isAtRisk ? 'Shortage Alert' : 'Regular'}</span>
            </div>
            <div className="w-full bg-sfrc-200 h-2 rounded-full overflow-hidden mt-3">
              <div
                className={cn('h-full rounded-full', isAtRisk ? 'bg-red-500' : 'bg-emerald-500')}
                style={{ width: `${Math.min(mentee?.attendance_pct || 90, 100)}%` }}
              />
            </div>
          </div>

          {/* Academic CGPA */}
          <div className="p-5 rounded-3xl border border-sfrc-200 bg-white shadow-xs">
            <p className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Cumulative CGPA</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl font-black text-sfrc-900 font-mono">{mentee?.cgpa}</span>
              <span className="text-xs font-bold text-sfrc-500">/ 10.0</span>
            </div>
            <p className="text-[11px] text-emerald-700 font-semibold mt-2">First Class with Distinction range</p>
          </div>

          {/* Residence & Hostel */}
          <div className="p-5 rounded-3xl border border-sfrc-200 bg-white shadow-xs">
            <p className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Residence Profile</p>
            {data?.is_hosteller ? (
              <div className="mt-1">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Home className="w-3 h-3" /> Hosteller
                </span>
                <p className="text-xs font-bold text-sfrc-900 mt-1">{data.hostel_name}</p>
                <p className="text-[11px] text-sfrc-500">Room: {data.room_number}</p>
              </div>
            ) : (
              <div className="mt-1">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-sfrc-100 text-sfrc-800">
                  Day Scholar
                </span>
                <p className="text-xs text-sfrc-600 mt-1">Commutes daily by bus</p>
              </div>
            )}
          </div>

          {/* Parent Contact */}
          <div className="p-5 rounded-3xl border border-sfrc-200 bg-white shadow-xs">
            <p className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Parent / Guardian</p>
            <p className="text-sm font-bold text-sfrc-900 mt-1">{data?.parent_name || 'Mr. Shanmugam K'}</p>
            <div className="flex items-center gap-2 text-xs text-sfrc-700 font-medium mt-1.5">
              <Phone className="w-3.5 h-3.5 text-sfrc-500" />
              <span>{data?.parent_contact || '9842103490'}</span>
            </div>
          </div>
        </div>

        {/* SECTION 2 & 3: Meeting Timeline + Goals Tracker */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* SECTION 2: Meeting History Timeline */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-sfrc-200 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-black text-sfrc-900 tracking-tight flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-sfrc-700" />
                    Mentoring Session History
                  </h2>
                  <p className="text-xs text-sfrc-600">
                    Logged counseling notes, welfare audits, and follow-up milestones
                  </p>
                </div>
                <span className="text-xs font-bold text-sfrc-600 bg-sfrc-100 px-2.5 py-1 rounded-lg">
                  {data?.meeting_records.length || 0} Sessions
                </span>
              </div>

              <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                {data?.meeting_records && data.meeting_records.length > 0 ? (
                  data.meeting_records.map((rec) => (
                    <div key={rec.id} className="p-4 rounded-2xl border border-sfrc-200 bg-sfrc-surface/70 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-sfrc-900 bg-white px-2.5 py-1 rounded-lg border border-sfrc-200">
                          {rec.meeting_type}
                        </span>
                        <span className="text-[11px] font-mono text-sfrc-500 font-bold">{rec.meeting_date}</span>
                      </div>

                      {/* Academic Notes */}
                      {rec.academic_notes && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-sfrc-500">Academic Review</p>
                          <p className="text-xs text-sfrc-800 leading-relaxed mt-0.5">{rec.academic_notes}</p>
                        </div>
                      )}

                      {/* PRIVATE Personal Notes */}
                      {rec.personal_notes && (
                        <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-amber-950">
                          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-800 mb-0.5">
                            <Lock className="w-3 h-3" />
                            Confidential Counselor Note (Private to Faculty)
                          </div>
                          <p className="text-xs leading-relaxed">{rec.personal_notes}</p>
                        </div>
                      )}

                      {rec.goals && (
                        <p className="text-xs text-sfrc-600">
                          <strong className="text-sfrc-900 font-bold">Goals: </strong> {rec.goals}
                        </p>
                      )}

                      {rec.next_meeting && (
                        <p className="text-[11px] text-sfrc-500">
                          Next follow-up: <strong className="text-sfrc-800">{rec.next_meeting}</strong>
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-sfrc-500 py-8 text-center">No mentoring sessions recorded yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 3: Goals Tracker */}
          <div className="lg:col-span-5 bg-white rounded-3xl border border-sfrc-200 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-black text-sfrc-900 tracking-tight flex items-center gap-2">
                    <Target className="w-5 h-5 text-sfrc-700" />
                    Action Goals Tracker
                  </h2>
                  <p className="text-xs text-sfrc-600">
                    Shared career and academic targets
                  </p>
                </div>
                <button
                  onClick={() => setIsGoalModalOpen(true)}
                  className="px-2.5 py-1.5 rounded-xl bg-sfrc-100 hover:bg-sfrc-200 text-sfrc-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Goal
                </button>
              </div>

              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {data?.goals && data.goals.length > 0 ? (
                  data.goals.map((g) => {
                    const isDone = g.status === 'completed';
                    return (
                      <div
                        key={g.id}
                        className={cn(
                          'p-3.5 rounded-2xl border transition-all',
                          isDone ? 'bg-emerald-50/50 border-emerald-200' : 'bg-sfrc-surface border-sfrc-200'
                        )}
                      >
                        <div className="flex items-start gap-2.5">
                          <input
                            type="checkbox"
                            checked={isDone}
                            onChange={() => handleToggleGoalStatus(g.id, g.status)}
                            className="mt-0.5 rounded text-sfrc-700 cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <p className={cn('text-xs font-bold', isDone ? 'line-through text-sfrc-500' : 'text-sfrc-900')}>
                              {g.title}
                            </p>
                            {g.description && <p className="text-[11px] text-sfrc-600 mt-0.5">{g.description}</p>}
                            {g.target_date && (
                              <p className="text-[10px] text-sfrc-500 mt-1 font-mono">
                                Target Date: {g.target_date}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-sfrc-500 py-8 text-center">No active goals assigned.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: Academic Snapshot (Course attendance + CIA marks) */}
        <div className="bg-white rounded-3xl border border-sfrc-200 p-6 shadow-xs">
          <h2 className="text-lg font-black text-sfrc-900 tracking-tight mb-4">
            Academic Performance Snapshot
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Course Attendance */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-sfrc-600 mb-2">
                Enrolled Course Attendance
              </h3>
              <div className="space-y-2.5">
                {data?.course_attendance.map((c) => (
                  <div key={c.course_code} className="p-3 rounded-2xl bg-sfrc-surface border border-sfrc-200/80">
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span>{c.course_title}</span>
                      <span className={c.percentage < 75 ? 'text-red-600' : 'text-emerald-700'}>
                        {c.percentage}%
                      </span>
                    </div>
                    <div className="w-full bg-sfrc-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full', c.percentage < 75 ? 'bg-red-500' : 'bg-sfrc-700')}
                        style={{ width: `${Math.min(c.percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent CIA Marks */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-sfrc-600 mb-2">
                Recent Internal Assessment Results
              </h3>
              <div className="space-y-2.5">
                {data?.recent_marks.map((m, idx) => (
                  <div key={idx} className="p-3 rounded-2xl bg-sfrc-surface border border-sfrc-200 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-sfrc-900">{m.course_code}</p>
                      <p className="text-[11px] text-sfrc-500">{m.assessment}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-sfrc-900 font-mono text-sm">{m.marks} / {m.max}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ADD MEETING MODAL */}
        {isMeetingModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-sfrc-200 max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-sfrc-100 pb-3">
                <h2 className="text-base font-black text-sfrc-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-sfrc-700" />
                  Log Mentoring Session
                </h2>
                <button onClick={() => setIsMeetingModalOpen(false)} className="text-sfrc-500 hover:text-sfrc-800">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit(handleAddMeeting)} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-sfrc-800 mb-1">Meeting Date</label>
                    <input
                      {...register('meeting_date')}
                      type="date"
                      className="w-full px-3 py-2 rounded-xl border border-sfrc-200 bg-sfrc-surface"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-sfrc-800 mb-1">Meeting Type</label>
                    <select
                      {...register('meeting_type')}
                      className="w-full px-3 py-2 rounded-xl border border-sfrc-200 bg-sfrc-surface font-semibold"
                    >
                      <option value="Routine Academic Review">Routine Academic Review</option>
                      <option value="Academic Counseling">Academic Counseling</option>
                      <option value="Attendance Warning">Attendance Warning</option>
                      <option value="Personal Welfare">Personal Welfare Check</option>
                      <option value="Parent-Mentor Meeting">Parent-Mentor Meeting</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-sfrc-800 mb-1">Academic Progress Notes</label>
                  <textarea
                    {...register('academic_notes')}
                    rows={2}
                    placeholder="Discuss CIA performance, exam preparation, project milestones…"
                    className="w-full px-3 py-2 rounded-xl border border-sfrc-200 bg-sfrc-surface"
                  />
                </div>

                {/* PRIVATE PERSONAL NOTES */}
                <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200 space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-900 font-black text-[11px] uppercase tracking-wider">
                    <Lock className="w-3.5 h-3.5 text-amber-700" />
                    Private Confidential Counselor Notes
                  </div>
                  <p className="text-[10px] text-amber-800">
                    These notes are strictly confidential and NEVER shown to students or parents.
                  </p>
                  <textarea
                    {...register('personal_notes')}
                    rows={3}
                    placeholder="Confidential observations regarding health, hostel, personal challenges, or welfare interventions…"
                    className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white mt-1 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-sfrc-800 mb-1">Target Goals / Action Items</label>
                  <input
                    {...register('goals')}
                    placeholder="e.g. Aim for 45+ in CIA 2, attend all lab sessions"
                    className="w-full px-3 py-2 rounded-xl border border-sfrc-200 bg-sfrc-surface"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-sfrc-800 mb-1">Follow-Up Action</label>
                    <input
                      {...register('follow_up')}
                      placeholder="e.g. Verify lab attendance next week"
                      className="w-full px-3 py-2 rounded-xl border border-sfrc-200 bg-sfrc-surface"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-sfrc-800 mb-1">Next Meeting Date</label>
                    <input
                      {...register('next_meeting')}
                      type="date"
                      className="w-full px-3 py-2 rounded-xl border border-sfrc-200 bg-sfrc-surface"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-sfrc-100">
                  <button
                    type="button"
                    onClick={() => setIsMeetingModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-sfrc-700 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-sfrc-700 text-white font-bold"
                  >
                    Save Meeting Record
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ADD GOAL MODAL */}
        {isGoalModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-sfrc-200 max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-sfrc-100 pb-3">
                <h2 className="text-base font-black text-sfrc-900 flex items-center gap-2">
                  <Target className="w-5 h-5 text-sfrc-700" />
                  Add Action Goal
                </h2>
                <button onClick={() => setIsGoalModalOpen(false)}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddGoal} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-sfrc-800 mb-1">Goal Title</label>
                  <input
                    value={newGoalTitle}
                    onChange={(e) => setNewGoalTitle(e.target.value)}
                    placeholder="e.g. AWS Certification or Score 90%+ in Web Tech"
                    className="w-full px-3 py-2 rounded-xl border border-sfrc-200 bg-sfrc-surface font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-sfrc-800 mb-1">Description / Milestones</label>
                  <textarea
                    value={newGoalDesc}
                    onChange={(e) => setNewGoalDesc(e.target.value)}
                    rows={2}
                    placeholder="Complete 4 practice papers..."
                    className="w-full px-3 py-2 rounded-xl border border-sfrc-200 bg-sfrc-surface"
                  />
                </div>
                <div>
                  <label className="block font-bold text-sfrc-800 mb-1">Target Completion Date</label>
                  <input
                    type="date"
                    value={newGoalDate}
                    onChange={(e) => setNewGoalDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-sfrc-200 bg-sfrc-surface"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-sfrc-100">
                  <button
                    type="button"
                    onClick={() => setIsGoalModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-sfrc-700 font-bold"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="px-5 py-2 rounded-xl bg-sfrc-700 text-white font-bold">
                    Add Goal
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <AskPragyaBanner />
      </div>
    </AppShell>
  );
}
