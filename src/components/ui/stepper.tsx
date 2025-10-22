'use client';

import { cn } from '@/lib/utils';

export type Step = {
  id: string;
  title: string;
  description?: string;
};

export function Stepper({ steps, current, className }: { steps: Step[]; current: number; className?: string }) {
  return (
    <ol className={cn('grid grid-cols-1 md:grid-cols-4 gap-3', className)}>
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s.id} className={cn('rounded-xl border p-3', done ? 'border-green-500/50 bg-green-500/5' : active ? 'border-blue-500/50 bg-blue-500/5' : 'border-black/10 dark:border-white/10') }>
            <div className="flex items-center justify-between">
              <div className={cn('text-xs font-medium uppercase tracking-wide', done ? 'text-green-600' : active ? 'text-blue-600' : 'text-gray-500')}>{done ? 'Done' : active ? 'Current' : 'Next'}</div>
              <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold', done ? 'bg-green-600 text-white' : active ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300')}>{i+1}</div>
            </div>
            <div className="mt-2 text-sm font-semibold">{s.title}</div>
            {s.description ? <div className="text-xs opacity-70 mt-1">{s.description}</div> : null}
          </li>
        );
      })}
    </ol>
  );
}
