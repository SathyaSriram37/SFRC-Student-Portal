'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Database,
  ShieldAlert,
  RefreshCw,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Info,
  Zap,
  FileText,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { createClient } from '@/lib/supabase/client';
import { apiGet, apiPost } from '@/lib/api-client';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ERMSHealth {
  mode: string;
  status: string;
  adapter?: string;
  note: string;
  erms_integration_enabled: boolean;
  checked_at: string;
}

interface SyncLogItem {
  id: string;
  provider: string;
  operation: string;
  reference?: string;
  status: string;
  records_processed: number;
  synced_at: string;
}

interface SyncLogsResponse {
  items: SyncLogItem[];
  total: number;
  page: number;
  page_size: number;
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminIntegrationsPage() {
  const [health, setHealth] = useState<ERMSHealth | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);

  const [syncLogs, setSyncLogs] = useState<SyncLogItem[]>([]);
  const [syncLogsTotal, setSyncLogsTotal] = useState(0);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsPage, setLogsPage] = useState(1);

  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const [logsExpanded, setLogsExpanded] = useState(true);

  const supabase = useMemo(() => createClient(), []);

  const getToken = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token;
    } catch {
      return undefined;
    }
  }, [supabase]);

  // ── Fetch health ─────────────────────────────────────────────────────────────

  const checkHealth = useCallback(async () => {
    setHealthLoading(true);
    setHealthError(null);
    try {
      const token = await getToken();
      const res = await apiGet<ERMSHealth>('/api/v1/integrations/erms/health', token);
      if (res) setHealth(res);
    } catch {
      setHealthError('Could not reach ERMS health endpoint. Ensure backend is running.');
    } finally {
      setHealthLoading(false);
    }
  }, [getToken]);

  // ── Fetch sync logs ───────────────────────────────────────────────────────────

  const loadSyncLogs = useCallback(async (page: number) => {
    setLogsLoading(true);
    try {
      const token = await getToken();
      const res = await apiGet<SyncLogsResponse>(
        `/api/v1/admin/integrations/sync-logs?page=${page}&page_size=15`,
        token,
      );
      if (res) {
        setSyncLogs(res.items);
        setSyncLogsTotal(res.total);
      }
    } catch {
      // Silently fail — table may not be seeded in dev
    } finally {
      setLogsLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!ignore) {
        await checkHealth();
        await loadSyncLogs(1);
      }
    })();
    return () => { ignore = true; };
  }, [checkHealth, loadSyncLogs]);

  // ── Demo sync trigger ─────────────────────────────────────────────────────────

  const handleDemoSync = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const token = await getToken();
      const res = await apiPost<{ success: boolean; message: string; records_synced: number; mode: string }>(
        '/api/v1/admin/integrations/erms/sync',
        {},
        token,
      );
      if (res?.success) {
        setSyncMsg(`✓ Demo sync completed — ${res.records_synced} record(s) processed in ${res.mode} mode.`);
        await loadSyncLogs(1);
        setLogsPage(1);
      }
    } catch {
      setSyncMsg('✗ Demo sync failed. Ensure backend is running.');
    } finally {
      setSyncing(false);
    }
  };

  const totalPages = Math.ceil(syncLogsTotal / 15);

  return (
    <AppShell role="admin" userName="System Administrator">
      <div className="p-6 max-w-6xl mx-auto space-y-6">

        {/* ── Header ──────────────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-violet-950 to-indigo-950 p-6 rounded-2xl text-white shadow-xl border border-violet-800/30">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Database className="h-6 w-6 text-violet-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-violet-300">
                External System Integration Layer
              </span>
            </div>
            <h1 className="text-2xl font-bold">Integrations & Sync Center</h1>
            <p className="text-violet-200/70 text-sm">
              ERMS adapter status, integration health monitoring, and sync audit logs.
            </p>
          </div>
        </div>

        {/* ── ERMS Boundary Notice ────────────────────────────────────────────── */}
        <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/25 rounded-xl text-sm">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-300">ERMS Integration Boundary</p>
            <p className="text-amber-200/80 text-xs leading-relaxed">
              SFRC operates a cloud-based ERMS system. <strong className="text-white">MyZone SFRC 360 is an experience + AI layer — it is NOT an ERMS replacement.</strong>{' '}
              Current status: <code className="bg-amber-900/30 px-1 rounded text-amber-300">ERMS_INTEGRATION_ENABLED=false</code> — using own database (MockAdapter) for demonstration.{' '}
              Real integration requires an authorized API from SFRC IT.
            </p>
          </div>
        </div>

        {/* ── ERMS Integration Card ───────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Status Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-violet-500/10 border border-violet-500/20 rounded-xl">
                  <Database className="h-5 w-5 text-violet-400" />
                </div>
                <div>
                  <h2 className="font-bold text-white text-base">SFRC ERMS Adapter</h2>
                  <p className="text-xs text-slate-400">Examination & Results Management System</p>
                </div>
              </div>
              {/* Big Mock Mode badge */}
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-inner shadow-amber-900/20">
                <ShieldAlert className="h-3.5 w-3.5" />
                Mock Mode (own DB)
              </span>
            </div>

            <div className="p-5 space-y-4">
              {health ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {health.status === 'ok' ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                    )}
                    <span className="text-sm font-medium text-white capitalize">{health.status}</span>
                    <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                      mode: {health.mode}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-800/60 border border-slate-700/50 rounded-xl text-xs text-slate-300 leading-relaxed">
                    <Info className="h-3.5 w-3.5 text-violet-400 inline mr-1.5 shrink-0" />
                    {health.note}
                  </div>

                  {health.adapter && (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Activity className="h-3.5 w-3.5 text-slate-500" />
                      <span>Adapter: <span className="text-slate-200 font-medium font-mono">{health.adapter}</span></span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Clock className="h-3.5 w-3.5 text-slate-500" />
                    <span>Checked: {new Date(health.checked_at).toLocaleString()}</span>
                  </div>
                </div>
              ) : healthLoading ? (
                <div className="py-4 text-center text-slate-400 text-sm animate-pulse">
                  Checking ERMS health...
                </div>
              ) : healthError ? (
                <div className="p-3 bg-red-900/20 border border-red-800/30 rounded-xl text-xs text-red-300">
                  {healthError}
                </div>
              ) : null}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={checkHealth}
                  disabled={healthLoading}
                  className="flex items-center gap-2 px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-lg text-xs transition-all disabled:opacity-50"
                >
                  <Activity className="h-3.5 w-3.5" />
                  {healthLoading ? 'Checking...' : 'Check Health'}
                </button>
                <button
                  onClick={handleDemoSync}
                  disabled={syncing}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg text-xs transition-all border border-slate-700 disabled:opacity-50"
                >
                  <Zap className="h-3.5 w-3.5 text-amber-400" />
                  {syncing ? 'Syncing...' : 'Trigger Demo Sync'}
                </button>
                <button
                  onClick={() => loadSyncLogs(logsPage)}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg text-xs transition-all border border-slate-700"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh Logs
                </button>
              </div>

              {syncMsg && (
                <p className={`text-xs rounded-lg px-3 py-2 ${syncMsg.startsWith('✓')
                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                  : 'bg-red-500/10 text-red-300 border border-red-500/20'}`}>
                  {syncMsg}
                </p>
              )}
            </div>
          </div>

          {/* Config Reference Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-slate-400" />
              <h3 className="font-bold text-white text-base">Configuration Reference</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-slate-800/60 border border-slate-700/50 rounded-xl space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Environment Variables</p>
                <div className="space-y-1.5 font-mono text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-300">ERMS_INTEGRATION_ENABLED</span>
                    <span className="px-2 py-0.5 bg-slate-900 border border-red-800/30 text-red-400 rounded-md">false</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-300">ERMS_API_URL</span>
                    <span className="px-2 py-0.5 bg-slate-900 border border-slate-700 text-slate-500 rounded-md">not set</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-indigo-950/40 border border-indigo-800/20 rounded-xl space-y-2">
                <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">To Enable Real Integration</p>
                <ol className="text-xs text-slate-300 space-y-1 list-decimal list-inside">
                  <li>Obtain authorized ERMS API from SFRC IT department</li>
                  <li>Set <code className="text-indigo-300">ERMS_API_URL</code> in backend <code className="text-slate-400">.env</code></li>
                  <li>Set <code className="text-indigo-300">ERMS_INTEGRATION_ENABLED=true</code></li>
                  <li>Implement <code className="text-slate-400">SFRCERMSAdapter</code> with authorized API client</li>
                </ol>
              </div>

              <div className="p-3 bg-slate-800/40 border border-slate-700/50 rounded-xl">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Adapter Resolution</p>
                <div className="text-xs space-y-1.5 font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span>
                    <span className="text-slate-400">Default →</span>
                    <span className="text-slate-200">MockERMSAdapter</span>
                    <span className="text-slate-500">(own DB)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">○</span>
                    <span className="text-slate-400">When enabled →</span>
                    <span className="text-indigo-300">SFRCERMSAdapter</span>
                    <span className="text-slate-500">(live API)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Sync Logs Table ─────────────────────────────────────────────────── */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
          <button
            onClick={() => setLogsExpanded(p => !p)}
            className="w-full p-4 flex items-center justify-between hover:bg-slate-800/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-slate-400" />
              <h2 className="font-bold text-white text-base">Integration Sync Logs</h2>
              <span className="text-xs px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full border border-slate-700">
                {syncLogsTotal} total
              </span>
            </div>
            {logsExpanded ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </button>

          {logsExpanded && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/60 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800 border-t border-slate-800">
                    <tr>
                      <th className="p-3.5">Provider</th>
                      <th className="p-3.5">Operation</th>
                      <th className="p-3.5">Reference</th>
                      <th className="p-3.5 text-center">Status</th>
                      <th className="p-3.5 text-center">Records</th>
                      <th className="p-3.5">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {logsLoading ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-400 animate-pulse">
                          Loading sync logs...
                        </td>
                      </tr>
                    ) : syncLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500">
                          No sync log entries yet. Trigger a demo sync to generate entries.
                        </td>
                      </tr>
                    ) : (
                      syncLogs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-800/20 transition-colors text-slate-300">
                          <td className="p-3.5">
                            <span className="font-medium text-violet-400 font-mono">{log.provider}</span>
                          </td>
                          <td className="p-3.5 font-mono text-slate-400">{log.operation}</td>
                          <td className="p-3.5 text-slate-500 font-mono">{log.reference ?? '—'}</td>
                          <td className="p-3.5 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase ${
                              log.status === 'completed'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                              {log.status === 'completed' ? (
                                <CheckCircle2 className="h-2.5 w-2.5" />
                              ) : (
                                <XCircle className="h-2.5 w-2.5" />
                              )}
                              {log.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-center text-slate-400 font-medium">{log.records_processed}</td>
                          <td className="p-3.5 text-slate-500">
                            {new Date(log.synced_at).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="p-4 flex items-center justify-between border-t border-slate-800">
                  <span className="text-xs text-slate-400">
                    Showing page {logsPage} of {totalPages} ({syncLogsTotal} total entries)
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { const p = logsPage - 1; setLogsPage(p); loadSyncLogs(p); }}
                      disabled={logsPage <= 1}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg border border-slate-700 disabled:opacity-40 transition-colors"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => { const p = logsPage + 1; setLogsPage(p); loadSyncLogs(p); }}
                      disabled={logsPage >= totalPages}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg border border-slate-700 disabled:opacity-40 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
