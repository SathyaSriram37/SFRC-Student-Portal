'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';

import { Users, ShieldCheck, CheckCircle, RefreshCw, Search, Clock, Check, MessageSquare } from 'lucide-react';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

import { apiGet, apiPut } from '@/lib/api-client';
import { createClient } from '@/lib/supabase/client';

export default function AdminAlumniPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'directory' | 'mentorship'>('directory');

  const supabase = useMemo(() => createClient(), []);

  const getAuthToken = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token;
    } catch {
      return undefined;
    }
  }, [supabase]);

  const loadAdminAlumni = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = await getAuthToken();
      const res = await apiGet<any>('/api/v1/alumni/admin/directory', token);
      if (res) {
        setData(res);
      }
    } catch (err) {
      console.error('Failed to load admin alumni directory:', err);
    } finally {
      setIsLoading(false);
    }
  }, [getAuthToken]);

  useEffect(() => {
    loadAdminAlumni();
  }, [loadAdminAlumni]);

  // Handle Verify Profile
  const handleVerify = async (id: string) => {
    try {
      setVerifyingId(id);
      const token = await getAuthToken();
      await apiPut(`/api/v1/alumni/admin/${id}/verify`, {}, token);
      loadAdminAlumni();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Verification failed';
      alert(msg);
    } finally {
      setVerifyingId(null);
    }
  };

  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    if (!searchQuery.trim()) return data.items;
    const q = searchQuery.toLowerCase();
    return data.items.filter(
      (a: any) =>
        a.name.toLowerCase().includes(q) ||
        a.current_organization.toLowerCase().includes(q) ||
        a.email?.toLowerCase().includes(q) ||
        a.department_code.toLowerCase().includes(q)
    );
  }, [data, searchQuery]);

  return (
    <div className="min-h-screen bg-sfrc-surface pb-16">
      {/* Header Banner */}
      <div className="bg-white border-b border-sfrc-200 py-8 px-6 sm:px-10 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-sfrc-700 uppercase tracking-wider mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-sfrc-700" />
              Admin Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-sfrc-900 tracking-tight">
              Alumni Verification & Management
            </h1>
            <p className="text-xs sm:text-sm text-sfrc-600 mt-1">
              Verify new registrations, oversee active mentors, and audit student mentorship pairings.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadAdminAlumni}
            className="rounded-xl text-xs font-bold border-sfrc-200"
          >
            <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh Directory
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-6 space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="rounded-3xl border-sfrc-200 bg-white p-5 shadow-2xs">
            <p className="text-xs font-bold text-sfrc-600 uppercase">Total Alumni</p>
            <p className="text-2xl font-black text-sfrc-900 mt-1">{data?.total || 10}</p>
            <p className="text-[11px] text-sfrc-500 mt-0.5">Enrolled across departments</p>
          </Card>

          <Card className="rounded-3xl border-sfrc-200 bg-white p-5 shadow-2xs">
            <p className="text-xs font-bold text-sfrc-600 uppercase">Verified Profiles</p>
            <p className="text-2xl font-black text-emerald-700 mt-1">{data?.verified_count || 8}</p>
            <p className="text-[11px] text-emerald-600 mt-0.5">Active directory visibility</p>
          </Card>

          <Card className="rounded-3xl border-sfrc-200 bg-white p-5 shadow-2xs">
            <p className="text-xs font-bold text-sfrc-600 uppercase">Active Mentors</p>
            <p className="text-2xl font-black text-amber-700 mt-1">{data?.mentors_count || 3}</p>
            <p className="text-[11px] text-sfrc-500 mt-0.5">Opted into student guidance</p>
          </Card>

          <Card className="rounded-3xl border-sfrc-200 bg-white p-5 shadow-2xs">
            <p className="text-xs font-bold text-sfrc-600 uppercase">Mentorship Requests</p>
            <p className="text-2xl font-black text-blue-700 mt-1">{data?.mentorship_requests?.length || 1}</p>
            <p className="text-[11px] text-sfrc-500 mt-0.5">Logged student sessions</p>
          </Card>
        </div>

        {/* Tab Selector & Search */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-sfrc-200 shadow-sm">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('directory')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                activeTab === 'directory'
                  ? 'bg-sfrc-700 text-white shadow-sm'
                  : 'text-sfrc-700 hover:bg-sfrc-100'
              }`}
            >
              <Users className="w-4 h-4" />
              Alumni Verification Queue ({filteredItems.length})
            </button>

            <button
              onClick={() => setActiveTab('mentorship')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                activeTab === 'mentorship'
                  ? 'bg-sfrc-700 text-white shadow-sm'
                  : 'text-sfrc-700 hover:bg-sfrc-100'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Mentorship Requests Log ({data?.mentorship_requests?.length || 0})
            </button>
          </div>

          <div className="relative w-64">
            <Search className="w-4 h-4 text-sfrc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Search alumni by name, org, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl bg-sfrc-50 border-sfrc-200 font-medium"
            />
          </div>
        </div>

        {/* TAB 1: Verification Queue Table */}
        {activeTab === 'directory' && (
          <Card className="rounded-3xl border-sfrc-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-sfrc-200 bg-sfrc-50 text-[11px] font-bold text-sfrc-700 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Alumni Profile</th>
                    <th className="py-3.5 px-4">Dept / Batch</th>
                    <th className="py-3.5 px-4">Organization & Role</th>
                    <th className="py-3.5 px-4">Visibility</th>
                    <th className="py-3.5 px-4">Verification</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sfrc-100 text-xs">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-sfrc-500 font-medium">
                        Loading directory...
                      </td>
                    </tr>
                  ) : filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-sfrc-500 font-medium">
                        No alumni records found.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((alm: any) => (
                      <tr key={alm.id} className="hover:bg-sfrc-50/70 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-sfrc-100 overflow-hidden shrink-0">
                              <img
                                src={alm.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80'}
                                alt={alm.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <p className="font-bold text-sfrc-900 flex items-center gap-1.5">
                                {alm.name}
                                {alm.is_mentor && (
                                  <span className="text-[10px] font-black text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                                    Mentor
                                  </span>
                                )}
                              </p>
                              <p className="text-[11px] text-sfrc-500">{alm.email} {alm.phone ? `• ${alm.phone}` : ''}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4 font-semibold text-sfrc-800">
                          {alm.department_code} • {alm.batch_year}
                        </td>

                        <td className="py-4 px-4">
                          <p className="font-bold text-sfrc-900">{alm.designation}</p>
                          <p className="text-[11px] text-sfrc-600">{alm.current_organization}</p>
                        </td>

                        <td className="py-4 px-4">
                          <Badge variant="outline" className="capitalize text-[10px]">
                            {alm.visibility}
                          </Badge>
                        </td>

                        <td className="py-4 px-4">
                          {alm.is_verified ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                              <Clock className="w-3.5 h-3.5 text-amber-600" /> Pending Review
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-6 text-right">
                          {!alm.is_verified && (
                            <Button
                              size="sm"
                              disabled={verifyingId === alm.id}
                              onClick={() => handleVerify(alm.id)}
                              className="bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold h-8"
                            >
                              <Check className="w-3.5 h-3.5 mr-1" />
                              {verifyingId === alm.id ? 'Verifying...' : 'Verify Profile'}
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* TAB 2: Mentorship Pairs Table */}
        {activeTab === 'mentorship' && (
          <Card className="rounded-3xl border-sfrc-200 bg-white p-6 shadow-sm space-y-4">
            <CardTitle className="text-base font-bold text-sfrc-900">
              Student-Alumni Mentorship Pairing Audit Trail
            </CardTitle>
            <CardDescription className="text-xs text-sfrc-600">
              Log of all mentorship connections requested through the MyZone SFRC platform.
            </CardDescription>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-sfrc-200 bg-sfrc-50 text-[11px] font-bold text-sfrc-700 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Student</th>
                    <th className="py-3.5 px-4">Alumni Mentor</th>
                    <th className="py-3.5 px-4">Topic & Note</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Requested Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sfrc-100 text-xs">
                  {(data?.mentorship_requests || []).map((req: any) => (
                    <tr key={req.id}>
                      <td className="py-4 px-4 font-bold text-sfrc-900">
                        {req.student_name} ({req.student_register_number})
                        <p className="text-[11px] text-sfrc-500 font-normal">Dept of {req.student_department}</p>
                      </td>
                      <td className="py-4 px-4 font-bold text-sfrc-900">
                        {req.alumni_name}
                      </td>
                      <td className="py-4 px-4 max-w-sm">
                        <p className="font-bold text-sfrc-800">{req.preferred_topic}</p>
                        <p className="text-[11px] text-sfrc-600 truncate">{req.message}</p>
                      </td>
                      <td className="py-4 px-4">
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] uppercase font-bold">
                          {req.status}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 text-sfrc-500">
                        {new Date(req.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
