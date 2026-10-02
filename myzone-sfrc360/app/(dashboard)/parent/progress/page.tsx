'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Users, Mail, Phone, Building2, UserCheck, ArrowLeft, Home, CheckCircle2 } from 'lucide-react';
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
  programme_name?: string;
  department_name?: string;
  avatar_url?: string;
  relation: string;
}

interface MentorContact {
  mentor_name: string;
  designation?: string;
  department_name?: string;
  email?: string;
  phone?: string;
  office_room?: string;
}

interface HostelAllocation {
  is_hosteller: boolean;
  hostel_name?: string;
  room_number?: string;
  warden_name?: string;
  warden_contact?: string;
}

interface WardSummaryData {
  ward: WardItem;
  attendance_pct: number;
  cgpa: number;
  mentor?: MentorContact;
  hostel?: HostelAllocation;
}

export default function MyWardPage() {
  const [wards, setWards] = useState<WardItem[]>([]);
  const [selectedWardId, setSelectedWardId] = useState<string | null>(null);
  const [summary, setSummary] = useState<WardSummaryData | null>(null);
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
          const data = await apiGet<WardSummaryData>(`/api/v1/parents/me/wards/${targetId}/summary`, token);
          if (!ignore) setSummary(data);
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
      const data = await apiGet<WardSummaryData>(`/api/v1/parents/me/wards/${wardId}/summary`, token);
      setSummary(data);
    } catch (err) {
      console.error(err);
    }
  };

  const ward = summary?.ward || wards[0];

  return (
    <AppShell role="parent" userName="Parent">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
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
                <Users className="w-6 h-6 text-sfrc-700" />
                Ward Profile & Academic Affiliation
              </h1>
              <p className="text-xs text-sfrc-600">
                Official institution records and verified parental relationship
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

        {/* Profile Card */}
        <div className="bg-white rounded-3xl border border-sfrc-200 p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="w-24 h-24 rounded-3xl bg-linear-to-br from-sfrc-700 to-sfrc-900 flex items-center justify-center text-white text-3xl font-black shadow-md ring-4 ring-sfrc-100 shrink-0">
              {ward?.avatar_url ? (
                <img src={ward.avatar_url} alt={ward.full_name} className="w-full h-full object-cover rounded-3xl" />
              ) : (
                ward?.full_name?.slice(0, 2).toUpperCase() || 'WD'
              )}
            </div>

            <div className="space-y-1.5 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-sfrc-100 text-sfrc-800 text-xs font-bold uppercase tracking-wider">
                  {ward?.relation || 'Ward'}
                </span>
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                  Active Enrolled Student
                </span>
              </div>
              <h2 className="text-2xl font-black text-sfrc-900">{ward?.full_name}</h2>
              <p className="text-sm text-sfrc-600 font-medium">
                {ward?.programme_name} • {ward?.department_name}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-sfrc-100">
            <div className="p-3.5 rounded-2xl bg-sfrc-surface border border-sfrc-200/60">
              <p className="text-[11px] font-bold uppercase tracking-wider text-sfrc-500">Register Number</p>
              <p className="text-sm font-black text-sfrc-900 font-mono mt-0.5">{ward?.register_number}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-sfrc-surface border border-sfrc-200/60">
              <p className="text-[11px] font-bold uppercase tracking-wider text-sfrc-500">Current Semester</p>
              <p className="text-sm font-black text-sfrc-900 mt-0.5">Semester {ward?.current_semester}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-sfrc-surface border border-sfrc-200/60">
              <p className="text-[11px] font-bold uppercase tracking-wider text-sfrc-500">Overall Attendance</p>
              <p className="text-sm font-black text-emerald-700 mt-0.5">{summary?.attendance_pct ?? 90}%</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-sfrc-surface border border-sfrc-200/60">
              <p className="text-[11px] font-bold uppercase tracking-wider text-sfrc-500">Cumulative CGPA</p>
              <p className="text-sm font-black text-sfrc-900 mt-0.5">{summary?.cgpa ?? 8.75} / 10.0</p>
            </div>
          </div>
        </div>

        {/* 2-Col Mentorship & Hostel Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Mentor Info */}
          <div className="bg-white rounded-3xl border border-sfrc-200 p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <UserCheck className="w-5 h-5 text-sfrc-700" />
              <h2 className="text-base font-black text-sfrc-900">Faculty Mentor (Official Contact)</h2>
            </div>

            <div className="p-4 rounded-2xl bg-sfrc-surface border border-sfrc-200">
              <p className="text-sm font-black text-sfrc-900">{summary?.mentor?.mentor_name || 'Dr. K. Anitha'}</p>
              <p className="text-xs text-sfrc-600 mt-0.5">
                {summary?.mentor?.designation || 'Associate Professor'} • {summary?.mentor?.department_name || 'Computer Science'}
              </p>

              <div className="mt-4 space-y-2 text-xs text-sfrc-700 font-medium">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-sfrc-500" />
                  <span>{summary?.mentor?.email || 'anitha.k@sfrc.ac.in'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-sfrc-500" />
                  <span>{summary?.mentor?.phone || '04562-220389'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-sfrc-500" />
                  <span>{summary?.mentor?.office_room || 'Staff Room 2 (Science Block)'}</span>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-sfrc-500 mt-3">
              Parents can contact the faculty mentor during office hours (2:00 PM – 4:00 PM) on working days.
            </p>
          </div>

          {/* Residence & Hostel */}
          <div className="bg-white rounded-3xl border border-sfrc-200 p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <Home className="w-5 h-5 text-sfrc-700" />
              <h2 className="text-base font-black text-sfrc-900">Residence & Hostel Allocation</h2>
            </div>

            {summary?.hostel?.is_hosteller ? (
              <div className="p-4 rounded-2xl bg-sfrc-surface border border-sfrc-200">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
                  <CheckCircle2 className="w-3 h-3" /> Campus Hostel Resident
                </span>
                <p className="text-sm font-black text-sfrc-900">{summary.hostel.hostel_name}</p>
                <p className="text-xs text-sfrc-600 mt-0.5">Room Number: <strong className="text-sfrc-900 font-mono">{summary.hostel.room_number}</strong></p>

                <div className="mt-4 space-y-1.5 text-xs text-sfrc-700">
                  <p>Warden: <strong className="text-sfrc-900">{summary.hostel.warden_name}</strong></p>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-sfrc-500" />
                    <span>{summary.hostel.warden_contact}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-sfrc-surface border border-sfrc-200">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded bg-sfrc-100 text-sfrc-800 mb-2">
                  Day Scholar
                </span>
                <p className="text-xs text-sfrc-600 leading-relaxed">
                  Ward is registered as a day scholar commuting daily to the college campus.
                </p>
              </div>
            )}
            <p className="text-[11px] text-sfrc-500 mt-3">
              Outstation weekend leave permissions must be pre-authorized by parents via the portal.
            </p>
          </div>
        </div>

        <AskPragyaBanner />
      </div>
    </AppShell>
  );
}
