'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Calendar, Clock, MapPin, ArrowLeft, Tag } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import AskPragyaBanner from '@/components/shared/AskPragyaBanner';
import { createClient } from '@/lib/supabase/client';
import { apiGet } from '@/lib/api-client';

interface EventItem {
  id: string;
  title: string;
  description: string;
  category: string;
  department?: string;
  venue: string;
  start_date: string;
  end_date?: string;
  time?: string;
  is_registration_open?: boolean;
}

export default function ParentEventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let ignore = false;
    async function loadEvents() {
      setIsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const res = await apiGet<{ events?: EventItem[] } | EventItem[]>('/api/v1/events', token);
        if (!ignore) {
          if (Array.isArray(res)) {
            setEvents(res);
          } else if (res && Array.isArray(res.events)) {
            setEvents(res.events);
          } else {
            setEvents([]);
          }
        }
      } catch (err) {
        console.error('Failed to load events:', err);
        if (!ignore) setEvents([]);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }
    loadEvents();
    return () => { ignore = true; };
  }, [supabase]);

  return (
    <AppShell role="parent" userName="Parent">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <Link
            href="/parent/dashboard"
            className="w-10 h-10 rounded-2xl bg-white border border-sfrc-200 flex items-center justify-center text-sfrc-700 hover:bg-sfrc-50 transition-colors shadow-xs"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-sfrc-900 tracking-tight flex items-center gap-2">
              <Calendar className="w-6 h-6 text-sfrc-700" />
              College Events & Parent Gatherings
            </h1>
            <p className="text-xs text-sfrc-600">
              Official institutional events, PTA conferences, and campus celebrations
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {events.length > 0 ? (
            events.map((ev) => (
              <div
                key={ev.id}
                className="bg-white rounded-3xl border border-sfrc-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="space-y-2 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-sfrc-100 text-sfrc-800">
                    {ev.category || 'General'}
                  </span>
                  <h2 className="text-base font-black text-sfrc-900">{ev.title}</h2>
                  <p className="text-xs text-sfrc-600 leading-relaxed">{ev.description}</p>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-sfrc-700 font-medium pt-1">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-sfrc-500" />
                      <span>{ev.start_date}</span>
                    </div>
                    {ev.time && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-sfrc-500" />
                        <span>{ev.time}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-sfrc-500" />
                      <span>{ev.venue}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-3xl border border-sfrc-200 p-8 text-center text-xs text-sfrc-500">
              {isLoading ? 'Loading campus events...' : 'No upcoming institutional events found.'}
            </div>
          )}
        </div>

        <AskPragyaBanner />
      </div>
    </AppShell>
  );
}
