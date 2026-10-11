'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Search,
  Sparkles,
  CheckCircle2,
  Building2,
  RefreshCw,
  ChevronRight,
  Loader2,
  Users,
  Tag,
  Award,
} from 'lucide-react';
import { toast } from 'sonner';
import AppShell from '@/components/layout/AppShell';
import { createClient } from '@/lib/supabase/client';
import { apiGet, apiPost } from '@/lib/api-client';

interface EventDetail {
  id: string;
  title: string;
  description: string;
  category: string;
  department: string;
  venue: string;
  start_date: string;
  end_date: string;
  time: string;
  max_capacity: number;
  registered_count: number;
  is_registration_open: boolean;
  poster_url?: string;
  speaker_details?: string;
  status: string;
  is_registered: boolean;
  created_at: string;
}

const CATEGORIES = ['All', 'Technical', 'Cultural', 'Sports', 'Academic', 'Workshop', 'Career'];

export default function FacultyEventsPage() {
  const [events, setEvents] = useState<EventDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedEvent, setSelectedEvent] = useState<EventDetail | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  const loadEvents = async () => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await apiGet<{ events: EventDetail[]; total: number }>('/api/v1/events', token);
      if (res && res.events) {
        setEvents(res.events);
      }
    } catch (err: unknown) {
      console.error('Failed to load events:', err);
      const msg = err instanceof Error ? err.message : 'Failed to fetch campus events.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [supabase]);

  const handleRegister = async (eventId: string) => {
    try {
      setIsRegistering(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      await apiPost(`/api/v1/events/${eventId}/register`, {}, token);
      toast.success('Successfully registered for event attendance / faculty duty!');
      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventId
            ? { ...e, is_registered: true, registered_count: e.registered_count + 1 }
            : e
        )
      );
      if (selectedEvent && selectedEvent.id === eventId) {
        setSelectedEvent({
          ...selectedEvent,
          is_registered: true,
          registered_count: selectedEvent.registered_count + 1,
        });
      }
    } catch (err: unknown) {
      console.error('Registration failed:', err);
      const msg = err instanceof Error ? err.message : 'Failed to register for event.';
      toast.error(msg);
    } finally {
      setIsRegistering(false);
    }
  };

  const filteredEvents = events.filter((e) => {
    const matchesCat = selectedCategory === 'All' || e.category.toLowerCase() === selectedCategory.toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      e.title.toLowerCase().includes(q) ||
      e.department.toLowerCase().includes(q) ||
      e.venue.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  return (
    <AppShell role="faculty" userName="Faculty">
      <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white p-6 rounded-3xl border border-sfrc-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sfrc-100 text-sfrc-700 text-xs font-bold uppercase tracking-wider mb-2">
              <Calendar className="w-3.5 h-3.5" />
              Institutional Events & Symposia
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-sfrc-900 tracking-tight">
              Campus Events & Conferences
            </h1>
            <p className="text-xs sm:text-sm text-sfrc-600 mt-1">
              National symposiums, faculty development workshops, guest lectures, and cultural celebrations.
            </p>
          </div>

          <button
            onClick={loadEvents}
            className="self-start md:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-sfrc-50 hover:bg-sfrc-100 text-sfrc-800 border border-sfrc-200 text-xs font-bold transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Events
          </button>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-3xl border border-sfrc-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-sfrc-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search events, venues, departments..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-sfrc-200 bg-sfrc-50 text-xs text-sfrc-900 focus:outline-none focus:ring-2 focus:ring-sfrc-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-sfrc-900 text-white'
                      : 'bg-sfrc-50 text-sfrc-700 hover:bg-sfrc-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Events Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20 bg-white rounded-3xl border border-sfrc-200">
            <Loader2 className="w-8 h-8 animate-spin text-sfrc-600" />
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="bg-white rounded-3xl border border-sfrc-200 p-12 text-center space-y-3">
            <Calendar className="w-12 h-12 text-sfrc-300 mx-auto" />
            <h3 className="text-base font-bold text-sfrc-900">No Events Found</h3>
            <p className="text-xs text-sfrc-500 max-w-md mx-auto">
              No campus events found matching your search or category filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((evt) => (
              <div
                key={evt.id}
                className="bg-white rounded-3xl border border-sfrc-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-sfrc-100 text-sfrc-800 text-xs font-bold">
                      {evt.category}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        evt.status === 'upcoming'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-sfrc-100 text-sfrc-600'
                      }`}
                    >
                      {evt.status.toUpperCase()}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-sfrc-900 line-clamp-2">
                      {evt.title}
                    </h3>
                    <p className="text-xs text-sfrc-500 mt-1 line-clamp-2">
                      {evt.description}
                    </p>
                  </div>

                  <div className="space-y-2 text-xs text-sfrc-600 pt-2 border-t border-sfrc-100">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-sfrc-400" />
                      <span>{evt.start_date} {evt.end_date !== evt.start_date ? `to ${evt.end_date}` : ''}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-sfrc-400" />
                      <span>{evt.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-sfrc-400" />
                      <span>{evt.venue}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-sfrc-400" />
                      <span>{evt.registered_count} / {evt.max_capacity} registered</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-sfrc-50 border-t border-sfrc-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedEvent(evt)}
                    className="text-xs font-bold text-sfrc-700 hover:text-sfrc-900"
                  >
                    View Details
                  </button>

                  {evt.is_registered ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Registered
                    </span>
                  ) : evt.is_registration_open ? (
                    <button
                      onClick={() => handleRegister(evt.id)}
                      disabled={isRegistering}
                      className="px-4 py-1.5 rounded-xl bg-sfrc-900 hover:bg-sfrc-800 text-white text-xs font-bold transition-all disabled:opacity-60"
                    >
                      Faculty RSVP
                    </button>
                  ) : (
                    <span className="text-xs text-sfrc-400 font-medium">Closed</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Event Detail Modal */}
        {selectedEvent && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-sfrc-200 space-y-5">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-lg bg-sfrc-100 text-sfrc-800 text-xs font-bold">
                  {selectedEvent.category} • {selectedEvent.department}
                </span>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="w-8 h-8 rounded-full bg-sfrc-100 hover:bg-sfrc-200 flex items-center justify-center text-sfrc-700 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div>
                <h3 className="text-xl font-bold text-sfrc-900">
                  {selectedEvent.title}
                </h3>
                <p className="text-xs text-sfrc-600 mt-2 leading-relaxed">
                  {selectedEvent.description}
                </p>
              </div>

              {selectedEvent.speaker_details && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 text-xs text-amber-900">
                  <strong className="block font-bold mb-0.5">Speaker / Guest Dignitary:</strong>
                  {selectedEvent.speaker_details}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-xs bg-sfrc-50 p-4 rounded-2xl border border-sfrc-100">
                <div>
                  <span className="text-sfrc-500 block mb-0.5">Date & Time</span>
                  <span className="font-bold text-sfrc-900">{selectedEvent.start_date} • {selectedEvent.time}</span>
                </div>
                <div>
                  <span className="text-sfrc-500 block mb-0.5">Venue</span>
                  <span className="font-bold text-sfrc-900">{selectedEvent.venue}</span>
                </div>
                <div>
                  <span className="text-sfrc-500 block mb-0.5">Department Host</span>
                  <span className="font-bold text-sfrc-900">{selectedEvent.department}</span>
                </div>
                <div>
                  <span className="text-sfrc-500 block mb-0.5">Registrations</span>
                  <span className="font-bold text-sfrc-900">{selectedEvent.registered_count} / {selectedEvent.max_capacity}</span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="px-4 py-2 rounded-xl bg-sfrc-100 text-sfrc-800 text-xs font-bold"
                >
                  Close
                </button>
                {!selectedEvent.is_registered && selectedEvent.is_registration_open && (
                  <button
                    onClick={() => handleRegister(selectedEvent.id)}
                    disabled={isRegistering}
                    className="px-5 py-2 rounded-xl bg-sfrc-900 text-white text-xs font-bold hover:bg-sfrc-800"
                  >
                    Confirm Faculty Attendance
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
