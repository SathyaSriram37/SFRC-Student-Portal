'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';

import { Briefcase, Calendar, Clock, DollarSign, CheckCircle2, XCircle, AlertCircle, Users, Search, Sparkles, MapPin, FileCheck, Send } from 'lucide-react';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
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
import { apiGet, apiPost } from '@/lib/api-client';
import { createClient } from '@/lib/supabase/client';
import type { PlacementDrive, PlacementApplication } from '@/lib/types';

interface StudentPlacementProfile {
  name: string;
  register_number: string;
  department: string;
  cgpa: number;
  attendance: number;
}

export default function StudentPlacementsPage() {
  const [drives, setDrives] = useState<PlacementDrive[]>([]);
  const [myApplications, setMyApplications] = useState<PlacementApplication[]>([]);
  const [studentProfile, setStudentProfile] = useState<StudentPlacementProfile | null>(null);

  const [activeTab, setActiveTab] = useState<'drives' | 'my-applications'>('drives');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  // Apply Modal State
  const [selectedDrive, setSelectedDrive] = useState<PlacementDrive | null>(null);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [statement, setStatement] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [applySuccessMsg, setApplySuccessMsg] = useState('');
  const [applyErrorMsg, setApplyErrorMsg] = useState('');

  const supabase = useMemo(() => createClient(), []);

  const getAuthToken = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token;
    } catch {
      return undefined;
    }
  }, [supabase]);

  const loadPlacementData = useCallback(async () => {
    try {
      const token = await getAuthToken();

      const [drivesRes, appsRes] = await Promise.allSettled([
        apiGet<{ drives: PlacementDrive[]; total: number; student_profile: StudentPlacementProfile }>('/api/v1/placement/drives', token),
        apiGet<PlacementApplication[]>('/api/v1/placement/me/applications', token),
      ]);

      if (drivesRes.status === 'fulfilled' && drivesRes.value) {
        setDrives(drivesRes.value.drives || []);
        if (drivesRes.value.student_profile) {
          setStudentProfile(drivesRes.value.student_profile);
        }
      }

      if (appsRes.status === 'fulfilled' && Array.isArray(appsRes.value)) {
        setMyApplications(appsRes.value);
      }
    } catch (err) {
      console.error('Failed to load placement drives:', err);
    } finally {
      setIsLoading(false);
    }
  }, [getAuthToken]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      await loadPlacementData();
    })();
    return () => {
      ignore = true;
    };
  }, [loadPlacementData]);

  // Handle Apply Action
  const handleOpenApplyModal = (drive: PlacementDrive) => {
    setSelectedDrive(drive);
    setStatement('');
    setApplyErrorMsg('');
    setApplySuccessMsg('');
    setApplyModalOpen(true);
  };

  const handleConfirmApply = async () => {
    if (!selectedDrive) return;
    try {
      setIsApplying(true);
      setApplyErrorMsg('');
      const token = await getAuthToken();

      const res = await apiPost<PlacementApplication>(
        `/api/v1/placement/drives/${selectedDrive.id}/apply`,
        { statement },
        token
      );

      setApplySuccessMsg(`Application registered successfully for ${selectedDrive.company_name}!`);

      // Update local state
      setDrives((prev) =>
        prev.map((d) =>
          d.id === selectedDrive.id
            ? { ...d, has_applied: true, application_status: 'applied' }
            : d
        )
      );
      setMyApplications((prev) => [res, ...prev]);

      setTimeout(() => {
        setApplyModalOpen(false);
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit application';
      setApplyErrorMsg(msg);
    } finally {
      setIsApplying(false);
    }
  };

  // Filtered drives
  const filteredDrives = useMemo(() => {
    return drives.filter((d) => {
      if (selectedDept !== 'all' && !d.eligible_departments.includes(selectedDept)) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          d.company_name.toLowerCase().includes(q) ||
          d.role_title.toLowerCase().includes(q) ||
          d.job_description.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [drives, selectedDept, searchQuery]);

  // Application Stats
  const activeCount = drives.length;
  const appliedCount = myApplications.length;
  const shortlistedCount = myApplications.filter((a) => a.status === 'shortlisted' || a.status === 'interview').length;
  const offersCount = myApplications.filter((a) => a.status === 'selected').length;

  return (
    <div className="min-h-screen bg-sfrc-surface pb-16">
      {/* Hero Banner */}
      <div className="relative bg-gradient-to-r from-sfrc-900 via-sfrc-800 to-sfrc-700 text-white py-10 px-6 sm:px-10 border-b border-sfrc-700 shadow-md">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sfrc-gold/20 border border-sfrc-gold/30 text-sfrc-gold text-xs font-bold uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                SFRC Career & Placement Cell
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                Campus Placement Drives
              </h1>
              <p className="text-sfrc-100/80 text-xs sm:text-sm max-w-2xl mt-1">
                Explore exclusive recruitment drives from leading technology and enterprise conglomerates with automated eligibility validation.
              </p>
            </div>

            {/* Student Verified Profile Badge */}
            {studentProfile && (
              <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-xs space-y-1 shrink-0">
                <p className="text-sfrc-gold font-bold uppercase text-[10px] tracking-wider">Your Academic Standing</p>
                <p className="font-bold text-white text-sm">{studentProfile.name} ({studentProfile.register_number})</p>
                <div className="flex items-center gap-3 text-sfrc-100 text-[11px] pt-0.5">
                  <span className="font-bold">CGPA: {studentProfile.cgpa}</span>
                  <span>•</span>
                  <span className="font-bold">Attendance: {studentProfile.attendance}%</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-6 space-y-6">
        {/* KPI Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="rounded-3xl border-sfrc-200 bg-white p-5 shadow-2xs">
            <p className="text-xs font-bold text-sfrc-600 uppercase">Active Drives</p>
            <p className="text-2xl font-black text-sfrc-900 mt-1">{activeCount}</p>
            <p className="text-[11px] text-sfrc-500 mt-0.5">Campus recruiting partners</p>
          </Card>

          <Card className="rounded-3xl border-sfrc-200 bg-white p-5 shadow-2xs">
            <p className="text-xs font-bold text-sfrc-600 uppercase">My Applications</p>
            <p className="text-2xl font-black text-blue-700 mt-1">{appliedCount}</p>
            <p className="text-[11px] text-sfrc-500 mt-0.5">Submitted by you</p>
          </Card>

          <Card className="rounded-3xl border-sfrc-200 bg-white p-5 shadow-2xs">
            <p className="text-xs font-bold text-sfrc-600 uppercase">Shortlisted / Interview</p>
            <p className="text-2xl font-black text-amber-700 mt-1">{shortlistedCount}</p>
            <p className="text-[11px] text-sfrc-500 mt-0.5">Round progression</p>
          </Card>

          <Card className="rounded-3xl border-sfrc-200 bg-white p-5 shadow-2xs">
            <p className="text-xs font-bold text-sfrc-600 uppercase">Final Offers</p>
            <p className="text-2xl font-black text-emerald-700 mt-1">{offersCount}</p>
            <p className="text-[11px] text-emerald-600 mt-0.5">Selected congratulations!</p>
          </Card>
        </div>

        {/* Tab Selector & Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-sfrc-200 shadow-sm">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('drives')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                activeTab === 'drives'
                  ? 'bg-sfrc-700 text-white shadow-sm'
                  : 'text-sfrc-700 hover:bg-sfrc-100'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              All Placement Drives ({drives.length})
            </button>

            <button
              onClick={() => setActiveTab('my-applications')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                activeTab === 'my-applications'
                  ? 'bg-sfrc-700 text-white shadow-sm'
                  : 'text-sfrc-700 hover:bg-sfrc-100'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              My Application Tracker ({myApplications.length})
            </button>
          </div>

          {activeTab === 'drives' && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-56">
                <Search className="w-4 h-4 text-sfrc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="Search company or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs rounded-xl bg-sfrc-50 border-sfrc-200 font-medium"
                />
              </div>

              <Select value={selectedDept} onValueChange={(v) => { if (v) setSelectedDept(v); }}>
                <SelectTrigger className="w-36 h-9 text-xs rounded-xl bg-sfrc-50 border-sfrc-200 font-semibold">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Depts</SelectItem>
                  <SelectItem value="CS" className="text-xs">Computer Science</SelectItem>
                  <SelectItem value="MATH" className="text-xs">Mathematics</SelectItem>
                  <SelectItem value="PHY" className="text-xs">Physics</SelectItem>
                  <SelectItem value="CHEM" className="text-xs">Chemistry</SelectItem>
                  <SelectItem value="COM" className="text-xs">Commerce</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* TAB 1: Drives Catalog */}
        {activeTab === 'drives' && (
          <div className="space-y-6">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-64 bg-white rounded-3xl border border-sfrc-200 animate-pulse p-6 space-y-4">
                    <div className="h-6 bg-sfrc-200 rounded w-1/3" />
                    <div className="h-4 bg-sfrc-100 rounded w-3/4" />
                    <div className="h-4 bg-sfrc-100 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : filteredDrives.length === 0 ? (
              <div className="p-12 bg-white rounded-3xl border border-sfrc-200 text-center space-y-3">
                <Briefcase className="w-12 h-12 text-sfrc-400 mx-auto" />
                <h3 className="text-base font-bold text-sfrc-900">No Placement Drives Found</h3>
                <p className="text-xs text-sfrc-600">Try adjusting your department filter or search keywords.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredDrives.map((drive) => {
                  const isEligible = drive.eligibility?.eligible ?? false;
                  const reasons = drive.eligibility?.reasons || [];
                  const hasApplied = drive.has_applied;

                  return (
                    <Card
                      key={drive.id}
                      className="rounded-3xl border-sfrc-200 bg-white shadow-sm hover:shadow-md hover:border-sfrc-300 transition-all flex flex-col justify-between overflow-hidden"
                    >
                      <div>
                        {/* Header Banner */}
                        <div className="p-6 border-b border-sfrc-100 flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3.5">
                            <div className="w-12 h-12 rounded-2xl bg-sfrc-900 text-white flex items-center justify-center font-black text-lg overflow-hidden shrink-0 shadow-inner">
                              {drive.logo_url ? (
                                <img src={drive.logo_url} alt={drive.company_name} className="w-full h-full object-cover" />
                              ) : (
                                drive.company_name.charAt(0)
                              )}
                            </div>
                            <div>
                              <h3 className="font-bold text-base text-sfrc-900 leading-snug">
                                {drive.company_name}
                              </h3>
                              <p className="text-xs font-bold text-sfrc-700 mt-0.5">
                                {drive.role_title}
                              </p>
                            </div>
                          </div>

                          {/* CTC Pill */}
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black shrink-0">
                            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                            {drive.ctc_range}
                          </span>
                        </div>

                        {/* Content Body */}
                        <div className="p-6 space-y-4 text-xs">
                          <p className="text-sfrc-600 line-clamp-2 leading-relaxed">
                            {drive.job_description}
                          </p>

                          <div className="grid grid-cols-2 gap-3 text-sfrc-700 font-medium">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-sfrc-400" />
                              <span className="truncate">{drive.location}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-sfrc-400" />
                              <span>Drive: {drive.drive_date}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-sfrc-400" />
                              <span>Deadline: {drive.application_deadline}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-sfrc-400" />
                              <span>{drive.total_openings} Openings</span>
                            </div>
                          </div>

                          {/* Eligible Depts */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-[11px] font-bold text-sfrc-600">Eligible Depts:</span>
                            {drive.eligible_departments.map((d) => (
                              <span key={d} className="px-2 py-0.5 rounded-md bg-sfrc-100 text-sfrc-800 font-bold text-[10px]">
                                {d}
                              </span>
                            ))}
                          </div>

                          {/* ELIGIBILITY REASONS CONTAINER */}
                          <div className="p-3.5 rounded-2xl border space-y-2 bg-sfrc-50/70 border-sfrc-200">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[11px] text-sfrc-700">Pre-computed Eligibility</span>
                              {isEligible ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Eligible
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                                  <XCircle className="w-3.5 h-3.5 text-rose-600" /> Not Eligible
                                </span>
                              )}
                            </div>

                            <ul className="space-y-1 text-[11px] text-sfrc-600 pt-1">
                              {reasons.map((r, idx) => (
                                <li key={idx} className="flex items-center gap-1.5">
                                  {r.includes('✓') ? (
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                  ) : (
                                    <XCircle className="w-3 h-3 text-rose-600 shrink-0" />
                                  )}
                                  <span className={r.includes('✗') ? 'text-rose-700 font-semibold' : 'text-sfrc-800 font-medium'}>
                                    {r}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="p-6 pt-0">
                        {hasApplied ? (
                          <div className="flex items-center justify-between p-3 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 font-bold text-xs">
                            <span className="flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-blue-600" />
                              Application Submitted
                            </span>
                            <span className="uppercase text-[10px] bg-blue-200/80 px-2 py-0.5 rounded-md">
                              {drive.application_status || 'Applied'}
                            </span>
                          </div>
                        ) : (
                          <Button
                            disabled={!isEligible}
                            onClick={() => handleOpenApplyModal(drive)}
                            className={`w-full text-xs font-bold rounded-xl h-10 shadow-sm transition-all ${
                              isEligible
                                ? 'bg-sfrc-700 hover:bg-sfrc-800 text-white'
                                : 'bg-sfrc-200 text-sfrc-500 cursor-not-allowed'
                            }`}
                          >
                            {isEligible ? (
                              <>
                                <Send className="w-3.5 h-3.5 mr-1.5" /> Apply for Campus Drive
                              </>
                            ) : (
                              'Not Eligible to Apply'
                            )}
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: My Applications Timeline Tracker */}
        {activeTab === 'my-applications' && (
          <Card className="rounded-3xl border-sfrc-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
            <div>
              <CardTitle className="text-lg font-bold text-sfrc-900">My Placement Applications Tracker</CardTitle>
              <CardDescription className="text-xs text-sfrc-600 mt-1">
                Real-time recruitment timeline and interview schedule updates from the Placement Cell.
              </CardDescription>
            </div>

            {myApplications.length === 0 ? (
              <div className="p-12 text-center text-sfrc-500 space-y-3">
                <FileCheck className="w-12 h-12 text-sfrc-400 mx-auto" />
                <p className="text-sm font-bold text-sfrc-800">You haven&apos;t applied to any drives yet.</p>
                <Button
                  size="sm"
                  onClick={() => setActiveTab('drives')}
                  className="bg-sfrc-700 hover:bg-sfrc-800 text-white text-xs font-bold rounded-xl"
                >
                  Browse Campus Drives
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {myApplications.map((app) => {
                  const stages = ['applied', 'shortlisted', 'interview', 'selected'];
                  const isRejected = app.status === 'rejected';

                  return (
                    <div
                      key={app.id}
                      className="p-6 rounded-3xl bg-sfrc-50/60 border border-sfrc-200 space-y-6"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h3 className="text-base font-bold text-sfrc-900">{app.company_name}</h3>
                          <p className="text-xs font-bold text-sfrc-700">{app.role_title} • {app.ctc_range}</p>
                          <p className="text-[11px] text-sfrc-500 mt-0.5">
                            Applied on: {new Date(app.applied_at).toLocaleDateString()}
                          </p>
                        </div>

                        <div>
                          {app.status === 'selected' && (
                            <Badge className="bg-emerald-600 text-white font-bold text-xs px-3 py-1">
                              🎉 Selected / Offer Issued
                            </Badge>
                          )}
                          {app.status === 'interview' && (
                            <Badge className="bg-amber-600 text-white font-bold text-xs px-3 py-1">
                              📅 Interview Scheduled
                            </Badge>
                          )}
                          {app.status === 'shortlisted' && (
                            <Badge className="bg-blue-600 text-white font-bold text-xs px-3 py-1">
                              ✨ Shortlisted for Next Round
                            </Badge>
                          )}
                          {app.status === 'applied' && (
                            <Badge variant="outline" className="text-sfrc-800 border-sfrc-300 font-bold text-xs px-3 py-1">
                              Application Under Review
                            </Badge>
                          )}
                          {isRejected && (
                            <Badge className="bg-rose-600 text-white font-bold text-xs px-3 py-1">
                              Application Closed
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Visual Timeline Pipeline */}
                      {!isRejected ? (
                        <div className="grid grid-cols-4 gap-2 pt-2">
                          {['Applied', 'Shortlisted', 'Interview', 'Selected'].map((stg, idx) => {
                            const currentIdx = stages.indexOf(app.status);
                            const isPassed = currentIdx >= idx;
                            const isCurrent = currentIdx === idx;

                            return (
                              <div key={stg} className="text-center space-y-2">
                                <div
                                  className={`h-2.5 rounded-full transition-all ${
                                    isPassed ? 'bg-emerald-600' : 'bg-sfrc-200'
                                  }`}
                                />
                                <p className={`text-[11px] font-bold ${isCurrent ? 'text-emerald-700' : isPassed ? 'text-sfrc-900' : 'text-sfrc-400'}`}>
                                  {stg}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}

                      {/* Notes / Interview Date Banner */}
                      {(app.interview_date || app.notes) && (
                        <div className="p-4 rounded-2xl bg-white border border-sfrc-200 text-xs space-y-1">
                          {app.interview_date && (
                            <p className="font-bold text-sfrc-900 flex items-center gap-1.5">
                              <Calendar className="w-4 h-4 text-sfrc-700" />
                              Interview Date: {app.interview_date}
                            </p>
                          )}
                          {app.notes && (
                            <p className="text-sfrc-600 text-[11px] leading-relaxed">
                              Coordinator Note: {app.notes}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}
      </div>

      {/* APPLICATION CONFIRMATION MODAL */}
      <Dialog open={applyModalOpen} onOpenChange={setApplyModalOpen}>
        <DialogContent className="max-w-md bg-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-sfrc-900">
              Confirm Campus Drive Application
            </DialogTitle>
            <DialogDescription className="text-xs text-sfrc-600">
              {selectedDrive?.company_name} — {selectedDrive?.role_title} ({selectedDrive?.ctc_range})
            </DialogDescription>
          </DialogHeader>

          {applySuccessMsg ? (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{applySuccessMsg}</span>
            </div>
          ) : (
            <div className="space-y-4 pt-2 text-xs">
              {applyErrorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{applyErrorMsg}</span>
                </div>
              )}

              <div className="p-3.5 rounded-2xl bg-sfrc-50 border border-sfrc-200 space-y-1">
                <p className="font-bold text-sfrc-800">Verified Profile Submission:</p>
                <p className="text-sfrc-600">
                  Register No: <span className="font-bold text-sfrc-900">{studentProfile?.register_number}</span> • CGPA:{' '}
                  <span className="font-bold text-sfrc-900">{studentProfile?.cgpa}</span>
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-sfrc-800">Brief Candidate Statement / Key Skills</label>
                <Input
                  type="text"
                  placeholder="e.g. Python, Fullstack React, Cloud basics (Optional)"
                  value={statement}
                  onChange={(e) => setStatement(e.target.value)}
                  className="rounded-xl bg-sfrc-50 border-sfrc-200 text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter className="pt-3">
            {!applySuccessMsg && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setApplyModalOpen(false)}
                  className="rounded-xl text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  disabled={isApplying}
                  onClick={handleConfirmApply}
                  className="bg-sfrc-700 hover:bg-sfrc-800 text-white rounded-xl text-xs font-bold"
                >
                  {isApplying ? 'Submitting...' : 'Confirm & Submit'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
