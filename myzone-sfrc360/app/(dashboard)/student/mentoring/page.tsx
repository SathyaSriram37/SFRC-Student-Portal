'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Calendar, Clock, Mail, Phone, Building2, Send, Loader2, ArrowLeft, Target, UserCheck, X } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import AskPragyaBanner from '@/components/shared/AskPragyaBanner';
import { createClient } from '@/lib/supabase/client';
import { apiGet, apiPost, apiPatch } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface MeetingItem {
  id: string;
  meeting_date: string;
  meeting_type: string;
  goals?: string;
  follow_up?: string;
  next_meeting?: string;
}

interface StudentMentorView {
  mentor_name: string;
  designation?: string;
  department_name?: string;
  email?: string;
  phone?: string;
  office_room?: string;
  office_hours?: string;
  recent_meetings: MeetingItem[];
}

interface GoalItem {
  id: string;
  title: string;
  description?: string;
  target_date?: string;
  status: string;
}

export default function StudentMentoringPage() {
  const [mentor, setMentor] = useState<StudentMentorView | null>(null);
  const [goals, setGoals] = useState<GoalItem[]>([]);
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [preferredDate, setPreferredDate] = useState('');
  const [agenda, setAgenda] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  const loadData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const [mentorRes, goalsRes] = await Promise.all([
        apiGet<StudentMentorView>('/api/v1/mentoring/my-mentor', token),
        apiGet<GoalItem[]>('/api/v1/mentoring/my-goals', token).catch(() => []),
      ]);

      setMentor(mentorRes);
      setGoals(goalsRes);
    } catch (err) {
      console.error('Failed to load student mentor details:', err);
    }
  }, [supabase]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      await loadData();
    })();

    return () => {
      ignore = true;
    };
  }, [loadData]);

  const handleRequestMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSending(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      await apiPost(
        '/api/v1/mentoring/request-meeting',
        {
          preferred_date: preferredDate || undefined,
          agenda: agenda || 'General academic guidance',
        },
        token
      );

      setFeedback('Meeting request submitted to your faculty mentor.');
      setPreferredDate('');
      setAgenda('');
      setIsRequestModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleGoal = async (goalId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'completed' ? 'in_progress' : 'completed';
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      await apiPatch(`/api/v1/mentoring/goals/${goalId}/status`, { status: nextStatus }, token);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AppShell role="student" userName="Student">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/student/dashboard"
              className="w-10 h-10 rounded-2xl bg-white border border-sfrc-200 flex items-center justify-center text-sfrc-700 hover:bg-sfrc-50 transition-colors shadow-xs"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-sfrc-900 tracking-tight flex items-center gap-2">
                <UserCheck className="w-6 h-6 text-sfrc-700" />
                Faculty Mentorship & Guidance
              </h1>
              <p className="text-xs text-sfrc-600">
                Personal faculty mentor connection, shared milestones, and counseling appointments
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsRequestModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-sfrc-700 hover:bg-sfrc-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer self-start sm:self-auto"
          >
            <Send className="w-4 h-4" />
            Request Mentoring Session
          </button>
        </div>

        {feedback && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center justify-between">
            <span>{feedback}</span>
            <button onClick={() => setFeedback(null)}>✕</button>
          </div>
        )}

        {/* Mentor Profile Card */}
        <div className="bg-white rounded-3xl border border-sfrc-200 p-6 sm:p-7 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-sfrc-700 to-sfrc-900 text-white font-black flex items-center justify-center text-2xl shadow-md ring-4 ring-sfrc-100">
                {mentor?.mentor_name?.slice(0, 2).toUpperCase() || 'FA'}
              </div>
              <div>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-sfrc-100 text-sfrc-800 uppercase tracking-wider mb-1">
                  Assigned Faculty Mentor
                </span>
                <h2 className="text-xl font-black text-sfrc-900">{mentor?.mentor_name || 'Dr. K. Anitha'}</h2>
                <p className="text-xs text-sfrc-600 font-medium">
                  {mentor?.designation || 'Associate Professor'} • {mentor?.department_name || 'Computer Science'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="p-3 rounded-2xl bg-sfrc-surface border border-sfrc-200 text-xs text-sfrc-700 space-y-1">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-sfrc-500" />
                  <span>{mentor?.email || 'anitha.k@sfrc.ac.in'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-sfrc-500" />
                  <span>{mentor?.phone || '04562-220389'}</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-sfrc-surface border border-sfrc-200 text-xs text-sfrc-700 space-y-1">
                <div className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-sfrc-500" />
                  <span>{mentor?.office_room || 'Staff Room 2 (Science Block)'}</span>
                </div>
                <div className="flex items-center gap-2 font-bold text-sfrc-900">
                  <Clock className="w-3.5 h-3.5 text-sfrc-700" />
                  <span>{mentor?.office_hours || 'Mon-Fri 2:30 PM - 4:30 PM'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2-COL SECTION: Recent Meeting Dates + Shared Goals */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Recent Meeting Dates (NO PRIVATE NOTES) */}
          <div className="lg:col-span-6 bg-white rounded-3xl border border-sfrc-200 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-black text-sfrc-900 tracking-tight flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-sfrc-700" />
                    Past Mentoring Interactions
                  </h2>
                  <p className="text-xs text-sfrc-600">
                    Meeting dates and scheduled academic follow-ups
                  </p>
                </div>
                <span className="text-xs font-bold text-sfrc-600 bg-sfrc-100 px-2.5 py-1 rounded-lg">
                  {mentor?.recent_meetings.length || 0} Sessions
                </span>
              </div>

              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {mentor?.recent_meetings && mentor.recent_meetings.length > 0 ? (
                  mentor.recent_meetings.map((m) => (
                    <div key={m.id} className="p-3.5 rounded-2xl border border-sfrc-200 bg-sfrc-surface/70 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-sfrc-900">{m.meeting_type}</span>
                        <span className="text-[11px] font-mono font-bold text-sfrc-600">{m.meeting_date}</span>
                      </div>
                      {m.goals && (
                        <p className="text-xs text-sfrc-700">
                          <strong className="text-sfrc-900">Agreed Action: </strong> {m.goals}
                        </p>
                      )}
                      {m.next_meeting && (
                        <p className="text-[10px] text-sfrc-500">
                          Next scheduled review: <strong className="text-sfrc-800">{m.next_meeting}</strong>
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-sfrc-500 py-8 text-center">No past mentoring sessions logged.</p>
                )}
              </div>
            </div>
          </div>

          {/* Shared Goals Tracker */}
          <div className="lg:col-span-6 bg-white rounded-3xl border border-sfrc-200 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-black text-sfrc-900 tracking-tight flex items-center gap-2">
                    <Target className="w-5 h-5 text-sfrc-700" />
                    My Action Goals
                  </h2>
                  <p className="text-xs text-sfrc-600">
                    Key targets established during faculty mentoring reviews
                  </p>
                </div>
              </div>

              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {goals && goals.length > 0 ? (
                  goals.map((g) => {
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
                            onChange={() => handleToggleGoal(g.id, g.status)}
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
                  <p className="text-xs text-sfrc-500 py-8 text-center">No active milestones created yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* REQUEST MEETING MODAL */}
        {isRequestModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-sfrc-200 max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-sfrc-100 pb-3">
                <h2 className="text-base font-black text-sfrc-900 flex items-center gap-2">
                  <Send className="w-5 h-5 text-sfrc-700" />
                  Request Mentoring Meeting
                </h2>
                <button onClick={() => setIsRequestModalOpen(false)}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleRequestMeeting} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-sfrc-800 mb-1">Preferred Meeting Date</label>
                  <input
                    type="date"
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-sfrc-200 bg-sfrc-surface"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-sfrc-800 mb-1">Discussion Agenda / Purpose</label>
                  <textarea
                    value={agenda}
                    onChange={(e) => setAgenda(e.target.value)}
                    rows={3}
                    placeholder="e.g. CIA examination preparation, elective selection, placement advice, hostel matters…"
                    className="w-full px-3 py-2 rounded-xl border border-sfrc-200 bg-sfrc-surface"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-sfrc-100">
                  <button
                    type="button"
                    onClick={() => setIsRequestModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-sfrc-700 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSending}
                    className="px-5 py-2 rounded-xl bg-sfrc-700 text-white font-bold flex items-center gap-2"
                  >
                    {isSending && <Loader2 className="w-4 h-4 animate-spin" />}
                    Submit Request
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
