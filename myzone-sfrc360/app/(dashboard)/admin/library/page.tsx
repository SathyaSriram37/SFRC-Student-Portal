'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Library,
  BookOpen,
  Users,
  Search,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Download,
  Bookmark,
  DollarSign,
  Globe,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import AskPragyaBanner from '@/components/shared/AskPragyaBanner';
import { cn } from '@/lib/utils';

interface BookItem {
  id: string;
  accession_no: string;
  title: string;
  author: string;
  department: string;
  total_copies: number;
  available_copies: number;
  shelf_location: string;
  call_number: string;
}

const DEFAULT_BOOKS: BookItem[] = [
  {
    id: 'bk-1',
    accession_no: 'SFRC-LIB-44912',
    title: 'Cloud Computing: Principles and Paradigms',
    author: 'Rajkumar Buyya, Christian Vecchiola',
    department: 'Computer Science',
    total_copies: 8,
    available_copies: 5,
    shelf_location: 'Stack 4 - Shelf B',
    call_number: '004.6782 BUY',
  },
  {
    id: 'bk-2',
    accession_no: 'SFRC-LIB-42810',
    title: 'Advanced Corporate Accounting & Auditing Standards',
    author: 'Dr. S.N. Maheshwari, Dr. S.K. Maheshwari',
    department: 'Commerce',
    total_copies: 12,
    available_copies: 7,
    shelf_location: 'Stack 2 - Shelf D',
    call_number: '657.95 MAH',
  },
  {
    id: 'bk-3',
    accession_no: 'SFRC-LIB-39182',
    title: 'Introduction to Solid State Physics (8th Edition)',
    author: 'Charles Kittel',
    department: 'Physics',
    total_copies: 6,
    available_copies: 3,
    shelf_location: 'Stack 5 - Shelf A',
    call_number: '530.41 KIT',
  },
  {
    id: 'bk-4',
    accession_no: 'SFRC-LIB-46102',
    title: 'Artificial Intelligence: A Modern Approach (4th Edition)',
    author: 'Stuart Russell, Peter Norvig',
    department: 'Computer Science',
    total_copies: 10,
    available_copies: 4,
    shelf_location: 'Stack 4 - Shelf C',
    call_number: '006.3 RUS',
  },
  {
    id: 'bk-5',
    accession_no: 'SFRC-LIB-38291',
    title: 'Real and Complex Analysis (International Edition)',
    author: 'Walter Rudin',
    department: 'Mathematics',
    total_copies: 8,
    available_copies: 6,
    shelf_location: 'Stack 3 - Shelf A',
    call_number: '515 RUD',
  },
];

export default function AdminLibraryPage() {
  const [books, setBooks] = useState<BookItem[]>(DEFAULT_BOOKS);
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');

  const filtered = useMemo(() => {
    return books.filter((b) => {
      const matchDept = deptFilter === 'ALL' || b.department === deptFilter;
      const matchSearch =
        b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.accession_no.toLowerCase().includes(searchTerm.toLowerCase());
      return matchDept && matchSearch;
    });
  }, [books, deptFilter, searchTerm]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* ── Top Header ────────────────────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-3xl border border-sfrc-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sfrc-100 text-sfrc-700 text-xs font-bold uppercase tracking-wider mb-2">
            <Library className="w-3.5 h-3.5" />
            Central Library OPAC & Knowledge Resource Centre
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-sfrc-900 tracking-tight">
            Library Catalog & Circulation Desk
          </h1>
          <p className="text-xs sm:text-sm text-sfrc-600 mt-1">
            Manage physical book inventory, active student book loans, overdue reminders, and e-resource access.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => toast.success('Library inventory report exported.')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-sfrc-200 bg-sfrc-50 text-sfrc-800 text-xs font-bold hover:bg-sfrc-100 transition-colors shadow-2xs"
          >
            <Download className="w-4 h-4" />
            <span>Export Catalog</span>
          </button>
          <button
            onClick={() => toast.info('New Book Accession modal opened.')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sfrc-700 text-white text-xs font-bold hover:bg-sfrc-800 transition-colors shadow-sm cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add New Book</span>
          </button>
        </div>
      </div>

      {/* ── KPI Summary Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Total Volumes</span>
            <BookOpen className="w-4 h-4 text-sfrc-700" />
          </div>
          <p className="text-2xl font-black text-sfrc-900 mt-2 font-mono">54,280</p>
          <p className="text-xs text-sfrc-600 mt-0.5">Automated Barcode Catalog</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Books on Loan</span>
            <Bookmark className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-blue-700 mt-2 font-mono">1,142</p>
          <p className="text-xs text-sfrc-600 mt-0.5">Active Student Borrowers</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">E-Resources (N-LIST)</span>
            <Globe className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2 font-mono">6,000+</p>
          <p className="text-xs text-sfrc-600 mt-0.5">E-Journals & E-Books</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Daily Footfall</span>
            <Users className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-700 mt-2 font-mono">850+</p>
          <p className="text-xs text-sfrc-600 mt-0.5">RFID Gate Swipes</p>
        </div>
      </div>

      {/* ── Search & Filter ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-sfrc-200">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-sfrc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search book title, author, or accession no..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-sfrc-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sfrc-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
          {['ALL', 'Computer Science', 'Commerce', 'Physics', 'Mathematics'].map((d) => (
            <button
              key={d}
              onClick={() => setDeptFilter(d)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors',
                deptFilter === d
                  ? 'bg-sfrc-900 text-white'
                  : 'bg-sfrc-100 text-sfrc-700 hover:bg-sfrc-200'
              )}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* ── Books Table ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-sfrc-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-sfrc-200 bg-sfrc-50/50 flex items-center justify-between">
          <h3 className="text-sm font-black text-sfrc-900 uppercase tracking-wider">
            OPAC Physical Catalogue Holdings
          </h3>
          <span className="text-xs font-bold text-sfrc-600 font-mono">
            {filtered.length} Titles Found
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-sfrc-100/70 text-sfrc-800 font-bold border-b border-sfrc-200 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Accession No</th>
                <th className="px-5 py-3">Book Title</th>
                <th className="px-5 py-3">Author(s)</th>
                <th className="px-5 py-3">Department</th>
                <th className="px-5 py-3">Shelf Location</th>
                <th className="px-5 py-3">Availability</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sfrc-100 font-medium text-sfrc-900">
              {filtered.map((b) => (
                <tr key={b.id} className="hover:bg-sfrc-50/70 transition-colors">
                  <td className="px-5 py-3 font-mono font-bold text-sfrc-700">{b.accession_no}</td>
                  <td className="px-5 py-3">
                    <p className="font-bold text-sfrc-950">{b.title}</p>
                    <p className="text-[11px] text-sfrc-500 font-mono">Call No: {b.call_number}</p>
                  </td>
                  <td className="px-5 py-3 text-sfrc-700">{b.author}</td>
                  <td className="px-5 py-3">{b.department}</td>
                  <td className="px-5 py-3 font-medium text-sfrc-800">{b.shelf_location}</td>
                  <td className="px-5 py-3">
                    <span
                      className={cn(
                        'px-2.5 py-0.5 rounded-full font-bold text-[11px] inline-flex items-center gap-1',
                        b.available_copies > 0
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      )}
                    >
                      {b.available_copies} / {b.total_copies} Available
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => toast.success(`Issue slip prepared for ${b.accession_no}`)}
                      className="px-2.5 py-1 rounded-lg bg-sfrc-100 hover:bg-sfrc-200 text-sfrc-800 font-bold text-[11px] transition-colors"
                    >
                      Issue Book
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Bottom Pragya AI Assistant ────────────────────────────────────── */}
      <AskPragyaBanner />
    </div>
  );
}
