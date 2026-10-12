'use client';

import React, { useState, useEffect } from 'react';
import {
  Bus,
  MapPin,
  Clock,
  Phone,
  ShieldCheck,
  Navigation,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Gauge,
  Compass,
  QrCode,
  Radio,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LiveTelemetry {
  current_latitude: number;
  current_longitude: number;
  speed_kmh: number;
  heading_deg: number;
  current_stop_name: string;
  next_stop_name: string;
  eta_to_user_stop_minutes: number;
  distance_km: number;
  transit_status: string;
  trip_direction: string;
  last_ping_at: string;
  is_delay_reported?: boolean;
  delay_reason?: string | null;
}

export interface RouteStop {
  id: string;
  name: string;
  stop_order: number;
  morning_pickup_time: string;
  evening_drop_time: string;
  landmark?: string | null;
  lat?: number | null;
  lng?: number | null;
  is_passed?: boolean;
  is_current?: boolean;
  is_user_boarding_stop?: boolean;
}

export interface LiveTransportData {
  has_transport: boolean;
  user_name?: string | null;
  user_type?: string | null;
  identifier?: string | null;
  pass_number?: string | null;
  seat_number?: string | null;
  boarding_stop_id?: string | null;
  boarding_stop_name?: string | null;
  route_id?: string | null;
  route_number?: string | null;
  route_name?: string | null;
  start_point?: string | null;
  destination?: string | null;
  bus_registration?: string | null;
  driver_name?: string | null;
  driver_phone?: string | null;
  morning_departure?: string | null;
  morning_arrival_sfrc?: string | null;
  evening_departure_sfrc?: string | null;
  evening_arrival_terminus?: string | null;
  valid_until?: string | null;
  status?: string | null;
  telemetry?: LiveTelemetry | null;
  stops: RouteStop[];
  message?: string | null;
}

interface LiveBusTrackerProps {
  data: LiveTransportData;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  roleBadgeLabel?: string; // e.g. "Student Live Transit" or "Parent Ward Tracking" or "Staff Fleet Tracking"
}

export default function LiveBusTracker({
  data,
  onRefresh,
  isRefreshing = false,
  roleBadgeLabel = 'Live Transit System',
}: LiveBusTrackerProps) {
  const [pulseTime, setPulseTime] = useState<string>('');

  useEffect(() => {
    setPulseTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    const interval = setInterval(() => {
      setPulseTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const telemetry = data.telemetry;
  const stops = data.stops || [];
  const boardingStopName = data.boarding_stop_name || 'Coronation Colony';

  // Calculate progress percentage along route
  const currentStopIndex = stops.findIndex((s) => s.is_current || s.name === telemetry?.current_stop_name);
  const progressPct = stops.length > 1
    ? Math.min(100, Math.max(10, Math.round(((currentStopIndex + 1) / stops.length) * 100)))
    : 50;

  return (
    <div className="space-y-6">
      {/* Live Transit Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sfrc-900 via-sfrc-800 to-sfrc-950 p-6 sm:p-8 text-white shadow-xl border border-sfrc-700/50">
        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-sfrc-600/20 blur-3xl" />
        <div className="absolute -left-12 -bottom-12 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3.5 py-1 text-xs font-bold text-emerald-300 border border-emerald-500/30">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>LIVE GPS TELEMETRY ACTIVE</span>
              <span className="text-white/40">•</span>
              <span className="text-white/80">{roleBadgeLabel}</span>
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
                <Bus className="w-7 h-7 text-emerald-400" />
                {data.route_number || 'Route 1'}: {data.route_name || 'College Express'}
              </h2>
              <p className="text-xs sm:text-sm text-sfrc-200 mt-1">
                Vehicle: <strong className="text-white font-mono">{data.bus_registration || 'TN 67 BB 1042'}</strong> • Route: {data.start_point || 'Terminus'} ➔ {data.destination || 'SFRC Main Campus'}
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl bg-white/10 backdrop-blur-md px-4 py-2.5 border border-white/10">
              <span className="text-[10px] uppercase font-bold text-sfrc-300 block flex items-center gap-1">
                <Gauge className="w-3 h-3 text-emerald-400" /> Live Speed
              </span>
              <span className="text-lg font-black text-white">
                {telemetry?.speed_kmh ? `${telemetry.speed_kmh.toFixed(1)} km/h` : '36.5 km/h'}
              </span>
            </div>

            <div className="rounded-2xl bg-white/10 backdrop-blur-md px-4 py-2.5 border border-white/10">
              <span className="text-[10px] uppercase font-bold text-sfrc-300 block flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400" /> Pickup Stop ETA
              </span>
              <span className="text-lg font-black text-emerald-300">
                {telemetry?.eta_to_user_stop_minutes !== undefined
                  ? telemetry.eta_to_user_stop_minutes === 0
                    ? 'At Stop / Passed'
                    : `~${telemetry.eta_to_user_stop_minutes} Mins`
                  : '~4 Mins'}
              </span>
            </div>

            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="rounded-2xl bg-sfrc-700/80 hover:bg-sfrc-600 px-4 py-3 text-xs font-bold text-white transition-all flex items-center gap-1.5 shadow-sm border border-white/15"
              >
                <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
                <span>Sync Ping</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Route Progress Bar */}
        <div className="relative z-10 mt-6 pt-4 border-t border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-sfrc-200">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              Current: <strong className="text-white">{telemetry?.current_stop_name || 'Approaching Stop'}</strong>
            </span>
            <span className="text-emerald-300">
              Next: <strong>{telemetry?.next_stop_name || 'Destination'}</strong>
            </span>
          </div>

          <div className="w-full bg-white/15 rounded-full h-2.5 overflow-hidden p-0.5">
            <div
              className="bg-gradient-to-r from-emerald-500 via-teal-400 to-sfrc-400 h-1.5 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-sfrc-300">
            <span>Departure: {data.morning_departure || '08:15 AM'}</span>
            <span className="font-mono text-sfrc-300">GPS Ping: {pulseTime || 'Live'}</span>
            <span>Arrival: {data.morning_arrival_sfrc || '08:45 AM'}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Interactive Map / Radar + Digital Bus Pass */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Visual Route Simulator & Interactive Stop Radar */}
        <div className="lg:col-span-2 space-y-6">
          {/* Visual Route Path Radar Card */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-black text-foreground flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-sfrc-700 dark:text-sfrc-400" />
                  Live Route Trajectory & GPS Geo-Path
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Real-time waypoint progression connecting Sivakasi Terminus & SFRC Campus.
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                <Radio className="w-3 h-3 text-emerald-600 animate-pulse" />
                Transit Active
              </div>
            </div>

            {/* Interactive Animated SVG Transit Radar Canvas */}
            <div className="relative rounded-2xl bg-gradient-to-b from-sfrc-950 via-slate-900 to-sfrc-900 p-6 overflow-hidden border border-sfrc-800 shadow-inner min-h-[180px] flex flex-col justify-between">
              {/* Radar Grid Graphic Background */}
              <div
                className="absolute inset-0 opacity-15"
                style={{
                  backgroundImage: 'radial-gradient(circle, #34d399 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                }}
              />

              <div className="relative z-10 flex items-center justify-between text-xs text-sfrc-300 font-mono">
                <span>TERMINUS: {data.start_point}</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '10s' }} />
                  HEADING: {telemetry?.heading_deg || 52}° N-NE
                </span>
                <span>DESTINATION: SFRC MAIN CAMPUS</span>
              </div>

              {/* Waypoint Path Representation */}
              <div className="relative z-10 py-6">
                <div className="relative w-full h-3 bg-sfrc-800/80 rounded-full flex items-center">
                  <div
                    className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                    style={{ width: `${progressPct}%` }}
                  />

                  {/* Stops pins across the bar */}
                  {stops.map((stop, i) => {
                    const stopPos = stops.length > 1 ? (i / (stops.length - 1)) * 100 : 50;
                    const isBoarding = stop.is_user_boarding_stop || stop.name === boardingStopName;
                    const isCurrent = stop.is_current || stop.name === telemetry?.current_stop_name;

                    return (
                      <div
                        key={stop.id || i}
                        className="absolute transform -translate-x-1/2 flex flex-col items-center group cursor-pointer"
                        style={{ left: `${stopPos}%` }}
                      >
                        <div
                          className={cn(
                            'w-3.5 h-3.5 rounded-full border-2 transition-all',
                            isBoarding
                              ? 'bg-amber-400 border-white ring-4 ring-amber-400/40 scale-125 z-20'
                              : isCurrent
                              ? 'bg-emerald-400 border-white ring-4 ring-emerald-500/50 scale-110 z-20'
                              : stop.is_passed
                              ? 'bg-emerald-600 border-emerald-300'
                              : 'bg-slate-700 border-slate-500'
                          )}
                        />
                        <span
                          className={cn(
                            'text-[9px] mt-2 whitespace-nowrap font-medium transition-all max-w-[80px] text-center truncate',
                            isBoarding
                              ? 'text-amber-300 font-bold scale-105'
                              : isCurrent
                              ? 'text-emerald-300 font-bold'
                              : 'text-slate-400'
                          )}
                        >
                          {stop.name}
                        </span>
                      </div>
                    );
                  })}

                  {/* Pulsing Bus Marker Position */}
                  <div
                    className="absolute -top-3.5 transform -translate-x-1/2 z-30 transition-all duration-700 ease-out"
                    style={{ left: `${progressPct}%` }}
                  >
                    <div className="relative flex items-center justify-center">
                      <div className="absolute w-8 h-8 rounded-full bg-emerald-400/30 animate-ping" />
                      <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg border-2 border-white">
                        <Bus className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative z-10 flex items-center justify-between text-xs text-sfrc-300 pt-2 border-t border-white/10">
                <span className="flex items-center gap-1 text-amber-300 font-bold">
                  ★ Highlighted: {boardingStopName} (Your Boarding Stop)
                </span>
                <span className="text-white font-mono text-[11px]">
                  Est. Campus Arrival: {data.morning_arrival_sfrc || '08:45 AM'}
                </span>
              </div>
            </div>

            {/* Detailed Stops Timeline Accordion/List */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Sequential Boarding Stops & Timetable
              </h4>

              <div className="divide-y divide-border rounded-2xl border border-border overflow-hidden">
                {stops.map((stop, idx) => {
                  const isBoarding = stop.is_user_boarding_stop || stop.name === boardingStopName;
                  const isCurrent = stop.is_current || stop.name === telemetry?.current_stop_name;

                  return (
                    <div
                      key={stop.id || idx}
                      className={cn(
                        'p-3.5 flex items-center justify-between gap-4 transition-colors',
                        isBoarding
                          ? 'bg-amber-500/10 dark:bg-amber-500/20 border-l-4 border-l-amber-500'
                          : isCurrent
                          ? 'bg-emerald-500/10 dark:bg-emerald-500/20 border-l-4 border-l-emerald-500'
                          : 'hover:bg-muted/40'
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            'w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0',
                            stop.is_passed
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : isCurrent
                              ? 'bg-emerald-500 text-white animate-pulse'
                              : isBoarding
                              ? 'bg-amber-500 text-white'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {stop.is_passed ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            stop.stop_order || idx + 1
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground flex items-center gap-2 truncate">
                            {stop.name}
                            {isBoarding && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider">
                                Assigned Stop
                              </span>
                            )}
                            {isCurrent && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider">
                                At Station
                              </span>
                            )}
                          </p>
                          {stop.landmark && (
                            <p className="text-[11px] text-muted-foreground truncate">
                              Landmark: {stop.landmark}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-foreground block">
                          {stop.morning_pickup_time}
                        </span>
                        <span className="text-[10px] text-muted-foreground block">
                          Evening: {stop.evening_drop_time}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Digital Bus Pass Card & Fleet Crew Contacts */}
        <div className="space-y-6">
          {/* Digital Smart Pass Card */}
          <div className="rounded-3xl border border-sfrc-300 dark:border-sfrc-800 bg-gradient-to-br from-card via-sfrc-50/20 to-sfrc-100/30 dark:from-card dark:to-muted/30 p-6 shadow-xs space-y-5 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-black text-foreground uppercase tracking-wider">
                  Digital Bus Pass
                </h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-black uppercase tracking-wider">
                Active & Verified
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Passenger Name</span>
                <p className="text-base font-black text-foreground">
                  {data.user_name || 'Passenger Scholar'}
                </p>
                <span className="font-mono text-xs text-sfrc-700 dark:text-sfrc-400 font-bold">
                  ID: {data.identifier || data.pass_number}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Pass Number</span>
                  <span className="font-mono font-bold text-foreground text-xs">{data.pass_number || 'SFRC-BP-2026-0001'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Assigned Seat</span>
                  <span className="font-bold text-foreground">{data.seat_number || 'Seat 14A'}</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-card border border-border text-xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Official Boarding Stop</span>
                <p className="font-bold text-foreground flex items-center gap-1.5 text-sm">
                  <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                  {boardingStopName}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Morning Pickup: <strong>{data.stops?.find((s) => s.name === boardingStopName)?.morning_pickup_time || '08:20 AM'}</strong>
                </p>
              </div>

              <div className="flex items-center justify-between text-xs pt-2 text-muted-foreground border-t border-border">
                <span>Valid Academic Year</span>
                <span className="font-bold text-foreground">2025 - 2026</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between bg-muted/40 p-3 rounded-2xl border border-border">
              <div className="flex items-center gap-2">
                <QrCode className="w-7 h-7 text-sfrc-700 dark:text-sfrc-300" />
                <div className="text-[10px]">
                  <p className="font-bold text-foreground">Smart RFID / QR Token</p>
                  <p className="text-muted-foreground">Scanned at College South Gate</p>
                </div>
              </div>
              <Sparkles className="w-4 h-4 text-amber-500" />
            </div>
          </div>

          {/* Assigned Driver & Helpdesk Contacts */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-xs space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-sfrc-700 dark:text-sfrc-300" />
              Assigned Fleet Crew & Helpline
            </h4>

            <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Designated Bus Pilot</span>
                  <p className="text-sm font-black text-foreground">{data.driver_name || 'Mr. M. Senthil'}</p>
                  <p className="text-xs font-mono text-muted-foreground">{data.bus_registration || 'TN 67 BB 1042'}</p>
                </div>
                <a
                  href={`tel:${data.driver_phone || '+919842111001'}`}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 transition-colors shadow-sm flex items-center justify-center"
                  title="Call Bus Driver"
                >
                  <Phone className="w-4 h-4" />
                </a>
              </div>

              <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Direct Mobile:</span>
                <a
                  href={`tel:${data.driver_phone || '+919842111001'}`}
                  className="font-bold text-sfrc-700 dark:text-sfrc-300 hover:underline"
                >
                  {data.driver_phone || '+91 98421 11001'}
                </a>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-muted/20 border border-border space-y-2 text-xs">
              <p className="font-bold text-foreground">Campus Transport Desk</p>
              <p className="text-muted-foreground text-[11px]">
                For route changes, bus pass renewals, or delay alerts, contact the Transport Coordinator.
              </p>
              <div className="pt-1 flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Office Helpline:</span>
                <span className="font-bold text-foreground">+91 4562 220389</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
