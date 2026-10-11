'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Search,
  MapPin,
  Users,
  Clock,
  Layers,
  Phone,
  Accessibility,
  CheckCircle2,
  Loader2,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import AppShell from '@/components/layout/AppShell';
import { createClient } from '@/lib/supabase/client';
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

const CATEGORIES = [
  'All',
  'Computer Laboratories',
  'Science Laboratories',
  'Smart Classrooms',
  'Auditoriums & Seminar Halls',
  'Library Spaces',
  'Sports & Fitness',
];

export default function FacultyFacilitiesPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const loadFacilities = async () => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await apiGet<Facility[]>('/api/v1/facilities', token);
      if (res) {
        setFacilities(res);
      }
    } catch (err: unknown) {
      console.error('Failed to load facilities:', err);
      const msg = err instanceof Error ? err.message : 'Failed to fetch facilities directory.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFacilities();
  }, [supabase]);

  const filteredFacilities = facilities.filter((f) => {
    const matchesCat =
      selectedCategory === 'All' ||
      f.category.toLowerCase().includes(selectedCategory.toLowerCase());
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      f.name.toLowerCase().includes(q) ||
      f.code.toLowerCase().includes(q) ||
      f.building.toLowerCase().includes(q) ||
      f.category.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  return (
    <AppShell role="faculty" userName="Faculty">
      <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
        {/* Header Banner */}
        <div className="bg-white p-6 rounded-3xl border border-sfrc-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sfrc-100 text-sfrc-700 text-xs font-bold uppercase tracking-wider mb-2">
              <Building2 className="w-3.5 h-3.5" />
              Campus Infrastructure & Labs
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-sfrc-900 tracking-tight">
              Campus Facilities & Resource Directory
            </h1>
            <p className="text-xs sm:text-sm text-sfrc-600 mt-1">
              Central computer labs, research centers, seminar halls, and smart classrooms available for faculty booking and teaching.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-2xl bg-sfrc-50 border border-sfrc-200 text-xs font-medium text-sfrc-700">
              Total Facilities: <strong className="text-sfrc-900 font-bold">{facilities.length}</strong>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-3xl border border-sfrc-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-sfrc-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search labs, buildings, codes..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-sfrc-200 bg-sfrc-50 text-xs text-sfrc-900 focus:outline-none focus:ring-2 focus:ring-sfrc-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-sfrc-900 text-white'
                      : 'bg-sfrc-50 text-sfrc-700 hover:bg-sfrc-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Facilities Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20 bg-white rounded-3xl border border-sfrc-200">
            <Loader2 className="w-8 h-8 animate-spin text-sfrc-600" />
          </div>
        ) : filteredFacilities.length === 0 ? (
          <div className="bg-white rounded-3xl border border-sfrc-200 p-12 text-center space-y-3">
            <Building2 className="w-12 h-12 text-sfrc-300 mx-auto" />
            <h3 className="text-base font-bold text-sfrc-900">No Facilities Found</h3>
            <p className="text-xs text-sfrc-500 max-w-md mx-auto">
              No campus facility found matching your search or category filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFacilities.map((fac) => (
              <div
                key={fac.id}
                className="bg-white rounded-3xl border border-sfrc-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-sfrc-100 text-sfrc-800 font-mono text-xs font-bold">
                      {fac.code}
                    </span>
                    <span className="text-xs font-semibold text-sfrc-500">
                      {fac.category}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-sfrc-900 line-clamp-2">
                    {fac.name}
                  </h3>
                  <p className="text-xs text-sfrc-500 line-clamp-2">
                    {fac.description}
                  </p>

                  <div className="space-y-2 text-xs text-sfrc-600 pt-2 border-t border-sfrc-100">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-sfrc-400" />
                      <span>{fac.building} {fac.floor ? `(${fac.floor})` : ''}</span>
                    </div>
                    {fac.capacity && (
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-sfrc-400" />
                        <span>Capacity: {fac.capacity} Persons</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-sfrc-400" />
                      <span>{fac.operating_hours}</span>
                    </div>
                    {fac.in_charge && (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>In-Charge: {fac.in_charge}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-sfrc-100 flex items-center justify-between">
                  <button
                    onClick={() => setSelectedFacility(fac)}
                    className="w-full px-4 py-2 rounded-xl bg-sfrc-50 hover:bg-sfrc-100 text-sfrc-800 text-xs font-bold transition-colors text-center"
                  >
                    View Facility Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Facility Detail Modal */}
        {selectedFacility && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-sfrc-200 space-y-5">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-lg bg-sfrc-100 text-sfrc-800 text-xs font-bold">
                  {selectedFacility.code} • {selectedFacility.category}
                </span>
                <button
                  onClick={() => setSelectedFacility(null)}
                  className="w-8 h-8 rounded-full bg-sfrc-100 hover:bg-sfrc-200 flex items-center justify-center text-sfrc-700 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div>
                <h3 className="text-xl font-bold text-sfrc-900">
                  {selectedFacility.name}
                </h3>
                <p className="text-xs text-sfrc-600 mt-2 leading-relaxed">
                  {selectedFacility.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-sfrc-50 p-4 rounded-2xl border border-sfrc-100">
                <div>
                  <span className="text-sfrc-500 block mb-0.5">Location</span>
                  <span className="font-bold text-sfrc-900">{selectedFacility.building} ({selectedFacility.floor})</span>
                </div>
                <div>
                  <span className="text-sfrc-500 block mb-0.5">Operating Hours</span>
                  <span className="font-bold text-sfrc-900">{selectedFacility.operating_hours}</span>
                </div>
                <div>
                  <span className="text-sfrc-500 block mb-0.5">Capacity</span>
                  <span className="font-bold text-sfrc-900">{selectedFacility.capacity || 'N/A'} persons</span>
                </div>
                <div>
                  <span className="text-sfrc-500 block mb-0.5">Faculty In-Charge</span>
                  <span className="font-bold text-sfrc-900">{selectedFacility.in_charge || 'Head of Dept.'}</span>
                </div>
              </div>

              {selectedFacility.accessibility && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-xs text-emerald-900">
                  <div className="flex items-center gap-1.5 font-bold mb-0.5">
                    <Accessibility className="w-3.5 h-3.5 text-emerald-700" />
                    Accessibility Features:
                  </div>
                  {selectedFacility.accessibility}
                </div>
              )}

              {selectedFacility.contact_phone && (
                <div className="flex items-center gap-2 text-xs text-sfrc-700">
                  <Phone className="w-3.5 h-3.5 text-sfrc-400" />
                  <span>Contact: {selectedFacility.contact_phone} ({selectedFacility.contact_email})</span>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedFacility(null)}
                  className="px-5 py-2 rounded-xl bg-sfrc-900 text-white text-xs font-bold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
