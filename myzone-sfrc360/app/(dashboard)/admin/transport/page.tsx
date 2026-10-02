'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Bus,
  PlusCircle,
  Loader2,
  AlertCircle,
  Eye,
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';
import { apiGet, apiPost } from '@/lib/api-client';
import type { TransportRouteItem } from '@/lib/types';

export default function AdminTransportPage() {
  const [routes, setRoutes] = useState<TransportRouteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<TransportRouteItem | null>(null);

  // Form State
  const [routeNum, setRouteNum] = useState('');
  const [routeName, setRouteName] = useState('');
  const [startPoint, setStartPoint] = useState('');
  const [busReg, setBusReg] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [mornDep, setMornDep] = useState('08:15 AM');
  const [eveArr, setEveArr] = useState('04:45 PM');
  const [capacity, setCapacity] = useState(50);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const loadRoutes = useCallback(async () => {
    try {
      const token = await getAuthToken();
      const res = await apiGet<TransportRouteItem[]>('/api/v1/transport/routes', token);
      if (Array.isArray(res)) {
        setRoutes(res);
      }
    } catch (err) {
      console.error('Failed to load transport routes:', err);
    } finally {
      setIsLoading(false);
    }
  }, [getAuthToken]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!ignore) {
        await loadRoutes();
      }
    })();
    return () => {
      ignore = true;
    };
  }, [loadRoutes]);

  const handleCreateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routeNum.trim() || !routeName.trim() || !startPoint.trim()) {
      alert('Please provide route number, name, and start terminus.');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await getAuthToken();
      await apiPost(
        '/api/v1/admin/transport/routes',
        {
          route_number: routeNum.trim(),
          name: routeName.trim(),
          start_point: startPoint.trim(),
          destination: 'SFRC Main Campus',
          bus_registration: busReg.trim() || 'TN 67 BB 1099',
          driver_name: driverName.trim() || 'Assigned Fleet Driver',
          driver_phone: driverPhone.trim() || '+91 98421 00000',
          morning_departure: mornDep,
          morning_arrival_sfrc: '08:45 AM',
          evening_departure_sfrc: '04:15 PM',
          evening_arrival_terminus: eveArr,
          capacity: Number(capacity) || 50,
          stops: [
            { id: 'st-new-1', name: startPoint, stop_order: 1, morning_pickup_time: mornDep, evening_drop_time: eveArr },
            { id: 'st-new-2', name: 'SFRC Main Campus Terminal', stop_order: 2, morning_pickup_time: '08:45 AM', evening_drop_time: '04:15 PM' },
          ],
        },
        token
      );

      setRouteNum('');
      setRouteName('');
      setStartPoint('');
      setBusReg('');
      setDriverName('');
      setDriverPhone('');
      setAddModalOpen(false);
      await loadRoutes();
    } catch (err) {
      console.error('Failed to create route:', err);
      alert('Could not register route.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell role="admin" userName="System Administrator">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header Profile Greeting */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-3xl border border-border shadow-xs">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sfrc-100 text-sfrc-700 dark:bg-sfrc-950 dark:text-sfrc-300 text-xs font-bold uppercase tracking-wider mb-2">
              <Bus className="w-3.5 h-3.5 text-sfrc-accent animate-pulse" />
              Transit Operations & Fleet Management
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              Campus Transport & Fleet Management
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Administer college bus routes, stop sequences, driver allocations, and bus pass rosters.
            </p>
          </div>

          <Button
            onClick={() => setAddModalOpen(true)}
            size="sm"
            className="bg-sfrc-700 hover:bg-sfrc-800 text-white gap-2 text-xs font-bold shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            Add Route
          </Button>
        </div>

        {/* Demo Transport Disclaimer */}
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>Institutional Demo Mode: 5 synthetic transit routes active for testing.</span>
        </div>

        {/* Routes Catalog Table */}
        <Card className="overflow-hidden border-border shadow-xs">
          <div className="p-4 bg-muted/30 border-b border-border flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold">Active Fleet Routes</CardTitle>
              <CardDescription className="text-xs">
                Showing {routes.length} institutional college bus routes
              </CardDescription>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground font-bold">
                  <th className="p-3.5 pl-4">Route</th>
                  <th className="p-3.5">Name & Origin</th>
                  <th className="p-3.5">Bus Reg</th>
                  <th className="p-3.5">Driver Contact</th>
                  <th className="p-3.5">Stops</th>
                  <th className="p-3.5">Shift Timings</th>
                  <th className="p-3.5">Occupancy</th>
                  <th className="p-3.5 text-right pr-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-sfrc-700 dark:text-sfrc-300 mb-2" />
                      Loading routes…
                    </td>
                  </tr>
                ) : (
                  routes.map((route) => (
                    <tr key={route.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-3.5 pl-4 font-black text-sfrc-700 dark:text-sfrc-300">
                        {route.route_number}
                      </td>
                      <td className="p-3.5">
                        <p className="font-bold text-foreground">{route.name}</p>
                        <p className="text-[11px] text-muted-foreground">{route.start_point} ➔ {route.destination}</p>
                      </td>
                      <td className="p-3.5 font-mono text-muted-foreground font-semibold">
                        {route.bus_registration}
                      </td>
                      <td className="p-3.5">
                        <p className="font-semibold text-foreground">{route.driver_name}</p>
                        <p className="text-[11px] text-muted-foreground">{route.driver_phone}</p>
                      </td>
                      <td className="p-3.5 font-bold text-foreground">
                        {route.total_stops} Stops
                      </td>
                      <td className="p-3.5">
                        <p className="text-foreground font-semibold">M: {route.morning_departure} ➔ {route.morning_arrival_sfrc}</p>
                        <p className="text-[11px] text-muted-foreground">E: {route.evening_departure_sfrc} ➔ {route.evening_arrival_terminus}</p>
                      </td>
                      <td className="p-3.5">
                        <span className="font-bold text-foreground">{route.occupied_seats}/{route.capacity}</span>
                        <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full bg-sfrc-700 dark:bg-sfrc-300 rounded-full"
                            style={{ width: `${Math.min(100, (route.occupied_seats / route.capacity) * 100)}%` }}
                          />
                        </div>
                      </td>
                      <td className="p-3.5 text-right pr-4">
                        <Button
                          onClick={() => setSelectedRoute(route)}
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 gap-1 font-semibold"
                        >
                          <Eye className="w-3 h-3" />
                          View Stops
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* View Stops Modal */}
        <Dialog open={!!selectedRoute} onOpenChange={(open) => !open && setSelectedRoute(null)}>
          <DialogContent className="max-w-xl">
            {selectedRoute && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-base font-bold">
                    {selectedRoute.route_number}: {selectedRoute.name} — Stops Schedule
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Bus: {selectedRoute.bus_registration} • Driver: {selectedRoute.driver_name} ({selectedRoute.driver_phone})
                  </DialogDescription>
                </DialogHeader>

                <div className="overflow-x-auto max-h-72 border border-border rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 font-bold text-muted-foreground">
                        <th className="p-2.5 pl-3">#</th>
                        <th className="p-2.5">Stop Name</th>
                        <th className="p-2.5">Morning Pickup</th>
                        <th className="p-2.5">Evening Drop</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {selectedRoute.stops.map((s) => (
                        <tr key={s.id}>
                          <td className="p-2.5 pl-3 font-bold text-sfrc-700 dark:text-sfrc-300">{s.stop_order}</td>
                          <td className="p-2.5">
                            <p className="font-bold text-foreground">{s.name}</p>
                            {s.landmark && <p className="text-[10px] text-muted-foreground">{s.landmark}</p>}
                          </td>
                          <td className="p-2.5 font-bold text-foreground">{s.morning_pickup_time}</td>
                          <td className="p-2.5 font-bold text-foreground">{s.evening_drop_time}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <DialogFooter>
                  <Button size="sm" variant="outline" onClick={() => setSelectedRoute(null)} className="text-xs font-semibold">
                    Close
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Create Route Modal */}
        <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Bus className="w-4 h-4 text-sfrc-700 dark:text-sfrc-300" />
                Register New College Transit Route
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Add a new campus transit line and fleet driver allocation.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateRoute} className="space-y-3.5 my-2 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Route Number *</label>
                  <Input
                    value={routeNum}
                    onChange={(e) => setRouteNum(e.target.value)}
                    placeholder="e.g. Route 6"
                    required
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Route Name *</label>
                  <Input
                    value={routeName}
                    onChange={(e) => setRouteName(e.target.value)}
                    placeholder="e.g. West Coast Line"
                    required
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Start Terminus Origin *</label>
                <Input
                  value={startPoint}
                  onChange={(e) => setStartPoint(e.target.value)}
                  placeholder="e.g. Rajapalayam Bus Terminal"
                  required
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Bus Registration</label>
                  <Input
                    value={busReg}
                    onChange={(e) => setBusReg(e.target.value)}
                    placeholder="TN 67 BB 1099"
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Seat Capacity</label>
                  <Input
                    type="number"
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Driver Name</label>
                  <Input
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="Mr. Driver"
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Driver Phone</label>
                  <Input
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    placeholder="+91 98421..."
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Morning Departs</label>
                  <Input
                    value={mornDep}
                    onChange={(e) => setMornDep(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Evening Arrives</label>
                  <Input
                    value={eveArr}
                    onChange={(e) => setEveArr(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setAddModalOpen(false)} className="text-xs font-semibold">
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting} className="bg-sfrc-700 hover:bg-sfrc-800 text-white font-semibold text-xs">
                  {isSubmitting ? 'Saving...' : 'Register Route'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
