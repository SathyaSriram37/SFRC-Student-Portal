'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { ShieldCheck, BarChart3, TrendingUp, PieChart as PieIcon, CheckCircle, Archive, RefreshCw, Search, Layers } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiGet, apiPut } from '@/lib/api-client';
import { createClient } from '@/lib/supabase/client';
import type { EContentItem, EContentPlatformAnalytics, EContentStatus } from '@/lib/types';

const DONUT_COLORS = ['#3B82F6', '#F59E0B', '#8B5CF6', '#10B981', '#F43F5E'];

export default function AdminEContentPage() {
  const [activeTab, setActiveTab] = useState<'moderation' | 'analytics'>('analytics');
  const [items, setItems] = useState<EContentItem[]>([]);
  const [analytics, setAnalytics] = useState<EContentPlatformAnalytics | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');

  const supabase = useMemo(() => createClient(), []);

  const getAuthToken = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token;
    } catch {
      return undefined;
    }
  }, [supabase]);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = await getAuthToken();

      const [itemsRes, analyticsRes] = await Promise.allSettled([
        apiGet<{ items: EContentItem[]; total: number }>('/api/v1/econtent?page=1&limit=100', token),
        apiGet<EContentPlatformAnalytics>('/api/v1/admin/econtent/analytics', token),
      ]);

      if (itemsRes.status === 'fulfilled' && itemsRes.value?.items) {
        setItems(itemsRes.value.items);
      }
      if (analyticsRes.status === 'fulfilled') {
        setAnalytics(analyticsRes.value);
      }
    } catch (err) {
      console.error('Failed to load admin E-Content data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [getAuthToken]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Checkbox Selection
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map((i) => i.id)));
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Bulk Actions
  const handleBulkAction = async (targetStatus: EContentStatus) => {
    if (selectedIds.size === 0) return;
    try {
      const token = await getAuthToken();
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          apiPut(`/api/v1/econtent/${id}`, { status: targetStatus }, token).catch(() => null)
        )
      );
      setSelectedIds(new Set());
      loadData();
    } catch (err) {
      console.error('Failed to apply bulk status:', err);
    }
  };

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      if (statusFilter !== 'all' && it.status !== statusFilter) return false;
      if (deptFilter !== 'all' && it.department_code !== deptFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          it.title.toLowerCase().includes(q) ||
          it.course_code.toLowerCase().includes(q) ||
          it.faculty_name.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [items, statusFilter, deptFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-sfrc-surface pb-16">
      {/* Admin Header */}
      <div className="bg-white border-b border-sfrc-200 py-8 px-6 sm:px-10 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-sfrc-700 uppercase tracking-wider mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-sfrc-700" />
              Admin Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-sfrc-900 tracking-tight">
              E-Content & LMS Command Center
            </h1>
            <p className="text-xs sm:text-sm text-sfrc-600 mt-1">
              Oversee college-wide digital repository, moderate uploaded resources, and track learning consumption.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="rounded-xl text-xs font-bold border-sfrc-200"
            >
              <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh Analytics
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-sfrc-200 pb-2">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
              activeTab === 'analytics'
                ? 'bg-sfrc-700 text-white shadow-sm'
                : 'text-sfrc-700 hover:bg-sfrc-100'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Platform Analytics
          </button>

          <button
            onClick={() => setActiveTab('moderation')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
              activeTab === 'moderation'
                ? 'bg-sfrc-700 text-white shadow-sm'
                : 'text-sfrc-700 hover:bg-sfrc-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            Moderation Queue ({items.length})
          </button>
        </div>

        {/* TAB 1: Platform Analytics */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="rounded-3xl border-sfrc-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-bold text-sfrc-600 uppercase">Total Learning Resources</p>
                <p className="text-3xl font-black text-sfrc-900 mt-2">
                  {analytics?.total_items || items.length}
                </p>
                <p className="text-[11px] text-sfrc-500 mt-1 font-medium">Catalogued across 6 departments</p>
              </Card>

              <Card className="rounded-3xl border-sfrc-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-bold text-sfrc-600 uppercase">Total Content Views</p>
                <p className="text-3xl font-black text-emerald-700 mt-2">
                  {analytics?.total_views || 0}
                </p>
                <p className="text-[11px] text-emerald-600 mt-1 font-medium">Student and faculty streams</p>
              </Card>

              <Card className="rounded-3xl border-sfrc-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-bold text-sfrc-600 uppercase">Active In-Progress Streams</p>
                <p className="text-3xl font-black text-sfrc-700 mt-2">
                  {analytics?.total_in_progress || 0}
                </p>
                <p className="text-[11px] text-sfrc-500 mt-1 font-medium">1% – 99% progress recorded</p>
              </Card>
            </div>

            {/* Charts Row 1: Category Donut & Department Bar */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category Donut */}
              <Card className="rounded-3xl border-sfrc-200 bg-white p-6 shadow-sm">
                <CardTitle className="text-base font-bold text-sfrc-900 flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-sfrc-700" />
                  Category Distribution
                </CardTitle>
                <CardDescription className="text-xs text-sfrc-600 mb-4">
                  Breakdown by media format (Video, Mindmap, Audio, Doc, E-Learning)
                </CardDescription>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics?.category_distribution || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {(analytics?.category_distribution || []).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Department Breakdown BarChart */}
              <Card className="rounded-3xl border-sfrc-200 bg-white p-6 shadow-sm">
                <CardTitle className="text-base font-bold text-sfrc-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-sfrc-700" />
                  Department Resources & Views
                </CardTitle>
                <CardDescription className="text-xs text-sfrc-600 mb-4">
                  Resource counts and consumption by academic department
                </CardDescription>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics?.department_breakdown || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="department" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" name="Items" fill="#5A122D" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="views" name="Views" fill="#D4AF37" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* Charts Row 2: Monthly Trend LineChart & Top 10 Table */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Monthly Trend */}
              <Card className="lg:col-span-2 rounded-3xl border-sfrc-200 bg-white p-6 shadow-sm">
                <CardTitle className="text-base font-bold text-sfrc-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-sfrc-700" />
                  Monthly Viewership Trends
                </CardTitle>
                <CardDescription className="text-xs text-sfrc-600 mb-4">
                  Aggregate LMS media playback count over academic months
                </CardDescription>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics?.monthly_trend || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="views"
                        stroke="#5A122D"
                        strokeWidth={3}
                        dot={{ r: 5, fill: '#D4AF37' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Top 10 Most Viewed */}
              <Card className="rounded-3xl border-sfrc-200 bg-white p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-sfrc-900">
                    Top Viewed Modules
                  </CardTitle>
                  <CardDescription className="text-xs text-sfrc-600 mb-4">
                    Most consumed resources
                  </CardDescription>

                  <div className="space-y-3">
                    {(analytics?.top_viewed || items.slice(0, 5)).map((tv, idx) => {
                      const count = 'views' in tv ? tv.views : tv.views_count;
                      return (
                        <div
                          key={tv.id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-sfrc-50/70 border border-sfrc-100 text-xs"
                        >
                          <div className="min-w-0 flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-sfrc-200 text-sfrc-900 font-bold flex items-center justify-center text-[10px] shrink-0">
                              {idx + 1}
                            </span>
                            <span className="truncate max-w-[150px] font-bold text-sfrc-900">
                              {tv.title}
                            </span>
                          </div>
                          <span className="font-bold text-sfrc-700 text-[11px] bg-white px-2 py-0.5 rounded border border-sfrc-200 shrink-0">
                            {count} views
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Link href="/student/econtent" className="mt-4 block">
                  <Button variant="outline" className="w-full text-xs font-bold rounded-xl border-sfrc-200">
                    Open Student Catalog
                  </Button>
                </Link>
              </Card>
            </div>
          </div>
        )}

        {/* TAB 2: Moderation Queue */}
        {activeTab === 'moderation' && (
          <div className="space-y-4">
            {/* Filter & Bulk Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-sfrc-200 shadow-sm">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-64">
                  <Search className="w-4 h-4 text-sfrc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="text"
                    placeholder="Search resources or faculty..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-xs rounded-xl bg-sfrc-50 border-sfrc-200 font-medium"
                  />
                </div>

                <Select value={statusFilter} onValueChange={(v) => { if (v) setStatusFilter(v); }}>
                  <SelectTrigger className="w-36 h-9 text-xs rounded-xl bg-sfrc-50 border-sfrc-200 font-semibold">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
                    <SelectItem value="published" className="text-xs">Published</SelectItem>
                    <SelectItem value="draft" className="text-xs">Draft</SelectItem>
                    <SelectItem value="archived" className="text-xs">Archived</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={deptFilter} onValueChange={(v) => { if (v) setDeptFilter(v); }}>
                  <SelectTrigger className="w-36 h-9 text-xs rounded-xl bg-sfrc-50 border-sfrc-200 font-semibold">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All Departments</SelectItem>
                    <SelectItem value="CS" className="text-xs">Computer Science</SelectItem>
                    <SelectItem value="CHEM" className="text-xs">Chemistry</SelectItem>
                    <SelectItem value="MATH" className="text-xs">Mathematics</SelectItem>
                    <SelectItem value="ENG" className="text-xs">English</SelectItem>
                    <SelectItem value="COM" className="text-xs">Commerce</SelectItem>
                    <SelectItem value="PHY" className="text-xs">Physics</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Bulk Action Controls */}
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-sfrc-700 bg-sfrc-100 px-2.5 py-1 rounded-lg">
                    {selectedIds.size} Selected
                  </span>
                  <Button
                    size="sm"
                    onClick={() => handleBulkAction('published')}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl h-8"
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1" /> Bulk Publish
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleBulkAction('archived')}
                    className="bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-xl h-8"
                  >
                    <Archive className="w-3.5 h-3.5 mr-1" /> Bulk Archive
                  </Button>
                </div>
              )}
            </div>

            {/* Moderation Table */}
            <Card className="rounded-3xl border-sfrc-200 bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-sfrc-200 bg-sfrc-50 text-[11px] font-bold text-sfrc-700 uppercase tracking-wider">
                      <th className="py-3.5 px-4 w-10">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === filteredItems.length && filteredItems.length > 0}
                          onChange={toggleSelectAll}
                          className="rounded border-sfrc-300 text-sfrc-700"
                        />
                      </th>
                      <th className="py-3.5 px-4">Title & Category</th>
                      <th className="py-3.5 px-4">Dept / Course</th>
                      <th className="py-3.5 px-4">Instructor</th>
                      <th className="py-3.5 px-4">Views</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sfrc-100 text-xs">
                    {isLoading ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-sfrc-500 font-medium">
                          Loading resources...
                        </td>
                      </tr>
                    ) : filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-sfrc-500">
                          No matching resources found.
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item) => {
                        const isSelected = selectedIds.has(item.id);
                        return (
                          <tr key={item.id} className="hover:bg-sfrc-50/70 transition-colors">
                            <td className="py-4 px-4">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectItem(item.id)}
                                className="rounded border-sfrc-300 text-sfrc-700"
                              />
                            </td>

                            <td className="py-4 px-4 font-bold text-sfrc-900">
                              <Link
                                href={`/student/econtent/${item.id}`}
                                className="hover:text-sfrc-700 block truncate max-w-xs"
                              >
                                {item.title}
                              </Link>
                              <span className="text-[10px] text-sfrc-500 capitalize font-medium">
                                {item.category}
                              </span>
                            </td>

                            <td className="py-4 px-4 font-semibold text-sfrc-800">
                              {item.department_code} • {item.course_code}
                            </td>

                            <td className="py-4 px-4 text-sfrc-700">
                              {item.faculty_name}
                            </td>

                            <td className="py-4 px-4 font-bold text-sfrc-900">
                              {item.views_count}
                            </td>

                            <td className="py-4 px-4">
                              {item.status === 'published' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  Published
                                </span>
                              )}
                              {item.status === 'draft' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-sfrc-200 text-sfrc-800 border border-sfrc-300">
                                  Draft
                                </span>
                              )}
                              {item.status === 'archived' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                  Archived
                                </span>
                              )}
                            </td>

                            <td className="py-4 px-6 text-right space-x-2">
                              {item.status !== 'published' ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async () => {
                                    const token = await getAuthToken();
                                    await apiPut(`/api/v1/econtent/${item.id}`, { status: 'published' }, token);
                                    loadData();
                                  }}
                                  className="text-[10px] font-bold h-7 rounded-lg border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                                >
                                  Publish
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async () => {
                                    const token = await getAuthToken();
                                    await apiPut(`/api/v1/econtent/${item.id}`, { status: 'archived' }, token);
                                    loadData();
                                  }}
                                  className="text-[10px] font-bold h-7 rounded-lg border-rose-300 text-rose-800 hover:bg-rose-50"
                                >
                                  Archive
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
