'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Info,
  Wrench,
  Calendar,
  Check,
  Trash2,
  Filter,
  Settings,
  Clock,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';
import { apiGet, apiPost, apiDelete, apiPut } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/lib/types';

interface NotificationRecord {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  entity_type?: string | null;
  entity_id?: string | null;
  link?: string | null;
  read: boolean;
  created_at: string;
}

interface NotificationPreferences {
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  academic_alerts: boolean;
  complaint_updates: boolean;
  event_announcements: boolean;
  library_reminders: boolean;
  fee_alerts: boolean;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [userRole, setUserRole] = useState<UserRole>('student');
  const [userName, setUserName] = useState<string>('Student');

  // Preferences Modal
  const [prefModalOpen, setPrefModalOpen] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    email_enabled: true,
    sms_enabled: false,
    push_enabled: true,
    academic_alerts: true,
    complaint_updates: true,
    event_announcements: true,
    library_reminders: true,
    fee_alerts: true,
  });
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  const getAuthToken = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user?.user_metadata?.role) {
        setUserRole(session.user.user_metadata.role as UserRole);
      }
      if (session?.user?.user_metadata?.full_name) {
        setUserName(session.user.user_metadata.full_name);
      }
      return session?.access_token;
    } catch {
      return undefined;
    }
  }, [supabase]);

  const loadNotifications = useCallback(async () => {
    try {
      const token = await getAuthToken();
      const [notifsRes, prefsRes] = await Promise.allSettled([
        apiGet<{ notifications: NotificationRecord[]; unread_count: number }>(
          '/api/v1/notifications?limit=100',
          token
        ),
        apiGet<NotificationPreferences>('/api/v1/notifications/preferences', token),
      ]);

      if (notifsRes.status === 'fulfilled' && notifsRes.value) {
        setNotifications(notifsRes.value.notifications || []);
        setUnreadCount(notifsRes.value.unread_count || 0);
      }
      if (prefsRes.status === 'fulfilled' && prefsRes.value) {
        setPrefs(prefsRes.value);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [getAuthToken]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      await loadNotifications();
    })();
    return () => {
      ignore = true;
    };
  }, [loadNotifications]);

  // Bulk actions
  const handleToggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleMarkSelectedRead = async () => {
    if (selectedIds.length === 0) return;
    try {
      const token = await getAuthToken();
      await Promise.all(
        selectedIds.map((id) => apiPost(`/api/v1/notifications/${id}/read`, {}, token))
      );
      setNotifications((prev) =>
        prev.map((n) => (selectedIds.includes(n.id) ? { ...n, read: true } : n))
      );
      setSelectedIds([]);
      await loadNotifications();
    } catch (err) {
      console.error('Failed to mark selected read:', err);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    try {
      const token = await getAuthToken();
      await Promise.all(
        selectedIds.map((id) => apiDelete(`/api/v1/notifications/${id}`, token))
      );
      setNotifications((prev) => prev.filter((n) => !selectedIds.includes(n.id)));
      setSelectedIds([]);
      await loadNotifications();
    } catch (err) {
      console.error('Failed to delete selected:', err);
    }
  };

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

  const handleSavePreferences = async () => {
    setIsSavingPrefs(true);
    try {
      const token = await getAuthToken();
      await apiPut('/api/v1/notifications/preferences', prefs, token);
      setPrefModalOpen(false);
    } catch (err) {
      console.error('Failed to update preferences:', err);
      alert('Could not update notification preferences.');
    } finally {
      setIsSavingPrefs(false);
    }
  };

  // Filtered notifications calculation
  const filteredNotifications = notifications.filter((n) => {
    const matchesTab =
      activeTab === 'all' ||
      (activeTab === 'unread' && !n.read) ||
      (activeTab === 'read' && n.read);
    const matchesType = typeFilter === 'all' || n.type.toLowerCase() === typeFilter.toLowerCase();
    return matchesTab && matchesType;
  });

  // Group notifications by date: Today | Yesterday | This Week | Earlier
  const groupedNotifications: { [key: string]: NotificationRecord[] } = {
    Today: [],
    Yesterday: [],
    'This Week': [],
    Earlier: [],
  };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const oneWeekAgo = new Date(today);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  filteredNotifications.forEach((n) => {
    const d = new Date(n.created_at);
    if (d >= today) {
      groupedNotifications['Today'].push(n);
    } else if (d >= yesterday) {
      groupedNotifications['Yesterday'].push(n);
    } else if (d >= oneWeekAgo) {
      groupedNotifications['This Week'].push(n);
    } else {
      groupedNotifications['Earlier'].push(n);
    }
  });

  const renderIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
      case 'complaint':
        return <Wrench className="w-4 h-4 text-purple-500 shrink-0" />;
      case 'event':
        return <Calendar className="w-4 h-4 text-rose-500 shrink-0" />;
      case 'info':
      default:
        return <Info className="w-4 h-4 text-blue-500 shrink-0" />;
    }
  };

  return (
    <AppShell role={userRole} userName={userName}>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
        {/* Header Profile Greeting & Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-3xl border border-border shadow-xs">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sfrc-100 text-sfrc-700 dark:bg-sfrc-950 dark:text-sfrc-300 text-xs font-bold uppercase tracking-wider mb-2">
              <Bell className="w-3.5 h-3.5 text-sfrc-accent animate-pulse" />
              Alerts & Comms Center
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              My Notifications
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Real-time administrative broadcasts, academic alerts, and workflow updates.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <Button
                onClick={handleMarkAllRead}
                variant="outline"
                size="sm"
                className="gap-2 text-xs font-bold"
              >
                <Check className="w-3.5 h-3.5" />
                Mark All Read
              </Button>
            )}
            <Button
              onClick={() => setPrefModalOpen(true)}
              variant="outline"
              size="sm"
              className="gap-2 text-xs font-bold"
            >
              <Settings className="w-3.5 h-3.5" />
              Preferences
            </Button>
          </div>
        </div>

        {/* Filters and Action Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Tabs: All | Unread | Read */}
          <div className="flex items-center p-1 bg-muted/60 rounded-2xl border border-border">
            <button
              onClick={() => setActiveTab('all')}
              className={cn(
                'px-4 py-1.5 rounded-xl text-xs font-bold transition-all',
                activeTab === 'all'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setActiveTab('unread')}
              className={cn(
                'px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5',
                activeTab === 'unread'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Unread
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 text-[10px]">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('read')}
              className={cn(
                'px-4 py-1.5 rounded-xl text-xs font-bold transition-all',
                activeTab === 'read'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Read ({notifications.length - unreadCount})
            </button>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              aria-label="Filter notifications by category"
              className="bg-card text-foreground text-xs px-3 py-1.5 rounded-xl border border-border focus:outline-none focus:ring-1 focus:ring-sfrc-accent font-semibold"
            >
              <option value="all">All Categories</option>
              <option value="info">Information</option>
              <option value="success">Success / Approvals</option>
              <option value="warning">Warnings / Critical</option>
              <option value="complaint">Campus Care</option>
              <option value="event">Events</option>
            </select>
          </div>
        </div>

        {/* Bulk Action Bar (When items are selected) */}
        {selectedIds.length > 0 && (
          <div className="p-3 bg-sfrc-100/70 dark:bg-muted/80 border border-sfrc-200 dark:border-border rounded-2xl flex items-center justify-between animate-in fade-in duration-200">
            <span className="text-xs font-bold text-foreground">
              {selectedIds.length} {selectedIds.length === 1 ? 'item' : 'items'} selected
            </span>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleMarkSelectedRead}
                size="sm"
                variant="outline"
                className="text-xs font-semibold h-8 gap-1.5"
              >
                <Check className="w-3 h-3" />
                Mark Read
              </Button>
              <Button
                onClick={handleDeleteSelected}
                size="sm"
                variant="destructive"
                className="text-xs font-semibold h-8 gap-1.5"
              >
                <Trash2 className="w-3 h-3" />
                Delete Selected
              </Button>
            </div>
          </div>
        )}

        {/* Notifications List Grouped By Date */}
        {isLoading ? (
          <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-sfrc-700 dark:text-sfrc-300" />
            <p className="text-xs font-semibold text-muted-foreground">
              Retrieving communication stream…
            </p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <Card className="p-12 text-center border-border shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-muted mx-auto flex items-center justify-center text-muted-foreground mb-3">
              <Bell className="w-6 h-6 opacity-60" />
            </div>
            <p className="text-sm font-bold text-foreground">No notifications found</p>
            <p className="text-xs text-muted-foreground mt-1">
              You are all caught up with your college alerts and announcements.
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedNotifications).map(([groupTitle, items]) => {
              if (items.length === 0) return null;
              return (
                <div key={groupTitle} className="space-y-2.5">
                  <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 px-1">
                    <Clock className="w-3 h-3" />
                    {groupTitle} ({items.length})
                  </h2>

                  <div className="space-y-2">
                    {items.map((notif) => (
                      <Card
                        key={notif.id}
                        className={cn(
                          'p-4 transition-all duration-150 flex items-start gap-3.5 border-border shadow-xs hover:border-sfrc-accent/50',
                          notif.read ? 'bg-card opacity-90' : 'bg-sfrc-50/40 dark:bg-muted/40 border-l-4 border-l-sfrc-700'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(notif.id)}
                          onChange={() => handleToggleSelectOne(notif.id)}
                          className="mt-1 rounded border-border text-sfrc-700 focus:ring-sfrc-accent"
                        />

                        <div className="mt-0.5">{renderIcon(notif.type)}</div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <h3 className="text-sm font-bold text-foreground truncate">
                              {notif.title}
                            </h3>
                            <span className="text-[11px] text-muted-foreground shrink-0">
                              {new Date(notif.created_at).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>

                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            {notif.message}
                          </p>

                          {notif.link && (
                            <a
                              href={notif.link}
                              className="inline-flex items-center gap-1 text-xs font-bold text-sfrc-700 dark:text-sfrc-300 hover:underline mt-2.5"
                            >
                              <span>View Associated Resource</span>
                              <ChevronRight className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Preferences Dialog Modal */}
        <Dialog open={prefModalOpen} onOpenChange={setPrefModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Settings className="w-4 h-4 text-sfrc-700 dark:text-sfrc-300" />
                Notification Channel Preferences
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Customize where and when you receive portal communications.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-2 text-xs">
              <div className="space-y-2.5 p-3 rounded-2xl bg-muted/40 border border-border">
                <h4 className="font-bold text-foreground">Delivery Channels</h4>
                <div className="flex items-center justify-between">
                  <span>In-App Web Push (PWA)</span>
                  <input
                    type="checkbox"
                    checked={prefs.push_enabled}
                    onChange={(e) => setPrefs({ ...prefs, push_enabled: e.target.checked })}
                    className="rounded text-sfrc-700 focus:ring-sfrc-accent"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span>Institutional Email Alerts</span>
                  <input
                    type="checkbox"
                    checked={prefs.email_enabled}
                    onChange={(e) => setPrefs({ ...prefs, email_enabled: e.target.checked })}
                    className="rounded text-sfrc-700 focus:ring-sfrc-accent"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span>SMS Emergency Broadcasts</span>
                  <input
                    type="checkbox"
                    checked={prefs.sms_enabled}
                    onChange={(e) => setPrefs({ ...prefs, sms_enabled: e.target.checked })}
                    className="rounded text-sfrc-700 focus:ring-sfrc-accent"
                  />
                </div>
              </div>

              <div className="space-y-2.5 p-3 rounded-2xl bg-muted/40 border border-border">
                <h4 className="font-bold text-foreground">Topic Subscriptions</h4>
                <div className="flex items-center justify-between">
                  <span>Academic & Attendance Warnings</span>
                  <input
                    type="checkbox"
                    checked={prefs.academic_alerts}
                    onChange={(e) => setPrefs({ ...prefs, academic_alerts: e.target.checked })}
                    className="rounded text-sfrc-700 focus:ring-sfrc-accent"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span>Campus Care & Ticket Status</span>
                  <input
                    type="checkbox"
                    checked={prefs.complaint_updates}
                    onChange={(e) => setPrefs({ ...prefs, complaint_updates: e.target.checked })}
                    className="rounded text-sfrc-700 focus:ring-sfrc-accent"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span>Campus Events & Hackathons</span>
                  <input
                    type="checkbox"
                    checked={prefs.event_announcements}
                    onChange={(e) => setPrefs({ ...prefs, event_announcements: e.target.checked })}
                    className="rounded text-sfrc-700 focus:ring-sfrc-accent"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span>IRC Library Due Reminders</span>
                  <input
                    type="checkbox"
                    checked={prefs.library_reminders}
                    onChange={(e) => setPrefs({ ...prefs, library_reminders: e.target.checked })}
                    className="rounded text-sfrc-700 focus:ring-sfrc-accent"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={isSavingPrefs}
                onClick={() => setPrefModalOpen(false)}
                className="text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={isSavingPrefs}
                onClick={handleSavePreferences}
                className="bg-sfrc-700 hover:bg-sfrc-800 text-white font-semibold text-xs"
              >
                {isSavingPrefs ? 'Saving...' : 'Save Preferences'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
