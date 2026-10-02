'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Database,
  RefreshCw,
  PlusCircle,
  FileText,
  Globe,
  Layers,
  Sparkles,
  CheckCircle2,
  Clock,
  ExternalLink,
  Shield,
  Loader2,
  Activity,
  Search,
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { apiGet, apiPost } from '@/lib/api-client';
import type { KnowledgeSourceItem, RagJobItem } from '@/lib/types';
import { cn } from '@/lib/utils';

const RAG_CATEGORIES = [
  'general',
  'library',
  'examination',
  'hostel',
  'academics',
  'compliance',
  'facilities',
];

export default function AdminRagPage() {
  const [sources, setSources] = useState<KnowledgeSourceItem[]>([]);
  const [jobs, setJobs] = useState<RagJobItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Add Source Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('manual');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState('general');
  const [department, setDepartment] = useState('General');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reindexingId, setReindexingId] = useState<string | null>(null);

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

  const loadRagData = useCallback(async () => {
    try {
      const token = await getAuthToken();
      const [sourcesRes, jobsRes] = await Promise.allSettled([
        apiGet<KnowledgeSourceItem[]>('/api/v1/admin/rag/sources', token),
        apiGet<RagJobItem[]>('/api/v1/admin/rag/jobs', token),
      ]);

      if (sourcesRes.status === 'fulfilled' && Array.isArray(sourcesRes.value)) {
        setSources(sourcesRes.value);
      }
      if (jobsRes.status === 'fulfilled' && Array.isArray(jobsRes.value)) {
        setJobs(jobsRes.value);
      }
    } catch (err) {
      console.error('Failed to fetch RAG knowledge sources:', err);
    } finally {
      setIsLoading(false);
    }
  }, [getAuthToken]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      await loadRagData();
    })();
    return () => {
      ignore = true;
    };
  }, [loadRagData]);

  // Handle Add Source
  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert('Please provide a source title and content to ingest.');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await getAuthToken();
      await apiPost(
        '/api/v1/admin/rag/sources',
        {
          title: title.trim(),
          type,
          url: url.trim() || undefined,
          category,
          department: department.trim() || undefined,
          content: content.trim(),
        },
        token
      );

      // Reset form & reload
      setTitle('');
      setUrl('');
      setContent('');
      setCategory('general');
      setDepartment('General');
      setAddModalOpen(false);
      await loadRagData();
    } catch (err) {
      console.error('Error adding knowledge source:', err);
      alert('Failed to add and ingest knowledge source.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Re-index trigger
  const handleReindex = async (sourceId: string) => {
    setReindexingId(sourceId);
    try {
      const token = await getAuthToken();
      await apiPost(`/api/v1/admin/rag/ingest/${sourceId}`, {}, token);
      await loadRagData();
    } catch (err) {
      console.error('Re-indexing failed:', err);
      alert('Re-indexing trigger encountered an error.');
    } finally {
      setReindexingId(null);
    }
  };

  // Filtered Sources
  const filteredSources = useMemo(() => {
    return sources.filter((s) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.department && s.department.toLowerCase().includes(searchQuery.toLowerCase())) ||
        s.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = categoryFilter === 'all' || s.category.toLowerCase() === categoryFilter.toLowerCase();
      return matchesSearch && matchesCat;
    });
  }, [sources, searchQuery, categoryFilter]);

  const totalChunks = useMemo(() => {
    return sources.reduce((acc, s) => acc + (s.chunks_count || 0), 0);
  }, [sources]);

  return (
    <AppShell role="admin" userName="System Administrator">
      <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
        {/* Header Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-3xl border border-border shadow-xs">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sfrc-100 text-sfrc-700 dark:bg-sfrc-950 dark:text-sfrc-300 text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5 text-sfrc-accent animate-pulse" />
              Pragya Knowledge Engine
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              RAG Knowledge Pipeline & Sources
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Manage institutional vectors, dynamic text chunking, and knowledge retrieval for Pragya AI 360.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => loadRagData()}
              variant="outline"
              size="sm"
              className="gap-2 text-xs font-bold"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
              Sync Pipeline
            </Button>
            <Button
              onClick={() => setAddModalOpen(true)}
              size="sm"
              className="bg-sfrc-700 hover:bg-sfrc-800 text-white gap-2 text-xs font-bold shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              Add Knowledge Source
            </Button>
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5 border-border shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Knowledge Sources
                </p>
                <p className="text-2xl font-black text-foreground mt-1">{sources.length}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-sfrc-100 dark:bg-sfrc-900/60 text-sfrc-700 dark:text-sfrc-300 flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 text-[11px] text-muted-foreground flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Active Institutional Context
            </div>
          </Card>

          <Card className="p-5 border-border shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Vector Chunks
                </p>
                <p className="text-2xl font-black text-foreground mt-1">{totalChunks}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 text-[11px] text-muted-foreground flex items-center gap-1.5">
              <span>Overlap: 50 tokens | Max: 500 tokens</span>
            </div>
          </Card>

          <Card className="p-5 border-border shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Ingestion Jobs
                </p>
                <p className="text-2xl font-black text-foreground mt-1">{jobs.length}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                <Activity className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 text-[11px] text-muted-foreground flex items-center gap-1.5">
              <span>Last: {jobs[0]?.started_at ? new Date(jobs[0].started_at).toLocaleDateString() : 'N/A'}</span>
            </div>
          </Card>

          <Card className="p-5 border-border shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Vector Engine
                </p>
                <p className="text-2xl font-black text-foreground mt-1">pgvector / Cosine</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Graceful No-Key Fallback Online
            </div>
          </Card>
        </div>

        {/* Sources Section & Search Filters */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search knowledge sources by title, department, content..."
                className="pl-9 bg-card shadow-xs text-xs"
              />
            </div>
            <div className="w-full sm:w-56">
              <Select value={categoryFilter} onValueChange={(val) => { if (val) setCategoryFilter(val); }}>
                <SelectTrigger className="bg-card text-xs">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {RAG_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Sources Table */}
          <Card className="overflow-hidden border-border shadow-xs">
            <div className="p-4 bg-muted/30 border-b border-border flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold">Knowledge Sources Catalog</CardTitle>
                <CardDescription className="text-xs">
                  Showing {filteredSources.length} institutional source documents
                </CardDescription>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground font-bold">
                    <th className="p-3.5 pl-4">Title & Details</th>
                    <th className="p-3.5">Type</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Department</th>
                    <th className="p-3.5">Chunks</th>
                    <th className="p-3.5">Last Indexed</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right pr-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredSources.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-muted-foreground">
                        No knowledge sources found matching current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredSources.map((src) => (
                      <tr key={src.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3.5 pl-4 max-w-xs">
                          <p className="font-bold text-foreground truncate">{src.title}</p>
                          {src.url && (
                            <a
                              href={`https://${src.url.replace(/^https?:\/\//, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-sfrc-700 dark:text-sfrc-300 hover:underline inline-flex items-center gap-1 mt-0.5"
                            >
                              <span>{src.url}</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5 line-clamp-1">
                            {src.content}
                          </p>
                        </td>
                        <td className="p-3.5">
                          <Badge variant="outline" className="text-[10px] uppercase font-bold flex items-center gap-1 w-fit">
                            {src.type === 'url' ? <Globe className="w-2.5 h-2.5 text-blue-500" /> : <FileText className="w-2.5 h-2.5 text-amber-500" />}
                            {src.type}
                          </Badge>
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-md bg-muted text-foreground font-semibold text-[11px] uppercase">
                            {src.category}
                          </span>
                        </td>
                        <td className="p-3.5 text-muted-foreground font-medium">
                          {src.department || 'General'}
                        </td>
                        <td className="p-3.5 font-bold text-foreground">
                          {src.chunks_count} {src.chunks_count === 1 ? 'chunk' : 'chunks'}
                        </td>
                        <td className="p-3.5 text-muted-foreground">
                          {src.last_indexed_at ? new Date(src.last_indexed_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Never'}
                        </td>
                        <td className="p-3.5">
                          <Badge
                            className={cn(
                              'text-[10px] font-bold',
                              src.status === 'Indexed'
                                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                                : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                            )}
                          >
                            {src.status}
                          </Badge>
                        </td>
                        <td className="p-3.5 text-right pr-4">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={reindexingId === src.id}
                            onClick={() => handleReindex(src.id)}
                            className="text-xs h-7 gap-1 font-semibold"
                          >
                            <RefreshCw className={cn('w-3 h-3', reindexingId === src.id && 'animate-spin')} />
                            {reindexingId === src.id ? 'Indexing...' : 'Re-index'}
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

        {/* Ingestion Job History */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-sfrc-700 dark:text-sfrc-300" />
            <h2 className="text-base font-bold text-foreground">Ingestion Pipeline Job History</h2>
          </div>

          <Card className="overflow-hidden border-border shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground font-bold">
                    <th className="p-3.5 pl-4">Job ID</th>
                    <th className="p-3.5">Knowledge Source</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Chunks Processed</th>
                    <th className="p-3.5">Started At</th>
                    <th className="p-3.5 pr-4">Completed At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {jobs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-muted-foreground">
                        No previous ingestion jobs recorded.
                      </td>
                    </tr>
                  ) : (
                    jobs.map((job) => (
                      <tr key={job.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3.5 pl-4 font-mono text-[11px] text-muted-foreground font-semibold">
                          {job.id}
                        </td>
                        <td className="p-3.5 font-bold text-foreground">
                          {job.source_title}
                        </td>
                        <td className="p-3.5">
                          <Badge
                            className={cn(
                              'text-[10px] font-bold',
                              job.status === 'Completed'
                                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                                : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                            )}
                          >
                            {job.status}
                          </Badge>
                        </td>
                        <td className="p-3.5 font-bold text-foreground">
                          {job.chunks} chunks
                        </td>
                        <td className="p-3.5 text-muted-foreground">
                          {new Date(job.started_at).toLocaleString()}
                        </td>
                        <td className="p-3.5 pr-4 text-muted-foreground">
                          {job.completed_at ? new Date(job.completed_at).toLocaleString() : 'In Progress'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Add Knowledge Source Dialog Modal */}
        <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Database className="w-5 h-5 text-sfrc-700 dark:text-sfrc-300" />
                Add & Ingest Knowledge Source
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Feed official manuals, syllabus guides, rules, and circulars into the Pragya RAG index.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAddSource} className="space-y-4 my-2 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-foreground">Source Document Title *</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. SFRC Examination Hall Ticket & Evaluation Regulations 2026"
                  required
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-foreground">Source Type</label>
                  <Select value={type} onValueChange={(val) => { if (val) setType(val); }}>
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual Document Text</SelectItem>
                      <SelectItem value="url">Web URL Crawler</SelectItem>
                      <SelectItem value="file">Official PDF / Policy File</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-foreground">Category</label>
                  <Select value={category} onValueChange={(val) => { if (val) setCategory(val); }}>
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RAG_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-foreground">Managing Department</label>
                  <Input
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Controller of Examinations"
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-foreground">Web URL (If applicable)</label>
                  <Input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="sfrcollege.edu.in/..."
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-foreground">Official Content & Policy Text *</label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste statutory rules, guidelines, schedules, or knowledge text for vectorization..."
                  required
                  className="text-xs min-h-[140px] font-mono leading-relaxed"
                />
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSubmitting}
                  onClick={() => setAddModalOpen(false)}
                  className="text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="bg-sfrc-700 hover:bg-sfrc-800 text-white font-semibold text-xs gap-1.5"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isSubmitting ? 'Chunking & Vectorizing...' : 'Save & Ingest Chunks'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
