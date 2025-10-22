'use client';

import { cn } from '@/lib/utils';

export function Progress({ value, className }: { value: number; className?: string }) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  return (
    <div className={cn('w-full h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden', className)}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-blue-600 to-purple-600"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
