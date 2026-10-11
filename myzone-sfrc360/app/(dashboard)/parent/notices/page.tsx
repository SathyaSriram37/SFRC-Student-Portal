'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Bell, ArrowLeft } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import AskPragyaBanner from '@/components/shared/AskPragyaBanner';
import { createClient } from '@/lib/supabase/client';
import { apiGet } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface ParentNotice {
  id: string;
  title: string;
  content: string;
  priority: string;
  publish_from?: string;
}

export default function ParentNoticesPage() {
  const [notices, setNotices] = useState<ParentNotice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let ignore = false;
    (async () => {
      setIsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const data = await apiGet<ParentNotice[]>('/api/v1/parents/me/notices', token);
        if (!ignore) {
          setNotices(data || []);
        }
      } catch (err) {
        console.error('Failed to retrieve announcements:', err);
        if (!ignore) {
          setNotices([]);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      ignore = true;
    };
  }, [supabase]);

  return (
    <AppShell role="parent" userName="Parent">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <Link
            href="/parent/dashboard"
            className="w-10 h-10 rounded-2xl bg-white border border-sfrc-200 flex items-center justify-center text-sfrc-700 hover:bg-sfrc-50 transition-colors shadow-xs"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-sfrc-900 tracking-tight flex items-center gap-2">
              <Bell className="w-6 h-6 text-sfrc-700" />
              Parent Official Circulars & Notices
            </h1>
            <p className="text-xs text-sfrc-600">
              Institutional announcements and circulars designated for parents
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {notices.map((n) => (
            <div
              key={n.id}
              className="bg-white rounded-3xl border border-sfrc-200 p-6 shadow-xs hover:border-sfrc-300 transition-colors"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span
                  className={cn(
                    'text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md',
                    n.priority === 'high' || n.priority === 'urgent'
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-sfrc-100 text-sfrc-800'
                  )}
                >
                  {n.priority} Priority
                </span>
                {n.publish_from && (
                  <span className="text-xs text-sfrc-500 font-medium">
                    {new Date(n.publish_from).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                )}
              </div>
              <h2 className="text-base font-black text-sfrc-900">{n.title}</h2>
              <p className="text-xs text-sfrc-700 mt-2 leading-relaxed whitespace-pre-line">
                {n.content}
              </p>
            </div>
          ))}
        </div>

        <AskPragyaBanner />
      </div>
    </AppShell>
  );
}
