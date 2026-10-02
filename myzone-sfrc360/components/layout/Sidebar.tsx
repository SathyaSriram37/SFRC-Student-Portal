'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  FileText,
  Users,
  Library,
  Home,
  Building2,
  LifeBuoy,
  Calendar,
  Briefcase,
  FlaskConical,
  Lightbulb,
  Heart,
  Award,
  FileCheck,
  Sparkles,
  HelpCircle,
  ClipboardList,
  BarChart3,
  Bell,
  Settings,
  Shield,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCapabilities } from '@/lib/hooks/use-capabilities';
import { openPragyaDrawer } from '@/components/ai/PragyaDrawer';
import { createClient } from '@/lib/supabase/client';
import type { UserRole } from '@/lib/types';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  capability?: string;
  isPragya?: boolean;
}

const navByRole: Record<UserRole, NavItem[]> = {
  student: [
    { label: 'Dashboard', href: '/student/dashboard', icon: LayoutDashboard },
    { label: 'Academics', href: '/student/academics', icon: GraduationCap, capability: 'courses:view' },
    { label: 'E-Content', href: '/student/e-content', icon: FileText, capability: 'courses:view' },
    { label: 'Examinations', href: '/student/marks', icon: BarChart3, capability: 'marks:view' },
    { label: 'Mentoring', href: '/student/mentoring', icon: Users, capability: 'courses:view' },
    { label: 'Library', href: '/student/library', icon: Library, capability: 'library:search' },
    { label: 'Hostel', href: '/student/hostel', icon: Home, capability: 'courses:view' },
    { label: 'Facilities', href: '/student/facilities', icon: Building2 },
    { label: 'Campus Care', href: '/student/campus-care', icon: LifeBuoy, capability: 'complaints:create' },
    { label: 'Events', href: '/student/events', icon: Calendar, capability: 'events:view' },
    { label: 'Placements', href: '/student/placements', icon: Briefcase, capability: 'placements:apply' },
    { label: 'Research', href: '/student/research', icon: FlaskConical },
    { label: 'Entrepreneurship', href: '/student/iedc', icon: Lightbulb },
    { label: 'Student Life', href: '/student/life', icon: Heart },
    { label: 'Alumni', href: '/student/alumni', icon: Award },
    { label: 'Policies', href: '/student/policies', icon: FileCheck },
    { label: 'Pragya AI', href: '#pragya', icon: Sparkles, isPragya: true },
    { label: 'Help & Support', href: '/student/help', icon: HelpCircle },
  ],
  faculty: [
    { label: 'Dashboard', href: '/faculty/dashboard', icon: LayoutDashboard },
    { label: 'My Courses', href: '/faculty/courses', icon: BookOpen, capability: 'courses:manage' },
    { label: 'Attendance', href: '/faculty/attendance', icon: ClipboardList, capability: 'attendance:mark' },
    { label: 'Marks Entry', href: '/faculty/marks', icon: BarChart3, capability: 'marks:enter' },
    { label: 'E-Content', href: '/faculty/e-content', icon: FileText, capability: 'courses:manage' },
    { label: 'Mentoring', href: '/faculty/mentoring', icon: Users, capability: 'mentorship:log' },
    { label: 'Events', href: '/faculty/events', icon: Calendar, capability: 'events:create' },
    { label: 'Research', href: '/faculty/research', icon: FlaskConical },
    { label: 'Facilities', href: '/faculty/facilities', icon: Building2 },
    { label: 'Pragya AI', href: '#pragya', icon: Sparkles, isPragya: true },
  ],
  parent: [
    { label: 'Dashboard', href: '/parent/dashboard', icon: LayoutDashboard },
    { label: 'My Ward', href: '/parent/progress', icon: Users, capability: 'attendance:view_ward' },
    { label: 'Attendance', href: '/parent/attendance', icon: ClipboardList, capability: 'attendance:view_ward' },
    { label: 'Performance', href: '/parent/performance', icon: BarChart3, capability: 'marks:view_ward' },
    { label: 'Examinations', href: '/parent/exams', icon: FileText, capability: 'marks:view_ward' },
    { label: 'Events', href: '/parent/events', icon: Calendar, capability: 'events:view' },
    { label: 'Hostel', href: '/parent/hostel', icon: Home },
    { label: 'Notices', href: '/parent/notices', icon: Bell, capability: 'announcements:view' },
    { label: 'Pragya AI', href: '#pragya', icon: Sparkles, isPragya: true },
  ],
  admin: [
    { label: 'Overview', href: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'User Management', href: '/admin/users', icon: Users },
    { label: 'Academics', href: '/admin/academics', icon: GraduationCap },
    { label: 'E-Content', href: '/admin/e-content', icon: FileText },
    { label: 'Campus Ops', href: '/admin/facilities', icon: Building2 },
    { label: 'Events', href: '/admin/events', icon: Calendar },
    { label: 'Library', href: '/admin/library', icon: Library },
    { label: 'Hostel', href: '/admin/hostel', icon: Home },
    { label: 'Placements', href: '/admin/placements', icon: Briefcase },
    { label: 'Research', href: '/admin/research', icon: FlaskConical },
    { label: 'Entrepreneurship', href: '/admin/iedc', icon: Lightbulb },
    { label: 'Student Life', href: '/admin/life', icon: Heart },
    { label: 'Alumni', href: '/admin/alumni', icon: Award },
    { label: 'IQAC', href: '/admin/iqac', icon: FileCheck },
    { label: 'Policies', href: '/admin/policies', icon: Shield },
    { label: 'Facilities', href: '/admin/infrastructure', icon: Building2 },
    { label: 'Transport', href: '/admin/transport', icon: Briefcase },
    { label: 'Sports', href: '/admin/sports', icon: Award },
    { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    { label: 'Campus Care', href: '/admin/complaints', icon: LifeBuoy },
    { label: 'Pragya AI', href: '#pragya', icon: Sparkles, isPragya: true },
    { label: 'RAG', href: '/admin/rag', icon: BookOpen },
    { label: 'Notifications', href: '/notifications', icon: Bell },
    { label: 'Integrations', href: '/admin/integrations', icon: Settings },
    { label: 'System Settings', href: '/admin/settings', icon: Settings },
    { label: 'Audit Logs', href: '/admin/audit-logs', icon: Shield },
  ],
};

const roleIcons: Record<UserRole, React.ElementType> = {
  student: GraduationCap,
  faculty: BookOpen,
  parent: Heart,
  admin: Shield,
};

interface SidebarProps {
  role: UserRole;
  userName: string;
  onClose?: () => void;
}

export default function Sidebar({ role, userName, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { can } = useCapabilities();
  const rawNavItems = navByRole[role] ?? [];
  const RoleIcon = roleIcons[role] || GraduationCap;
  const supabase = createClient();

  // Filter items based on capabilities
  const visibleNavItems = rawNavItems.filter((item) => {
    if (!item.capability) return true;
    return can(item.capability);
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <aside className="flex flex-col h-full w-64 bg-sfrc-surface border-r border-sfrc-200">
      {/* Role Profile Header */}
      <div className="flex items-center gap-3 p-4 border-b border-sfrc-200">
        <div className="w-10 h-10 rounded-xl bg-sfrc-100 flex items-center justify-center shrink-0 shadow-inner">
          <RoleIcon className="w-5 h-5 text-sfrc-700" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-sfrc-600 font-bold uppercase tracking-wider">
            {role} Portal
          </p>
          <p className="text-sm font-bold text-sfrc-900 truncate">{userName}</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5 no-scrollbar" role="navigation">
        {visibleNavItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;

          if (item.isPragya) {
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  onClose?.();
                  openPragyaDrawer();
                }}
                className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-xs font-semibold text-sfrc-accent hover:bg-sfrc-gold/15 transition-all text-left group"
              >
                <div className="w-6 h-6 rounded-lg bg-sfrc-gold/20 flex items-center justify-center text-sfrc-gold group-hover:scale-105 transition-transform">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <span>{item.label}</span>
                <span className="ml-auto text-[9px] bg-sfrc-gold/20 text-sfrc-800 font-bold px-1.5 py-0.5 rounded-md">
                  AI
                </span>
              </button>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150',
                active
                  ? 'bg-sfrc-700 text-white shadow-sm font-bold'
                  : 'text-sfrc-800 hover:bg-sfrc-100/80 hover:text-sfrc-950'
              )}
            >
              <Icon className={cn('w-4 h-4 shrink-0', active ? 'text-sfrc-gold' : 'text-sfrc-600')} />
              <span className="truncate">{item.label}</span>
              {active && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-70" />}
            </Link>
          );
        })}
      </nav>

      {/* Sidebar Sign Out Footer */}
      <div className="p-3 border-t border-sfrc-200 bg-sfrc-100/40">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-xs font-semibold text-sfrc-700 hover:bg-red-50 hover:text-red-600 transition-all duration-150 cursor-pointer"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
