'use client';

import React, { useState, useMemo } from 'react';
import {
  Briefcase,
  Users,
  Building2,
  Award,
  TrendingUp,
  Search,
  Download,
  PlusCircle,
  CheckCircle2,
  Calendar,
  ExternalLink,
  DollarSign,
} from 'lucide-react';
import { toast } from 'sonner';
import AskPragyaBanner from '@/components/shared/AskPragyaBanner';
import { cn } from '@/lib/utils';

interface PlacementDrive {
  id: string;
  company_name: string;
  role: string;
  ctc: string;
  drive_date: string;
  venue: string;
  eligible_depts: string[];
  registered_students: number;
  offers_made: number;
  status: 'Upcoming' | 'Ongoing' | 'Completed';
}

const DEFAULT_DRIVES: PlacementDrive[] = [
  {
    id: 'drv-1',
    company_name: 'Tata Consultancy Services (TCS)',
    role: 'System Engineer & Ninja Developer',
    ctc: '₹4.5 - 7.2 LPA',
    drive_date: '2026-10-18',
    venue: 'Computer Lab 3 & Central Auditorium',
    eligible_depts: ['Computer Science', 'Mathematics', 'Physics'],
    registered_students: 210,
    offers_made: 48,
    status: 'Upcoming',
  },
  {
    id: 'drv-2',
    company_name: 'Zoho Corporation',
    role: 'Software Developer & QA Engineer',
    ctc: '₹6.0 - 8.5 LPA',
    drive_date: '2026-10-25',
    venue: 'MCA Lab & AV Hall 1',
    eligible_depts: ['Computer Science', 'Commerce (CA)'],
    registered_students: 185,
    offers_made: 26,
    status: 'Upcoming',
  },
  {
    id: 'drv-3',
    company_name: 'Wipro Technologies',
    role: 'Project Engineer (Elite Talent)',
    ctc: '₹4.2 - 5.5 LPA',
    drive_date: '2026-09-28',
    venue: 'Virtual & On-Campus Interviews',
    eligible_depts: ['All Science & Commerce Branches'],
    registered_students: 320,
    offers_made: 64,
    status: 'Completed',
  },
  {
    id: 'drv-4',
    company_name: 'HCL Technologies',
    role: 'Associate Software Analyst',
    ctc: '₹4.0 - 5.0 LPA',
    drive_date: '2026-09-15',
    venue: 'Placement Cell Boardroom',
    eligible_depts: ['Computer Science', 'Commerce'],
    registered_students: 190,
    offers_made: 42,
    status: 'Completed',
  },
];

export default function AdminPlacementsPage() {
  const [drives, setDrives] = useState<PlacementDrive[]>(DEFAULT_DRIVES);
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = useMemo(() => {
    return drives.filter(
      (d) =>
        d.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.role.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [drives, searchTerm]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* ── Top Header ────────────────────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-3xl border border-sfrc-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sfrc-100 text-sfrc-700 text-xs font-bold uppercase tracking-wider mb-2">
            <Briefcase className="w-3.5 h-3.5" />
            Career Guidance, Training & Placement Cell
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-sfrc-900 tracking-tight">
            Campus Placement Drives & Corporate Relations
          </h1>
          <p className="text-xs sm:text-sm text-sfrc-600 mt-1">
            Track recruitment drives, monitor offer letters, CTC packages, and student eligibility.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => toast.success('Placement statistics summary exported.')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-sfrc-200 bg-sfrc-50 text-sfrc-800 text-xs font-bold hover:bg-sfrc-100 transition-colors shadow-2xs"
          >
            <Download className="w-4 h-4" />
            <span>Export Report</span>
          </button>
          <button
            onClick={() => toast.info('New Recruitment Drive wizard opened.')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sfrc-700 text-white text-xs font-bold hover:bg-sfrc-800 transition-colors shadow-sm cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Schedule Drive</span>
          </button>
        </div>
      </div>

      {/* ── KPI Summary Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Placement Rate</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2 font-mono">86.4%</p>
          <p className="text-xs text-sfrc-600 mt-0.5">Final Year Eligible Batch</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Offers Issued</span>
            <Award className="w-4 h-4 text-sfrc-700" />
          </div>
          <p className="text-2xl font-black text-sfrc-900 mt-2 font-mono">482</p>
          <p className="text-xs text-sfrc-600 mt-0.5">Multiple Offer Holders</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Highest Package</span>
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-blue-700 mt-2 font-mono">₹9.2 LPA</p>
          <p className="text-xs text-sfrc-600 mt-0.5">Product Engineering Role</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Average Package</span>
            <DollarSign className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-700 mt-2 font-mono">₹4.8 LPA</p>
          <p className="text-xs text-sfrc-600 mt-0.5">Across All Disciplines</p>
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
            placeholder="Search company name, role..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-sfrc-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sfrc-500"
          />
        </div>
      </div>

      {/* ── Recruitment Drives Grid ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.map((drv) => (
          <div
            key={drv.id}
            className="bg-white rounded-3xl border border-sfrc-200 p-6 shadow-sm hover:border-sfrc-400 transition-all flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-sfrc-100 text-sfrc-800 text-xs font-bold">
                  {drv.role}
                </span>
                <span
                  className={cn(
                    'px-2.5 py-0.5 rounded-full text-xs font-bold',
                    drv.status === 'Completed'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-blue-100 text-blue-800'
                  )}
                >
                  {drv.status}
                </span>
              </div>

              <div>
                <h3 className="text-xl font-black text-sfrc-900 tracking-tight">
                  {drv.company_name}
                </h3>
                <p className="text-xs font-bold text-emerald-700 font-mono mt-0.5">
                  Package: {drv.ctc}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-sfrc-50 border border-sfrc-100 text-xs">
                <div>
                  <p className="text-[10px] text-sfrc-500 font-bold uppercase">Drive Date</p>
                  <p className="font-bold text-sfrc-900 flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-sfrc-600" />
                    {drv.drive_date}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-sfrc-500 font-bold uppercase">Offers Released</p>
                  <p className="font-bold text-sfrc-900 font-mono mt-0.5">
                    {drv.offers_made} Selected
                  </p>
                </div>
              </div>

              <div>
                <p className="text-[11px] text-sfrc-500 font-semibold mb-1">Eligible Disciplines:</p>
                <div className="flex flex-wrap gap-1.5">
                  {drv.eligible_depts.map((d, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-sfrc-100/70 text-sfrc-800 text-[11px] font-medium"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-sfrc-100 flex items-center justify-between text-xs">
              <span className="text-sfrc-600 font-medium font-mono">
                {drv.registered_students} Applicants Registered
              </span>
              <button
                onClick={() => toast.info(`Viewing applicant shortlist for ${drv.company_name}`)}
                className="font-bold text-sfrc-700 hover:text-sfrc-900 flex items-center gap-1"
              >
                View Candidates <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Bottom Pragya AI Assistant ────────────────────────────────────── */}
      <AskPragyaBanner />
    </div>
  );
}
