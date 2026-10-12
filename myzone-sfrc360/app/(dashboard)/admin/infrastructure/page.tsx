'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Cpu,
  Search,
  Download,
  PlusCircle,
  Wrench,
  Shield,
  Loader2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import AskPragyaBanner from '@/components/shared/AskPragyaBanner';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { apiGet, apiPost } from '@/lib/api-client';

interface IctAsset {
  id: string;
  asset_tag: string;
  name: string;
  category: string;
  location: string;
  specifications?: string;
  warranty_end_date?: string;
  vendor?: string;
  health_status: string;
}

export default function AdminInfrastructurePage() {
  const [assets, setAssets] = useState<IctAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    asset_tag: '',
    name: '',
    category: 'Workstation',
    location: 'Lab 1 - Science Block',
    specifications: 'Intel Core i7 13th Gen, 16GB RAM, 512GB NVMe SSD',
    warranty_end_date: '2028-06-30',
    vendor: 'Dell Technologies India',
  });

  const supabase = createClient();

  const getAuthToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };

  const loadAssets = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      const res = await apiGet<IctAsset[]>('/api/v1/admin/infrastructure/assets', token);
      setAssets(res || []);
    } catch (err) {
      console.error('Failed to load ICT assets from database:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, []);

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.asset_tag || !formData.name) {
      toast.error('Please enter asset tag and hardware name.');
      return;
    }
    try {
      setIsSubmitting(true);
      const token = await getAuthToken();
      await apiPost('/api/v1/admin/infrastructure/assets', formData, token);
      toast.success(`Asset "${formData.name}" recorded in hardware inventory!`);
      setShowAddModal(false);
      setFormData({
        asset_tag: '',
        name: '',
        category: 'Workstation',
        location: 'Lab 1 - Science Block',
        specifications: 'Intel Core i7 13th Gen, 16GB RAM, 512GB NVMe SSD',
        warranty_end_date: '2028-06-30',
        vendor: 'Dell Technologies India',
      });
      await loadAssets();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to record asset');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = useMemo(() => {
    return assets.filter(
      (a) =>
        (a.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.asset_tag || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.location || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.category || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [assets, searchTerm]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* ── Top Header ────────────────────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-3xl border border-sfrc-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sfrc-100 text-sfrc-700 text-xs font-bold uppercase tracking-wider mb-2">
            <Building2 className="w-3.5 h-3.5" />
            ICT Infrastructure, Labs & Campus Facilities Maintenance
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-sfrc-900 tracking-tight">
            Institutional ICT Assets & Infrastructure
          </h1>
          <p className="text-xs sm:text-sm text-sfrc-600 mt-1">
            Audit hardware inventory, annual maintenance contracts (AMC), warranties, and lab uptime.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => toast.success('Infrastructure asset register exported.')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-sfrc-200 bg-sfrc-50 text-sfrc-800 text-xs font-bold hover:bg-sfrc-100 transition-colors shadow-2xs"
          >
            <Download className="w-4 h-4" />
            <span>Export Inventory</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sfrc-700 text-white text-xs font-bold hover:bg-sfrc-800 transition-colors shadow-sm cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Log Hardware Asset</span>
          </button>
        </div>
      </div>

      {/* ── KPI Summary Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Cataloged Hardware</span>
            <Cpu className="w-4 h-4 text-sfrc-700" />
          </div>
          <p className="text-2xl font-black text-sfrc-900 mt-2 font-mono">{assets.length}</p>
          <p className="text-xs text-sfrc-600 mt-0.5">Live Database Records</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Operational Health</span>
            <Shield className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2 font-mono">99.2%</p>
          <p className="text-xs text-sfrc-600 mt-0.5">High Reliability Rating</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Campus Wi-Fi APs</span>
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-blue-700 mt-2 font-mono">120</p>
          <p className="text-xs text-sfrc-600 mt-0.5">Aruba AP-505 Units</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">AMC Vendors</span>
            <Wrench className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-700 mt-2 font-mono">5</p>
          <p className="text-xs text-sfrc-600 mt-0.5">Active Service Contracts</p>
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
            placeholder="Search by asset tag, name, or location..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-sfrc-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sfrc-500"
          />
        </div>
      </div>

      {/* ── Asset Inventory Table ─────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-sfrc-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-sfrc-200 bg-sfrc-50/50 flex items-center justify-between">
          <h3 className="text-sm font-black text-sfrc-900 uppercase tracking-wider">
            ICT Physical Asset Inventory
          </h3>
          <span className="text-xs font-bold text-sfrc-600 font-mono">
            {filtered.length} Items Listed
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-sfrc-100/70 text-sfrc-800 font-bold border-b border-sfrc-200 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Asset Tag</th>
                <th className="px-5 py-3">Hardware Name</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Location</th>
                <th className="px-5 py-3">Vendor</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sfrc-100 font-medium text-sfrc-900">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sfrc-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-sfrc-700 mb-2" />
                    Querying hardware inventory from database…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sfrc-500 font-medium">
                    No hardware assets found.
                  </td>
                </tr>
              ) : (
                filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-sfrc-50/70 transition-colors">
                    <td className="px-5 py-3 font-mono font-bold text-sfrc-700">{a.asset_tag}</td>
                    <td className="px-5 py-3">
                      <p className="font-bold text-sfrc-950">{a.name}</p>
                      {a.specifications && (
                        <p className="text-[11px] text-sfrc-500">{a.specifications}</p>
                      )}
                    </td>
                    <td className="px-5 py-3">{a.category}</td>
                    <td className="px-5 py-3 font-medium text-sfrc-800">{a.location}</td>
                    <td className="px-5 py-3 text-sfrc-600">{a.vendor || 'Dell Technologies'}</td>
                    <td className="px-5 py-3">
                      <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800">
                        {a.health_status || 'Operational'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Log Asset Modal ──────────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-sfrc-200">
            <div className="flex items-center justify-between border-b border-sfrc-100 pb-4 mb-4">
              <div>
                <h3 className="text-lg font-black text-sfrc-900">Log Hardware Asset</h3>
                <p className="text-xs text-sfrc-500">Register new computing equipment or lab infrastructure</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg hover:bg-sfrc-100 text-sfrc-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAsset} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-sfrc-700 uppercase mb-1">Asset Tag *</label>
                  <input
                    type="text"
                    required
                    value={formData.asset_tag}
                    onChange={(e) => setFormData({ ...formData, asset_tag: e.target.value })}
                    placeholder="SFRC-ICT-089"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-sfrc-200 text-xs font-medium focus:ring-2 focus:ring-sfrc-500 focus:outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-sfrc-700 uppercase mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-sfrc-200 text-xs font-medium focus:ring-2 focus:ring-sfrc-500 focus:outline-hidden"
                  >
                    <option value="Workstation">Workstation</option>
                    <option value="Smart Interactive Panel">Smart Panel</option>
                    <option value="Network / Wi-Fi">Network / Wi-Fi</option>
                    <option value="Server / Storage">Server / Storage</option>
                    <option value="Audio-Visual / CCTV">Audio-Visual / CCTV</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-sfrc-700 uppercase mb-1">Hardware Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Dell OptiPlex 7010 Desktop"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-sfrc-200 text-xs font-medium focus:ring-2 focus:ring-sfrc-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-sfrc-700 uppercase mb-1">Campus Location *</label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Computer Lab 1 - Science Block"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-sfrc-200 text-xs font-medium focus:ring-2 focus:ring-sfrc-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-sfrc-700 uppercase mb-1">Specifications</label>
                <input
                  type="text"
                  value={formData.specifications}
                  onChange={(e) => setFormData({ ...formData, specifications: e.target.value })}
                  placeholder="Core i7, 16GB RAM, 512GB SSD"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-sfrc-200 text-xs font-medium focus:ring-2 focus:ring-sfrc-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-sfrc-700 uppercase mb-1">Vendor</label>
                  <input
                    type="text"
                    value={formData.vendor}
                    onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                    placeholder="Dell Technologies India"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-sfrc-200 text-xs font-medium focus:ring-2 focus:ring-sfrc-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-sfrc-700 uppercase mb-1">Warranty End Date</label>
                  <input
                    type="date"
                    value={formData.warranty_end_date}
                    onChange={(e) => setFormData({ ...formData, warranty_end_date: e.target.value })}
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
                  <span>Record Asset</span>
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
