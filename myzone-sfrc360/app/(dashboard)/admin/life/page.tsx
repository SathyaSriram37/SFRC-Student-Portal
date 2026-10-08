'use client';

import React, { useState, useMemo } from 'react';
import {
  Heart,
  Users,
  Award,
  Calendar,
  Search,
  Download,
  PlusCircle,
  CheckCircle2,
  Sparkles,
  Shield,
  Activity,
} from 'lucide-react';
import { toast } from 'sonner';
import AskPragyaBanner from '@/components/shared/AskPragyaBanner';
import { cn } from '@/lib/utils';

interface ClubItem {
  id: string;
  name: string;
  category: 'Extension Service' | 'Cultural & Arts' | 'Social Service' | 'Special Cell';
  total_members: number;
  convenor_faculty: string;
  student_secretary: string;
  annual_events_count: number;
  credits_awarded: number;
}

const DEFAULT_CLUBS: ClubItem[] = [
  {
    id: 'club-1',
    name: 'National Service Scheme (NSS - 5 Units)',
    category: 'Extension Service',
    total_members: 500,
    convenor_faculty: 'Dr. R. Kamala',
    student_secretary: 'Deepika R',
    annual_events_count: 18,
    credits_awarded: 2,
  },
  {
    id: 'club-2',
    name: 'National Cadet Corps (NCC - Army & Naval Wings)',
    category: 'Extension Service',
    total_members: 160,
    convenor_faculty: 'Lt. Dr. M. Geetha',
    student_secretary: 'Priya Sharma',
    annual_events_count: 12,
    credits_awarded: 2,
  },
  {
    id: 'club-3',
    name: 'Youth Red Cross (YRC) & Blood Donors Club',
    category: 'Social Service',
    total_members: 240,
    convenor_faculty: 'Dr. V. Lakshmi',
    student_secretary: 'Kavitha S',
    annual_events_count: 8,
    credits_awarded: 1,
  },
  {
    id: 'club-4',
    name: 'Fine Arts Association & Cultural Troupe',
    category: 'Cultural & Arts',
    total_members: 320,
    convenor_faculty: 'Dr. S. Meenakshi',
    student_secretary: 'Ananya M',
    annual_events_count: 15,
    credits_awarded: 2,
  },
  {
    id: 'club-5',
    name: 'Eco Club & Green Campus Initiative',
    category: 'Special Cell',
    total_members: 180,
    convenor_faculty: 'Dr. K. Anitha',
    student_secretary: 'Meenakshi N',
    annual_events_count: 6,
    credits_awarded: 1,
  },
];

export default function AdminStudentLifePage() {
  const [clubs, setClubs] = useState<ClubItem[]>(DEFAULT_CLUBS);
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = useMemo(() => {
    return clubs.filter(
      (c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.convenor_faculty.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [clubs, searchTerm]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* ── Top Header ────────────────────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-3xl border border-sfrc-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sfrc-100 text-sfrc-700 text-xs font-bold uppercase tracking-wider mb-2">
            <Heart className="w-3.5 h-3.5 text-rose-600" />
            Student Union, Extension Activities & Clubs Registry
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-sfrc-900 tracking-tight">
            Student Life, NSS, NCC & Cultural Associations
          </h1>
          <p className="text-xs sm:text-sm text-sfrc-600 mt-1">
            Oversee extension services, social clubs, fine arts troupe, and part V activity credits.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => toast.success('Student life club roster exported.')}
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
            <span className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Active Clubs</span>
            <Heart className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-black text-sfrc-900 mt-2 font-mono">24</p>
          <p className="text-xs text-sfrc-600 mt-0.5">Clubs & Associations</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Total Enrolled</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2 font-mono">1,400+</p>
          <p className="text-xs text-sfrc-600 mt-0.5">Student Volunteers</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">NSS & NCC Units</span>
            <Shield className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-blue-700 mt-2 font-mono">7 Units</p>
          <p className="text-xs text-sfrc-600 mt-0.5">660 Trained Cadets</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Part V Credits</span>
            <Award className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-700 mt-2 font-mono">2 Credits</p>
          <p className="text-xs text-sfrc-600 mt-0.5">Mandatory for Degree</p>
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
            placeholder="Search club name, convenor..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-sfrc-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sfrc-500"
          />
        </div>
      </div>

      {/* ── Clubs Grid ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((cl) => (
          <div
            key={cl.id}
            className="bg-white rounded-3xl border border-sfrc-200 p-6 shadow-sm hover:border-sfrc-400 transition-all flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-sfrc-100 text-sfrc-800 text-xs font-bold">
                  {cl.category}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold font-mono">
                  {cl.total_members} Members
                </span>
              </div>

              <div>
                <h3 className="text-lg font-black text-sfrc-900 tracking-tight leading-snug">
                  {cl.name}
                </h3>
              </div>

              <div className="p-3 rounded-2xl bg-sfrc-50 border border-sfrc-100 space-y-1 text-xs text-sfrc-700">
                <p>
                  <span className="font-semibold text-sfrc-500">Faculty Convenor:</span>{' '}
                  <span className="font-bold text-sfrc-900">{cl.convenor_faculty}</span>
                </p>
                <p>
                  <span className="font-semibold text-sfrc-500">Student Secretary:</span>{' '}
                  <span className="font-bold text-sfrc-900">{cl.student_secretary}</span>
                </p>
                <p>
                  <span className="font-semibold text-sfrc-500">Annual Camps / Events:</span>{' '}
                  <span className="font-bold text-sfrc-900 font-mono">{cl.annual_events_count} Activities</span>
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-sfrc-100 flex items-center justify-between text-xs">
              <span className="text-sfrc-600 font-medium">Part V Extension Credit:</span>
              <span className="font-bold text-sfrc-900 font-mono bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
                {cl.credits_awarded} Credits
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Bottom Pragya AI Assistant ────────────────────────────────────── */}
      <AskPragyaBanner />
    </div>
  );
}
