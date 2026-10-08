'use client';

import React, { useState, useEffect } from 'react';
import { Home, User, Phone, Mail, Clock, Send, CheckCircle2, XCircle, Utensils, FileText, ShieldCheck, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { apiGet, apiPost } from '@/lib/api-client';

interface WardenContact {
  name: string;
  designation: string;
  phone: string;
  email: string;
  office_hours: string;
}

interface HostelAllocation {
  is_hosteller: boolean;
  hostel_name: string;
  hostel_code: string;
  block: string;
  room_number: string;
  bed_number: string;
  room_type: string;
  floor: string;
  warden: WardenContact;
  mess_type: string;
  allocated_date: string;
}

interface LeaveRequestItem {
  id: string;
  request_number: string;
  student_name: string;
  from_date: string;
  to_date: string;
  reason: string;
  destination: string;
  emergency_contact: string;
  mode_of_travel: string;
  status: 'pending' | 'parent_approved' | 'approved' | 'rejected' | 'completed';
  warden_remarks?: string;
  applied_at: string;
  approved_at?: string;
}

export default function StudentHostelPage() {
  const [activeTab, setActiveTab] = useState<'allocation' | 'apply-leave' | 'leave-history'>('allocation');
  const [allocation, setAllocation] = useState<HostelAllocation | null>(null);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestItem[]>([]);
  
  // Leave Form States
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');
  const [destination, setDestination] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [modeOfTravel, setModeOfTravel] = useState('Bus / Train');
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);
  const [leaveSuccessModal, setLeaveSuccessModal] = useState(false);
  const [submittedLeaveNumber, setSubmittedLeaveNumber] = useState('');

  const loadHostelData = async () => {
    try {
      const [allocData, reqsData] = await Promise.all([
        apiGet<HostelAllocation>('/api/v1/hostel/me/allocation'),
        apiGet<LeaveRequestItem[]>('/api/v1/hostel/me/leave-requests'),
      ]);

      if (allocData) setAllocation(allocData);
      if (Array.isArray(reqsData)) setLeaveRequests(reqsData);
    } catch (err) {
      console.error('Failed to load hostel data:', err);
    }
  };

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const [allocData, reqsData] = await Promise.all([
          apiGet<HostelAllocation>('/api/v1/hostel/me/allocation'),
          apiGet<LeaveRequestItem[]>('/api/v1/hostel/me/leave-requests'),
        ]);

        if (!ignore) {
          if (allocData) setAllocation(allocData);
          if (Array.isArray(reqsData)) setLeaveRequests(reqsData);
        }
      } catch (err) {
        console.error('Failed to load hostel data:', err);
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromDate || !toDate || !reason.trim() || !destination.trim() || !emergencyContact.trim()) {
      alert('Please fill all mandatory leave application fields.');
      return;
    }

    try {
      setIsSubmittingLeave(true);
      const res = await apiPost<LeaveRequestItem>('/api/v1/hostel/leave-requests', {
        from_date: fromDate,
        to_date: toDate,
        reason,
        destination,
        emergency_contact: emergencyContact,
        mode_of_travel: modeOfTravel,
      });

      setSubmittedLeaveNumber(res.request_number || 'HLV-2026-0050');
      setLeaveSuccessModal(true);

      // Reset form
      setFromDate('');
      setToDate('');
      setReason('');
      setDestination('');
      setEmergencyContact('');
      await loadHostelData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to submit leave request');
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  const getStatusBadge = (status: LeaveRequestItem['status']) => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 text-xs">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            Approved by Warden
          </Badge>
        );
      case 'parent_approved':
        return (
          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-300 text-xs">
            <Clock className="w-3.5 h-3.5 mr-1" />
            Parent Approved (Pending Warden)
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-300 text-xs">
            <XCircle className="w-3.5 h-3.5 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 text-xs">
            <Clock className="w-3.5 h-3.5 mr-1" />
            Pending Verification
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sfrc-800 via-sfrc-900 to-slate-950 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-sfrc-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-medium text-sfrc-200">
              <Home className="w-3.5 h-3.5 text-amber-300" />
              SFRC Resident Student Housing & Outpass Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Hostel & Digital Outpass</h1>
            <p className="text-sm text-slate-300 max-w-xl">
              View your room allocation, warden office contact, and apply for digital leave requests with
              parent-warden approval workflow.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => setActiveTab('apply-leave')}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-semibold shadow-lg shadow-amber-500/20"
            >
              <Send className="w-4 h-4 mr-2" />
              Apply Leave Outpass
            </Button>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('allocation')}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'allocation'
              ? 'border-sfrc-600 text-sfrc-600 dark:text-sfrc-400 font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          My Room Allocation
        </button>
        <button
          onClick={() => setActiveTab('apply-leave')}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'apply-leave'
              ? 'border-sfrc-600 text-sfrc-600 dark:text-sfrc-400 font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Apply Leave / Outpass
        </button>
        <button
          onClick={() => setActiveTab('leave-history')}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'leave-history'
              ? 'border-sfrc-600 text-sfrc-600 dark:text-sfrc-400 font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Leave History ({leaveRequests.length})
        </button>
      </div>

      {/* ── TAB 1: MY ROOM ALLOCATION ────────────────────────────────────────── */}
      {activeTab === 'allocation' && (
        allocation && allocation.is_hosteller ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Room Allocation Main Card (2 Cols) */}
            <Card className="lg:col-span-2 border border-border bg-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border">
                    {allocation.hostel_code}
                  </span>
                  <Badge className="bg-emerald-600 text-white text-xs">
                    Active Resident Scholar
                  </Badge>
                </div>
                <CardTitle className="text-xl font-bold pt-2">{allocation.hostel_name}</CardTitle>
                <CardDescription className="text-xs">
                  {allocation.block} • {allocation.floor}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-1">
                    <div className="text-xs text-muted-foreground">Allocated Room</div>
                    <div className="text-lg font-bold text-foreground">{allocation.room_number}</div>
                  </div>

                  <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-1">
                    <div className="text-xs text-muted-foreground">Bed Position</div>
                    <div className="text-lg font-bold text-foreground">{allocation.bed_number}</div>
                  </div>

                  <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-1">
                    <div className="text-xs text-muted-foreground">Room Type</div>
                    <div className="text-sm font-semibold text-foreground pt-0.5">{allocation.room_type}</div>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Hostel & Dining Facilities
                  </div>

                  <div className="p-4 rounded-xl border border-border bg-slate-50/50 dark:bg-slate-900/40 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Utensils className="w-4 h-4 text-amber-600" />
                        Mess Preference:
                      </span>
                      <span className="font-semibold text-foreground">{allocation.mess_type}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-4 h-4 text-slate-500" />
                        Daily Evening Roll Call:
                      </span>
                      <span className="font-semibold text-foreground">06:30 PM (Biometric)</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        Hostel Gate Security:
                      </span>
                      <span className="font-semibold text-emerald-600">24x7 Verified Gate Passes</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Warden Office Contact Card */}
            <Card className="border border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <User className="w-4 h-4 text-sfrc-600" />
                  Hostel Warden Office
                </CardTitle>
                <CardDescription className="text-xs">
                  Official contact details for hostel administration.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 text-xs">
                <div className="p-4 rounded-xl bg-sfrc-500/10 border border-sfrc-500/20 space-y-1">
                  <div className="text-sm font-bold text-sfrc-800 dark:text-sfrc-300">
                    {allocation.warden.name}
                  </div>
                  <div className="text-muted-foreground">{allocation.warden.designation}</div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-sfrc-600 flex-shrink-0" />
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase">Phone</div>
                      <div className="font-semibold text-foreground">{allocation.warden.phone}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-sfrc-600 flex-shrink-0" />
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase">Email</div>
                      <div className="font-semibold text-foreground">{allocation.warden.email}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-sfrc-600 flex-shrink-0" />
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase">Office Hours</div>
                      <div className="font-semibold text-foreground">{allocation.warden.office_hours}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        ) : (
          <Card className="border border-border bg-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-300 text-xs">
                  Day-Scholar Student
                </Badge>
              </div>
              <CardTitle className="text-xl font-bold pt-1">Day Scholar Student Profile</CardTitle>
              <CardDescription className="text-xs">
                You are currently registered as a Day Scholar commuting to college daily.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-xs text-muted-foreground">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-1">
                  <div className="font-semibold text-foreground text-sm">Hostel Admission</div>
                  <div>Applications for Block A & B hostel rooms are open for the current academic year.</div>
                </div>
                <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-1">
                  <div className="font-semibold text-foreground text-sm">College Bus Services</div>
                  <div>18 dedicated bus routes covering Sivakasi, Virudhunagar, Sattur & Srivilliputtur.</div>
                </div>
                <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-1">
                  <div className="font-semibold text-foreground text-sm">Day-Care & Dining</div>
                  <div>Subsidized campus cafeteria and day-scholar lunch spaces available in Main Block.</div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  onClick={() => setActiveTab('apply-leave')}
                  variant="outline"
                  className="text-xs"
                >
                  Apply for Special Hosteller Pass / Outpass
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      )}

      {/* ── TAB 2: APPLY LEAVE / OUTPASS ─────────────────────────────────────── */}
      {activeTab === 'apply-leave' && (
        <Card className="max-w-2xl mx-auto border border-border shadow-md">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <FileText className="w-5 h-5 text-sfrc-600" />
              Hostel Leave & Outpass Application
            </CardTitle>
            <CardDescription className="text-xs">
              Apply for weekend or holiday leave. Outpass will be forwarded to your parent for OTP/SMS
              verification and approved by Warden.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleApplyLeave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="from-date" className="text-xs font-medium">
                    From Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="from-date"
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="to-date" className="text-xs font-medium">
                    To Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="to-date"
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="destination" className="text-xs font-medium">
                  Destination / Travel Location <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="destination"
                  placeholder="e.g., Home (Madurai) / Relative residence (Chennai)"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emergency-contact" className="text-xs font-medium">
                    Parent / Emergency Contact <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="emergency-contact"
                    placeholder="+91 98765 43210 (Father)"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium">Mode of Travel</Label>
                  <Select value={modeOfTravel} onValueChange={(val) => setModeOfTravel(val || 'Bus / Train')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Mode of Travel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bus / Train">Bus / Train</SelectItem>
                      <SelectItem value="Parent Accompanied">Parent Accompanied</SelectItem>
                      <SelectItem value="College Bus">College Bus</SelectItem>
                      <SelectItem value="Private Vehicle">Private Vehicle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason" className="text-xs font-medium">
                  Reason for Leave <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="reason"
                  rows={3}
                  placeholder="State the purpose of leave in detail..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                />
              </div>

              <div className="pt-4 flex justify-end">
                <Button
                  type="submit"
                  disabled={isSubmittingLeave}
                  className="bg-sfrc-700 hover:bg-sfrc-800 text-white font-semibold"
                >
                  {isSubmittingLeave ? 'Submitting Application...' : 'Submit Leave Request'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── TAB 3: LEAVE HISTORY & WORKFLOW STATUS ───────────────────────────── */}
      {activeTab === 'leave-history' && (
        <div className="space-y-4">
          {leaveRequests.length === 0 ? (
            <Card className="py-16 text-center">
              <CardContent className="space-y-4">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto stroke-1" />
                <h3 className="text-lg font-semibold">No leave requests found</h3>
                <p className="text-sm text-muted-foreground">
                  You have not submitted any hostel outpass applications yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {leaveRequests.map((req) => (
                <Card key={req.id} className="border border-border bg-card hover:shadow-md transition-shadow">
                  <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border">
                          {req.request_number}
                        </span>
                        {getStatusBadge(req.status)}
                      </div>

                      <h4 className="text-sm font-bold text-foreground">
                        {req.destination} ({req.from_date} to {req.to_date})
                      </h4>

                      <p className="text-xs text-muted-foreground">{req.reason}</p>

                      {req.warden_remarks && (
                        <div className="p-2.5 rounded-lg bg-muted/40 border text-xs text-muted-foreground">
                          <strong>Warden Note:</strong> {req.warden_remarks}
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground flex flex-col items-start md:items-end gap-1">
                      <div>Mode: {req.mode_of_travel}</div>
                      <div>Contact: {req.emergency_contact}</div>
                      <div className="text-[10px] text-slate-400">
                        Applied: {new Date(req.applied_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── LEAVE CONFIRMATION MODAL ────────────────────────────────────────── */}
      <Dialog open={leaveSuccessModal} onOpenChange={setLeaveSuccessModal}>
        <DialogContent className="max-w-md text-center py-8">
          <div className="w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md mb-2">
            <Check className="w-7 h-7" />
          </div>
          <DialogTitle className="text-xl font-bold">Leave Request Submitted!</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground pt-1 space-y-2">
            <div>
              Your outpass request <strong>{submittedLeaveNumber}</strong> has been logged.
            </div>
            <div>
              Status: <strong>Pending Parent Verification</strong> $\to$ <strong>Warden Approval</strong>.
            </div>
          </DialogDescription>
          <DialogFooter className="sm:justify-center pt-4">
            <Button
              onClick={() => {
                setLeaveSuccessModal(false);
                setActiveTab('leave-history');
              }}
              className="bg-sfrc-700 hover:bg-sfrc-800 text-white"
            >
              View Leave Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
