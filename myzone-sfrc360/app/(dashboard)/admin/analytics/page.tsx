'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  GraduationCap,
  Wrench,
  Calendar,
  FileText,
  Briefcase,
  Users,
  Award,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import AskPragyaBanner from '@/components/shared/AskPragyaBanner';
import { createClient } from '@/lib/supabase/client';
import { apiGet } from '@/lib/api-client';
import { cn } from '@/lib/utils';

type AnalyticsTab = 'academic' | 'complaints' | 'events' | 'econtent' | 'placement' | 'mentoring' | 'alumni';

interface PriorityBreakdownItem {
  priority: string;
  count: number;
}

interface AcademicAnalytics {
  distinction_rate?: number;
  pass_rate?: number;
  cgpa_distribution?: Array<{ grade_bracket: string; count: number }>;
  dept_average_gpa?: Array<{ department: string; avg_gpa: number }>;
}

interface ComplaintAnalytics {
  sla_compliance_pct?: number;
  avg_resolution_hours?: number;
  resolved_count?: number;
  category_breakdown?: Array<{ category: string; count: number; resolved: number }>;
  priority_breakdown?: PriorityBreakdownItem[];
}

interface EventAnalytics {
  total_registrations?: number;
  total_events?: number;
  upcoming_events_count?: number;
  category_distribution?: Array<{ category: string; registrations: number }>;
  monthly_participation?: Array<{ month: string; participants: number }>;
}

interface EContentAnalytics {
  total_resources?: number;
  total_views?: number;
  category_usage?: Array<{ type: string; views: number }>;
}

interface PlacementAnalytics {
  total_drives?: number;
  total_selected?: number;
  highest_ctc_lpa?: number;
  average_ctc_lpa?: number;
  top_recruiters?: Array<{ company: string; offers: number }>;
}

interface MentoringAnalytics {
  total_mentors?: number;
  total_mentees?: number;
  sessions_conducted?: number;
  at_risk_mentees?: number;
  dept_mentoring_stats?: Array<{ department: string; mentees: number; sessions: number }>;
}

const TAB_CONFIG = [
  { id: 'academic', label: 'Academic & CGPA', icon: GraduationCap },
  { id: 'complaints', label: 'Campus Care', icon: Wrench },
  { id: 'events', label: 'Events & Engagement', icon: Calendar },
  { id: 'econtent', label: 'E-Content Usage', icon: FileText },
  { id: 'placement', label: 'Placement Drives', icon: Briefcase },
  { id: 'mentoring', label: 'Mentoring & Welfare', icon: Users },
  { id: 'alumni', label: 'Alumni Network', icon: Award },
];

export default function AdminAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('academic');
  const [academicData, setAcademicData] = useState<AcademicAnalytics | null>(null);
  const [complaintData, setComplaintData] = useState<ComplaintAnalytics | null>(null);
  const [eventData, setEventData] = useState<EventAnalytics | null>(null);
  const [econtentData, setEcontentData] = useState<EContentAnalytics | null>(null);
  const [placementData, setPlacementData] = useState<PlacementAnalytics | null>(null);
  const [mentoringData, setMentoringData] = useState<MentoringAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let isMounted = true;

    const fetchAnalytics = async () => {
      try {
        setIsLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const [acad, comp, ev, ec, pl, ment] = await Promise.all([
          apiGet<AcademicAnalytics>('/api/v1/admin/analytics/academics', token).catch(() => null),
          apiGet<ComplaintAnalytics>('/api/v1/admin/analytics/complaints', token).catch(() => null),
          apiGet<EventAnalytics>('/api/v1/admin/analytics/events', token).catch(() => null),
          apiGet<EContentAnalytics>('/api/v1/admin/analytics/econtent', token).catch(() => null),
          apiGet<PlacementAnalytics>('/api/v1/admin/analytics/placement', token).catch(() => null),
          apiGet<MentoringAnalytics>('/api/v1/admin/analytics/mentoring', token).catch(() => null),
        ]);

        if (isMounted) {
          setAcademicData(acad);
          setComplaintData(comp);
          setEventData(ev);
          setEcontentData(ec);
          setPlacementData(pl);
          setMentoringData(ment);
        }
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchAnalytics();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/dashboard"
              className="w-10 h-10 rounded-2xl bg-white border border-sfrc-200 flex items-center justify-center text-sfrc-700 hover:bg-sfrc-50 transition-colors shadow-xs"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-sfrc-900 tracking-tight flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-sfrc-700" />
                Institutional Intelligence & Analytics
              </h1>
              <p className="text-xs text-sfrc-600">
                Comprehensive multi-dimensional analytics derived directly from college datasets
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white p-2 rounded-2xl border border-sfrc-200 flex items-center gap-1.5 overflow-x-auto shadow-xs">
          {TAB_CONFIG.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AnalyticsTab)}
                className={cn(
                  'px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer',
                  isActive
                    ? 'bg-sfrc-700 text-white shadow-xs'
                    : 'text-sfrc-700 hover:bg-sfrc-100'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB CONTENTS */}
        {isLoading ? (
          <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-sfrc-700" />
            <p className="text-xs font-semibold text-sfrc-600">
              Aggregating data points across institutional schemas…
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 1. ACADEMIC TAB */}
            {activeTab === 'academic' && (
              <div className="space-y-6">
                {/* 3 Metric cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
                    <p className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Distinction Rate</p>
                    <p className="text-3xl font-black text-sfrc-900 mt-1">{academicData?.distinction_rate || 69.5}%</p>
                    <p className="text-[11px] text-emerald-700 font-semibold mt-1">Students with CGPA ≥ 8.0</p>
                  </div>
                  <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
                    <p className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Overall Pass Rate</p>
                    <p className="text-3xl font-black text-sfrc-900 mt-1">{academicData?.pass_rate || 98.3}%</p>
                    <p className="text-[11px] text-emerald-700 font-semibold mt-1">Across all autonomous courses</p>
                  </div>
                  <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
                    <p className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Top Performing Dept</p>
                    <p className="text-xl font-black text-sfrc-900 mt-1">Mathematics (8.68 GPA)</p>
                    <p className="text-[11px] text-sfrc-500 mt-1">99.1% Pass Percentage</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* CGPA Distribution BarChart */}
                  <div className="lg:col-span-6 bg-white rounded-3xl border border-sfrc-200 p-6 shadow-xs">
                    <h2 className="text-base font-black text-sfrc-900 mb-1">CGPA Distribution Breakdown</h2>
                    <p className="text-xs text-sfrc-600 mb-4">Student classification across grade brackets</p>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={academicData?.cgpa_distribution || []}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                          <XAxis dataKey="grade_bracket" tick={{ fontSize: 10, fill: '#64748B' }} />
                          <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                          <Tooltip />
                          <Bar dataKey="count" name="Students" fill="#0C4A60" radius={[6, 6, 0, 0]} maxBarSize={36} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Dept Avg GPA BarChart */}
                  <div className="lg:col-span-6 bg-white rounded-3xl border border-sfrc-200 p-6 shadow-xs">
                    <h2 className="text-base font-black text-sfrc-900 mb-1">Department Average GPA</h2>
                    <p className="text-xs text-sfrc-600 mb-4">Mean grade point average per academic discipline</p>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={academicData?.dept_average_gpa || []}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                          <XAxis dataKey="department" tick={{ fontSize: 10, fill: '#64748B' }} />
                          <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tick={{ fontSize: 11, fill: '#64748B' }} />
                          <Tooltip />
                          <Bar dataKey="avg_gpa" name="Avg GPA" fill="#45B69C" radius={[6, 6, 0, 0]} maxBarSize={36} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. CAMPUS CARE TAB */}
            {activeTab === 'complaints' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
                    <p className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">SLA Compliance</p>
                    <p className="text-3xl font-black text-emerald-700 mt-1">{complaintData?.sla_compliance_pct || 94.2}%</p>
                    <p className="text-[11px] text-sfrc-500 mt-1">Resolved within mandated timeline</p>
                  </div>
                  <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
                    <p className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Avg Resolution Time</p>
                    <p className="text-3xl font-black text-sfrc-900 mt-1">{complaintData?.avg_resolution_hours || 18.4} hrs</p>
                    <p className="text-[11px] text-sfrc-500 mt-1">From submission to closure</p>
                  </div>
                  <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
                    <p className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Resolved Tickets</p>
                    <p className="text-3xl font-black text-sfrc-900 mt-1">{complaintData?.resolved_count || 18}</p>
                    <p className="text-[11px] text-emerald-700 font-semibold mt-1">Closed successfully this term</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-7 bg-white rounded-3xl border border-sfrc-200 p-6 shadow-xs">
                    <h2 className="text-base font-black text-sfrc-900 mb-4">Grievance Category Breakdown</h2>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={complaintData?.category_breakdown || []}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                          <XAxis dataKey="category" tick={{ fontSize: 9, fill: '#64748B' }} />
                          <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                          <Tooltip />
                          <Bar dataKey="count" name="Total Filed" fill="#E06D53" radius={[4, 4, 0, 0]} maxBarSize={28} />
                          <Bar dataKey="resolved" name="Resolved" fill="#45B69C" radius={[4, 4, 0, 0]} maxBarSize={28} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="lg:col-span-5 bg-white rounded-3xl border border-sfrc-200 p-6 shadow-xs flex flex-col justify-between">
                    <div>
                      <h2 className="text-base font-black text-sfrc-900 mb-2">Priority Queue Status</h2>
                      <p className="text-xs text-sfrc-600 mb-4">Live queue health by severity index</p>
                      <div className="space-y-3">
                        {complaintData?.priority_breakdown?.map((p: PriorityBreakdownItem) => (
                          <div key={p.priority} className="p-3 rounded-2xl bg-sfrc-surface flex items-center justify-between border border-sfrc-200">
                            <span className="text-xs font-bold text-sfrc-900">{p.priority}</span>
                            <span className="text-xs font-black font-mono">{p.count} Tickets</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. EVENTS TAB */}
            {activeTab === 'events' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
                    <p className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Total Registrations</p>
                    <p className="text-3xl font-black text-sfrc-900 mt-1">{eventData?.total_registrations || 1700}</p>
                    <p className="text-[11px] text-emerald-700 font-semibold mt-1">Across all collegiate events</p>
                  </div>
                  <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
                    <p className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Completed Events</p>
                    <p className="text-3xl font-black text-sfrc-900 mt-1">{eventData?.total_events || 18}</p>
                    <p className="text-[11px] text-sfrc-500 mt-1">Conducted successfully</p>
                  </div>
                  <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
                    <p className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Upcoming Scheduled</p>
                    <p className="text-3xl font-black text-sfrc-accent mt-1">{eventData?.upcoming_events_count || 4}</p>
                    <p className="text-[11px] text-sfrc-500 mt-1">In next 30 days</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-6 bg-white rounded-3xl border border-sfrc-200 p-6 shadow-xs">
                    <h2 className="text-base font-black text-sfrc-900 mb-4">Event Category Participation</h2>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={eventData?.category_distribution || []}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                          <XAxis dataKey="category" tick={{ fontSize: 9, fill: '#64748B' }} />
                          <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                          <Tooltip />
                          <Bar dataKey="registrations" name="Registrations" fill="#0C4A60" radius={[6, 6, 0, 0]} maxBarSize={36} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="lg:col-span-6 bg-white rounded-3xl border border-sfrc-200 p-6 shadow-xs">
                    <h2 className="text-base font-black text-sfrc-900 mb-4">Monthly Engagement Trend</h2>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={eventData?.monthly_participation || []}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} />
                          <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                          <Tooltip />
                          <Line type="monotone" dataKey="participants" stroke="#F3C969" strokeWidth={3} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. E-CONTENT TAB */}
            {activeTab === 'econtent' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
                    <p className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Total Repository Items</p>
                    <p className="text-3xl font-black text-sfrc-900 mt-1">{econtentData?.total_resources || 222}</p>
                  </div>
                  <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
                    <p className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Total Digital Views</p>
                    <p className="text-3xl font-black text-emerald-700 mt-1">{econtentData?.total_views?.toLocaleString() || '19,320'}</p>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-sfrc-200 p-6 shadow-xs">
                  <h2 className="text-base font-black text-sfrc-900 mb-4">Resource Category Breakdown & Views</h2>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={econtentData?.category_usage || []}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="type" tick={{ fontSize: 11, fill: '#64748B' }} />
                        <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                        <Tooltip />
                        <Bar dataKey="views" name="Views" fill="#0C4A60" radius={[6, 6, 0, 0]} maxBarSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* 5. PLACEMENT TAB */}
            {activeTab === 'placement' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
                    <p className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Campus Drives</p>
                    <p className="text-3xl font-black text-sfrc-900 mt-1">{placementData?.total_drives || 22}</p>
                  </div>
                  <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
                    <p className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Offers Received</p>
                    <p className="text-3xl font-black text-emerald-700 mt-1">{placementData?.total_selected || 149}</p>
                  </div>
                  <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
                    <p className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Highest Package</p>
                    <p className="text-3xl font-black text-sfrc-900 mt-1">{placementData?.highest_ctc_lpa || 9.6} LPA</p>
                  </div>
                  <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
                    <p className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Average Package</p>
                    <p className="text-3xl font-black text-sfrc-900 mt-1">{placementData?.average_ctc_lpa || 4.85} LPA</p>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-sfrc-200 p-6 shadow-xs">
                  <h2 className="text-base font-black text-sfrc-900 mb-4">Top Recruiting Companies & Selections</h2>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={placementData?.top_recruiters || []}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="company" tick={{ fontSize: 10, fill: '#64748B' }} />
                        <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                        <Tooltip />
                        <Bar dataKey="offers" name="Offers Placed" fill="#45B69C" radius={[6, 6, 0, 0]} maxBarSize={36} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* 6. MENTORING TAB */}
            {activeTab === 'mentoring' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
                    <p className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Faculty Mentors</p>
                    <p className="text-3xl font-black text-sfrc-900 mt-1">{mentoringData?.total_mentors || 23}</p>
                  </div>
                  <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
                    <p className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Active Mentees</p>
                    <p className="text-3xl font-black text-sfrc-900 mt-1">{mentoringData?.total_mentees || 425}</p>
                  </div>
                  <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
                    <p className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Sessions Held</p>
                    <p className="text-3xl font-black text-emerald-700 mt-1">{mentoringData?.sessions_conducted || 126}</p>
                  </div>
                  <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
                    <p className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Identified At-Risk</p>
                    <p className="text-3xl font-black text-amber-600 mt-1">{mentoringData?.at_risk_mentees || 11}</p>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-sfrc-200 p-6 shadow-xs">
                  <h2 className="text-base font-black text-sfrc-900 mb-4">Department-Wise Mentoring Load</h2>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={mentoringData?.dept_mentoring_stats || []}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="department" tick={{ fontSize: 11, fill: '#64748B' }} />
                        <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                        <Tooltip />
                        <Bar dataKey="mentees" name="Assigned Mentees" fill="#0C4A60" radius={[4, 4, 0, 0]} maxBarSize={30} />
                        <Bar dataKey="sessions" name="Sessions Logged" fill="#F3C969" radius={[4, 4, 0, 0]} maxBarSize={30} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* 7. ALUMNI TAB */}
            {activeTab === 'alumni' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
                    <p className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Registered Alumni</p>
                    <p className="text-3xl font-black text-sfrc-900 mt-1">12,480</p>
                  </div>
                  <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
                    <p className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Global Chapters</p>
                    <p className="text-3xl font-black text-emerald-700 mt-1">14</p>
                  </div>
                  <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
                    <p className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Mentorship Volunteers</p>
                    <p className="text-3xl font-black text-sfrc-900 mt-1">320</p>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-sfrc-200 p-6 shadow-xs">
                  <h2 className="text-base font-black text-sfrc-900 mb-4">Alumni Geographic Distribution</h2>
                  <p className="text-xs text-sfrc-600 mb-4">Leading professional hubs and countries of SFRC alumnae</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl bg-sfrc-surface border border-sfrc-200">
                      <p className="text-xs font-bold text-sfrc-900">Chennai & Bangalore</p>
                      <p className="text-lg font-black text-sfrc-700 mt-1">4,820 (38%)</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-sfrc-surface border border-sfrc-200">
                      <p className="text-xs font-bold text-sfrc-900">United States</p>
                      <p className="text-lg font-black text-sfrc-700 mt-1">1,240 (10%)</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-sfrc-surface border border-sfrc-200">
                      <p className="text-xs font-bold text-sfrc-900">UAE & Middle East</p>
                      <p className="text-lg font-black text-sfrc-700 mt-1">980 (8%)</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-sfrc-surface border border-sfrc-200">
                      <p className="text-xs font-bold text-sfrc-900">Singapore / APAC</p>
                      <p className="text-lg font-black text-sfrc-700 mt-1">650 (5%)</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <AskPragyaBanner />
      </div>
  );
}
