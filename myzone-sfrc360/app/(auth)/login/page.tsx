'use client';

import { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  GraduationCap,
  BookOpen,
  Heart,
  Shield,
  Eye,
  EyeOff,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { apiGet } from '@/lib/api-client';
import type { UserRole } from '@/lib/types';

const loginSchema = z.object({
  identifier: z.string().min(1, 'Please enter your login identifier'),
  password: z.string().min(1, 'Password is required'),
});
type LoginFormData = z.infer<typeof loginSchema>;

const roleConfig: Record<
  UserRole,
  { label: string; icon: React.ElementType; color: string; badge: string }
> = {
  student: {
    label: 'Student',
    icon: GraduationCap,
    color: 'bg-sfrc-700',
    badge: 'Academics & Attendance',
  },
  faculty: {
    label: 'Faculty',
    icon: BookOpen,
    color: 'bg-sfrc-600',
    badge: 'Class Management & Grading',
  },
  parent: {
    label: 'Parent',
    icon: Heart,
    color: 'bg-sfrc-accent',
    badge: 'Ward Progress & Fees',
  },
  admin: {
    label: 'Administrator',
    icon: Shield,
    color: 'bg-sfrc-950',
    badge: 'System Governance & RBAC',
  },
};

const VALID_ROLES: UserRole[] = ['student', 'faculty', 'parent', 'admin'];

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRole = searchParams.get('role') ?? 'student';
  const role: UserRole = VALID_ROLES.includes(rawRole as UserRole)
    ? (rawRole as UserRole)
    : 'student';

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  const config = roleConfig[role];
  const Icon = config.icon;
  const supabase = createClient();

  useEffect(() => {
    console.log('CLIENT_MOUNT_FIRED');
    (window as unknown as { __client_init: boolean }).__client_init = true;
  }, []);

  const handleFormSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isLoading) return;

    const idVal = identifier.trim() || (typeof document !== 'undefined' ? (document.getElementById('login-identifier') as HTMLInputElement)?.value?.trim() : '') || '';
    const pwVal = password || (typeof document !== 'undefined' ? (document.getElementById('login-password') as HTMLInputElement)?.value : '') || '';

    console.log('[DEBUG SUBMIT] handleFormSubmit called with:', idVal);
    if (typeof window !== 'undefined') (window as unknown as { __debug_submit_called: boolean }).__debug_submit_called = true;

    if (!idVal || !pwVal) {
      toast.error('Please enter both your identifier and Password.');
      return;
    }

    await onSubmit({ identifier: idVal, password: pwVal });
  };

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    console.log('[DEBUG SUBMIT] onSubmit starting for:', data.identifier);
    try {
      const rawInput = data.identifier.trim();
      let loginEmail = rawInput;

      // 1. Resolve identifier using backend database (phone number, register number, or email)
      if (!loginEmail.includes('@') || role === 'parent') {
        try {
          const res = await apiGet<{ found: boolean; email?: string; role?: string; is_active?: boolean }>(
            `/api/v1/auth/resolve-identifier?identifier=${encodeURIComponent(rawInput)}`
          );
          if (res && res.found) {
            if (res.is_active === false) {
              throw new Error('This account has been deactivated. Please contact the college administrator.');
            }
            if (res.email) {
              loginEmail = res.email;
            }
          } else if (!loginEmail.includes('@')) {
            const digitsOnly = rawInput.replace(/\D/g, '');
            if (digitsOnly.length >= 10) {
              throw new Error('Mobile number not found in registered accounts. Please verify your mobile number.');
            } else if (role === 'student') {
              throw new Error(`Student register number "${rawInput}" not found in college records.`);
            }
          }
        } catch (apiErr: any) {
          if (apiErr.message?.includes('deactivated') || apiErr.message?.includes('not found')) {
            throw apiErr;
          }
          if (!loginEmail.includes('@')) {
            loginEmail = `${rawInput.toLowerCase()}@sfrc.ac.in`;
          }
        }
      }

      console.log('[DEBUG AUTH] Calling supabase.auth.signInWithPassword for:', loginEmail);
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: data.password,
      });

      if (error) {
        console.error('[DEBUG AUTH] signInWithPassword error:', error);
        throw error;
      }
      console.log('[DEBUG AUTH] user:', authData.user?.email, 'meta:', authData.user?.user_metadata);

      const userMeta = authData.user?.user_metadata || {};
      const appMeta = authData.user?.app_metadata || {};
      const rawUserRole = (userMeta.role || appMeta.role || '').toLowerCase();

      // In Supabase, standard registered students have role 'student' or unassigned ('authenticated')
      const resolvedRole = (rawUserRole && rawUserRole !== 'authenticated') ? rawUserRole : 'student';
      console.log('[DEBUG AUTH] role check:', { role, rawUserRole, resolvedRole });

      // Enforce that the user's registered role matches the selected login portal tab
      const isRoleAllowed = (portalRole: UserRole, userRole: string): boolean => {
        if (portalRole === 'admin') {
          return ['admin', 'super_admin', 'administrator'].includes(userRole);
        }
        if (portalRole === 'faculty') {
          return ['faculty', 'teacher', 'staff', 'hod', 'dean', 'mentor'].includes(userRole);
        }
        if (portalRole === 'parent') {
          return ['parent', 'guardian'].includes(userRole);
        }
        if (portalRole === 'student') {
          return userRole === 'student';
        }
        return false;
      };

      if (!isRoleAllowed(role, resolvedRole)) {
        console.error('[DEBUG AUTH] Role mismatch! Signing out.');
        // Invalidate session immediately on role mismatch
        await supabase.auth.signOut();
        throw new Error('Invalid credentials');
      }

      toast.success('Signed in successfully! Redirecting...');

      const redirectedFrom = searchParams.get('redirectedFrom');
      const targetUrl = (redirectedFrom && !redirectedFrom.startsWith('/login'))
        ? redirectedFrom
        : `/${role}/dashboard`;
      console.log('[DEBUG AUTH] Navigating to:', targetUrl);
      router.push(targetUrl);
      router.refresh();
    } catch (err: unknown) {
      console.error('[DEBUG AUTH] Caught error:', err);
      const message =
        err instanceof Error
          ? err.message
          : 'Invalid credentials. Please verify your email and password.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col lg:flex-row bg-sfrc-bg">
      {/* Left panel (lg:w-2/5): sfrc-700 bg + logo1.png centered + tagline */}
      <div className="hidden lg:flex lg:w-2/5 relative bg-linear-to-br from-sfrc-800 via-sfrc-700 to-sfrc-900 text-white flex-col justify-between p-12 overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,160,82,0.15),transparent_50%)] pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-sfrc-600/30 blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-full overflow-hidden ring-2 ring-sfrc-gold/60 shadow-md bg-white p-1">
            <Image
              src="/wel_img.jpg"
              alt="SFRC Logo"
              fill
              sizes="48px"
              className="object-contain p-1"
              priority
            />
          </div>
          <div>
            <h2 className="font-black tracking-tight text-lg text-white">
              MYZONE SFRC 360
            </h2>
            <p className="text-xs text-sfrc-200 font-medium tracking-wide">
              An Autonomous Institution | Re-accredited with &apos;A+&apos; Grade by NAAC
            </p>
          </div>
        </div>

        {/* Center Spotlight */}
        <div className="relative z-10 text-center py-8">
          <div className="w-24 h-24 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Icon className="w-12 h-12 text-sfrc-gold animate-pulse" />
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sfrc-gold/20 text-sfrc-gold border border-sfrc-gold/30 mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            {config.badge}
          </span>
          <h1 className="text-3xl font-black mb-3 tracking-tight">
            {config.label} Portal
          </h1>
          <p className="text-sfrc-100 text-sm leading-relaxed max-w-sm mx-auto">
            Empowering Women Through Quality Education & Smart Digital Campus
            Governance.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="relative z-10 grid grid-cols-2 gap-3 text-xs text-sfrc-100">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10 hover:bg-white/15 transition-all">
            <p className="font-bold text-white mb-0.5">🔒 Multi-Tenant RBAC</p>
            <p className="text-[11px] text-sfrc-200">Granular role-based security</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10 hover:bg-white/15 transition-all">
            <p className="font-bold text-white mb-0.5">🤖 Pragya AI 360</p>
            <p className="text-[11px] text-sfrc-200">Intelligent RAG assistant</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10 hover:bg-white/15 transition-all">
            <p className="font-bold text-white mb-0.5">📊 ERMS Sync</p>
            <p className="text-[11px] text-sfrc-200">Real-time academic records</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10 hover:bg-white/15 transition-all">
            <p className="font-bold text-white mb-0.5">🏛️ Campus Care</p>
            <p className="text-[11px] text-sfrc-200">SLA-backed grievance resolver</p>
          </div>
        </div>
      </div>

      {/* Right panel — Form card */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo Header */}
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <div className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-sfrc-accent/40 bg-white p-0.5">
              <Image
                src="/wel_img.jpg"
                alt="SFRC Logo"
                fill
                sizes="40px"
                className="object-contain"
              />
            </div>
            <div>
              <p className="text-xs text-sfrc-600 font-medium">MyZone SFRC 360</p>
              <p className="text-sm font-bold text-sfrc-900">
                {config.label} Sign In
              </p>
            </div>
          </div>

          {/* Role selector tabs: Student | Faculty | Parent | Admin */}
          <div className="bg-sfrc-100/70 p-1.5 rounded-2xl mb-8 border border-sfrc-200 shadow-inner">
            <div className="grid grid-cols-4 gap-1">
              {VALID_ROLES.map((r) => {
                const RoleIcon = roleConfig[r].icon;
                const isSelected = role === r;
                return (
                  <Link
                    key={r}
                    id={`role-tab-${r}`}
                    href={`/login?role=${r}`}
                    className={cn(
                      'flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-semibold transition-all duration-200 text-center',
                      isSelected
                        ? 'bg-sfrc-700 text-white shadow-md scale-[1.02]'
                        : 'text-sfrc-700 hover:text-sfrc-900 hover:bg-white/60'
                    )}
                  >
                    <RoleIcon className={cn('w-4 h-4', isSelected ? 'text-sfrc-gold' : 'text-sfrc-600')} />
                    <span className="capitalize">{roleConfig[r].label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Form card */}
          <div className="bg-white rounded-3xl border border-sfrc-200 shadow-xl shadow-sfrc-950/5 p-8 sm:p-10">
            <div className="mb-6">
              <h1 className="text-2xl font-black text-sfrc-900 tracking-tight">
                Welcome back
              </h1>
              <p className="text-sm text-sfrc-600 mt-1">
                Enter your credentials to access the{' '}
                <span className="font-semibold text-sfrc-800">
                  {config.label.toLowerCase()}
                </span>{' '}
                portal.
              </p>
            </div>

            {/* Email + Password Form */}
            <form onSubmit={(e) => { e.preventDefault(); handleFormSubmit(e); }} className="space-y-4">
              {/* Identifier (Role-aware Email / Mobile / Register Number) */}
              <div className="space-y-1.5">
                <label
                  htmlFor="login-identifier"
                  className="text-xs font-bold text-sfrc-800 uppercase tracking-wider block"
                >
                  {role === 'parent'
                    ? 'Personal Email or Mobile Number'
                    : role === 'student'
                    ? 'Student ID / Register No / Email'
                    : role === 'faculty'
                    ? 'Faculty Email Address'
                    : 'Administrator Email Address'}
                </label>
                <input
                  id="login-identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleFormSubmit(e); }}
                  autoComplete="username email"
                  placeholder={
                    role === 'parent'
                      ? 'parent@gmail.com or 9876543210'
                      : role === 'student'
                      ? '23UCA001 or student@sfrc.ac.in'
                      : role === 'faculty'
                      ? 'ganga.faculty@sfrc.ac.in'
                      : 'admin@sfrc.ac.in'
                  }
                  className={cn(
                    'w-full px-4 py-3 rounded-xl border text-sm bg-sfrc-surface text-sfrc-900 placeholder:text-sfrc-400',
                    'focus:outline-none focus:ring-2 focus:ring-sfrc-accent/40 focus:border-sfrc-accent transition-all',
                    'border-sfrc-200'
                  )}
                />
                <p className="text-[11px] text-sfrc-500">
                  {role === 'parent'
                    ? 'Enter your registered personal email (e.g. @gmail.com) or 10-digit mobile number.'
                    : role === 'student'
                    ? 'Enter your SFRC register number (e.g. 23UCA001) or college email address.'
                    : role === 'faculty'
                    ? 'Enter your official SFRC faculty institutional email address.'
                    : 'Enter your administrator institutional email address.'}
                </p>
                {role === 'parent' && (
                  <div className="mt-2 p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-[11px] text-amber-800 flex items-start gap-2">
                    <span className="font-bold text-amber-900">ℹ️ Notice:</span>
                    <span>
                      Password login is supported using your registered mobile number or personal email. (Direct SMS OTP is currently disabled by institution).
                    </span>
                  </div>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="login-password"
                    className="text-xs font-bold text-sfrc-800 uppercase tracking-wider block"
                  >
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-sfrc-accent hover:text-sfrc-800 font-semibold"
                  >
                    Forgot?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleFormSubmit(e); }}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className={cn(
                      'w-full px-4 py-3 pr-11 rounded-xl border text-sm bg-sfrc-surface text-sfrc-900 placeholder:text-sfrc-400',
                      'focus:outline-none focus:ring-2 focus:ring-sfrc-accent/40 focus:border-sfrc-accent transition-all',
                      'border-sfrc-200'
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sfrc-400 hover:text-sfrc-700 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit button */}
              <button
                id="login-submit"
                type="submit"
                disabled={isLoading}
                className={cn(
                  'w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-bold text-sm text-white',
                  'bg-sfrc-700 hover:bg-sfrc-800 active:scale-[0.98] transition-all duration-150 shadow-md shadow-sfrc-700/20 mt-2',
                  'disabled:opacity-60 disabled:cursor-not-allowed'
                )}
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {isLoading ? 'Authenticating…' : `Sign in as ${config.label}`}
              </button>
            </form>
          </div>

          <p className="mt-8 text-center text-xs text-sfrc-500">
            Having trouble accessing your account?{' '}
            <Link
              href="mailto:support@sfrc.ac.in"
              className="text-sfrc-accent hover:text-sfrc-800 font-semibold underline underline-offset-2"
            >
              Contact IT Helpdesk
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-sfrc-bg">
          <Loader2 className="w-8 h-8 animate-spin text-sfrc-700" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
