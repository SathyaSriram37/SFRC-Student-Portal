'use client';

import { useState } from 'react';
import { Sparkles, ArrowRight, MessageSquareCode } from 'lucide-react';
import { openPragyaDrawer } from '@/components/ai/PragyaDrawer';

const SUGGESTIONS = [
  'What is my attendance %?',
  'When is CIA 2 exam?',
  'Bus timing to Madurai',
  'Fee dues status',
];

export default function AskPragyaBanner() {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      openPragyaDrawer(query.trim());
      setQuery('');
    } else {
      openPragyaDrawer();
    }
  };

  const handleChipClick = (chip: string) => {
    openPragyaDrawer(chip);
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-sfrc-900 via-sfrc-800 to-sfrc-700 text-white p-6 sm:p-8 shadow-xl shadow-sfrc-950/10 border border-sfrc-gold/30">
      {/* Decorative Glow */}
      <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-sfrc-gold/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 -mb-12 w-48 h-48 bg-sfrc-600/30 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sfrc-gold/20 border border-sfrc-gold/30 text-sfrc-gold text-xs font-semibold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 animate-spin" />
            Pragya AI 360 Campus Intelligence
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-2">
            Have questions about courses, attendance, or college policies?
          </h2>
          <p className="text-sfrc-100 text-xs sm:text-sm leading-relaxed mb-4">
            Ask Pragya for instant, accurate answers extracted directly from SFRC academic handbooks, regulations, and schedules.
          </p>

          {/* Quick Chips */}
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleChipClick(chip)}
                className="text-xs font-medium bg-white/10 hover:bg-white/20 active:scale-95 text-sfrc-100 hover:text-white px-3 py-1.5 rounded-xl border border-white/15 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <MessageSquareCode className="w-3 h-3 text-sfrc-gold" />
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Input Trigger Form */}
        <div className="w-full md:w-auto md:min-w-[340px]">
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything about SFRC..."
              className="flex-1 px-4 py-3 rounded-xl text-xs sm:text-sm bg-white/15 backdrop-blur-md text-white placeholder:text-white/60 border border-white/25 focus:outline-none focus:ring-2 focus:ring-sfrc-gold focus:border-transparent transition-all"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-sfrc-gold hover:bg-sfrc-200 active:scale-95 text-sfrc-950 font-bold text-xs sm:text-sm transition-all shadow-md cursor-pointer whitespace-nowrap"
            >
              Ask Pragya
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
