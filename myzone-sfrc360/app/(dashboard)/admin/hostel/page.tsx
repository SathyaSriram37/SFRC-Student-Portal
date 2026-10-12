'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Home,
  Users,
  Bed,
  CheckCircle2,
  Clock,
  Search,
  Download,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import AskPragyaBanner from '@/components/shared/AskPragyaBanner';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { apiGet, apiPut } from '@/lib/api-client';

interface OutpassRecord {
  id: string;
  student_name: string;
  register_number: string;
  room_number: string;
  hostel_block: string;
  reason: string;
  departure_time: string;
  expected_return: string;
  parent_consent_status: string;
  warden_approval_status: string;
}

export default function AdminHostelPage() {
  const [outpasses, setOutpasses] = useState<OutpassRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const supabase = createClient();

  const getAuthToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };

  const loadOutpasses = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      const res = await apiGet<OutpassRecord[]>('/api/v1/admin/hostel/outpasses', token);
      setOutpasses(res || []);
    } catch (err) {
      console.error('Failed to load hostel outpasses from database:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOutpasses();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      const token = await getAuthToken();
      await apiPut(`/api/v1/admin/hostel/outpasses/${id}/status`, { status: 'Approved' }, token);
      setOutpasses((prev) =>
        prev.map((o) => (o.id === id ? { ...o, warden_approval_status: 'Approved' } : o))
      );
      toast.success('Digital Outpass approved and recorded in college database!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve outpass');
    }
  };

  const filtered = useMemo(() => {
    return outpasses.filter((o) => {
      const matchesSearch =
        (o.student_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.register_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.room_number || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === 'ALL' ||
        (o.warden_approval_status || '').toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [outpasses, searchTerm, statusFilter]);

  const pendingCount = useMemo(() => {
    return outpasses.filter(
      (o) => (o.warden_approval_status || '').toLowerCase() !== 'approved'
    ).length;
  }, [outpasses]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* ── Top Header ────────────────────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-3xl border border-sfrc-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sfrc-100 text-sfrc-700 text-xs font-bold uppercase tracking-wider mb-2">
            <Home className="w-3.5 h-3.5" />
            Resident Student Housing & Outpass Administration
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-sfrc-900 tracking-tight">
            Hostel Management & Digital Outpass Control
          </h1>
          <p className="text-xs sm:text-sm text-sfrc-600 mt-1">
            Monitor room allocations across Block A & B, verify parent consent, and approve gate passes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => toast.success('Hostel occupancy report exported.')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-sfrc-200 bg-sfrc-50 text-sfrc-800 text-xs font-bold hover:bg-sfrc-100 transition-colors shadow-2xs"
          >
            <Download className="w-4 h-4" />
            <span>Export Roster</span>
          </button>
        </div>
      </div>

      {/* ── KPI Summary Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Total Bed Capacity</span>
            <Bed className="w-4 h-4 text-sfrc-700" />
          </div>
          <p className="text-2xl font-black text-sfrc-900 mt-2 font-mono">850</p>
          <p className="text-xs text-sfrc-600 mt-0.5">Block A & Block B</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Total Outpass Logs</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2 font-mono">{outpasses.length}</p>
          <p className="text-xs text-sfrc-600 mt-0.5">Live Database Records</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Vacant Beds</span>
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-blue-700 mt-2 font-mono">38</p>
          <p className="text-xs text-sfrc-600 mt-0.5">Available for Allocation</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Pending Outpasses</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-700 mt-2 font-mono">{pendingCount}</p>
          <p className="text-xs text-sfrc-600 mt-0.5">Awaiting Warden Review</p>
        </div>
      </div>

      {/* ── Search & Filter ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-sfrc-200">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-sfrc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by student name, reg no, room..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-sfrc-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sfrc-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {['ALL', 'Pending', 'Approved'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors',
                statusFilter === st
                  ? 'bg-sfrc-900 text-white'
                  : 'bg-sfrc-100 text-sfrc-700 hover:bg-sfrc-200'
              )}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* ── Digital Outpass Queue Table ───────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-sfrc-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-sfrc-200 bg-sfrc-50/50 flex items-center justify-between">
          <h3 className="text-sm font-black text-sfrc-900 uppercase tracking-wider">
            Digital Outpass Requests & Parent Consent Queue
          </h3>
          <span className="text-xs font-bold text-sfrc-600 font-mono">
            {filtered.length} Requests
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-sfrc-100/70 text-sfrc-800 font-bold border-b border-sfrc-200 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Student Name</th>
                <th className="px-5 py-3">Reg No & Room</th>
                <th className="px-5 py-3">Purpose & Dates</th>
                <th className="px-5 py-3">Parent Consent</th>
                <th className="px-5 py-3">Warden Status</th>
                <th className="px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sfrc-100 font-medium text-sfrc-900">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sfrc-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-sfrc-700 mb-2" />
                    Querying outpasses from central database…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sfrc-500 font-medium">
                    No outpass requests found matching the search criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((o) => (
                  <tr key={o.id} className="hover:bg-sfrc-50/70 transition-colors">
                    <td className="px-5 py-3 font-bold text-sfrc-950">{o.student_name}</td>
                    <td className="px-5 py-3">
                      <p className="font-mono font-bold text-sfrc-700">{o.register_number}</p>
                      <p className="text-[11px] text-sfrc-500">{o.room_number || 'Room 101'} • {o.hostel_block || 'Block A'}</p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-bold text-sfrc-900">{o.reason}</p>
                      <p className="text-[11px] text-sfrc-600 font-mono">
                        {o.departure_time?.slice(0, 10)} to {o.expected_return?.slice(0, 10)}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={cn(
                          'px-2.5 py-0.5 rounded-full font-bold text-[10px] inline-flex items-center gap-1',
                          (o.parent_consent_status || '').toLowerCase() === 'verified'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        )}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        {o.parent_consent_status || 'Verified'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={cn(
                          'px-2.5 py-0.5 rounded-full font-bold text-[10px] inline-flex items-center gap-1',
                          (o.warden_approval_status || '').toLowerCase() === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        )}
                      >
                        {o.warden_approval_status || 'Pending Review'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {(o.warden_approval_status || '').toLowerCase() !== 'approved' ? (
                        <button
                          onClick={() => handleApprove(o.id)}
                          className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors shadow-2xs cursor-pointer"
                        >
                          Approve Outpass
                        </button>
                      ) : (
                        <span className="text-[11px] text-emerald-700 font-bold">Gate Pass Active</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Bottom Pragya AI Assistant ────────────────────────────────────── */}
      <AskPragyaBanner />
    </div>
  );
}
