'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { FileText, CheckCircle2, AlertTriangle, ArrowLeft, Calendar, Clock, MapPin } from 'lucide-react';
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
}

interface ExamScheduleItem {
  id: string;
  course_code: string;
  course_title: string;
  date: string;
  time: string;
  session: string;
  venue: string;
  exam_type: string;
  is_eligible: boolean;
  attendance_percentage: number;
  hall_ticket_status: string;
}

interface WardExamOverview {
  ward_name: string;
  register_number: string;
  current_semester: number;
  is_eligible_overall: boolean;
  overall_attendance_pct: number;
  hall_ticket_issued: boolean;
  exam_fee_cleared: boolean;
  schedule: ExamScheduleItem[];
}

export default function ParentExamsPage() {
  const [wards, setWards] = useState<WardItem[]>([]);
  const [selectedWardId, setSelectedWardId] = useState<string | null>(null);
  const [examOverview, setExamOverview] = useState<WardExamOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setIsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const list = await apiGet<WardItem[]>('/api/v1/parents/me/wards', token).catch(() => []);
        if (!ignore) setWards(list);

        const targetWardId = selectedWardId || (list.length > 0 ? list[0].student_id : null);
        if (targetWardId) {
          if (!ignore) setSelectedWardId(targetWardId);
          const data = await apiGet<WardExamOverview>(`/api/v1/parents/me/wards/${targetWardId}/exam-schedule`, token);
          if (!ignore) setExamOverview(data);
        }
      } catch (err) {
        console.error('Failed to load exam schedule:', err);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }
    load();
    return () => { ignore = true; };
  }, [selectedWardId, supabase]);

  const selectedWard = wards.find((w) => w.student_id === selectedWardId) || wards[0];

  return (
    <AppShell role="parent" userName="Parent">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
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
                <FileText className="w-6 h-6 text-sfrc-700" />
                Examinations & Hall Ticket Status
              </h1>
              <p className="text-xs text-sfrc-600">
                Official autonomous examination schedule & hall ticket clearance for {examOverview?.ward_name || selectedWard?.full_name || 'Ward'}
              </p>
            </div>
          </div>

          {wards.length > 1 && (
            <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-sfrc-200">
              {wards.map((w) => (
                <button
                  key={w.student_id}
                  onClick={() => setSelectedWardId(w.student_id)}
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl border border-sfrc-200 p-6 shadow-xs">
            <h2 className="text-base font-black text-sfrc-900 mb-3">Examination Eligibility</h2>
            {examOverview?.is_eligible_overall ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-700 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-emerald-800">Eligible to Appear for Autonomous Exams</p>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    Ward has satisfied the minimum 75% attendance threshold (Current: {examOverview?.overall_attendance_pct}%).
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-700 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-amber-800">Attendance Review Required</p>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Current attendance ({examOverview?.overall_attendance_pct}%) requires condonation clearance.
                  </p>
                </div>
              </div>
            )}

            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between py-2 border-b border-sfrc-100">
                <span className="text-sfrc-600">Register Number:</span>
                <span className="font-bold text-sfrc-900 font-mono">{examOverview?.register_number || selectedWard?.register_number || '23UCA001'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-sfrc-100">
                <span className="text-sfrc-600">Hall Ticket Issuance:</span>
                <span className={cn('font-bold', examOverview?.hall_ticket_issued ? 'text-emerald-700' : 'text-amber-700')}>
                  {examOverview?.hall_ticket_issued ? 'Approved & Verified' : 'Pending Verification'}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sfrc-600">Exam Fee Clearance:</span>
                <span className={cn('font-bold', examOverview?.exam_fee_cleared ? 'text-emerald-700' : 'text-red-700')}>
                  {examOverview?.exam_fee_cleared ? 'Paid in Full' : 'Fee Due Pending'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-sfrc-200 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-black text-sfrc-900">Upcoming Exam Timetable</h2>
              <span className="text-xs font-bold text-sfrc-700 bg-sfrc-100 px-2.5 py-0.5 rounded-lg">
                {examOverview?.schedule.length || 0} Courses
              </span>
            </div>
            
            <div className="space-y-3">
              {examOverview?.schedule && examOverview.schedule.length > 0 ? (
                examOverview.schedule.map((item) => (
                  <div key={item.id} className="p-3.5 rounded-2xl bg-sfrc-surface border border-sfrc-200 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-sfrc-900">{item.course_code} • {item.course_title}</p>
                      <div className="flex items-center gap-3 text-[11px] text-sfrc-500 mt-0.5 font-mono">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-sfrc-400" />
                          {item.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-sfrc-400" />
                          {item.time}
                        </span>
                      </div>
                    </div>
                    <span className={cn(
                      'text-[10px] font-bold px-2 py-0.5 rounded',
                      item.exam_type === 'Practical' ? 'bg-emerald-100 text-emerald-800' : 'bg-sfrc-100 text-sfrc-800'
                    )}>
                      {item.exam_type}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-xs text-sfrc-500">
                  No examination dates scheduled for this semester.
                </div>
              )}
            </div>
          </div>
        </div>

        <AskPragyaBanner />
      </div>
    </AppShell>
  );
}
