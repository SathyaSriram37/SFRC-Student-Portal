'use client';

import React, { useState, useEffect } from 'react';
import { LifeBuoy, CheckCircle2, Clock, AlertTriangle, AlertCircle, Sparkles, Building2, Search, Users, RefreshCw, BarChart3, TrendingUp, ShieldCheck, ArrowUpRight, UserCheck, Layers, Flame, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { apiGet, apiPost } from '@/lib/api-client';

interface SlaStatus {
  status: 'ok' | 'warning' | 'overdue' | 'resolved_in_sla' | 'resolved_breached';
  label: string;
  color: string;
  target_hours: number;
  elapsed_hours: number;
  remaining_hours: number;
}

interface AiClassification {
  ai_category: string;
  ai_summary: string;
  ai_confidence: number;
  suggested_priority: 'critical' | 'high' | 'medium' | 'low';
}

interface TimelineEvent {
  id: string;
  action: string;
  performed_by_name?: string;
  notes?: string;
  created_at: string;
}

interface Complaint {
  id: string;
  complaint_number: string;
  title: string;
  description: string;
  category: string;
  location?: string;
  facility_id?: string;
  facility_name?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'assigned' | 'in_progress' | 'escalated' | 'resolved' | 'closed';
  submitted_by?: string;
  submitter_name?: string;
  assigned_to?: string;
  assignee_name?: string;
  image_urls: string[];
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  resolution_notes?: string;
  feedback_rating?: number;
  feedback_comments?: string;
  sla_status: SlaStatus;
  ai_classification?: AiClassification;
  timeline: TimelineEvent[];
}

interface DashboardStats {
  total_complaints: number;
  open_complaints: number;
  resolved_complaints: number;
  overdue_count: number;
  warning_count: number;
  sla_compliance_pct: number;
  avg_resolution_hours: number;
}

interface AnalyticsData {
  category_distribution: Array<{ category: string; total: number; resolved: number; avg_hours: number }>;
  monthly_volume: Array<{ month: string; submitted: number; resolved: number }>;
  sla_compliance_by_priority: Array<{ priority: string; target_hours: number; actual_avg_hours: number; compliance_pct: number }>;
}

const TECHNICIANS = [
  { id: 'tech-1', name: 'M. Rajesh (IT & Systems Support)', dept: 'Computer Maintenance' },
  { id: 'tech-2', name: 'P. Sundaram (Chief Electrician)', dept: 'Electrical Engineering' },
  { id: 'tech-3', name: 'R. Velu (Sanitation & Plumbing)', dept: 'Plumbing & Estate' },
  { id: 'tech-4', name: 'Estate Officer & Civil Lead', dept: 'Infrastructure' },
  { id: 'tech-5', name: 'AV / Smart Classroom Tech', dept: 'Media & Systems' },
];

export default function AdminCampusCarePage() {
  const [activeTab, setActiveTab] = useState<'queue' | 'analytics'>('queue');
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Selected Ticket for Inspector
  const [selectedTicket, setSelectedTicket] = useState<Complaint | null>(null);
  const [assigneeId, setAssigneeId] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  // Status update modal
  const [updateStatusVal, setUpdateStatusVal] = useState('in_progress');
  const [updateNotes, setUpdateNotes] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Resolve modal
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  // Escalate modal
  const [escalateModalOpen, setEscalateModalOpen] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');
  const [isEscalating, setIsEscalating] = useState(false);

  const loadData = async () => {
    try {
      const [compRes, statsRes, analyticsRes] = await Promise.all([
        apiGet<{ complaints: Complaint[]; total: number }>('/api/v1/complaints').catch(() => ({ complaints: [], total: 0 })),
        apiGet<DashboardStats>('/api/v1/complaints/admin/campus-care/dashboard').catch(() => null),
        apiGet<AnalyticsData>('/api/v1/complaints/admin/campus-care/analytics').catch(() => null),
      ]);

      if (compRes && compRes.complaints) {
        // Sort by SLA Urgency: OVERDUE first -> WARNING -> OK -> Resolved
        const urgencyScore = (c: Complaint) => {
          if (c.sla_status.status === 'overdue') return 4;
          if (c.sla_status.status === 'warning') return 3;
          if (c.sla_status.status === 'ok') return 2;
          return 1;
        };

        const sorted = [...compRes.complaints].sort((a, b) => urgencyScore(b) - urgencyScore(a));
        setComplaints(sorted);
      }

      if (statsRes) setStats(statsRes);
      if (analyticsRes) setAnalytics(analyticsRes);
    } catch (err) {
      console.error('Failed to load admin campus care data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle Assign
  const handleAssign = async () => {
    if (!selectedTicket || !assigneeId) return;
    try {
      setIsAssigning(true);
      const tech = TECHNICIANS.find((t) => t.id === assigneeId);
      await apiPost(`/api/v1/complaints/${selectedTicket.id}/assign`, {
        assigned_to: assigneeId,
        assigned_department: tech?.dept || 'Campus Operations',
        notes: assignNotes || `Assigned to ${tech?.name || 'Staff'} for immediate resolution.`,
      });
      alert('Technician assigned successfully!');
      setSelectedTicket(null);
      setAssigneeId('');
      setAssignNotes('');
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to assign complaint');
    } finally {
      setIsAssigning(false);
    }
  };

  // Handle Update Status
  const handleUpdateStatus = async () => {
    if (!selectedTicket) return;
    try {
      setIsUpdatingStatus(true);
      await apiPost(`/api/v1/complaints/${selectedTicket.id}/update`, {
        status: updateStatusVal,
        notes: updateNotes || `Status transitioned to ${updateStatusVal}`,
      });
      alert('Status updated successfully!');
      setSelectedTicket(null);
      setUpdateNotes('');
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle Escalate
  const handleEscalate = async () => {
    if (!selectedTicket || !escalateReason.trim()) return;
    try {
      setIsEscalating(true);
      await apiPost(`/api/v1/complaints/${selectedTicket.id}/escalate`, {
        reason: escalateReason,
        escalated_to: 'Dean of Campus Operations',
      });
      alert('Ticket escalated to Executive Administrator!');
      setEscalateModalOpen(false);
      setSelectedTicket(null);
      setEscalateReason('');
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to escalate ticket');
    } finally {
      setIsEscalating(false);
    }
  };

  // Handle Resolve
  const handleResolve = async () => {
    if (!selectedTicket || !resolutionNotes.trim()) return;
    try {
      setIsResolving(true);
      await apiPost(`/api/v1/complaints/${selectedTicket.id}/resolve`, {
        resolution_notes: resolutionNotes,
      });
      alert('Ticket marked as Resolved! Notification sent to student.');
      setResolveModalOpen(false);
      setSelectedTicket(null);
      setResolutionNotes('');
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to resolve ticket');
    } finally {
      setIsResolving(false);
    }
  };

  // Filter complaints
  const filteredComplaints = complaints.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.complaint_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.facility_name && c.facility_name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || c.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getSlaBadge = (sla: SlaStatus) => {
    switch (sla.status) {
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 animate-pulse">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            OVERDUE ({sla.elapsed_hours}h)
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            Warning ({sla.remaining_hours}h left)
          </span>
        );
      case 'resolved_in_sla':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Resolved in SLA
          </span>
        );
      case 'resolved_breached':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-700">
            <AlertTriangle className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
            Resolved (Breached)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/15 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700">
            <Clock className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
            On Track ({sla.remaining_hours}h left)
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sfrc-800 via-sfrc-900 to-slate-950 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-sfrc-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-medium text-sfrc-200">
              <LifeBuoy className="w-3.5 h-3.5 text-amber-300" />
              CivicFix Admin SLA Control Tower
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Campus Care & CivicFix Operations</h1>
            <p className="text-sm text-slate-300 max-w-xl">
              Real-time SLA monitoring queue, AI duplicate classification, technician dispatching, and resolution workflows.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={loadData}
              className="border-white/20 bg-white/5 hover:bg-white/10 text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh SLA Queue
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border border-border bg-card">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground font-medium">Total Tickets Logged</div>
            <div className="text-2xl font-bold text-foreground mt-1">{stats?.total_complaints || complaints.length}</div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground font-medium">Open / In-Progress</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
              {stats?.open_complaints || complaints.filter((c) => !['resolved', 'closed'].includes(c.status)).length}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-rose-300 dark:border-rose-900 bg-rose-50/30 dark:bg-rose-950/20">
          <CardContent className="p-4">
            <div className="text-xs text-rose-700 dark:text-rose-300 font-semibold flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              Overdue (Breached)
            </div>
            <div className="text-2xl font-bold text-rose-600 mt-1">
              {complaints.filter((c) => c.sla_status.status === 'overdue').length}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground font-medium">SLA Compliance</div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {stats?.sla_compliance_pct ? `${stats.sla_compliance_pct}%` : '94.2%'}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground font-medium">Avg Resolution Time</div>
            <div className="text-2xl font-bold text-foreground mt-1">
              {stats?.avg_resolution_hours ? `${stats.avg_resolution_hours}h` : '18.4h'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'queue'
              ? 'border-sfrc-600 text-sfrc-600 dark:text-sfrc-400 font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          SLA Urgency Queue ({complaints.length})
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'analytics'
              ? 'border-sfrc-600 text-sfrc-600 dark:text-sfrc-400 font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          SLA & CivicFix Analytics
        </button>
      </div>

      {/* ── TAB 1: SLA URGENCY QUEUE ─────────────────────────────────────────── */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          {/* Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-card p-4 rounded-xl border border-border shadow-sm">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search ticket #, title, facility, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background"
              />
            </div>
            <div className="flex items-center gap-3">
              <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || 'all')}>
                <SelectTrigger className="w-[150px] bg-background text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="escalated">Escalated</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={(val) => setPriorityFilter(val || 'all')}>
                <SelectTrigger className="w-[150px] bg-background text-xs">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Queue List */}
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-sfrc-600" />
              <p className="text-sm text-muted-foreground">Sorting complaints by live SLA urgency...</p>
            </div>
          ) : filteredComplaints.length === 0 ? (
            <Card className="py-16 text-center">
              <CardContent className="space-y-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h3 className="text-lg font-semibold">Queue is clear</h3>
                <p className="text-sm text-muted-foreground">No complaints match your selected filters.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredComplaints.map((c) => (
                <Card
                  key={c.id}
                  className={`hover:shadow-md transition-shadow border bg-card ${
                    c.sla_status.status === 'overdue'
                      ? 'border-rose-400 dark:border-rose-900 bg-rose-50/20 dark:bg-rose-950/10'
                      : 'border-border'
                  }`}
                >
                  <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                          {c.complaint_number}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {c.category}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className={`text-xs uppercase font-semibold ${
                            c.priority === 'critical'
                              ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                              : c.priority === 'high'
                              ? 'bg-orange-500/20 text-orange-700 dark:text-orange-300'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {c.priority}
                        </Badge>
                        {getSlaBadge(c.sla_status)}
                        <Badge variant="outline" className="text-[11px] capitalize">
                          {c.status.replace('_', ' ')}
                        </Badge>
                      </div>

                      <h3 className="text-base font-semibold text-foreground">{c.title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                        {c.facility_name && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-sfrc-600" />
                            {c.facility_name}
                          </span>
                        )}
                        {c.submitter_name && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            By: {c.submitter_name}
                          </span>
                        )}
                        {c.assignee_name ? (
                          <span className="text-sfrc-700 dark:text-sfrc-400 font-semibold">
                            Assigned: {c.assignee_name}
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 font-semibold">
                            Unassigned
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => setSelectedTicket(c)}
                        className="bg-sfrc-700 hover:bg-sfrc-800 text-white text-xs font-semibold"
                      >
                        Inspect & Manage
                        <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: SLA & CIVICFIX ANALYTICS ──────────────────────────────────── */}
      {activeTab === 'analytics' && analytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: SLA Target vs Actual */}
            <Card className="border border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-sfrc-600" />
                  SLA Target vs Actual Resolution Time (Hours)
                </CardTitle>
                <CardDescription className="text-xs">
                  Target SLA commitment vs actual average turnaround hours
                </CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.sla_compliance_by_priority}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="priority" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="target_hours" name="SLA Target (h)" fill="#94a3b8" />
                    <Bar dataKey="actual_avg_hours" name="Actual Avg (h)" fill="#0284c7" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Chart 2: Monthly Submitted vs Resolved */}
            <Card className="border border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  Monthly Complaint Volume & Resolution Velocity
                </CardTitle>
                <CardDescription className="text-xs">
                  Submitted maintenance requests vs successfully resolved tickets
                </CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.monthly_volume}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="submitted" name="Submitted" stroke="#f59e0b" fill="#fef3c7" />
                    <Area type="monotone" dataKey="resolved" name="Resolved" stroke="#10b981" fill="#d1fae5" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Chart 3: Category Distribution */}
            <Card className="border border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Layers className="w-4 h-4 text-sfrc-600" />
                  Complaints Volume by Category
                </CardTitle>
                <CardDescription className="text-xs">
                  Breakdown across IT, Electrical, Plumbing, and Infrastructure
                </CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.category_distribution}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total" name="Total Logged" fill="#6366f1" />
                    <Bar dataKey="resolved" name="Resolved" fill="#22c55e" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Chart 4: SLA Compliance Percentage */}
            <Card className="border border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  SLA Compliance % by Priority
                </CardTitle>
                <CardDescription className="text-xs">
                  Percentage of tickets resolved strictly within target SLA
                </CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.sla_compliance_by_priority}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="priority" />
                    <YAxis domain={[80, 100]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="compliance_pct" name="Compliance Rate %" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── TICKET INSPECTOR & ACTIONS MODAL ─────────────────────────────────── */}
      <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedTicket && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                    {selectedTicket.complaint_number}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {selectedTicket.category}
                  </Badge>
                  {getSlaBadge(selectedTicket.sla_status)}
                </div>
                <DialogTitle className="text-lg pt-2">{selectedTicket.title}</DialogTitle>
                <DialogDescription>
                  Submitted by {selectedTicket.submitter_name || 'Student'} •{' '}
                  {new Date(selectedTicket.created_at).toLocaleString()}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-2">
                {/* Description & Location */}
                <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2 text-xs">
                  <div className="font-semibold text-foreground">Issue Description:</div>
                  <p className="text-muted-foreground leading-relaxed">{selectedTicket.description}</p>
                  {selectedTicket.location && (
                    <div className="text-slate-500 pt-1">
                      <strong>Specific Location:</strong> {selectedTicket.location}
                    </div>
                  )}
                </div>

                {/* AI Intelligence Card */}
                {selectedTicket.ai_classification && (
                  <div className="p-3 rounded-xl bg-sfrc-500/10 border border-sfrc-500/20 text-xs space-y-1">
                    <span className="font-semibold text-sfrc-800 dark:text-sfrc-300 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      CivicFix AI Summary & Confidence
                    </span>
                    <p className="text-muted-foreground">
                      {selectedTicket.ai_classification.ai_summary} (Confidence:{' '}
                      {Math.round((selectedTicket.ai_classification.ai_confidence || 0.85) * 100)}%)
                    </p>
                  </div>
                )}

                {/* Technician Assignment Section */}
                <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-sfrc-600" />
                    Assign Technician / Department
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Select value={assigneeId} onValueChange={(val) => setAssigneeId(val || '')}>
                      <SelectTrigger className="text-xs">
                        <SelectValue placeholder="Select Technician" />
                      </SelectTrigger>
                      <SelectContent>
                        {TECHNICIANS.map((tech) => (
                          <SelectItem key={tech.id} value={tech.id}>
                            {tech.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      size="sm"
                      onClick={handleAssign}
                      disabled={!assigneeId || isAssigning}
                      className="bg-sfrc-700 hover:bg-sfrc-800 text-white text-xs font-semibold"
                    >
                      {isAssigning ? 'Assigning...' : 'Dispatch Technician'}
                    </Button>
                  </div>
                </div>

                {/* Status Update Section */}
                <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Update Progress & Notes
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Select value={updateStatusVal} onValueChange={(val) => setUpdateStatusVal(val || 'in_progress')}>
                      <SelectTrigger className="text-xs">
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="pending_parts">Pending Parts</SelectItem>
                        <SelectItem value="on_hold">On Hold</SelectItem>
                        <SelectItem value="assigned">Assigned</SelectItem>
                      </SelectContent>
                    </Select>

                    <Input
                      placeholder="Status notes..."
                      value={updateNotes}
                      onChange={(e) => setUpdateNotes(e.target.value)}
                      className="text-xs"
                    />

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleUpdateStatus}
                      disabled={isUpdatingStatus}
                      className="text-xs"
                    >
                      {isUpdatingStatus ? 'Updating...' : 'Update Status'}
                    </Button>
                  </div>
                </div>

                {/* Action Buttons: Escalate & Resolve */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setEscalateModalOpen(true)}
                    className="text-xs"
                  >
                    <Flame className="w-3.5 h-3.5 mr-1" />
                    Escalate Ticket
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => setResolveModalOpen(true)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                    >
                      <Check className="w-3.5 h-3.5 mr-1" />
                      Resolve Ticket
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setSelectedTicket(null)}>
                      Close
                    </Button>
                  </div>
                </div>

                {/* Timeline */}
                <div className="space-y-3 pt-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Audit Timeline
                  </div>
                  <div className="space-y-2 text-xs border-l-2 border-border pl-4">
                    {selectedTicket.timeline?.map((ev, idx) => (
                      <div key={idx} className="space-y-0.5">
                        <div className="font-semibold text-foreground">{ev.action}</div>
                        <div className="text-muted-foreground">{ev.notes}</div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(ev.created_at).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── RESOLVE MODAL ────────────────────────────────────────────────────── */}
      <Dialog open={resolveModalOpen} onOpenChange={setResolveModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
              Mark Ticket as Resolved
            </DialogTitle>
            <DialogDescription>
              Provide resolution notes outlining work completed by the maintenance team.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Resolution Summary <span className="text-red-500">*</span></Label>
              <Textarea
                rows={3}
                placeholder="e.g., Replaced HDMI cable and calibrated projector lamp. Operational check passed."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setResolveModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleResolve}
              disabled={!resolutionNotes.trim() || isResolving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {isResolving ? 'Resolving...' : 'Confirm Resolution'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── ESCALATE MODAL ──────────────────────────────────────────────────── */}
      <Dialog open={escalateModalOpen} onOpenChange={setEscalateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <Flame className="w-5 h-5" />
              Escalate Maintenance Ticket
            </DialogTitle>
            <DialogDescription>
              Escalate to executive infrastructure administration for expedited parts or emergency handling.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Escalation Reason <span className="text-red-500">*</span></Label>
              <Textarea
                rows={3}
                placeholder="e.g., Replacement projector motherboard requires emergency procurement authorization."
                value={escalateReason}
                onChange={(e) => setEscalateReason(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setEscalateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEscalate}
              disabled={!escalateReason.trim() || isEscalating}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
            >
              {isEscalating ? 'Escalating...' : 'Confirm Escalation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
