'use client';

import React, { useState, useMemo } from 'react';
import {
  Home,
  Users,
  Bed,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  Download,
  Filter,
  Phone,
  Shield,
  Utensils,
  PlusCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import AskPragyaBanner from '@/components/shared/AskPragyaBanner';
import { cn } from '@/lib/utils';

interface OutpassRequest {
  id: string;
  student_name: string;
  reg_no: string;
  room_no: string;
  block: string;
  purpose: string;
  from_date: string;
  to_date: string;
  parent_contact: string;
  parent_consent: 'Verified' | 'Pending Call';
  warden_status: 'Approved' | 'Pending Review';
}

const DEFAULT_OUTPASSES: OutpassRequest[] = [
  {
    id: 'out-1',
    student_name: 'Deepika R',
    reg_no: '22UCA042',
    room_no: 'B-204',
    block: 'Block B (UG Wing)',
    purpose: 'Weekend Home Visit',
    from_date: '2026-10-10',
    to_date: '2026-10-12',
    parent_contact: '+91 94431 88219',
    parent_consent: 'Verified',
    warden_status: 'Approved',
  },
  {
    id: 'out-2',
    student_name: 'Kavitha S',
    reg_no: '23UPH018',
    room_no: 'A-108',
    block: 'Block A (PG Wing)',
    purpose: 'Inter-Collegiate Physics Seminar at Madurai',
    from_date: '2026-10-14',
    to_date: '2026-10-15',
    parent_contact: '+91 98422 10943',
    parent_consent: 'Verified',
    warden_status: 'Pending Review',
  },
  {
    id: 'out-3',
    student_name: 'Ananya M',
    reg_no: '23UCO072',
    room_no: 'B-312',
    block: 'Block B (UG Wing)',
    purpose: 'Medical Consultation',
    from_date: '2026-10-11',
    to_date: '2026-10-11',
    parent_contact: '+91 97890 22341',
    parent_consent: 'Pending Call',
    warden_status: 'Pending Review',
  },
];

export default function AdminHostelPage() {
  const [outpasses, setOutpasses] = useState<OutpassRequest[]>(DEFAULT_OUTPASSES);
  const [searchTerm, setSearchTerm] = useState('');

  const handleApprove = (id: string) => {
    setOutpasses((prev) =>
      prev.map((o) => (o.id === id ? { ...o, warden_status: 'Approved' } : o))
    );
    toast.success('Digital Outpass approved and gate pass generated!');
  };

  const filtered = useMemo(() => {
    return outpasses.filter(
      (o) =>
        o.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.reg_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.room_no.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [outpasses, searchTerm]);

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
            <span className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Resident Scholars</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2 font-mono">812</p>
          <p className="text-xs text-sfrc-600 mt-0.5">95.5% Occupancy Rate</p>
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
          <p className="text-2xl font-black text-amber-700 mt-2 font-mono">2</p>
          <p className="text-xs text-sfrc-600 mt-0.5">Awaiting Warden Review</p>
        </div>
      </div>

      {/* ── Search Bar ────────────────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-sfrc-200 flex items-center justify-between">
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
              {filtered.map((o) => (
                <tr key={o.id} className="hover:bg-sfrc-50/70 transition-colors">
                  <td className="px-5 py-3 font-bold text-sfrc-950">{o.student_name}</td>
                  <td className="px-5 py-3">
                    <p className="font-mono font-bold text-sfrc-700">{o.reg_no}</p>
                    <p className="text-[11px] text-sfrc-500">{o.room_no} • {o.block}</p>
                  </td>
                  <td className="px-5 py-3">
                    <p className="font-bold text-sfrc-900">{o.purpose}</p>
                    <p className="text-[11px] text-sfrc-600 font-mono">
                      {o.from_date} to {o.to_date}
                    </p>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={cn(
                        'px-2.5 py-0.5 rounded-full font-bold text-[10px] inline-flex items-center gap-1',
                        o.parent_consent === 'Verified'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      )}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      {o.parent_consent} ({o.parent_contact})
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={cn(
                        'px-2.5 py-0.5 rounded-full font-bold text-[10px] inline-flex items-center gap-1',
                        o.warden_status === 'Approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      )}
                    >
                      {o.warden_status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {o.warden_status !== 'Approved' ? (
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Bottom Pragya AI Assistant ────────────────────────────────────── */}
      <AskPragyaBanner />
    </div>
  );
}
