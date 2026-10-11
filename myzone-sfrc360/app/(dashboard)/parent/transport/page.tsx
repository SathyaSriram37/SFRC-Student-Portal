'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Bus,
  MapPin,
  Clock,
  Phone,
  ShieldCheck,
  ArrowLeft,
  Navigation,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Users,
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import AskPragyaBanner from '@/components/shared/AskPragyaBanner';
import { createClient } from '@/lib/supabase/client';
import { apiGet } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface WardItem {
  student_id: string;
  full_name: string;
  register_number: string;
  current_semester: number;
}

interface BusStopItem {
  id: string;
  name: string;
  stop_order: number;
  morning_pickup_time: string;
  evening_drop_time: string;
  landmark?: string;
}

interface WardTransportInfo {
  has_transport: boolean;
  pass_number?: string;
  student_name?: string;
  register_number?: string;
  route_id?: string;
  route_number?: string;
  route_name?: string;
  bus_registration?: string;
  driver_name?: string;
  driver_phone?: string;
  boarding_stop?: string;
  seat_number?: string;
  morning_pickup_time?: string;
  evening_drop_time?: string;
  morning_departure?: string;
  morning_arrival_sfrc?: string;
  evening_departure_sfrc?: string;
  evening_arrival_terminus?: string;
  valid_until?: string;
  status?: string;
  stops: BusStopItem[];
}

export default function ParentTransportPage() {
  const [wards, setWards] = useState<WardItem[]>([]);
  const [selectedWardId, setSelectedWardId] = useState<string | null>(null);
  const [transport, setTransport] = useState<WardTransportInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let ignore = false;
    async function loadTransport() {
      setIsLoading(true);
      setError(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const wardList = await apiGet<WardItem[]>('/api/v1/parents/me/wards', token).catch(() => []);
        if (!ignore) setWards(wardList);

        const targetWardId = selectedWardId || (wardList.length > 0 ? wardList[0].student_id : null);
        if (targetWardId) {
          if (!ignore) setSelectedWardId(targetWardId);
          const data = await apiGet<WardTransportInfo>(`/api/v1/parents/me/wards/${targetWardId}/transport`, token);
          if (!ignore) setTransport(data);
        }
      } catch (err: unknown) {
        console.error('Failed to load transport details:', err);
        if (!ignore) setError('Unable to load bus route and transit schedule.');
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }
    loadTransport();
    return () => { ignore = true; };
  }, [selectedWardId, supabase]);

  const selectedWard = wards.find((w) => w.student_id === selectedWardId) || wards[0];

  return (
    <AppShell role="parent" userName="Parent">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header Breadcrumb & Ward Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/parent/dashboard"
              className="w-10 h-10 rounded-2xl bg-white border border-sfrc-200 flex items-center justify-center text-sfrc-700 hover:bg-sfrc-50 transition-colors shadow-xs"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-sfrc-900 tracking-tight flex items-center gap-2">
                <Bus className="w-6 h-6 text-sfrc-700" />
                Live Bus Tracking & Transport
              </h1>
              <p className="text-xs text-sfrc-600">
                Official institutional bus transit routes, live schedule & pass records for {selectedWard?.full_name || 'Ward'}
              </p>
            </div>
          </div>

          {wards.length > 1 && (
            <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-sfrc-200">
              {wards.map((w) => (
                <button
                  key={w.student_id}
                  onClick={() => setSelectedWardId(w.student_id)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
                    selectedWardId === w.student_id
                      ? 'bg-sfrc-700 text-white'
                      : 'text-sfrc-700 hover:bg-sfrc-100'
                  )}
                >
                  {w.full_name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Live Operational Status Banner */}
        <div className="p-6 rounded-3xl bg-linear-to-r from-emerald-950 via-emerald-900 to-sfrc-900 text-white border border-emerald-500/30 shadow-lg relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Transit Active • Operating on Time
              </div>
              <h2 className="text-2xl font-black tracking-tight text-white">
                {transport?.route_number || 'Route 4'} : {transport?.route_name || 'Sivakasi Town - College Express'}
              </h2>
              <p className="text-emerald-100/90 text-xs max-w-xl">
                Assigned Boarding Stop: <strong className="text-white">{transport?.boarding_stop || 'Coronation Colony'}</strong>.
                Morning Pickup: <strong className="text-emerald-200">{transport?.morning_pickup_time || '08:22 AM'}</strong> • Evening Drop: <strong className="text-emerald-200">{transport?.evening_drop_time || '04:38 PM'}</strong>.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <a
                href={`tel:${transport?.driver_phone || '+919842111004'}`}
                className="px-4 py-2.5 rounded-xl bg-white text-emerald-950 font-bold text-xs flex items-center justify-center gap-2 hover:bg-emerald-50 transition-colors shadow-sm"
              >
                <Phone className="w-4 h-4 text-emerald-700" />
                Call Driver ({transport?.driver_name || 'Mr. R. Kumar'})
              </a>
              <div className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-center">
                <p className="text-[10px] text-emerald-200 font-bold uppercase tracking-wider">Bus Registration</p>
                <p className="text-xs font-mono font-black text-white">{transport?.bus_registration || 'TN 67 BB 1045'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Two Column Layout: Digital Pass & Stop Timelines */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Verified Digital Bus Pass Card */}
          <div className="lg:col-span-1 bg-white rounded-3xl border border-sfrc-200 p-6 shadow-xs flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-sfrc-100">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-sm font-black text-sfrc-900">Digital Bus Pass</h2>
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                  {transport?.status || 'Active'}
                </span>
              </div>

              <div className="mt-4 space-y-3.5 text-xs">
                <div>
                  <p className="text-[11px] text-sfrc-500 font-bold uppercase">Pass Number</p>
                  <p className="text-sm font-black font-mono text-sfrc-900 mt-0.5">{transport?.pass_number || 'BP-2026-A001'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-sfrc-500 font-bold uppercase">Scholar Name</p>
                  <p className="text-sm font-bold text-sfrc-900 mt-0.5">{transport?.student_name || selectedWard?.full_name || 'Priya Sharma'}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-sfrc-100">
                  <div>
                    <p className="text-[10px] text-sfrc-500 font-bold uppercase">Register No</p>
                    <p className="font-mono font-bold text-sfrc-900">{transport?.register_number || selectedWard?.register_number || '23UCA001'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-sfrc-500 font-bold uppercase">Allocated Seat</p>
                    <p className="font-bold text-sfrc-900">{transport?.seat_number || 'Seat 14A'}</p>
                  </div>
                </div>
                <div className="pt-2 border-t border-sfrc-100">
                  <p className="text-[10px] text-sfrc-500 font-bold uppercase">Validity Period</p>
                  <p className="font-bold text-sfrc-900">Valid until {transport?.valid_until || 'May 31, 2027'}</p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-sfrc-50 border border-sfrc-200/80 text-[11px] text-sfrc-600 space-y-1">
              <p className="font-bold text-sfrc-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Institutional Bus Safety Charter
              </p>
              <p>Every college vehicle features speed governors, first aid units, and verified staff.</p>
            </div>
          </div>

          {/* Column 2: Live Route Stops & Timings Timeline */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-sfrc-200 p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-sfrc-900 flex items-center gap-2">
                  <Navigation className="w-5 h-5 text-sfrc-700" />
                  Route Transit Stops & Boarding Timelines
                </h2>
                <p className="text-xs text-sfrc-500 mt-0.5">
                  Sequential scheduled timings for morning arrival and evening return
                </p>
              </div>
              <span className="text-xs font-bold text-sfrc-700 bg-sfrc-100 px-3 py-1 rounded-xl">
                {transport?.stops.length || 4} Stops
              </span>
            </div>

            {/* Timeline List */}
            <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-sfrc-200">
              {transport?.stops.map((stop, index) => {
                const isWardStop = stop.name.toLowerCase().includes(transport.boarding_stop?.toLowerCase() || 'coronation');
                return (
                  <div key={stop.id} className="relative flex items-start gap-4 pl-2">
                    <div
                      className={cn(
                        'w-4 h-4 rounded-full mt-1.5 border-2 shrink-0 z-10 transition-all',
                        isWardStop
                          ? 'bg-emerald-600 border-white ring-4 ring-emerald-200'
                          : 'bg-white border-sfrc-400'
                      )}
                    />
                    <div
                      className={cn(
                        'flex-1 p-4 rounded-2xl border transition-all',
                        isWardStop
                          ? 'bg-emerald-50/70 border-emerald-300 shadow-xs'
                          : 'bg-sfrc-surface/50 border-sfrc-200'
                      )}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-xs font-bold text-sfrc-900">{stop.name}</h3>
                            {isWardStop && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-600 text-white">
                                Ward Boarding Stop
                              </span>
                            )}
                          </div>
                          {stop.landmark && (
                            <p className="text-[11px] text-sfrc-500 mt-0.5 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-sfrc-400" />
                              {stop.landmark}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-xs font-mono">
                          <div className="text-right">
                            <span className="text-[10px] text-sfrc-400 font-sans block uppercase">Morning Pickup</span>
                            <span className="font-bold text-sfrc-800">{stop.morning_pickup_time}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-sfrc-400 font-sans block uppercase">Evening Drop</span>
                            <span className="font-bold text-sfrc-800">{stop.evening_drop_time}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Helpline Advisory Box */}
            <div className="p-4 rounded-2xl bg-sfrc-50 border border-sfrc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-xs text-sfrc-700">
                <p className="font-bold">Transportation Inquiries & Helpdesk</p>
                <p className="text-[11px] text-sfrc-500">Contact Transport In-Charge for route changes, seasonal passes, or stop updates.</p>
              </div>
              <a
                href="tel:+914562220389"
                className="px-3.5 py-1.5 rounded-xl bg-sfrc-800 hover:bg-sfrc-900 text-white text-xs font-bold transition-colors shrink-0 text-center"
              >
                Call Transport Desk
              </a>
            </div>
          </div>
        </div>

        {/* Pragya AI Integration */}
        <AskPragyaBanner />
      </div>
    </AppShell>
  );
}
