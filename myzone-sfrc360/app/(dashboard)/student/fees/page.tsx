'use client';

import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  Download,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Receipt,
  FileSpreadsheet,
  AlertCircle,
  Building,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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

export default function StudentFeesPage() {
  const [fees, setFees] = useState<FeeItem[]>([
    {
      id: 'fee-1',
      category: 'Semester VI Tuition & Special Lab Fee',
      semester: 'Semester 6 (2026-2027)',
      amount: 18500,
      due_date: '2026-07-15',
      status: 'paid',
      receipt_number: 'SFRC-RCP-2026-8812',
      paid_date: '2026-07-10',
      transaction_ref: 'HDFC-UPI-9928172648',
    },
    {
      id: 'fee-2',
      category: 'Autonomous End-Semester Examination Fee',
      semester: 'Semester 6 (Nov 2026)',
      amount: 2400,
      due_date: '2026-10-25',
      status: 'paid',
      receipt_number: 'SFRC-RCP-2026-9043',
      paid_date: '2026-10-02',
      transaction_ref: 'SBI-EPAY-8837192019',
    },
    {
      id: 'fee-3',
      category: 'College Bus Transport Fee (Route 4)',
      semester: 'Annual Transport Pass 2026',
      amount: 6000,
      due_date: '2026-08-01',
      status: 'paid',
      receipt_number: 'SFRC-RCP-2026-7734',
      paid_date: '2026-07-28',
      transaction_ref: 'GPay-UPI-4491029381',
    },
  ]);

  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownloadReceipt = (fee: FeeItem) => {
    setDownloadingId(fee.id);
    setTimeout(() => {
      setDownloadingId(null);
      alert(`Official Receipt ${fee.receipt_number} downloaded.`);
    }, 1000);
  };

  const totalPaid = useMemo(() => {
    return fees.filter((f) => f.status === 'paid').reduce((acc, curr) => acc + curr.amount, 0);
  }, [fees]);

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
            <CardTitle className="text-2xl font-extrabold text-foreground">₹0.00</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> No pending invoices
            </div>
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
                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 text-xs">
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
                        {downloadingId === item.id ? 'Exporting...' : 'PDF'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
