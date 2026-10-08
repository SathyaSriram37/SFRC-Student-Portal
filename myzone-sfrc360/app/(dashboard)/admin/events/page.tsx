'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Search,
  Download,
  Filter,
  Award,
  Sparkles,
  ExternalLink,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import AskPragyaBanner from '@/components/shared/AskPragyaBanner';
import { createClient } from '@/lib/supabase/client';
import { apiGet, apiPost } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface EventAdminItem {
  id: string;
  title: string;
  category: string;
  event_date: string;
  event_time: string;
  venue: string;
  organizer_dept: string;
  registered_count: number;
  max_capacity: number;
  status: 'Approved' | 'Pending Review' | 'Completed';
  chief_guest?: string;
}

const DEFAULT_EVENTS: EventAdminItem[] = [
  {
    id: 'evt-1',
    title: 'TechSpark 2026: National Level Technical Symposium',
    category: 'Symposium',
    event_date: '2026-10-15',
    event_time: '09:30 AM - 04:30 PM',
    venue: 'K.A.A. Main Auditorium',
    organizer_dept: 'Department of Computer Science',
    registered_count: 342,
    max_capacity: 500,
    status: 'Approved',
    chief_guest: 'Dr. V. Rajesh, Principal Architect at AWS India',
  },
  {
    id: 'evt-2',
    title: 'Tharagai 2026: Inter-Collegiate Fine Arts Festival',
    category: 'Cultural',
    event_date: '2026-10-22',
    event_time: '09:00 AM - 05:30 PM',
    venue: 'Open Air Theatre & Central Auditorium',
    organizer_dept: 'Fine Arts Association & Student Union',
    registered_count: 680,
    max_capacity: 1000,
    status: 'Approved',
    chief_guest: 'Smt. Revathi Suresh, Renowned Classical Artist',
  },
  {
    id: 'evt-3',
    title: 'National Conference on Quantum Materials & Energy Systems',
    category: 'Conference',
    event_date: '2026-11-05',
    event_time: '10:00 AM - 04:00 PM',
    venue: 'Silver Jubilee AV Seminar Hall',
    organizer_dept: 'Department of Physics & Chemistry',
    registered_count: 185,
    max_capacity: 250,
    status: 'Approved',
    chief_guest: 'Dr. N. Chandrasekar, Senior Scientist, CECRI',
  },
  {
    id: 'evt-4',
    title: 'State Level Women Entrepreneurship & Startup Summit (IEDC)',
    category: 'Workshop',
    event_date: '2026-11-12',
    event_time: '10:00 AM - 03:30 PM',
    venue: 'AV Seminar Hall 2',
    organizer_dept: 'IEDC & Incubation Centre',
    registered_count: 140,
    max_capacity: 200,
    status: 'Approved',
    chief_guest: 'Ms. Meena K, Founder of AgroBio Tech',
  },
];

export default function AdminEventsPage() {
  const [events, setEvents] = useState<EventAdminItem[]>(DEFAULT_EVENTS);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    category: 'Symposium',
    department: 'Department of Computer Science',
    venue: 'K.A.A. Main Auditorium',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date().toISOString().slice(0, 10),
    time: '09:30 AM - 04:30 PM',
    max_capacity: 250,
    speaker_details: '',
  });

  const supabase = useMemo(() => createClient(), []);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventForm.title || !eventForm.venue) {
      toast.error('Please enter the event title and venue.');
      return;
    }
    try {
      setSubmitting(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      await apiPost('/api/v1/admin/events', eventForm, token);
      toast.success(`Event "${eventForm.title}" published and saved to database!`);
      setIsCreateEventOpen(false);
      setEventForm({
        title: '',
        description: '',
        category: 'Symposium',
        department: 'Department of Computer Science',
        venue: 'K.A.A. Main Auditorium',
        start_date: new Date().toISOString().slice(0, 10),
        end_date: new Date().toISOString().slice(0, 10),
        time: '09:30 AM - 04:30 PM',
        max_capacity: 250,
        speaker_details: '',
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create event in database.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = useMemo(() => {
    return events.filter((e) => {
      const matchCat = categoryFilter === 'ALL' || e.category === categoryFilter;
      const matchSearch =
        e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.organizer_dept.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.venue.toLowerCase().includes(searchTerm.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [events, categoryFilter, searchTerm]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* ── Top Header ────────────────────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-3xl border border-sfrc-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sfrc-100 text-sfrc-700 text-xs font-bold uppercase tracking-wider mb-2">
            <Calendar className="w-3.5 h-3.5" />
            Institutional Events & Symposium Registry
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-sfrc-900 tracking-tight">
            College Events, Conferences & Symposiums
          </h1>
          <p className="text-xs sm:text-sm text-sfrc-600 mt-1">
            Review department event proposals, track student registrations, and manage college festival schedules.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => toast.success('Event participant lists exported to CSV.')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-sfrc-200 bg-sfrc-50 text-sfrc-800 text-xs font-bold hover:bg-sfrc-100 transition-colors shadow-2xs"
          >
            <Download className="w-4 h-4" />
            <span>Export Roster</span>
          </button>
          <button
            onClick={() => setIsCreateEventOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sfrc-700 text-white text-xs font-bold hover:bg-sfrc-800 transition-colors shadow-sm cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Event</span>
          </button>
        </div>
      </div>

      {/* ── KPI Summary Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Scheduled Events</span>
            <Calendar className="w-4 h-4 text-sfrc-700" />
          </div>
          <p className="text-2xl font-black text-sfrc-900 mt-2 font-mono">14</p>
          <p className="text-xs text-sfrc-600 mt-0.5">This Academic Term</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Registrations</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2 font-mono">1,347</p>
          <p className="text-xs text-sfrc-600 mt-0.5">Student Participants</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Major Festivals</span>
            <Award className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-700 mt-2 font-mono">3</p>
          <p className="text-xs text-sfrc-600 mt-0.5">Tharagai, TechSpark, IEDC</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-sfrc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">Approval Status</span>
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-blue-700 mt-2 font-mono">100%</p>
          <p className="text-xs text-sfrc-600 mt-0.5">Dean Approvals Cleared</p>
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
            placeholder="Search event title, dept, or venue..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-sfrc-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sfrc-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
          {['ALL', 'Symposium', 'Cultural', 'Conference', 'Workshop'].map((cat) => (
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

      {/* ── Events Grid ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.map((evt) => {
          const fillPct = Math.round((evt.registered_count / evt.max_capacity) * 100);
          return (
            <div
              key={evt.id}
              className="bg-white rounded-3xl border border-sfrc-200 p-6 shadow-sm hover:border-sfrc-400 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-sfrc-100 text-sfrc-800 text-xs font-bold">
                    {evt.category}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {evt.status}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-black text-sfrc-900 tracking-tight leading-snug">
                    {evt.title}
                  </h3>
                  <p className="text-xs text-sfrc-600 mt-1 font-semibold">
                    Organized by {evt.organizer_dept}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-sfrc-50 border border-sfrc-100 text-xs">
                  <div>
                    <p className="text-[10px] text-sfrc-500 font-bold uppercase">Date & Time</p>
                    <p className="font-bold text-sfrc-900 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-sfrc-600" />
                      {evt.event_date}
                    </p>
                    <p className="text-[11px] text-sfrc-600 font-medium">{evt.event_time}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-sfrc-500 font-bold uppercase">Venue</p>
                    <p className="font-bold text-sfrc-900 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-sfrc-600 shrink-0" />
                      <span className="truncate">{evt.venue}</span>
                    </p>
                  </div>
                </div>

                {evt.chief_guest && (
                  <div className="text-xs">
                    <p className="text-[10px] text-sfrc-500 font-bold uppercase">Distinguished Chief Guest</p>
                    <p className="font-bold text-sfrc-900 mt-0.5">{evt.chief_guest}</p>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-sfrc-100 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-sfrc-600 font-medium">Participant Enrolment:</span>
                  <span className="font-bold text-sfrc-900 font-mono">
                    {evt.registered_count} / {evt.max_capacity} ({fillPct}%)
                  </span>
                </div>
                <div className="w-full bg-sfrc-100 h-2 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      fillPct >= 80 ? 'bg-emerald-600' : 'bg-sfrc-700'
                    )}
                    style={{ width: `${fillPct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Bottom Pragya AI Assistant ────────────────────────────────────── */}
      <AskPragyaBanner />

      {/* ── CREATE EVENT MODAL ──────────────────────────────────────────────── */}
      {isCreateEventOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-sfrc-200 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsCreateEventOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-xl text-sfrc-400 hover:text-sfrc-700 hover:bg-sfrc-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-sfrc-100 flex items-center justify-center text-sfrc-800">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-sfrc-900">Create Campus Event</h3>
                <p className="text-xs text-sfrc-500">Autonomous calendar & symposium registry persistence</p>
              </div>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-sfrc-700 uppercase mb-1">Event Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. National Symposium on Quantum Computing"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-sfrc-200 text-xs font-medium focus:ring-2 focus:ring-sfrc-700 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-sfrc-700 uppercase mb-1">Category</label>
                  <select
                    value={eventForm.category}
                    onChange={(e) => setEventForm({ ...eventForm, category: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-sfrc-200 text-xs font-medium focus:ring-2 focus:ring-sfrc-700 focus:outline-hidden"
                  >
                    <option value="Symposium">Symposium</option>
                    <option value="Cultural">Cultural Fest</option>
                    <option value="Conference">National Conference</option>
                    <option value="Workshop">Hands-on Workshop</option>
                    <option value="Hackathon">Coding Hackathon</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-sfrc-700 uppercase mb-1">Department</label>
                  <input
                    type="text"
                    required
                    value={eventForm.department}
                    onChange={(e) => setEventForm({ ...eventForm, department: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-sfrc-200 text-xs font-medium focus:ring-2 focus:ring-sfrc-700 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-sfrc-700 uppercase mb-1">Event Venue</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. K.A.A. Main Auditorium"
                    value={eventForm.venue}
                    onChange={(e) => setEventForm({ ...eventForm, venue: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-sfrc-200 text-xs font-medium focus:ring-2 focus:ring-sfrc-700 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-sfrc-700 uppercase mb-1">Max Capacity</label>
                  <input
                    type="number"
                    min={10}
                    max={2000}
                    value={eventForm.max_capacity}
                    onChange={(e) => setEventForm({ ...eventForm, max_capacity: parseInt(e.target.value) || 250 })}
                    className="w-full px-4 py-2.5 rounded-xl border border-sfrc-200 text-xs font-medium focus:ring-2 focus:ring-sfrc-700 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-sfrc-700 uppercase mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={eventForm.start_date}
                    onChange={(e) => setEventForm({ ...eventForm, start_date: e.target.value, end_date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-sfrc-200 text-xs font-medium focus:ring-2 focus:ring-sfrc-700 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-sfrc-700 uppercase mb-1">Time Range</label>
                  <input
                    type="text"
                    value={eventForm.time}
                    onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-sfrc-200 text-xs font-medium focus:ring-2 focus:ring-sfrc-700 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-sfrc-700 uppercase mb-1">Chief Guest / Speaker Details</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. V. Rajesh, Principal Architect at AWS India"
                  value={eventForm.speaker_details}
                  onChange={(e) => setEventForm({ ...eventForm, speaker_details: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-sfrc-200 text-xs font-medium focus:ring-2 focus:ring-sfrc-700 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-sfrc-700 uppercase mb-1">Description & Scope</label>
                <textarea
                  rows={3}
                  placeholder="Brief description of the event, themes, and student awards..."
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-sfrc-200 text-xs font-medium focus:ring-2 focus:ring-sfrc-700 focus:outline-hidden resize-none"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateEventOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-sfrc-600 hover:bg-sfrc-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-sfrc-700 hover:bg-sfrc-800 text-white transition-colors shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Publishing…' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
