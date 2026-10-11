'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Users, Mail, Phone, Building2, UserCheck, ArrowLeft, Home, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
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
  section?: string;
  batch?: string;
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
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let ignore = false;
    (async () => {
      setIsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const wardList = await apiGet<WardItem[]>('/api/v1/parents/me/wards', token).catch(() => []);
        if (ignore) return;
        setWards(wardList || []);

        const targetId = selectedWardId || (wardList && wardList.length > 0 ? wardList[0].student_id : null);
        if (targetId) {
          setSelectedWardId(targetId);
          setIsLoadingSummary(true);
          const data = await apiGet<WardSummaryData>(`/api/v1/parents/me/wards/${encodeURIComponent(targetId)}/summary`, token);
          if (!ignore) setSummary(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!ignore) {
          setIsLoading(false);
          setIsLoadingSummary(false);
        }
      }
    })();

    return () => {
      ignore = true;
    };
  }, [supabase]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleWardChange = async (wardId: string) => {
    if (wardId === selectedWardId) return;
    setSelectedWardId(wardId);
    setSummary(null);
    setIsLoadingSummary(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const data = await apiGet<WardSummaryData>(`/api/v1/parents/me/wards/${encodeURIComponent(wardId)}/summary`, token);
      setSummary(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingSummary(false);
    }
  };

  if (isLoading) {
    return (
      <AppShell role="parent" userName="Parent">
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-sfrc-700" />
          <p className="text-xs font-semibold text-sfrc-600">Loading student profile…</p>
        </div>
      </AppShell>
    );
  }

  if (wards.length === 0) {
    return (
      <AppShell role="parent" userName="Parent">
        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
          <div className="bg-white rounded-3xl border border-sfrc-200 p-8 sm:p-12 text-center shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-800 mb-4">
              <Users className="w-8 h-8" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-sfrc-900 tracking-tight">
              No Linked Students
            </h1>
            <p className="text-sm text-sfrc-600 mt-2 max-w-lg mx-auto">
              No students are linked to your parent account yet. Please contact the college administrator.
            </p>
          </div>
          <AskPragyaBanner />
        </div>
      </AppShell>
    );
  }

  const ward = summary?.ward || wards.find((w) => w.student_id === selectedWardId) || wards[0];

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
                  type="button"
                  onClick={() => handleWardChange(w.student_id)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                    selectedWardId === w.student_id
                      ? 'bg-sfrc-700 text-white shadow-xs'
                      : 'text-sfrc-700 hover:bg-sfrc-100'
                  )}
                >
                  {w.full_name} ({w.register_number})
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Profile Card */}
        {isLoadingSummary ? (
          <div className="bg-white rounded-3xl border border-sfrc-200 p-12 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-sfrc-700" />
            <p className="text-xs text-sfrc-500">Loading ward details…</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-sfrc-200 p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-sfrc-700 to-sfrc-900 flex items-center justify-center text-white text-2xl font-black shadow-md shrink-0">
                {ward?.avatar_url ? (
                  <img src={ward.avatar_url} alt={ward.full_name} className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  ward?.full_name?.slice(0, 2).toUpperCase() || 'WD'
                )}
              </div>

              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-sfrc-100 text-sfrc-800 text-xs font-bold">
                    {ward?.relation || 'Ward'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md bg-sfrc-surface border border-sfrc-200 text-sfrc-700 font-mono text-xs font-bold">
                    {ward?.register_number}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center gap-1 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Enrolled & Active
                  </span>
                </div>
                <h2 className="text-2xl font-black text-sfrc-900 tracking-tight">{ward?.full_name}</h2>
                <p className="text-xs sm:text-sm text-sfrc-600">
                  {ward?.programme_name} • {ward?.department_name}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-8 border-t border-sfrc-200 text-xs">
              <div>
                <p className="text-sfrc-500 uppercase tracking-wider font-semibold text-[10px]">Current Semester</p>
                <p className="font-bold text-sfrc-900 mt-0.5">Semester {ward?.current_semester || 1}</p>
              </div>
              <div>
                <p className="text-sfrc-500 uppercase tracking-wider font-semibold text-[10px]">Section / Batch</p>
                <p className="font-bold text-sfrc-900 mt-0.5">
                  {ward?.section ? `Sec ${ward.section}` : 'General'} {ward?.batch ? `(${ward.batch})` : ''}
                </p>
              </div>
              <div>
                <p className="text-sfrc-500 uppercase tracking-wider font-semibold text-[10px]">Academic CGPA</p>
                <p className="font-bold text-sfrc-900 mt-0.5 font-mono">
                  {summary?.cgpa && summary.cgpa > 0 ? `${summary.cgpa.toFixed(2)} / 10.0` : 'Pending'}
                </p>
              </div>
              <div>
                <p className="text-sfrc-500 uppercase tracking-wider font-semibold text-[10px]">Overall Attendance</p>
                <p className="font-bold text-sfrc-900 mt-0.5 font-mono">
                  {summary?.attendance_pct !== undefined && summary.attendance_pct > 0
                    ? `${summary.attendance_pct.toFixed(1)}%`
                    : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 2-Col Grid: Mentor + Hostel */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl border border-sfrc-200 p-6 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-sfrc-700 flex items-center gap-2 mb-3">
              <UserCheck className="w-4 h-4" /> Academic Mentor
            </h3>
            {summary?.mentor ? (
              <>
                <p className="text-base font-black text-sfrc-900">{summary.mentor.mentor_name}</p>
                <p className="text-xs text-sfrc-600 mb-4">
                  {summary.mentor.designation || 'Faculty'} • {summary.mentor.department_name || 'Department'}
                </p>
                <div className="space-y-2 text-xs text-sfrc-700">
                  {summary.mentor.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-sfrc-500" />
                      <span>{summary.mentor.email}</span>
                    </div>
                  )}
                  {summary.mentor.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-sfrc-500" />
                      <span>{summary.mentor.phone}</span>
                    </div>
                  )}
                  {summary.mentor.office_room && (
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-sfrc-500" />
                      <span>{summary.mentor.office_room}</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="text-xs text-sfrc-500 py-4">No mentor assigned for this ward yet.</p>
            )}
          </div>

          <div className="bg-white rounded-3xl border border-sfrc-200 p-6 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-sfrc-700 flex items-center gap-2 mb-3">
              <Home className="w-4 h-4" /> Residential Details
            </h3>
            {summary?.hostel?.is_hosteller ? (
              <>
                <p className="text-base font-black text-sfrc-900">{summary.hostel.hostel_name}</p>
                <p className="text-xs text-sfrc-600 mb-4">
                  Room: <span className="font-mono font-bold text-sfrc-900">{summary.hostel.room_number || 'Allocated'}</span>
                </p>
                {summary.hostel.warden_name && (
                  <p className="text-xs text-sfrc-700">Warden: <strong className="text-sfrc-900">{summary.hostel.warden_name}</strong></p>
                )}
                {summary.hostel.warden_contact && (
                  <div className="flex items-center gap-2 text-xs text-sfrc-700 mt-1">
                    <Phone className="w-3.5 h-3.5 text-sfrc-500" />
                    <span>{summary.hostel.warden_contact}</span>
                  </div>
                )}
              </>
            ) : (
              <div>
                <p className="text-sm font-bold text-sfrc-900">Day Scholar</p>
                <p className="text-xs text-sfrc-600 mt-1">
                  Ward is not registered in the campus hostel facilities.
                </p>
              </div>
            )}
          </div>
        </div>

        <AskPragyaBanner />
      </div>
    </AppShell>
  );
}
