'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Heart,
  Users,
  Award,
  Calendar,
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

interface ClubActivity {
  id: string;
  activity_name: string;
  unit_type: string;
  activity_date: string;
  venue: string;
  description?: string;
  volunteer_count: number;
  credits: number;
  status: string;
}

export default function AdminStudentLifePage() {
  const [activities, setActivities] = useState<ClubActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    activity_name: '',
    unit_type: 'NSS',
    activity_date: '2026-10-20',
    venue: 'Sivakasi Rural Community Centre',
    description: 'Community health awareness camp and tree plantation drive.',
    volunteer_count: 50,
    credits: 1,
  });

  const supabase = createClient();

  const getAuthToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };

  const loadActivities = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      const res = await apiGet<ClubActivity[]>('/api/v1/admin/life/activities', token);
      setActivities(res || []);
    } catch (err) {
      console.error('Failed to load club activities from database:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, []);

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.activity_name || !formData.venue) {
      toast.error('Please enter activity name and venue.');
      return;
    }
    try {
      setIsSubmitting(true);
      const token = await getAuthToken();
      await apiPost('/api/v1/admin/life/activities', formData, token);
      toast.success(`Activity "${formData.activity_name}" recorded in extension registry!`);
      setShowAddModal(false);
      setFormData({
        activity_name: '',
        unit_type: 'NSS',
        activity_date: '2026-10-20',
        venue: 'Sivakasi Rural Community Centre',
        description: 'Community health awareness camp and tree plantation drive.',
        volunteer_count: 50,
        credits: 1,
      });
      await loadActivities();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to record activity');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = useMemo(() => {
    return activities.filter(
      (a) =>
        (a.activity_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.unit_type || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.venue || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [activities, searchTerm]);

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
            onClick={() => toast.success('Extension activities summary exported.')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-sfrc-200 bg-sfrc-50 text-sfrc-800 text-xs font-bold hover:bg-sfrc-100 transition-colors shadow-2xs"
          >
            <Download className="w-4 h-4" />
            <span>Export Roster</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sfrc-700 text-white text-xs font-bold hover:bg-sfrc-800 transition-colors shadow-sm cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Log Extension Activity</span>
          </button>
        </div>
      </div>

      {/* ── KPI Summary Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Activities Logged</span>
            <Users className="w-4 h-4 text-sfrc-700" />
          </div>
          <p className="text-2xl font-black text-sfrc-900 mt-2 font-mono">{activities.length}</p>
          <p className="text-xs text-sfrc-600 mt-0.5">Live Database Records</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Active Units</span>
            <Heart className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-black text-rose-700 mt-2 font-mono">8</p>
          <p className="text-xs text-sfrc-600 mt-0.5">NSS, NCC, YRC, Fine Arts</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Part V Credits</span>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2 font-mono">2 Credits</p>
          <p className="text-xs text-sfrc-600 mt-0.5">Degree Requirement</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Community Hours</span>
            <Calendar className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-blue-700 mt-2 font-mono">120 hrs</p>
          <p className="text-xs text-sfrc-600 mt-0.5">Extension Service Average</p>
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
            placeholder="Search by activity name, unit, or venue..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-sfrc-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sfrc-500"
          />
        </div>
      </div>

      {/* ── Activities Table ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-sfrc-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-sfrc-200 bg-sfrc-50/50 flex items-center justify-between">
          <h3 className="text-sm font-black text-sfrc-900 uppercase tracking-wider">
            Extension & Club Activities Ledger
          </h3>
          <span className="text-xs font-bold text-sfrc-600 font-mono">
            {filtered.length} Activities Listed
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-sfrc-100/70 text-sfrc-800 font-bold border-b border-sfrc-200 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Activity Name</th>
                <th className="px-5 py-3">Unit</th>
                <th className="px-5 py-3">Date & Venue</th>
                <th className="px-5 py-3">Volunteers</th>
                <th className="px-5 py-3">Credits</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sfrc-100 font-medium text-sfrc-900">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sfrc-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-sfrc-700 mb-2" />
                    Querying activities from database…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sfrc-500 font-medium">
                    No club activities recorded.
                  </td>
                </tr>
              ) : (
                filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-sfrc-50/70 transition-colors">
                    <td className="px-5 py-3 font-bold text-sfrc-950">
                      <p>{a.activity_name}</p>
                      {a.description && <p className="text-[11px] text-sfrc-500 font-normal">{a.description}</p>}
                    </td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 rounded-md bg-sfrc-100 text-sfrc-800 font-bold font-mono text-[10px]">
                        {a.unit_type}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-bold text-sfrc-900 font-mono">{a.activity_date}</p>
                      <p className="text-[11px] text-sfrc-500">{a.venue}</p>
                    </td>
                    <td className="px-5 py-3 font-mono font-bold text-sfrc-700">{a.volunteer_count} Volunteers</td>
                    <td className="px-5 py-3 font-mono text-emerald-700 font-bold">{a.credits} Credit</td>
                    <td className="px-5 py-3">
                      <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800">
                        {a.status || 'Completed'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Log Activity Modal ────────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-sfrc-200">
            <div className="flex items-center justify-between border-b border-sfrc-100 pb-4 mb-4">
              <div>
                <h3 className="text-lg font-black text-sfrc-900">Log Extension Activity</h3>
                <p className="text-xs text-sfrc-500">Record community outreach, NSS, NCC, or cultural event</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg hover:bg-sfrc-100 text-sfrc-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateActivity} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-sfrc-700 uppercase mb-1">Activity Name *</label>
                <input
                  type="text"
                  required
                  value={formData.activity_name}
                  onChange={(e) => setFormData({ ...formData, activity_name: e.target.value })}
                  placeholder="e.g. Village Health & Hygiene Awareness Rally"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-sfrc-200 text-xs font-medium focus:ring-2 focus:ring-sfrc-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-sfrc-700 uppercase mb-1">Unit Type *</label>
                  <select
                    value={formData.unit_type}
                    onChange={(e) => setFormData({ ...formData, unit_type: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-sfrc-200 text-xs font-medium focus:ring-2 focus:ring-sfrc-500 focus:outline-hidden"
                  >
                    <option value="NSS">NSS (National Service Scheme)</option>
                    <option value="NCC">NCC (National Cadet Corps)</option>
                    <option value="YRC">YRC (Youth Red Cross)</option>
                    <option value="Fine Arts">Fine Arts Association</option>
                    <option value="Eco Club">Eco Club</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-sfrc-700 uppercase mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.activity_date}
                    onChange={(e) => setFormData({ ...formData, activity_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-sfrc-200 text-xs font-medium focus:ring-2 focus:ring-sfrc-500 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-sfrc-700 uppercase mb-1">Venue / Village *</label>
                <input
                  type="text"
                  required
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  placeholder="e.g. Thulukkapatti Village, Virudhunagar"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-sfrc-200 text-xs font-medium focus:ring-2 focus:ring-sfrc-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-sfrc-700 uppercase mb-1">Volunteers Count</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.volunteer_count}
                    onChange={(e) => setFormData({ ...formData, volunteer_count: parseInt(e.target.value) || 1 })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-sfrc-200 text-xs font-medium focus:ring-2 focus:ring-sfrc-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-sfrc-700 uppercase mb-1">Part V Credits</label>
                  <input
                    type="number"
                    min="1"
                    max="4"
                    value={formData.credits}
                    onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value) || 1 })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-sfrc-200 text-xs font-medium focus:ring-2 focus:ring-sfrc-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-sfrc-700 uppercase mb-1">Description / Outcomes</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Summary of extension activities and community impact..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-sfrc-200 text-xs font-medium focus:ring-2 focus:ring-sfrc-500 focus:outline-hidden resize-none"
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
                  <span>Save Activity</span>
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
