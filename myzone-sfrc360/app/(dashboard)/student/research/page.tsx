'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FlaskConical,
  BookOpen,
  Award,
  Search,
  ExternalLink,
  PlusCircle,
  FileText,
  Sparkles,
  Building,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { apiGet } from '@/lib/api-client';

interface ResearchProject {
  id: string;
  title: string;
  principal_investigator: string;
  department_code: string;
  funding_agency: string;
  project_type: string;
  sanctioned_amount: number;
  start_date: string;
  end_date: string;
  status: string;
  description?: string;
}

interface Publication {
  id: string;
  title: string;
  authors: string[];
  department_code: string;
  journal_name: string;
  indexing: string;
  impact_factor?: number;
  publication_year: number;
  doi_or_url?: string;
  paper_type: string;
}

export default function StudentResearchPage() {
  const [activeTab, setActiveTab] = useState<'projects' | 'publications' | 'grants'>('projects');
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const supabase = useMemo(() => createClient(), []);

  const loadResearchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      const [projRes, pubRes] = await Promise.allSettled([
        apiGet<ResearchProject[]>('/api/v1/research/projects', token),
        apiGet<Publication[]>('/api/v1/research/publications', token),
      ]);

      if (projRes.status === 'fulfilled' && Array.isArray(projRes.value)) {
        setProjects(projRes.value);
      }
      if (pubRes.status === 'fulfilled' && Array.isArray(pubRes.value)) {
        setPublications(pubRes.value);
      }
    } catch (err) {
      console.error('Failed to load research hub:', err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadResearchData();
  }, [loadResearchData]);

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const q = searchQuery.toLowerCase();
    return projects.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.principal_investigator.toLowerCase().includes(q) ||
        p.funding_agency.toLowerCase().includes(q)
    );
  }, [projects, searchQuery]);

  const filteredPublications = useMemo(() => {
    if (!searchQuery.trim()) return publications;
    const q = searchQuery.toLowerCase();
    return publications.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.journal_name.toLowerCase().includes(q) ||
        p.authors.some((a) => a.toLowerCase().includes(q))
    );
  }, [publications, searchQuery]);

  return (
    <div className="space-y-6 pb-12 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-sfrc-800 via-sfrc-900 to-slate-950 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-sfrc-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-medium text-sfrc-200">
              <FlaskConical className="w-3.5 h-3.5 text-amber-300" />
              SFRC Dean of Research & Project Incubation Hub
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Student Research & Innovation Hub</h1>
            <p className="text-sm text-slate-300 max-w-xl">
              Explore funded research opportunities, UGC & DST-SERB student grants, SCOPUS indexed publications, and collaborate with faculty research mentors.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-border bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Active Funded Projects</CardDescription>
            <CardTitle className="text-3xl font-extrabold text-sfrc-800 dark:text-sfrc-300">
              {projects.length} Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">DST-SERB, UGC, TNSCST Grants</div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Scopus / Web of Science Papers</CardDescription>
            <CardTitle className="text-3xl font-extrabold text-emerald-600">
              {publications.length} Publications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">High Impact Factor Research</div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Student Seed Grants</CardDescription>
            <CardTitle className="text-3xl font-extrabold text-amber-600">₹25,000</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">Per approved innovative student project</div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-3">
        <div className="flex border-b sm:border-b-0 border-border">
          <button
            onClick={() => setActiveTab('projects')}
            className={`px-4 py-2 text-xs font-medium transition-colors ${
              activeTab === 'projects'
                ? 'border-b-2 border-sfrc-600 text-sfrc-600 dark:text-sfrc-400 font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Funded Projects ({filteredProjects.length})
          </button>
          <button
            onClick={() => setActiveTab('publications')}
            className={`px-4 py-2 text-xs font-medium transition-colors ${
              activeTab === 'publications'
                ? 'border-b-2 border-sfrc-600 text-sfrc-600 dark:text-sfrc-400 font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Publications & Papers ({filteredPublications.length})
          </button>
          <button
            onClick={() => setActiveTab('grants')}
            className={`px-4 py-2 text-xs font-medium transition-colors ${
              activeTab === 'grants'
                ? 'border-b-2 border-sfrc-600 text-sfrc-600 dark:text-sfrc-400 font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Seed Grants & Guidelines
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search title, PI, journal..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs bg-background h-8"
          />
        </div>
      </div>

      {/* TAB 1: PROJECTS */}
      {activeTab === 'projects' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProjects.map((p) => (
            <Card key={p.id} className="border border-border bg-card flex flex-col justify-between">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    {p.department_code}
                  </Badge>
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 text-xs">
                    {p.status}
                  </Badge>
                </div>
                <CardTitle className="text-sm font-bold pt-1 text-foreground leading-snug">
                  {p.title}
                </CardTitle>
                <CardDescription className="text-xs">
                  PI: <strong>{p.principal_investigator}</strong> • Funding: {p.funding_agency}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-xs space-y-2 pt-0">
                <p className="text-muted-foreground line-clamp-2">{p.description}</p>
                <div className="flex items-center justify-between pt-2 border-t border-border font-medium">
                  <span className="text-muted-foreground">Sanctioned Grant:</span>
                  <span className="text-foreground font-bold font-mono">
                    ₹{p.sanctioned_amount.toLocaleString('en-IN')}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* TAB 2: PUBLICATIONS */}
      {activeTab === 'publications' && (
        <div className="space-y-3">
          {filteredPublications.map((pub) => (
            <Card key={pub.id} className="border border-border bg-card">
              <CardContent className="p-4 space-y-2 text-xs">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="font-bold text-sm text-foreground">{pub.title}</div>
                    <div className="text-muted-foreground">
                      {pub.authors.join(', ')} • <em>{pub.journal_name}</em> ({pub.publication_year})
                    </div>
                  </div>
                  <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-300 text-xs shrink-0">
                    {pub.indexing}
                  </Badge>
                </div>

                {pub.impact_factor && (
                  <div className="text-[11px] text-muted-foreground">
                    Impact Factor: <strong>{pub.impact_factor}</strong> • Paper Type: {pub.paper_type}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* TAB 3: SEED GRANTS */}
      {activeTab === 'grants' && (
        <Card className="border border-border bg-card max-w-3xl">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              SFRC Student Research Seed Fund Scheme (2026-2027)
            </CardTitle>
            <CardDescription className="text-xs">
              Empowering undergraduate and postgraduate women researchers with initial funding support.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-4">
            <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2">
              <div className="font-bold text-foreground text-sm">Eligibility Criteria:</div>
              <div>• UG (Semester 4 & 6) and PG (Semester 2 & 4) full-time students.</div>
              <div>• Minimum 75% attendance and clean academic record without active standing arrears.</div>
              <div>• Project proposal endorsed by a Department Research Guide.</div>
            </div>

            <div className="space-y-2">
              <div className="font-bold text-foreground text-sm">Application Process:</div>
              <div>1. Draft your project synopsis covering Problem Statement, Methodology & Expected Outcome.</div>
              <div>2. Submit proposal via your department HOD to the Dean of Research.</div>
              <div>3. Present project proposal before the Institutional Research Ethics Committee.</div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
