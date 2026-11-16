'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ClipboardList,
  ArrowLeft,
  Calendar,
  Send,
  CheckCircle2,
  Clock,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';

export default function FacultyLeavePage() {
  const [leaveType, setLeaveType] = useState('Casual Leave (CL)');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromDate || !toDate || !reason.trim()) {
      toast.error('Please fill in all leave application details');
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      toast.success('Faculty leave application submitted to Principal for approval!');
      setReason('');
      setFromDate('');
      setToDate('');
    }, 600);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <Link
          href="/faculty/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-sfrc-600 hover:text-sfrc-900 transition-colors mb-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <h1 className="text-2xl sm:text-3xl font-black text-sfrc-900 tracking-tight flex items-center gap-2.5">
          <ClipboardList className="w-7 h-7 text-sfrc-700" />
          Faculty Leave Applications
        </h1>
        <p className="text-xs sm:text-sm text-sfrc-600 mt-1">
          Apply for Casual Leave (CL), On-Duty (OD) for University Valuation/Seminars, or Medical Leave.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-sfrc-200 shadow-2xs space-y-5">
        <h2 className="text-sm font-black text-sfrc-900 uppercase tracking-wider">
          New Leave Request
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-sfrc-800 mb-1">Leave Category</label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-sfrc-200 text-xs text-sfrc-900 focus:outline-none focus:ring-2 focus:ring-sfrc-600"
            >
              <option value="Casual Leave (CL)">Casual Leave (CL)</option>
              <option value="On-Duty (OD) - Board of Studies / Valuation">On-Duty (OD) - Board of Studies / Valuation</option>
              <option value="On-Duty (OD) - Research Conference">On-Duty (OD) - Research Conference</option>
              <option value="Medical Leave (ML)">Medical Leave (ML)</option>
              <option value="Earned Leave (EL)">Earned Leave (EL)</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-sfrc-800 mb-1">From Date</label>
              <input
                type="date"
                required
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-sfrc-200 text-xs text-sfrc-900 focus:outline-none focus:ring-2 focus:ring-sfrc-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-sfrc-800 mb-1">To Date</label>
              <input
                type="date"
                required
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-sfrc-200 text-xs text-sfrc-900 focus:outline-none focus:ring-2 focus:ring-sfrc-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-sfrc-800 mb-1">Reason & Class Alteration Plan</label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="State purpose of leave and faculty colleague handling substituted class hours..."
              className="w-full px-3.5 py-2 rounded-xl border border-sfrc-200 text-xs text-sfrc-900 focus:outline-none focus:ring-2 focus:ring-sfrc-600"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl text-xs font-bold bg-sfrc-900 hover:bg-sfrc-800 text-white transition-colors flex items-center gap-2 shadow-md"
            >
              <Send className="w-4 h-4" /> Submit Application
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
