'use client';


import Link from 'next/link';
import { Calendar, Clock, MapPin, ArrowLeft } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import AskPragyaBanner from '@/components/shared/AskPragyaBanner';

export default function ParentEventsPage() {
  const events = [
    {
      id: 'e-1',
      title: 'Parent-Teacher Association (PTA) General Body Meeting',
      date: '15 Oct 2026',
      time: '10:00 AM - 1:00 PM',
      venue: 'Multipurpose Auditorium, Main Block',
      category: 'PTA Meeting',
      description: 'Annual parent-teacher interaction to discuss academic progression, skill enhancement initiatives, and placement records.',
    },
    {
      id: 'e-2',
      title: 'TechnoFemme 2026 - Inter-Collegiate Science Expo',
      date: '24 Oct 2026',
      time: '9:30 AM - 4:30 PM',
      venue: 'Science Block Seminar Hall',
      category: 'Campus Event',
      description: 'Grand science and technology exhibition featuring student projects and innovations. Parents are welcome to visit.',
    },
    {
      id: 'e-3',
      title: 'College Day & Graduation Awards Ceremony',
      date: '12 Dec 2026',
      time: '10:30 AM - 2:00 PM',
      venue: 'Open Air Theatre (OAT)',
      category: 'College Celebration',
      description: 'Annual college day celebrating academic achievers, university rank holders, and cultural talents.',
    },
  ];

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
              Institutional events, PTA conferences, and campus functions
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {events.map((ev) => (
            <div
              key={ev.id}
              className="bg-white rounded-3xl border border-sfrc-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              <div className="space-y-2 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-sfrc-100 text-sfrc-800">
                  {ev.category}
                </span>
                <h2 className="text-base font-black text-sfrc-900">{ev.title}</h2>
                <p className="text-xs text-sfrc-600 leading-relaxed">{ev.description}</p>
                <div className="flex flex-wrap items-center gap-4 text-xs text-sfrc-700 font-medium pt-1">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-sfrc-500" />
                    <span>{ev.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-sfrc-500" />
                    <span>{ev.time}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-sfrc-500" />
                    <span>{ev.venue}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <AskPragyaBanner />
      </div>
    </AppShell>
  );
}
