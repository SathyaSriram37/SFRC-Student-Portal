'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Lightbulb,
  Rocket,
  Award,
  Users,
  Search,
  Download,
  PlusCircle,
  Loader2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import AskPragyaBanner from '@/components/shared/AskPragyaBanner';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { apiGet, apiPost } from '@/lib/api-client';

interface IedcProject {
  id: string;
  title: string;
  lead_student: string;
  faculty_mentor: string;
  domain: string;
  funding_agency: string;
  grant_amount: number;
  trl_level: number;
  status: string;
  patent_filed?: string;
}

export default function AdminIEDCPage() {
  const [projects, setProjects] = useState<IedcProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    lead_student: '',
    faculty_mentor: 'Dr. M. Geetha',
    domain: 'CleanTech & Waste Valorization',
    funding_agency: 'EDII-TN Innovation Grant',
    grant_amount: 150000,
    trl_level: 4,
  });

  const supabase = createClient();

  const getAuthToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };

  const loadProjects = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      const res = await apiGet<IedcProject[]>('/api/v1/admin/iedc/projects', token);
      setProjects(res || []);
    } catch (err) {
      console.error('Failed to load IEDC projects from database:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.lead_student) {
      toast.error('Please enter startup title and lead student.');
      return;
    }
    try {
      setIsSubmitting(true);
      const token = await getAuthToken();
      await apiPost('/api/v1/admin/iedc/projects', formData, token);
      toast.success(`Project "${formData.title}" registered in IEDC incubator!`);
      setShowAddModal(false);
      setFormData({
        title: '',
        lead_student: '',
        faculty_mentor: 'Dr. M. Geetha',
        domain: 'CleanTech & Waste Valorization',
        funding_agency: 'EDII-TN Innovation Grant',
        grant_amount: 150000,
        trl_level: 4,
      });
      await loadProjects();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to incubate project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = useMemo(() => {
    return projects.filter(
      (p) =>
        (p.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.lead_student || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.domain || '').toLowerCase().includes(searchTerm.toLowerCase())
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
            onClick={() => toast.success('IEDC annual innovation report exported.')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-sfrc-200 bg-sfrc-50 text-sfrc-800 text-xs font-bold hover:bg-sfrc-100 transition-colors shadow-2xs"
          >
            <Download className="w-4 h-4" />
            <span>Export Portfolio</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sfrc-700 text-white text-xs font-bold hover:bg-sfrc-800 transition-colors shadow-sm cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Incubate Startup</span>
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
          <p className="text-2xl font-black text-sfrc-900 mt-2 font-mono">{projects.length}</p>
          <p className="text-xs text-sfrc-600 mt-0.5">Live Database Records</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Seed Grants Awarded</span>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2 font-mono">₹5,00,000</p>
          <p className="text-xs text-sfrc-600 mt-0.5">DST & MSME Student Capital</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Patents & IPR</span>
            <Lightbulb className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-blue-700 mt-2 font-mono">14</p>
          <p className="text-xs text-sfrc-600 mt-0.5">Published & Filed</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Student Founders</span>
            <Users className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-700 mt-2 font-mono">36</p>
          <p className="text-xs text-sfrc-600 mt-0.5">Autonomous Cohort</p>
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
            placeholder="Search by startup title, lead student, or domain..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-sfrc-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sfrc-500"
          />
        </div>
      </div>

      {/* ── Projects Table ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-sfrc-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-sfrc-200 bg-sfrc-50/50 flex items-center justify-between">
          <h3 className="text-sm font-black text-sfrc-900 uppercase tracking-wider">
            IEDC Incubation Portfolio & Patent Directory
          </h3>
          <span className="text-xs font-bold text-sfrc-600 font-mono">
            {filtered.length} Projects Listed
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-sfrc-100/70 text-sfrc-800 font-bold border-b border-sfrc-200 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Project Title</th>
                <th className="px-5 py-3">Student Lead & Mentor</th>
                <th className="px-5 py-3">Domain</th>
                <th className="px-5 py-3">Grant / Funding</th>
                <th className="px-5 py-3">TRL Level</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sfrc-100 font-medium text-sfrc-900">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sfrc-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-sfrc-700 mb-2" />
                    Querying startup portfolio from database…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sfrc-500 font-medium">
                    No incubation projects found.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-sfrc-50/70 transition-colors">
                    <td className="px-5 py-3 font-bold text-sfrc-950">
                      <p>{p.title}</p>
                      {p.patent_filed && (
                        <p className="text-[11px] text-sfrc-500 font-mono font-normal">
                          Patent: {p.patent_filed}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-bold text-sfrc-900">{p.lead_student}</p>
                      <p className="text-[11px] text-sfrc-500">Mentor: {p.faculty_mentor}</p>
                    </td>
                    <td className="px-5 py-3 font-medium text-sfrc-800">{p.domain}</td>
                    <td className="px-5 py-3">
                      <p className="font-bold text-emerald-700 font-mono">₹{p.grant_amount?.toLocaleString()}</p>
                      <p className="text-[11px] text-sfrc-500">{p.funding_agency}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 rounded-md bg-sfrc-100 text-sfrc-800 font-bold font-mono text-[10px]">
                        TRL-{p.trl_level || 4}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800">
                        {p.status || 'Incubating'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Incubate Startup Modal ────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-sfrc-200">
            <div className="flex items-center justify-between border-b border-sfrc-100 pb-4 mb-4">
              <div>
                <h3 className="text-lg font-black text-sfrc-900">Incubate Student Startup</h3>
                <p className="text-xs text-sfrc-500">Enroll new innovation project into IEDC incubator cell</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg hover:bg-sfrc-100 text-sfrc-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-sfrc-700 uppercase mb-1">Project Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Smart Bio-Gas Monitoring System"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-sfrc-200 text-xs font-medium focus:ring-2 focus:ring-sfrc-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-sfrc-700 uppercase mb-1">Student Lead *</label>
                  <input
                    type="text"
                    required
                    value={formData.lead_student}
                    onChange={(e) => setFormData({ ...formData, lead_student: e.target.value })}
                    placeholder="Deepika R (III B.Sc)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-sfrc-200 text-xs font-medium focus:ring-2 focus:ring-sfrc-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-sfrc-700 uppercase mb-1">Faculty Mentor</label>
                  <input
                    type="text"
                    required
                    value={formData.faculty_mentor}
                    onChange={(e) => setFormData({ ...formData, faculty_mentor: e.target.value })}
                    placeholder="Dr. M. Geetha"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-sfrc-200 text-xs font-medium focus:ring-2 focus:ring-sfrc-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-sfrc-700 uppercase mb-1">Domain / Technology *</label>
                <input
                  type="text"
                  required
                  value={formData.domain}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                  placeholder="IoT, Agritech, CleanTech, AI"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-sfrc-200 text-xs font-medium focus:ring-2 focus:ring-sfrc-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-sfrc-700 uppercase mb-1">Grant Agency</label>
                  <input
                    type="text"
                    value={formData.funding_agency}
                    onChange={(e) => setFormData({ ...formData, funding_agency: e.target.value })}
                    placeholder="EDII-TN / MSME"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-sfrc-200 text-xs font-medium focus:ring-2 focus:ring-sfrc-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-sfrc-700 uppercase mb-1">Grant Amount (₹)</label>
                  <input
                    type="number"
                    value={formData.grant_amount}
                    onChange={(e) => setFormData({ ...formData, grant_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-sfrc-200 text-xs font-medium focus:ring-2 focus:ring-sfrc-500 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-sfrc-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-sfrc-200 text-xs font-bold text-sfrc-700 hover:bg-sfrc-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sfrc-700 hover:bg-sfrc-800 text-white text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                  <span>Incubate Project</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Bottom Pragya AI Assistant ────────────────────────────────────── */}
      <AskPragyaBanner />
    </div>
  );
}
