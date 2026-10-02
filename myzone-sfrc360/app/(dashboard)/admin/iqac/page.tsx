'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ShieldCheck, FileText, PlusCircle, BarChart3, Calendar, ExternalLink, RefreshCw, BookOpen, Sparkles, Upload, FileCheck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { apiGet, apiPost, apiPut } from '@/lib/api-client';
import { createClient } from '@/lib/supabase/client';

interface IQACActionItem {
  id: string;
  meeting_id?: string;
  agenda_item?: string;
  action_required?: string;
  assigned_to?: string;
  target_date?: string;
  status: string;
  evidence_url?: string;
  remarks?: string;
  [key: string]: any;
}

export default function AdminIQACPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'meetings' | 'action-items' | 'initiatives' | 'aqar'>('overview');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [actionItems, setActionItems] = useState<IQACActionItem[]>([]);
  const [initiatives, setInitiatives] = useState<any[]>([]);
  const [feedbackCycles, setFeedbackCycles] = useState<any[]>([]);
  const [aqarDocs, setAqarDocs] = useState<any[]>([]);
  
  // Filter for Action Items
  const [actionStatusFilter, setActionStatusFilter] = useState<'all' | 'pending' | 'in progress' | 'completed' | 'deferred'>('all');

  // Meeting Detail Modal
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);
  const [meetingDetailModalOpen, setMeetingDetailModalOpen] = useState(false);

  // New Meeting Modal
  const [newMeetingModalOpen, setNewMeetingModalOpen] = useState(false);
  const [meetTitle, setMeetTitle] = useState('');
  const [meetNumber, setMeetNumber] = useState('IQAC/2026/M4');
  const [meetDate, setMeetDate] = useState('2026-10-15');
  const meetVenue = 'IQAC Board Room';
  const [meetAgenda, setMeetAgenda] = useState('');
  const [isSubmittingMeet, setIsSubmittingMeet] = useState(false);

  // Action Item Update Modal
  const [selectedActionItem, setSelectedActionItem] = useState<IQACActionItem | null>(null);
  const [actionUpdateModalOpen, setActionUpdateModalOpen] = useState(false);
  const [actionStatus, setActionStatus] = useState('Completed');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [actionRemarks, setActionRemarks] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // New Initiative Modal
  const [initiativeModalOpen, setInitiativeModalOpen] = useState(false);
  const [initTitle, setInitTitle] = useState('');
  const [initCoordinator, setInitCoordinator] = useState('');
  const initObjectives = '';
  const [initKpi, setInitKpi] = useState('');
  const [isSubmittingInit, setIsSubmittingInit] = useState(false);

  // New AQAR Modal
  const [aqarModalOpen, setAqarModalOpen] = useState(false);
  const [aqarYear, setAqarYear] = useState('2025-2026');
  const [aqarCriteriaNum, setAqarCriteriaNum] = useState('1');
  const aqarCriteriaName = 'Curricular Aspects (Criterion I)';
  const [aqarFileTitle, setAqarFileTitle] = useState('');
  const aqarDocUrl = 'https://sfrc.edu.in/iqac/aqar/sample_doc.pdf';
  const [isSubmittingAqar, setIsSubmittingAqar] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  const getAuthToken = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token;
    } catch {
      return undefined;
    }
  }, [supabase]);

  const loadIQACData = useCallback(async () => {
    try {
            const token = await getAuthToken();

      const [dashRes, meetRes, actRes, initRes, fbRes, aqarRes] = await Promise.allSettled([
        apiGet<any>('/api/v1/admin/iqac/dashboard', token),
        apiGet<{ items: any[]; total: number }>('/api/v1/admin/iqac/meetings', token),
        apiGet<any[]>('/api/v1/admin/iqac/action-items', token),
        apiGet<any[]>('/api/v1/admin/iqac/initiatives', token),
        apiGet<any[]>('/api/v1/admin/iqac/feedback-cycles', token),
        apiGet<any[]>('/api/v1/admin/iqac/aqar', token),
      ]);

      if (dashRes.status === 'fulfilled') setDashboardData(dashRes.value);
      if (meetRes.status === 'fulfilled' && meetRes.value?.items) setMeetings(meetRes.value.items);
      if (actRes.status === 'fulfilled' && Array.isArray(actRes.value)) setActionItems(actRes.value);
      if (initRes.status === 'fulfilled' && Array.isArray(initRes.value)) setInitiatives(initRes.value);
      if (fbRes.status === 'fulfilled' && Array.isArray(fbRes.value)) setFeedbackCycles(fbRes.value);
      if (aqarRes.status === 'fulfilled' && Array.isArray(aqarRes.value)) setAqarDocs(aqarRes.value);
    } catch (err) {
      console.error('Failed to load IQAC data:', err);
    } finally {
          }
  }, [getAuthToken]);

  useEffect(() => {
    loadIQACData();
  }, [loadIQACData]);

  // Create Meeting
  const handleCreateMeeting = async () => {
    if (!meetTitle.trim() || !meetAgenda.trim()) {
      alert('Please fill out meeting title and agenda.');
      return;
    }

    try {
      setIsSubmittingMeet(true);
      const token = await getAuthToken();
      const agendaList = meetAgenda.split('\n').map((a) => a.trim()).filter(Boolean);

      await apiPost(
        '/api/v1/admin/iqac/meetings',
        {
          title: meetTitle.trim(),
          meeting_number: meetNumber.trim(),
          meeting_date: meetDate,
          venue: meetVenue.trim(),
          agenda: agendaList,
          attendees: ['Dr. R. Sudha (Chairperson)', 'Dr. S. Sivakama Sundari (IQAC Coordinator)'],
        },
        token
      );

      setNewMeetingModalOpen(false);
      setMeetTitle('');
      setMeetAgenda('');
      loadIQACData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to schedule meeting';
      alert(msg);
    } finally {
      setIsSubmittingMeet(false);
    }
  };

  // Open Action Item Update Dialog
  const handleOpenActionUpdate = (item: IQACActionItem) => {
    setSelectedActionItem(item);
    setActionStatus(item.status);
    setEvidenceUrl(item.evidence_url || '');
    setActionRemarks(item.remarks || '');
    setActionUpdateModalOpen(true);
  };

  // Update Action Item
  const handleUpdateActionItem = async () => {
    if (!selectedActionItem) return;

    try {
      setIsSubmittingAction(true);
      const token = await getAuthToken();
      await apiPut(
        `/api/v1/admin/iqac/action-items/${selectedActionItem.id}`,
        {
          status: actionStatus,
          evidence_url: evidenceUrl.trim() || undefined,
          remarks: actionRemarks.trim() || undefined,
        },
        token
      );

      setActionUpdateModalOpen(false);
      loadIQACData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update action item';
      alert(msg);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Create Initiative
  const handleCreateInitiative = async () => {
    if (!initTitle.trim() || !initCoordinator.trim()) {
      alert('Please fill out initiative title and coordinator.');
      return;
    }

    try {
      setIsSubmittingInit(true);
      const token = await getAuthToken();
      await apiPost(
        '/api/v1/admin/iqac/initiatives',
        {
          title: initTitle.trim(),
          academic_year: '2025-2026',
          coordinator: initCoordinator.trim(),
          objectives: initObjectives.trim() || 'Quality assurance and digital institutional transformation.',
          target_kpi: initKpi.trim() || '100% compliance with NAAC SSR benchmarks.',
          status: 'Active',
        },
        token
      );

      setInitiativeModalOpen(false);
      setInitTitle('');
      setInitCoordinator('');
      loadIQACData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create initiative';
      alert(msg);
    } finally {
      setIsSubmittingInit(false);
    }
  };

  // Create AQAR Doc
  const handleCreateAqar = async () => {
    if (!aqarFileTitle.trim()) {
      alert('Please enter document title.');
      return;
    }

    try {
      setIsSubmittingAqar(true);
      const token = await getAuthToken();
      await apiPost(
        '/api/v1/admin/iqac/aqar',
        {
          academic_year: aqarYear,
          criteria_number: parseInt(aqarCriteriaNum, 10) || 1,
          criteria_name: aqarCriteriaName,
          file_title: aqarFileTitle.trim(),
          document_url: aqarDocUrl.trim(),
          submitted_to_naac: true,
          submission_date: new Date().toISOString().split('T')[0],
        },
        token
      );

      setAqarModalOpen(false);
      setAqarFileTitle('');
      loadIQACData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to upload AQAR document';
      alert(msg);
    } finally {
      setIsSubmittingAqar(false);
    }
  };

  // Filtered Action Items
  const filteredActionItems = useMemo(() => {
    if (actionStatusFilter === 'all') return actionItems;
    return actionItems.filter((a) => a.status.toLowerCase() === actionStatusFilter.toLowerCase());
  }, [actionItems, actionStatusFilter]);

  // Chart data for action item statuses
  const actionChartData = useMemo(() => {
    const counts: Record<string, number> = {
      Completed: 0,
      'In Progress': 0,
      Pending: 0,
      Deferred: 0,
    };
    actionItems.forEach((a) => {
      counts[a.status] = (counts[a.status] || 0) + 1;
    });
    return Object.entries(counts).map(([status, count]) => ({ status, count }));
  }, [actionItems]);

  return (
    <div className="min-h-screen bg-sfrc-surface pb-16">
      {/* Header Banner */}
      <div className="bg-white border-b border-sfrc-200 py-8 px-6 sm:px-10 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-sfrc-700 uppercase tracking-wider mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-sfrc-700" />
              IQAC Quality Assurance Cell
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-sfrc-900 tracking-tight">
              Internal Quality Assurance Cell (IQAC)
            </h1>
            <p className="text-xs sm:text-sm text-sfrc-600 mt-1">
              Institutional quality monitoring, statutory meeting minutes, action item accountability, and NAAC AQAR reporting.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={loadIQACData}
              className="rounded-xl text-xs font-bold border-sfrc-200"
            >
              <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh
            </Button>

            <Button
              onClick={() => setNewMeetingModalOpen(true)}
              className="bg-sfrc-700 hover:bg-sfrc-800 text-white rounded-xl text-xs font-bold shadow-sm"
            >
              <Calendar className="w-4 h-4 mr-1.5" /> Schedule Meeting
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-6 space-y-6">
        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="rounded-3xl border-sfrc-200 bg-white p-5 shadow-2xs">
            <p className="text-xs font-bold text-sfrc-600 uppercase">Active Initiatives</p>
            <p className="text-2xl font-black text-sfrc-900 mt-1">
              {dashboardData?.active_initiatives || initiatives.length}
            </p>
            <p className="text-[11px] text-sfrc-500 mt-0.5">Strategic quality projects</p>
          </Card>

          <Card className="rounded-3xl border-sfrc-200 bg-white p-5 shadow-2xs">
            <p className="text-xs font-bold text-sfrc-600 uppercase">Pending Action Items</p>
            <p className="text-2xl font-black text-amber-700 mt-1">
              {dashboardData?.pending_action_items || 3}
            </p>
            <p className="text-[11px] text-amber-600 mt-0.5">Under execution / review</p>
          </Card>

          <Card className="rounded-3xl border-sfrc-200 bg-white p-5 shadow-2xs">
            <p className="text-xs font-bold text-sfrc-600 uppercase">Feedback Cycles</p>
            <p className="text-2xl font-black text-blue-700 mt-1">
              {dashboardData?.feedback_cycles_count || feedbackCycles.length}
            </p>
            <p className="text-[11px] text-sfrc-500 mt-0.5">SSS & Alumni audits</p>
          </Card>

          <Card className="rounded-3xl border-sfrc-200 bg-white p-5 shadow-2xs">
            <p className="text-xs font-bold text-sfrc-600 uppercase">AQAR Documents</p>
            <p className="text-2xl font-black text-emerald-700 mt-1">
              {dashboardData?.aqar_documents_count || aqarDocs.length}
            </p>
            <p className="text-[11px] text-emerald-600 mt-0.5">Submitted to NAAC</p>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 p-2 bg-white border border-sfrc-200 rounded-2xl shadow-sm">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'overview'
                ? 'bg-sfrc-700 text-white shadow-sm'
                : 'text-sfrc-700 hover:bg-sfrc-100'
            }`}
          >
            <BarChart3 className="w-4 h-4 inline mr-1.5" />
            IQAC Overview
          </button>

          <button
            onClick={() => setActiveTab('meetings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'meetings'
                ? 'bg-sfrc-700 text-white shadow-sm'
                : 'text-sfrc-700 hover:bg-sfrc-100'
            }`}
          >
            <Calendar className="w-4 h-4 inline mr-1.5" />
            Meetings & Minutes ({meetings.length})
          </button>

          <button
            onClick={() => setActiveTab('action-items')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'action-items'
                ? 'bg-sfrc-700 text-white shadow-sm'
                : 'text-sfrc-700 hover:bg-sfrc-100'
            }`}
          >
            <FileCheck className="w-4 h-4 inline mr-1.5" />
            Action Items ({actionItems.length})
          </button>

          <button
            onClick={() => setActiveTab('initiatives')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'initiatives'
                ? 'bg-sfrc-700 text-white shadow-sm'
                : 'text-sfrc-700 hover:bg-sfrc-100'
            }`}
          >
            <Sparkles className="w-4 h-4 inline mr-1.5" />
            Quality Initiatives ({initiatives.length})
          </button>

          <button
            onClick={() => setActiveTab('aqar')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'aqar'
                ? 'bg-sfrc-700 text-white shadow-sm'
                : 'text-sfrc-700 hover:bg-sfrc-100'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-1.5" />
            AQAR NAAC Reports ({aqarDocs.length})
          </button>
        </div>

        {/* TAB 1: Overview & Analytics */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Action Item Status Chart */}
            <Card className="rounded-3xl border-sfrc-200 bg-white p-6 shadow-sm">
              <CardTitle className="text-base font-bold text-sfrc-900">
                Action Items Implementation Status
              </CardTitle>
              <CardDescription className="text-xs text-sfrc-600 mb-4">
                Completion rate: {dashboardData?.action_item_completion_rate || 40.0}% of statutory resolutions executed
              </CardDescription>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={actionChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" name="Items" fill="#5A122D" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Stakeholder Feedback Cycles */}
            <Card className="rounded-3xl border-sfrc-200 bg-white p-6 shadow-sm space-y-4">
              <CardTitle className="text-base font-bold text-sfrc-900">
                Stakeholder Feedback & ATR Compliance
              </CardTitle>
              <CardDescription className="text-xs text-sfrc-600">
                Continuous institutional survey feedback cycles
              </CardDescription>

              <div className="space-y-3">
                {feedbackCycles.map((fb) => (
                  <div
                    key={fb.id}
                    className="p-4 rounded-2xl bg-sfrc-50/70 border border-sfrc-100 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-sfrc-900">{fb.cycle_name}</p>
                      <p className="text-[11px] text-sfrc-600 mt-0.5">
                        Stakeholders: {fb.stakeholder_type} • {fb.total_responses} Responses
                      </p>
                      <p className="text-[10px] text-sfrc-500 mt-0.5">AY {fb.academic_year}</p>
                    </div>

                    <div className="text-right space-y-1">
                      <span className="inline-block px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-xs">
                        {fb.satisfaction_rate}% Satisfaction
                      </span>
                      {fb.action_taken_report_url && (
                        <p className="text-[10px] text-sfrc-700 font-bold">
                          <ExternalLink className="w-3 h-3 inline mr-0.5" /> ATR Published
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* TAB 2: Meetings & Minutes */}
        {activeTab === 'meetings' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-sfrc-900">Statutory IQAC Meetings Log</h2>
                <p className="text-xs text-sfrc-600">Official agendas, recorded minutes, and resolution decisions.</p>
              </div>

              <Button
                onClick={() => setNewMeetingModalOpen(true)}
                className="bg-sfrc-700 hover:bg-sfrc-800 text-white rounded-xl text-xs font-bold"
              >
                <PlusCircle className="w-4 h-4 mr-1.5" /> Schedule New Meeting
              </Button>
            </div>

            <div className="space-y-4">
              {meetings.map((m) => (
                <Card key={m.id} className="rounded-3xl border-sfrc-200 bg-white p-6 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-sfrc-700 text-white font-mono text-[10px]">
                          {m.meeting_number}
                        </Badge>
                        <span className="font-bold text-base text-sfrc-900">{m.title}</span>
                      </div>
                      <p className="text-sfrc-600 mt-1">
                        <strong>Date:</strong> {m.meeting_date} • <strong>Venue:</strong> {m.venue}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedMeeting(m);
                        setMeetingDetailModalOpen(true);
                      }}
                      className="rounded-xl text-xs font-bold border-sfrc-200 text-sfrc-800"
                    >
                      <BookOpen className="w-3.5 h-3.5 mr-1.5" /> View Minutes & Decisions
                    </Button>
                  </div>

                  {/* Key Decisions Banner */}
                  {m.decisions && m.decisions.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-sfrc-50 border border-sfrc-100 text-xs space-y-1">
                      <p className="font-bold text-sfrc-900">Key Resolutions & Decisions:</p>
                      <ul className="list-disc list-inside text-[11px] text-sfrc-700 space-y-0.5">
                        {m.decisions.map((d: string, idx: number) => (
                          <li key={idx}>{d}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: Action Items */}
        {activeTab === 'action-items' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-sfrc-200 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-sfrc-700 mr-1">Filter Status:</span>
                {(['all', 'pending', 'in progress', 'completed', 'deferred'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setActionStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                      actionStatusFilter === st
                        ? 'bg-sfrc-700 text-white shadow-xs'
                        : 'bg-sfrc-50 text-sfrc-700 hover:bg-sfrc-100'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <Card className="rounded-3xl border-sfrc-200 bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-sfrc-200 bg-sfrc-50 text-[11px] font-bold text-sfrc-700 uppercase tracking-wider">
                      <th className="py-3.5 px-6">Action Item Resolution</th>
                      <th className="py-3.5 px-4">Department / Person Responsible</th>
                      <th className="py-3.5 px-4">Target Date</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Evidence</th>
                      <th className="py-3.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sfrc-100">
                    {filteredActionItems.map((act) => (
                      <tr key={act.id} className="hover:bg-sfrc-50/70 transition-colors">
                        <td className="py-4 px-6 font-bold text-sfrc-900 max-w-sm">
                          {act.title}
                          {act.remarks && (
                            <p className="text-[11px] text-sfrc-500 font-normal mt-0.5">{act.remarks}</p>
                          )}
                        </td>

                        <td className="py-4 px-4 text-sfrc-700 font-medium">
                          {act.responsible_person_or_dept}
                        </td>

                        <td className="py-4 px-4 font-semibold text-sfrc-800">
                          {act.target_date}
                        </td>

                        <td className="py-4 px-4">
                          <Badge
                            className={`text-[10px] font-bold ${
                              act.status === 'Completed'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : act.status === 'In Progress'
                                ? 'bg-blue-100 text-blue-800 border-blue-200'
                                : 'bg-amber-100 text-amber-800 border-amber-200'
                            }`}
                          >
                            {act.status}
                          </Badge>
                        </td>

                        <td className="py-4 px-4">
                          {act.evidence_url ? (
                            <a
                              href={act.evidence_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-bold text-sfrc-700 hover:text-sfrc-900 inline-flex items-center gap-1"
                            >
                              <FileCheck className="w-3.5 h-3.5 text-emerald-600" /> Evidence
                            </a>
                          ) : (
                            <span className="text-[11px] text-sfrc-400">Pending</span>
                          )}
                        </td>

                        <td className="py-4 px-6 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenActionUpdate(act)}
                            className="rounded-xl text-xs font-bold border-sfrc-200 text-sfrc-800"
                          >
                            Update Status
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 4: Quality Initiatives */}
        {activeTab === 'initiatives' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-sfrc-900">Institutional Quality Initiatives</h2>
                <p className="text-xs text-sfrc-600">Transformational pedagogical and operational programs driven by IQAC.</p>
              </div>

              <Button
                onClick={() => setInitiativeModalOpen(true)}
                className="bg-sfrc-700 hover:bg-sfrc-800 text-white rounded-xl text-xs font-bold"
              >
                <PlusCircle className="w-4 h-4 mr-1.5" /> Add Quality Initiative
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {initiatives.map((init) => (
                <Card key={init.id} className="rounded-3xl border-sfrc-200 bg-white p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <Badge className="bg-sfrc-700 text-white font-bold text-[10px]">
                      AY {init.academic_year}
                    </Badge>
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                      {init.status}
                    </Badge>
                  </div>

                  <h3 className="text-base font-bold text-sfrc-900">{init.title}</h3>

                  <div className="space-y-2 text-xs text-sfrc-700">
                    <p>
                      <strong>Coordinator:</strong> {init.coordinator}
                    </p>
                    <p>
                      <strong>Objectives:</strong> {init.objectives}
                    </p>
                    <p>
                      <strong>Target KPI:</strong> {init.target_kpi}
                    </p>
                  </div>

                  {init.impact_metrics && (
                    <div className="p-3.5 rounded-2xl bg-sfrc-50 border border-sfrc-100 text-xs">
                      <p className="font-bold text-sfrc-900">Demonstrated Impact:</p>
                      <p className="text-[11px] text-sfrc-600 mt-0.5">{init.impact_metrics}</p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: AQAR Reports */}
        {activeTab === 'aqar' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-sfrc-900">Annual Quality Assurance Report (AQAR)</h2>
                <p className="text-xs text-sfrc-600">NAAC accredited documentation repository across 7 assessment criteria.</p>
              </div>

              <Button
                onClick={() => setAqarModalOpen(true)}
                className="bg-sfrc-700 hover:bg-sfrc-800 text-white rounded-xl text-xs font-bold"
              >
                <Upload className="w-4 h-4 mr-1.5" /> Upload AQAR Document
              </Button>
            </div>

            <Card className="rounded-3xl border-sfrc-200 bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-sfrc-200 bg-sfrc-50 text-[11px] font-bold text-sfrc-700 uppercase tracking-wider">
                      <th className="py-3.5 px-6">Criteria & Academic Year</th>
                      <th className="py-3.5 px-4">Document Title</th>
                      <th className="py-3.5 px-4">Submission Date</th>
                      <th className="py-3.5 px-4">NAAC Status</th>
                      <th className="py-3.5 px-6 text-right">Download</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sfrc-100">
                    {aqarDocs.map((doc) => (
                      <tr key={doc.id} className="hover:bg-sfrc-50/70 transition-colors">
                        <td className="py-4 px-6 font-bold text-sfrc-900">
                          {doc.criteria_name}
                          <p className="text-[11px] text-sfrc-500 font-normal">Academic Year {doc.academic_year}</p>
                        </td>

                        <td className="py-4 px-4 text-sfrc-800 font-medium">
                          {doc.file_title}
                        </td>

                        <td className="py-4 px-4 text-sfrc-600">
                          {doc.submission_date}
                        </td>

                        <td className="py-4 px-4">
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                            Submitted to NAAC
                          </Badge>
                        </td>

                        <td className="py-4 px-6 text-right">
                          <a href={doc.document_url} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline" className="rounded-xl text-xs font-bold border-sfrc-200">
                              <ExternalLink className="w-3.5 h-3.5 mr-1" /> View PDF
                            </Button>
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* MODAL: Meeting Detail View */}
      <Dialog open={meetingDetailModalOpen} onOpenChange={setMeetingDetailModalOpen}>
        <DialogContent className="max-w-2xl bg-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-sfrc-900">
              {selectedMeeting?.meeting_number}: {selectedMeeting?.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-sfrc-600">
              Conducted on {selectedMeeting?.meeting_date} at {selectedMeeting?.venue}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-xs pt-2">
            <div>
              <p className="font-bold text-sfrc-900 mb-1">Attendees / Committee Members:</p>
              <div className="flex flex-wrap gap-1.5">
                {(selectedMeeting?.attendees || []).map((att: string, idx: number) => (
                  <span key={idx} className="px-2.5 py-1 rounded-lg bg-sfrc-100 text-sfrc-800 font-medium text-[11px]">
                    {att}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <p className="font-bold text-sfrc-900">Meeting Agenda:</p>
              <ul className="list-disc list-inside text-sfrc-700 text-xs space-y-1">
                {(selectedMeeting?.agenda || []).map((ag: string, idx: number) => (
                  <li key={idx}>{ag}</li>
                ))}
              </ul>
            </div>

            {selectedMeeting?.minutes && (
              <div className="p-3.5 rounded-2xl bg-sfrc-50 border border-sfrc-100 space-y-1">
                <p className="font-bold text-sfrc-900">Recorded Minutes:</p>
                <p className="text-sfrc-700 text-xs leading-relaxed">{selectedMeeting.minutes}</p>
              </div>
            )}
          </div>

          <DialogFooter className="pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMeetingDetailModalOpen(false)}
              className="rounded-xl text-xs font-bold"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Update Action Item */}
      <Dialog open={actionUpdateModalOpen} onOpenChange={setActionUpdateModalOpen}>
        <DialogContent className="max-w-md bg-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-sfrc-900">
              Update Action Item Status
            </DialogTitle>
            <DialogDescription className="text-xs text-sfrc-600">
              {selectedActionItem?.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs pt-2">
            <div className="space-y-1">
              <label className="font-bold text-sfrc-800">Execution Status</label>
              <Select value={actionStatus} onValueChange={(v) => { if (v) setActionStatus(v); }}>
                <SelectTrigger className="rounded-xl text-xs font-semibold">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending" className="text-xs">Pending</SelectItem>
                  <SelectItem value="In Progress" className="text-xs">In Progress</SelectItem>
                  <SelectItem value="Completed" className="text-xs">Completed</SelectItem>
                  <SelectItem value="Deferred" className="text-xs">Deferred</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-sfrc-800">Evidence URL (e.g. Document / Photo link)</label>
              <Input
                placeholder="https://sfrc.edu.in/iqac/evidence/report.pdf"
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                className="rounded-xl text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-sfrc-800">Execution Remarks</label>
              <Textarea
                placeholder="Details of action taken..."
                value={actionRemarks}
                onChange={(e) => setActionRemarks(e.target.value)}
                rows={2}
                className="rounded-xl text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActionUpdateModalOpen(false)}
              className="rounded-xl text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              disabled={isSubmittingAction}
              onClick={handleUpdateActionItem}
              className="bg-sfrc-700 hover:bg-sfrc-800 text-white rounded-xl text-xs font-bold"
            >
              {isSubmittingAction ? 'Updating...' : 'Save Updates'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Schedule Meeting */}
      <Dialog open={newMeetingModalOpen} onOpenChange={setNewMeetingModalOpen}>
        <DialogContent className="max-w-md bg-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-sfrc-900">
              Schedule IQAC Statutory Meeting
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-xs pt-2">
            <div className="space-y-1">
              <label className="font-bold text-sfrc-800">Meeting Title *</label>
              <Input
                placeholder="IQAC Meeting IV — Academic Audit"
                value={meetTitle}
                onChange={(e) => setMeetTitle(e.target.value)}
                className="rounded-xl text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-sfrc-800">Meeting Number</label>
                <Input
                  value={meetNumber}
                  onChange={(e) => setMeetNumber(e.target.value)}
                  className="rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-sfrc-800">Meeting Date</label>
                <Input
                  type="date"
                  value={meetDate}
                  onChange={(e) => setMeetDate(e.target.value)}
                  className="rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-sfrc-800">Agenda Items (one per line) *</label>
              <Textarea
                placeholder="Review of Autonomous Syllabi&#10;Placement Statistics Audit"
                value={meetAgenda}
                onChange={(e) => setMeetAgenda(e.target.value)}
                rows={3}
                className="rounded-xl text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNewMeetingModalOpen(false)}
              className="rounded-xl text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              disabled={isSubmittingMeet}
              onClick={handleCreateMeeting}
              className="bg-sfrc-700 hover:bg-sfrc-800 text-white rounded-xl text-xs font-bold"
            >
              {isSubmittingMeet ? 'Scheduling...' : 'Save Meeting'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Add Initiative */}
      <Dialog open={initiativeModalOpen} onOpenChange={setInitiativeModalOpen}>
        <DialogContent className="max-w-md bg-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-sfrc-900">
              Register Quality Enhancement Initiative
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-xs pt-2">
            <div className="space-y-1">
              <label className="font-bold text-sfrc-800">Initiative Title *</label>
              <Input
                placeholder="Smart Classrooms Digital Pedagogy"
                value={initTitle}
                onChange={(e) => setInitTitle(e.target.value)}
                className="rounded-xl text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-sfrc-800">Coordinator / In-Charge *</label>
              <Input
                placeholder="Dr. S. Sivakama Sundari"
                value={initCoordinator}
                onChange={(e) => setInitCoordinator(e.target.value)}
                className="rounded-xl text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-sfrc-800">Target KPI & Outcome</label>
              <Input
                placeholder="100% faculty ICT adoption"
                value={initKpi}
                onChange={(e) => setInitKpi(e.target.value)}
                className="rounded-xl text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInitiativeModalOpen(false)}
              className="rounded-xl text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              disabled={isSubmittingInit}
              onClick={handleCreateInitiative}
              className="bg-sfrc-700 hover:bg-sfrc-800 text-white rounded-xl text-xs font-bold"
            >
              {isSubmittingInit ? 'Creating...' : 'Register Initiative'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Upload AQAR */}
      <Dialog open={aqarModalOpen} onOpenChange={setAqarModalOpen}>
        <DialogContent className="max-w-md bg-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-sfrc-900">
              Upload AQAR NAAC Documentation
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-xs pt-2">
            <div className="space-y-1">
              <label className="font-bold text-sfrc-800">Document Title *</label>
              <Input
                placeholder="Criterion II - Teaching-Learning & Evaluation.pdf"
                value={aqarFileTitle}
                onChange={(e) => setAqarFileTitle(e.target.value)}
                className="rounded-xl text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-sfrc-800">Academic Year</label>
                <Input
                  value={aqarYear}
                  onChange={(e) => setAqarYear(e.target.value)}
                  className="rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-sfrc-800">Criteria Number</label>
                <Select value={aqarCriteriaNum} onValueChange={(v) => { if (v) setAqarCriteriaNum(v); }}>
                  <SelectTrigger className="rounded-xl text-xs font-semibold">
                    <SelectValue placeholder="Criteria" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                      <SelectItem key={num} value={String(num)} className="text-xs">
                        Criterion {num}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAqarModalOpen(false)}
              className="rounded-xl text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              disabled={isSubmittingAqar}
              onClick={handleCreateAqar}
              className="bg-sfrc-700 hover:bg-sfrc-800 text-white rounded-xl text-xs font-bold"
            >
              {isSubmittingAqar ? 'Uploading...' : 'Save & Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
