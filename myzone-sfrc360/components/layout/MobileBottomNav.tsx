'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, GraduationCap, Calendar, LifeBuoy, Sparkles, BookOpen, ClipboardList, Users, BarChart3, Bell, HeartHandshake } from 'lucide-react';
import { cn } from '@/lib/utils';
import { openPragyaDrawer } from '@/components/ai/PragyaDrawer';
import type { UserRole } from '@/lib/types';

interface BottomNavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  isPragya?: boolean;
}

const roleBottomNav: Record<UserRole, BottomNavItem[]> = {
  student: [
    { label: 'Dashboard', href: '/student/dashboard', icon: LayoutDashboard },
    { label: 'Academics', href: '/student/academics', icon: GraduationCap },
    { label: 'Events', href: '/student/events', icon: Calendar },
    { label: 'Campus Care', href: '/student/campus-care', icon: LifeBuoy },
    { label: 'Pragya AI', href: '#pragya', icon: Sparkles, isPragya: true },
  ],
  faculty: [
    { label: 'Dashboard', href: '/faculty/dashboard', icon: LayoutDashboard },
    { label: 'Courses', href: '/faculty/courses', icon: BookOpen },
    { label: 'Attendance', href: '/faculty/attendance', icon: ClipboardList },
    { label: 'Mentoring', href: '/faculty/mentees', icon: Users },
    { label: 'Pragya AI', href: '#pragya', icon: Sparkles, isPragya: true },
  ],
  parent: [
    { label: 'Dashboard', href: '/parent/dashboard', icon: LayoutDashboard },
    { label: 'Ward', href: '/parent/progress', icon: HeartHandshake },
    { label: 'Events', href: '/parent/events', icon: Calendar },
    { label: 'Notices', href: '/parent/notices', icon: Bell },
    { label: 'Pragya AI', href: '#pragya', icon: Sparkles, isPragya: true },
  ],
  admin: [
    { label: 'Overview', href: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Users', href: '/admin/users', icon: Users },
    { label: 'Campus Care', href: '/admin/complaints', icon: LifeBuoy },
    { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    { label: 'Pragya AI', href: '#pragya', icon: Sparkles, isPragya: true },
  ],
};

interface MobileBottomNavProps {
  role: UserRole;
}

export default function MobileBottomNav({ role }: MobileBottomNavProps) {
  const pathname = usePathname();
  const items = roleBottomNav[role] || roleBottomNav.student;

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-sfrc-surface/95 backdrop-blur-md border-t border-sfrc-200 px-2 py-1 shadow-lg"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          if (item.isPragya) {
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => openPragyaDrawer()}
                className="flex flex-col items-center justify-center py-1.5 px-2 rounded-xl text-[10px] font-semibold text-sfrc-accent hover:text-sfrc-700 transition-colors focus:outline-none"
              >
                <div className="w-8 h-8 rounded-full bg-linear-to-tr from-sfrc-800 to-sfrc-700 flex items-center justify-center text-sfrc-gold shadow-sm mb-0.5">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                </div>
                <span className="truncate max-w-[64px] font-bold text-sfrc-800">
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center py-1.5 px-2 rounded-xl text-[10px] font-medium transition-all duration-150',
                isActive
                  ? 'text-sfrc-700 font-bold'
                  : 'text-sfrc-600 hover:text-sfrc-900'
              )}
            >
              <div
                className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center mb-0.5 transition-colors',
                  isActive ? 'bg-sfrc-100 text-sfrc-700' : 'text-sfrc-500'
                )}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className="truncate max-w-[60px] text-center leading-tight">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
