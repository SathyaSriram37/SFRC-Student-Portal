'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
  Wrench,
  Search,
  Filter,
  Monitor,
  Zap,
  Activity,
  ArrowRight,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import AskPragyaBanner from '@/components/shared/AskPragyaBanner';
import { createClient } from '@/lib/supabase/client';
import { apiGet, apiPost } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface FacilityItem {
  id: string;
  name: string;
  code: string;
  category: 'Auditorium' | 'Seminar Hall' | 'Computer Lab' | 'Science Lab' | 'Smart Classroom';
  block: string;
  capacity: number;
  status: 'Available' | 'Occupied' | 'Maintenance' | 'Reserved';
  features: string[];
  incharge_faculty: string;
}

const DEFAULT_FACILITIES: FacilityItem[] = [
  {
    id: 'fac-1',
    name: 'K.A.A. Main Auditorium',
    code: 'AUD-MAIN',
    category: 'Auditorium',
    block: 'Central Block (Ground Floor)',
    capacity: 1200,
    status: 'Available',
    features: ['JBL Pro Sound', 'LED Video Wall', 'Centralized AC', 'Green Rooms'],
    incharge_faculty: 'Dr. S. Meenakshi',
  },
  {
    id: 'fac-2',
    name: 'Silver Jubilee AV Seminar Hall',
    code: 'AV-HALL-1',
    category: 'Seminar Hall',
    block: 'Science Block (First Floor)',
    capacity: 250,
    status: 'Occupied',
    features: ['High-Lumen Projector', 'Surround Audio', 'Stage Lighting', 'Podium Mic'],
    incharge_faculty: 'Dr. K. Anitha',
  },
  {
    id: 'fac-3',
    name: 'MCA Cloud & AI Computing Lab 3',
    code: 'LAB-MCA-3',
    category: 'Computer Lab',
    block: 'MCA & IT Block (Second Floor)',
    capacity: 75,
    status: 'Available',
    features: ['Gigabit LAN', 'i7 16GB Terminals', 'Smart Board', 'UPS Backup (10kVA)'],
    incharge_faculty: 'Mrs. P. Subbulakshmi',
  },
  {
    id: 'fac-4',
    name: 'DST-FIST Central Instrumentation Facility',
    code: 'CIF-LAB-1',
    category: 'Science Lab',
    block: 'PG & Research Block',
    capacity: 40,
    status: 'Available',
    features: ['UV-Vis Spectrophotometer', 'HPLC System', 'FTIR Spectrometer'],
    incharge_faculty: 'Dr. M. Geetha',
  },
  {
    id: 'fac-5',
    name: 'Smart Interactive Lecture Hall 104',
    code: 'LH-104',
    category: 'Smart Classroom',
    block: 'Arts & Commerce Block',
    capacity: 80,
    status: 'Available',
    features: ['Interactive Touch Panel', 'Wi-Fi 6', 'Dual Microphones'],
    incharge_faculty: 'Dr. V. Lakshmi',
  },
  {
    id: 'fac-6',
    name: 'Sports Complex & Indoor Gymnasium',
    code: 'GYM-IND',
    category: 'Auditorium',
    block: 'Physical Education Block',
    capacity: 350,
    status: 'Available',
    features: ['Wooden Badminton Courts', 'Fitness Gear', 'Table Tennis Arena'],
    incharge_faculty: 'Dr. B. Meenakshi Sundari',
  },
];

export default function AdminFacilitiesPage() {
  const [facilities, setFacilities] = useState<FacilityItem[]>(DEFAULT_FACILITIES);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [bookForm, setBookForm] = useState({
    facility_name: 'K.A.A. Main Auditorium',
    booking_date: new Date().toISOString().slice(0, 10),
    time_slot: '09:30 AM - 12:30 PM',
    purpose: '',
    organizer_name: '',
    department: 'Department of Computer Science',
    expected_attendees: 100,
  });

  const supabase = useMemo(() => createClient(), []);

  const handleBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookForm.purpose || !bookForm.organizer_name) {
      toast.error('Please enter the booking purpose and organizer name.');
      return;
    }
    try {
      setSubmitting(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      await apiPost('/api/v1/admin/facilities/bookings', bookForm, token);
      toast.success(`Venue "${bookForm.facility_name}" reserved and saved to database!`);
      setIsBookModalOpen(false);
      setBookForm({
        facility_name: 'K.A.A. Main Auditorium',
        booking_date: new Date().toISOString().slice(0, 10),
        time_slot: '09:30 AM - 12:30 PM',
        purpose: '',
        organizer_name: '',
        department: 'Department of Computer Science',
        expected_attendees: 100,
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to book venue in database.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = useMemo(() => {
    return facilities.filter((f) => {
      const matchCat = categoryFilter === 'ALL' || f.category === categoryFilter;
      const matchSearch =
        f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.block.toLowerCase().includes(searchTerm.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [facilities, categoryFilter, searchTerm]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* ── Top Header ────────────────────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-3xl border border-sfrc-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sfrc-100 text-sfrc-700 text-xs font-bold uppercase tracking-wider mb-2">
            <Building2 className="w-3.5 h-3.5" />
            Campus Infrastructure & Venue Allocation
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-sfrc-900 tracking-tight">
            Campus Facilities & Booking Matrix
          </h1>
          <p className="text-xs sm:text-sm text-sfrc-600 mt-1">
            Monitor auditoriums, computing laboratories, seminar halls, and smart classrooms.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsBookModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sfrc-700 text-white text-xs font-bold hover:bg-sfrc-800 transition-colors shadow-sm cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Book Venue / Hall</span>
          </button>
        </div>
      </div>

      {/* ── KPI Summary Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Total Venues</span>
            <Building2 className="w-4 h-4 text-sfrc-700" />
          </div>
          <p className="text-2xl font-black text-sfrc-900 mt-2 font-mono">34</p>
          <p className="text-xs text-sfrc-600 mt-0.5">Auditoriums, Labs, Halls</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Available Now</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2 font-mono">29</p>
          <p className="text-xs text-sfrc-600 mt-0.5">Ready for immediate booking</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Scheduled Today</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-blue-700 mt-2 font-mono">5</p>
          <p className="text-xs text-sfrc-600 mt-0.5">Seminars & Practical Exams</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Maintenance</span>
            <Wrench className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-700 mt-2 font-mono">0</p>
          <p className="text-xs text-sfrc-600 mt-0.5">100% Operational Status</p>
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
            placeholder="Search venue name, code, or block..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-sfrc-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sfrc-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
          {['ALL', 'Auditorium', 'Seminar Hall', 'Computer Lab', 'Science Lab', 'Smart Classroom'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors',
                categoryFilter === cat
                  ? 'bg-sfrc-900 text-white'
                  : 'bg-sfrc-100 text-sfrc-700 hover:bg-sfrc-200'
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── Facilities Card Grid ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((fac) => (
          <div
            key={fac.id}
            className="bg-white rounded-3xl border border-sfrc-200 p-6 shadow-sm hover:border-sfrc-400 transition-all flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-md bg-sfrc-100 text-sfrc-800 font-mono font-bold text-xs">
                  {fac.code}
                </span>
                <span
                  className={cn(
                    'px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1',
                    fac.status === 'Available'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  )}
                >
                  <span
                    className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      fac.status === 'Available' ? 'bg-emerald-500' : 'bg-amber-500'
                    )}
                  />
                  {fac.status}
                </span>
              </div>

              <div>
                <h3 className="text-lg font-black text-sfrc-900 tracking-tight">{fac.name}</h3>
                <p className="text-xs text-sfrc-600 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-sfrc-500 shrink-0" />
                  {fac.block}
                </p>
              </div>

              <div className="flex items-center gap-4 py-2 border-y border-sfrc-100 text-xs">
                <div>
                  <p className="text-[11px] text-sfrc-500 font-semibold">Capacity</p>
                  <p className="font-bold text-sfrc-900 font-mono">{fac.capacity} Seats</p>
                </div>
                <div className="h-6 w-px bg-sfrc-200" />
                <div>
                  <p className="text-[11px] text-sfrc-500 font-semibold">In-charge</p>
                  <p className="font-bold text-sfrc-900 truncate max-w-[140px]">{fac.incharge_faculty}</p>
                </div>
              </div>

              <div>
                <p className="text-[11px] text-sfrc-500 font-semibold mb-1.5">Equipped Infrastructure:</p>
                <div className="flex flex-wrap gap-1.5">
                  {fac.features.map((feat, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-sfrc-50 border border-sfrc-200 text-sfrc-700 text-[11px] font-medium"
                    >
                      {feat}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-sfrc-100">
              <button
                onClick={() => toast.success(`Reservation request initialized for ${fac.name}`)}
                className="w-full py-2 px-3 rounded-xl bg-sfrc-100 hover:bg-sfrc-200 text-sfrc-800 text-xs font-bold transition-colors text-center"
              >
                Schedule / Reserve Facility
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Bottom Pragya AI Banner ───────────────────────────────────────── */}
      <AskPragyaBanner />

      {/* ── VENUE BOOKING MODAL ────────────────────────────────────────────── */}
      {isBookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-sfrc-200 relative">
            <button
              onClick={() => setIsBookModalOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-xl text-sfrc-400 hover:text-sfrc-700 hover:bg-sfrc-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-sfrc-100 flex items-center justify-center text-sfrc-800">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-sfrc-900">Book Campus Venue</h3>
                <p className="text-xs text-sfrc-500">Autonomous venue reservation & calendar booking</p>
              </div>
            </div>

            <form onSubmit={handleBookSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-sfrc-700 uppercase mb-1">Select Facility / Venue</label>
                <select
                  value={bookForm.facility_name}
                  onChange={(e) => setBookForm({ ...bookForm, facility_name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-sfrc-200 text-xs font-medium focus:ring-2 focus:ring-sfrc-700 focus:outline-hidden"
                >
                  {DEFAULT_FACILITIES.map((f) => (
                    <option key={f.id} value={f.name}>{f.name} ({f.block})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-sfrc-700 uppercase mb-1">Booking Date</label>
                  <input
                    type="date"
                    required
                    value={bookForm.booking_date}
                    onChange={(e) => setBookForm({ ...bookForm, booking_date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-sfrc-200 text-xs font-medium focus:ring-2 focus:ring-sfrc-700 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-sfrc-700 uppercase mb-1">Time Slot</label>
                  <select
                    value={bookForm.time_slot}
                    onChange={(e) => setBookForm({ ...bookForm, time_slot: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-sfrc-200 text-xs font-medium focus:ring-2 focus:ring-sfrc-700 focus:outline-hidden"
                  >
                    <option value="09:30 AM - 12:30 PM">Morning (09:30 AM - 12:30 PM)</option>
                    <option value="01:30 PM - 04:30 PM">Afternoon (01:30 PM - 04:30 PM)</option>
                    <option value="09:30 AM - 04:30 PM">Full Day (09:30 AM - 04:30 PM)</option>
                    <option value="05:00 PM - 08:00 PM">Evening Special Event</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-sfrc-700 uppercase mb-1">Event / Purpose</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. National Seminar on Cloud Architecture & AI"
                  value={bookForm.purpose}
                  onChange={(e) => setBookForm({ ...bookForm, purpose: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-sfrc-200 text-xs font-medium focus:ring-2 focus:ring-sfrc-700 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-sfrc-700 uppercase mb-1">Organizer Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. K. Anitha"
                    value={bookForm.organizer_name}
                    onChange={(e) => setBookForm({ ...bookForm, organizer_name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-sfrc-200 text-xs font-medium focus:ring-2 focus:ring-sfrc-700 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-sfrc-700 uppercase mb-1">Expected Attendees</label>
                  <input
                    type="number"
                    min={10}
                    max={1500}
                    value={bookForm.expected_attendees}
                    onChange={(e) => setBookForm({ ...bookForm, expected_attendees: parseInt(e.target.value) || 50 })}
                    className="w-full px-4 py-2.5 rounded-xl border border-sfrc-200 text-xs font-medium focus:ring-2 focus:ring-sfrc-700 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsBookModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-sfrc-600 hover:bg-sfrc-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-sfrc-700 hover:bg-sfrc-800 text-white transition-colors shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Confirming Reservation…' : 'Reserve Venue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
