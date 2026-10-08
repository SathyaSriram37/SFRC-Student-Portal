'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Bus,
  Clock,
  MapPin,
  Phone,
  User,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Navigation,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import FacilityMap from '@/components/shared/FacilityMap';
import { createClient } from '@/lib/supabase/client';
import { apiGet } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import type { TransportRouteItem, StudentBusPass } from '@/lib/types';

export default function StudentTransportPage() {
  const [routes, setRoutes] = useState<TransportRouteItem[]>([]);
  const [busPass, setBusPass] = useState<StudentBusPass | null>(null);
  const [expandedRouteId, setExpandedRouteId] = useState<string | null>('rt-01');
  const [scheduleView, setScheduleView] = useState<'morning' | 'evening'>('morning');
  const [isLoading, setIsLoading] = useState(true);

  const supabase = useMemo(() => createClient(), []);

  const getAuthToken = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return session?.access_token;
    } catch {
      return undefined;
    }
  }, [supabase]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const token = await getAuthToken();
        const [routesRes, passRes] = await Promise.allSettled([
          apiGet<TransportRouteItem[]>('/api/v1/transport/routes', token),
          apiGet<StudentBusPass>('/api/v1/transport/me/pass', token),
        ]);

        if (!ignore) {
          if (routesRes.status === 'fulfilled' && Array.isArray(routesRes.value)) {
            setRoutes(routesRes.value);
          }
          if (passRes.status === 'fulfilled' && passRes.value) {
            setBusPass(passRes.value);
          }
        }
      } catch (err) {
        console.error('Failed to load transport data:', err);
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    })();
    return () => {
      ignore = true;
    };
  }, [getAuthToken]);

  const toggleExpand = (routeId: string) => {
    setExpandedRouteId((prev) => (prev === routeId ? null : routeId));
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header Profile Greeting */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-3xl border border-border shadow-xs">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sfrc-100 text-sfrc-700 dark:bg-sfrc-950 dark:text-sfrc-300 text-xs font-bold uppercase tracking-wider mb-2">
              <Bus className="w-3.5 h-3.5 text-sfrc-accent animate-pulse" />
              Campus Fleet & Transit
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              College Bus Transport & Routes
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Real-time route timetables, boarding stops, driver contacts, and student bus pass verification.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-1 bg-muted/60 rounded-xl border border-border flex items-center">
              <button
                type="button"
                onClick={() => setScheduleView('morning')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                  scheduleView === 'morning'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Morning (To SFRC)
              </button>
              <button
                type="button"
                onClick={() => setScheduleView('evening')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                  scheduleView === 'evening'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Evening (From SFRC)
              </button>
            </div>
          </div>
        </div>

        {/* Demo Transport Disclaimer Banner */}
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-300 text-xs font-medium flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>
            <strong>Institutional Notice:</strong> Demo transport data. Not official SFRC bus routes. Timings are indicative for system testing.
          </span>
        </div>

        {/* My Route & Bus Pass Card (If pass exists) */}
        {busPass && busPass.has_pass && (
          <Card className="p-6 border-2 border-sfrc-accent/40 bg-gradient-to-br from-card via-sfrc-50/20 to-sfrc-100/30 dark:from-card dark:to-muted/30 shadow-xs relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Verified Active Pass
                  </Badge>
                  <span className="font-mono text-xs font-bold text-muted-foreground">
                    {busPass.pass_number}
                  </span>
                </div>

                <div>
                  <h2 className="text-xl font-black text-foreground">
                    {busPass.route_number}: {busPass.route_name}
                  </h2>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">
                    Boarding Stop: <strong className="text-foreground">{busPass.boarding_stop}</strong> • Assigned {busPass.seat_number}
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-1 text-xs">
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Morning Pickup</span>
                    <span className="font-bold text-foreground text-sm">{busPass.morning_pickup_time}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Evening Drop</span>
                    <span className="font-bold text-foreground text-sm">{busPass.evening_drop_time}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Pass Validity</span>
                    <span className="font-bold text-foreground text-sm">{busPass.valid_until}</span>
                  </div>
                </div>
              </div>

              {/* Driver & Support Contact Widget */}
              <div className="bg-card p-4 rounded-2xl border border-border shrink-0 min-w-[240px] space-y-2 shadow-xs">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Assigned Fleet Crew
                </p>
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-sfrc-100 dark:bg-muted text-sfrc-700 dark:text-sfrc-300 flex items-center justify-center font-bold text-xs">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{busPass.driver_name}</p>
                    <a
                      href={`tel:${busPass.driver_phone}`}
                      className="text-xs text-sfrc-700 dark:text-sfrc-300 font-semibold hover:underline flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3" />
                      {busPass.driver_phone}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* All 5 Bus Routes Accordion Cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Navigation className="w-4 h-4 text-sfrc-700 dark:text-sfrc-300" />
              All College Transit Routes ({routes.length})
            </h2>
          </div>

          {isLoading ? (
            <div className="min-h-[30vh] flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-sfrc-700 dark:text-sfrc-300" />
              <p className="text-xs font-semibold text-muted-foreground">
                Syncing campus transit schedules…
              </p>
            </div>
          ) : (
            routes.map((route) => {
              const isExpanded = expandedRouteId === route.id;
              return (
                <Card
                  key={route.id}
                  className={cn(
                    'overflow-hidden border-border transition-all duration-200 shadow-xs',
                    isExpanded && 'border-sfrc-accent/60 shadow-md'
                  )}
                >
                  {/* Route Header Row */}
                  <div
                    onClick={() => toggleExpand(route.id)}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-sfrc-100 dark:bg-sfrc-900/60 text-sfrc-700 dark:text-sfrc-300 flex items-center justify-center shrink-0">
                        <Bus className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-sfrc-700 dark:text-sfrc-300 uppercase tracking-wider">
                            {route.route_number}
                          </span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs font-bold text-foreground">{route.name}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {route.total_stops} Stops
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {route.start_point} ➔ {route.destination} ({route.bus_registration})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 justify-between sm:justify-end">
                      <div className="text-right hidden md:block">
                        <span className="text-[11px] text-muted-foreground block">
                          {scheduleView === 'morning' ? 'Departs Origin' : 'Departs Campus'}
                        </span>
                        <span className="text-xs font-bold text-foreground">
                          {scheduleView === 'morning' ? route.morning_departure : route.evening_departure_sfrc}
                        </span>
                      </div>

                      <div className="text-right hidden md:block">
                        <span className="text-[11px] text-muted-foreground block">
                          Occupancy
                        </span>
                        <span className="text-xs font-bold text-foreground">
                          {route.occupied_seats}/{route.capacity} Seats
                        </span>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-xl"
                        aria-label="Toggle Route Details"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Route Stops & Map Panel */}
                  {isExpanded && (
                    <div className="p-4 sm:p-6 bg-muted/20 border-t border-border space-y-6 animate-in fade-in duration-200">
                      {/* Driver info & timings bar */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-card border border-border text-xs">
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Bus Driver</span>
                          <span className="font-bold text-foreground">{route.driver_name} ({route.driver_phone})</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Morning Shift (To SFRC)</span>
                          <span className="font-bold text-foreground">{route.morning_departure} ➔ {route.morning_arrival_sfrc}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Evening Shift (From SFRC)</span>
                          <span className="font-bold text-foreground">{route.evening_departure_sfrc} ➔ {route.evening_arrival_terminus}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Stops Table */}
                        <div className="lg:col-span-2 space-y-2">
                          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-sfrc-700 dark:text-sfrc-300" />
                            Stop Schedule & Boarding Sequence
                          </h3>

                          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="border-b border-border bg-muted/40 text-muted-foreground font-bold">
                                  <th className="p-3 pl-4">#</th>
                                  <th className="p-3">Stop Name & Landmark</th>
                                  <th className="p-3">
                                    {scheduleView === 'morning' ? 'Morning Pickup' : 'Evening Drop'}
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {route.stops.map((stop) => (
                                  <tr key={stop.id} className="hover:bg-muted/30 transition-colors">
                                    <td className="p-3 pl-4 font-bold text-sfrc-700 dark:text-sfrc-300">
                                      {stop.stop_order}
                                    </td>
                                    <td className="p-3">
                                      <p className="font-bold text-foreground">{stop.name}</p>
                                      {stop.landmark && (
                                        <p className="text-[11px] text-muted-foreground mt-0.5">
                                          Landmark: {stop.landmark}
                                        </p>
                                      )}
                                    </td>
                                    <td className="p-3 font-bold text-foreground">
                                      {scheduleView === 'morning'
                                        ? stop.morning_pickup_time
                                        : stop.evening_drop_time}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Location / Campus Map Fallback View */}
                        <div className="space-y-2">
                          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-sfrc-700 dark:text-sfrc-300" />
                            Terminal Map
                          </h3>
                          <FacilityMap
                            building="SFRC Main Bus Bay & Terminal Porch"
                            floor="Campus Gate 1 Entrance"
                            locationText={`Route: ${route.route_number} Terminal Point`}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </div>
  );
}
