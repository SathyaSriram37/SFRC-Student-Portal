'use client';

import React, { useState } from 'react';
import {
  Settings,
  Shield,
  Save,
  Database,
  Bell,
  Lock,
  Globe,
  CheckCircle2,
  RefreshCw,
  Server,
  Zap,
  Sliders,
} from 'lucide-react';
import { toast } from 'sonner';
import AskPragyaBanner from '@/components/shared/AskPragyaBanner';
import { cn } from '@/lib/utils';

export default function AdminSettingsPage() {
  const [academicYear, setAcademicYear] = useState('2025 - 2026');
  const [activeSemType, setActiveSemType] = useState('Even Semester (Sem 2, 4, 6)');
  const [pragyaAiEnabled, setPragyaAiEnabled] = useState(true);
  const [whatsappGateway, setWhatsappGateway] = useState(true);
  const [smsGateway, setSmsGateway] = useState(true);
  const [paymentGateway, setPaymentGateway] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success('System settings saved successfully!');
    }, 600);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* ── Top Header ────────────────────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-3xl border border-sfrc-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sfrc-100 text-sfrc-700 text-xs font-bold uppercase tracking-wider mb-2">
            <Settings className="w-3.5 h-3.5" />
            Central System Governance & Global Configurations
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-sfrc-900 tracking-tight">
            System Settings & Portal Controls
          </h1>
          <p className="text-xs sm:text-sm text-sfrc-600 mt-1">
            Configure active academic year, feature toggles, communication gateways, and security parameters.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sfrc-700 text-white text-xs sm:text-sm font-bold hover:bg-sfrc-800 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </div>

      {/* ── Settings Grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Academic Session Settings */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-sfrc-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-sfrc-200 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-sfrc-100 flex items-center justify-center text-sfrc-700">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-sfrc-900">Academic Term & Session</h2>
              <p className="text-xs text-sfrc-600">Controls timetable schedules and examination registration.</p>
            </div>
          </div>

          <div className="space-y-4 text-xs sm:text-sm">
            <div>
              <label className="block text-xs font-bold text-sfrc-700 uppercase tracking-wider mb-1.5">
                Current Academic Year
              </label>
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-sfrc-200 bg-white text-sfrc-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sfrc-500"
              >
                <option value="2025 - 2026">2025 - 2026 (Current Active Session)</option>
                <option value="2026 - 2027">2026 - 2027 (Upcoming Planning Session)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-sfrc-700 uppercase tracking-wider mb-1.5">
                Active Semester Cycle
              </label>
              <select
                value={activeSemType}
                onChange={(e) => setActiveSemType(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-sfrc-200 bg-white text-sfrc-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sfrc-500"
              >
                <option value="Odd Semester (Sem 1, 3, 5)">Odd Semester (Sem 1, 3, 5)</option>
                <option value="Even Semester (Sem 2, 4, 6)">Even Semester (Sem 2, 4, 6)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Feature Toggles */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-sfrc-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-sfrc-200 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-sfrc-100 flex items-center justify-center text-sfrc-700">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-sfrc-900">Feature Gateways & Modules</h2>
              <p className="text-xs text-sfrc-600">Enable or disable sub-systems in real time.</p>
            </div>
          </div>

          <div className="divide-y divide-sfrc-100">
            {[
              {
                title: 'Pragya AI Campus Assistant',
                desc: 'RAG retrieval engine and slide-in chat drawer globally.',
                state: pragyaAiEnabled,
                setter: setPragyaAiEnabled,
              },
              {
                title: 'WhatsApp Exam & Mark Alerts',
                desc: 'Automated WhatsApp messaging for student CIA notifications.',
                state: whatsappGateway,
                setter: setWhatsappGateway,
              },
              {
                title: 'SMS Attendance Gateways',
                desc: 'SMS alerts for daily attendance and outpass confirmations.',
                state: smsGateway,
                setter: setSmsGateway,
              },
              {
                title: 'Online Fee Payment Gateway (Razorpay/SBI)',
                desc: 'Allow student fee payments via NetBanking, UPI, and Cards.',
                state: paymentGateway,
                setter: setPaymentGateway,
              },
            ].map((f, idx) => (
              <div key={idx} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-sfrc-900 text-xs sm:text-sm">{f.title}</p>
                  <p className="text-[11px] text-sfrc-600 mt-0.5">{f.desc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => f.setter(!f.state)}
                  className={cn(
                    'w-12 h-6 rounded-full transition-colors relative focus:outline-none shrink-0',
                    f.state ? 'bg-sfrc-700' : 'bg-sfrc-200'
                  )}
                >
                  <span
                    className={cn(
                      'w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform shadow-xs',
                      f.state ? 'left-6.5' : 'left-0.5'
                    )}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Database & Security Info */}
        <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-3xl border border-sfrc-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-sfrc-200 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-sfrc-900">Database & Security Diagnostics</h2>
              <p className="text-xs text-sfrc-600">PostgreSQL connection pool & Supabase Auth status.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
              <p className="font-bold text-emerald-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                PostgreSQL Database (FastAPI)
              </p>
              <p className="text-emerald-700">Connected to localhost:8000 via SQLAlchemy AsyncPool</p>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 space-y-1">
              <p className="font-bold text-blue-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                Supabase Auth & RLS
              </p>
              <p className="text-blue-700">Strict Row-Level Security & Role-Based Access Control</p>
            </div>

            <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 space-y-1">
              <p className="font-bold text-purple-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-purple-600" />
                ChromaDB Vector Store
              </p>
              <p className="text-purple-700">RAG chunks synchronized with 1536-dim embeddings</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Pragya AI Assistant ────────────────────────────────────── */}
      <AskPragyaBanner />
    </div>
  );
}
