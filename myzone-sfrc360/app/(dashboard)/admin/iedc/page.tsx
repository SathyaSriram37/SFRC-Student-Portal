'use client';

import React, { useState, useMemo } from 'react';
import {
  Lightbulb,
  Rocket,
  Award,
  Users,
  Search,
  Download,
  PlusCircle,
  TrendingUp,
  FileCheck,
  DollarSign,
  Building2,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import AskPragyaBanner from '@/components/shared/AskPragyaBanner';
import { cn } from '@/lib/utils';

interface StartupProject {
  id: string;
  project_title: string;
  student_lead: string;
  team_size: number;
  department: string;
  stage: 'Ideation' | 'Prototype' | 'Incubated' | 'Commercialized';
  funding_granted: string;
  patent_status: string;
  mentor_faculty: string;
}

const DEFAULT_PROJECTS: StartupProject[] = [
  {
    id: 'iedc-1',
    project_title: 'EcoPack: Biodegradable Firecracker Packaging from Agro-Waste',
    student_lead: 'Deepika R & Team',
    team_size: 4,
    department: 'Chemistry & Commerce',
    stage: 'Incubated',
    funding_granted: '₹2,50,000 (DST-EDII)',
    patent_status: 'Patent Filed (Application #2026410192)',
    mentor_faculty: 'Dr. M. Geetha',
  },
  {
    id: 'iedc-2',
    project_title: 'AgroSense: IoT Soil Moisture & Automated Drip Controller',
    student_lead: 'Priya Sharma & Team',
    team_size: 3,
    department: 'Computer Science & Physics',
    stage: 'Prototype',
    funding_granted: '₹1,00,000 (MSME Student Grant)',
    patent_status: 'Provisional Spec',
    mentor_faculty: 'Dr. K. Anitha',
  },
  {
    id: 'iedc-3',
    project_title: 'Sivakasi Crafts: Digital Women Artisan Marketplace',
    student_lead: 'Kavitha S',
    team_size: 2,
    department: 'Commerce (CA)',
    stage: 'Commercialized',
    funding_granted: '₹1,50,000 (Tamil Nadu Startup Mission)',
    patent_status: 'Copyright Registered',
    mentor_faculty: 'Dr. V. Lakshmi',
  },
];

export default function AdminIEDCPage() {
  const [projects, setProjects] = useState<StartupProject[]>(DEFAULT_PROJECTS);
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = useMemo(() => {
    return projects.filter(
      (p) =>
        p.project_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.student_lead.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.department.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [projects, searchTerm]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* ── Top Header ────────────────────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-3xl border border-sfrc-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sfrc-100 text-sfrc-700 text-xs font-bold uppercase tracking-wider mb-2">
            <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
            Innovation, Incubation & Entrepreneurship Development Cell
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-sfrc-900 tracking-tight">
            IEDC Startup Incubator & Patent Tracker
          </h1>
          <p className="text-xs sm:text-sm text-sfrc-600 mt-1">
            Empower student innovators, manage seed grants, patent registrations, and startup commercialization.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => toast.success('IEDC Innovation portfolio exported.')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-sfrc-200 bg-sfrc-50 text-sfrc-800 text-xs font-bold hover:bg-sfrc-100 transition-colors shadow-2xs"
          >
            <Download className="w-4 h-4" />
            <span>Export Portfolio</span>
          </button>
          <button
            onClick={() => toast.info('New Incubation Project wizard opened.')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sfrc-700 text-white text-xs font-bold hover:bg-sfrc-800 transition-colors shadow-sm cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Incubate Project</span>
          </button>
        </div>
      </div>

      {/* ── KPI Summary Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Incubated Startups</span>
            <Rocket className="w-4 h-4 text-sfrc-700" />
          </div>
          <p className="text-2xl font-black text-sfrc-900 mt-2 font-mono">18</p>
          <p className="text-xs text-sfrc-600 mt-0.5">Active Student Ventures</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Grants Disbursed</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2 font-mono">₹14.5 Lakhs</p>
          <p className="text-xs text-sfrc-600 mt-0.5">EDII & MSME Funding</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Patents Filed</span>
            <Award className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-blue-700 mt-2 font-mono">8</p>
          <p className="text-xs text-sfrc-600 mt-0.5">Published & Granted</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Women Innovators</span>
            <Users className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-700 mt-2 font-mono">64</p>
          <p className="text-xs text-sfrc-600 mt-0.5">Student Founders</p>
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
            placeholder="Search startup venture, lead student..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-sfrc-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sfrc-500"
          />
        </div>
      </div>

      {/* ── Projects Grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((prj) => (
          <div
            key={prj.id}
            className="bg-white rounded-3xl border border-sfrc-200 p-6 shadow-sm hover:border-sfrc-400 transition-all flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-sfrc-100 text-sfrc-800 text-xs font-bold">
                  {prj.department}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                  {prj.stage}
                </span>
              </div>

              <div>
                <h3 className="text-base font-black text-sfrc-900 tracking-tight leading-snug">
                  {prj.project_title}
                </h3>
                <p className="text-xs text-sfrc-600 mt-1">
                  Lead: <span className="font-bold text-sfrc-900">{prj.student_lead}</span> ({prj.team_size} Scholars)
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-sfrc-50 border border-sfrc-100 space-y-1 text-xs">
                <p className="text-[10px] text-sfrc-500 font-bold uppercase">Grant Funding</p>
                <p className="font-bold text-emerald-700 font-mono">{prj.funding_granted}</p>
                <p className="text-[11px] text-sfrc-600 pt-1">
                  <span className="font-semibold text-sfrc-500">IPR:</span> {prj.patent_status}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-sfrc-100 text-xs text-sfrc-600">
              <p>
                Faculty Mentor: <span className="font-bold text-sfrc-900">{prj.mentor_faculty}</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Bottom Pragya AI Assistant ────────────────────────────────────── */}
      <AskPragyaBanner />
    </div>
  );
}
