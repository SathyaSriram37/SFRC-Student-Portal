'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';

import { FlaskConical, BookOpen, PlusCircle, Search, ExternalLink, BarChart3 } from 'lucide-react';
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
import { apiGet, apiPost } from '@/lib/api-client';
import { createClient } from '@/lib/supabase/client';
import type { ResearchProject, ResearchPublication } from '@/lib/types';

interface ResearchSummary {
  total_projects: number;
  ongoing_projects: number;
  completed_projects: number;
  total_grants_sanctioned_inr: number;
  total_publications: number;
  department_summary: { department: string; projects: number; grant_amount: number; publications: number }[];
  faculty_leaderboard: { faculty_name: string; department: string; papers: number; top_indexing: string }[];
}

export default function FacultyResearchPage() {
  const [activeTab, setActiveTab] = useState<'projects' | 'publications' | 'analytics'>('projects');
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [publications, setPublications] = useState<ResearchPublication[]>([]);
  const [summaryData, setSummaryData] = useState<ResearchSummary | null>(null);

    const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');

  // Add Project Modal State
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [projTitle, setProjTitle] = useState('');
  const [projPI, setProjPI] = useState('');
  const projCoPI = '';
  const [projDept, setProjDept] = useState('CS');
  const [projAgency, setProjAgency] = useState('DST-SERB');
  const projType = 'Major';
  const [projAmount, setProjAmount] = useState('2500000');
  const [projStartDate, setProjStartDate] = useState('2026-06-01');
  const [projEndDate, setProjEndDate] = useState('2029-05-31');
  const projStatus = 'Ongoing';
  const [projDesc, setProjDesc] = useState('');
  const [isSubmittingProj, setIsSubmittingProj] = useState(false);

  // Add Publication Modal State
  const [pubModalOpen, setPubModalOpen] = useState(false);
  const [pubTitle, setPubTitle] = useState('');
  const [pubAuthors, setPubAuthors] = useState('');
  const pubDept = 'CS';
  const [pubJournal, setPubJournal] = useState('');
  const [pubIndexing, setPubIndexing] = useState('Scopus');
  const [pubImpact, setPubImpact] = useState('4.5');
  const pubYear = '2026';
  const [pubDoi, setPubDoi] = useState('');
  const [isSubmittingPub, setIsSubmittingPub] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  const getAuthToken = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token;
    } catch {
      return undefined;
    }
  }, [supabase]);

  const loadResearchData = useCallback(async () => {
    try {
            const token = await getAuthToken();

      const [projRes, pubRes, sumRes] = await Promise.allSettled([
        apiGet<ResearchProject[]>('/api/v1/research/projects', token),
        apiGet<ResearchPublication[]>('/api/v1/research/publications', token),
        apiGet<ResearchSummary>('/api/v1/research/summary', token),
      ]);

      if (projRes.status === 'fulfilled' && Array.isArray(projRes.value)) {
        setProjects(projRes.value);
      }
      if (pubRes.status === 'fulfilled' && Array.isArray(pubRes.value)) {
        setPublications(pubRes.value);
      }
      if (sumRes.status === 'fulfilled') {
        setSummaryData(sumRes.value);
      }
    } catch (err) {
      console.error('Failed to load research data:', err);
    } finally {
    }
  }, [getAuthToken]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      await loadResearchData();
    })();
    return () => {
      ignore = true;
    };
  }, [loadResearchData]);

  // Submit Project Handler
  const handleCreateProject = async () => {
    if (!projTitle.trim() || !projPI.trim()) {
      alert('Please provide project title and principal investigator.');
      return;
    }

    try {
      setIsSubmittingProj(true);
      const token = await getAuthToken();
      const payload = {
        title: projTitle.trim(),
        principal_investigator: projPI.trim(),
        co_investigator: projCoPI.trim() || undefined,
        department_code: projDept,
        funding_agency: projAgency.trim(),
        project_type: projType,
        sanctioned_amount: parseFloat(projAmount) || 0.0,
        start_date: projStartDate,
        end_date: projEndDate,
        status: projStatus,
        description: projDesc.trim() || undefined,
      };

      await apiPost<ResearchProject>('/api/v1/research/projects', payload, token);
      setProjectModalOpen(false);
      setProjTitle('');
      setProjDesc('');
      loadResearchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to register project';
      alert(msg);
    } finally {
      setIsSubmittingProj(false);
    }
  };

  // Submit Publication Handler
  const handleCreatePublication = async () => {
    if (!pubTitle.trim() || !pubJournal.trim()) {
      alert('Please provide paper title and journal name.');
      return;
    }

    try {
      setIsSubmittingPub(true);
      const token = await getAuthToken();
      const authors = pubAuthors.split(',').map((a) => a.trim()).filter(Boolean);

      const payload = {
        title: pubTitle.trim(),
        authors: authors.length > 0 ? authors : ['Dr. SFRC Faculty'],
        department_code: pubDept,
        journal_name: pubJournal.trim(),
        indexing: pubIndexing,
        impact_factor: parseFloat(pubImpact) || undefined,
        publication_year: parseInt(pubYear, 10) || 2026,
        doi_or_url: pubDoi.trim() || undefined,
        paper_type: 'Journal',
      };

      await apiPost<ResearchPublication>('/api/v1/research/publications', payload, token);
      setPubModalOpen(false);
      setPubTitle('');
      setPubJournal('');
      setPubDoi('');
      loadResearchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to register publication';
      alert(msg);
    } finally {
      setIsSubmittingPub(false);
    }
  };

  // Filtered projects
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (deptFilter !== 'all' && p.department_code !== deptFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.title.toLowerCase().includes(q) ||
          p.principal_investigator.toLowerCase().includes(q) ||
          p.funding_agency.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [projects, deptFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-sfrc-surface pb-16">
      {/* Header Banner */}
      <div className="bg-white border-b border-sfrc-200 py-8 px-6 sm:px-10 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-sfrc-700 uppercase tracking-wider mb-1">
              <FlaskConical className="w-3.5 h-3.5 text-sfrc-700" />
              SFRC Deanery of Research & Development
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-sfrc-900 tracking-tight">
              Research, Grants & Publications
            </h1>
            <p className="text-xs sm:text-sm text-sfrc-600 mt-1">
              Track government & institutional funded research projects, Scopus-indexed papers, and interdisciplinary innovation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPubModalOpen(true)}
              className="rounded-xl text-xs font-bold border-sfrc-200"
            >
              <BookOpen className="w-4 h-4 mr-1.5" /> Add Publication
            </Button>

            <Button
              onClick={() => setProjectModalOpen(true)}
              className="bg-sfrc-700 hover:bg-sfrc-800 text-white rounded-xl text-xs font-bold shadow-sm"
            >
              <PlusCircle className="w-4 h-4 mr-1.5" /> Register Research Project
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-6 space-y-6">
        {/* KPI Counter Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="rounded-3xl border-sfrc-200 bg-white p-5 shadow-2xs">
            <p className="text-xs font-bold text-sfrc-600 uppercase">Total Grants Sanctioned</p>
            <p className="text-2xl font-black text-emerald-700 mt-1">
              ₹{((summaryData?.total_grants_sanctioned_inr || 5100000) / 100000).toFixed(2)} Lakhs
            </p>
            <p className="text-[11px] text-emerald-600 mt-0.5">Govt & institutional seed</p>
          </Card>

          <Card className="rounded-3xl border-sfrc-200 bg-white p-5 shadow-2xs">
            <p className="text-xs font-bold text-sfrc-600 uppercase">Active Research Projects</p>
            <p className="text-2xl font-black text-sfrc-900 mt-1">
              {summaryData?.ongoing_projects || 3}
            </p>
            <p className="text-[11px] text-sfrc-500 mt-0.5">Major & Minor schemes</p>
          </Card>

          <Card className="rounded-3xl border-sfrc-200 bg-white p-5 shadow-2xs">
            <p className="text-xs font-bold text-sfrc-600 uppercase">Indexed Publications</p>
            <p className="text-2xl font-black text-blue-700 mt-1">
              {publications.length}
            </p>
            <p className="text-[11px] text-sfrc-500 mt-0.5">Scopus / Web of Science</p>
          </Card>

          <Card className="rounded-3xl border-sfrc-200 bg-white p-5 shadow-2xs">
            <p className="text-xs font-bold text-sfrc-600 uppercase">Research Scholars</p>
            <p className="text-2xl font-black text-amber-700 mt-1">42</p>
            <p className="text-[11px] text-sfrc-500 mt-0.5">Ph.D & PG Investigators</p>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-sfrc-200 shadow-sm">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('projects')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                activeTab === 'projects'
                  ? 'bg-sfrc-700 text-white shadow-sm'
                  : 'text-sfrc-700 hover:bg-sfrc-100'
              }`}
            >
              <FlaskConical className="w-4 h-4" />
              Funded Projects ({projects.length})
            </button>

            <button
              onClick={() => setActiveTab('publications')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                activeTab === 'publications'
                  ? 'bg-sfrc-700 text-white shadow-sm'
                  : 'text-sfrc-700 hover:bg-sfrc-100'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Faculty Publications ({publications.length})
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                activeTab === 'analytics'
                  ? 'bg-sfrc-700 text-white shadow-sm'
                  : 'text-sfrc-700 hover:bg-sfrc-100'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Leaderboard & Summary
            </button>
          </div>

          {activeTab === 'projects' && (
            <div className="flex items-center gap-3">
              <div className="relative w-56">
                <Search className="w-4 h-4 text-sfrc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="Search project or PI..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs rounded-xl bg-sfrc-50 border-sfrc-200 font-medium"
                />
              </div>

              <Select value={deptFilter} onValueChange={(v) => { if (v) setDeptFilter(v); }}>
                <SelectTrigger className="w-36 h-9 text-xs rounded-xl bg-sfrc-50 border-sfrc-200 font-semibold">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Depts</SelectItem>
                  <SelectItem value="CS" className="text-xs">Computer Science</SelectItem>
                  <SelectItem value="CHEM" className="text-xs">Chemistry</SelectItem>
                  <SelectItem value="PHY" className="text-xs">Physics</SelectItem>
                  <SelectItem value="MATH" className="text-xs">Mathematics</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* TAB 1: Funded Projects */}
        {activeTab === 'projects' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredProjects.map((proj) => (
              <Card
                key={proj.id}
                className="rounded-3xl border-sfrc-200 bg-white p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-4 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sfrc-700 bg-sfrc-100 px-2.5 py-0.5 rounded-md uppercase text-[10px]">
                      {proj.department_code} • {proj.project_type}
                    </span>
                    <Badge
                      className={`text-[10px] font-bold ${
                        proj.status === 'Ongoing'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : 'bg-blue-100 text-blue-800 border-blue-200'
                      }`}
                    >
                      {proj.status}
                    </Badge>
                  </div>

                  <h3 className="text-base font-bold text-sfrc-900 leading-snug">
                    {proj.title}
                  </h3>

                  <div className="p-3.5 rounded-2xl bg-sfrc-50 border border-sfrc-100 space-y-1.5 text-[11px] text-sfrc-700">
                    <p>
                      <span className="font-bold text-sfrc-900">Principal Investigator:</span> {proj.principal_investigator}
                    </p>
                    {proj.co_investigator && (
                      <p>
                        <span className="font-bold text-sfrc-900">Co-Investigator:</span> {proj.co_investigator}
                      </p>
                    )}
                    <p>
                      <span className="font-bold text-sfrc-900">Funding Agency:</span> {proj.funding_agency}
                    </p>
                    <p>
                      <span className="font-bold text-sfrc-900">Sanction Amount:</span>{' '}
                      <span className="font-black text-emerald-700">₹{proj.sanctioned_amount.toLocaleString('en-IN')}</span>
                    </p>
                    <p>
                      <span className="font-bold text-sfrc-900">Tenure:</span> {proj.start_date} to {proj.end_date}
                    </p>
                  </div>

                  {proj.description && (
                    <p className="text-sfrc-600 line-clamp-2 leading-relaxed">
                      {proj.description}
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* TAB 2: Publications */}
        {activeTab === 'publications' && (
          <div className="space-y-4">
            {publications.map((pub) => (
              <Card key={pub.id} className="rounded-3xl border-sfrc-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 text-xs">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="bg-sfrc-700 text-white text-[10px] font-bold">
                        {pub.indexing}
                      </Badge>
                      <span className="font-bold text-sfrc-700 bg-sfrc-100 px-2 py-0.5 rounded text-[10px]">
                        {pub.department_code}
                      </span>
                      <span className="text-sfrc-500 font-medium text-[11px]">Year {pub.publication_year}</span>
                    </div>

                    <h3 className="text-base font-bold text-sfrc-900 leading-snug">
                      {pub.title}
                    </h3>

                    <p className="text-sfrc-700 font-medium">
                      <strong>Authors:</strong> {pub.authors.join(', ')}
                    </p>
                    <p className="text-sfrc-600 italic">
                      {pub.journal_name} {pub.volume_issue_pages ? `(${pub.volume_issue_pages})` : ''}
                    </p>
                  </div>

                  <div className="shrink-0 text-right space-y-2">
                    {pub.impact_factor && (
                      <span className="inline-block px-3 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-bold text-xs">
                        Impact Factor: {pub.impact_factor}
                      </span>
                    )}
                    {pub.doi_or_url && (
                      <div>
                        <a
                          href={pub.doi_or_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-bold text-sfrc-700 hover:text-sfrc-900"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> View DOI / Article
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* TAB 3: Leaderboard & Summary */}
        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Department Grant Chart */}
            <Card className="rounded-3xl border-sfrc-200 bg-white p-6 shadow-sm">
              <CardTitle className="text-base font-bold text-sfrc-900">
                Department Research Grants (in Lakhs)
              </CardTitle>
              <CardDescription className="text-xs text-sfrc-600 mb-4">
                Total grant allocations by academic department
              </CardDescription>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={(summaryData?.department_summary || []).map((d) => ({
                      ...d,
                      grant_lakhs: parseFloat((d.grant_amount / 100000).toFixed(2)),
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="department" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="grant_lakhs" name="Grant (₹ Lakhs)" fill="#5A122D" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Faculty Publication Leaderboard */}
            <Card className="rounded-3xl border-sfrc-200 bg-white p-6 shadow-sm space-y-4">
              <CardTitle className="text-base font-bold text-sfrc-900">
                Faculty Publication Leaderboard
              </CardTitle>
              <CardDescription className="text-xs text-sfrc-600">
                Top research contributors by indexed articles
              </CardDescription>

              <div className="space-y-3">
                {(summaryData?.faculty_leaderboard || []).map((fac, idx) => (
                  <div
                    key={fac.faculty_name}
                    className="p-3.5 rounded-2xl bg-sfrc-50/70 border border-sfrc-100 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-sfrc-700 text-white font-black flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="font-bold text-sfrc-900">{fac.faculty_name}</p>
                        <p className="text-[11px] text-sfrc-500">Dept of {fac.department}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-bold text-sfrc-900 bg-white px-2.5 py-1 rounded-lg border border-sfrc-200">
                        {fac.papers} Papers ({fac.top_indexing})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* MODAL: Register Research Project */}
      <Dialog open={projectModalOpen} onOpenChange={setProjectModalOpen}>
        <DialogContent className="max-w-xl bg-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-sfrc-900">
              Register Funded Research Grant
            </DialogTitle>
            <DialogDescription className="text-xs text-sfrc-600">
              Add major/minor research scheme sanctioned by governmental or corporate funding bodies.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs pt-2">
            <div className="space-y-1">
              <label className="font-bold text-sfrc-800">Project Title *</label>
              <Input
                placeholder="e.g. Nanotechnology in Bio-waste remediation"
                value={projTitle}
                onChange={(e) => setProjTitle(e.target.value)}
                className="rounded-xl text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-sfrc-800">Principal Investigator *</label>
                <Input
                  placeholder="Dr. R. Meenakshi"
                  value={projPI}
                  onChange={(e) => setProjPI(e.target.value)}
                  className="rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-sfrc-800">Department</label>
                <Select value={projDept} onValueChange={(v) => { if (v) setProjDept(v); }}>
                  <SelectTrigger className="rounded-xl text-xs font-semibold">
                    <SelectValue placeholder="Dept" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CS" className="text-xs">Computer Science</SelectItem>
                    <SelectItem value="CHEM" className="text-xs">Chemistry</SelectItem>
                    <SelectItem value="PHY" className="text-xs">Physics</SelectItem>
                    <SelectItem value="MATH" className="text-xs">Mathematics</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-sfrc-800">Funding Agency</label>
                <Input
                  placeholder="DST-SERB, UGC, TNSCST"
                  value={projAgency}
                  onChange={(e) => setProjAgency(e.target.value)}
                  className="rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-sfrc-800">Sanction Amount (INR)</label>
                <Input
                  type="number"
                  placeholder="2500000"
                  value={projAmount}
                  onChange={(e) => setProjAmount(e.target.value)}
                  className="rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-sfrc-800">Start Date</label>
                <Input
                  type="date"
                  value={projStartDate}
                  onChange={(e) => setProjStartDate(e.target.value)}
                  className="rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-sfrc-800">End Date</label>
                <Input
                  type="date"
                  value={projEndDate}
                  onChange={(e) => setProjEndDate(e.target.value)}
                  className="rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-sfrc-800">Research Scope / Abstract</label>
              <Textarea
                placeholder="Brief summary of methodological innovations..."
                value={projDesc}
                onChange={(e) => setProjDesc(e.target.value)}
                rows={2}
                className="rounded-xl text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setProjectModalOpen(false)}
              className="rounded-xl text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              disabled={isSubmittingProj}
              onClick={handleCreateProject}
              className="bg-sfrc-700 hover:bg-sfrc-800 text-white rounded-xl text-xs font-bold"
            >
              {isSubmittingProj ? 'Saving...' : 'Register Project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Add Publication */}
      <Dialog open={pubModalOpen} onOpenChange={setPubModalOpen}>
        <DialogContent className="max-w-xl bg-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-sfrc-900">
              Submit Indexed Research Publication
            </DialogTitle>
            <DialogDescription className="text-xs text-sfrc-600">
              Record peer-reviewed journal articles, conference papers, or book chapters.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs pt-2">
            <div className="space-y-1">
              <label className="font-bold text-sfrc-800">Paper Title *</label>
              <Input
                placeholder="e.g. Deep Learning Approaches for Medical Imaging"
                value={pubTitle}
                onChange={(e) => setPubTitle(e.target.value)}
                className="rounded-xl text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-sfrc-800">Authors (comma-separated)</label>
              <Input
                placeholder="Dr. R. Meenakshi, Dr. S. Kavitha"
                value={pubAuthors}
                onChange={(e) => setPubAuthors(e.target.value)}
                className="rounded-xl text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-sfrc-800">Journal Name *</label>
                <Input
                  placeholder="IEEE Transactions, Elsevier, etc."
                  value={pubJournal}
                  onChange={(e) => setPubJournal(e.target.value)}
                  className="rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-sfrc-800">Indexing</label>
                <Select value={pubIndexing} onValueChange={(v) => { if (v) setPubIndexing(v); }}>
                  <SelectTrigger className="rounded-xl text-xs font-semibold">
                    <SelectValue placeholder="Indexing" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Scopus" className="text-xs">Scopus</SelectItem>
                    <SelectItem value="Web of Science" className="text-xs">Web of Science</SelectItem>
                    <SelectItem value="UGC-CARE" className="text-xs">UGC-CARE</SelectItem>
                    <SelectItem value="IEEE" className="text-xs">IEEE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-sfrc-800">Impact Factor</label>
                <Input
                  placeholder="4.8"
                  value={pubImpact}
                  onChange={(e) => setPubImpact(e.target.value)}
                  className="rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-sfrc-800">DOI / URL</label>
                <Input
                  placeholder="https://doi.org/10.1109/..."
                  value={pubDoi}
                  onChange={(e) => setPubDoi(e.target.value)}
                  className="rounded-xl text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPubModalOpen(false)}
              className="rounded-xl text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              disabled={isSubmittingPub}
              onClick={handleCreatePublication}
              className="bg-sfrc-700 hover:bg-sfrc-800 text-white rounded-xl text-xs font-bold"
            >
              {isSubmittingPub ? 'Submitting...' : 'Save Publication'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
