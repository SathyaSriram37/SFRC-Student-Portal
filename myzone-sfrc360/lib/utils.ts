import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import type { UserRole } from './types';

// ── Tailwind class merger ─────────────────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Date formatters ───────────────────────────────────────────────────────────
export function formatDate(dateStr: string, fmt = 'dd MMM yyyy'): string {
  try {
    return format(parseISO(dateStr), fmt);
  } catch {
    return dateStr;
  }
}

export function formatRelativeTime(dateStr: string): string {
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr: string): string {
  return formatDate(dateStr, 'dd MMM yyyy, hh:mm a');
}

// ── Attendance helpers ────────────────────────────────────────────────────────
export function getAttendanceColor(percentage: number): string {
  if (percentage >= 85) return 'text-green-600';
  if (percentage >= 75) return 'text-yellow-600';
  return 'text-red-600';
}

export function getAttendanceBadgeVariant(
  percentage: number
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (percentage >= 85) return 'default';
  if (percentage >= 75) return 'secondary';
  return 'destructive';
}

// ── Role helpers ──────────────────────────────────────────────────────────────
export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    student: 'Student',
    faculty: 'Faculty',
    parent: 'Parent',
    admin: 'Administrator',
  };
  return labels[role] ?? role;
}

export function getRoleDashboardPath(role: UserRole): string {
  const paths: Record<UserRole, string> = {
    student: '/student/dashboard',
    faculty: '/faculty/dashboard',
    parent: '/parent/dashboard',
    admin: '/admin/dashboard',
  };
  return paths[role] ?? '/';
}

// ── String helpers ────────────────────────────────────────────────────────────
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}

// ── Number helpers ────────────────────────────────────────────────────────────
export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
