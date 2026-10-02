'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Home, Phone, CheckCircle2, ArrowLeft } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import AskPragyaBanner from '@/components/shared/AskPragyaBanner';
import { createClient } from '@/lib/supabase/client';
import { apiGet } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface WardItem {
  student_id: string;
  full_name: string;
  register_number: string;
}

interface HostelInfo {
  is_hosteller: boolean;
  hostel_name?: string;
  room_number?: string;
  warden_name?: string;
  warden_contact?: string;
  pending_leaves_count?: number;
}

export default function ParentHostelPage() {
  const [wards, setWards] = useState<WardItem[]>([]);
  const [selectedWardId, setSelectedWardId] = useState<string | null>(null);
  const [hostel, setHostel] = useState<HostelInfo | null>(null);
    const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const wardList = await apiGet<WardItem[]>('/api/v1/parents/me/wards', token).catch(() => []);
        if (!ignore) {
          setWards(wardList);
        }

        const targetId = selectedWardId || (wardList.length > 0 ? wardList[0].student_id : null);
        if (targetId) {
          if (!ignore) setSelectedWardId(targetId);
          const data = await apiGet<HostelInfo>(`/api/v1/parents/me/wards/${targetId}/hostel`, token);
          if (!ignore) setHostel(data);
        }
      } catch (err) {
        console.error(err);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [selectedWardId, supabase]);

  const handleWardChange = async (wardId: string) => {
    setSelectedWardId(wardId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const data = await apiGet<HostelInfo>(`/api/v1/parents/me/wards/${wardId}/hostel`, token);
      setHostel(data);
    } catch (err) {
      console.error(err);
    }
  };

  const selectedWard = wards.find((w) => w.student_id === selectedWardId) || wards[0];

  return (
    <AppShell role="parent" userName="Parent">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
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
                <Home className="w-6 h-6 text-sfrc-700" />
                Hostel & Residential Welfare
              </h1>
              <p className="text-xs text-sfrc-600">
                Hostel room allocation and warden contacts for {selectedWard?.full_name || 'Ward'}
              </p>
            </div>
          </div>

          {wards.length > 1 && (
            <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-sfrc-200">
              {wards.map((w) => (
                <button
                  key={w.student_id}
                  onClick={() => handleWardChange(w.student_id)}
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

        {hostel?.is_hosteller ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl border border-sfrc-200 p-6 shadow-xs">
              <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 mb-4">
                <CheckCircle2 className="w-4 h-4" /> Allocated & Active Resident
              </span>
              <h2 className="text-xl font-black text-sfrc-900">{hostel.hostel_name}</h2>
              <p className="text-xs text-sfrc-600 mt-1">Campus Residential Complex</p>

              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="p-4 rounded-2xl bg-sfrc-surface border border-sfrc-200">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-sfrc-500">Room Number</p>
                  <p className="text-lg font-black text-sfrc-900 font-mono mt-1">{hostel.room_number}</p>
                </div>
                <div className="p-4 rounded-2xl bg-sfrc-surface border border-sfrc-200">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-sfrc-500">Mess Facility</p>
                  <p className="text-sm font-bold text-emerald-700 mt-1">Vegetarian / Non-Veg</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-sfrc-200 p-6 shadow-xs flex flex-col justify-between">
              <div>
                <h2 className="text-base font-black text-sfrc-900 mb-3">Residential Warden Contact</h2>
                <div className="p-4 rounded-2xl bg-sfrc-surface border border-sfrc-200 space-y-2">
                  <p className="text-sm font-bold text-sfrc-900">{hostel.warden_name}</p>
                  <div className="flex items-center gap-2 text-xs text-sfrc-700">
                    <Phone className="w-4 h-4 text-sfrc-500" />
                    <span>{hostel.warden_contact}</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-sfrc-500 mt-4 leading-relaxed">
                Hostel gate curfew is strictly 6:30 PM. For emergency leave or medical approvals, parents may dial the warden helpline.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-sfrc-200 p-8 text-center max-w-xl mx-auto shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-sfrc-100 flex items-center justify-center text-sfrc-700 mx-auto mb-3">
              <Home className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-black text-sfrc-900">Day Scholar Status</h2>
            <p className="text-xs text-sfrc-600 mt-1 leading-relaxed">
              {selectedWard?.full_name || 'Ward'} is registered as a day scholar commuting daily. If you wish to apply for hostel accommodation, please contact the college administration office.
            </p>
          </div>
        )}

        <AskPragyaBanner />
      </div>
    </AppShell>
  );
}
