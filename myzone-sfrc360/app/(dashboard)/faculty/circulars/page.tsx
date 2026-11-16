'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  ArrowLeft,
  Plus,
  Send,
  Calendar,
  FileText,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api-client';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  audience: string[];
  priority: string;
  created_at: string;
}

interface AnnouncementListResponse {
  announcements: AnnouncementItem[];
  total: number;
}

export default function CircularsGovernancePage() {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [audience, setAudience] = useState('all');
  const [priority, setPriority] = useState('normal');

  async function loadAnnouncements() {
    try {
      setLoading(true);
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await apiGet<AnnouncementListResponse>('/api/v1/announcements', token);
      if (res && res.announcements) {
        setAnnouncements(res.announcements);
      }
    } catch (err) {
      console.error('Failed to load announcements:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const handleCreateCircular = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error('Title and circular message are required');
      return;
    }
    try {
      setSubmitting(true);
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      const audienceList =
        audience === 'all'
          ? ['student', 'faculty', 'parent', 'admin']
          : [audience];

      await apiPost(
        '/api/v1/announcements',
        {
          title: title.trim(),
          content: content.trim(),
          audience: audienceList,
          priority,
          type: 'info',
        },
        token
      );
      toast.success('Official institutional circular published successfully!');
      setTitle('');
      setContent('');
      setShowModal(false);
      loadAnnouncements();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to publish circular';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/faculty/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-sfrc-600 hover:text-sfrc-900 transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-sfrc-900 tracking-tight flex items-center gap-2.5">
            <Bell className="w-7 h-7 text-sfrc-700" />
            Official Institutional Circulars
          </h1>
          <p className="text-xs sm:text-sm text-sfrc-600 mt-1">
            Publish and broadcast official administrative circulars, statutory orders, and academic notices.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sfrc-900 hover:bg-sfrc-800 text-white text-xs font-bold shadow-md transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Issue New Circular
        </button>
      </div>

      {/* Circulars Feed */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-2xl p-12 border border-sfrc-200 flex flex-col items-center justify-center gap-3 text-sfrc-500 text-xs">
            <Loader2 className="w-6 h-6 animate-spin text-sfrc-700" />
            Loading circulars repository...
          </div>
        ) : announcements.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 border border-sfrc-200 text-center space-y-3">
            <FileText className="w-10 h-10 text-sfrc-400 mx-auto" />
            <h3 className="text-sm font-bold text-sfrc-900">No Circulars Published Yet</h3>
            <p className="text-xs text-sfrc-500">
              Click &apos;Issue New Circular&apos; to broadcast your first institutional notice to faculty and students.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((circ) => (
              <div
                key={circ.id}
                className="bg-white rounded-2xl p-5 border border-sfrc-200 shadow-2xs space-y-3 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-sfrc-100 text-sfrc-800">
                        Audience: {Array.isArray(circ.audience) ? circ.audience.join(', ').toUpperCase() : circ.audience}
                      </span>
                      {circ.priority === 'high' && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                          High Priority
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-black text-sfrc-900">{circ.title}</h3>
                  </div>
                  <span className="text-[11px] text-sfrc-500 font-semibold flex items-center gap-1 shrink-0">
                    <Calendar className="w-3.5 h-3.5 text-sfrc-400" />
                    {circ.created_at ? new Date(circ.created_at).toLocaleDateString() : 'Today'}
                  </span>
                </div>
                <p className="text-xs text-sfrc-700 leading-relaxed whitespace-pre-wrap">{circ.content}</p>
                <div className="pt-2 border-t border-sfrc-100 flex items-center justify-between text-[11px] text-sfrc-500">
                  <span>Signatory: Office of the Principal</span>
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Broadcast Active
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Issue Circular */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-sfrc-200 animate-fadeIn">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-black text-sfrc-900">Issue Institutional Circular</h3>
                <p className="text-xs text-sfrc-600 mt-0.5">Publish an official order across college portals</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-sfrc-400 hover:text-sfrc-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCircular} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-sfrc-800 mb-1">Circular Title / Subject</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Schedule of Continuous Internal Assessment (CIA-I) 2026"
                  className="w-full px-3.5 py-2 rounded-xl border border-sfrc-200 text-xs text-sfrc-900 focus:outline-none focus:ring-2 focus:ring-sfrc-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-sfrc-800 mb-1">Target Audience</label>
                  <select
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-sfrc-200 text-xs text-sfrc-900 focus:outline-none focus:ring-2 focus:ring-sfrc-600"
                  >
                    <option value="all">Entire Institution (All Roles)</option>
                    <option value="faculty">Faculty & Staff Only</option>
                    <option value="student">Students Only</option>
                    <option value="parent">Parents Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-sfrc-800 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-sfrc-200 text-xs text-sfrc-900 focus:outline-none focus:ring-2 focus:ring-sfrc-600"
                  >
                    <option value="normal">Standard Notice</option>
                    <option value="high">Urgent / High Priority</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-sfrc-800 mb-1">Circular Order Text</label>
                <textarea
                  required
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Type the full official order text, instructions, and dates here..."
                  className="w-full px-3.5 py-2 rounded-xl border border-sfrc-200 text-xs text-sfrc-900 focus:outline-none focus:ring-2 focus:ring-sfrc-600"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-sfrc-700 hover:bg-sfrc-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-sfrc-900 text-white hover:bg-sfrc-800 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Publish Circular
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
