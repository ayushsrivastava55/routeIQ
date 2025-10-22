'use client';

import { useEffect, useMemo, useState } from 'react';

type SessionResp = { ok: boolean; sessionId: string; mcpUrl: string; tools: { name: string; description?: string }[] };

type ToolCallResult = { ok?: boolean; error?: string; result?: any };

export default function RouterPage() {
  const [userId, setUserId] = useState('');
  const [toolkits, setToolkits] = useState('hubspot,slack,gmail,stripe,docusign,clearbit,apollo,mailchimp,sendgrid');
  const [session, setSession] = useState<{ sessionId: string; mcpUrl: string } | null>(null);
  const [tools, setTools] = useState<{ name: string; description?: string }[]>([]);
  const [creating, setCreating] = useState(false);

  const [searchQuery, setSearchQuery] = useState('Create lead in HubSpot, enrich via Clearbit/Apollo, notify Slack, and invoice in Stripe when deal is won.');
  const [searchOut, setSearchOut] = useState<any>(null);
  const [planArgs, setPlanArgs] = useState<string>('{}');
  const [planOut, setPlanOut] = useState<any>(null);

  const [manageArgs, setManageArgs] = useState<string>(JSON.stringify({ requests: [{ toolkit: 'hubspot' }, { toolkit: 'slack' }, { toolkit: 'stripe' }] }, null, 2));
  const [manageOut, setManageOut] = useState<any>(null);

  const [multiArgs, setMultiArgs] = useState<string>(JSON.stringify({
    tools: [
      { tool_slug: 'slack.chat_post_message', args: { channel: '#sales', text: 'Hello from Tool Router!' } }
    ],
    sync_response_to_workbench: false,
    memory: { slack: ["Default channel is #sales"] },
  }, null, 2));
  const [multiOut, setMultiOut] = useState<any>(null);

  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const u = typeof window !== 'undefined' ? localStorage.getItem('routeiq_userId') || '' : '';
    if (u) setUserId(u);
  }, []);

  const metaTools = useMemo(() => [
    { name: 'COMPOSIO_SEARCH_TOOLS', desc: 'Discover tools across connected apps for a task' },
    { name: 'COMPOSIO_CREATE_PLAN', desc: 'Generate a step-by-step plan given the task' },
    { name: 'COMPOSIO_MANAGE_CONNECTIONS', desc: 'Create/manage OAuth/API-key connections for toolkits' },
    { name: 'COMPOSIO_MULTI_EXECUTE_TOOL', desc: 'Execute multiple tools in parallel' },
    { name: 'COMPOSIO_REMOTE_WORKBENCH', desc: 'Run code in remote sandbox with persisted files' },
    { name: 'COMPOSIO_REMOTE_BASH_TOOL', desc: 'Run bash commands in remote sandbox' },
  ], []);

  async function createSession() {
    if (!userId) { alert('Enter userId'); return; }
    setCreating(true);
    try {
      const res = await fetch('/api/router/session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, toolkits: toolkits.split(',').map(s => s.trim()).filter(Boolean) }),
      });
      const data: SessionResp = await res.json();
      if (!res.ok || !data.ok) throw new Error((data as any).error || 'Failed to create session');
      setSession({ sessionId: data.sessionId, mcpUrl: data.mcpUrl });
      setTools(data.tools || []);
    } catch (e: any) {
      alert(e.message || 'Failed');
    } finally {
      setCreating(false);
    }
  }

  async function callTool(toolName: string, args: any, setOut: (v: any) => void) {
    if (!session) { alert('Create a session first'); return; }
    setBusy(toolName);
    try {
      const res = await fetch('/api/router/call', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.sessionId, mcpUrl: session.mcpUrl, toolName, args }),
      });
      const data: ToolCallResult = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Tool call failed');
      setOut(data.result);
    } catch (e: any) {
      setOut({ error: e.message || String(e) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tool Router</h1>
        <a className="text-sm opacity-70 hover:opacity-100 underline" href="/apps">Manage Connections →</a>
      </div>

      <section className="rounded border border-black/10 dark:border-white/10 p-4 space-y-3">
        <h2 className="text-lg font-medium">Session</h2>
        <div className="flex flex-wrap gap-3 items-center">
          <input value={userId} onChange={(e) => { setUserId(e.target.value); if (typeof window !== 'undefined') localStorage.setItem('routeiq_userId', e.target.value); }} placeholder="userId (email or UUID)" className="border rounded px-3 py-2 w-full max-w-sm" />
          <input value={toolkits} onChange={(e) => setToolkits(e.target.value)} placeholder="toolkits csv" className="border rounded px-3 py-2 w-full" />
          <button onClick={createSession} disabled={creating} className="px-4 py-2 rounded border">
            {creating ? 'Creating...' : 'Create Session'}
          </button>
        </div>
        {session ? (
          <div className="text-xs opacity-80">
            <div>sessionId: <code>{session.sessionId}</code></div>
            <div className="truncate">mcpUrl: <code className="break-all">{session.mcpUrl}</code></div>
          </div>
        ) : null}
        {!!tools.length && (
          <div className="pt-2">
            <div className="text-sm font-medium mb-1">Available Tools ({tools.length})</div>
            <div className="text-xs grid grid-cols-1 md:grid-cols-2 gap-2">
              {tools.slice(0, 12).map((t) => (
                <div key={t.name} className="p-2 rounded border border-black/10 dark:border-white/10">
                  <div className="font-mono text-[11px]">{t.name}</div>
                  {t.description ? <div className="opacity-70">{t.description}</div> : null}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="rounded border border-black/10 dark:border-white/10 p-4 space-y-3">
        <h2 className="text-lg font-medium">Discovery</h2>
        <div className="space-y-2">
          <textarea value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} rows={3} className="w-full border rounded px-3 py-2" />
          <button onClick={() => callTool('COMPOSIO_SEARCH_TOOLS', { query: searchQuery, memory: {} }, setSearchOut)} disabled={!session || busy === 'COMPOSIO_SEARCH_TOOLS'} className="px-4 py-2 rounded border">
            {busy === 'COMPOSIO_SEARCH_TOOLS' ? 'Searching...' : 'Run Search'}
          </button>
          {searchOut ? <JsonView data={searchOut} /> : null}
        </div>
      </section>

      <section className="rounded border border-black/10 dark:border-white/10 p-4 space-y-3">
        <h2 className="text-lg font-medium">Plan</h2>
        <div className="space-y-2">
          <textarea value={planArgs} onChange={(e) => setPlanArgs(e.target.value)} rows={6} className="w-full border rounded px-3 py-2 font-mono text-xs" />
          <div className="text-xs opacity-70">Tip: you can pass known_fields or memory referencing search output.</div>
          <button onClick={() => {
            let args: any = {};
            try { args = JSON.parse(planArgs || '{}'); } catch {}
            callTool('COMPOSIO_CREATE_PLAN', { ...args, memory: args.memory ?? {} }, setPlanOut);
          }} disabled={!session || busy === 'COMPOSIO_CREATE_PLAN'} className="px-4 py-2 rounded border">
            {busy === 'COMPOSIO_CREATE_PLAN' ? 'Planning...' : 'Create Plan'}
          </button>
          {planOut ? <JsonView data={planOut} /> : null}
        </div>
      </section>

      <section className="rounded border border-black/10 dark:border-white/10 p-4 space-y-3">
        <h2 className="text-lg font-medium">Connections</h2>
        <div className="space-y-2">
          <textarea value={manageArgs} onChange={(e) => setManageArgs(e.target.value)} rows={6} className="w-full border rounded px-3 py-2 font-mono text-xs" />
          <div className="text-xs opacity-70">If OAuth links are returned, open them and then refresh.</div>
          <button onClick={() => {
            let args: any = {};
            try { args = JSON.parse(manageArgs || '{}'); } catch {}
            callTool('COMPOSIO_MANAGE_CONNECTIONS', { ...args, memory: args.memory ?? {} }, setManageOut);
          }} disabled={!session || busy === 'COMPOSIO_MANAGE_CONNECTIONS'} className="px-4 py-2 rounded border">
            {busy === 'COMPOSIO_MANAGE_CONNECTIONS' ? 'Managing...' : 'Manage Connections'}
          </button>
          {manageOut ? <JsonView data={manageOut} /> : null}
        </div>
      </section>

      <section className="rounded border border-black/10 dark:border-white/10 p-4 space-y-3">
        <h2 className="text-lg font-medium">Multi-Execute</h2>
        <div className="space-y-2">
          <textarea value={multiArgs} onChange={(e) => setMultiArgs(e.target.value)} rows={8} className="w-full border rounded px-3 py-2 font-mono text-xs" />
          <div className="text-xs opacity-70">Provide an array of tools with tool_slug and args; memory is required by the router.</div>
          <button onClick={() => {
            let args: any = {};
            try { args = JSON.parse(multiArgs || '{}'); } catch {}
            callTool('COMPOSIO_MULTI_EXECUTE_TOOL', { ...args, memory: args.memory ?? {} }, setMultiOut);
          }} disabled={!session || busy === 'COMPOSIO_MULTI_EXECUTE_TOOL'} className="px-4 py-2 rounded border">
            {busy === 'COMPOSIO_MULTI_EXECUTE_TOOL' ? 'Executing...' : 'Execute in Parallel'}
          </button>
          {multiOut ? <JsonView data={multiOut} /> : null}
        </div>
      </section>
    </div>
  );
}

function JsonView({ data }: { data: any }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border rounded p-2 bg-black/5 dark:bg-white/5">
      <button onClick={() => setOpen((v) => !v)} className="text-xs opacity-70 hover:opacity-100">{open ? 'Hide' : 'Show'} JSON</button>
      {open ? (
        <pre className="mt-2 text-[11px] overflow-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
