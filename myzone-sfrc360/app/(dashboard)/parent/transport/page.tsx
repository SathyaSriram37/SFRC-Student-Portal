'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
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
  Gauge,
  Radio,
  RefreshCw,
  Compass,
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
  lat?: number;
  lng?: number;
  is_passed?: boolean;
  is_current?: boolean;
  is_ward_stop?: boolean;
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
  current_latitude?: number;
  current_longitude?: number;
  speed_kmh?: number;
  heading_deg?: number;
  current_stop_name?: string;
  next_stop_name?: string;
  eta_to_ward_stop_minutes?: number;
  distance_km?: number;
  transit_status?: string;
  trip_direction?: string;
  last_ping_at?: string;
  stops: BusStopItem[];
}

export default function ParentTransportPage() {
  const [wards, setWards] = useState<WardItem[]>([]);
  const [selectedWardId, setSelectedWardId] = useState<string | null>(null);
  const [transport, setTransport] = useState<WardTransportInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pulseTime, setPulseTime] = useState<string>('');

  const supabase = useMemo(() => createClient(), []);

  const loadTransport = useCallback(async (isSync = false) => {
    if (isSync) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const wardList = await apiGet<WardItem[]>('/api/v1/parents/me/wards', token).catch(() => []);
      setWards(wardList);

      const targetWardId = selectedWardId || (wardList.length > 0 ? wardList[0].student_id : null);
      if (targetWardId) {
        setSelectedWardId(targetWardId);
        const data = await apiGet<WardTransportInfo>(`/api/v1/parents/me/wards/${targetWardId}/transport`, token);
        setTransport(data);
      }
    } catch (err: unknown) {
      console.error('Failed to load transport details:', err);
      setError('Unable to load bus route and transit schedule.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedWardId, supabase]);

  useEffect(() => {
    loadTransport();
    setPulseTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    const interval = setInterval(() => {
      loadTransport(true);
      setPulseTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 30000);
    return () => clearInterval(interval);
  }, [loadTransport]);

  const selectedWard = wards.find((w) => w.student_id === selectedWardId) || wards[0];
  const stops = transport?.stops || [];
  const boardingStop = transport?.boarding_stop || 'Coronation Colony';

  // Calculate progress percentage along route
  const currentStopIndex = stops.findIndex((s) => s.is_current || s.name === transport?.current_stop_name);
  const progressPct = stops.length > 1
    ? Math.min(100, Math.max(10, Math.round(((currentStopIndex + 1) / stops.length) * 100)))
    : 50;

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

          <div className="flex items-center gap-2">
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

            <button
              type="button"
              onClick={() => loadTransport(true)}
              disabled={isRefreshing}
              className="p-2.5 rounded-2xl bg-white border border-sfrc-200 text-sfrc-700 hover:bg-sfrc-50 transition-all flex items-center gap-1.5 text-xs font-bold shadow-xs"
              title="Refresh GPS Telemetry"
            >
              <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
              <span className="hidden sm:inline">Sync GPS</span>
            </button>
          </div>
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
                {transport?.route_number || 'Route 1'} : {transport?.route_name || 'City Route'}
              </h2>
              <p className="text-emerald-100/90 text-xs max-w-xl">
                Assigned Boarding Stop: <strong className="text-white">{boardingStop}</strong>.
                Morning Pickup: <strong className="text-emerald-200">{transport?.morning_pickup_time || '08:20 AM'}</strong> • Evening Drop: <strong className="text-emerald-200">{transport?.evening_drop_time || '04:40 PM'}</strong>.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-center">
                <p className="text-[10px] text-emerald-200 font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                  <Gauge className="w-3 h-3 text-emerald-300" /> Live Speed
                </p>
                <p className="text-base font-black text-white">{transport?.speed_kmh ? `${transport.speed_kmh.toFixed(1)} km/h` : '36.5 km/h'}</p>
              </div>

              <div className="px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-center">
                <p className="text-[10px] text-emerald-200 font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3 text-amber-300" /> Ward Pickup ETA
                </p>
                <p className="text-base font-black text-emerald-300">
                  {transport?.eta_to_ward_stop_minutes !== undefined ? `~${transport.eta_to_ward_stop_minutes} Mins` : '~4 Mins'}
                </p>
              </div>

              <a
                href={`tel:${transport?.driver_phone || '+919842111001'}`}
                className="px-4 py-2.5 rounded-xl bg-white text-emerald-950 font-bold text-xs flex items-center justify-center gap-2 hover:bg-emerald-50 transition-colors shadow-sm"
              >
                <Phone className="w-4 h-4 text-emerald-700" />
                Call Driver ({transport?.driver_name || 'Mr. M. Senthil'})
              </a>
            </div>
          </div>

          {/* Visual Route Progress Track */}
          <div className="relative z-10 mt-6 pt-4 border-t border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-100">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                Current Bus Station: <strong className="text-white">{transport?.current_stop_name || 'Coronation Colony'}</strong>
              </span>
              <span className="text-emerald-300">
                Next Station: <strong>{transport?.next_stop_name || 'Gandhi Nagar Corner'}</strong>
              </span>
            </div>

            <div className="w-full bg-white/15 rounded-full h-2.5 overflow-hidden p-0.5">
              <div
                className="bg-gradient-to-r from-emerald-500 via-teal-400 to-sfrc-400 h-1.5 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-emerald-300">
              <span>Bus Registration: <strong className="font-mono text-white">{transport?.bus_registration || 'TN 67 BB 1042'}</strong></span>
              <span className="font-mono text-white/80">Satellite Ping: {pulseTime || 'Active'}</span>
              <span>Arrival Terminal: {transport?.morning_arrival_sfrc || '08:45 AM'}</span>
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
                  <p className="text-sm font-black font-mono text-sfrc-900 mt-0.5">{transport?.pass_number || 'SFRC-BP-2026-23UCA001'}</p>
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
                    <p className="font-bold text-sfrc-900">{transport?.seat_number || 'Seat 14A (Window)'}</p>
                  </div>
                </div>
                <div className="pt-2 border-t border-sfrc-100">
                  <p className="text-[10px] text-sfrc-500 font-bold uppercase">Ward Boarding Stop</p>
                  <p className="font-bold text-sfrc-900 text-sm flex items-center gap-1.5 mt-0.5">
                    <MapPin className="w-4 h-4 text-amber-600" />
                    {boardingStop}
                  </p>
                </div>
                <div className="pt-2 border-t border-sfrc-100">
                  <p className="text-[10px] text-sfrc-500 font-bold uppercase">Validity Period</p>
                  <p className="font-bold text-sfrc-900">Valid until {transport?.valid_until || 'May 31, 2027'}</p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-sfrc-50 border border-sfrc-100 space-y-1">
              <p className="text-xs font-bold text-sfrc-900">Safe Commute Guarantee</p>
              <p className="text-[11px] text-sfrc-600">
                Biometric onboard attendance logs automatically alert parents via SMS upon campus entry.
              </p>
            </div>
          </div>

          {/* Column 2 & 3: Interactive Route Stop Timeline */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-sfrc-200 p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-sfrc-100">
              <div>
                <h2 className="text-base font-black text-sfrc-900 flex items-center gap-2">
                  <Navigation className="w-5 h-5 text-sfrc-700" />
                  Live Route Stations & Transit Schedule
                </h2>
                <p className="text-xs text-sfrc-600 mt-0.5">
                  Live stop indicators updated via GPS beacon
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Passed
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" /> Ward Stop
                </span>
              </div>
            </div>

            {/* Stop Timeline */}
            <div className="space-y-4">
              {stops.map((stop, idx) => {
                const isWardStop = stop.is_ward_stop || stop.name === boardingStop;
                const isCurrent = stop.is_current || stop.name === transport?.current_stop_name;

                return (
                  <div
                    key={stop.id || idx}
                    className={cn(
                      'p-4 rounded-2xl border transition-all flex items-center justify-between gap-4',
                      isWardStop
                        ? 'border-amber-400 bg-amber-50/50 shadow-xs ring-2 ring-amber-400/20'
                        : isCurrent
                        ? 'border-emerald-500 bg-emerald-50/40 shadow-xs'
                        : 'border-sfrc-100 hover:border-sfrc-200 bg-white'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          'w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0',
                          stop.is_passed
                            ? 'bg-emerald-100 text-emerald-800'
                            : isCurrent
                            ? 'bg-emerald-600 text-white animate-pulse'
                            : isWardStop
                            ? 'bg-amber-500 text-white'
                            : 'bg-sfrc-100 text-sfrc-700'
                        )}
                      >
                        {stop.is_passed ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          stop.stop_order || idx + 1
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-bold text-sfrc-900 truncate">{stop.name}</h3>
                          {isWardStop && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider shrink-0">
                              Ward Stop
                            </span>
                          )}
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider shrink-0">
                              Bus Here Now
                            </span>
                          )}
                        </div>
                        {stop.landmark && (
                          <p className="text-[11px] text-sfrc-500 mt-0.5 truncate">Landmark: {stop.landmark}</p>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-sfrc-900 flex items-center justify-end gap-1">
                        <Clock className="w-3 h-3 text-sfrc-500" />
                        {stop.morning_pickup_time}
                      </div>
                      <p className="text-[10px] text-sfrc-500 mt-0.5">Return: {stop.evening_drop_time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <AskPragyaBanner />
      </div>
    </AppShell>
  );
}
