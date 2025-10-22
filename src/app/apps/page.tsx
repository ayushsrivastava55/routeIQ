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

  const appIcons: Record<string, { name: string; color: string }> = {
    hubspot: { name: "HubSpot", color: "bg-orange-500" },
    gmail: { name: "Gmail", color: "bg-red-500" },
    slack: { name: "Slack", color: "bg-purple-500" },
    stripe: { name: "Stripe", color: "bg-blue-500" },
    docusign: { name: "DocuSign", color: "bg-cyan-500" },
    clearbit: { name: "Clearbit", color: "bg-indigo-500" },
    apollo: { name: "Apollo", color: "bg-pink-500" },
    mailchimp: { name: "Mailchimp", color: "bg-yellow-500" },
    sendgrid: { name: "SendGrid", color: "bg-green-500" },
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Connected Apps</h1>
        <p className="text-muted-foreground">Manage your integrations and connected accounts</p>
      </div>

      <div className="flex gap-2 items-center p-4 rounded-lg border bg-card">
        <input
          value={userId}
          onChange={(e) => {
            setUserId(e.target.value);
            if (typeof window !== 'undefined') localStorage.setItem('routeiq_userId', e.target.value);
          }}
          placeholder="Enter your email address"
          className="flex-1 border rounded px-3 py-2 bg-background"
        />
        <button onClick={() => userId && fetchConnections(userId)} className="px-4 py-2 rounded border hover:bg-muted flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Available Integrations</h2>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search apps..."
            className="border rounded px-3 py-2 w-64"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAuthConfigs.length === 0 ? (
            <div className="col-span-2 p-8 text-center text-muted-foreground border rounded-lg">
              No integrations available
            </div>
          ) : (
            filteredAuthConfigs.map((cfg) => {
              const slug = typeof cfg.toolkit === 'string' ? cfg.toolkit : cfg.toolkit?.slug || '';
              const isConnected = connectedAccounts.some((a) => a.toolkit?.slug?.toLowerCase() === slug.toLowerCase());
              const appInfo = appIcons[slug.toLowerCase()] || { name: cfg.name, color: "bg-gray-500" };
              
              return (
                <div key={`${cfg.id}-${slug}`} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg ${appInfo.color} flex items-center justify-center text-white font-bold`}>
                        {appInfo.name[0]}
                      </div>
                      <div>
                        <div className="font-semibold">{appInfo.name}</div>
                        <div className="text-sm text-muted-foreground">{slug}</div>
                      </div>
                    </div>
                    {isConnected ? (
                      <button 
                        onClick={() => { 
                          const acc = connectedAccounts.find((a) => a.toolkit?.slug?.toLowerCase() === slug.toLowerCase()); 
                          if (acc?.id) disconnect(acc.id); 
                        }} 
                        className="px-4 py-2 rounded border hover:bg-red-50 hover:border-red-300 flex items-center gap-2"
                      >
                        <Power className="w-4 h-4" /> Disconnect
                      </button>
                    ) : (
                      <button 
                        disabled={connecting === slug} 
                        onClick={() => connect(cfg.id, slug)} 
                        className="px-4 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50"
                      >
                        <LinkIcon className="w-4 h-4" /> {connecting === slug ? 'Connecting...' : 'Connect'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">My Connected Accounts</h2>
          {loading && <span className="text-sm text-muted-foreground animate-pulse">Loading...</span>}
        </div>
        {connectedAccounts.length === 0 ? (
          <div className="p-12 text-center border rounded-lg">
            <Plug className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No accounts connected yet</p>
            <p className="text-sm text-muted-foreground mt-2">Connect an app above to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {connectedAccounts.map((acc) => {
              const slug = acc.toolkit?.slug || 'unknown';
              const appInfo = appIcons[slug.toLowerCase()] || { name: slug, color: "bg-gray-500" };
              
              return (
                <div key={acc.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg ${appInfo.color} flex items-center justify-center text-white font-bold`}>
                        {appInfo.name[0]}
                      </div>
                      <div>
                        <div className="font-semibold">{appInfo.name}</div>
                        <div className="text-sm text-muted-foreground">{acc.status || 'Connected'}</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => disconnect(acc.id)} 
                      className="px-4 py-2 rounded border hover:bg-red-50 hover:border-red-300 text-sm"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
