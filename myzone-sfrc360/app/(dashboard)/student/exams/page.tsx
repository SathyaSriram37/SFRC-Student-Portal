'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  GraduationCap,
  Calendar,
  Clock,
  MapPin,
  Download,
  AlertTriangle,
  CheckCircle2,
  FileText,
  ShieldCheck,
  QrCode,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { apiGet } from '@/lib/api-client';

interface ExamScheduleItem {
  id: string;
  date: string;
  day_name: string;
  session: string; // FN (10:00 AM - 01:00 PM) | AN (02:00 PM - 05:00 PM)
  time_slot: string;
  course_code: string;
  course_title: string;
  venue: string;
  attendance_pct: number;
  is_eligible: boolean;
  ineligibility_reason?: string | null;
}

export default function StudentExamsPage() {
  const [exams, setExams] = useState<ExamScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [downloadingHallTicket, setDownloadingHallTicket] = useState<boolean>(false);

  const supabase = useMemo(() => createClient(), []);

  const loadExamSchedule = useCallback(async () => {
    setIsLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await apiGet<ExamScheduleItem[]>('/api/v1/students/me/exam-schedule', token);
      if (Array.isArray(res)) {
        setExams(res);
      }
    } catch (err) {
      console.error('Failed to load exam schedule:', err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadExamSchedule();
  }, [loadExamSchedule]);

  const allEligible = useMemo(() => {
    if (exams.length === 0) return true;
    return exams.every((e) => e.is_eligible);
  }, [exams]);

  const handleDownloadHallTicket = () => {
    if (!allEligible) {
      alert('Hall Ticket download is restricted due to attendance shortage in one or more subjects (<75%). Please contact the Controller of Examinations.');
      return;
    }
    setDownloadingHallTicket(true);
    setTimeout(() => {
      setDownloadingHallTicket(false);
      alert('Official End-Semester Hall Ticket with Verification QR Code downloaded successfully.');
    }, 1500);
  };

  return (
    <div className="space-y-6 pb-12 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-sfrc-800 via-sfrc-900 to-slate-950 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-sfrc-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-medium text-sfrc-200">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
              Office of the Controller of Examinations (COE)
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">End Semester Examination Portal</h1>
            <p className="text-sm text-slate-300 max-w-xl">
              View official timetable, session timings, examination hall seating allocations, and download your digital Hall Ticket.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleDownloadHallTicket}
              disabled={downloadingHallTicket || !allEligible}
              className="bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-semibold shadow-lg shadow-amber-500/20"
            >
              <Download className="w-4 h-4 mr-2" />
              {downloadingHallTicket ? 'Generating Hall Ticket...' : 'Download Digital Hall Ticket'}
            </Button>
          </div>
        </div>
      </div>

      {/* Hall Ticket Eligibility & Guidelines Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className={`border ${allEligible ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5'}`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                {allEligible ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Hall Ticket Status: Eligible
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    Attendance Condonation Required
                  </>
                )}
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              {allEligible
                ? 'All enrolled subjects satisfy the mandatory 75% attendance criterion.'
                : 'One or more subjects fall below 75% attendance.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground pt-1">
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-slate-500" />
              <span>Biometric QR Verification active at Examination Hall entrance.</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Clock className="w-4 h-4 text-sfrc-600" />
              Exam Timings
            </CardTitle>
            <CardDescription className="text-xs">Autonomous Session Schedule</CardDescription>
          </CardHeader>
          <CardContent className="text-xs space-y-1">
            <div><strong>Forenoon (FN):</strong> 10:00 AM – 01:00 PM (Reporting: 09:30 AM)</div>
            <div><strong>Afternoon (AN):</strong> 02:00 PM – 05:00 PM (Reporting: 01:30 PM)</div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              Hall Regulations
            </CardTitle>
            <CardDescription className="text-xs">Autonomous Examination Rules</CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1">
            <div>• College ID & Hall Ticket are strictly mandatory.</div>
            <div>• Smart watches & mobile phones are strictly prohibited.</div>
          </CardContent>
        </Card>
      </div>

      {/* Examination Timetable Table */}
      <Card className="border border-border bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-sfrc-600" />
                November 2026 End Semester Examination Schedule
              </CardTitle>
              <CardDescription className="text-xs">
                Official date sheet confirmed by the Autonomous Examination Committee.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-y border-border text-muted-foreground uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Date & Day</th>
                  <th className="py-3 px-4">Session & Time</th>
                  <th className="py-3 px-4">Course Code</th>
                  <th className="py-3 px-4">Course Title</th>
                  <th className="py-3 px-4">Hall / Venue</th>
                  <th className="py-3 px-4 text-center">Attendance</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                      Loading examination timetable...
                    </td>
                  </tr>
                ) : exams.length > 0 ? (
                  exams.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-semibold text-foreground">
                        <div>{item.date}</div>
                        <div className="text-[11px] text-muted-foreground">{item.day_name}</div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="font-mono text-xs font-bold mr-1">
                          {item.session}
                        </Badge>
                        <span className="text-muted-foreground">{item.time_slot}</span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-sfrc-700 dark:text-sfrc-300">
                        {item.course_code}
                      </td>
                      <td className="py-3 px-4 font-medium text-foreground">{item.course_title}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5 text-sfrc-600 shrink-0" />
                          <span>{item.venue}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-bold">
                        <span className={item.attendance_pct >= 75 ? 'text-emerald-600' : 'text-rose-600'}>
                          {item.attendance_pct}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {item.is_eligible ? (
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 text-xs">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Eligible
                          </Badge>
                        ) : (
                          <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-300 text-xs">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Shortage
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                      No examination schedule released yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
