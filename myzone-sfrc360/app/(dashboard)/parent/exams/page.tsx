'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { FileText, CheckCircle2, ArrowLeft } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import AskPragyaBanner from '@/components/shared/AskPragyaBanner';
import { createClient } from '@/lib/supabase/client';
import { apiGet } from '@/lib/api-client';


interface WardItem {
  student_id: string;
  full_name: string;
  register_number: string;
  current_semester: number;
}

export default function ParentExamsPage() {
  const [wards, setWards] = useState<WardItem[]>([]);
  const [selectedWardId, setSelectedWardId] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const list = await apiGet<WardItem[]>('/api/v1/parents/me/wards', token).catch(() => []);
      setWards(list);
      if (list.length > 0) {
        setSelectedWardId(list[0].student_id);
      }
    }
    load();
  }, [supabase]);

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
                Examination schedule & eligibility verification for {selectedWard?.full_name || 'Ward'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl border border-sfrc-200 p-6 shadow-xs">
            <h2 className="text-base font-black text-sfrc-900 mb-3">Examination Eligibility</h2>
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-700 shrink-0" />
              <div>
                <p className="text-xs font-bold text-emerald-800">Eligible to Appear for Autonomous Exams</p>
                <p className="text-[11px] text-emerald-700 mt-0.5">Ward has satisfied the minimum 75% attendance threshold.</p>
              </div>
            </div>

            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between py-2 border-b border-sfrc-100">
                <span className="text-sfrc-600">Register Number:</span>
                <span className="font-bold text-sfrc-900 font-mono">{selectedWard?.register_number || '22UCA042'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-sfrc-100">
                <span className="text-sfrc-600">Hall Ticket Issuance:</span>
                <span className="font-bold text-emerald-700">Approved & Verified</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sfrc-600">Exam Fee Clearance:</span>
                <span className="font-bold text-emerald-700">Paid in Full</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-sfrc-200 p-6 shadow-xs">
            <h2 className="text-base font-black text-sfrc-900 mb-3">Upcoming Exam Timetable</h2>
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-sfrc-surface border border-sfrc-200 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-sfrc-900">20UCSC51 • Database Management Systems</p>
                  <p className="text-[11px] text-sfrc-500 mt-0.5">04 Nov 2026 • 10:00 AM – 1:00 PM</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sfrc-100 text-sfrc-800">Theory</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-sfrc-surface border border-sfrc-200 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-sfrc-900">20UCSC52 • Web Application Development</p>
                  <p className="text-[11px] text-sfrc-500 mt-0.5">07 Nov 2026 • 10:00 AM – 1:00 PM</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sfrc-100 text-sfrc-800">Theory</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-sfrc-surface border border-sfrc-200 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-sfrc-900">20UCSC5P • DBMS Practical Lab</p>
                  <p className="text-[11px] text-sfrc-500 mt-0.5">28 Nov 2026 • 09:30 AM – 12:30 PM</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">Practical</span>
              </div>
            </div>
          </div>
        </div>

        <AskPragyaBanner />
      </div>
    </AppShell>
  );
}
