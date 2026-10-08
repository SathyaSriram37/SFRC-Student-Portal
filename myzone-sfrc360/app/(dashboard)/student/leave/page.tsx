'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar,
  Clock,
  Send,
  CheckCircle2,
  XCircle,
  FileText,
  AlertCircle,
  PlusCircle,
  Filter,
  UserCheck,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { apiGet, apiPost } from '@/lib/api-client';

interface LeaveApplication {
  id: string;
  leave_type: 'OD' | 'Medical' | 'Casual' | 'Sports';
  from_date: string;
  to_date: string;
  days_count: number;
  reason: string;
  proof_url?: string;
  status: 'pending' | 'mentor_approved' | 'hod_approved' | 'rejected';
  mentor_remarks?: string;
  applied_at: string;
}

export default function StudentLeavePage() {
  const [activeTab, setActiveTab] = useState<'apply' | 'history'>('apply');
  const [leaveType, setLeaveType] = useState<string>('OD');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [emergencyContact, setEmergencyContact] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [leaveHistory, setLeaveHistory] = useState<LeaveApplication[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(true);

  const supabase = useMemo(() => createClient(), []);

  const loadLeaveHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await apiGet<any[]>('/api/v1/students/me/leave', token);
      if (Array.isArray(res)) {
        setLeaveHistory(
          res.map((r: any) => ({
            id: r.id,
            leave_type: (r.leave_type || 'OD') as any,
            from_date: r.from_date,
            to_date: r.to_date,
            days_count: Number(r.total_days) || 1,
            reason: r.reason,
            status: r.status === 'approved' ? 'hod_approved' : r.status === 'rejected' ? 'rejected' : 'pending',
            mentor_remarks: r.approval_remarks,
            applied_at: r.created_at,
          }))
        );
      }
    } catch (e) {
      console.error('Failed to load leave history:', e);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadLeaveHistory();
  }, [loadLeaveHistory]);

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromDate || !toDate || !reason.trim()) {
      alert('Please fill all mandatory fields (From Date, To Date, Reason).');
      return;
    }

    setIsSubmitting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      await apiPost(
        '/api/v1/students/me/leave',
        {
          leave_type: leaveType,
          from_date: fromDate,
          to_date: toDate,
          reason: reason.trim(),
          emergency_contact: emergencyContact || '9876543210',
          destination: 'Home / Venue',
        },
        token
      );

      alert(`${leaveType} Application submitted and saved to database successfully! Forwarded to Faculty Mentor & HOD.`);
      setFromDate('');
      setToDate('');
      setReason('');
      setEmergencyContact('');
      setActiveTab('history');
      await loadLeaveHistory();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to submit leave application');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: LeaveApplication['status']) => {
    switch (status) {
      case 'hod_approved':
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 text-xs">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            Approved & Attendance Credited
          </Badge>
        );
      case 'mentor_approved':
        return (
          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-300 text-xs">
            <UserCheck className="w-3.5 h-3.5 mr-1" />
            Mentor Approved (Pending HOD)
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
            Pending Mentor Review
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-sfrc-800 via-sfrc-900 to-slate-950 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-sfrc-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-medium text-sfrc-200">
              <Calendar className="w-3.5 h-3.5 text-amber-300" />
              Academic Attendance & Leave Approval Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">On-Duty (OD) & Leave Application</h1>
            <p className="text-sm text-slate-300 max-w-xl">
              Submit digital applications for On-Duty (OD for paper presentations, hackathons, sports) and Medical/Casual leaves with real-time approval tracking.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => setActiveTab('apply')}
              className="bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-semibold shadow-lg shadow-amber-500/20"
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              New Application
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('apply')}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'apply'
              ? 'border-sfrc-600 text-sfrc-600 dark:text-sfrc-400 font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Submit Leave / OD Request
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-sfrc-600 text-sfrc-600 dark:text-sfrc-400 font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Application History ({leaveHistory.length})
        </button>
      </div>

      {/* TAB 1: APPLY FORM */}
      {activeTab === 'apply' && (
        <Card className="border border-border bg-card max-w-3xl">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Send className="w-4 h-4 text-sfrc-600" />
              New Leave / OD Application Form
            </CardTitle>
            <CardDescription className="text-xs">
              Applications are automatically routed to your Class Mentor and Head of Department.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitLeave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Leave Category *</Label>
                  <Select value={leaveType} onValueChange={(val) => val && setLeaveType(val)}>
                    <SelectTrigger className="bg-background text-xs">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OD">On-Duty (Conference / Competition)</SelectItem>
                      <SelectItem value="Sports">Sports / Tournament OD</SelectItem>
                      <SelectItem value="Medical">Medical Leave (Cert required)</SelectItem>
                      <SelectItem value="Casual">Casual / Family Function Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Emergency Parent/Guardian Phone *</Label>
                  <Input
                    placeholder="10-digit mobile number"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    className="bg-background text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">From Date *</Label>
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="bg-background text-xs"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">To Date *</Label>
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="bg-background text-xs"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Detailed Reason & Activity Details *</Label>
                <Textarea
                  placeholder="Specify paper title, event name, hosting institution, or reason for leave..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  className="bg-background text-xs"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-sfrc-700 hover:bg-sfrc-800 text-white font-semibold text-xs px-6"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Application'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* TAB 2: HISTORY */}
      {activeTab === 'history' && (
        <Card className="border border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Clock className="w-4 h-4 text-sfrc-600" />
              Past Leave & OD Applications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 border-y border-border text-muted-foreground uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Date Range</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">Applied Date</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoadingHistory ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-muted-foreground">
                        Loading applications...
                      </td>
                    </tr>
                  ) : leaveHistory.length > 0 ? (
                    leaveHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="font-mono text-xs font-bold">
                            {item.leave_type}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 font-semibold text-foreground">
                          {item.from_date} to {item.to_date}
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate text-muted-foreground">
                          {item.reason}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">{item.applied_at || 'Recently'}</td>
                        <td className="py-3 px-4 text-center">{getStatusBadge(item.status)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-muted-foreground">
                        No previous leave or OD requests recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
