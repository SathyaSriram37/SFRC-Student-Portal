'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Scale,
  PlusCircle,
  Search,
  Edit,
  EyeOff,
  MessageSquare,
  BookOpen,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import type { PolicyItem, GrievanceItem } from '@/lib/types';

const POLICY_CATEGORIES = [
  'Anti-Ragging',
  'Grievance Redressal',
  'Code of Conduct',
  'IT Policy',
  'Examination Rules',
  'Hostel Rules',
  'Library Rules',
  'Academic Regulations',
  'Student Safety',
  'RTI',
  'Green Campus',
  'SOPs',
  'Other',
];

const GRIEVANCE_STATUSES = ['Received', 'Under Review', 'Resolved', 'Closed'];

export default function AdminPoliciesPage() {
  const [activeTab, setActiveTab] = useState<'policies' | 'grievances'>('policies');
  const [policies, setPolicies] = useState<PolicyItem[]>([]);
  const [grievances, setGrievances] = useState<GrievanceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filters
  const [policySearch, setPolicySearch] = useState('');
  const [policyCatFilter, setPolicyCatFilter] = useState('all');
  const [grievanceStatusFilter, setGrievanceStatusFilter] = useState('all');
  const [grievanceCatFilter, setGrievanceCatFilter] = useState('all');

  // Policy Create/Edit Modal State
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [isEditingPolicy, setIsEditingPolicy] = useState(false);
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('Anti-Ragging');
  const [formVersion, setFormVersion] = useState('1.0');
  const [formAudience, setFormAudience] = useState('all');
  const [formRequiresAck, setFormRequiresAck] = useState(false);
  const [formEffectiveDate, setFormEffectiveDate] = useState('2026-06-01');
  const [formDescription, setFormDescription] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formDocUrl, setFormDocUrl] = useState('');
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);

  // Grievance Status Modal State
  const [selectedGrievance, setSelectedGrievance] = useState<GrievanceItem | null>(null);
  const [grievanceModalOpen, setGrievanceModalOpen] = useState(false);
  const [updateStatusVal, setUpdateStatusVal] = useState('Under Review');
  const [adminResponseNotes, setAdminResponseNotes] = useState('');
  const [isUpdatingGrievance, setIsUpdatingGrievance] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  const getAuthToken = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return session?.access_token;
    } catch {
      return undefined;
    }
  }, [supabase]);

  const loadAdminData = useCallback(async () => {
    try {
      const token = await getAuthToken();
      const [polRes, grvRes] = await Promise.allSettled([
        apiGet<{ policies: PolicyItem[]; total: number }>('/api/v1/admin/policies', token),
        apiGet<{ grievances: GrievanceItem[]; total: number }>('/api/v1/admin/grievances', token),
      ]);

      if (polRes.status === 'fulfilled' && polRes.value?.policies) {
        setPolicies(polRes.value.policies);
      }
      if (grvRes.status === 'fulfilled' && grvRes.value?.grievances) {
        setGrievances(grvRes.value.grievances);
      }
    } catch (err) {
      console.error('Failed to load admin compliance data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [getAuthToken]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      await loadAdminData();
    })();
    return () => {
      ignore = true;
    };
  }, [loadAdminData]);

  // Handle Create or Update Policy
  const handleSavePolicy = async (targetStatus: 'draft' | 'published') => {
    if (!formTitle.trim() || !formDescription.trim() || !formContent.trim()) {
      alert('Please fill all required policy title, summary, and content fields.');
      return;
    }

    try {
      setIsSavingPolicy(true);
      const token = await getAuthToken();
      const payload = {
        title: formTitle.trim(),
        category: formCategory,
        version: formVersion.trim() || '1.0',
        audience: formAudience,
        requires_acknowledgement: formRequiresAck,
        effective_date: formEffectiveDate,
        description: formDescription.trim(),
        content: formContent.trim(),
        document_url: formDocUrl.trim() || undefined,
        status: targetStatus,
      };

      if (isEditingPolicy && editingPolicyId) {
        await apiPut(`/api/v1/admin/policies/${editingPolicyId}`, payload, token);
      } else {
        await apiPost('/api/v1/admin/policies', payload, token);
      }

      setPolicyModalOpen(false);
      resetPolicyForm();
      await loadAdminData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save policy';
      alert(msg);
    } finally {
      setIsSavingPolicy(false);
    }
  };

  // Quick Publish Policy
  const handleQuickPublish = async (policy: PolicyItem) => {
    if (!confirm(`Are you sure you want to publish '${policy.title}' immediately for student and institutional access?`)) return;

    try {
      const token = await getAuthToken();
      await apiPost(`/api/v1/admin/policies/${policy.id}/publish`, {}, token);
      await loadAdminData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to publish policy';
      alert(msg);
    }
  };

  // Open Edit Policy
  const handleOpenEditPolicy = (policy: PolicyItem) => {
    setIsEditingPolicy(true);
    setEditingPolicyId(policy.id);
    setFormTitle(policy.title);
    setFormCategory(policy.category);
    setFormVersion(policy.version);
    setFormAudience(policy.audience);
    setFormRequiresAck(policy.requires_acknowledgement);
    setFormEffectiveDate(policy.effective_date);
    setFormDescription(policy.description);
    setFormContent(policy.content);
    setFormDocUrl(policy.document_url || '');
    setPolicyModalOpen(true);
  };

  const resetPolicyForm = () => {
    setIsEditingPolicy(false);
    setEditingPolicyId(null);
    setFormTitle('');
    setFormCategory('Anti-Ragging');
    setFormVersion('1.0');
    setFormAudience('all');
    setFormRequiresAck(false);
    setFormEffectiveDate('2026-06-01');
    setFormDescription('');
    setFormContent('');
    setFormDocUrl('');
  };

  // Handle Grievance Status Update
  const handleUpdateGrievanceStatus = async () => {
    if (!selectedGrievance) return;
    if (!adminResponseNotes.trim()) {
      alert('Please provide administrative response or action notes.');
      return;
    }

    try {
      setIsUpdatingGrievance(true);
      const token = await getAuthToken();
      await apiPut(
        `/api/v1/admin/grievances/${selectedGrievance.id}/status`,
        {
          status: updateStatusVal,
          admin_response_notes: adminResponseNotes.trim(),
        },
        token
      );

      setGrievanceModalOpen(false);
      setSelectedGrievance(null);
      setAdminResponseNotes('');
      await loadAdminData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update grievance';
      alert(msg);
    } finally {
      setIsUpdatingGrievance(false);
    }
  };

  // Filtered Policies
  const filteredPolicies = useMemo(() => {
    return policies.filter((p) => {
      if (policyCatFilter !== 'all' && p.category.toLowerCase() !== policyCatFilter.toLowerCase()) {
        return false;
      }
      if (policySearch.trim()) {
        const q = policySearch.toLowerCase();
        if (!p.title.toLowerCase().includes(q) && !p.description.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [policies, policyCatFilter, policySearch]);

  // Filtered Grievances
  const filteredGrievances = useMemo(() => {
    return grievances.filter((g) => {
      if (grievanceStatusFilter !== 'all' && g.status.toLowerCase() !== grievanceStatusFilter.toLowerCase()) {
        return false;
      }
      if (grievanceCatFilter !== 'all' && g.category.toLowerCase() !== grievanceCatFilter.toLowerCase()) {
        return false;
      }
      return true;
    });
  }, [grievances, grievanceStatusFilter, grievanceCatFilter]);

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-sfrc-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sfrc-400/20 text-sfrc-200 text-xs font-semibold tracking-wide border border-sfrc-400/30">
              <Scale className="w-3.5 h-3.5" />
              <span>Administrative Compliance & Statutory Governance</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Institutional Policies & Grievance Cell</h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Manage statutory college policies, review cohort acknowledgement metrics, publish revisions, and investigate student grievance submissions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => {
                resetPolicyForm();
                setPolicyModalOpen(true);
              }}
              className="bg-sfrc-700 hover:bg-sfrc-600 text-white font-semibold text-sm shadow-md transition-all gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              New Policy Charter
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-2">
        <button
          onClick={() => setActiveTab('policies')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'policies'
              ? 'border-sfrc-700 text-sfrc-800 dark:text-sfrc-300'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Policies & Charters</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
            {policies.length}
          </Badge>
        </button>
        <button
          onClick={() => setActiveTab('grievances')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'grievances'
              ? 'border-sfrc-700 text-sfrc-800 dark:text-sfrc-300'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Grievance Repository</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
            {grievances.length}
          </Badge>
        </button>
      </div>

      {activeTab === 'policies' ? (
        /* Policies Management Tab */
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={policySearch}
                onChange={(e) => setPolicySearch(e.target.value)}
                placeholder="Search policies by title or summary keywords..."
                className="pl-9 bg-card shadow-xs"
              />
            </div>
            <div className="w-full sm:w-60">
              <Select value={policyCatFilter} onValueChange={(val) => { if (val) setPolicyCatFilter(val); }}>
                <SelectTrigger className="bg-card">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {POLICY_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Policy Table */}
          <Card className="overflow-hidden border-border shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-muted/60 border-b border-border text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                    <th className="p-3.5 pl-4">Policy Document</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Audience</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Ack Metric</th>
                    <th className="p-3.5">Effective</th>
                    <th className="p-3.5 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredPolicies.map((p) => {
                    const ackCount = p.total_acknowledgements ?? 0;
                    const eligibleCount = p.total_eligible_users ?? 160;
                    const ackPct = Math.round((ackCount / eligibleCount) * 100);

                    return (
                      <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3.5 pl-4">
                          <div className="font-bold text-foreground line-clamp-1">{p.title}</div>
                          <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                            v{p.version} &bull; {p.description}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <Badge variant="outline" className="text-[11px] bg-sfrc-50 dark:bg-sfrc-950 font-semibold">
                            {p.category}
                          </Badge>
                        </td>
                        <td className="p-3.5 capitalize font-medium text-foreground">
                          {p.audience}
                        </td>
                        <td className="p-3.5">
                          {p.status === 'published' ? (
                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 text-[11px] font-semibold">
                              Published
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 text-[11px] font-semibold">
                              Draft
                            </Badge>
                          )}
                        </td>
                        <td className="p-3.5">
                          {p.requires_acknowledgement ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                                <span>{ackCount}/{eligibleCount}</span>
                                <span className="text-[10px] text-muted-foreground">({ackPct}%)</span>
                              </div>
                              <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-sfrc-600 rounded-full"
                                  style={{ width: `${Math.min(100, ackPct)}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">Optional</span>
                          )}
                        </td>
                        <td className="p-3.5 text-muted-foreground font-mono">
                          {p.effective_date}
                        </td>
                        <td className="p-3.5 pr-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {p.status === 'draft' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleQuickPublish(p)}
                                className="h-7 text-[11px] px-2.5 text-emerald-700 hover:bg-emerald-50 border-emerald-300 font-semibold"
                              >
                                Publish
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenEditPolicy(p)}
                              className="h-7 text-[11px] px-2.5"
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : (
        /* Grievances Management Tab */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="w-full sm:w-56">
              <Select value={grievanceStatusFilter} onValueChange={(val) => { if (val) setGrievanceStatusFilter(val); }}>
                <SelectTrigger className="bg-card">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {GRIEVANCE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-56">
              <Select value={grievanceCatFilter} onValueChange={(val) => { if (val) setGrievanceCatFilter(val); }}>
                <SelectTrigger className="bg-card">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {['Academic', 'Infrastructure', 'Administrative', 'Staff', 'Ragging', 'Other'].map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card className="overflow-hidden border-border shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-muted/60 border-b border-border text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                    <th className="p-3.5 pl-4">Token Ref</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Subject & Details</th>
                    <th className="p-3.5">Reporter Identity</th>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 pr-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredGrievances.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        No grievance records found.
                      </td>
                    </tr>
                  ) : (
                    filteredGrievances.map((g) => (
                      <tr key={g.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3.5 pl-4 font-mono font-bold text-sfrc-700 dark:text-sfrc-300">
                          {g.reference}
                        </td>
                        <td className="p-3.5">
                          <Badge variant="outline" className="text-[11px] font-semibold">
                            {g.category}
                          </Badge>
                        </td>
                        <td className="p-3.5 max-w-sm">
                          <div className="font-bold text-foreground">{g.subject}</div>
                          <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                            {g.description}
                          </div>
                          {g.admin_response_notes && (
                            <div className="text-[11px] text-blue-700 dark:text-blue-300 mt-1 font-medium flex items-center gap-1">
                              <MessageSquare className="w-3 h-3 shrink-0" />
                              <span>Response: {g.admin_response_notes}</span>
                            </div>
                          )}
                        </td>
                        <td className="p-3.5">
                          {g.is_anonymous ? (
                            <Badge variant="secondary" className="text-[10px] gap-1">
                              <EyeOff className="w-3 h-3" /> Anonymous
                            </Badge>
                          ) : (
                            <div>
                              <div className="font-semibold text-foreground">{g.reporter_name}</div>
                              <div className="text-[10px] text-muted-foreground">{g.reporter_email}</div>
                            </div>
                          )}
                        </td>
                        <td className="p-3.5 text-muted-foreground">
                          {new Date(g.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-3.5">
                          <Badge
                            className={`text-[11px] font-semibold ${
                              g.status === 'Resolved'
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300'
                                : g.status === 'Under Review'
                                ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-300'
                                : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300'
                            }`}
                          >
                            {g.status}
                          </Badge>
                        </td>
                        <td className="p-3.5 pr-4 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedGrievance(g);
                              setUpdateStatusVal(g.status);
                              setAdminResponseNotes(g.admin_response_notes || '');
                              setGrievanceModalOpen(true);
                            }}
                            className="h-7 text-[11px] px-2.5 font-semibold"
                          >
                            Respond
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Policy Create / Edit Modal */}
      <Dialog open={policyModalOpen} onOpenChange={setPolicyModalOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {isEditingPolicy ? 'Edit Policy Charter' : 'Create Policy Charter'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define statutory compliance details, target audience, and acknowledgement requirements.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-foreground">Policy Title *</label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. Anti-Ragging & Campus Discipline Policy"
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-bold text-foreground">Category *</label>
                <Select value={formCategory} onValueChange={(val) => { if (val) setFormCategory(val); }}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POLICY_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-foreground">Version</label>
                <Input
                  value={formVersion}
                  onChange={(e) => setFormVersion(e.target.value)}
                  placeholder="1.0"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-bold text-foreground">Target Audience</label>
                <Select value={formAudience} onValueChange={(val) => { if (val) setFormAudience(val); }}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stakeholders</SelectItem>
                    <SelectItem value="student">Students Only</SelectItem>
                    <SelectItem value="faculty">Faculty Only</SelectItem>
                    <SelectItem value="parent">Parents Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-foreground">Effective Date</label>
                <Input
                  type="date"
                  value={formEffectiveDate}
                  onChange={(e) => setFormEffectiveDate(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-foreground">Short Summary / Description *</label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Brief summary displayed on policy cards..."
                className="text-xs min-h-[60px]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-foreground">Full Policy Text / Provisions *</label>
              <Textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="Full official statutory policy content..."
                className="text-xs min-h-[120px] font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-foreground">Document Signed PDF URL</label>
              <Input
                value={formDocUrl}
                onChange={(e) => setFormDocUrl(e.target.value)}
                placeholder="https://..."
                className="text-xs"
              />
            </div>

            <div className="p-3.5 rounded-xl bg-muted/40 border border-border flex items-center gap-2.5">
              <input
                type="checkbox"
                id="req-ack-check"
                checked={formRequiresAck}
                onChange={(e) => setFormRequiresAck(e.target.checked)}
                className="rounded text-sfrc-700 focus:ring-sfrc-600"
              />
              <label htmlFor="req-ack-check" className="font-bold text-foreground cursor-pointer">
                Mandatory User Acknowledgement Required
              </label>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isSavingPolicy}
              onClick={() => handleSavePolicy('draft')}
              className="text-xs font-semibold"
            >
              Save as Draft
            </Button>
            <Button
              size="sm"
              disabled={isSavingPolicy}
              onClick={() => handleSavePolicy('published')}
              className="bg-sfrc-700 hover:bg-sfrc-800 text-white font-semibold text-xs"
            >
              {isSavingPolicy ? 'Saving...' : 'Publish Policy'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Grievance Response Modal */}
      <Dialog open={grievanceModalOpen} onOpenChange={setGrievanceModalOpen}>
        <DialogContent className="max-w-md">
          {selectedGrievance && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold text-sfrc-700 dark:text-sfrc-300">
                    {selectedGrievance.reference}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {selectedGrievance.category}
                  </Badge>
                </div>
                <DialogTitle className="text-base font-bold">
                  {selectedGrievance.subject}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Reporter: {selectedGrievance.is_anonymous ? 'Anonymous Student' : selectedGrievance.reporter_name}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 my-2 text-xs">
                <div className="p-3 rounded-lg bg-muted/40 border border-border text-foreground leading-relaxed">
                  {selectedGrievance.description}
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-foreground">Update Grievance Status</label>
                  <Select value={updateStatusVal} onValueChange={(val) => { if (val) setUpdateStatusVal(val); }}>
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GRIEVANCE_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-foreground">Administrative Response / Action Notes *</label>
                  <Textarea
                    value={adminResponseNotes}
                    onChange={(e) => setAdminResponseNotes(e.target.value)}
                    placeholder="Enter formal response or committee resolution remarks..."
                    className="text-xs min-h-[100px]"
                    required
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  size="sm"
                  disabled={isUpdatingGrievance || !adminResponseNotes.trim()}
                  onClick={handleUpdateGrievanceStatus}
                  className="w-full bg-sfrc-700 hover:bg-sfrc-800 text-white font-semibold text-xs"
                >
                  {isUpdatingGrievance ? 'Updating...' : 'Save Official Response'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
