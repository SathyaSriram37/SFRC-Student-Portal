'use client';

import React from 'react';
import Image from 'next/image';
import { WifiOff, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function OfflinePage() {
  const handleRetry = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-sfrc-bg dark:bg-background flex flex-col items-center justify-center p-4 text-center">
      <div className="max-w-md w-full bg-card p-8 rounded-3xl border border-border shadow-lg space-y-6 animate-in fade-in zoom-in-95 duration-300">
        <div className="flex justify-center">
          <div className="relative w-20 h-20 rounded-full overflow-hidden ring-4 ring-sfrc-accent/30 shadow-md">
            <Image
              src="/wel_img.jpg"
              alt="SFRC Crest"
              fill
              sizes="80px"
              className="object-contain"
              priority
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 text-xs font-bold uppercase tracking-wider">
            <WifiOff className="w-3.5 h-3.5" />
            Offline Mode
          </div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">
            You are currently offline
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            It looks like your internet connection was lost. Cached pages and emergency contacts are available, but live portal synchronization requires an active network.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={handleRetry}
            size="sm"
            className="bg-sfrc-700 hover:bg-sfrc-800 text-white font-bold text-xs gap-2 shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry Connection
          </Button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-foreground text-xs font-semibold shadow-xs transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            Cached Home
          </Link>
        </div>

        <div className="border-t border-border pt-4 text-[11px] text-muted-foreground">
          <p className="font-semibold text-sfrc-700 dark:text-sfrc-300">
            The Standard Fireworks Rajaratnam College for Women
          </p>
          <p className="text-[10px] mt-0.5">Autonomous Institution • Sivakasi</p>
        </div>
      </div>
    </div>
  );
}
