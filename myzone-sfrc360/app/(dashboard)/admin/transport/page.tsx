'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Bus,
  PlusCircle,
  Loader2,
  AlertCircle,
  Eye,
  Ticket,
  Users,
  UserCheck,
  Trash2,
  Search,
} from 'lucide-react';
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
import { apiGet, apiPost, apiDelete } from '@/lib/api-client';
import type { TransportRouteItem } from '@/lib/types';

interface TransportAllocationItem {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_type: string;
  register_number?: string;
  employee_id?: string;
  route_id: string;
  route_number: string;
  route_name: string;
  boarding_stop_id: string;
  boarding_stop_name: string;
  seat_number: string;
  pass_number: string;
  status: string;
  valid_until: string;
  academic_year: string;
  created_at: string;
}

export default function AdminTransportPage() {
  const [activeTab, setActiveTab] = useState<'routes' | 'allocations'>('routes');
  const [routes, setRoutes] = useState<TransportRouteItem[]>([]);
  const [allocations, setAllocations] = useState<TransportAllocationItem[]>([]);
  const [usersList, setUsersList] = useState<Array<any>>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [allocateModalOpen, setAllocateModalOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<TransportRouteItem | null>(null);

  // Route Form State
  const [routeNum, setRouteNum] = useState('');
  const [routeName, setRouteName] = useState('');
  const [startPoint, setStartPoint] = useState('');
  const [busReg, setBusReg] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [mornDep, setMornDep] = useState('08:15 AM');
  const [eveArr, setEveArr] = useState('04:45 PM');
  const [capacity, setCapacity] = useState(50);

  // Allocation Form State
  const [allocUserId, setAllocUserId] = useState('');
  const [allocRouteId, setAllocRouteId] = useState('');
  const [allocStopId, setAllocStopId] = useState('');
  const [allocSeatNo, setAllocSeatNo] = useState('14A');

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

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = await getAuthToken();
      const [rRes, aRes, uRes] = await Promise.allSettled([
        apiGet<TransportRouteItem[]>('/api/v1/transport/routes', token),
        apiGet<TransportAllocationItem[]>('/api/v1/admin/transport/allocations', token),
        apiGet<{ data: Array<any> }>('/api/v1/admin/users?limit=100', token),
      ]);

      if (rRes.status === 'fulfilled' && Array.isArray(rRes.value)) {
        setRoutes(rRes.value);
        if (!allocRouteId && rRes.value.length > 0) {
          setAllocRouteId(rRes.value[0].id);
          if (rRes.value[0].stops && rRes.value[0].stops.length > 0) {
            setAllocStopId(rRes.value[0].stops[0].name);
          }
        }
      }
      if (aRes.status === 'fulfilled' && Array.isArray(aRes.value)) {
        setAllocations(aRes.value);
      }
      if (uRes.status === 'fulfilled' && uRes.value?.data) {
        setUsersList(uRes.value.data.filter((u: any) => u.role === 'student' || u.role === 'faculty'));
      }
    } catch (err) {
      console.error('Failed to load transport data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [getAuthToken, allocRouteId]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!ignore) {
        await loadData();
      }
    })();
    return () => {
      ignore = true;
    };
  }, [loadData]);

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
      await loadData();
    } catch (err) {
      console.error('Failed to create route:', err);
      alert('Could not register route.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAllocateTransport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocUserId || !allocRouteId || !allocStopId) {
      alert('Please select Passenger, Route, and Boarding Stop.');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await getAuthToken();
      await apiPost(
        '/api/v1/admin/transport/allocations',
        {
          user_id: allocUserId,
          route_id: allocRouteId,
          boarding_stop_id: allocStopId,
          seat_number: allocSeatNo || '14A',
          academic_year: '2025-2026',
        },
        token
      );

      setAllocateModalOpen(false);
      setAllocUserId('');
      await loadData();
    } catch (err) {
      console.error('Failed to allocate transport:', err);
      alert('Could not allocate bus pass.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeAllocation = async (id: string, userName: string) => {
    if (!confirm(`Revoke transport bus pass allocation for ${userName}?`)) return;
    try {
      const token = await getAuthToken();
      await apiDelete(`/api/v1/admin/transport/allocations/${id}`, token);
      await loadData();
    } catch (err) {
      console.error('Failed to revoke pass:', err);
      alert('Failed to revoke pass.');
    }
  };

  const selectedRouteStops = useMemo(() => {
    const r = routes.find((rt) => rt.id === allocRouteId || rt.route_number === allocRouteId);
    return r?.stops || [];
  }, [routes, allocRouteId]);

  const filteredAllocations = useMemo(() => {
    if (!searchTerm.trim()) return allocations;
    const q = searchTerm.toLowerCase();
    return allocations.filter(
      (a) =>
        a.user_name?.toLowerCase().includes(q) ||
        a.pass_number?.toLowerCase().includes(q) ||
        a.route_number?.toLowerCase().includes(q) ||
        a.boarding_stop_name?.toLowerCase().includes(q) ||
        a.register_number?.toLowerCase().includes(q)
    );
  }, [allocations, searchTerm]);

  return (
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
            Administer institutional bus routes, stop sequences, live telemetry, and passenger allocations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => setAllocateModalOpen(true)}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 text-xs font-bold shadow-xs cursor-pointer"
          >
            <Ticket className="w-4 h-4" />
            Allocate Bus Pass
          </Button>
          <Button
            onClick={() => setAddModalOpen(true)}
            size="sm"
            className="bg-sfrc-700 hover:bg-sfrc-800 text-white gap-2 text-xs font-bold shadow-xs cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            Add Route
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab('routes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
            activeTab === 'routes'
              ? 'bg-sfrc-700 text-white'
              : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
          }`}
        >
          <Bus className="w-3.5 h-3.5" />
          <span>Active Fleet Routes</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/20">{routes.length}</span>
        </button>
        <button
          onClick={() => setActiveTab('allocations')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
            activeTab === 'allocations'
              ? 'bg-sfrc-700 text-white'
              : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
          }`}
        >
          <Ticket className="w-3.5 h-3.5" />
          <span>Passenger Pass Allocations</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-400">
            {allocations.length}
          </span>
        </button>
      </div>

      {/* TAB 1: FLEET ROUTES */}
      {activeTab === 'routes' && (
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
                        <p className="text-[11px] text-muted-foreground">
                          {route.start_point} ➔ {route.destination}
                        </p>
                      </td>
                      <td className="p-3.5 font-mono text-muted-foreground font-semibold">
                        {route.bus_registration}
                      </td>
                      <td className="p-3.5">
                        <p className="font-semibold text-foreground">{route.driver_name}</p>
                        <p className="text-[11px] text-muted-foreground">{route.driver_phone}</p>
                      </td>
                      <td className="p-3.5 font-bold text-foreground">{route.total_stops} Stops</td>
                      <td className="p-3.5">
                        <p className="text-foreground font-semibold">
                          M: {route.morning_departure} ➔ {route.morning_arrival_sfrc}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          E: {route.evening_departure_sfrc} ➔ {route.evening_arrival_terminus}
                        </p>
                      </td>
                      <td className="p-3.5">
                        <span className="font-bold text-foreground">
                          {route.occupied_seats}/{route.capacity}
                        </span>
                        <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full bg-sfrc-700 dark:bg-sfrc-300 rounded-full"
                            style={{
                              width: `${Math.min(100, (route.occupied_seats / route.capacity) * 100)}%`,
                            }}
                          />
                        </div>
                      </td>
                      <td className="p-3.5 text-right pr-4">
                        <Button
                          onClick={() => setSelectedRoute(route)}
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 gap-1 font-semibold cursor-pointer"
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
      )}

      {/* TAB 2: PASSENGER ALLOCATIONS */}
      {activeTab === 'allocations' && (
        <Card className="overflow-hidden border-border shadow-xs">
          <div className="p-4 bg-muted/30 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-bold">Passenger Bus Pass Roster</CardTitle>
              <CardDescription className="text-xs">
                Showing {filteredAllocations.length} institutional bus passes allocated to students and staff
              </CardDescription>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search passenger, pass, route..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 text-xs h-8"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground font-bold">
                  <th className="p-3.5 pl-4">Pass Number</th>
                  <th className="p-3.5">Passenger Name</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Route</th>
                  <th className="p-3.5">Boarding Stop</th>
                  <th className="p-3.5 text-center">Seat</th>
                  <th className="p-3.5">Valid Until</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right pr-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-muted-foreground">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-sfrc-700 dark:text-sfrc-300 mb-2" />
                      Loading bus pass allocations…
                    </td>
                  </tr>
                ) : filteredAllocations.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-muted-foreground">
                      No bus pass allocations found. Click &quot;Allocate Bus Pass&quot; to assign a route.
                    </td>
                  </tr>
                ) : (
                  filteredAllocations.map((alloc) => (
                    <tr key={alloc.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-3.5 pl-4 font-mono font-bold text-sfrc-700 dark:text-sfrc-300">
                        {alloc.pass_number}
                      </td>
                      <td className="p-3.5">
                        <p className="font-bold text-foreground">{alloc.user_name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {alloc.register_number || alloc.employee_id || alloc.user_email}
                        </p>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            alloc.user_type === 'faculty'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          }`}
                        >
                          {alloc.user_type}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <p className="font-bold text-foreground">{alloc.route_number}</p>
                        <p className="text-[11px] text-muted-foreground">{alloc.route_name}</p>
                      </td>
                      <td className="p-3.5 font-semibold text-foreground">
                        {alloc.boarding_stop_name}
                      </td>
                      <td className="p-3.5 text-center font-mono font-bold text-sfrc-800 dark:text-sfrc-200">
                        {alloc.seat_number}
                      </td>
                      <td className="p-3.5 text-muted-foreground">{alloc.valid_until}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[10px] uppercase">
                          {alloc.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right pr-4">
                        <Button
                          onClick={() => handleRevokeAllocation(alloc.id, alloc.user_name)}
                          size="sm"
                          variant="ghost"
                          className="text-xs h-7 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Revoke
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Allocate Bus Pass Modal */}
      <Dialog open={allocateModalOpen} onOpenChange={setAllocateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Ticket className="w-4 h-4 text-emerald-600" />
              Allocate Transit Bus Pass
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Assign a college transit line, boarding stop, and seat number to a student or faculty member.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAllocateTransport} className="space-y-3.5 my-2 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-foreground">Select Passenger (Student / Faculty) *</label>
              <select
                value={allocUserId}
                onChange={(e) => setAllocUserId(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-border text-xs bg-background text-foreground"
              >
                <option value="">-- Choose Student or Staff Member --</option>
                {usersList.map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} ({u.register_number || u.employee_id || u.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-foreground">College Bus Route *</label>
                <select
                  value={allocRouteId}
                  onChange={(e) => {
                    setAllocRouteId(e.target.value);
                    const r = routes.find((rt) => rt.id === e.target.value);
                    if (r && r.stops && r.stops.length > 0) {
                      setAllocStopId(r.stops[0].name);
                    }
                  }}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-border text-xs bg-background text-foreground"
                >
                  <option value="">-- Choose Route --</option>
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.route_number}: {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Seat Number</label>
                <Input
                  value={allocSeatNo}
                  onChange={(e) => setAllocSeatNo(e.target.value)}
                  placeholder="e.g. 14A"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground">Boarding Stop *</label>
              <select
                value={allocStopId}
                onChange={(e) => setAllocStopId(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-border text-xs bg-background text-foreground"
              >
                <option value="">-- Choose Boarding Stop --</option>
                {selectedRouteStops.map((st) => (
                  <option key={st.id} value={st.name}>
                    Stop {st.stop_order}: {st.name} (Pick: {st.morning_pickup_time})
                  </option>
                ))}
              </select>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAllocateModalOpen(false)}
                className="text-xs font-semibold cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs cursor-pointer"
              >
                {isSubmitting ? 'Allocating...' : 'Confirm Bus Pass'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
                  Bus: {selectedRoute.bus_registration} • Driver: {selectedRoute.driver_name} (
                  {selectedRoute.driver_phone})
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
                        <td className="p-2.5 pl-3 font-bold text-sfrc-700 dark:text-sfrc-300">
                          {s.stop_order}
                        </td>
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
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedRoute(null)}
                  className="text-xs font-semibold cursor-pointer"
                >
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAddModalOpen(false)}
                className="text-xs font-semibold cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="bg-sfrc-700 hover:bg-sfrc-800 text-white font-semibold text-xs cursor-pointer"
              >
                {isSubmitting ? 'Saving...' : 'Register Route'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
