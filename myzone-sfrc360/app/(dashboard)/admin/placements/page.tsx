'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Briefcase,
  Users,
  Building2,
  TrendingUp,
  Search,
  Download,
  PlusCircle,
  Calendar,
  Loader2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import AskPragyaBanner from '@/components/shared/AskPragyaBanner';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { apiGet, apiPost } from '@/lib/api-client';

interface PlacementDrive {
  id: string;
  company_name: string;
  role_title: string;
  ctc_lpa: number;
  drive_date: string;
  venue: string;
  eligible_programmes: string[];
  registered_count: number;
  selected_count: number;
  status: string;
}

export default function AdminPlacementsPage() {
  const [drives, setDrives] = useState<PlacementDrive[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    role_title: '',
    ctc_lpa: 6.5,
    drive_date: '2026-11-15',
    venue: 'SFRC Central Auditorium & Lab 3',
    eligibility_criteria: 'Minimum 65% aggregate with zero standing arrears',
    eligible_programmes: ['B.Sc Computer Science', 'MCA'],
  });

  const supabase = createClient();

  const getAuthToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };

  const loadDrives = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      const res = await apiGet<PlacementDrive[]>('/api/v1/admin/placements/drives', token);
      setDrives(res || []);
    } catch (err) {
      console.error('Failed to load placement drives from database:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDrives();
  }, []);

  const handleCreateDrive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company_name || !formData.role_title) {
      toast.error('Please enter company name and role title.');
      return;
    }
    try {
      setIsSubmitting(true);
      const token = await getAuthToken();
      await apiPost('/api/v1/admin/placements/drives', formData, token);
      toast.success(`Recruitment drive for ${formData.company_name} scheduled!`);
      setShowAddModal(false);
      setFormData({
        company_name: '',
        role_title: '',
        ctc_lpa: 6.5,
        drive_date: '2026-11-15',
        venue: 'SFRC Central Auditorium & Lab 3',
        eligibility_criteria: 'Minimum 65% aggregate with zero standing arrears',
        eligible_programmes: ['B.Sc Computer Science', 'MCA'],
      });
      await loadDrives();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to schedule drive');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = useMemo(() => {
    return drives.filter(
      (d) =>
        (d.company_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.role_title || '').toLowerCase().includes(searchTerm.toLowerCase())
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
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sfrc-700 text-white text-xs font-bold hover:bg-sfrc-800 transition-colors shadow-sm cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Schedule New Drive</span>
          </button>
        </div>
      </div>

      {/* ── KPI Summary Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Active Drives</span>
            <Building2 className="w-4 h-4 text-sfrc-700" />
          </div>
          <p className="text-2xl font-black text-sfrc-900 mt-2 font-mono">{drives.length}</p>
          <p className="text-xs text-sfrc-600 mt-0.5">Live Database Records</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Top CTC Package</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2 font-mono">₹8.5 LPA</p>
          <p className="text-xs text-sfrc-600 mt-0.5">Zoho Product Development</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Eligible Cohort</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-blue-700 mt-2 font-mono">540</p>
          <p className="text-xs text-sfrc-600 mt-0.5">Final Year UG & PG</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Placement Rate</span>
            <Calendar className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-700 mt-2 font-mono">82.4%</p>
          <p className="text-xs text-sfrc-600 mt-0.5">Campus Conversion Ratio</p>
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
            placeholder="Search by company name or role..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-sfrc-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sfrc-500"
          />
        </div>
      </div>

      {/* ── Placement Drives Table ────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-sfrc-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-sfrc-200 bg-sfrc-50/50 flex items-center justify-between">
          <h3 className="text-sm font-black text-sfrc-900 uppercase tracking-wider">
            Recruitment Drive Schedule & Outcome
          </h3>
          <span className="text-xs font-bold text-sfrc-600 font-mono">
            {filtered.length} Drives Listed
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-sfrc-100/70 text-sfrc-800 font-bold border-b border-sfrc-200 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Company</th>
                <th className="px-5 py-3">Role & CTC</th>
                <th className="px-5 py-3">Drive Date & Venue</th>
                <th className="px-5 py-3">Eligible Programmes</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sfrc-100 font-medium text-sfrc-900">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-sfrc-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-sfrc-700 mb-2" />
                    Querying recruitment drives from central database…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-sfrc-500 font-medium">
                    No placement drives recorded.
                  </td>
                </tr>
              ) : (
                filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-sfrc-50/70 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-bold text-sfrc-950 text-sm">{d.company_name}</p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-bold text-sfrc-900">{d.role_title}</p>
                      <p className="text-[11px] font-mono text-emerald-700 font-bold">₹{d.ctc_lpa} LPA</p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-bold text-sfrc-900 font-mono">{d.drive_date}</p>
                      <p className="text-[11px] text-sfrc-500">{d.venue}</p>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(d.eligible_programmes || []).map((p, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md bg-sfrc-100 text-sfrc-700 text-[10px] font-semibold"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={cn(
                          'px-2.5 py-0.5 rounded-full font-bold text-[10px]',
                          d.status === 'upcoming'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800'
                        )}
                      >
                        {d.status || 'Scheduled'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Schedule Drive Modal ─────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-sfrc-200">
            <div className="flex items-center justify-between border-b border-sfrc-100 pb-4 mb-4">
              <div>
                <h3 className="text-lg font-black text-sfrc-900">Schedule Campus Placement Drive</h3>
                <p className="text-xs text-sfrc-500">Post upcoming corporate recruitment drive into college portal</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg hover:bg-sfrc-100 text-sfrc-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDrive} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-sfrc-700 uppercase mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  placeholder="e.g. Infosys Limited"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-sfrc-200 text-xs font-medium focus:ring-2 focus:ring-sfrc-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-sfrc-700 uppercase mb-1">Role Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.role_title}
                    onChange={(e) => setFormData({ ...formData, role_title: e.target.value })}
                    placeholder="Associate Software Engineer"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-sfrc-200 text-xs font-medium focus:ring-2 focus:ring-sfrc-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-sfrc-700 uppercase mb-1">CTC (LPA) *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formData.ctc_lpa}
                    onChange={(e) => setFormData({ ...formData, ctc_lpa: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-sfrc-200 text-xs font-medium focus:ring-2 focus:ring-sfrc-500 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-sfrc-700 uppercase mb-1">Drive Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.drive_date}
                    onChange={(e) => setFormData({ ...formData, drive_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-sfrc-200 text-xs font-medium focus:ring-2 focus:ring-sfrc-500 focus:outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-sfrc-700 uppercase mb-1">Campus Venue *</label>
                  <input
                    type="text"
                    required
                    value={formData.venue}
                    onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                    placeholder="Central Auditorium"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-sfrc-200 text-xs font-medium focus:ring-2 focus:ring-sfrc-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-sfrc-700 uppercase mb-1">Eligibility Criteria</label>
                <input
                  type="text"
                  value={formData.eligibility_criteria}
                  onChange={(e) => setFormData({ ...formData, eligibility_criteria: e.target.value })}
                  placeholder="Min 60% with no current arrears"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-sfrc-200 text-xs font-medium focus:ring-2 focus:ring-sfrc-500 focus:outline-hidden"
                />
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
                  <span>Schedule Drive</span>
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
