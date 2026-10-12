'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  CreditCard,
  Download,
  CheckCircle2,
  ShieldCheck,
  Receipt,
  FileCheck,
  Printer,
  X,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { apiGet } from '@/lib/api-client';
import { createClient } from '@/lib/supabase/client';

interface FeeItem {
  id: string;
  category: string;
  semester: string;
  amount: number;
  due_date: string;
  status: 'paid' | 'pending' | 'overdue';
  receipt_number?: string;
  paid_date?: string;
  transaction_ref?: string;
}

interface FeesSummary {
  student_id: string;
  student_name: string;
  register_number: string;
  total_paid: number;
  total_pending: number;
  total_overdue: number;
  fees: FeeItem[];
}

interface FeeReceipt {
  fee_id: string;
  receipt_number: string;
  student_name: string;
  register_number: string;
  category: string;
  semester: string;
  amount: number;
  paid_date: string;
  transaction_ref: string;
  college_seal: string;
  verification_hash: string;
}

export default function StudentFeesPage() {
  const [summary, setSummary] = useState<FeesSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [activeReceipt, setActiveReceipt] = useState<FeeReceipt | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  const getAuthToken = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token;
    } catch {
      return undefined;
    }
  };

  const loadFees = async () => {
    try {
      setIsLoading(true);
      const token = await getAuthToken();
      const res = await apiGet<FeesSummary>('/api/v1/fees/me', token);
      if (res) {
        setSummary(res);
      }
    } catch (err) {
      console.error('Failed to load student fees:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFees();
  }, []);

  const handleDownloadReceipt = async (fee: FeeItem) => {
    try {
      setDownloadingId(fee.id);
      const token = await getAuthToken();
      const receipt = await apiGet<FeeReceipt>(`/api/v1/fees/${fee.id}/receipt`, token);
      if (receipt) {
        setActiveReceipt(receipt);
        setReceiptModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to fetch receipt:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  const fees = summary?.fees || [];
  const totalPaid = summary?.total_paid || 0;
  const totalPending = summary?.total_pending || 0;

  return (
    <div className="space-y-6 pb-12 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-sfrc-800 via-sfrc-900 to-slate-950 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-sfrc-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-medium text-sfrc-200">
              <CreditCard className="w-3.5 h-3.5 text-amber-300" />
              SFRC Finance & Digital Fee Payment Gateway
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Tuition & Term Fee Management</h1>
            <p className="text-sm text-slate-300 max-w-xl">
              Check fee dues, online transaction history, payment verification, and download digitally signed college fee receipts.
            </p>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-border bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Total Fees Settled</CardDescription>
            <CardTitle className="text-2xl font-extrabold text-emerald-600">
              ₹{totalPaid.toLocaleString('en-IN')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">All current term dues cleared</div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Pending Term Dues</CardDescription>
            <CardTitle className="text-2xl font-extrabold text-foreground">
              ₹{totalPending.toLocaleString('en-IN')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {totalPending === 0 ? (
              <div className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> No pending invoices
              </div>
            ) : (
              <div className="text-xs text-amber-600 font-semibold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Payment due
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Payment Gateway Status</CardDescription>
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Direct Bank Settlement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">Supports UPI, Net Banking, Debit/Credit Card</div>
          </CardContent>
        </Card>
      </div>

      {/* Fee Invoices & Receipts Table */}
      <Card className="border border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Receipt className="w-4 h-4 text-sfrc-600" />
            Fee Invoices & Payment Receipts
          </CardTitle>
          <CardDescription className="text-xs">
            Download verified fee receipts for income tax proof and educational scholarship claims.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-xs text-muted-foreground">Loading fee records from college database...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 border-y border-border text-muted-foreground uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Receipt No.</th>
                    <th className="py-3 px-4">Fee Head / Description</th>
                    <th className="py-3 px-4">Academic Term</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Payment Ref</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {fees.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-sfrc-700 dark:text-sfrc-300">
                        {item.receipt_number || '-'}
                      </td>
                      <td className="py-3 px-4 font-medium text-foreground">{item.category}</td>
                      <td className="py-3 px-4 text-muted-foreground">{item.semester}</td>
                      <td className="py-3 px-4 font-bold text-foreground">
                        ₹{item.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground font-mono text-[11px]">
                        {item.transaction_ref || '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-300 text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          Paid
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadReceipt(item)}
                          disabled={downloadingId === item.id}
                          className="text-xs h-7 gap-1"
                        >
                          <Download className="w-3.5 h-3.5" />
                          {downloadingId === item.id ? 'Loading...' : 'Receipt'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Official Digital Receipt Modal */}
      {activeReceipt && (
        <Dialog open={receiptModalOpen} onOpenChange={setReceiptModalOpen}>
          <DialogContent className="max-w-lg p-0 overflow-hidden border-sfrc-200">
            <div className="bg-sfrc-900 text-white p-6 border-b border-sfrc-800">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-widest text-amber-300 font-semibold">Official E-Receipt</div>
                  <h3 className="text-lg font-bold">The Standard Fireworks Rajaratnam College</h3>
                  <p className="text-xs text-slate-300">Autonomous Institution, Sivakasi</p>
                </div>
                <FileCheck className="w-8 h-8 text-emerald-400" />
              </div>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="flex justify-between border-b pb-3">
                <span className="text-muted-foreground">Receipt Number:</span>
                <span className="font-mono font-bold">{activeReceipt.receipt_number}</span>
              </div>
              <div className="flex justify-between border-b pb-3">
                <span className="text-muted-foreground">Student Name:</span>
                <span className="font-semibold">{activeReceipt.student_name}</span>
              </div>
              <div className="flex justify-between border-b pb-3">
                <span className="text-muted-foreground">Register Number:</span>
                <span className="font-mono font-semibold">{activeReceipt.register_number}</span>
              </div>
              <div className="flex justify-between border-b pb-3">
                <span className="text-muted-foreground">Fee Description:</span>
                <span className="font-medium text-right max-w-xs">{activeReceipt.category}</span>
              </div>
              <div className="flex justify-between border-b pb-3">
                <span className="text-muted-foreground">Academic Term:</span>
                <span>{activeReceipt.semester}</span>
              </div>
              <div className="flex justify-between border-b pb-3">
                <span className="text-muted-foreground">Paid Date:</span>
                <span>{activeReceipt.paid_date}</span>
              </div>
              <div className="flex justify-between border-b pb-3">
                <span className="text-muted-foreground">Transaction Reference:</span>
                <span className="font-mono text-[11px]">{activeReceipt.transaction_ref}</span>
              </div>
              <div className="flex justify-between items-center bg-muted/40 p-3 rounded-lg border">
                <span className="font-bold text-sm">Amount Paid:</span>
                <span className="font-extrabold text-base text-emerald-600">₹{activeReceipt.amount.toLocaleString('en-IN')}</span>
              </div>

              <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded border border-dashed text-[10px] text-muted-foreground space-y-1">
                <div className="font-mono font-semibold text-foreground">Digital Seal & Verification Hash:</div>
                <div className="font-mono break-all">{activeReceipt.verification_hash}</div>
                <div>{activeReceipt.college_seal}</div>
              </div>
            </div>

            <DialogFooter className="p-4 bg-muted/20 border-t flex sm:justify-between items-center">
              <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5 text-xs">
                <Printer className="w-3.5 h-3.5" /> Print
              </Button>
              <Button size="sm" onClick={() => setReceiptModalOpen(false)} className="text-xs">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
