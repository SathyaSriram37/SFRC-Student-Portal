import Image from 'next/image';
import Link from 'next/link';
import {
  GraduationCap,
  BookOpen,
  Heart,
  Shield,
  Bot,
  Wrench,
  BarChart3,
  ArrowRight,
  MapPin,
  Phone,
  Mail,
} from 'lucide-react';

// ── Role Card Data ─────────────────────────────────────────────────────────────
const roleCards = [
  {
    role: 'student',
    label: 'Student',
    href: '/login?role=student',
    icon: GraduationCap,
    description: 'Access your attendance, timetable, grades & Pragya AI',
    color: 'from-sfrc-700 to-sfrc-800',
  },
  {
    role: 'faculty',
    label: 'Faculty',
    href: '/login?role=faculty',
    icon: BookOpen,
    description: 'Mark attendance, enter marks, manage mentees',
    color: 'from-sfrc-600 to-sfrc-700',
  },
  {
    role: 'parent',
    label: 'Parent',
    href: '/login?role=parent',
    icon: Heart,
    description: "Track your ward's academic progress",
    color: 'from-sfrc-accent to-sfrc-600',
  },
  {
    role: 'admin',
    label: 'Admin',
    href: '/login?role=admin',
    icon: Shield,
    description: 'Manage institution, analytics & operations',
    color: 'from-sfrc-950 to-sfrc-900',
  },
] as const;

// ── Feature Data ───────────────────────────────────────────────────────────────
const features = [
  {
    emoji: '🤖',
    icon: Bot,
    title: 'Pragya AI',
    description:
      'Your SFRC campus assistant. Ask about attendance, timetable, events, or report an issue.',
  },
  {
    emoji: '🔧',
    icon: Wrench,
    title: 'Campus Care',
    description:
      'AI-powered complaint workflow. Submit, track, resolve campus maintenance issues.',
  },
  {
    emoji: '📊',
    icon: BarChart3,
    title: 'Smart Dashboards',
    description:
      'Role-aware analytics for students, faculty, parents, and administration.',
  },
] as const;

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-full">

      {/* ── SECTION 1: HERO ────────────────────────────────────────────────── */}
      <section
        id="hero"
        className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center overflow-hidden"
      >
        {/* Background gradient overlay */}
        <div className="absolute inset-0 bg-linear-to-b from-sfrc-950 via-sfrc-900 to-sfrc-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(212,160,82,0.18),transparent_60%)] pointer-events-none" />

        {/* Hero content */}
        <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto py-16 sm:py-20">
          {/* Official College Emblem */}
          <div className="relative w-20 h-20 mx-auto mb-6 rounded-full overflow-hidden ring-4 ring-sfrc-gold/60 shadow-2xl bg-white p-1">
            <Image
              src="/wel_img.jpg"
              alt="SFRC Emblem"
              fill
              sizes="80px"
              className="object-contain p-0.5"
              priority
            />
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/25 text-xs font-semibold uppercase tracking-widest mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-sfrc-gold animate-pulse" />
            Smart Campus Platform
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-none mb-4">
            MyZone{' '}
            <span className="text-transparent bg-clip-text bg-linear-to-r from-sfrc-gold to-sfrc-200">
              SFRC 360
            </span>
          </h1>

          <p className="text-xl sm:text-2xl font-semibold text-white/90 mb-3">
            One Campus. One Connected Experience.
          </p>

          <p className="text-sm sm:text-base text-white/70 mb-10 max-w-lg mx-auto">
            The Standard Fireworks Rajaratnam College for Women, Sivakasi
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              id="hero-student-portal"
              href="/login?role=student"
              className="group inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sfrc-800 bg-white hover:bg-sfrc-100 transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 text-sm"
            >
              Student Portal
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              id="hero-admin-login"
              href="/login?role=admin"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-white border-2 border-white/60 hover:border-white hover:bg-white/10 transition-all duration-200 text-sm"
            >
              Admin Login
            </Link>
          </div>

          {/* Scroll hint */}
          <div className="mt-16 flex flex-col items-center gap-2 text-white/40 text-xs">
            <div className="w-px h-8 bg-white/30" />
            <span>Scroll to explore</span>
          </div>
        </div>
      </section>

      {/* ── SECTION 2: ROLE CARDS ──────────────────────────────────────────── */}
      <section
        id="role-cards"
        className="py-20 px-4 bg-sfrc-bg"
        aria-labelledby="role-cards-heading"
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2
              id="role-cards-heading"
              className="text-3xl sm:text-4xl font-black text-sfrc-900 tracking-tight"
            >
              Choose Your{' '}
              <span className="text-sfrc-700">Portal</span>
            </h2>
            <p className="mt-3 text-sfrc-600 max-w-xl mx-auto">
              MyZone SFRC 360 is built for every member of our campus community.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {roleCards.map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.role}
                  id={`role-card-${card.role}`}
                  href={card.href}
                  className="group relative bg-white border-2 border-sfrc-200 rounded-2xl p-6 flex flex-col gap-4 hover:border-sfrc-accent hover:shadow-lg hover:-translate-y-1 transition-all duration-200 overflow-hidden"
                >
                  {/* Gradient shimmer on hover */}
                  <div className={`absolute inset-x-0 top-0 h-1 bg-linear-to-r ${card.color} opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-t-2xl`} />

                  <div className="w-12 h-12 rounded-xl bg-sfrc-100 flex items-center justify-center group-hover:bg-sfrc-700 transition-colors duration-200">
                    <Icon className="w-6 h-6 text-sfrc-700 group-hover:text-white transition-colors duration-200" />
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-sfrc-900 group-hover:text-sfrc-700 transition-colors">
                      {card.label}
                    </h3>
                    <p className="mt-1.5 text-sm text-sfrc-600 leading-relaxed">
                      {card.description}
                    </p>
                  </div>

                  <div className="mt-auto flex items-center gap-1 text-xs font-semibold text-sfrc-accent group-hover:gap-2 transition-all duration-200">
                    Sign In
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── SECTION 3: FEATURE HIGHLIGHTS ─────────────────────────────────── */}
      <section
        id="features"
        className="py-20 px-4 bg-sfrc-surface"
        aria-labelledby="features-heading"
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2
              id="features-heading"
              className="text-3xl sm:text-4xl font-black text-sfrc-900 tracking-tight"
            >
              Platform{' '}
              <span className="text-sfrc-700">Highlights</span>
            </h2>
            <p className="mt-3 text-sfrc-600 max-w-xl mx-auto">
              Intelligent tools built for the SFRC campus.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="relative bg-white rounded-2xl p-8 border border-sfrc-200 hover:border-sfrc-accent hover:shadow-md transition-all duration-200 text-center group overflow-hidden"
                >
                  {/* Background glow */}
                  <div className="absolute inset-0 bg-linear-to-br from-sfrc-100/0 to-sfrc-100/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  <div className="relative">
                    <div className="text-4xl mb-4">{feature.emoji}</div>
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-sfrc-100 mb-4 group-hover:bg-sfrc-700 transition-colors duration-200">
                      <Icon className="w-6 h-6 text-sfrc-700 group-hover:text-white transition-colors duration-200" />
                    </div>
                    <h3 className="text-lg font-bold text-sfrc-900 mb-2">{feature.title}</h3>
                    <p className="text-sm text-sfrc-600 leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── SECTION 4: FOOTER ─────────────────────────────────────────────── */}
      <footer
        id="footer"
        className="bg-sfrc-950 text-sfrc-200 py-12 px-4"
        role="contentinfo"
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8 mb-8">
            {/* Left — Logo + College Info */}
            <div className="flex flex-col items-center md:items-start gap-4 text-center md:text-left">
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-full overflow-hidden ring-2 ring-sfrc-accent/40 bg-white p-1">
                  <Image
                    src="/wel_img.jpg"
                    alt="SFRC Logo"
                    fill
                    sizes="48px"
                    className="object-contain p-0.5"
                  />
                </div>
                <div>
                  <p className="text-sfrc-gold font-black text-lg leading-tight">MyZone SFRC 360</p>
                  <p className="text-sfrc-200/60 text-xs">Smart Campus Platform</p>
                </div>
              </div>
              <div className="text-xs text-sfrc-200/60 space-y-1">
                <p className="font-semibold text-sfrc-100">
                  The Standard Fireworks Rajaratnam College for Women (Autonomous), Sivakasi
                </p>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3 h-3" />
                  <span>Thiruthangal Road, Sivakasi – 626123, Tamil Nadu, India</span>
                </div>
              </div>
            </div>

            {/* Right — Contact + Social */}
            <div className="flex flex-col items-center md:items-end gap-3">
              <p className="text-xs font-semibold text-sfrc-400 uppercase tracking-wider">Contact</p>
              <div className="space-y-1.5 text-xs text-sfrc-200/60">
                <div className="flex items-center gap-2">
                  <Phone className="w-3 h-3" />
                  <span>+91 4562 223 500</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3 h-3" />
                  <span>principal@sfrc.ac.in</span>
                </div>
              </div>
              {/* Social placeholders */}
              <div className="flex items-center gap-3 mt-2">
                {['f', 'in', 'yt'].map((s) => (
                  <div
                    key={s}
                    className="w-8 h-8 rounded-full bg-sfrc-900 border border-sfrc-800 flex items-center justify-center text-xs text-sfrc-400 font-bold hover:border-sfrc-accent hover:text-sfrc-gold transition-colors cursor-pointer"
                  >
                    {s}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-sfrc-800 pt-6 text-center text-xs text-sfrc-200/40">
            © 2026 MyZone SFRC 360. All rights reserved. Designed & developed by SFRC ICT Team.
          </div>
        </div>
      </footer>
    </div>
  );
}
