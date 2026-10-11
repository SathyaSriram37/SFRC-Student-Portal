'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Bell,
  Plus,
  Send,
  Trash2,
  Filter,
  Users,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Info,
  Calendar,
  Sparkles,
  Loader2,
  RefreshCw,
  Eye,
  Search,
} from 'lucide-react';
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
import { apiGet, apiPost, apiDelete } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/lib/types';

interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  audience: string[];
  priority: string;
  type: string;
  department_id?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

const TEMPLATES = [
  {
    title: '🎓 End Semester Examinations (ESE) Timetable Released',
    type: 'exam',
    priority: 'high',
    audience: ['student', 'faculty', 'parent'],
    content: 'The End Semester Examinations (ESE) schedule for Odd Semester 2026 has been published. Students are advised to verify their subject codes and session timings in the Examinations portal.',
  },
  {
    title: '💰 Semester Fee Payment Due Date Reminder',
    type: 'warning',
    priority: 'high',
    audience: ['student', 'parent'],
    content: 'Students and parents are kindly reminded that the last date to clear semester tuition fees without penalty is approaching. Please use the Fee Payments portal for online receipts.',
  },
  {
    title: '🚀 Mega Campus Placement Drive 2026',
    type: 'event',
    priority: 'normal',
    audience: ['student'],
    content: 'Upcoming on-campus drive with Tier-1 recruiting partners. Final year UG and PG students meeting eligibility criteria are requested to register via the Placements module.',
  },
  {
    title: '🏛 National Level Symposium & Cultural Fest',
    type: 'info',
    priority: 'normal',
    audience: ['student', 'faculty'],
    content: 'SFRC proudly announces the Annual State Level Inter-Collegiate Symposium. Registrations are open for technical tracks and cultural events.',
  },
];

export default function AdminNotificationsPage() {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'announcements' | 'create'>('announcements');
  const [filterAudience, setFilterAudience] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal / Form state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewItem, setViewItem] = useState<AnnouncementItem | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'info',
    priority: 'normal',
    audience: ['student', 'faculty', 'parent', 'admin'],
  });

  const supabase = useMemo(() => createClient(), []);

  const getAuthToken = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token;
    } catch {
      return undefined;
    }
  }, [supabase]);

  const loadAnnouncements = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await getAuthToken();
      const res = await apiGet<{ announcements: AnnouncementItem[]; total: number }>(
        '/api/v1/announcements/',
        token
      );
      if (res?.announcements) {
        setAnnouncements(res.announcements);
      } else {
        setAnnouncements([]);
      }
    } catch (err) {
      console.error('Failed to load announcements:', err);
      setAnnouncements([]);
    } finally {
      setIsLoading(false);
    }
  }, [getAuthToken]);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  const handleAudienceToggle = (role: string) => {
    setFormData((prev) => {
      const exists = prev.audience.includes(role);
      const newAud = exists
        ? prev.audience.filter((r) => r !== role)
        : [...prev.audience, role];
      return { ...prev, audience: newAud.length ? newAud : ['student'] };
    });
  };

  const handleApplyTemplate = (tpl: typeof TEMPLATES[0]) => {
    setFormData({
      title: tpl.title,
      content: tpl.content,
      type: tpl.type,
      priority: tpl.priority,
      audience: tpl.audience,
    });
    setCreateModalOpen(true);
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) return;

    setIsSubmitting(true);
    try {
      const token = await getAuthToken();
      const res = await apiPost<AnnouncementItem>(
        '/api/v1/announcements/',
        formData,
        token
      );
      if (res) {
        setAnnouncements((prev) => [res, ...prev]);
        setCreateModalOpen(false);
        setFormData({
          title: '',
          content: '',
          type: 'info',
          priority: 'normal',
          audience: ['student', 'faculty', 'parent', 'admin'],
        });
      }
    } catch (err) {
      console.error('Failed to create announcement:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    try {
      const token = await getAuthToken();
      await apiDelete(`/api/v1/announcements/${id}`, token);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      if (viewItem?.id === id) setViewItem(null);
    } catch (err) {
      console.error('Failed to delete announcement:', err);
    }
  };

  const filteredAnnouncements = announcements.filter((item) => {
    const matchesAud =
      filterAudience === 'all' || item.audience.includes(filterAudience);
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesAud && matchesSearch;
  });

  const renderTypeIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'exam':
        return <CheckCircle2 className="w-4 h-4 text-purple-600" />;
      case 'event':
        return <Calendar className="w-4 h-4 text-emerald-600" />;
      case 'info':
      default:
        return <Info className="w-4 h-4 text-sfrc-700" />;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header Banner */}
        <div className="bg-white dark:bg-card p-6 sm:p-8 rounded-3xl border border-sfrc-200 dark:border-border shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sfrc-950 text-white text-xs font-bold uppercase tracking-wider mb-2">
              <Shield className="w-3.5 h-3.5 text-sfrc-gold" />
              Institutional Communication & Dispatch
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-sfrc-900 dark:text-white tracking-tight">
              Announcements & Circulars
            </h1>
            <p className="text-xs sm:text-sm text-sfrc-600 dark:text-muted-foreground mt-1 max-w-2xl">
              Broadcast official institution notices, examination schedules, fee alerts, and emergency circulars with instant push alerts to students, faculty, and parents.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={loadAnnouncements}
              variant="outline"
              size="sm"
              className="rounded-xl gap-1.5 border-sfrc-200 hover:bg-sfrc-50 text-xs font-semibold"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
              Refresh
            </Button>

            <Button
              onClick={() => setCreateModalOpen(true)}
              className="rounded-xl gap-2 bg-sfrc-700 hover:bg-sfrc-800 text-white font-bold text-xs shadow-md"
            >
              <Plus className="w-4 h-4" />
              + New Announcement
            </Button>
          </div>
        </div>

        {/* Quick Circular Templates */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sfrc-accent" />
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-sfrc-700 dark:text-sfrc-300">
              Quick Circular Templates
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {TEMPLATES.map((tpl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyTemplate(tpl)}
                className="p-4 rounded-2xl bg-white dark:bg-card border border-sfrc-200 dark:border-border hover:border-sfrc-accent text-left transition-all hover:shadow-md group flex flex-col justify-between"
              >
                <div>
                  <h3 className="text-xs font-bold text-sfrc-900 dark:text-white group-hover:text-sfrc-700 line-clamp-2">
                    {tpl.title}
                  </h3>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">
                    {tpl.content}
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between text-[10px] font-bold text-sfrc-700 dark:text-sfrc-300">
                  <span className="capitalize">{tpl.type}</span>
                  <span className="group-hover:translate-x-1 transition-transform">Use Template →</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white dark:bg-card p-4 rounded-2xl border border-sfrc-200 dark:border-border flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-xs font-bold text-sfrc-800 dark:text-foreground">Audience:</span>
            <div className="flex flex-wrap gap-1">
              {['all', 'student', 'faculty', 'parent', 'admin'].map((aud) => (
                <button
                  key={aud}
                  type="button"
                  onClick={() => setFilterAudience(aud)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-bold capitalize transition-colors',
                    filterAudience === aud
                      ? 'bg-sfrc-700 text-white shadow-2xs'
                      : 'bg-sfrc-100 dark:bg-muted text-sfrc-700 dark:text-muted-foreground hover:bg-sfrc-200'
                  )}
                >
                  {aud}
                </button>
              ))}
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search circulars..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-sfrc-200 dark:border-border text-xs bg-sfrc-surface dark:bg-card outline-none focus:ring-2 focus:ring-sfrc-accent"
            />
          </div>
        </div>

        {/* Announcements List */}
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 bg-white dark:bg-card rounded-3xl border border-sfrc-200 dark:border-border">
            <Loader2 className="w-8 h-8 animate-spin text-sfrc-700" />
            <p className="text-xs font-semibold text-muted-foreground">
              Loading institutional announcements from database…
            </p>
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-card rounded-3xl border border-sfrc-200 dark:border-border space-y-3">
            <Bell className="w-10 h-10 mx-auto text-muted-foreground/50" />
            <h3 className="text-sm font-bold text-foreground">No circulars match your filter</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Create a new announcement or change the audience filter to view active notices.
            </p>
            <Button
              onClick={() => setCreateModalOpen(true)}
              size="sm"
              className="rounded-xl bg-sfrc-700 text-white text-xs font-bold"
            >
              + Create Announcement
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAnnouncements.map((item) => (
              <Card
                key={item.id}
                className="p-5 rounded-2xl border-sfrc-200 dark:border-border hover:shadow-md transition-all flex flex-col justify-between bg-white dark:bg-card"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-sfrc-50 dark:bg-muted border border-sfrc-200 dark:border-border">
                        {renderTypeIcon(item.type)}
                      </div>
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider',
                          item.priority === 'urgent'
                            ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                            : item.priority === 'high'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                        )}
                      >
                        {item.priority}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteAnnouncement(item.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                      title="Delete Announcement"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h3 className="text-sm font-bold text-sfrc-900 dark:text-white line-clamp-2 mb-1.5">
                    {item.title}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                    {item.content}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-sfrc-100 dark:border-border/60">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-2">
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-sfrc-accent" />
                      <span className="font-semibold text-foreground">
                        {item.audience.join(', ')}
                      </span>
                    </div>
                    <span>
                      {new Date(item.created_at).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>

                  <Button
                    onClick={() => setViewItem(item)}
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs font-bold text-sfrc-700 dark:text-sfrc-300 hover:bg-sfrc-100 dark:hover:bg-muted rounded-xl gap-1.5 h-8"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View Full Circular
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* View Circular Details Modal */}
        <Dialog open={!!viewItem} onOpenChange={(open) => !open && setViewItem(null)}>
          <DialogContent className="max-w-xl rounded-3xl p-6">
            {viewItem && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-sfrc-100 dark:bg-muted text-sfrc-800 dark:text-sfrc-300 text-[10px] font-extrabold uppercase">
                      {viewItem.type}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-extrabold uppercase">
                      Priority: {viewItem.priority}
                    </span>
                  </div>
                  <DialogTitle className="text-lg font-black text-sfrc-900 dark:text-white">
                    {viewItem.title}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Dispatched on {new Date(viewItem.created_at).toLocaleString()} by {viewItem.created_by || 'Admin'}
                  </DialogDescription>
                </DialogHeader>

                <div className="my-4 p-4 rounded-2xl bg-sfrc-50 dark:bg-muted/50 border border-sfrc-200 dark:border-border text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {viewItem.content}
                </div>

                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <strong className="text-foreground">Audience:</strong>
                    <span className="capitalize">{viewItem.audience.join(', ')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <strong className="text-foreground">Circular ID:</strong>
                    <code className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded">{viewItem.id}</code>
                  </div>
                </div>

                <DialogFooter className="mt-4 flex gap-2">
                  <Button
                    onClick={() => handleDeleteAnnouncement(viewItem.id)}
                    variant="outline"
                    className="text-red-600 hover:bg-red-50 rounded-xl text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Delete
                  </Button>
                  <Button
                    onClick={() => setViewItem(null)}
                    className="bg-sfrc-700 hover:bg-sfrc-800 text-white rounded-xl text-xs font-bold"
                  >
                    Close
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Create / Broadcast Announcement Modal */}
        <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
          <DialogContent className="max-w-2xl rounded-3xl p-6 sm:p-8">
            <DialogHeader>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sfrc-100 dark:bg-muted text-sfrc-800 dark:text-sfrc-300 text-xs font-bold w-fit mb-2">
                <Send className="w-3 h-3 text-sfrc-accent" />
                Broadcast Institutional Notice
              </div>
              <DialogTitle className="text-xl font-black text-sfrc-900 dark:text-white">
                Create & Dispatch Announcement
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                This notice will be published to the portal and dispatched directly to the notification bells of all selected roles.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateAnnouncement} className="space-y-4 mt-2">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Circular Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Odd Semester 2026 Examination Schedule Released"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-sfrc-200 dark:border-border text-xs sm:text-sm bg-sfrc-surface dark:bg-card outline-none focus:ring-2 focus:ring-sfrc-accent"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Category / Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-sfrc-200 dark:border-border text-xs bg-sfrc-surface dark:bg-card outline-none focus:ring-2 focus:ring-sfrc-accent"
                  >
                    <option value="info">General Circular (Info)</option>
                    <option value="exam">Examinations & Marks</option>
                    <option value="event">Campus Event / Symposium</option>
                    <option value="warning">Fee & Due Date Alert</option>
                    <option value="complaint">Campus Care / Maintenance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Priority Level
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-sfrc-200 dark:border-border text-xs bg-sfrc-surface dark:bg-card outline-none focus:ring-2 focus:ring-sfrc-accent"
                  >
                    <option value="normal">Normal Priority</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent Alert</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  Target Audience (Select all applicable) *
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'student', label: '🎓 Students' },
                    { id: 'faculty', label: '👩🏻‍🏫 Faculty' },
                    { id: 'parent', label: '👨‍👩‍👧 Parents' },
                    { id: 'admin', label: '🛡 Admin Officers' },
                  ].map((aud) => {
                    const isSelected = formData.audience.includes(aud.id);
                    return (
                      <button
                        key={aud.id}
                        type="button"
                        onClick={() => handleAudienceToggle(aud.id)}
                        className={cn(
                          'px-3.5 py-2 rounded-xl text-xs font-bold border transition-all',
                          isSelected
                            ? 'bg-sfrc-700 text-white border-sfrc-700 shadow-xs'
                            : 'bg-sfrc-50 dark:bg-muted text-muted-foreground border-sfrc-200 dark:border-border hover:bg-sfrc-100'
                        )}
                      >
                        {aud.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Circular Message Content *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Type the full announcement details, guidelines, or instructions here…"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-sfrc-200 dark:border-border text-xs sm:text-sm bg-sfrc-surface dark:bg-card outline-none focus:ring-2 focus:ring-sfrc-accent resize-none"
                />
              </div>

              <DialogFooter className="mt-6 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateModalOpen(false)}
                  className="rounded-xl text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !formData.title.trim() || !formData.content.trim()}
                  className="rounded-xl bg-sfrc-700 hover:bg-sfrc-800 text-white text-xs font-bold shadow-md gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Broadcasting…
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Dispatch Announcement
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
  );
}
