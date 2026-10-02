'use client';

import React, { useState, useEffect } from 'react';
import { Library, BookOpen, Search, BookMarked, Clock, AlertTriangle, CheckCircle2, ExternalLink, Info, Globe, RefreshCw, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

import { apiGet } from '@/lib/api-client';

interface LibraryItem {
  id: string;
  accession_no: string;
  title: string;
  author: string;
  publisher: string;
  edition_year: string;
  category: string;
  department: string;
  call_number: string;
  total_copies: number;
  available_copies: number;
  shelf_location: string;
  cover_url?: string;
}

interface LoanItem {
  id: string;
  accession_no: string;
  title: string;
  author: string;
  issued_date: string;
  due_date: string;
  returned_date?: string;
  days_left: number;
  is_overdue: boolean;
  overdue_days: number;
  fine_amount: number;
  status: string;
}

interface MyLoansData {
  active_loans: LoanItem[];
  past_loans: LoanItem[];
  total_active: number;
  overdue_count: number;
  total_fine_payable: number;
}

interface EResource {
  id: string;
  name: string;
  description: string;
  url: string;
  category: string;
  access_note: string;
}

const CATEGORIES = ['All', 'Computer Science', 'Mathematics', 'Physics', 'Chemistry', 'Commerce', 'Literature'];

export default function StudentLibraryPage() {
  const [activeTab, setActiveTab] = useState<'catalog' | 'my-loans' | 'e-resources'>('catalog');
  const [books, setBooks] = useState<LibraryItem[]>([]);
  const [loansData, setLoansData] = useState<MyLoansData | null>(null);
  const [eResources, setEResources] = useState<EResource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [totalVolumes, setTotalVolumes] = useState(64795);

  // 300ms Search Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load Library Data
  const fetchCatalog = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (debouncedQuery) queryParams.set('q', debouncedQuery);
      if (selectedCategory !== 'All') queryParams.set('cat', selectedCategory);

      const res = await apiGet<{ items: LibraryItem[]; total: number; total_volumes?: number }>(
        `/api/v1/library/items?${queryParams.toString()}`
      );
      if (res && res.items) {
        setBooks(res.items);
        if (res.total_volumes) setTotalVolumes(res.total_volumes);
      }
    } catch (err) {
      console.error('Failed to load library catalog:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const queryParams = new URLSearchParams();
        if (debouncedQuery) queryParams.set('q', debouncedQuery);
        if (selectedCategory !== 'All') queryParams.set('cat', selectedCategory);

        const res = await apiGet<{ items: LibraryItem[]; total: number; total_volumes?: number }>(
          `/api/v1/library/items?${queryParams.toString()}`
        );
        if (!ignore && res && res.items) {
          setBooks(res.items);
          if (res.total_volumes) setTotalVolumes(res.total_volumes);
        }
      } catch (err) {
        console.error('Failed to load library catalog:', err);
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      ignore = true;
    };
  }, [debouncedQuery, selectedCategory]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const [loansRes, eRes] = await Promise.allSettled([
          apiGet<MyLoansData>('/api/v1/library/me/loans'),
          apiGet<EResource[]>('/api/v1/library/e-resources'),
        ]);
        if (!ignore) {
          if (loansRes.status === 'fulfilled' && loansRes.value) {
            setLoansData(loansRes.value);
          }
          if (eRes.status === 'fulfilled' && Array.isArray(eRes.value)) {
            setEResources(eRes.value);
          }
        }
      } catch (err) {
        console.error('Failed to load library loans / e-resources:', err);
      }
    })();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner with 64,795 Volumes Stat */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sfrc-800 via-sfrc-900 to-slate-950 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-sfrc-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-medium text-sfrc-200">
              <Library className="w-3.5 h-3.5 text-amber-300" />
              SFRC Information Resource Centre & OPAC Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Central Library & E-Resources</h1>
            <p className="text-sm text-slate-300 max-w-xl">
              Search through {totalVolumes.toLocaleString()} printed and digital volumes, check your active book loans,
              and access national research consortia.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-center">
              <div className="text-xl font-bold text-amber-300">{totalVolumes.toLocaleString()}</div>
              <div className="text-[11px] text-slate-300 uppercase tracking-wider">Total Volumes</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'catalog'
              ? 'border-sfrc-600 text-sfrc-600 dark:text-sfrc-400 font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Book Catalog ({books.length})
        </button>
        <button
          onClick={() => setActiveTab('my-loans')}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'my-loans'
              ? 'border-sfrc-600 text-sfrc-600 dark:text-sfrc-400 font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          My Book Loans ({loansData?.total_active || 0})
        </button>
        <button
          onClick={() => setActiveTab('e-resources')}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'e-resources'
              ? 'border-sfrc-600 text-sfrc-600 dark:text-sfrc-400 font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          SFRC E-Resources ({eResources.length || 5})
        </button>
      </div>

      {/* ── TAB 1: CATALOG SEARCH ────────────────────────────────────────────── */}
      {activeTab === 'catalog' && (
        <div className="space-y-6">
          {/* Search Bar with Debounce & Category Pills */}
          <div className="space-y-4 bg-card p-4 rounded-xl border border-border shadow-sm">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Real-time search by book title, author, accession no (e.g. CS-04128), or subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background text-sm"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {CATEGORIES.map((cat) => (
                <Button
                  key={cat}
                  size="sm"
                  variant={selectedCategory === cat ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-xs ${
                    selectedCategory === cat ? 'bg-sfrc-700 text-white' : 'bg-background'
                  }`}
                >
                  {cat}
                </Button>
              ))}
            </div>
          </div>

          {/* Book Catalog Grid */}
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-sfrc-600" />
              <p className="text-sm text-muted-foreground">Searching 64,795 catalog entries...</p>
            </div>
          ) : books.length === 0 ? (
            <Card className="py-16 text-center">
              <CardContent className="space-y-4">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto stroke-1" />
                <h3 className="text-lg font-semibold">No books found</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Try adjusting your search query or switching to &apos;All&apos; categories.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {books.map((book) => {
                const isAvailable = book.available_copies > 0;

                return (
                  <Card
                    key={book.id}
                    className="hover:shadow-lg transition-all border border-border bg-card flex flex-col justify-between overflow-hidden"
                  >
                    <div>
                      {book.cover_url && (
                        <div className="h-40 w-full overflow-hidden bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-3">
                          <img
                            src={book.cover_url}
                            alt={book.title}
                            className="h-full object-contain rounded shadow-sm"
                          />
                        </div>
                      )}

                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border">
                            {book.accession_no}
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            {book.category}
                          </Badge>
                        </div>
                        <CardTitle className="text-sm font-bold line-clamp-2 leading-snug">
                          {book.title}
                        </CardTitle>
                        <CardDescription className="text-xs line-clamp-1">
                          By {book.author}
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="space-y-2 text-xs text-muted-foreground pt-0">
                        <div className="text-[11px]">
                          <strong>Call #:</strong> {book.call_number}
                        </div>
                        <div className="text-[11px]">
                          <strong>Location:</strong> {book.shelf_location}
                        </div>
                        <div className="text-[11px]">
                          <strong>Publisher:</strong> {book.publisher} ({book.edition_year})
                        </div>
                      </CardContent>
                    </div>

                    <div className="p-3 border-t border-border bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between">
                      <span
                        className={`text-xs font-semibold ${
                          isAvailable ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
                        }`}
                      >
                        {isAvailable ? `${book.available_copies} of ${book.total_copies} Available` : 'All Issued'}
                      </span>
                      <Badge
                        variant="secondary"
                        className={isAvailable ? 'bg-emerald-500/10 text-emerald-700' : 'bg-rose-500/10 text-rose-700'}
                      >
                        {isAvailable ? 'On Shelf' : 'Issued Out'}
                      </Badge>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: MY BOOK LOANS & FINE CALCULATION (RS 2/DAY OVERDUE) ─────── */}
      {activeTab === 'my-loans' && (
        <div className="space-y-6">
          {/* Active Loans Summary & Fine Notice */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border border-border bg-card">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-muted-foreground">Active Borrowed Books</div>
                  <div className="text-2xl font-bold text-foreground mt-1">
                    {loansData?.total_active || 0} / 4 Limit
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-sfrc-500/10 text-sfrc-600 flex items-center justify-center">
                  <BookMarked className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border bg-card">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-muted-foreground">Overdue Books</div>
                  <div className={`text-2xl font-bold mt-1 ${loansData?.overdue_count ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {loansData?.overdue_count || 0}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-rose-200 dark:border-rose-900 bg-rose-50/30 dark:bg-rose-950/20">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-rose-700 dark:text-rose-300">
                    Overdue Fine Payable (Rs 2 / day)
                  </div>
                  <div className="text-2xl font-bold text-rose-600 mt-1">
                    ₹{loansData?.total_fine_payable?.toFixed(2) || '0.00'}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-700 flex items-center justify-center font-bold">
                  ₹
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Active Loans Table */}
          <Card className="border border-border bg-card overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-sfrc-600" />
                Current Active Borrowings
              </CardTitle>
              <CardDescription className="text-xs">
                Books currently issued to your library account with due dates and fine status.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loansData?.active_loans && loansData.active_loans.length > 0 ? (
                <div className="divide-y divide-border">
                  {loansData.active_loans.map((loan) => (
                    <div key={loan.id} className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border">
                            {loan.accession_no}
                          </span>
                          {loan.is_overdue ? (
                            <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 text-xs">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              OVERDUE by {loan.overdue_days} Days
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-300 text-xs">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              {loan.days_left} Days Left
                            </Badge>
                          )}
                        </div>

                        <h4 className="text-sm font-semibold text-foreground">{loan.title}</h4>
                        <div className="text-xs text-muted-foreground">Author: {loan.author}</div>
                      </div>

                      <div className="flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
                        <div>
                          <div className="text-[10px] uppercase font-bold text-slate-400">Issued On</div>
                          <div className="font-medium text-foreground">{loan.issued_date}</div>
                        </div>

                        <div>
                          <div className="text-[10px] uppercase font-bold text-slate-400">Due Date</div>
                          <div className={`font-semibold ${loan.is_overdue ? 'text-rose-600' : 'text-foreground'}`}>
                            {loan.due_date}
                          </div>
                        </div>

                        {loan.is_overdue && (
                          <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-right">
                            <div className="text-[10px] uppercase font-bold text-rose-600">Calculated Fine</div>
                            <div className="text-sm font-bold text-rose-600">
                              ₹{loan.fine_amount.toFixed(2)} (Rs 2/day)
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No active book loans on your account.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── TAB 3: SFRC IRC E-RESOURCES ──────────────────────────────────────── */}
      {activeTab === 'e-resources' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs space-y-1">
              <span className="font-semibold text-blue-900 dark:text-blue-200">
                Institutional Access Notice:
              </span>
              <p className="text-blue-800 dark:text-blue-300">
                All subscriptions are authenticated for Sri G.V.G Visalakshi College for Women / SFRC.
                Use your official institutional student email ID (<code>@sfrc.edu.in</code>) and library credentials to login.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {eResources.map((res) => (
              <Card key={res.id} className="border border-border bg-card flex flex-col justify-between hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {res.category}
                    </Badge>
                    <Globe className="w-4 h-4 text-sfrc-600" />
                  </div>
                  <CardTitle className="text-base font-bold pt-1">{res.name}</CardTitle>
                  <CardDescription className="text-xs leading-relaxed">
                    {res.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 pt-2">
                  <div className="p-2.5 rounded-lg bg-muted/50 border border-border text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>{res.access_note}</span>
                  </div>

                  <a href={res.url} target="_blank" rel="noopener noreferrer" className="block pt-1">
                    <Button size="sm" className="w-full bg-sfrc-700 hover:bg-sfrc-800 text-white text-xs font-semibold">
                      Open E-Resource Portal
                      <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                    </Button>
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
