'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Building2, Search, MapPin, Users, AlertTriangle, CheckCircle2, PlusCircle, Clock, Layers, ArrowRight, ShieldCheck, RefreshCw, Phone, Accessibility, Compass, ArrowUpRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { apiGet } from '@/lib/api-client';

interface Facility {
  id: string;
  name: string;
  code: string;
  category: string;
  building: string;
  floor?: string;
  capacity?: number;
  operating_hours: string;
  in_charge?: string;
  contact_phone?: string;
  contact_email?: string;
  accessibility: string;
  coordinates?: { lat: number; lng: number };
  description: string;
  open_complaints_count: number;
}

interface FacilityComplaint {
  id: string;
  complaint_number: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
}

const DEFAULT_CATEGORIES = ['All', 'Computer Laboratories', 'Science Laboratories', 'Smart Classrooms', 'Auditoriums & Seminar Halls', 'Sports & Fitness', 'Library Spaces'];

export default function StudentFacilitiesPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [facilityComplaints, setFacilityComplaints] = useState<FacilityComplaint[]>([]);
  const [loadingComplaints, setLoadingComplaints] = useState(false);

  const fetchFacilities = async () => {
    try {
      const [facsData, catsData] = await Promise.all([
        apiGet<Facility[]>('/api/v1/facilities'),
        apiGet<string[]>('/api/v1/facilities/categories').catch(() => []),
      ]);

      if (Array.isArray(facsData)) setFacilities(facsData);
      if (Array.isArray(catsData) && catsData.length > 0) {
        setCategories(['All', ...Array.from(new Set(catsData))]);
      }
    } catch (err) {
      console.error('Failed to load facilities:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const [facsData, catsData] = await Promise.all([
          apiGet<Facility[]>('/api/v1/facilities'),
          apiGet<string[]>('/api/v1/facilities/categories').catch(() => []),
        ]);

        if (!ignore) {
          if (Array.isArray(facsData)) setFacilities(facsData);
          if (Array.isArray(catsData) && catsData.length > 0) setCategories(['All', ...catsData]);
        }
      } catch (err) {
        console.error('Failed to load facilities:', err);
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

  const handleOpenFacilityDetail = async (fac: Facility) => {
    setSelectedFacility(fac);
    try {
      setLoadingComplaints(true);
      const complaints = await apiGet<FacilityComplaint[]>(`/api/v1/facilities/${fac.id}/complaints`);
      if (Array.isArray(complaints)) {
        setFacilityComplaints(complaints);
      }
    } catch {
      setFacilityComplaints([]);
    } finally {
      setLoadingComplaints(false);
    }
  };

  const filteredFacilities = facilities.filter((f) => {
    const matchesSearch =
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.building.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'All' || f.category.toLowerCase() === selectedCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  const totalOpenIssues = facilities.reduce((sum, f) => sum + (f.open_complaints_count || 0), 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sfrc-800 via-sfrc-900 to-slate-950 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-sfrc-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-medium text-sfrc-200">
              <Building2 className="w-3.5 h-3.5 text-amber-300" />
              15 Campus Facilities & 14 Infrastructure Categories
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Campus Facilities & Space Directory</h1>
            <p className="text-sm text-slate-300 max-w-xl">
              Complete catalog of computer laboratories, research centres, auditoriums, hostels, sports arenas,
              and lecture halls with live operating hours and maintenance status.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/student/campus-care">
              <Button className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-semibold shadow-lg shadow-amber-500/20">
                <PlusCircle className="w-4 h-4 mr-2" />
                Report Campus Issue
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-border bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-muted-foreground">Total Listed Facilities</div>
              <div className="text-2xl font-bold text-foreground mt-1">{facilities.length} Spaces</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-sfrc-500/10 text-sfrc-600 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-muted-foreground">Infrastructure Categories</div>
              <div className="text-2xl font-bold text-foreground mt-1">14 Categories</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-muted-foreground">Active Campus Maintenance Issues</div>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{totalOpenIssues}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Category Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search facility name, code (e.g. CS-LAB-01), building, or room..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>

        <div className="flex items-center gap-3">
          <Select value={selectedCategory} onValueChange={(val) => setSelectedCategory(val || 'All')}>
            <SelectTrigger className="w-[220px] bg-background text-xs">
              <SelectValue placeholder="Category Filter" />
            </SelectTrigger>
            <SelectContent>
              {categories.length > 0 ? (
                categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="All">All Categories</SelectItem>
              )}
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={fetchFacilities} title="Refresh Directory">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Facilities Grid (3 cols desktop, 2 cols tablet, 1 col mobile) */}
      {isLoading ? (
        <div className="py-16 text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-sfrc-600" />
          <p className="text-sm text-muted-foreground">Loading 15 campus facilities and live status...</p>
        </div>
      ) : filteredFacilities.length === 0 ? (
        <Card className="py-16 text-center">
          <CardContent className="space-y-4">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto stroke-1" />
            <div>
              <h3 className="text-lg font-semibold">No facilities found</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                No campus spaces matched your current search or category filter.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredFacilities.map((fac) => {
            const hasOpenIssues = (fac.open_complaints_count || 0) > 0;

            return (
              <Card
                key={fac.id}
                className="hover:shadow-lg transition-all border border-border bg-card flex flex-col justify-between overflow-hidden"
              >
                <div>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border">
                        {fac.code}
                      </span>
                      {hasOpenIssues ? (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300 text-xs">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {fac.open_complaints_count} Open Issue{fac.open_complaints_count > 1 ? 's' : ''}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300 text-xs">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Operational
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-base font-bold pt-2 line-clamp-1">{fac.name}</CardTitle>
                    <CardDescription className="text-xs line-clamp-1">
                      {fac.category}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-2.5 text-xs text-muted-foreground pt-0">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-sfrc-600 flex-shrink-0" />
                      <span>
                        {fac.building} {fac.floor ? `• ${fac.floor}` : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>{fac.operating_hours}</span>
                    </div>

                    {fac.capacity && (
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span>Capacity: {fac.capacity} Persons</span>
                      </div>
                    )}

                    {fac.in_charge && (
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span>In-Charge: {fac.in_charge}</span>
                      </div>
                    )}
                  </CardContent>
                </div>

                <div className="p-3.5 border-t border-border bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleOpenFacilityDetail(fac)}
                    className="text-xs text-sfrc-700 dark:text-sfrc-300 px-2"
                  >
                    View Details
                    <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                  </Button>

                  <Link
                    href={`/student/campus-care?facility_id=${encodeURIComponent(
                      fac.id
                    )}&facility_name=${encodeURIComponent(fac.name)}`}
                  >
                    <Button size="sm" variant="outline" className="text-xs hover:bg-sfrc-50 dark:hover:bg-sfrc-950 font-medium">
                      Report Issue
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── FACILITY DETAIL & COMPLAINTS DIALOG ──────────────────────────────── */}
      <Dialog open={!!selectedFacility} onOpenChange={(open) => !open && setSelectedFacility(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedFacility && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border">
                    {selectedFacility.code}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {selectedFacility.category}
                  </Badge>
                </div>
                <DialogTitle className="text-lg pt-2">{selectedFacility.name}</DialogTitle>
                <DialogDescription className="text-xs">
                  {selectedFacility.building} • {selectedFacility.floor || 'Campus'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 py-2 text-xs">
                {/* Description */}
                <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-1">
                  <div className="font-semibold text-foreground">Facility Description:</div>
                  <p className="text-muted-foreground leading-relaxed">{selectedFacility.description}</p>
                </div>

                {/* Operating & Contact Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-xl border border-border space-y-2">
                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-sfrc-600" />
                      Operating Hours
                    </div>
                    <div className="text-muted-foreground">{selectedFacility.operating_hours}</div>
                    {selectedFacility.capacity && (
                      <div className="text-muted-foreground pt-1">
                        Seating Capacity: <strong>{selectedFacility.capacity} Persons</strong>
                      </div>
                    )}
                  </div>

                  <div className="p-3.5 rounded-xl border border-border space-y-2">
                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-sfrc-600" />
                      Administration & In-Charge
                    </div>
                    <div className="text-muted-foreground">{selectedFacility.in_charge || 'Estate Office'}</div>
                    {selectedFacility.contact_phone && (
                      <div className="text-muted-foreground flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {selectedFacility.contact_phone}
                      </div>
                    )}
                  </div>
                </div>

                {/* Accessibility */}
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 space-y-1">
                  <div className="font-semibold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                    <Accessibility className="w-4 h-4 text-emerald-600" />
                    Divyangjan & Universal Accessibility Features:
                  </div>
                  <p className="text-emerald-800 dark:text-emerald-300 leading-relaxed">
                    {selectedFacility.accessibility}
                  </p>
                </div>

                {/* Map Coordinates Placeholder (Phase 17 Map ready) */}
                {selectedFacility.coordinates && (
                  <div className="p-3.5 rounded-xl border border-dashed border-border bg-slate-50 dark:bg-slate-900/40 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Compass className="w-4 h-4 text-sfrc-600" />
                      <span className="font-medium text-foreground">GIS Coordinates:</span>
                      <span className="font-mono text-muted-foreground">
                        {selectedFacility.coordinates.lat}° N, {selectedFacility.coordinates.lng}° E
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      Campus Map Ready
                    </Badge>
                  </div>
                )}

                {/* Open Complaints on this Facility */}
                <div className="space-y-2 pt-1">
                  <div className="font-semibold text-foreground flex items-center justify-between">
                    <span>Active Maintenance Reports ({facilityComplaints.length})</span>
                    <Link
                      href={`/student/campus-care?facility_id=${encodeURIComponent(
                        selectedFacility.id
                      )}&facility_name=${encodeURIComponent(selectedFacility.name)}`}
                    >
                      <Button size="sm" variant="outline" className="text-xs h-7">
                        <PlusCircle className="w-3.5 h-3.5 mr-1 text-amber-600" />
                        Report New Issue Here
                      </Button>
                    </Link>
                  </div>

                  {loadingComplaints ? (
                    <div className="py-4 text-center text-muted-foreground">Loading facility issues...</div>
                  ) : facilityComplaints.length > 0 ? (
                    <div className="space-y-2">
                      {facilityComplaints.map((c) => (
                        <div
                          key={c.id}
                          className="p-3 rounded-lg border border-border bg-card flex items-center justify-between"
                        >
                          <div>
                            <span className="font-mono font-bold">{c.complaint_number}</span>: {c.title}
                          </div>
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {c.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-muted/30 text-center text-muted-foreground text-xs">
                      No open complaints for this facility. All equipment operational.
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedFacility(null)}>
                  Close
                </Button>
                <Link
                  href={`/student/campus-care?facility_id=${encodeURIComponent(
                    selectedFacility.id
                  )}&facility_name=${encodeURIComponent(selectedFacility.name)}`}
                >
                  <Button className="bg-sfrc-700 hover:bg-sfrc-800 text-white">
                    Report Issue on this Space
                  </Button>
                </Link>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
