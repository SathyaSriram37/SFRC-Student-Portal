'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Search, BookOpen, Video, Headphones, GitFork, FileText, MonitorPlay, Bookmark, Clock, User, GraduationCap, Play, RotateCcw, Sparkles, ChevronRight, TrendingUp, SlidersHorizontal } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { apiGet, apiPost } from '@/lib/api-client';
import { createClient } from '@/lib/supabase/client';
import type { EContentItem } from '@/lib/types';

const CATEGORIES = [
  { id: 'all', label: 'All Content', icon: BookOpen, color: 'text-sfrc-700 bg-sfrc-100' },
  { id: 'video', label: 'Video', icon: Video, color: 'text-blue-700 bg-blue-50' },
  { id: 'audio', label: 'Audio', icon: Headphones, color: 'text-amber-700 bg-amber-50' },
  { id: 'mindmap', label: 'Mindmap', icon: GitFork, color: 'text-purple-700 bg-purple-50' },
  { id: 'document', label: 'Document', icon: FileText, color: 'text-emerald-700 bg-emerald-50' },
  { id: 'elearning', label: 'E-Learning', icon: MonitorPlay, color: 'text-rose-700 bg-rose-50' },
];

const DEPARTMENTS = [
  { code: 'all', name: 'All Departments' },
  { code: 'CS', name: 'Computer Science' },
  { code: 'CHEM', name: 'Chemistry' },
  { code: 'MATH', name: 'Mathematics' },
  { code: 'ENG', name: 'English' },
  { code: 'COM', name: 'Commerce' },
  { code: 'PHY', name: 'Physics' },
];

function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return 'Self-paced';
  const mins = Math.floor(seconds / 60);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) {
    const remMins = mins % 60;
    return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`;
  }
  return `${mins} min`;
}

function getCategoryBadge(category: string) {
  switch (category) {
    case 'video':
      return { label: 'Video', icon: Video, bg: 'bg-blue-600 text-white' };
    case 'audio':
      return { label: 'Audio', icon: Headphones, bg: 'bg-amber-600 text-white' };
    case 'mindmap':
      return { label: 'Mindmap', icon: GitFork, bg: 'bg-purple-600 text-white' };
    case 'document':
      return { label: 'Document', icon: FileText, bg: 'bg-emerald-600 text-white' };
    case 'elearning':
      return { label: 'E-Learning', icon: MonitorPlay, bg: 'bg-rose-600 text-white' };
    default:
      return { label: category, icon: BookOpen, bg: 'bg-sfrc-700 text-white' };
  }
}

export default function StudentEContentPage() {
  const [items, setItems] = useState<EContentItem[]>([]);
  const [inProgressItems, setInProgressItems] = useState<EContentItem[]>([]);
  const [recentItems, setRecentItems] = useState<EContentItem[]>([]);
  const [bookmarkIds, setBookmarkIds] = useState<Set<string>>(new Set());

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedSemester, setSelectedSemester] = useState('all');
  const [activeTab, setActiveTab] = useState<'catalog' | 'continue' | 'bookmarks'>('catalog');

  const [isLoading, setIsLoading] = useState(true);
  const [bookmarkLoadingId, setBookmarkLoadingId] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  // 400ms Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load user token
  const getAuthToken = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token;
    } catch {
      return undefined;
    }
  }, [supabase]);

  // Fetch catalog content
  const loadCatalog = useCallback(async () => {
    try {
      const token = await getAuthToken();

      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.append('cat', selectedCategory);
      if (selectedDept !== 'all') params.append('dept', selectedDept);
      if (selectedSemester !== 'all') params.append('semester', selectedSemester);
      if (debouncedSearch.trim()) params.append('search', debouncedSearch.trim());

      const url = `/api/v1/econtent?${params.toString()}`;
      const [catRes, inProgRes, recentRes, bookRes] = await Promise.allSettled([
        apiGet<{ items: EContentItem[]; total: number }>(url, token),
        apiGet<EContentItem[]>('/api/v1/econtent/me/in-progress', token),
        apiGet<EContentItem[]>('/api/v1/econtent/me/recent', token),
        apiGet<EContentItem[]>('/api/v1/econtent/me/bookmarks', token),
      ]);

      if (catRes.status === 'fulfilled' && catRes.value?.items) {
        setItems(catRes.value.items);
      }
      if (inProgRes.status === 'fulfilled' && Array.isArray(inProgRes.value)) {
        setInProgressItems(inProgRes.value);
      }
      if (recentRes.status === 'fulfilled' && Array.isArray(recentRes.value)) {
        setRecentItems(recentRes.value);
      }
      if (bookRes.status === 'fulfilled' && Array.isArray(bookRes.value)) {
        setBookmarkIds(new Set(bookRes.value.map((b) => b.id)));
      }
    } catch (err) {
      console.error('Failed to load E-Content:', err);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, selectedCategory, selectedDept, selectedSemester, getAuthToken]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      await loadCatalog();
    })();
    return () => {
      ignore = true;
    };
  }, [loadCatalog]);

  // Toggle bookmark handler
  const handleToggleBookmark = async (e: React.MouseEvent, item: EContentItem) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      setBookmarkLoadingId(item.id);
      const token = await getAuthToken();
      const res = await apiPost<{ bookmarked: boolean; message: string }>(
        `/api/v1/econtent/${item.id}/bookmark`,
        {},
        token
      );

      setBookmarkIds((prev) => {
        const next = new Set(prev);
        if (res.bookmarked) {
          next.add(item.id);
        } else {
          next.delete(item.id);
        }
        return next;
      });

      // Update in local items
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, is_bookmarked: res.bookmarked } : it))
      );
    } catch (err) {
      console.error('Failed to toggle bookmark:', err);
    } finally {
      setBookmarkLoadingId(null);
    }
  };

  const displayedItems = useMemo(() => {
    if (activeTab === 'continue') {
      return inProgressItems;
    }
    if (activeTab === 'bookmarks') {
      return items.filter((it) => bookmarkIds.has(it.id));
    }
    return items;
  }, [activeTab, items, inProgressItems, bookmarkIds]);

  return (
    <div className="min-h-screen bg-sfrc-surface pb-16">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-sfrc-900 via-sfrc-800 to-sfrc-700 text-white py-12 px-6 sm:px-10 border-b border-sfrc-700 shadow-md">
        <div className="absolute inset-0 bg-[radial-gradient(#d4af37_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sfrc-gold/20 border border-sfrc-gold/30 text-sfrc-gold text-xs font-bold uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                SFRC Digital Learning Hub
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                E-Content & LMS Portal
              </h1>
              <p className="text-sfrc-100/80 text-sm sm:text-base max-w-2xl mt-1">
                Access curated faculty video tutorials, interactive mindmaps, audio lectures, and comprehensive course documentation.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/faculty/econtent/manage">
                <Button
                  variant="outline"
                  className="bg-white/10 text-white border-white/20 hover:bg-white/20 font-medium text-xs backdrop-blur-sm"
                >
                  <GraduationCap className="w-4 h-4 mr-2" />
                  Faculty Management
                </Button>
              </Link>
            </div>
          </div>

          {/* Search Bar with 400ms Debounce */}
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-sfrc-400" />
            <Input
              type="text"
              placeholder="Search by topic, keyword, course code, or faculty name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-4 py-3.5 h-12 bg-white/95 text-sfrc-900 placeholder:text-sfrc-500 rounded-2xl shadow-lg border-0 focus-visible:ring-2 focus-visible:ring-sfrc-gold text-sm font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-sfrc-500 hover:text-sfrc-900 bg-sfrc-200 hover:bg-sfrc-300 rounded-full px-2 py-0.5"
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar pt-2">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-sm ${
                    isSelected
                      ? 'bg-sfrc-gold text-sfrc-950 scale-105 shadow-md ring-2 ring-white/50'
                      : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-8 space-y-8">
        {/* Secondary Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-sfrc-200 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-sfrc-700 mr-2">
              <SlidersHorizontal className="w-4 h-4" />
              <span>Filters:</span>
            </div>

            {/* Department Dropdown */}
            <Select value={selectedDept} onValueChange={(v) => { if (v) setSelectedDept(v); }}>
              <SelectTrigger className="w-44 h-9 text-xs rounded-xl bg-sfrc-50 border-sfrc-200 font-semibold">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map((d) => (
                  <SelectItem key={d.code} value={d.code} className="text-xs">
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Semester Dropdown */}
            <Select value={selectedSemester} onValueChange={(v) => { if (v) setSelectedSemester(v); }}>
              <SelectTrigger className="w-36 h-9 text-xs rounded-xl bg-sfrc-50 border-sfrc-200 font-semibold">
                <SelectValue placeholder="Semester" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Semesters</SelectItem>
                <SelectItem value="1" className="text-xs">Semester 1</SelectItem>
                <SelectItem value="2" className="text-xs">Semester 2</SelectItem>
                <SelectItem value="3" className="text-xs">Semester 3</SelectItem>
                <SelectItem value="4" className="text-xs">Semester 4</SelectItem>
                <SelectItem value="5" className="text-xs">Semester 5</SelectItem>
                <SelectItem value="6" className="text-xs">Semester 6</SelectItem>
              </SelectContent>
            </Select>

            {(selectedCategory !== 'all' || selectedDept !== 'all' || selectedSemester !== 'all' || debouncedSearch) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedCategory('all');
                  setSelectedDept('all');
                  setSelectedSemester('all');
                  setSearchQuery('');
                }}
                className="text-xs text-sfrc-600 hover:text-sfrc-900 font-bold h-9"
              >
                Reset Filters
              </Button>
            )}
          </div>

          {/* View Mode Tabs */}
          <div className="flex items-center gap-1 bg-sfrc-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'catalog'
                  ? 'bg-white text-sfrc-900 shadow-sm'
                  : 'text-sfrc-600 hover:text-sfrc-900'
              }`}
            >
              All Library ({items.length})
            </button>
            <button
              onClick={() => setActiveTab('continue')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'continue'
                  ? 'bg-white text-sfrc-900 shadow-sm'
                  : 'text-sfrc-600 hover:text-sfrc-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-sfrc-700" />
              In Progress ({inProgressItems.length})
            </button>
            <button
              onClick={() => setActiveTab('bookmarks')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'bookmarks'
                  ? 'bg-white text-sfrc-900 shadow-sm'
                  : 'text-sfrc-600 hover:text-sfrc-900'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5 text-amber-600" />
              Saved ({bookmarkIds.size})
            </button>
          </div>
        </div>

        {/* Continue Learning Section (Horizontal Scroll) */}
        {activeTab === 'catalog' && inProgressItems.length > 0 && !debouncedSearch && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sfrc-100 text-sfrc-800 flex items-center justify-center">
                  <Play className="w-4 h-4 fill-sfrc-700 text-sfrc-700" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-sfrc-900">Continue Learning</h2>
                  <p className="text-xs text-sfrc-600">Pick up right where you left off</p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('continue')}
                className="text-xs font-bold text-sfrc-700 hover:text-sfrc-900 flex items-center gap-1"
              >
                View all in-progress <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-3 pt-1 no-scrollbar">
              {inProgressItems.map((item) => {
                const catBadge = getCategoryBadge(item.category);
                const isSaved = bookmarkIds.has(item.id);
                return (
                  <div
                    key={`continue-${item.id}`}
                    className="w-72 shrink-0 bg-white rounded-2xl border border-sfrc-200 overflow-hidden shadow-sm hover:shadow-md transition-all group flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative h-36 bg-sfrc-900 overflow-hidden">
                        <img
                          src={item.thumbnail_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80'}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-80 group-hover:opacity-100"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-sfrc-950/80 via-transparent to-black/20" />
                        <span className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md text-[10px] font-bold ${catBadge.bg}`}>
                          {catBadge.label}
                        </span>
                        <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/70 text-white flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(item.duration_seconds)}
                        </span>
                      </div>

                      <div className="p-4 space-y-2">
                        <p className="text-xs font-bold text-sfrc-600 uppercase tracking-wider">
                          {item.course_code} • {item.department_code}
                        </p>
                        <h3 className="font-bold text-sfrc-900 text-sm line-clamp-2 leading-snug group-hover:text-sfrc-700 transition-colors">
                          {item.title}
                        </h3>
                        <p className="text-[11px] text-sfrc-600 flex items-center gap-1">
                          <User className="w-3 h-3 text-sfrc-400" />
                          {item.faculty_name}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 pt-0 space-y-3">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-bold text-sfrc-700">
                          <span>Progress</span>
                          <span>{item.progress_percentage || 0}%</span>
                        </div>
                        <Progress value={item.progress_percentage || 0} className="h-1.5 bg-sfrc-100" />
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <Link href={`/student/econtent/${item.id}`} className="flex-1">
                          <Button size="sm" className="w-full bg-sfrc-700 hover:bg-sfrc-800 text-white text-xs font-bold rounded-xl h-8">
                            <Play className="w-3.5 h-3.5 mr-1 fill-white" /> Resume
                          </Button>
                        </Link>
                        <button
                          onClick={(e) => handleToggleBookmark(e, item)}
                          className={`p-2 rounded-xl border transition-all ${
                            isSaved
                              ? 'bg-amber-50 border-amber-300 text-amber-600'
                              : 'bg-sfrc-50 border-sfrc-200 text-sfrc-500 hover:text-sfrc-900'
                          }`}
                        >
                          <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-amber-600' : ''}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recently Viewed Section (Quick Strip) */}
        {activeTab === 'catalog' && recentItems.length > 0 && !debouncedSearch && (
          <div className="p-4 rounded-2xl bg-sfrc-100/60 border border-sfrc-200/80 space-y-3">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-sfrc-700" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-sfrc-800">
                Recently Viewed Resources
              </h3>
            </div>
            <div className="flex items-center gap-3 overflow-x-auto pb-1 no-scrollbar">
              {recentItems.slice(0, 5).map((rec) => (
                <Link
                  key={`rec-${rec.id}`}
                  href={`/student/econtent/${rec.id}`}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-sfrc-200 text-xs font-semibold text-sfrc-800 hover:border-sfrc-700 hover:text-sfrc-900 transition-all shrink-0 shadow-2xs"
                >
                  <span className="w-2 h-2 rounded-full bg-sfrc-gold" />
                  <span className="max-w-[160px] truncate">{rec.title}</span>
                  <ChevronRight className="w-3 h-3 text-sfrc-400" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-sfrc-900">
                {activeTab === 'catalog'
                  ? 'All Learning Resources'
                  : activeTab === 'continue'
                  ? 'In-Progress Modules'
                  : 'Bookmarked Resources'}
              </h2>
              <p className="text-xs text-sfrc-600">
                Showing {displayedItems.length} resources available
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-80 bg-white rounded-2xl border border-sfrc-200 animate-pulse p-4 space-y-4">
                  <div className="h-40 bg-sfrc-200 rounded-xl" />
                  <div className="h-4 bg-sfrc-200 rounded w-3/4" />
                  <div className="h-3 bg-sfrc-100 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : displayedItems.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-sfrc-200 shadow-sm p-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-sfrc-100 text-sfrc-600 flex items-center justify-center mx-auto">
                <BookOpen className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-sfrc-900">No Learning Content Found</h3>
              <p className="text-xs text-sfrc-600 max-w-md mx-auto">
                No resources match your current filter and search criteria. Try clearing search keywords or selecting all categories.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setSelectedDept('all');
                  setSelectedSemester('all');
                  setActiveTab('catalog');
                }}
                className="rounded-xl text-xs font-bold"
              >
                Clear All Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedItems.map((item) => {
                const catBadge = getCategoryBadge(item.category);
                const isSaved = bookmarkIds.has(item.id);
                const hasProgress = (item.progress_percentage || 0) > 0;

                return (
                  <Card
                    key={item.id}
                    className="overflow-hidden bg-white border-sfrc-200 rounded-2xl shadow-sm hover:shadow-md hover:border-sfrc-400 transition-all duration-200 flex flex-col justify-between group"
                  >
                    <div>
                      {/* Card Media Preview Header */}
                      <Link href={`/student/econtent/${item.id}`} className="block relative h-48 bg-sfrc-950 overflow-hidden cursor-pointer">
                        <img
                          src={item.thumbnail_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80'}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-85 group-hover:opacity-100"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-sfrc-950/80 via-transparent to-black/20" />

                        {/* Category Badge */}
                        <div className="absolute top-3 left-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold shadow-md ${catBadge.bg}`}>
                            <catBadge.icon className="w-3.5 h-3.5" />
                            {catBadge.label}
                          </span>
                        </div>

                        {/* Bookmark Button */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleBookmark(e, item)}
                          disabled={bookmarkLoadingId === item.id}
                          className={`absolute top-3 right-3 p-2 rounded-xl backdrop-blur-md transition-all shadow-md ${
                            isSaved
                              ? 'bg-amber-500 text-white'
                              : 'bg-black/50 text-white hover:bg-black/80'
                          }`}
                          title={isSaved ? 'Remove Bookmark' : 'Save Bookmark'}
                        >
                          <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-white' : ''}`} />
                        </button>

                        {/* Duration Badge */}
                        <div className="absolute bottom-3 right-3">
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-black/80 text-white flex items-center gap-1 backdrop-blur-sm">
                            <Clock className="w-3 h-3 text-sfrc-gold" />
                            {formatDuration(item.duration_seconds)}
                          </span>
                        </div>

                        {/* Views Count */}
                        <div className="absolute bottom-3 left-3">
                          <span className="text-[10px] text-white/90 font-medium bg-black/40 px-2 py-0.5 rounded backdrop-blur-xs">
                            {item.views_count} views
                          </span>
                        </div>
                      </Link>

                      {/* Card Body */}
                      <CardContent className="p-5 space-y-3">
                        <div className="flex items-center justify-between text-xs text-sfrc-600 font-semibold">
                          <span className="text-sfrc-800 font-bold bg-sfrc-100 px-2 py-0.5 rounded">
                            {item.course_code}
                          </span>
                          <span>Dept: {item.department_code} {item.semester ? `• Sem ${item.semester}` : ''}</span>
                        </div>

                        <Link href={`/student/econtent/${item.id}`} className="block group-hover:text-sfrc-700 transition-colors">
                          <h3 className="text-base font-bold text-sfrc-900 leading-snug line-clamp-2">
                            {item.title}
                          </h3>
                        </Link>

                        <p className="text-xs text-sfrc-600 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>

                        <div className="pt-2 border-t border-sfrc-100 flex items-center justify-between text-xs text-sfrc-600">
                          <div className="flex items-center gap-1.5 font-medium truncate">
                            <User className="w-3.5 h-3.5 text-sfrc-500 shrink-0" />
                            <span className="truncate">{item.faculty_name}</span>
                          </div>
                        </div>
                      </CardContent>
                    </div>

                    {/* Card Footer with Progress & CTA */}
                    <div className="p-5 pt-0 space-y-3">
                      {hasProgress && (
                        <div className="space-y-1 bg-sfrc-50 p-2.5 rounded-xl border border-sfrc-100">
                          <div className="flex justify-between text-[11px] font-bold text-sfrc-800">
                            <span>Your Progress</span>
                            <span>{item.progress_percentage}%</span>
                          </div>
                          <Progress value={item.progress_percentage ?? 0} className="h-1.5 bg-sfrc-200" />
                        </div>
                      )}

                      <Link href={`/student/econtent/${item.id}`} className="block">
                        <Button className="w-full bg-sfrc-700 hover:bg-sfrc-800 text-white text-xs font-bold rounded-xl h-9 group-hover:bg-sfrc-800 transition-colors">
                          {hasProgress ? (
                            <>
                              <Play className="w-3.5 h-3.5 mr-1.5 fill-white" /> Continue Learning
                            </>
                          ) : (
                            <>
                              <BookOpen className="w-3.5 h-3.5 mr-1.5" /> Start Learning
                            </>
                          )}
                        </Button>
                      </Link>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
