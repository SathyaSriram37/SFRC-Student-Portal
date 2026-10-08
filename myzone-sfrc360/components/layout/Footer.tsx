'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  MapPin,
  Phone,
  Printer,
  Mail,
  ExternalLink,
  ShieldCheck,
  Award,
  BookOpen,
  GraduationCap,
  Building2,
  HeartHandshake,
  Clock,
} from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full bg-sfrc-950 text-sfrc-100 border-t-2 border-sfrc-700/70 text-xs mt-auto">
      {/* Top Gold Accent Strip */}
      <div className="h-1 bg-linear-to-r from-sfrc-800 via-sfrc-gold to-sfrc-800" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* ── COL 1: About & Accreditations ────────────────────────── */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 shrink-0 rounded-full overflow-hidden ring-2 ring-sfrc-gold/50 bg-white p-0.5 shadow-sm">
                <Image
                  src="/wel_img.jpg"
                  alt="SFRC Crest"
                  fill
                  sizes="48px"
                  className="object-contain"
                />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white leading-tight">
                  The Standard Fireworks Rajaratnam College for Women
                </h3>
                <p className="text-[11px] text-sfrc-gold font-semibold">(Autonomous), Sivakasi</p>
              </div>
            </div>

            <p className="text-[11px] text-sfrc-100/80 leading-relaxed">
              Affiliated to Madurai Kamaraj University. Empowering rural and semi-urban women scholars through academic excellence, innovation, and ethical leadership since 1968.
            </p>

            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="px-2 py-0.5 rounded-md bg-sfrc-900 border border-sfrc-gold/40 text-sfrc-gold text-[10px] font-bold flex items-center gap-1 shadow-2xs">
                <Award className="w-3 h-3" /> NAAC &apos;A++&apos; Grade
              </span>
              <span className="px-2 py-0.5 rounded-md bg-sfrc-900 border border-sfrc-200/30 text-sfrc-200 text-[10px] font-bold shadow-2xs">
                UGC - CPE
              </span>
              <span className="px-2 py-0.5 rounded-md bg-sfrc-900 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold shadow-2xs">
                NIRF Ranked
              </span>
            </div>
          </div>

          {/* ── COL 2: Quick Links & Institutional Portals ──────────── */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-sfrc-gold uppercase tracking-wider border-b border-sfrc-800 pb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-sfrc-gold" />
              Quick Portals & Cells
            </h4>
            <ul className="space-y-2 text-[11px]">
              <li>
                <Link href="/student/academics" className="text-sfrc-100/85 hover:text-sfrc-gold transition-colors flex items-center gap-1.5">
                  <GraduationCap className="w-3 h-3 text-sfrc-gold/70" />
                  Academic Regulations & CIA Portal
                </Link>
              </li>
              <li>
                <Link href="/student/exams" className="text-sfrc-100/85 hover:text-sfrc-gold transition-colors flex items-center gap-1.5">
                  <BookOpen className="w-3 h-3 text-sfrc-gold/70" />
                  Controller of Examinations (COE)
                </Link>
              </li>
              <li>
                <Link href="/student/library" className="text-sfrc-100/85 hover:text-sfrc-gold transition-colors flex items-center gap-1.5">
                  <BookOpen className="w-3 h-3 text-sfrc-gold/70" />
                  OPAC Digital Library & E-Resources
                </Link>
              </li>
              <li>
                <Link href="/student/campus-care" className="text-sfrc-100/85 hover:text-sfrc-gold transition-colors flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3 text-sfrc-gold/70" />
                  CivicFix Campus Care & Grievance
                </Link>
              </li>
              <li>
                <Link href="/student/facilities/transport" className="text-sfrc-100/85 hover:text-sfrc-gold transition-colors flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-sfrc-gold/70" />
                  College Bus Routes & Pass Details
                </Link>
              </li>
              <li>
                <Link href="/student/help" className="text-sfrc-100/85 hover:text-sfrc-gold transition-colors flex items-center gap-1.5">
                  <HeartHandshake className="w-3 h-3 text-sfrc-gold/70" />
                  Anti-Ragging & Women Cell Helpline
                </Link>
              </li>
            </ul>
          </div>

          {/* ── COL 3: Official Contact Details ──────────────────────── */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-sfrc-gold uppercase tracking-wider border-b border-sfrc-800 pb-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-sfrc-gold" />
              Contact Us
            </h4>

            <div className="space-y-2.5 text-[11px]">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-sfrc-gold shrink-0 mt-0.5" />
                <span className="leading-snug text-sfrc-100/90">
                  Thiruthangal Road, Sivakasi - 626 123, Tamil Nadu, India.
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold text-white">+91 4562-220389</span>
              </div>

              <div className="flex items-center gap-2.5">
                <Printer className="w-4 h-4 text-sfrc-200 shrink-0" />
                <span className="text-sfrc-100/80">+91 4562-226695</span>
              </div>

              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-amber-300 shrink-0" />
                <a href="mailto:sfrc@sfrcollege.edu.in" className="text-sfrc-100/90 hover:text-sfrc-gold transition-colors">
                  sfrc@sfrcollege.edu.in
                </a>
              </div>

              <div className="flex items-center gap-2.5 pt-1 text-[10px] text-sfrc-200/70">
                <Clock className="w-3.5 h-3.5 text-sfrc-gold/70 shrink-0" />
                <span>Office Hours: 08:30 AM – 04:30 PM (Mon – Sat)</span>
              </div>
            </div>
          </div>

          {/* ── COL 4: Compact Campus Map ────────────────────────────── */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-sfrc-gold uppercase tracking-wider border-b border-sfrc-800 pb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-sfrc-gold" />
                Campus Location
              </span>
              <a
                href="https://maps.google.com/?q=Standard+Fireworks+Rajaratnam+College+for+Women+Sivakasi"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-sfrc-gold hover:underline flex items-center gap-0.5 font-semibold"
              >
                Directions <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </h4>

            {/* Compact Embedded Map Frame */}
            <div className="relative w-full h-36 rounded-xl overflow-hidden border border-sfrc-800 shadow-md bg-sfrc-900 group">
              <iframe
                title="SFRC Sivakasi Campus Map"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3936.56847895232!2d77.80126737577587!3d9.458988690620956!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3b06cf17f69fffff%3A0x6b07447d6ce30d94!2sThe%20Standard%20Fireworks%20Rajaratnam%20College%20for%20Women!5e0!3m2!1sen!2sin!4v1717200000000!5m2!1sen!2sin"
                width="100%"
                height="100%"
                style={{ border: 0, filter: 'contrast(1.05) saturate(1.1)' }}
                allowFullScreen={false}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="w-full h-full opacity-90 group-hover:opacity-100 transition-opacity"
              />
              <div className="absolute bottom-1.5 left-1.5 right-1.5 px-2 py-1 rounded bg-sfrc-950/90 backdrop-blur-xs text-[9px] text-sfrc-100 flex items-center justify-between pointer-events-none border border-sfrc-800/80">
                <span className="font-semibold text-white">Sivakasi - Thiruthangal Rd</span>
                <span className="text-sfrc-gold font-mono font-bold">PIN: 626123</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── BOTTOM BAR ──────────────────────────────────────────────── */}
        <div className="mt-8 pt-6 border-t border-sfrc-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-sfrc-200/70">
          <p className="text-center sm:text-left">
            Copyright © {new Date().getFullYear()} <strong className="text-white">The Standard Fireworks Rajaratnam College for Women (Autonomous)</strong>, Sivakasi. All Rights Reserved.
          </p>

          <div className="flex items-center gap-4 text-[10px]">
            <span className="text-sfrc-gold font-bold">MyZone SFRC 360</span>
            <span>•</span>
            <span className="text-sfrc-100/90">ICT Digital Campus</span>
            <span>•</span>
            <Link href="/student/policies" className="hover:text-white transition-colors">
              Privacy & Policies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
