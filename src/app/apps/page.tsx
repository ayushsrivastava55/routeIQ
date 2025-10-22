'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Plug, Power, RefreshCw, Link as LinkIcon } from 'lucide-react';

type AuthConfig = {
  id: string;
  name: string;
  toolkit: string | { slug: string };
};

type ConnectedAccount = {
  id: string;
  toolkit?: { slug?: string } | null;
  status?: string;
};

export default function AppsPage() {
  const [userId, setUserId] = useState('');
  const [authConfigs, setAuthConfigs] = useState<AuthConfig[]>([]);
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const u = typeof window !== 'undefined' ? localStorage.getItem('routeiq_userId') || '' : '';
    if (u) setUserId(u);
    fetchAuthConfigs();
  }, []);

  useEffect(() => {
    if (!userId) return;
    fetchConnections(userId);
  }, [userId]);

  useEffect(() => {
    const onFocus = () => {
      if (userId) fetchConnections(userId);
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [userId]);

  const filteredAuthConfigs = useMemo(() => {
    if (!search) return authConfigs;
    return authConfigs.filter((c) => (c.name || '').toLowerCase().includes(search.toLowerCase()));
  }, [authConfigs, search]);

  async function fetchAuthConfigs() {
    try {
      const res = await fetch('/api/authConfig/all', { method: 'POST' });
      if (!res.ok) return;
      const data = await res.json();
      setAuthConfigs(Array.isArray(data.items) ? data.items : []);
      toast.success('Loaded auth configs');
    } catch {}
  }

  async function fetchConnections(u: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/apps/connection?userId=${encodeURIComponent(u)}`);
      if (!res.ok) return setConnectedAccounts([]);
      const data = await res.json();
      setConnectedAccounts(Array.isArray(data.connectedAccounts) ? data.connectedAccounts : []);
      toast.success('Refreshed connections');
    } catch {
      setConnectedAccounts([]);
    } finally {
      setLoading(false);
    }
  }

  async function connect(authConfigId: string, toolkitSlug: string) {
    if (!userId) return alert('Enter a userId first');
    setConnecting(toolkitSlug);
    try {
      const res = await fetch('/api/apps/connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authConfigId, userId }),
      });
      if (!res.ok) return alert('Failed to create auth link');
      const data = await res.json();
      if (data.redirectUrl) {
        window.open(data.redirectUrl, '_blank');
        setTimeout(() => fetchConnections(userId), 2000);
        toast.info('Opened OAuth window');
      }
    } catch (e) {
      alert('Failed to connect');
    } finally {
      setConnecting(null);
    }
  }

  async function disconnect(accountId: string) {
    try {
      const res = await fetch('/api/apps/connection', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      });
      if (!res.ok) return alert('Failed to disconnect');
      setConnectedAccounts((prev) => prev.filter((a) => a.id !== accountId));
      toast.success('Disconnected');
    } catch (e) {
      alert('Failed to disconnect');
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-semibold flex items-center gap-2"><Plug className="w-5 h-5" /> Apps</h1>

      <div className="flex gap-2 items-center">
        <input
          value={userId}
          onChange={(e) => {
            setUserId(e.target.value);
            if (typeof window !== 'undefined') localStorage.setItem('routeiq_userId', e.target.value);
          }}
          placeholder="userId (email or UUID)"
          className="border rounded px-3 py-2 w-full max-w-sm"
        />
        <button onClick={() => userId && fetchConnections(userId)} className="px-3 py-2 border rounded flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Available Auth Configs</h2>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="border rounded px-2 py-1"
          />
        </div>
        <div className="border rounded">
          {filteredAuthConfigs.length === 0 ? (
            <div className="p-4 text-sm text-neutral-600">No auth configs</div>
          ) : (
            <ul>
              {filteredAuthConfigs.map((cfg) => {
                const slug = typeof cfg.toolkit === 'string' ? cfg.toolkit : cfg.toolkit?.slug || '';
                const isConnected = connectedAccounts.some((a) => a.toolkit?.slug?.toLowerCase() === slug.toLowerCase());
                return (
                  <li key={`${cfg.id}-${slug}`} className="flex items-center justify-between p-3 border-b last:border-b-0">
                    <div className="space-y-0.5">
                      <div className="font-medium">{cfg.name}</div>
                      <div className="text-sm text-neutral-600">{slug}</div>
                    </div>
                    <div>
                      {isConnected ? (
                        <button onClick={() => { const acc = connectedAccounts.find((a) => a.toolkit?.slug?.toLowerCase() === slug.toLowerCase()); if (acc?.id) disconnect(acc.id); }} className="px-3 py-2 border rounded flex items-center gap-2">
                          <Power className="w-4 h-4" /> Disconnect
                        </button>
                      ) : (
                        <button disabled={connecting === slug} onClick={() => connect(cfg.id, slug)} className="px-3 py-2 border rounded flex items-center gap-2">
                          <LinkIcon className="w-4 h-4" /> {connecting === slug ? 'Connecting...' : 'Connect'}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Connected Accounts</h2>
          {loading && <span className="text-sm text-neutral-500">Loading...</span>}
        </div>
        <div className="border rounded">
          {connectedAccounts.length === 0 ? (
            <div className="p-4 text-sm text-neutral-600">No accounts connected</div>
          ) : (
            <ul>
              {connectedAccounts.map((acc) => (
                <li key={acc.id} className="flex items-center justify-between p-3 border-b last:border-b-0">
                  <div className="space-y-0.5">
                    <div className="font-medium">{acc.id}</div>
                    <div className="text-sm text-neutral-600">{acc.toolkit?.slug}</div>
                  </div>
                  <button onClick={() => disconnect(acc.id)} className="px-3 py-2 border rounded">Disconnect</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
