'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  MessageSquare,
  Lock,
  EyeOff,
  Send,
  Check,
} from 'lucide-react';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
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
import { apiGet, apiPost } from '@/lib/api-client';
import { createClient } from '@/lib/supabase/client';
import type { GrievanceItem } from '@/lib/types';

const GRIEVANCE_CATEGORIES = [
  'Academic',
  'Infrastructure',
  'Administrative',
  'Staff',
  'Ragging',
  'Other',
];

export default function StudentGrievancePage() {
  const [activeTab, setActiveTab] = useState<'submit' | 'my-grievances'>('submit');
  const [grievances, setGrievances] = useState<GrievanceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [category, setCategory] = useState('Academic');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Success Modal
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

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

  const loadMyGrievances = useCallback(async () => {
    try {
      const token = await getAuthToken();
      const res = await apiGet<{ grievances: GrievanceItem[]; total: number }>(
        '/api/v1/grievances/me',
        token
      );
      if (res?.grievances) {
        setGrievances(res.grievances);
      }
    } catch (err) {
      console.error('Failed to load grievances:', err);
    } finally {
      setIsLoading(false);
    }
  }, [getAuthToken]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      await loadMyGrievances();
    })();
    return () => {
      ignore = true;
    };
  }, [loadMyGrievances]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (subject.trim().length < 3) {
      setFormError('Please enter a descriptive subject (at least 3 characters).');
      return;
    }

    if (description.trim().length < 50) {
      setFormError(
        `Description must be at least 50 characters long (currently ${description.trim().length} characters).`
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const token = await getAuthToken();
      const payload = {
        category,
        subject: subject.trim(),
        description: description.trim(),
        is_anonymous: isAnonymous,
      };

      const res = await apiPost<{
        reference: string;
        id: string;
        message: string;
      }>('/api/v1/grievances', payload, token);

      setSubmittedRef(res.reference || 'GRV-00001');
      setSuccessModalOpen(true);

      // Reset form
      setSubject('');
      setDescription('');
      setIsAnonymous(false);
      await loadMyGrievances();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit grievance';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'received':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 text-xs">
            <Clock className="w-3 h-3 mr-1" />
            Received
          </Badge>
        );
      case 'under review':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300 text-xs">
            <MessageSquare className="w-3 h-3 mr-1" />
            Under Review
          </Badge>
        );
      case 'resolved':
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 text-xs">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Resolved
          </Badge>
        );
      case 'closed':
        return (
          <Badge variant="outline" className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 text-xs">
            Closed
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Header & Back Navigation */}
      <div className="flex items-center gap-3">
        <Link
          href="/student/policies"
          className="w-10 h-10 rounded-2xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-xs"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-emerald-600" />
            Student Grievance Redressal Portal
          </h1>
          <p className="text-xs text-muted-foreground">
            Confidential and statutory grievance registration cell as per UGC & SFRC institutional guidelines.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-2">
        <button
          onClick={() => setActiveTab('submit')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'submit'
              ? 'border-sfrc-700 text-sfrc-800 dark:text-sfrc-300'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Submit Grievance
        </button>
        <button
          onClick={() => setActiveTab('my-grievances')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'my-grievances'
              ? 'border-sfrc-700 text-sfrc-800 dark:text-sfrc-300'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>My Registered Grievances</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
            {grievances.length}
          </Badge>
        </button>
      </div>

      {activeTab === 'submit' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <Card className="p-6 space-y-5 border-border shadow-xs">
              <div>
                <CardTitle className="text-lg font-bold">Lodge Formal Grievance</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Your submission will be routed securely to the Grievance Redressal Committee.
                </CardDescription>
              </div>

              {formError && (
                <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Grievance Category <span className="text-red-500">*</span>
                  </label>
                  <Select value={category} onValueChange={(val) => { if (val) setCategory(val); }}>
                    <SelectTrigger className="w-full bg-card">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {GRIEVANCE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Subject / Summary Title <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Schedule clash between CIA practical and certification exam"
                    className="bg-card"
                    maxLength={150}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-foreground">
                      Detailed Description <span className="text-red-500">*</span>
                    </label>
                    <span
                      className={`text-[11px] font-mono ${
                        description.trim().length >= 50
                          ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {description.trim().length}/50 min characters
                    </span>
                  </div>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Please explain the situation in detail, including dates, locations, departments involved, and your requested resolution..."
                    className="bg-card min-h-[140px] text-xs leading-relaxed"
                    required
                  />
                </div>

                {/* Anonymous Toggle Box */}
                <div className="p-4 rounded-xl bg-muted/40 border border-border flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="anon-checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="mt-1 rounded border-border text-sfrc-700 focus:ring-sfrc-600"
                  />
                  <div className="space-y-0.5">
                    <label htmlFor="anon-checkbox" className="text-xs font-bold text-foreground cursor-pointer flex items-center gap-1.5">
                      <EyeOff className="w-3.5 h-3.5 text-sfrc-600" />
                      Submit Anonymously (Hide Personal Identity)
                    </label>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      If enabled, your name and email will be hidden from administrative review screens. Your reference tracking code remains valid in your portal.
                    </p>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting || description.trim().length < 50 || subject.trim().length < 3}
                  className="w-full bg-sfrc-700 hover:bg-sfrc-800 text-white font-semibold text-xs py-2.5 shadow-sm transition-all gap-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {isSubmitting ? 'Submitting Grievance...' : 'Submit Formal Grievance'}
                </Button>
              </form>
            </Card>
          </div>

          {/* Info Side Panel */}
          <div className="space-y-4">
            <Card className="p-5 border-border space-y-3 bg-gradient-to-br from-card to-muted/30">
              <div className="flex items-center gap-2 text-sfrc-800 dark:text-sfrc-300 font-bold text-sm">
                <Lock className="w-4 h-4" />
                <span>Statutory Confidentiality</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                All submissions are protected under institutional privacy charters. The Grievance Committee acknowledges every complaint within 48 business hours.
              </p>
              <ul className="text-xs space-y-2 text-muted-foreground pt-1 border-t border-border/60">
                <li className="flex items-start gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Transparent status tracking via unique reference token.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Option to redact personal details for anti-ragging or safety concerns.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Formal response and resolution notes from Dean of Student Affairs.</span>
                </li>
              </ul>
            </Card>

            <Card className="p-5 border-border space-y-2">
              <h4 className="text-xs font-bold text-foreground">Urgent Emergency?</h4>
              <p className="text-xs text-muted-foreground">
                For immediate anti-ragging assistance or physical emergency on campus, contact the 24/7 Helpline:
              </p>
              <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs font-bold">
                SFRC Anti-Ragging Helpline: 04562-220389
              </div>
            </Card>
          </div>
        </div>
      ) : (
        /* My Grievances List */
        <div className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Card key={i} className="p-5 animate-pulse space-y-3">
                  <div className="h-5 bg-muted rounded w-1/3" />
                  <div className="h-12 bg-muted rounded w-full" />
                </Card>
              ))}
            </div>
          ) : grievances.length === 0 ? (
            <Card className="p-12 text-center space-y-3 border-border">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="text-base font-bold text-foreground">No Active Grievances</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                You currently have no registered grievances on record.
              </p>
              <Button size="sm" onClick={() => setActiveTab('submit')}>
                Lodge a Grievance
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {grievances.map((g) => (
                <Card key={g.id} className="p-5 border-border space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-sfrc-700 dark:text-sfrc-300 bg-sfrc-50 dark:bg-sfrc-950 px-2.5 py-1 rounded-md border border-sfrc-200 dark:border-sfrc-800">
                        {g.reference}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {g.category}
                      </Badge>
                      {g.is_anonymous && (
                        <Badge variant="secondary" className="text-[10px] gap-1">
                          <EyeOff className="w-3 h-3" /> Anonymous
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        {new Date(g.created_at).toLocaleDateString()}
                      </span>
                      {getStatusBadge(g.status)}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-foreground">{g.subject}</h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {g.description}
                    </p>
                  </div>

                  {g.admin_response_notes && (
                    <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 space-y-1 mt-3">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 dark:text-blue-200">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Administrative Resolution / Response</span>
                      </div>
                      <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                        {g.admin_response_notes}
                      </p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Submission Success Dialog */}
      <Dialog open={successModalOpen} onOpenChange={setSuccessModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader className="text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/60 border border-emerald-300 flex items-center justify-center text-emerald-600 mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <DialogTitle className="text-lg font-bold">Grievance Registered Successfully</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Your formal submission has been recorded in the institutional compliance system.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 rounded-xl bg-muted/50 border border-border text-center space-y-1.5 my-2">
            <p className="text-xs text-muted-foreground font-medium">Tracking Reference Number</p>
            <p className="text-xl font-mono font-bold text-sfrc-800 dark:text-sfrc-200 tracking-wider">
              {submittedRef}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Keep this reference for any direct correspondence with the Grievance Cell.
            </p>
          </div>

          <DialogFooter className="sm:justify-center">
            <Button
              className="bg-sfrc-700 hover:bg-sfrc-800 text-white font-semibold text-xs"
              onClick={() => {
                setSuccessModalOpen(false);
                setActiveTab('my-grievances');
              }}
            >
              View My Grievances
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
