'use client';

import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import MobileBottomNav from './MobileBottomNav';
import PragyaDrawer from '@/components/ai/PragyaDrawer';
import type { UserRole } from '@/lib/types';

interface AppShellProps {
  role: UserRole;
  userName: string;
  children: React.ReactNode;
}

/**
 * AppShell — wraps authenticated dashboard pages.
 * Features:
 * - Desktop capability-filtered Sidebar (lg+)
 * - Mobile header with drawer navigation (<lg)
 * - Mobile bottom navigation bar (5 role-aware actions down to 375px)
 * - Interactive Pragya AI Drawer (accessible globally)
 */
export default function AppShell({ role, userName, children }: AppShellProps) {
  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden relative">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex shrink-0">
        <Sidebar role={role} userName={userName} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header bar */}
        <div className="lg:hidden flex items-center justify-between px-4 py-2.5 border-b border-sfrc-200 bg-sfrc-surface">
          <div className="flex items-center gap-2.5">
            <MobileNav role={role} userName={userName} />
            <span className="text-xs font-bold text-sfrc-900 uppercase tracking-wider">
              {role} Portal
            </span>
          </div>
          <span className="text-xs font-semibold text-sfrc-600 truncate max-w-[140px]">
            {userName}
          </span>
        </div>

        {/* Scrollable Page content with bottom padding for mobile nav */}
        <div className="flex-1 overflow-y-auto bg-sfrc-bg pb-20 lg:pb-8">
          {children}
        </div>

        {/* Mobile Bottom Navigation (role-aware 5 items) */}
        <MobileBottomNav role={role} />
      </div>

      {/* Pragya AI Slide-in Chat Drawer */}
      <PragyaDrawer />
    </div>
  );
}
