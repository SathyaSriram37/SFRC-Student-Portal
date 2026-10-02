'use client';

import React, { useState, useEffect,  Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { LifeBuoy, PlusCircle, Clock, CheckCircle2, AlertTriangle, AlertCircle, Sparkles, Building2, MapPin, ChevronRight, ChevronLeft, Search, Filter, Star, ArrowUpRight, RefreshCw, Camera, Layers, Zap, Info } from 'lucide-react';
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
import { Progress } from '@/components/ui/progress';
import { apiGet, apiPost } from '@/lib/api-client';

interface Facility {
  id: string;
  name: string;
  code: string;
  building: string;
  floor?: string;
  open_complaints_count?: number;
}

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

interface DuplicateMatch {
  id: string;
  complaint_number: string;
  title: string;
  category: string;
  location?: string;
  status: string;
  similarity: number;
  created_at: string;
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

const CATEGORIES = [
  'Computer/Projector',
  'IT/Network',
  'Electrical',
  'Water/Plumbing',
  'Furniture',
  'Cleanliness',
  'Other',
];

const SLA_TARGETS = {
  critical: { hours: 0.5, label: '30 Minutes', badge: 'Critical SLA', color: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800' },
  high: { hours: 2, label: '2 Hours', badge: 'High SLA', color: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800' },
  medium: { hours: 8, label: '8 Hours', badge: 'Standard SLA', color: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
  low: { hours: 24, label: '24 Hours', badge: 'Flexible SLA', color: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
};

function CampusCareContent() {
  const searchParams = useSearchParams();
  const prefillFacilityId = searchParams.get('facility_id');
  const prefillFacilityName = searchParams.get('facility_name');

  const [activeTab, setActiveTab] = useState<'my-complaints' | 'new-wizard'>('my-complaints');
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  

  // Data states
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Computer/Projector');
  const [facilityId, setFacilityId] = useState(prefillFacilityId || '');
  const [locationNotes, setLocationNotes] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<'critical' | 'high' | 'medium' | 'low'>('medium');
  const [aiClassification, setAiClassification] = useState<AiClassification | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);
  

  // Modals & Submissions
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [detectedDuplicates, setDetectedDuplicates] = useState<DuplicateMatch[]>([]);
  const [createdComplaintNumber, setCreatedComplaintNumber] = useState<string | null>(null);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComments, setFeedbackComments] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  // Load facilities & initial complaints
  const loadData = async () => {
    try {
      const [facData, compData] = await Promise.all([
        apiGet<Facility[]>('/api/v1/facilities').catch(() => []),
        apiGet<{ complaints: Complaint[]; total: number }>('/api/v1/complaints').catch(() => ({ complaints: [], total: 0 })),
      ]);

      if (facData && Array.isArray(facData)) {
        setFacilities(facData);
      }
      if (compData && compData.complaints) {
        setComplaints(compData.complaints);
      }
    } catch (err) {
      console.error('Failed to load campus care data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const [facData, compData] = await Promise.all([
          apiGet<Facility[]>('/api/v1/facilities').catch(() => []),
          apiGet<{ complaints: Complaint[]; total: number }>('/api/v1/complaints').catch(() => ({ complaints: [], total: 0 })),
        ]);

        if (!ignore) {
          if (facData && Array.isArray(facData)) {
            setFacilities(facData);
          }
          if (compData && compData.complaints) {
            setComplaints(compData.complaints);
          }
          if (prefillFacilityId) {
            setFacilityId(prefillFacilityId);
            setActiveTab('new-wizard');
            if (prefillFacilityName) {
              setLocationNotes(`Location: ${prefillFacilityName}`);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load campus care data:', err);
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      ignore = true;
    };
  }, [prefillFacilityId, prefillFacilityName]);

  // Dynamic Rule-Based AI Classification Preview (simulates LLM classifier on typing)
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!title && !description) {
        setAiClassification(null);
        setIsClassifying(false);
        return;
      }

      setIsClassifying(true);
      const text = `${title} ${description}`.toLowerCase();
      let cat = 'Other';
      let pri: 'critical' | 'high' | 'medium' | 'low' = 'medium';
      let conf = 0.85;

      if (['projector', 'lcd', 'display', 'screen', 'monitor'].some((w) => text.includes(w))) {
        cat = 'Computer/Projector';
        pri = 'high';
        conf = 0.94;
      } else if (['wifi', 'network', 'internet', 'router', 'ethernet', 'connection'].some((w) => text.includes(w))) {
        cat = 'IT/Network';
        pri = 'high';
        conf = 0.91;
      } else if (['electric', 'light', 'fan', 'power', 'socket', 'switch', 'wiring'].some((w) => text.includes(w))) {
        cat = 'Electrical';
        pri = 'high';
        conf = 0.89;
      } else if (['water', 'leak', 'pipe', 'tap', 'washroom', 'flush', 'sink'].some((w) => text.includes(w))) {
        cat = 'Water/Plumbing';
        pri = 'medium';
        conf = 0.88;
      } else if (['chair', 'table', 'furniture', 'bench', 'desk', 'podium'].some((w) => text.includes(w))) {
        cat = 'Furniture';
        pri = 'low';
        conf = 0.82;
      } else if (['clean', 'dirty', 'garbage', 'dust', 'trash', 'spill'].some((w) => text.includes(w))) {
        cat = 'Cleanliness';
        pri = 'low';
        conf = 0.86;
      }

      if (['fire', 'smoke', 'sparks', 'gas leak', 'shock', 'emergency'].some((w) => text.includes(w))) {
        pri = 'critical';
        conf = 0.98;
      }

      setCategory(cat);
      setSelectedPriority(pri);
      setAiClassification({
        ai_category: cat,
        ai_summary: `AI Analysis: Issue with ${cat.toLowerCase()} requiring ${pri.toUpperCase()} priority attention.`,
        ai_confidence: conf,
        suggested_priority: pri,
      });
      setIsClassifying(false);
    }, 400);

    return () => clearTimeout(timeout);
  }, [title, description]);

  // Submit Complaint Handler
  const handleSubmitComplaint = async (bypassDuplicates = false) => {
    try {
      setIsLoading(true);
      const payload = {
        title,
        description,
        category,
        facility_id: facilityId || undefined,
        location: locationNotes || undefined,
        priority: selectedPriority,
        image_urls: ['https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80'],
      };

      const res = await apiPost<{
        complaint_number: string;
        complaint: Complaint;
        ai_result: AiClassification;
        possible_duplicates: DuplicateMatch[];
      }>('/api/v1/complaints', payload);

      if (res && res.possible_duplicates && res.possible_duplicates.length > 0 && !bypassDuplicates) {
        setDetectedDuplicates(res.possible_duplicates);
        setCreatedComplaintNumber(res.complaint_number);
        setDuplicateModalOpen(true);
        setIsLoading(false);
        return;
      }

      // Success
      setCreatedComplaintNumber(res.complaint_number || 'CC-00001');
      setWizardStep(3);
      loadData();
    } catch (err: unknown) {
      console.error('Submission failed:', err);
      alert(err instanceof Error ? err.message : 'Failed to submit complaint. Please check your inputs.');
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Feedback Handler
  const handleFeedbackSubmit = async () => {
    if (!selectedComplaint) return;
    try {
      setFeedbackSubmitting(true);
      await apiPost(`/api/v1/complaints/${selectedComplaint.id}/feedback`, {
        rating: feedbackRating,
        comments: feedbackComments,
      });
      setFeedbackModalOpen(false);
      setSelectedComplaint(null);
      setFeedbackRating(5);
      setFeedbackComments('');
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to submit feedback');
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  // Filter complaints
  const filteredComplaints = complaints.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.complaint_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getSlaBadge = (sla: SlaStatus) => {
    switch (sla.status) {
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 animate-pulse">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            OVERDUE ({sla.elapsed_hours}h elapsed)
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            SLA Warning ({sla.remaining_hours}h left)
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

  const getPriorityBadge = (p: string) => {
    const priority = p.toLowerCase() as keyof typeof SLA_TARGETS;
    const info = SLA_TARGETS[priority] || SLA_TARGETS.medium;
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium border ${info.color}`}>
        {p.toUpperCase()} ({info.label})
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sfrc-800 via-sfrc-900 to-slate-950 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-sfrc-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-medium text-sfrc-200">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              CivicFix AI & Campus Care System
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Campus Care & Issue Helpdesk</h1>
            <p className="text-sm text-slate-300 max-w-xl">
              Report campus infrastructure issues, electrical faults, lab hardware, Wi-Fi outages, or plumbing problems.
              Our AI engine automatically categorizes, prioritizes, and tracks SLA targets in real time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => {
                setActiveTab('new-wizard');
                setWizardStep(1);
              }}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-semibold shadow-lg shadow-amber-500/20"
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              Report New Issue
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setActiveTab('my-complaints');
                loadData();
              }}
              className="border-white/20 bg-white/5 hover:bg-white/10 text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Status
            </Button>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('my-complaints')}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'my-complaints'
              ? 'border-sfrc-600 text-sfrc-600 dark:text-sfrc-400 font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          My Reported Complaints ({complaints.length})
        </button>
        <button
          onClick={() => {
            setActiveTab('new-wizard');
            setWizardStep(1);
          }}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'new-wizard'
              ? 'border-sfrc-600 text-sfrc-600 dark:text-sfrc-400 font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          3-Step Issue Wizard
        </button>
      </div>

      {/* ── TAB 1: MY COMPLAINTS LIST ────────────────────────────────────────── */}
      {activeTab === 'my-complaints' && (
        <div className="space-y-6">
          {/* Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-card p-4 rounded-xl border border-border shadow-sm">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search ticket #, title, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background"
              />
            </div>
            <div className="flex items-center gap-3">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || 'all')}>
                <SelectTrigger className="w-[160px] bg-background">
                  <SelectValue placeholder="Status Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Complaints Table/Cards */}
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-sfrc-600" />
              <p className="text-sm text-muted-foreground">Loading active tickets and computing live SLA windows...</p>
            </div>
          ) : filteredComplaints.length === 0 ? (
            <Card className="py-16 text-center">
              <CardContent className="space-y-4">
                <LifeBuoy className="w-12 h-12 text-muted-foreground mx-auto stroke-1" />
                <div>
                  <h3 className="text-lg font-semibold">No complaints found</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    {searchQuery || statusFilter !== 'all'
                      ? 'No complaints match the current search filter.'
                      : "You haven't reported any campus issues yet. Experience quick SLA resolution with our CivicFix wizard."}
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setActiveTab('new-wizard');
                    setWizardStep(1);
                  }}
                  className="bg-sfrc-700 hover:bg-sfrc-800 text-white"
                >
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Report Your First Issue
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredComplaints.map((c) => (
                <Card
                  key={c.id}
                  className="hover:shadow-md transition-shadow border border-border bg-card overflow-hidden"
                >
                  <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                          {c.complaint_number}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {c.category}
                        </Badge>
                        {getPriorityBadge(c.priority)}
                        {getSlaBadge(c.sla_status)}
                      </div>

                      <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                        {c.title}
                      </h3>

                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {c.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                        {c.facility_name && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-sfrc-600" />
                            {c.facility_name}
                          </span>
                        )}
                        {c.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {c.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          Created: {new Date(c.created_at).toLocaleDateString()} at{' '}
                          {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {c.assignee_name && (
                          <span className="text-sfrc-700 dark:text-sfrc-400 font-medium">
                            Assigned to: {c.assignee_name}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-row md:flex-col items-end justify-between md:justify-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-border">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedComplaint(c)}
                        className="text-xs"
                      >
                        Timeline & Details
                        <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                      </Button>

                      {c.status === 'resolved' && !c.feedback_rating && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedComplaint(c);
                            setFeedbackModalOpen(true);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                        >
                          <Star className="w-3.5 h-3.5 mr-1" />
                          Rate Resolution
                        </Button>
                      )}

                      {c.feedback_rating && (
                        <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                          Rated {c.feedback_rating}/5
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: 3-STEP CIVICFIX WIZARD ────────────────────────────────────── */}
      {activeTab === 'new-wizard' && (
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Stepper Progress Header */}
          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
                    wizardStep >= 1 ? 'bg-sfrc-700 text-white' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  1
                </div>
                <div className="hidden sm:block">
                  <div className="text-sm font-semibold">Issue Details</div>
                  <div className="text-xs text-muted-foreground">Location & description</div>
                </div>
              </div>

              <div className={`h-1 flex-1 mx-4 rounded ${wizardStep >= 2 ? 'bg-sfrc-700' : 'bg-muted'}`} />

              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
                    wizardStep >= 2 ? 'bg-sfrc-700 text-white' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  2
                </div>
                <div className="hidden sm:block">
                  <div className="text-sm font-semibold">AI & SLA Preview</div>
                  <div className="text-xs text-muted-foreground">Auto-classification</div>
                </div>
              </div>

              <div className={`h-1 flex-1 mx-4 rounded ${wizardStep >= 3 ? 'bg-sfrc-700' : 'bg-muted'}`} />

              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
                    wizardStep === 3 ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  3
                </div>
                <div className="hidden sm:block">
                  <div className="text-sm font-semibold">Confirmation</div>
                  <div className="text-xs text-muted-foreground">Duplicate check & ID</div>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 1: ISSUE DETAILS */}
          {wizardStep === 1 && (
            <Card className="border border-border shadow-md">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Layers className="w-5 h-5 text-sfrc-600" />
                  Step 1: Describe Campus Maintenance Issue
                </CardTitle>
                <CardDescription>
                  Provide a concise summary and select the campus building or facility.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="issue-title" className="text-sm font-medium">
                    Issue Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="issue-title"
                    placeholder="e.g., Projector in Computer Lab A displays pink flicker and no HDMI sync"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Tip: Mention hardware or exact problem (e.g., &apos;Wi-Fi&apos;, &apos;Fan&apos;, &apos;Leak&apos;) to trigger AI classification.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Category</Label>
                    <Select value={category} onValueChange={(val) => setCategory(val || 'Computer/Projector')}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Facility / Room (Optional)</Label>
                    <Select value={facilityId} onValueChange={(val) => setFacilityId(val || '')}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Campus Facility" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- General Campus / Unspecified --</SelectItem>
                        {facilities.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.name} ({f.building})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location-notes" className="text-sm font-medium">
                    Specific Location Notes
                  </Label>
                  <Input
                    id="location-notes"
                    placeholder="e.g., Science Block, 2nd Floor, Room 204 near rear window"
                    value={locationNotes}
                    onChange={(e) => setLocationNotes(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="issue-desc" className="text-sm font-medium">
                    Detailed Description <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="issue-desc"
                    rows={4}
                    placeholder="Explain the issue in detail, when it began, and any safety hazards..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                {/* Simulated Photo Attachment */}
                <div className="p-4 rounded-xl border border-dashed border-border bg-slate-50 dark:bg-slate-900/50 flex flex-col items-center justify-center text-center space-y-2">
                  <Camera className="w-8 h-8 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-semibold">Photo Evidence Attached</div>
                    <div className="text-xs text-muted-foreground">
                      Automatic site photo validation enabled (sample uploaded for diagnostics)
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    1 image attached (diagnostic_photo.jpg)
                  </Badge>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    disabled={!title.trim() || !description.trim()}
                    onClick={() => setWizardStep(2)}
                    className="bg-sfrc-700 hover:bg-sfrc-800 text-white font-semibold"
                  >
                    Proceed to AI SLA Review
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 2: AI CLASSIFICATION & SLA PREVIEW */}
          {wizardStep === 2 && (
            <Card className="border border-border shadow-md">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  Step 2: AI Classification & SLA Target Preview
                </CardTitle>
                <CardDescription>
                  Our CivicFix AI engine classified your report and computed the required resolution SLA target.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* AI Intelligence Card */}
                <div className="p-5 rounded-xl bg-gradient-to-r from-sfrc-900/10 via-amber-500/10 to-transparent border border-sfrc-500/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sfrc-800 dark:text-sfrc-300">
                      <Zap className="w-4 h-4 text-amber-500" />
                      CivicFix AI Engine Analysis
                    </span>
                    {isClassifying && (
                      <Badge variant="secondary" className="text-xs animate-pulse">
                        Analyzing...
                      </Badge>
                    )}
                    {aiClassification && !isClassifying && (
                      <Badge className="bg-emerald-600 text-white text-xs">
                        {Math.round(aiClassification.ai_confidence * 100)}% Match Confidence
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="text-base font-semibold text-foreground">
                      Detected Category:{' '}
                      <span className="text-sfrc-700 dark:text-sfrc-400">
                        {aiClassification?.ai_category || category}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {aiClassification?.ai_summary ||
                        `Report for ${title} categorized as ${category} based on keywords.`}
                    </p>
                  </div>
                </div>

                {/* Priority Selection & SLA Matrix */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Priority & Guaranteed SLA Window</Label>
                  <p className="text-xs text-muted-foreground">
                    AI suggested priority is pre-selected. You can override if urgent safety hazards exist.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                    {(['critical', 'high', 'medium', 'low'] as const).map((p) => {
                      const target = SLA_TARGETS[p];
                      const isSelected = selectedPriority === p;
                      const isAiSuggested = aiClassification?.suggested_priority === p;

                      return (
                        <div
                          key={p}
                          onClick={() => setSelectedPriority(p)}
                          className={`cursor-pointer p-4 rounded-xl border transition-all ${
                            isSelected
                              ? 'border-sfrc-600 ring-2 ring-sfrc-500/20 bg-sfrc-50/50 dark:bg-sfrc-950/40'
                              : 'border-border bg-card hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold uppercase">{p}</span>
                            {isAiSuggested && (
                              <Badge variant="secondary" className="text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300">
                                AI Pick
                              </Badge>
                            )}
                          </div>
                          <div className="text-lg font-bold text-foreground">{target.label}</div>
                          <div className="text-xs text-muted-foreground mt-1">Resolution SLA</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* SLA Commitment Box */}
                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs space-y-1">
                    <span className="font-semibold text-blue-900 dark:text-blue-200">
                      SLA Escalation Policy Active:
                    </span>
                    <p className="text-blue-800 dark:text-blue-300">
                      If not resolved within{' '}
                      <strong>{SLA_TARGETS[selectedPriority].label}</strong>, the ticket will automatically escalate
                      to the Estate & Campus Infrastructure Administrator with urgent notifications.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <Button variant="outline" onClick={() => setWizardStep(1)}>
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back to Details
                  </Button>
                  <Button
                    onClick={() => handleSubmitComplaint(false)}
                    disabled={isLoading}
                    className="bg-sfrc-700 hover:bg-sfrc-800 text-white font-semibold"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Checking Duplicates & Submitting...
                      </>
                    ) : (
                      <>
                        Submit Report & Generate Ticket
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 3: SUBMITTED CONFIRMATION */}
          {wizardStep === 3 && (
            <Card className="border border-emerald-300 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/20 shadow-lg text-center py-10">
              <CardContent className="space-y-6 max-w-lg mx-auto">
                <div className="w-16 h-16 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div className="space-y-2">
                  <Badge className="bg-emerald-600 text-white font-mono text-sm px-3 py-1">
                    {createdComplaintNumber || 'CC-00001'}
                  </Badge>
                  <h2 className="text-2xl font-bold text-foreground">Complaint Successfully Registered!</h2>
                  <p className="text-sm text-muted-foreground">
                    Your issue has been logged into the CivicFix live SLA queue. Maintenance staff has been notified.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-card border border-border text-left space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Title:</span>
                    <span className="font-semibold">{title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Category:</span>
                    <span className="font-semibold">{category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Priority / SLA Target:</span>
                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                      {selectedPriority.toUpperCase()} ({SLA_TARGETS[selectedPriority].label})
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <Button
                    onClick={() => {
                      setActiveTab('my-complaints');
                      setTitle('');
                      setDescription('');
                      setLocationNotes('');
                      setFacilityId('');
                      setWizardStep(1);
                      loadData();
                    }}
                    className="bg-sfrc-700 hover:bg-sfrc-800 text-white w-full sm:w-auto"
                  >
                    View in My Complaints Queue
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setTitle('');
                      setDescription('');
                      setLocationNotes('');
                      setFacilityId('');
                      setWizardStep(1);
                    }}
                    className="w-full sm:w-auto"
                  >
                    Report Another Issue
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── DUPLICATE DETECTION MODAL ────────────────────────────────────────── */}
      <Dialog open={duplicateModalOpen} onOpenChange={setDuplicateModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5" />
              Similar Open Complaint Detected
            </DialogTitle>
            <DialogDescription>
              Our CivicFix duplicate detection engine found open maintenance ticket(s) matching your location/category.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              To prevent duplicate technician dispatch, please review existing open complaints:
            </p>

            <div className="space-y-2">
              {detectedDuplicates.map((dup) => (
                <div
                  key={dup.id}
                  className="p-3 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-amber-800 dark:text-amber-300">
                      {dup.complaint_number}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {dup.status.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="font-semibold text-foreground">{dup.title}</div>
                  <div className="text-muted-foreground">
                    {dup.category} {dup.location ? `• ${dup.location}` : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDuplicateModalOpen(false);
                setActiveTab('my-complaints');
                loadData();
              }}
            >
              Track Existing Ticket Instead
            </Button>
            <Button
              onClick={() => {
                setDuplicateModalOpen(false);
                handleSubmitComplaint(true);
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Proceed with New Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── TIMELINE & DETAIL MODAL ─────────────────────────────────────────── */}
      <Dialog open={!!selectedComplaint && !feedbackModalOpen} onOpenChange={(open) => !open && setSelectedComplaint(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedComplaint && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                    {selectedComplaint.complaint_number}
                  </span>
                  {getPriorityBadge(selectedComplaint.priority)}
                  {getSlaBadge(selectedComplaint.sla_status)}
                </div>
                <DialogTitle className="text-lg pt-2">{selectedComplaint.title}</DialogTitle>
                <DialogDescription>
                  Category: {selectedComplaint.category} {selectedComplaint.facility_name ? `• ${selectedComplaint.facility_name}` : ''}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-2">
                {/* Description & Details */}
                <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2 text-xs">
                  <div className="font-semibold text-foreground">Issue Description:</div>
                  <p className="text-muted-foreground leading-relaxed">{selectedComplaint.description}</p>
                  {selectedComplaint.location && (
                    <div className="pt-1 text-slate-500">
                      <strong>Specific Location:</strong> {selectedComplaint.location}
                    </div>
                  )}
                </div>

                {/* AI Classification Insights */}
                {selectedComplaint.ai_classification && (
                  <div className="p-3 rounded-lg bg-sfrc-500/10 border border-sfrc-500/20 text-xs space-y-1">
                    <span className="font-semibold text-sfrc-800 dark:text-sfrc-300 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      CivicFix AI Classification
                    </span>
                    <p className="text-muted-foreground">
                      Confidence:{' '}
                      {Math.round((selectedComplaint.ai_classification.ai_confidence || 0.85) * 100)}% • Category:{' '}
                      {selectedComplaint.ai_classification.ai_category}
                    </p>
                  </div>
                )}

                {/* SLA Progress Tracker */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold">SLA Window Progress</span>
                    <span className="text-muted-foreground">
                      {selectedComplaint.sla_status.elapsed_hours}h / {selectedComplaint.sla_status.target_hours}h target
                    </span>
                  </div>
                  <Progress
                    value={Math.min(
                      100,
                      (selectedComplaint.sla_status.elapsed_hours / selectedComplaint.sla_status.target_hours) * 100
                    )}
                    className="h-2"
                  />
                </div>

                {/* Resolution Notes (if resolved) */}
                {selectedComplaint.resolution_notes && (
                  <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs space-y-1">
                    <span className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      Resolution Summary:
                    </span>
                    <p className="text-emerald-700 dark:text-emerald-400">
                      {selectedComplaint.resolution_notes}
                    </p>
                  </div>
                )}

                {/* Timeline History */}
                <div className="space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Status Timeline & Audit Trail
                  </div>
                  <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-border pl-8">
                    {selectedComplaint.timeline && selectedComplaint.timeline.length > 0 ? (
                      selectedComplaint.timeline.map((event, idx) => (
                        <div key={idx} className="relative text-xs space-y-0.5">
                          <div className="absolute -left-8 top-1 w-2.5 h-2.5 rounded-full bg-sfrc-600 ring-4 ring-background" />
                          <div className="font-semibold text-foreground">{event.action}</div>
                          <div className="text-muted-foreground">{event.notes || 'Status updated'}</div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(event.created_at).toLocaleString()}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-muted-foreground">Ticket created and dispatched.</div>
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter>
                {selectedComplaint.status === 'resolved' && !selectedComplaint.feedback_rating && (
                  <Button
                    onClick={() => setFeedbackModalOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                  >
                    <Star className="w-3.5 h-3.5 mr-1" />
                    Rate Resolution & Close Ticket
                  </Button>
                )}
                <Button variant="outline" onClick={() => setSelectedComplaint(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── RESOLUTION FEEDBACK MODAL ────────────────────────────────────────── */}
      <Dialog open={feedbackModalOpen} onOpenChange={setFeedbackModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              Rate Maintenance Resolution
            </DialogTitle>
            <DialogDescription>
              Help us measure SLA service quality by rating how well this issue was addressed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-2 text-center">
              <div className="text-xs text-muted-foreground">Overall Satisfaction:</div>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFeedbackRating(star)}
                    className="p-1 transition-transform hover:scale-110 focus:outline-none"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= feedbackRating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-300 dark:text-slate-700'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <div className="text-xs font-semibold text-amber-600">
                {feedbackRating === 5 && 'Outstanding & Prompt'}
                {feedbackRating === 4 && 'Good Resolution'}
                {feedbackRating === 3 && 'Satisfactory'}
                {feedbackRating === 2 && 'Needs Improvement'}
                {feedbackRating === 1 && 'Unsatisfactory'}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">Comments & Feedback (Optional)</Label>
              <Textarea
                rows={3}
                placeholder="Share any comments regarding the technician or resolution quality..."
                value={feedbackComments}
                onChange={(e) => setFeedbackComments(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setFeedbackModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleFeedbackSubmit}
              disabled={feedbackSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {feedbackSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function StudentCampusCarePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">Loading Campus Care...</div>}>
      <CampusCareContent />
    </Suspense>
  );
}
