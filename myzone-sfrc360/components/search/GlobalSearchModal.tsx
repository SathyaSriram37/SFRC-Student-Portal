'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  X,
  Calendar,
  BookOpen,
  FileText,
  Building2,
  ShieldCheck,
  Users,
  CornerDownLeft,
  ArrowUpDown,
  Sparkles,
  Loader2,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { apiGet } from '@/lib/api-client';

export interface SearchResultItem {
  id: string;
  type: string;
  title: string;
  subtitle?: string | null;
  badge?: string | null;
  href: string;
  relevance?: number;
}

interface SearchResponse {
  query: string;
  results: SearchResultItem[];
  total: number;
  took_ms?: number;
}

const CATEGORY_TABS = [
  { id: 'all', label: 'All Results' },
  { id: 'events', label: 'Events' },
  { id: 'courses', label: 'Courses' },
  { id: 'econtent', label: 'E-Content' },
  { id: 'facilities', label: 'Facilities' },
  { id: 'policies', label: 'Policies' },
  { id: 'alumni', label: 'Alumni' },
];

const QUICK_SUGGESTIONS = [
  { label: 'Campus Bus Routes & Timings', type: 'facilities', href: '/student/facilities/transport' },
  { label: 'Library Catalog & E-Resources', type: 'facilities', href: '/student/library' },
  { label: 'Academic Regulations & Policies', type: 'policies', href: '/student/policies' },
  { label: 'YWED Skill Certification Courses', type: 'courses', href: '/student/student-life' },
  { label: 'Placement Drives & Schedules', type: 'events', href: '/student/placements' },
];

export function GlobalSearchModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [tookMs, setTookMs] = useState<number | null>(null);

  const supabase = useMemo(() => createClient(), []);

  // Autofocus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    } else {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      setTookMs(null);
    }
  }, [isOpen]);

  // Live debounced search (300ms)
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setTookMs(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;

        const typesParam = activeCategory === 'all' ? '' : `&types=${activeCategory}`;
        const url = `/api/v1/search?q=${encodeURIComponent(trimmed)}${typesParam}`;

        const data = await apiGet<SearchResponse>(url, token);
        setResults(data.results || []);
        setTookMs(data.took_ms ?? null);
        setSelectedIndex(0);
      } catch (err) {
        console.error('Global search error:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, activeCategory, supabase]);

  // Filter results if changed locally or by category tab
  const displayedResults = useMemo(() => {
    if (activeCategory === 'all') return results;
    return results.filter((r) => r.type === activeCategory);
  }, [results, activeCategory]);

  // Navigate to target href
  const handleSelect = useCallback(
    (item: SearchResultItem | { href: string }) => {
      onClose();
      router.push(item.href);
    },
    [router, onClose]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const itemsCount = query.trim().length >= 2 ? displayedResults.length : QUICK_SUGGESTIONS.length;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (itemsCount === 0 ? 0 : (prev + 1) % itemsCount));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (itemsCount === 0 ? 0 : (prev - 1 + itemsCount) % itemsCount));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (query.trim().length >= 2 && displayedResults[selectedIndex]) {
          handleSelect(displayedResults[selectedIndex]);
        } else if (query.trim().length < 2 && QUICK_SUGGESTIONS[selectedIndex]) {
          handleSelect(QUICK_SUGGESTIONS[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [displayedResults, selectedIndex, query, handleSelect, onClose]
  );

  if (!isOpen) return null;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'events':
        return <Calendar className="w-4 h-4 text-rose-500" />;
      case 'courses':
        return <BookOpen className="w-4 h-4 text-blue-500" />;
      case 'econtent':
        return <FileText className="w-4 h-4 text-emerald-500" />;
      case 'facilities':
        return <Building2 className="w-4 h-4 text-amber-500" />;
      case 'policies':
        return <ShieldCheck className="w-4 h-4 text-purple-500" />;
      case 'alumni':
        return <Users className="w-4 h-4 text-cyan-500" />;
      default:
        return <Sparkles className="w-4 h-4 text-sfrc-500" />;
    }
  };

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'events':
        return 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300';
      case 'courses':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300';
      case 'econtent':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300';
      case 'facilities':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300';
      case 'policies':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300';
      case 'alumni':
        return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-14 sm:pt-20 px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* ── Search Input Bar ────────────────────────────────────────────── */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-border bg-sfrc-surface/50 dark:bg-muted/30">
          <Search className="w-5 h-5 text-muted-foreground mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events, courses, LMS e-content, campus facilities, policies, alumni..."
            className="w-full bg-transparent text-sm sm:text-base text-foreground placeholder:text-muted-foreground outline-none font-medium"
          />
          {loading && <Loader2 className="w-4 h-4 text-sfrc-600 animate-spin mr-2 shrink-0" />}
          {query && !loading && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="p-1 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground mr-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-semibold text-muted-foreground bg-muted border border-border rounded-md">
            ESC
          </kbd>
        </div>

        {/* ── Category Filters ────────────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border bg-muted/20 overflow-x-auto no-scrollbar text-xs">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveCategory(tab.id)}
              className={cn(
                'px-2.5 py-1 rounded-lg font-semibold transition-all whitespace-nowrap',
                activeCategory === tab.id
                  ? 'bg-sfrc-700 text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Results Container ───────────────────────────────────────────── */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-border/20">
          {query.trim().length >= 2 ? (
            displayedResults.length > 0 ? (
              displayedResults.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={`${item.type}-${item.id}-${idx}`}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={cn(
                      'group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-150',
                      isSelected
                        ? 'bg-sfrc-50 dark:bg-sfrc-950/40 border border-sfrc-300 dark:border-sfrc-700 shadow-xs'
                        : 'hover:bg-muted/50 border border-transparent'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          'p-2 rounded-xl shrink-0 transition-colors',
                          isSelected
                            ? 'bg-sfrc-100 dark:bg-sfrc-900/60'
                            : 'bg-muted/60 group-hover:bg-muted'
                        )}
                      >
                        {getTypeIcon(item.type)}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'text-sm font-semibold truncate',
                              isSelected ? 'text-sfrc-900 dark:text-sfrc-200' : 'text-foreground'
                            )}
                          >
                            {item.title}
                          </span>
                          {item.badge && (
                            <span
                              className={cn(
                                'text-[10px] font-bold px-2 py-0.5 rounded-full capitalize shrink-0',
                                getTypeBadgeClass(item.type)
                              )}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>
                        {item.subtitle && (
                          <span className="text-xs text-muted-foreground truncate">
                            {item.subtitle}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider hidden sm:inline">
                        {item.type}
                      </span>
                      <CornerDownLeft
                        className={cn(
                          'w-3.5 h-3.5 transition-opacity',
                          isSelected ? 'opacity-100 text-sfrc-600' : 'opacity-0'
                        )}
                      />
                    </div>
                  </div>
                );
              })
            ) : !loading ? (
              /* Empty state */
              <div className="py-12 px-6 text-center">
                <Search className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-foreground">
                  No results for &ldquo;{query}&rdquo;
                </h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  Try checking your spelling, using more general terms, or switching the category tab filter.
                </p>
              </div>
            ) : null
          ) : (
            /* Quick suggestions when query is short */
            <div className="p-2 space-y-2">
              <div className="px-2 pt-1 flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider">
                <span>Quick Access & Popular Searches</span>
                <Sparkles className="w-3.5 h-3.5 text-sfrc-500" />
              </div>
              {QUICK_SUGGESTIONS.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={item.href}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={cn(
                      'flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all duration-150',
                      isSelected
                        ? 'bg-sfrc-50 dark:bg-sfrc-950/40 border border-sfrc-300 dark:border-sfrc-700'
                        : 'hover:bg-muted/50 border border-transparent'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-lg bg-muted/60">{getTypeIcon(item.type)}</div>
                      <span className="text-sm font-medium text-foreground">{item.label}</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-60" />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Modal Footer ────────────────────────────────────────────────── */}
        <div className="px-4 py-2.5 border-t border-border bg-muted/30 flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3" /> Navigate
            </span>
            <span className="flex items-center gap-1">
              <CornerDownLeft className="w-3 h-3" /> Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[9px] font-bold">
                ESC
              </kbd>{' '}
              Close
            </span>
          </div>

          {tookMs !== null && query.trim().length >= 2 && (
            <div className="flex items-center gap-1 text-[10px]">
              <Clock className="w-3 h-3" />
              <span>
                {displayedResults.length} results ({tookMs}ms)
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
