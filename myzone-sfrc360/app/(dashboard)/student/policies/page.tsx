'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  FileText,
  Search,
  CheckCircle2,
  AlertTriangle,
  Download,
  Scale,
  ArrowRight,
  Info,
  Calendar,
} from 'lucide-react';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { apiGet, apiPost } from '@/lib/api-client';
import { createClient } from '@/lib/supabase/client';
import type { PolicyItem } from '@/lib/types';

const CATEGORIES = [
  'All',
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
];

export default function StudentPoliciesPage() {
  const [policies, setPolicies] = useState<PolicyItem[]>([]);
  const [pendingPolicies, setPendingPolicies] = useState<PolicyItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Policy Detail & Acknowledgement Modal
  const [selectedPolicy, setSelectedPolicy] = useState<PolicyItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [ackChecked, setAckChecked] = useState(false);
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [ackSuccessMsg, setAckSuccessMsg] = useState<string | null>(null);

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

  const loadData = useCallback(async () => {
    try {
      const token = await getAuthToken();
      const [policiesRes, pendingRes] = await Promise.allSettled([
        apiGet<{ policies: PolicyItem[]; total: number }>('/api/v1/policies', token),
        apiGet<{ pending_policies: PolicyItem[]; total_pending: number }>('/api/v1/policies/me/pending', token),
      ]);

      if (policiesRes.status === 'fulfilled' && policiesRes.value?.policies) {
        setPolicies(policiesRes.value.policies);
      }
      if (pendingRes.status === 'fulfilled' && pendingRes.value?.pending_policies) {
        setPendingPolicies(pendingRes.value.pending_policies);
      }
    } catch (err) {
      console.error('Failed to load policies data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [getAuthToken]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      await loadData();
    })();
    return () => {
      ignore = true;
    };
  }, [loadData]);

  // Handle Acknowledgement
  const handleAcknowledge = async (policy: PolicyItem) => {
    try {
      setIsAcknowledging(true);
      const token = await getAuthToken();
      const res = await apiPost<{
        acknowledged: boolean;
        policy_id: string;
        acknowledged_at: string;
        message: string;
      }>(`/api/v1/policies/${policy.id}/acknowledge`, {}, token);

      setAckSuccessMsg(res.message || 'Policy acknowledged successfully.');

      // Update local state
      setPolicies((prev) =>
        prev.map((p) =>
          p.id === policy.id
            ? { ...p, is_acknowledged: true, acknowledged_at: res.acknowledged_at }
            : p
        )
      );

      setPendingPolicies((prev) => prev.filter((p) => p.id !== policy.id));

      if (selectedPolicy && selectedPolicy.id === policy.id) {
        setSelectedPolicy((prev) =>
          prev ? { ...prev, is_acknowledged: true, acknowledged_at: res.acknowledged_at } : null
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to acknowledge policy';
      alert(msg);
    } finally {
      setIsAcknowledging(false);
    }
  };

  const handleOpenDetail = (policy: PolicyItem) => {
    setSelectedPolicy(policy);
    setAckChecked(false);
    setAckSuccessMsg(null);
    setModalOpen(true);
  };

  // Filtered policies
  const filteredPolicies = useMemo(() => {
    return policies.filter((p) => {
      if (selectedCategory !== 'All' && p.category.toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = p.title.toLowerCase().includes(q);
        const matchesCat = p.category.toLowerCase().includes(q);
        const matchesDesc = p.description.toLowerCase().includes(q);
        if (!matchesTitle && !matchesCat && !matchesDesc) return false;
      }
      return true;
    });
  }, [policies, selectedCategory, searchQuery]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sfrc-900 via-slate-900 to-indigo-950 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-sfrc-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sfrc-400/20 text-sfrc-200 text-xs font-semibold tracking-wide border border-sfrc-400/30">
              <Scale className="w-3.5 h-3.5" />
              <span>Statutory Compliance & Institutional Governance</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Policies & Compliance Center</h1>
            <p className="text-sfrc-200 text-sm max-w-2xl leading-relaxed">
              Official institutional charters, examination regulations, statutory guidelines, and student grievance redressal portal for The Standard Fireworks Rajaratnam College for Women.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/student/policies/grievance">
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md transition-all gap-2">
                <ShieldAlert className="w-4 h-4" />
                Submit Grievance
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Pending Acknowledgement Warning Banner */}
      {pendingPolicies.length > 0 && (
        <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/60 border border-amber-300 dark:border-amber-700 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                Action Required: {pendingPolicies.length} {pendingPolicies.length === 1 ? 'Policy Requires' : 'Policies Require'} Your Acknowledgement
              </h3>
              <p className="text-xs text-amber-700 dark:text-amber-300/90 mt-0.5">
                Institutional compliance requires you to review and acknowledge official policy guidelines for this semester.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pendingPolicies.map((p) => (
              <Button
                key={p.id}
                size="sm"
                variant="outline"
                onClick={() => handleOpenDetail(p)}
                className="bg-white dark:bg-slate-900 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 hover:bg-amber-100 text-xs font-semibold"
              >
                Review {p.category}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Search & Category Filter Navigation */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search policies by title, keyword, or compliance requirement..."
              className="pl-9 bg-card shadow-xs"
            />
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  isSelected
                    ? 'bg-sfrc-700 text-white shadow-sm'
                    : 'bg-card text-muted-foreground hover:bg-muted border border-border/60 hover:text-foreground'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Policies Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-5 animate-pulse space-y-3">
              <div className="h-5 bg-muted rounded-md w-3/4" />
              <div className="h-4 bg-muted rounded-md w-1/2" />
              <div className="h-16 bg-muted rounded-md w-full" />
            </Card>
          ))}
        </div>
      ) : filteredPolicies.length === 0 ? (
        <Card className="p-12 text-center space-y-3">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto" />
          <h3 className="text-base font-bold">No Policies Found</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            No compliance policies match your search or selected category filter.
          </p>
          <Button variant="outline" size="sm" onClick={() => { setSelectedCategory('All'); setSearchQuery(''); }}>
            Reset Filters
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPolicies.map((policy) => {
            return (
              <Card
                key={policy.id}
                className="group flex flex-col justify-between p-5 hover:border-sfrc-400/80 transition-all hover:shadow-md cursor-pointer border-border/70"
                onClick={() => handleOpenDetail(policy)}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant="outline" className="bg-sfrc-50 text-sfrc-800 dark:bg-sfrc-950 dark:text-sfrc-300 border-sfrc-200 text-xs font-semibold">
                      {policy.category}
                    </Badge>
                    <Badge variant="secondary" className="text-[11px] font-mono">
                      v{policy.version}
                    </Badge>
                  </div>

                  <div>
                    <CardTitle className="text-base font-bold group-hover:text-sfrc-700 dark:group-hover:text-sfrc-400 transition-colors line-clamp-2 leading-snug">
                      {policy.title}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Effective: {policy.effective_date}</span>
                    </div>
                  </div>

                  <CardDescription className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                    {policy.description}
                  </CardDescription>
                </div>

                <div className="pt-4 border-t border-border/60 mt-4 flex items-center justify-between">
                  <div>
                    {policy.is_acknowledged ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                        Acknowledged
                      </span>
                    ) : policy.requires_acknowledgement ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="w-4 h-4" />
                        Requires Ack
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Info className="w-3.5 h-3.5" />
                        Reference Only
                      </span>
                    )}
                  </div>

                  <span className="inline-flex items-center text-xs font-semibold text-sfrc-700 dark:text-sfrc-300 group-hover:translate-x-1 transition-transform">
                    View <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Policy Detail & Acknowledgement Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedPolicy && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-sfrc-100 text-sfrc-800 dark:bg-sfrc-900 dark:text-sfrc-200 border-sfrc-200 text-xs font-semibold">
                    {selectedPolicy.category}
                  </Badge>
                  <Badge variant="outline" className="font-mono text-xs">
                    Version {selectedPolicy.version}
                  </Badge>
                  <span className="text-xs text-muted-foreground ml-auto">
                    Effective: {selectedPolicy.effective_date}
                  </span>
                </div>
                <DialogTitle className="text-xl font-bold text-foreground leading-tight">
                  {selectedPolicy.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Audience: <span className="font-semibold capitalize">{selectedPolicy.audience}</span> &bull; Statutory Code: {selectedPolicy.id.toUpperCase()}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 my-2 text-sm">
                {/* Summary Box */}
                <div className="p-3.5 rounded-xl bg-sfrc-50 dark:bg-slate-900/60 border border-sfrc-200 dark:border-slate-800 text-xs text-sfrc-900 dark:text-sfrc-200 leading-relaxed font-medium">
                  {selectedPolicy.description}
                </div>

                {/* Policy Document Content */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Policy Provisions & Terms
                  </h4>
                  <div className="p-4 rounded-xl bg-muted/40 border border-border text-xs leading-relaxed text-foreground whitespace-pre-wrap font-mono">
                    {selectedPolicy.content}
                  </div>
                </div>

                {/* Download PDF button */}
                {selectedPolicy.document_url && (
                  <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
                    <div className="flex items-center gap-2.5 text-xs font-semibold text-foreground">
                      <FileText className="w-4 h-4 text-sfrc-700 dark:text-sfrc-400" />
                      <span>Official Signed Policy PDF Document</span>
                    </div>
                    <a
                      href={selectedPolicy.document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-sfrc-100 hover:bg-sfrc-200 dark:bg-sfrc-900 dark:hover:bg-sfrc-800 text-sfrc-800 dark:text-sfrc-200 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download PDF
                    </a>
                  </div>
                )}

                {/* Acknowledgement Status or Form */}
                <div className="pt-3 border-t border-border space-y-3">
                  {ackSuccessMsg && (
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                      <span>{ackSuccessMsg}</span>
                    </div>
                  )}

                  {selectedPolicy.is_acknowledged ? (
                    <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                          Policy Acknowledged
                        </p>
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                          Acknowledged on {selectedPolicy.acknowledged_at ? new Date(selectedPolicy.acknowledged_at).toLocaleDateString() : 'Record'} for v{selectedPolicy.version}
                        </p>
                      </div>
                    </div>
                  ) : selectedPolicy.requires_acknowledgement ? (
                    <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-3">
                      <div className="flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          id="ack-checkbox"
                          checked={ackChecked}
                          onChange={(e) => setAckChecked(e.target.checked)}
                          className="mt-0.5 rounded border-amber-400 text-sfrc-700 focus:ring-sfrc-600"
                        />
                        <label htmlFor="ack-checkbox" className="text-xs text-amber-900 dark:text-amber-200 cursor-pointer font-medium leading-relaxed">
                          I hereby confirm that I have read, understood, and agreed to adhere strictly to all provisions and statutory standards of the <span className="font-bold">{selectedPolicy.title}</span> (v{selectedPolicy.version}).
                        </label>
                      </div>

                      <Button
                        disabled={!ackChecked || isAcknowledging}
                        onClick={() => handleAcknowledge(selectedPolicy)}
                        className="w-full bg-sfrc-700 hover:bg-sfrc-800 text-white font-semibold text-xs py-2 shadow-xs transition-all gap-2 disabled:opacity-50"
                      >
                        {isAcknowledging ? 'Recording Acknowledgement...' : 'Acknowledge Policy'}
                      </Button>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground flex items-center gap-2">
                      <Info className="w-4 h-4 shrink-0" />
                      <span>This institutional document is published for reference and operational adherence. Formal digital signature is optional.</span>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="sm:justify-end">
                <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
