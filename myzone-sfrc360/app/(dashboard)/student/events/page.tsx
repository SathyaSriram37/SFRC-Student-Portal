'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Search, Sparkles, CheckCircle2, Building2, RefreshCw, ChevronRight, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { apiGet, apiPost, apiDelete } from '@/lib/api-client';

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

export default function StudentEventsPage() {
  const [events, setEvents] = useState<EventDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'registered' | 'past'>('all');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedEvent, setSelectedEvent] = useState<EventDetail | null>(null);
  const [registeringId, setRegisteringId] = useState<string | null>(null);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const loadEvents = async () => {
    try {
      const res = await apiGet<{ events: EventDetail[]; total: number }>('/api/v1/events');
      if (res && res.events) {
        setEvents(res.events);
      }
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await apiGet<{ events: EventDetail[]; total: number }>('/api/v1/events');
        if (!ignore && res && res.events) {
          setEvents(res.events);
        }
      } catch (err) {
        console.error('Failed to load events:', err);
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      ignore = true;
    };
  }, []);

  const handleRegister = async (event: EventDetail) => {
    try {
      setRegisteringId(event.id);
      const res = await apiPost<{ status: string; message: string; registration_id: string }>(
        `/api/v1/events/${event.id}/register`,
        {}
      );

      // Optimistic update
      setEvents((prev) =>
        prev.map((e) =>
          e.id === event.id
            ? { ...e, is_registered: true, registered_count: e.registered_count + 1 }
            : e
        )
      );

      if (selectedEvent && selectedEvent.id === event.id) {
        setSelectedEvent((prev) => (prev ? { ...prev, is_registered: true, registered_count: prev.registered_count + 1 } : null));
      }

      setSuccessMsg(res.message || 'Registration confirmed! Digital Pass generated.');
      setSuccessModalOpen(true);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to register for event');
    } finally {
      setRegisteringId(null);
    }
  };

  const handleCancelRegistration = async (event: EventDetail) => {
    if (!confirm('Are you sure you want to cancel your event registration?')) return;
    try {
      setRegisteringId(event.id);
      await apiDelete(`/api/v1/events/${event.id}/register`);

      setEvents((prev) =>
        prev.map((e) =>
          e.id === event.id
            ? { ...e, is_registered: false, registered_count: Math.max(0, e.registered_count - 1) }
            : e
        )
      );

      if (selectedEvent && selectedEvent.id === event.id) {
        setSelectedEvent((prev) => (prev ? { ...prev, is_registered: false, registered_count: Math.max(0, prev.registered_count - 1) } : null));
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to cancel registration');
    } finally {
      setRegisteringId(null);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredEvents = events.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.venue.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'All' || e.category.toLowerCase() === selectedCategory.toLowerCase();

    let matchesTab = true;
    if (activeTab === 'upcoming') {
      matchesTab = e.start_date >= todayStr;
    } else if (activeTab === 'registered') {
      matchesTab = e.is_registered;
    } else if (activeTab === 'past') {
      matchesTab = e.start_date < todayStr;
    }

    return matchesSearch && matchesCategory && matchesTab;
  });

  const getCategoryColor = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'technical':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'cultural':
        return 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'sports':
        return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'workshop':
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'career':
        return 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
      default:
        return 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sfrc-800 via-sfrc-900 to-slate-950 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-sfrc-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-medium text-sfrc-200">
              <Calendar className="w-3.5 h-3.5 text-amber-300" />
              SFRC Campus Events & Competitions
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Campus Events & Symposia</h1>
            <p className="text-sm text-slate-300 max-w-xl">
              Discover national symposiums, hackathons, cultural festivals, sports tournaments, and workshops.
              Reserve your seat with one-click digital pass generation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={loadEvents}
              className="border-white/20 bg-white/5 hover:bg-white/10 text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Events
            </Button>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-border">
        {(
          [
            { id: 'all', label: 'All Events' },
            { id: 'upcoming', label: 'Upcoming' },
            { id: 'registered', label: `Registered (${events.filter((e) => e.is_registered).length})` },
            { id: 'past', label: 'Past Events' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-sfrc-600 text-sfrc-600 dark:text-sfrc-400 font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search and Category Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search event title, speaker, department, or venue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
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

      {/* Events Grid (3-col desktop, 2 tablet, 1 mobile) */}
      {isLoading ? (
        <div className="py-16 text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-sfrc-600" />
          <p className="text-sm text-muted-foreground">Loading SFRC campus events and seat capacities...</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <Card className="py-16 text-center">
          <CardContent className="space-y-4">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto stroke-1" />
            <div>
              <h3 className="text-lg font-semibold">No events found</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                No events match your selected filters or registration history.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => {
            const isFull = event.registered_count >= event.max_capacity;
            const isClosed = !event.is_registration_open || event.status === 'completed';
            const isPast = event.start_date < todayStr;
            const isReg = event.is_registered;

            const dateObj = new Date(event.start_date);
            const monthStr = dateObj.toLocaleString('default', { month: 'short' }).toUpperCase();
            const dayStr = dateObj.getDate();

            return (
              <Card
                key={event.id}
                className="hover:shadow-lg transition-all border border-border bg-card flex flex-col justify-between overflow-hidden group"
              >
                <div>
                  {/* Event Image / Banner */}
                  {event.poster_url && (
                    <div className="relative h-44 w-full overflow-hidden bg-slate-900">
                      <img
                        src={event.poster_url}
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                      {/* Date Pill (sfrc-accent) */}
                      <div className="absolute top-3 left-3 px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-md flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>
                          {monthStr} {dayStr}
                        </span>
                      </div>

                      {/* Category Badge */}
                      <div className="absolute top-3 right-3">
                        <Badge className={`text-xs backdrop-blur-md ${getCategoryColor(event.category)}`}>
                          {event.category}
                        </Badge>
                      </div>

                      {/* Department Tag at Bottom of Banner */}
                      <div className="absolute bottom-2 left-3 text-[11px] text-white/90 font-medium flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-amber-300" />
                        {event.department}
                      </div>
                    </div>
                  )}

                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-bold line-clamp-2 leading-snug">
                      {event.title}
                    </CardTitle>
                    <CardDescription className="text-xs line-clamp-2 pt-1">
                      {event.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3 text-xs text-muted-foreground pt-0">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-sfrc-600 flex-shrink-0" />
                      <span className="font-medium text-foreground">{event.venue}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>{event.time}</span>
                    </div>

                    {/* Capacity Progress Bar */}
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-[11px]">
                        <span>Capacity: {event.registered_count} / {event.max_capacity}</span>
                        <span className={isFull ? 'text-rose-600 font-semibold' : 'text-emerald-600'}>
                          {isFull ? 'Full' : `${event.max_capacity - event.registered_count} seats left`}
                        </span>
                      </div>
                      <Progress
                        value={Math.min(100, (event.registered_count / event.max_capacity) * 100)}
                        className="h-1.5"
                      />
                    </div>
                  </CardContent>
                </div>

                {/* Card Footer Actions */}
                <div className="p-4 border-t border-border bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedEvent(event)}
                    className="text-xs text-sfrc-700 dark:text-sfrc-300 hover:bg-sfrc-50 dark:hover:bg-sfrc-950 px-2"
                  >
                    Details
                    <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                  </Button>

                  {isReg ? (
                    <Button
                      size="sm"
                      onClick={() => handleCancelRegistration(event)}
                      disabled={registeringId === event.id}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Registered ✓
                    </Button>
                  ) : isPast ? (
                    <Button size="sm" disabled variant="outline" className="text-xs text-muted-foreground">
                      Past Event
                    </Button>
                  ) : isFull ? (
                    <Button size="sm" disabled variant="outline" className="text-xs text-rose-600 border-rose-200">
                      Registration Full
                    </Button>
                  ) : isClosed ? (
                    <Button size="sm" disabled variant="outline" className="text-xs">
                      Closed
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleRegister(event)}
                      disabled={registeringId === event.id}
                      className="bg-sfrc-700 hover:bg-sfrc-800 text-white text-xs font-semibold shadow-sm"
                    >
                      {registeringId === event.id ? 'Registering...' : 'Register Now'}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── EVENT DETAILS DIALOG ────────────────────────────────────────────── */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedEvent && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <Badge className={getCategoryColor(selectedEvent.category)}>{selectedEvent.category}</Badge>
                  <span className="text-xs text-muted-foreground">{selectedEvent.department}</span>
                </div>
                <DialogTitle className="text-xl pt-2">{selectedEvent.title}</DialogTitle>
                <DialogDescription className="text-xs flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-sfrc-600" />
                  {selectedEvent.venue} • {selectedEvent.start_date} ({selectedEvent.time})
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {selectedEvent.poster_url && (
                  <div className="w-full h-52 rounded-xl overflow-hidden bg-slate-900">
                    <img
                      src={selectedEvent.poster_url}
                      alt={selectedEvent.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="space-y-2 text-xs">
                  <div className="font-semibold text-foreground">About the Event:</div>
                  <p className="text-muted-foreground leading-relaxed">{selectedEvent.description}</p>
                </div>

                {selectedEvent.speaker_details && (
                  <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs space-y-1">
                    <span className="font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      Keynote Speaker & Resource Person:
                    </span>
                    <p className="text-amber-800 dark:text-amber-300">{selectedEvent.speaker_details}</p>
                  </div>
                )}

                <div className="p-4 rounded-xl border border-border bg-card space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Venue:</span>
                    <span className="font-semibold text-foreground">{selectedEvent.venue}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Timing:</span>
                    <span className="font-semibold text-foreground">{selectedEvent.time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Confirmed Registrations:</span>
                    <span className="font-semibold text-foreground">
                      {selectedEvent.registered_count} / {selectedEvent.max_capacity} Seats
                    </span>
                  </div>
                </div>
              </div>

              <DialogFooter className="flex flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setSelectedEvent(null)}>
                  Close
                </Button>

                {selectedEvent.is_registered ? (
                  <Button
                    onClick={() => handleCancelRegistration(selectedEvent)}
                    disabled={registeringId === selectedEvent.id}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    Registered ✓ (Click to Cancel)
                  </Button>
                ) : selectedEvent.registered_count >= selectedEvent.max_capacity ? (
                  <Button disabled variant="outline" className="text-rose-600 border-rose-200">
                    Registration Full
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleRegister(selectedEvent)}
                    disabled={registeringId === selectedEvent.id}
                    className="bg-sfrc-700 hover:bg-sfrc-800 text-white font-semibold"
                  >
                    {registeringId === selectedEvent.id ? 'Registering...' : 'Register for Event'}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── SUCCESS REGISTRATION MODAL ──────────────────────────────────────── */}
      <Dialog open={successModalOpen} onOpenChange={setSuccessModalOpen}>
        <DialogContent className="max-w-md text-center py-8">
          <div className="w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md mb-2">
            <Check className="w-7 h-7" />
          </div>
          <DialogTitle className="text-xl font-bold">Registration Confirmed!</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground pt-1">
            {successMsg}
          </DialogDescription>
          <DialogFooter className="sm:justify-center pt-4">
            <Button
              onClick={() => setSuccessModalOpen(false)}
              className="bg-sfrc-700 hover:bg-sfrc-800 text-white"
            >
              Done & View Events
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
