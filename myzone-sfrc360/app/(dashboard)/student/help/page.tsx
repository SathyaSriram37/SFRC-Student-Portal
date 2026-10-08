'use client';

import React, { useState } from 'react';
import {
  HelpCircle,
  Phone,
  Mail,
  Building2,
  ShieldCheck,
  Search,
  ChevronDown,
  ChevronUp,
  LifeBuoy,
  BookOpen,
  FileQuestion,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface FaqItem {
  q: string;
  a: string;
  category: string;
}

const FAQS: FaqItem[] = [
  {
    category: 'Academics & Attendance',
    q: 'What is the minimum attendance requirement to appear for Autonomous Semester Examinations?',
    a: 'As per SFRC Autonomous Academic Regulations, a student must secure a minimum of 75% aggregate attendance in each registered course to be eligible for End-Semester Examinations (ESE). Students between 65%-74% must apply for Principal condonation with valid medical/OD proof.',
  },
  {
    category: 'Continuous Internal Assessment (CIA)',
    q: 'How are internal marks calculated for theory courses?',
    a: 'Internal marks (40% weightage) are calculated based on the best 2 of 3 CIA test marks (25 marks each) plus 10 marks for creative assignments/seminars, and 5 marks for attendance regularity.',
  },
  {
    category: 'Hostel & Leave',
    q: 'How do I apply for a digital outpass / weekend home leave?',
    a: 'Navigate to Hostel -> Apply Leave / Outpass. Enter your travel dates, destination, and parent emergency number. The system automatically sends an SMS approval link to your registered parent before warden gate pass endorsement.',
  },
  {
    category: 'Campus Care & CivicFix',
    q: 'How do I report a classroom/lab maintenance or infrastructure grievance?',
    a: 'Use the Campus Care (CivicFix) tab in the navigation bar. Select the facility location, category (Electrical, Lab Equipment, Restroom, IT), and submit with optional photo proof. You will receive a live ticket tracking number.',
  },
  {
    category: 'Library & OPAC',
    q: 'How many books can undergraduate students borrow at a time and what is the loan period?',
    a: 'UG students can borrow up to 3 books for a period of 14 days. Books can be renewed online once via the Library portal before the due date.',
  },
];

const EMERGENCY_CONTACTS = [
  {
    title: 'Principal & Autonomous Office',
    person: 'Dr. (Mrs.) R. Sudha',
    phone: '+91 4562 220389',
    email: 'principal@sfrc.edu.in',
    location: 'Administrative Block, Ground Floor',
  },
  {
    title: 'Controller of Examinations (COE)',
    person: 'Dr. K. Muthamilselvi',
    phone: '+91 4562 220390',
    email: 'coe@sfrc.edu.in',
    location: 'COE Block, First Floor',
  },
  {
    title: 'Dean of Academic Affairs',
    person: 'Dr. S. Sivakama Sundari',
    phone: '+91 4562 220391',
    email: 'dean.academics@sfrc.edu.in',
    location: 'Main Block, Room 102',
  },
  {
    title: 'Women Grievance & Anti-Ragging Cell',
    person: 'Dr. V. Deepa (Convenor)',
    phone: '+91 94892 01823',
    email: 'antiragging@sfrc.edu.in',
    location: 'Student Welfare Centre',
  },
  {
    title: 'Chief Hostel Warden Office',
    person: 'Dr. M. Sasi Rekha',
    phone: '+91 4562 220395',
    email: 'hostelwarden@sfrc.edu.in',
    location: 'Resident Hostel Block A',
  },
  {
    title: 'Campus IT & Portal Helpdesk',
    person: 'Computer Centre Support Team',
    phone: '+91 4562 220399',
    email: 'portal.helpdesk@sfrc.edu.in',
    location: 'MCA Block, Server Room',
  },
];

export default function StudentHelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const filteredFaqs = FAQS.filter(
    (f) =>
      f.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.a.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-sfrc-800 via-sfrc-900 to-slate-950 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-sfrc-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-medium text-sfrc-200">
              <HelpCircle className="w-3.5 h-3.5 text-amber-300" />
              Student Support Services & Grievance Helpline
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Help & Support Centre</h1>
            <p className="text-sm text-slate-300 max-w-xl">
              Access frequently asked questions, autonomous academic guidelines, and direct contact details for all college administrative departments.
            </p>
          </div>
        </div>
      </div>

      {/* Emergency & Key Contacts Grid */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <Phone className="w-4 h-4 text-sfrc-600" />
          Key Administrative & Emergency Contacts
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {EMERGENCY_CONTACTS.map((c, idx) => (
            <Card key={idx} className="border border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-foreground">{c.title}</CardTitle>
                <CardDescription className="text-xs">{c.person}</CardDescription>
              </CardHeader>
              <CardContent className="text-xs space-y-2 pt-0 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="font-semibold text-foreground">{c.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>{c.email}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{c.location}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* FAQ Section */}
      <Card className="border border-border bg-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileQuestion className="w-4 h-4 text-sfrc-600" />
                Frequently Asked Questions (FAQ)
              </CardTitle>
              <CardDescription className="text-xs">
                Quick answers on regulations, exams, attendance, and campus facilities.
              </CardDescription>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search FAQs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs bg-background h-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredFaqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="border border-border rounded-xl p-4 transition-colors hover:border-sfrc-300 dark:hover:border-sfrc-700 bg-muted/20"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between text-left gap-3"
                >
                  <div className="space-y-1">
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {faq.category}
                    </Badge>
                    <div className="font-semibold text-xs sm:text-sm text-foreground">{faq.q}</div>
                  </div>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                </button>

                {isOpen && (
                  <div className="pt-3 mt-3 border-t border-border/60 text-xs text-muted-foreground leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
