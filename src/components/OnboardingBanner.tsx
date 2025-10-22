'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Stepper, type Step } from '@/components/ui/stepper';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function OnboardingBanner() {
  const [userId, setUserId] = useState<string>('');
  const [connections, setConnections] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const sessionReady = typeof window !== 'undefined' ? !!localStorage.getItem('routeiq_session_ready') : false;
  const quickTestDone = typeof window !== 'undefined' ? !!localStorage.getItem('routeiq_quick_test_done') : false;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setDismissed(localStorage.getItem('routeiq_banner_dismissed') === '1');
    const u = localStorage.getItem('routeiq_userId') || '';
    setUserId(u);
    if (u) fetchConnections(u);
  }, []);

  async function fetchConnections(u: string) {
    try {
      const res = await fetch(`/api/apps/connection?userId=${encodeURIComponent(u)}`);
      const data = await res.json();
      const count = Array.isArray(data.connectedAccounts) ? data.connectedAccounts.length : 0;
      setConnections(count);
    } catch {
      setConnections(0);
    }
  }

  const steps: Step[] = useMemo(() => ([
    { id: 'identify', title: 'Identify user', description: userId ? userId : 'Set your user ID' },
    { id: 'connect', title: 'Connect apps', description: connections !== null ? `${connections} connected` : 'HubSpot, Slack, Stripe…' },
    { id: 'session', title: 'Create session', description: sessionReady ? 'Ready' : 'Generate MCP URL' },
    { id: 'verify', title: 'Verify', description: quickTestDone ? 'Slack test sent' : 'Run a quick action' },
  ]), [userId, connections, sessionReady, quickTestDone]);

  const completed = [
    !!userId,
    (connections ?? 0) > 0,
    sessionReady,
    quickTestDone,
  ];
  const current = completed.indexOf(false) === -1 ? steps.length - 1 : completed.indexOf(false);
  const percent = Math.round((completed.filter(Boolean).length / steps.length) * 100);

  // Hide banner if fully complete or explicitly dismissed
  if (dismissed || completed.every(Boolean)) return null;

  return (
    <div className="w-full border-b border-black/10 dark:border-white/10 bg-gradient-to-r from-blue-50/60 to-purple-50/60 dark:from-blue-950/40 dark:to-purple-950/40">
      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="text-sm font-semibold mb-2">Finish setting up RouteIQ</div>
            <Stepper steps={steps} current={current} />
            <div className="mt-3">
              <Progress value={percent} />
              <div className="text-xs opacity-70 mt-1">{percent}% complete</div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 min-w-40">
            <Link href="/onboarding">
              <Button size="md" className="w-full">Resume setup</Button>
            </Link>
            <button className="text-xs opacity-70 hover:opacity-100" onClick={() => { setDismissed(true); if (typeof window !== 'undefined') localStorage.setItem('routeiq_banner_dismissed','1'); toast.info('You can reopen onboarding from the Home page.'); }}>Dismiss</button>
          </div>
        </div>
      </div>
    </div>
  );
}
