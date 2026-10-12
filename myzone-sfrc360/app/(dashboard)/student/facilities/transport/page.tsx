'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Bus,
  ArrowLeft,
  Navigation,
  Loader2,
  AlertCircle,
  Clock,
  MapPin,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import AskPragyaBanner from '@/components/shared/AskPragyaBanner';
import LiveBusTracker, { LiveTransportData } from '@/components/transport/LiveBusTracker';
import { createClient } from '@/lib/supabase/client';
import { apiGet } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import type { TransportRouteItem } from '@/lib/types';

export default function StudentTransportPage() {
  const [liveData, setLiveData] = useState<LiveTransportData | null>(null);
  const [allRoutes, setAllRoutes] = useState<TransportRouteItem[]>([]);
  const [expandedRouteId, setExpandedRouteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const loadData = useCallback(async (isSync = false) => {
    if (isSync) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      const [liveRes, routesRes] = await Promise.allSettled([
        apiGet<LiveTransportData>('/api/v1/transport/me/live-tracking', token),
        apiGet<TransportRouteItem[]>('/api/v1/transport/routes', token),
      ]);

      if (liveRes.status === 'fulfilled' && liveRes.value) {
        setLiveData(liveRes.value);
      }
      if (routesRes.status === 'fulfilled' && Array.isArray(routesRes.value)) {
        setAllRoutes(routesRes.value);
      }
    } catch (err) {
      console.error('Failed to load student bus tracking data:', err);
      setError('Unable to connect to live campus transit tracking.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadData();
    // Auto-refresh telemetry every 30 seconds
    const interval = setInterval(() => {
      loadData(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  return (
    <AppShell role="student" userName="Student Scholar">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/student/facilities"
              className="w-10 h-10 rounded-2xl bg-card border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors shadow-xs"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-center gap-2.5">
                <Bus className="w-7 h-7 text-sfrc-700 dark:text-sfrc-400" />
                Live Bus Tracking & Transit
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Live GPS telemetry, boarding stop countdown, assigned seat pass, and campus transit routes.
              </p>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="p-16 rounded-3xl border border-border bg-card flex flex-col items-center justify-center text-center space-y-3 shadow-xs">
            <Loader2 className="w-8 h-8 text-sfrc-700 dark:text-sfrc-400 animate-spin" />
            <p className="text-sm font-bold text-foreground">Syncing live bus telemetry & GPS satellites...</p>
            <p className="text-xs text-muted-foreground">Connecting to SFRC Fleet Positioning Network</p>
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="p-6 rounded-3xl border border-destructive/20 bg-destructive/5 text-destructive flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-xs font-semibold">{error}</p>
          </div>
        )}

        {/* Live Bus Tracker Component */}
        {!isLoading && liveData && (
          <LiveBusTracker
            data={liveData}
            onRefresh={() => loadData(true)}
            isRefreshing={isRefreshing}
            roleBadgeLabel="Student Live Transit"
          />
        )}

        {/* All College Bus Routes Directory Accordion */}
        {!isLoading && allRoutes.length > 0 && (
          <div className="rounded-3xl border border-border bg-card p-6 shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-black text-foreground flex items-center gap-2">
                <Navigation className="w-4 h-4 text-sfrc-700 dark:text-sfrc-400" />
                Institutional Bus Routes Network
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Complete directory of all official SFRC college bus lines operating across Sivakasi, Sattur, Thiruthangal, and Virudhunagar.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allRoutes.map((route) => {
                const isExpanded = expandedRouteId === route.id;
                const isMyRoute = liveData?.route_id === route.id;

                return (
                  <div
                    key={route.id}
                    className={cn(
                      'rounded-2xl border p-4.5 transition-all shadow-xs',
                      isMyRoute
                        ? 'border-emerald-500/50 bg-emerald-50/10 dark:bg-emerald-950/20'
                        : 'border-border bg-card hover:border-sfrc-300 dark:hover:border-sfrc-700'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-sfrc-100 text-sfrc-800 dark:bg-sfrc-950 dark:text-sfrc-300 text-xs font-black">
                            {route.route_number}
                          </span>
                          {isMyRoute && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider">
                              My Assigned Route
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-foreground mt-1.5">{route.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {route.start_point} ➔ {route.destination}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setExpandedRouteId(isExpanded ? null : route.id)}
                        className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border text-[11px] text-muted-foreground">
                      <div>
                        <span>Morning Departure:</span>
                        <strong className="text-foreground block">{route.morning_departure}</strong>
                      </div>
                      <div>
                        <span>Campus Arrival:</span>
                        <strong className="text-foreground block">{route.morning_arrival_sfrc}</strong>
                      </div>
                    </div>

                    {isExpanded && route.stops && route.stops.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-border space-y-2">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                          Route Stops & Pickups:
                        </span>
                        <div className="space-y-1.5">
                          {route.stops.map((s) => (
                            <div
                              key={s.id}
                              className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-muted/40"
                            >
                              <span className="font-medium text-foreground">{s.name}</span>
                              <span className="text-muted-foreground font-mono">{s.morning_pickup_time}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <AskPragyaBanner />
      </div>
    </AppShell>
  );
}
