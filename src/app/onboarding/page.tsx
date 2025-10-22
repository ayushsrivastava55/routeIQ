'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, Link as LinkIcon, Plug, Rocket, User, Workflow } from 'lucide-react';

export default function OnboardingPage() {
  const [userId, setUserId] = useState('');
  const [authConfigs, setAuthConfigs] = useState<any[]>([]);
  const [connected, setConnected] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);

  const [session, setSession] = useState<{ sessionId: string; mcpUrl: string } | null>(null);
  const [creatingSession, setCreatingSession] = useState(false);

  useEffect(() => {
    const u = typeof window !== 'undefined' ? localStorage.getItem('routeiq_userId') || '' : '';
    if (u) setUserId(u);
    fetchAuthConfigs();
  }, []);

  useEffect(() => {
    if (!userId) return;
    refreshConnections();
  }, [userId]);

  const preferred = useMemo(() => {
    const wanted = ['hubspot', 'slack', 'stripe', 'docusign', 'clearbit', 'apollo'];
    return authConfigs
      .map((c) => ({ ...c, slug: typeof c.toolkit === 'string' ? c.toolkit : c.toolkit?.slug || '' }))
      .filter((c) => wanted.includes((c.slug || '').toLowerCase()));
  }, [authConfigs]);

  async function fetchAuthConfigs() {
    try {
      const res = await fetch('/api/authConfig/all', { method: 'POST' });
      if (!res.ok) return;
      const data = await res.json();
      setAuthConfigs(Array.isArray(data.items) ? data.items : []);
    } catch {}
  }

  async function refreshConnections() {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/apps/connection?userId=${encodeURIComponent(userId)}`);
      const data = await res.json();
      setConnected(Array.isArray(data.connectedAccounts) ? data.connectedAccounts : []);
    } catch {
      setConnected([]);
    } finally {
      setLoading(false);
    }
  }

  async function connect(authConfigId: string, toolkitSlug: string) {
    if (!userId) return toast.error('Enter a userId first');
    setConnecting(toolkitSlug);
    try {
      const res = await fetch('/api/apps/connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authConfigId, userId }),
      });
      if (!res.ok) return toast.error('Failed to create auth link');
      const data = await res.json();
      if (data.redirectUrl) {
        window.open(data.redirectUrl, '_blank');
        toast.info('Opened OAuth window. After authorizing, return here and click Refresh.');
        setTimeout(() => refreshConnections(), 2500);
      }
    } catch {
      toast.error('Failed to connect');
    } finally {
      setConnecting(null);
    }
  }

  async function createSession() {
    if (!userId) return toast.error('Enter a userId first');
    setCreatingSession(true);
    try {
      const res = await fetch('/api/router/session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, toolkits: ['hubspot','slack','gmail','stripe','docusign','clearbit','apollo'] }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to create session');
      setSession({ sessionId: data.sessionId, mcpUrl: data.mcpUrl });
      toast.success('Tool Router session ready');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create session');
    } finally {
      setCreatingSession(false);
    }
  }

  async function quickSlackPing() {
    if (!session) return toast.error('Create a session first');
    try {
      const res = await fetch('/api/router/call', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.sessionId,
          mcpUrl: session.mcpUrl,
          toolName: 'COMPOSIO_MULTI_EXECUTE_TOOL',
          args: {
            tools: [{ tool_slug: 'slack.chat_post_message', args: { channel: '#sales', text: '👋 RouteIQ is live!' } }],
            sync_response_to_workbench: false,
            memory: { slack: ["Default channel is #sales"] },
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed');
      toast.success('Sent Slack test message');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to post Slack message');
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
      <h1 className="text-2xl font-semibold flex items-center gap-2"><Rocket className="w-5 h-5"/> Get Started</h1>

      {/* Step 1: Identify User */}
      <section className="rounded border border-black/10 dark:border-white/10 p-4 space-y-3">
        <div className="flex items-center gap-2 text-lg font-medium"><User className="w-5 h-5"/> Step 1: Identify User</div>
        <p className="text-sm opacity-80">Enter a stable user identifier. This will scope your toolkit connections and Router sessions.</p>
        <div className="flex gap-2 items-center">
          <input value={userId} onChange={(e) => { setUserId(e.target.value); if (typeof window !== 'undefined') localStorage.setItem('routeiq_userId', e.target.value); }} placeholder="userId (email or UUID)" className="border rounded px-3 py-2 w-full max-w-sm" />
          <button onClick={() => toast.success('Saved userId')} className="px-3 py-2 border rounded">Save</button>
        </div>
      </section>

      {/* Step 2: Connect Apps */}
      <section className="rounded border border-black/10 dark:border-white/10 p-4 space-y-3">
        <div className="flex items-center gap-2 text-lg font-medium"><Plug className="w-5 h-5"/> Step 2: Connect Apps</div>
        <p className="text-sm opacity-80">Connect HubSpot, Slack, Stripe, DocuSign, Clearbit/Apollo. Use the buttons below to initiate OAuth flows.</p>
        <div className="flex gap-2 items-center">
          <button onClick={refreshConnections} className="px-3 py-2 border rounded">Refresh</button>
          {loading ? <span className="text-xs opacity-70">Loading...</span> : null}
        </div>
        <div className="border rounded">
          {preferred.length === 0 ? (
            <div className="p-4 text-sm opacity-70">No auth configs found. Ensure your Composio dashboard has configs for these toolkits.</div>
          ) : (
            <ul>
              {preferred.map((cfg) => {
                const slug = (cfg.slug || '').toLowerCase();
                const isConnected = connected.some((a: any) => a.toolkit?.slug?.toLowerCase() === slug);
                return (
                  <li key={`${cfg.id}-${slug}`} className="flex items-center justify-between p-3 border-b last:border-b-0">
                    <div className="space-y-0.5">
                      <div className="font-medium">{cfg.name}</div>
                      <div className="text-sm opacity-70">{slug}</div>
                    </div>
                    <div>
                      {isConnected ? (
                        <div className="text-sm text-green-600 flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/> Connected</div>
                      ) : (
                        <button disabled={connecting === slug} onClick={() => connect(cfg.id, slug)} className="px-3 py-2 border rounded flex items-center gap-2">
                          <LinkIcon className="w-4 h-4"/> {connecting === slug ? 'Connecting...' : 'Connect'}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* Step 3: Create Tool Router Session */}
      <section className="rounded border border-black/10 dark:border-white/10 p-4 space-y-3">
        <div className="flex items-center gap-2 text-lg font-medium"><Workflow className="w-5 h-5"/> Step 3: Create Tool Router Session</div>
        <p className="text-sm opacity-80">Create a session to access Tool Router meta tools (search, plan, manage, multi-exec).</p>
        <button onClick={createSession} disabled={creatingSession} className="px-4 py-2 rounded border">{creatingSession ? 'Creating...' : 'Create Session'}</button>
        {session ? (
          <div className="text-xs opacity-80">
            <div>sessionId: <code>{session.sessionId}</code></div>
            <div className="truncate">mcpUrl: <code className="break-all">{session.mcpUrl}</code></div>
          </div>
        ) : null}
      </section>

      {/* Step 4: Quick Actions */}
      <section className="rounded border border-black/10 dark:border-white/10 p-4 space-y-3">
        <div className="flex items-center gap-2 text-lg font-medium"><Rocket className="w-5 h-5"/> Step 4: Try a Quick Action</div>
        <p className="text-sm opacity-80">Send a Slack test message using COMPOSIO_MULTI_EXECUTE_TOOL to verify everything is wired.</p>
        <button onClick={quickSlackPing} className="px-4 py-2 rounded border">Send Slack Test</button>
        <div className="text-xs opacity-70">For advanced orchestration, explore the <a href="/router" className="underline">Router</a> page.</div>
      </section>
    </div>
  );
}
