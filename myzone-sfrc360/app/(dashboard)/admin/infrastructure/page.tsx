'use client';

import React, { useState, useMemo } from 'react';
import {
  Building2,
  Cpu,
  Tv,
  Wifi,
  Video,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Search,
  Download,
  PlusCircle,
  Wrench,
  Shield,
  Activity,
} from 'lucide-react';
import { toast } from 'sonner';
import AskPragyaBanner from '@/components/shared/AskPragyaBanner';
import { cn } from '@/lib/utils';

interface AssetGroup {
  id: string;
  category: string;
  total_units: number;
  operational_units: number;
  amc_vendor: string;
  warranty_status: 'Active' | 'Expiring Soon' | 'Under AMC';
  last_serviced: string;
  location: string;
}

const DEFAULT_ASSETS: AssetGroup[] = [
  {
    id: 'ast-1',
    category: 'Smart Interactive Digital Panels (75")',
    total_units: 56,
    operational_units: 56,
    amc_vendor: 'Maxhub Educational Systems',
    warranty_status: 'Active',
    last_serviced: '2026-08-14',
    location: 'All Smart Classrooms & Seminar Halls',
  },
  {
    id: 'ast-2',
    category: 'Desktop Workstations (Intel i7 / 16GB)',
    total_units: 480,
    operational_units: 476,
    amc_vendor: 'Dell Technologies India',
    warranty_status: 'Under AMC',
    last_serviced: '2026-09-02',
    location: 'Labs 1 to 5, Language Lab, MCA Lab',
  },
  {
    id: 'ast-3',
    category: 'Campus Wi-Fi 6 Access Points (Aruba AP-505)',
    total_units: 120,
    operational_units: 120,
    amc_vendor: 'HPE Aruba Networks',
    warranty_status: 'Active',
    last_serviced: '2026-07-20',
    location: 'Academic Blocks, Hostel & Central Library',
  },
  {
    id: 'ast-4',
    category: 'CCTV Surveillance System (4K IP Cameras)',
    total_units: 240,
    operational_units: 238,
    amc_vendor: 'Hikvision Digital Technology',
    warranty_status: 'Under AMC',
    last_serviced: '2026-09-18',
    location: 'Perimeter, Entrances, Corridors & Halls',
  },
  {
    id: 'ast-5',
    category: 'Central Silent Diesel Generators (3x 50kVA)',
    total_units: 3,
    operational_units: 3,
    amc_vendor: 'Kirloskar Oil Engines',
    warranty_status: 'Active',
    last_serviced: '2026-09-25',
    location: 'Power Sub-Station & Campus Transformer',
  },
];

export default function AdminInfrastructurePage() {
  const [assets, setAssets] = useState<AssetGroup[]>(DEFAULT_ASSETS);
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = useMemo(() => {
    return assets.filter(
      (a) =>
        a.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.amc_vendor.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [assets, searchTerm]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* ── Top Header ────────────────────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-3xl border border-sfrc-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sfrc-100 text-sfrc-700 text-xs font-bold uppercase tracking-wider mb-2">
            <Cpu className="w-3.5 h-3.5" />
            Physical Infrastructure & ICT Asset Management
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-sfrc-900 tracking-tight">
            Campus ICT Infrastructure & Asset Tracker
          </h1>
          <p className="text-xs sm:text-sm text-sfrc-600 mt-1">
            Maintain campus equipment inventories, monitor AMC warranties, and track power & network health.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => toast.success('Infrastructure asset registry exported.')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-sfrc-200 bg-sfrc-50 text-sfrc-800 text-xs font-bold hover:bg-sfrc-100 transition-colors shadow-2xs"
          >
            <Download className="w-4 h-4" />
            <span>Export Asset Register</span>
          </button>
        </div>
      </div>

      {/* ── KPI Summary Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Computers & Terminals</span>
            <Cpu className="w-4 h-4 text-sfrc-700" />
          </div>
          <p className="text-2xl font-black text-sfrc-900 mt-2 font-mono">480</p>
          <p className="text-xs text-sfrc-600 mt-0.5">High-Speed LAN Connected</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Smart Boards</span>
            <Tv className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2 font-mono">56</p>
          <p className="text-xs text-sfrc-600 mt-0.5">Interactive Classrooms</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Wi-Fi Coverage</span>
            <Wifi className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-blue-700 mt-2 font-mono">1 Gbps</p>
          <p className="text-xs text-sfrc-600 mt-0.5">Campus-Wide Optical Fibre</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">CCTV Cameras</span>
            <Video className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-700 mt-2 font-mono">240</p>
          <p className="text-xs text-sfrc-600 mt-0.5">24/7 Security Operations</p>
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
            placeholder="Search asset, vendor, location..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-sfrc-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sfrc-500"
          />
        </div>
      </div>

      {/* ── Asset Table ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-sfrc-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-sfrc-200 bg-sfrc-50/50 flex items-center justify-between">
          <h3 className="text-sm font-black text-sfrc-900 uppercase tracking-wider">
            Institutional Hardware Inventory & Warranties
          </h3>
          <span className="text-xs font-bold text-sfrc-600 font-mono">
            {filtered.length} Asset Groups
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-sfrc-100/70 text-sfrc-800 font-bold border-b border-sfrc-200 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Asset Classification</th>
                <th className="px-5 py-3">Total Units</th>
                <th className="px-5 py-3">Operational</th>
                <th className="px-5 py-3">Location Block</th>
                <th className="px-5 py-3">AMC / Service Vendor</th>
                <th className="px-5 py-3">Warranty</th>
                <th className="px-5 py-3">Last Serviced</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sfrc-100 font-medium text-sfrc-900">
              {filtered.map((a) => (
                <tr key={a.id} className="hover:bg-sfrc-50/70 transition-colors">
                  <td className="px-5 py-3 font-bold text-sfrc-950">{a.category}</td>
                  <td className="px-5 py-3 font-mono font-bold text-sfrc-800">{a.total_units}</td>
                  <td className="px-5 py-3">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] inline-flex items-center gap-1 font-mono">
                      <CheckCircle2 className="w-3 h-3" />
                      {a.operational_units} Active
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sfrc-700">{a.location}</td>
                  <td className="px-5 py-3 font-medium text-sfrc-800">{a.amc_vendor}</td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold text-[10px]">
                      {a.warranty_status}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-sfrc-600">{a.last_serviced}</td>
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
