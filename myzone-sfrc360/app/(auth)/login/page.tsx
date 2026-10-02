'use client';

import { useState, Suspense } from 'react';
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
import type { UserRole } from '@/lib/types';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
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
  const [isOAuthLoading, setIsOAuthLoading] = useState(false);

  const config = roleConfig[role];
  const Icon = config.icon;
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        throw error;
      }

      toast.success('Signed in successfully! Redirecting...');
      
      const userMeta = authData.user?.user_metadata || {};
      const appMeta = authData.user?.app_metadata || {};
      const userRole = (userMeta.role || appMeta.role || role).toLowerCase();

      const redirectedFrom = searchParams.get('redirectedFrom');
      if (redirectedFrom && !redirectedFrom.startsWith('/login')) {
        router.push(redirectedFrom);
      } else {
        router.push(`/${userRole}/dashboard`);
      }
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Authentication failed. Please verify your email and password.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsOAuthLoading(true);
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Google OAuth sign-in failed.';
      toast.error(message);
      setIsOAuthLoading(false);
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

            {/* Google OAuth Button */}
            <button
              type="button"
              id="google-oauth-btn"
              onClick={handleGoogleSignIn}
              disabled={isOAuthLoading || isLoading}
              className={cn(
                'w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-sfrc-200 bg-white hover:bg-sfrc-50 text-sfrc-800 font-medium text-sm transition-all duration-150 shadow-sm mb-6 active:scale-[0.99]',
                'disabled:opacity-60 disabled:cursor-not-allowed'
              )}
            >
              {isOAuthLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-sfrc-700" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>Continue with Google</span>
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center mb-6">
              <div className="border-t border-sfrc-200 w-full" />
              <span className="bg-white px-3 text-xs uppercase tracking-wider text-sfrc-400 font-semibold absolute">
                or sign in with email
              </span>
            </div>

            {/* Email + Password Form */}
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label
                  htmlFor="login-email"
                  className="text-xs font-bold text-sfrc-800 uppercase tracking-wider block"
                >
                  Email Address
                </label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@sfrc.ac.in"
                  {...register('email')}
                  className={cn(
                    'w-full px-4 py-3 rounded-xl border text-sm bg-sfrc-surface text-sfrc-900 placeholder:text-sfrc-400',
                    'focus:outline-none focus:ring-2 focus:ring-sfrc-accent/40 focus:border-sfrc-accent transition-all',
                    errors.email ? 'border-red-400' : 'border-sfrc-200'
                  )}
                />
                {errors.email && (
                  <p className="text-xs text-red-500 font-medium">{errors.email.message}</p>
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
                    autoComplete="current-password"
                    placeholder="••••••••"
                    {...register('password')}
                    className={cn(
                      'w-full px-4 py-3 pr-11 rounded-xl border text-sm bg-sfrc-surface text-sfrc-900 placeholder:text-sfrc-400',
                      'focus:outline-none focus:ring-2 focus:ring-sfrc-accent/40 focus:border-sfrc-accent transition-all',
                      errors.password ? 'border-red-400' : 'border-sfrc-200'
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
                {errors.password && (
                  <p className="text-xs text-red-500 font-medium">{errors.password.message}</p>
                )}
              </div>

              {/* Submit button */}
              <button
                id="login-submit"
                type="submit"
                disabled={isLoading || isOAuthLoading}
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
