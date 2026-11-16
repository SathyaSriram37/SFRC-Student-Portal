'use client';

import { useMemo } from 'react';
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
  Bus,
  Settings,
  Shield,
  LogOut,
  ChevronRight,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCapabilities } from '@/lib/hooks/use-capabilities';
import { openPragyaDrawer } from '@/components/ai/PragyaDrawer';
import { createClient } from '@/lib/supabase/client';
import { ROLE_CAPABILITIES, type UserRole, type Capability } from '@/lib/types';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  capability?: string;
  isPragya?: boolean;
}

const principalNav: NavItem[] = [
  { label: 'Executive Overview', href: '/faculty/dashboard', icon: LayoutDashboard },
  { label: 'All Departments Oversight', href: '/faculty/departments', icon: Building2 },
  { label: 'Academic Governance & BOS', href: '/faculty/governance', icon: FileCheck },
  { label: 'Faculty Workload Oversight', href: '/faculty/faculty-roster', icon: Users },
  { label: 'Student Risk Vigilance', href: '/faculty/student-risk', icon: BarChart3 },
  { label: 'Institutional Approvals', href: '/faculty/approvals', icon: ClipboardList },
  { label: 'College Circulars', href: '/faculty/circulars', icon: Bell },
  { label: 'Campus Venues & Ops', href: '/faculty/facilities', icon: Home },
  { label: 'Pragya AI', href: '#pragya', icon: Sparkles, isPragya: true },
];

const hodNav: NavItem[] = [
  { label: 'Department Overview', href: '/faculty/dashboard', icon: LayoutDashboard },
  { label: 'Department Faculty', href: '/faculty/faculty-roster', icon: Users },
  { label: 'Department Students', href: '/faculty/students-roster', icon: GraduationCap },
  { label: 'Curriculum & Courses', href: '/faculty/courses', icon: BookOpen },
  { label: 'Attendance Report', href: '/faculty/attendance-report', icon: ClipboardList },
  { label: 'Marks & CIA Report', href: '/faculty/marks-report', icon: BarChart3 },
  { label: 'Student Leave Endorsement', href: '/faculty/leave-approvals', icon: FileCheck },
  { label: 'Pragya AI', href: '#pragya', icon: Sparkles, isPragya: true },
];

const labAssistantNav: NavItem[] = [
  { label: 'Lab Operations Dashboard', href: '/faculty/dashboard', icon: LayoutDashboard },
  { label: 'Lab Inventory & Systems', href: '/faculty/lab/inventory', icon: FlaskConical },
  { label: 'Practical Session Logbook', href: '/faculty/lab/logbook', icon: ClipboardList },
  { label: 'Equipment Maintenance', href: '/faculty/lab/maintenance', icon: Settings },
  { label: 'Consumables & Stock', href: '/faculty/lab/consumables', icon: Building2 },
  { label: 'Pragya AI', href: '#pragya', icon: Sparkles, isPragya: true },
];

const teachingStaffNav: NavItem[] = [
  { label: 'Dashboard', href: '/faculty/dashboard', icon: LayoutDashboard },
  { label: 'My Profile', href: '/faculty/profile', icon: User },
  { label: 'My Courses', href: '/faculty/courses', icon: BookOpen, capability: 'courses:manage' },
  { label: 'Attendance', href: '/faculty/attendance', icon: ClipboardList, capability: 'attendance:mark' },
  { label: 'Marks Entry', href: '/faculty/marks', icon: BarChart3, capability: 'marks:enter' },
  { label: 'E-Content', href: '/faculty/e-content', icon: FileText, capability: 'courses:manage' },
  { label: 'Mentoring', href: '/faculty/mentoring', icon: Users, capability: 'mentorship:log' },
  { label: 'My Leave Applications', href: '/faculty/leave', icon: ClipboardList },
  { label: 'Events & Seminars', href: '/faculty/events', icon: Calendar, capability: 'events:create' },
  { label: 'Research & Grants', href: '/faculty/research', icon: FlaskConical },
  { label: 'Facilities Booking', href: '/faculty/facilities', icon: Building2 },
  { label: 'Bus Tracking', href: '/faculty/transport', icon: Bus },
  { label: 'Pragya AI', href: '#pragya', icon: Sparkles, isPragya: true },
];

const navByRole: Record<UserRole, NavItem[]> = {
  student: [
    { label: 'Dashboard', href: '/student/dashboard', icon: LayoutDashboard },
    { label: 'My Profile & Settings', href: '/student/profile', icon: User },
    { label: 'Academics', href: '/student/academics', icon: GraduationCap, capability: 'courses:view' },
    { label: 'Examinations & Marks', href: '/student/marks', icon: BarChart3, capability: 'marks:view' },
    { label: 'E-Content', href: '/student/e-content', icon: FileText, capability: 'courses:view' },
    { label: 'Leave & OD', href: '/student/leave', icon: ClipboardList, capability: 'leave:apply' },
    { label: 'Fee Payments', href: '/student/fees', icon: FileText, capability: 'fees:view' },
    { label: 'Mentoring', href: '/student/mentoring', icon: Users, capability: 'courses:view' },
    { label: 'Library', href: '/student/library', icon: Library, capability: 'library:search' },
    { label: 'Hostel', href: '/student/hostel', icon: Home, capability: 'courses:view' },
    { label: 'Facilities', href: '/student/facilities', icon: Building2 },
    { label: 'Bus Tracking', href: '/student/transport', icon: Bus },
    { label: 'Sports & Athletics', href: '/student/sports', icon: Award },
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
  faculty: teachingStaffNav,
  parent: [
    { label: 'Dashboard', href: '/parent/dashboard', icon: LayoutDashboard },
    { label: 'My Ward', href: '/parent/progress', icon: Users, capability: 'attendance:view_ward' },
    { label: 'Attendance', href: '/parent/attendance', icon: ClipboardList, capability: 'attendance:view_ward' },
    { label: 'Performance', href: '/parent/performance', icon: BarChart3, capability: 'marks:view_ward' },
    { label: 'Examinations', href: '/parent/exams', icon: FileText, capability: 'marks:view_ward' },
    { label: 'Events', href: '/parent/events', icon: Calendar, capability: 'events:view' },
    { label: 'Bus Tracking', href: '/parent/transport', icon: Bus, capability: 'attendance:view_ward' },
    { label: 'Hostel', href: '/parent/hostel', icon: Home },
    { label: 'Notices', href: '/parent/notices', icon: Bell, capability: 'announcements:view' },
  ],
  hod: hodNav,
  admin: [
    { label: 'Overview', href: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'User Management', href: '/admin/users', icon: Users },
    { label: 'Academics', href: '/admin/academics', icon: GraduationCap },
    { label: 'E-Content', href: '/admin/e-content', icon: FileText },
    { label: 'Campus Venues & Ops', href: '/admin/facilities', icon: Building2 },
    { label: 'Events & Symposiums', href: '/admin/events', icon: Calendar },
    { label: 'Library Catalog', href: '/admin/library', icon: Library },
    { label: 'Hostel & Housing', href: '/admin/hostel', icon: Home },
    { label: 'Placements & Career', href: '/admin/placements', icon: Briefcase },
    { label: 'Mentoring Cell', href: '/admin/mentoring', icon: Users },
    { label: 'Research & Grants', href: '/admin/research', icon: FlaskConical },
    { label: 'Entrepreneurship (IEDC)', href: '/admin/iedc', icon: Lightbulb },
    { label: 'Student Life & Clubs', href: '/admin/life', icon: Heart },
    { label: 'Alumni Network', href: '/admin/alumni', icon: Award },
    { label: 'IQAC Cell', href: '/admin/iqac', icon: FileCheck },
    { label: 'Policies & Compliance', href: '/admin/policies', icon: Shield },
    { label: 'ICT & Infrastructure', href: '/admin/infrastructure', icon: Building2 },
    { label: 'Bus Transport', href: '/admin/transport', icon: Briefcase },
    { label: 'Sports & Varsity', href: '/admin/sports', icon: Award },
    { label: 'Analytics Suite', href: '/admin/analytics', icon: BarChart3 },
    { label: 'Campus Care Helpdesk', href: '/admin/complaints', icon: LifeBuoy },
    { label: 'Pragya AI', href: '#pragya', icon: Sparkles, isPragya: true },
    { label: 'Announcements & Circulars', href: '/admin/notifications', icon: Bell },
    { label: 'Integrations (ERMS)', href: '/admin/integrations', icon: Settings },
    { label: 'System Settings', href: '/admin/settings', icon: Settings },
    { label: 'Audit Logs', href: '/admin/audit-logs', icon: Shield },
  ],
};

const roleIcons: Record<UserRole, React.ElementType> = {
  student: GraduationCap,
  faculty: BookOpen,
  parent: Heart,
  admin: Shield,
  hod: Building2,
};

interface SidebarProps {
  role: UserRole;
  userName: string;
  onClose?: () => void;
}

export default function Sidebar({ role, userName, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { can, user } = useCapabilities();
  const supabase = createClient();

  const designationLower = (user?.designation || '').toLowerCase();
  const isPrincipal = designationLower.includes('principal');
  const isHOD = role === 'hod' || designationLower.includes('head') || designationLower.includes('hod');
  const isLab = designationLower.includes('lab') || designationLower.includes('technical assistant');

  let rawNavItems: NavItem[] = navByRole[role] ?? [];
  if (role === 'faculty') {
    if (isPrincipal) rawNavItems = principalNav;
    else if (isHOD) rawNavItems = hodNav;
    else if (isLab) rawNavItems = labAssistantNav;
    else rawNavItems = teachingStaffNav;
  }

  const RoleIcon = useMemo(() => {
    if (role === 'student') return GraduationCap;
    if (role === 'parent') return Heart;
    if (role === 'admin') return Shield;
    if (isPrincipal) return Award;
    if (isHOD) return Building2;
    if (isLab) return FlaskConical;
    return BookOpen;
  }, [role, isPrincipal, isHOD, isLab]);

  const portalLabel = useMemo(() => {
    if (role === 'student') return 'Student Portal';
    if (role === 'parent') return 'Parent Portal';
    if (role === 'admin') return 'Admin Portal';
    if (isPrincipal) return 'Principal Office';
    if (isHOD) return 'Department HOD';
    if (isLab) return 'Lab Operations';
    return 'Faculty & Staff';
  }, [role, isPrincipal, isHOD, isLab]);

  const badgeText = useMemo(() => {
    if (user?.designation) return user.designation;
    if (role === 'student') return 'Undergraduate / PG';
    if (role === 'parent') return 'Parent / Guardian';
    if (role === 'admin') return 'System Administrator';
    if (isPrincipal) return 'Head of Institution';
    if (isHOD) return 'Head of Department';
    if (isLab) return 'Laboratory Assistant';
    return 'Teaching Faculty';
  }, [user, role, isPrincipal, isHOD, isLab]);

  // Filter items based on capabilities, with fallback to role's default capabilities
  const visibleNavItems = rawNavItems.filter((item) => {
    if (!item.capability) return true;
    if (user) return can(item.capability);
    const roleCaps = ROLE_CAPABILITIES[role] || [];
    return roleCaps.includes('*') || roleCaps.includes(item.capability as Capability);
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <aside className="flex flex-col h-full w-64 bg-sfrc-surface dark:bg-sidebar border-r border-sfrc-200 dark:border-sidebar-border">
      {/* Role Profile Header */}
      <Link
        href={role === 'student' ? '/student/profile' : `/${role}/dashboard`}
        onClick={onClose}
        className="flex items-center gap-3 p-4 border-b border-sfrc-200 dark:border-sidebar-border hover:bg-sfrc-100/60 dark:hover:bg-muted/40 transition-colors group cursor-pointer"
        title="View Profile & Settings"
      >
        <div className="w-10 h-10 rounded-xl bg-sfrc-100 dark:bg-muted group-hover:bg-sfrc-200 dark:group-hover:bg-muted/80 flex items-center justify-center shrink-0 shadow-inner transition-colors">
          <RoleIcon className="w-5 h-5 text-sfrc-700 dark:text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-sfrc-600 dark:text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-1">
            <span>{portalLabel}</span>
          </p>
          <p className="text-sm font-bold text-sfrc-900 dark:text-foreground truncate group-hover:text-sfrc-700 dark:group-hover:text-primary transition-colors">
            {userName}
          </p>
          <span className="inline-block mt-0.5 text-[9px] font-semibold text-sfrc-700 bg-sfrc-200/70 px-1.5 py-0.2 rounded-md truncate max-w-full">
            {badgeText}
          </span>
        </div>
      </Link>

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
                  ? 'bg-sfrc-700 dark:bg-primary text-white dark:text-primary-foreground shadow-sm font-bold'
                  : 'text-sfrc-800 dark:text-sidebar-foreground hover:bg-sfrc-100/80 dark:hover:bg-muted/60 hover:text-sfrc-950 dark:hover:text-foreground'
              )}
            >
              <Icon className={cn('w-4 h-4 shrink-0', active ? 'text-sfrc-gold dark:text-primary-foreground' : 'text-sfrc-600 dark:text-muted-foreground')} />
              <span className="truncate">{item.label}</span>
              {active && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-70" />}
            </Link>
          );
        })}
      </nav>

      {/* Sidebar Sign Out Footer */}
      <div className="p-3 border-t border-sfrc-200 dark:border-sidebar-border bg-sfrc-100/40 dark:bg-muted/20">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-xs font-semibold text-sfrc-700 dark:text-muted-foreground hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 transition-all duration-150 cursor-pointer"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
