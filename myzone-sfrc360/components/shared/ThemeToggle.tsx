'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
  /** compact = icon-only pill, full = icon + label */
  variant?: 'compact' | 'full';
}

export default function ThemeToggle({ className, variant = 'compact' }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch — only render after mount
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    // Render a skeleton placeholder of identical size so layout doesn't shift
    return (
      <div
        className={cn(
          'w-9 h-9 rounded-xl bg-sfrc-100/50 dark:bg-muted/40 border border-sfrc-200/50 dark:border-border animate-pulse',
          className
        )}
        aria-hidden
      />
    );
  }

  const isDark = resolvedTheme === 'dark';

  const toggle = () => setTheme(isDark ? 'light' : 'dark');

  if (variant === 'full') {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        className={cn(
          'flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200',
          'text-sfrc-800 dark:text-foreground hover:bg-sfrc-100/80 dark:hover:bg-muted/60',
          className
        )}
      >
        <div className={cn(
          'w-6 h-6 rounded-lg flex items-center justify-center transition-colors',
          isDark
            ? 'bg-amber-500/20 text-amber-400'
            : 'bg-sfrc-100 text-sfrc-700'
        )}>
          {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </div>
        <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={cn(
        'relative w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200',
        'bg-sfrc-100/70 hover:bg-sfrc-200/80 dark:bg-muted dark:hover:bg-muted/80',
        'border border-sfrc-200/50 dark:border-border',
        'text-sfrc-800 dark:text-foreground',
        'overflow-hidden group',
        className
      )}
    >
      {/* Sun icon for dark→light */}
      <Sun
        className={cn(
          'absolute w-4 h-4 transition-all duration-300',
          isDark
            ? 'opacity-100 rotate-0 scale-100'
            : 'opacity-0 rotate-90 scale-50'
        )}
      />
      {/* Moon icon for light→dark */}
      <Moon
        className={cn(
          'absolute w-4 h-4 transition-all duration-300',
          isDark
            ? 'opacity-0 -rotate-90 scale-50'
            : 'opacity-100 rotate-0 scale-100'
        )}
      />
    </button>
  );
}
