'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Info,
  Wrench,
  Calendar,
  Check,
  ChevronRight,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { apiGet, apiPost } from '@/lib/api-client';
import { GlobalSearchModal } from '@/components/search/GlobalSearchModal';

export interface HeaderNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  link?: string | null;
  read: boolean;
  created_at: string;
}

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const isLanding = pathname === '/';
  const isLogin = pathname === '/login';

  const [notifications, setNotifications] = useState<HeaderNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Global keyboard shortcut: Cmd+K / Ctrl+K opens search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const supabase = useMemo(() => createClient(), []);

  const getAuthToken = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return session?.access_token;
    } catch {
      return undefined;
    }
  }, [supabase]);

  const loadNotifications = useCallback(async () => {
    // Skip on unauthenticated landing & login pages
    if (isLanding || isLogin) return;

    try {
      const token = await getAuthToken();
      if (!token) return;

      const res = await apiGet<{
        notifications: HeaderNotification[];
        unread_count: number;
      }>('/api/v1/notifications?limit=8', token);

      if (res) {
        setNotifications(res.notifications || []);
        setUnreadCount(res.unread_count || 0);
      }
    } catch {
      // Graceful silence on network/auth errors
    }
  }, [getAuthToken, isLanding, isLogin]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!ignore) {
        await loadNotifications();
      }
    })();

    // Poll every 60s
    const timer = setInterval(() => {
      if (!ignore) {
        loadNotifications();
      }
    }, 60000);

    return () => {
      ignore = true;
      clearInterval(timer);
    };
  }, [loadNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [dropdownOpen]);

  // Mark single read and navigate
  const handleNotificationClick = async (notif: HeaderNotification) => {
    setDropdownOpen(false);
    if (!notif.read) {
      try {
        const token = await getAuthToken();
        await apiPost(`/api/v1/notifications/${notif.id}/read`, {}, token);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch (err) {
        console.error('Failed to mark read:', err);
      }
    }
    if (notif.link) {
      router.push(notif.link);
    }
  };

  // Mark all read
  const handleMarkAllRead = async () => {
    try {
      const token = await getAuthToken();
      await apiPost('/api/v1/notifications/read-all', {}, token);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  // Icon mapping by notification type
  const renderIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'success':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
      case 'complaint':
        return <Wrench className="w-3.5 h-3.5 text-purple-500 shrink-0" />;
      case 'event':
        return <Calendar className="w-3.5 h-3.5 text-rose-500 shrink-0" />;
      case 'info':
      default:
        return <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
    }
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full h-16',
        'bg-sfrc-surface dark:bg-card border-b-2 border-sfrc-accent shadow-xs',
        'flex items-center'
      )}
      role="banner"
    >
      <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* ── LEFT — College Crest + Name ──────────────────────────────────── */}
        <Link
          href="/"
          className="flex items-center gap-3 min-w-0 shrink-0 group"
          aria-label="MyZone SFRC 360 Home"
        >
          <div className="relative w-10 h-10 shrink-0 rounded-full overflow-hidden ring-2 ring-sfrc-accent/40 group-hover:ring-sfrc-accent transition-all duration-200 shadow-xs">
            <Image
              src="/wel_img.jpg"
              alt="SFRC Crest"
              fill
              sizes="40px"
              className="object-contain"
              priority
            />
          </div>
          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-[10px] font-semibold text-sfrc-600 dark:text-sfrc-400 uppercase tracking-widest truncate hidden xs:block">
              SFRC, Sivakasi
            </span>
            <span className="text-sm font-black text-sfrc-800 dark:text-foreground tracking-tight truncate">
              MyZone 360
            </span>
          </div>
        </Link>

        {/* ── CENTER — College Banner Image ────────────────────────────────── */}
        <div className="hidden sm:flex flex-1 justify-center items-center px-4">
          <div className="relative h-12 w-full max-w-xl">
            <Image
              src="/logo1.png"
              alt="The Standard Fireworks Rajaratnam College for Women, Sivakasi"
              fill
              sizes="(max-width: 768px) 0px, 576px"
              className="object-contain object-center"
              priority
            />
          </div>
        </div>

        {/* ── RIGHT — Global Search + Notification Bell + Nav slot / App badge ── */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Global 360 Search Button (Cmd+K / Ctrl+K) */}
          <button
            type="button"
            onClick={() => setSearchModalOpen(true)}
            className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-sfrc-100/70 hover:bg-sfrc-200/80 dark:bg-muted dark:hover:bg-muted/80 text-sfrc-800 dark:text-foreground text-xs font-medium transition-all duration-150 border border-sfrc-200/50 dark:border-border cursor-pointer"
            aria-label="Global 360 Search (Cmd+K)"
          >
            <Search className="w-3.5 h-3.5 text-sfrc-600 dark:text-sfrc-400 shrink-0" />
            <span className="hidden md:inline text-muted-foreground font-medium">Search 360...</span>
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground bg-white/80 dark:bg-card border border-border rounded shadow-2xs">
              ⌘K
            </kbd>
          </button>

          {/* Notification Bell Dropdown (Shown on all dashboard pages) */}
          {!isLanding && !isLogin && (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="relative p-2 rounded-xl bg-sfrc-100/70 hover:bg-sfrc-200 dark:bg-muted dark:hover:bg-muted/80 text-sfrc-800 dark:text-foreground transition-colors"
                aria-label={`Notifications (${unreadCount} unread)`}
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-600 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center border-2 border-white dark:border-card animate-pulse shadow-xs">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popover Dropdown */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  {/* Dropdown Header */}
                  <div className="p-3.5 bg-muted/40 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-foreground">Notifications</h3>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 text-[10px] font-bold">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="text-[11px] font-semibold text-sfrc-700 dark:text-sfrc-300 hover:underline flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        Mark all read
                      </button>
                    )}
                  </div>

                  {/* Notification List */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-border/60">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-muted-foreground">
                        No recent notifications.
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <button
                          key={notif.id}
                          type="button"
                          onClick={() => handleNotificationClick(notif)}
                          className={cn(
                            'w-full p-3 text-left transition-colors flex items-start gap-2.5 group',
                            notif.read
                              ? 'bg-card hover:bg-muted/30 text-muted-foreground'
                              : 'bg-sfrc-50/50 dark:bg-muted/50 hover:bg-muted/70 text-foreground font-medium'
                          )}
                        >
                          <div className="mt-0.5">{renderIcon(notif.type)}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold truncate group-hover:text-sfrc-700 dark:group-hover:text-sfrc-300 transition-colors">
                              {notif.title}
                            </p>
                            <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-snug">
                              {notif.message}
                            </p>
                            <span className="text-[9px] text-muted-foreground mt-1 block">
                              {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          {!notif.read && (
                            <span className="w-2 h-2 rounded-full bg-sfrc-accent shrink-0 mt-1" />
                          )}
                        </button>
                      ))
                    )}
                  </div>

                  {/* Dropdown Footer */}
                  <div className="p-2.5 bg-muted/40 border-t border-border text-center">
                    <Link
                      href="/notifications"
                      onClick={() => setDropdownOpen(false)}
                      className="text-xs font-bold text-sfrc-700 dark:text-sfrc-300 hover:underline inline-flex items-center gap-1 justify-center w-full"
                    >
                      <span>View all notifications</span>
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {isLanding ? (
            <Link
              href="/login?role=student"
              className={cn(
                'hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold',
                'bg-sfrc-700 text-white hover:bg-sfrc-800 active:scale-95',
                'transition-all duration-150 shadow-xs'
              )}
            >
              Sign In
            </Link>
          ) : null}

          <div
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
              'bg-sfrc-100 dark:bg-muted border border-sfrc-200 dark:border-border'
            )}
          >
            <div className="w-2 h-2 rounded-full bg-sfrc-accent animate-pulse" />
            <span className="text-xs font-bold text-sfrc-700 dark:text-sfrc-300 tracking-tight whitespace-nowrap">
              MyZone SFRC 360
            </span>
          </div>
        </div>
      </div>

      {/* Global 360 Search Dialog */}
      <GlobalSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
      />
    </header>
  );
}
