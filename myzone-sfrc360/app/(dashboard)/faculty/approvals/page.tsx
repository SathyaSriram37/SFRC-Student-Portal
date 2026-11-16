'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  Calendar,
  User,
  Shield,
  Loader2,
  FileCheck,
} from 'lucide-react';
import { apiGet, apiPut } from '@/lib/api-client';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface PendingLeaveItem {
  id: string;
  student_name: string;
  register_number: string;
  leave_type: string;
  reason: string;
  from_date: string;
  to_date: string;
  total_days: number;
  status: string;
  approval_remarks?: string;
  created_at?: string;
}

export default function InstitutionalApprovalsPage() {
  const [leaves, setLeaves] = useState<PendingLeaveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  async function loadPending() {
    try {
      setLoading(true);
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await apiGet<PendingLeaveItem[]>('/api/v1/faculty/leaves/pending', token);
      if (res) {
        setLeaves(res);
      }
    } catch (err) {
      console.error('Failed to load pending leaves:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPending();
  }, []);

  const handleReview = async (id: string, status: 'approved' | 'rejected') => {
    try {
      setProcessingId(id);
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      await apiPut(
        `/api/v1/faculty/leaves/${id}/review`,
        {
          status,
          remarks: status === 'approved' ? 'Endorsed & Approved by Principal' : 'Rejected per institutional criteria',
        },
        token
      );
      toast.success(`Application marked as ${status.toUpperCase()} successfully!`);
      // Update local state
      setLeaves((prev) =>
        prev.map((l) => (l.id === id ? { ...l, status } : l))
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Action failed';
      toast.error(msg);
    } finally {
      setProcessingId(null);
    }
  };

  const pendingList = leaves.filter((l) => l.status === 'pending');
  const pastList = leaves.filter((l) => l.status !== 'pending');

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/faculty/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-sfrc-600 hover:text-sfrc-900 transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-sfrc-900 tracking-tight flex items-center gap-2.5">
            <FileCheck className="w-7 h-7 text-sfrc-700" />
            Institutional Approvals & Endorsements
          </h1>
          <p className="text-xs sm:text-sm text-sfrc-600 mt-1">
            Review, sanction, and endorse student on-duty (OD), medical, and academic leave requests.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 text-xs font-black border border-amber-200">
          <Clock className="w-4 h-4 text-amber-600" />
          {pendingList.length} Pending Actions
        </div>
      </div>

      {/* Pending Applications Section */}
      <div className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-wider text-sfrc-800 flex items-center gap-2">
          <span>Pending Student Applications ({pendingList.length})</span>
        </h2>

        {loading ? (
          <div className="bg-white rounded-2xl p-12 border border-sfrc-200 flex flex-col items-center justify-center gap-3 text-sfrc-500 text-xs">
            <Loader2 className="w-6 h-6 animate-spin text-sfrc-700" />
            Loading pending approvals...
          </div>
        ) : pendingList.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 border border-sfrc-200 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h3 className="text-sm font-bold text-sfrc-900">All Clear! No Pending Approvals</h3>
            <p className="text-xs text-sfrc-500">Every student leave and on-duty application has been reviewed.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingList.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-5 border border-sfrc-200 shadow-2xs space-y-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-sfrc-900">{item.student_name}</h3>
                    <p className="text-xs font-mono text-sfrc-500 font-bold">{item.register_number}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">
                    {item.leave_type || 'Leave'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-sfrc-50 border border-sfrc-100 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-sfrc-600">
                    <span className="flex items-center gap-1 font-semibold">
                      <Calendar className="w-3.5 h-3.5 text-sfrc-400" /> Duration:
                    </span>
                    <span className="font-bold text-sfrc-900">
                      {item.from_date} to {item.to_date} ({item.total_days} {item.total_days === 1 ? 'day' : 'days'})
                    </span>
                  </div>
                  <p className="text-sfrc-700 pt-1 border-t border-sfrc-200/60">
                    <span className="font-bold text-sfrc-900">Reason:</span> {item.reason}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    disabled={processingId === item.id}
                    onClick={() => handleReview(item.id, 'approved')}
                    className="flex-1 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Approve
                  </button>
                  <button
                    disabled={processingId === item.id}
                    onClick={() => handleReview(item.id, 'rejected')}
                    className="flex-1 py-2 rounded-xl text-xs font-bold bg-red-100 hover:bg-red-200 text-red-700 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past Decision History */}
      {pastList.length > 0 && (
        <div className="space-y-3 pt-6 border-t border-sfrc-200">
          <h2 className="text-sm font-black uppercase tracking-wider text-sfrc-700">
            Recent Decisions ({pastList.length})
          </h2>
          <div className="bg-white rounded-2xl border border-sfrc-200 overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-sfrc-50 text-sfrc-600 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="p-3">Student</th>
                  <th className="p-3">Register No</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Duration</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sfrc-100">
                {pastList.map((item) => (
                  <tr key={item.id}>
                    <td className="p-3 font-bold text-sfrc-900">{item.student_name}</td>
                    <td className="p-3 font-mono text-sfrc-600">{item.register_number}</td>
                    <td className="p-3 uppercase text-[10px] font-bold text-sfrc-700">{item.leave_type}</td>
                    <td className="p-3 text-sfrc-600">{item.total_days} days</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          item.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="p-3 text-sfrc-500 italic">{item.approval_remarks || 'None'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
