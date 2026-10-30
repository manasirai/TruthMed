import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { VerdictType } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const VERDICT_CONFIG: Record<
  VerdictType,
  { label: string; color: string; bg: string; border: string; icon: string }
> = {
  supported: {
    label: 'Supported by Evidence',
    color: 'text-emerald-700 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-200 dark:border-emerald-800',
    icon: '✓',
  },
  mostly_supported: {
    label: 'Mostly Supported',
    color: 'text-teal-700 dark:text-teal-400',
    bg: 'bg-teal-50 dark:bg-teal-950/40',
    border: 'border-teal-200 dark:border-teal-800',
    icon: '~',
  },
  misleading: {
    label: 'Misleading or Missing Context',
    color: 'text-amber-700 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-200 dark:border-amber-800',
    icon: '⚠',
  },
  mostly_false: {
    label: 'Mostly False',
    color: 'text-orange-700 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-950/40',
    border: 'border-orange-200 dark:border-orange-800',
    icon: '✗',
  },
  false: {
    label: 'False',
    color: 'text-red-700 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-950/40',
    border: 'border-red-200 dark:border-red-800',
    icon: '✗',
  },
  insufficient_evidence: {
    label: 'Insufficient Evidence',
    color: 'text-gray-600 dark:text-gray-400',
    bg: 'bg-gray-50 dark:bg-gray-800/60',
    border: 'border-gray-200 dark:border-gray-700',
    icon: '?',
  },
};

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}
