"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Lead } from "@/lib/types";

type Filters = {
  potentialMin: number; // thresholds via chips
  status: string; // '', new, contacted, waiting_reply, qualified, won, lost
  datePreset: "any" | "7d" | "30d" | "month";
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<Filters>({ potentialMin: 0, status: "", datePreset: "any" });

  const qs = useMemo(() => {
    const params = new URLSearchParams();
    params.set("potentialMin", String(filters.potentialMin));
    if (filters.status) params.set("status", filters.status);
    const { from, to } = toDateRange(filters.datePreset);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return params.toString();
  }, [filters]);

  useEffect(() => {
    setLoading(true);
    const uid = typeof window !== "undefined" ? localStorage.getItem("routeiq_userId") : null;
    fetch(`/api/leads?userId=${encodeURIComponent(String(uid || ""))}&${qs}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then((d) => setLeads(Array.isArray(d.leads) ? d.leads : []))
      .catch(() => setLeads([]))
      .finally(() => setLoading(false));
  }, [qs]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>Leads</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--foreground-muted)' }}>Manage and qualify your pipeline</p>
        </div>
        <button
          className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-md"
          style={{ background: 'var(--accent)', color: 'white' }}
          onClick={async () => {
            const uid = typeof window !== "undefined" ? localStorage.getItem("routeiq_userId") : null;
            await fetch("/api/leads/assign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: uid }) });
            fetch(`/api/leads?userId=${encodeURIComponent(String(uid || ""))}&${qs}`)
              .then(async (r) => {
                if (!r.ok) throw new Error(await r.text());
                return r.json();
              })
              .then((d) => setLeads(Array.isArray(d.leads) ? d.leads : []))
              .catch(() => setLeads([]));
          }}
        >
          ⚡ Run Assignment
        </button>
      </div>
      <FiltersBar filters={filters} setFilters={setFilters} />
      <LeadsTable leads={leads} loading={loading} onResend={handleResend} onNotify={handleNotify} />
    </div>
  );

  async function handleResend(lead: Lead) {
    const userId = typeof window !== "undefined" ? localStorage.getItem("routeiq_userId") : null;
    const res = await fetch(`/api/leads/${lead.id}/resend`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId }) });
    if (res.ok) {
      // refetch
      fetch(`/api/leads?${qs}`)
        .then(async (r) => {
          if (!r.ok) throw new Error(await r.text());
          return r.json();
        })
        .then((d) => setLeads(Array.isArray(d.leads) ? d.leads : []))
        .catch(() => setLeads([]));
    }
  }

  async function handleNotify(lead: Lead) {
    const userId = typeof window !== "undefined" ? localStorage.getItem("routeiq_userId") : null;
    const text = `New lead: ${lead.name} <${lead.email}> (${lead.company ?? "-"})`;
    await fetch("/api/notify/slack", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, text }) });
  }
}

function FiltersBar({
  filters,
  setFilters,
}: {
  filters: Filters;
  setFilters: (f: Filters) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--foreground-muted)' }}>Potential</div>
      <Chip onClick={() => setFilters({ ...filters, potentialMin: 0 })} active={filters.potentialMin === 0}>All</Chip>
      <Chip onClick={() => setFilters({ ...filters, potentialMin: 50 })} active={filters.potentialMin === 50}>50+</Chip>
      <Chip onClick={() => setFilters({ ...filters, potentialMin: 70 })} active={filters.potentialMin === 70}>70+</Chip>
      <Chip onClick={() => setFilters({ ...filters, potentialMin: 85 })} active={filters.potentialMin === 85}>85+</Chip>

      <div className="w-px h-6" style={{ background: 'var(--border)' }} />

      <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--foreground-muted)' }}>Status</div>
      {[
        ["", "All"],
        ["new", "New"],
        ["contacted", "Contacted"],
        ["waiting_reply", "Waiting"],
        ["qualified", "Qualified"],
        ["won", "Won"],
        ["lost", "Lost"],
      ].map(([val, label]) => (
        <Chip key={val} onClick={() => setFilters({ ...filters, status: val })} active={filters.status === val}>
          {label}
        </Chip>
      ))}

      <div className="w-px h-6" style={{ background: 'var(--border)' }} />

      <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--foreground-muted)' }}>Date</div>
      {([
        ["any", "Any time"],
        ["7d", "Last 7 days"],
        ["30d", "Last 30 days"],
        ["month", "This month"],
      ] as const).map(([val, label]) => (
        <Chip key={val} onClick={() => setFilters({ ...filters, datePreset: val })} active={filters.datePreset === val}>
          {label}
        </Chip>
      ))}
    </div>
  );
}

function LeadsTable({
  leads,
  loading,
  onResend,
  onNotify,
}: {
  leads: Lead[];
  loading: boolean;
  onResend: (l: Lead) => void;
  onNotify: (l: Lead) => void;
}) {
  const router = useRouter();
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <table className="min-w-full">
        <thead>
          <tr className="text-left text-xs font-semibold uppercase tracking-wide" style={{ background: 'var(--background)', color: 'var(--foreground-muted)', borderBottom: '1px solid var(--border)' }}>
            <th className="py-4 px-6">Lead</th>
            <th className="py-4 px-6">Company</th>
            <th className="py-4 px-6">Score</th>
            <th className="py-4 px-6">Status</th>
            <th className="py-4 px-6">Owner</th>
            <th className="py-4 px-6">Created</th>
            <th className="py-4 px-6">Last Contact</th>
            <th className="py-4 px-6">Actions</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {loading ? (
            <tr>
              <td colSpan={8} className="py-12 text-center" style={{ color: 'var(--foreground-muted)' }}>
                Loading leads...
              </td>
            </tr>
          ) : leads.length === 0 ? (
            <tr>
              <td colSpan={8} className="py-12 text-center" style={{ color: 'var(--foreground-muted)' }}>
                No leads found
              </td>
            </tr>
          ) : (
            leads.map((l) => (
              <tr key={l.id} className="cursor-pointer transition-colors" style={{ borderBottom: '1px solid var(--border)' }} onClick={() => router.push(`/leads/${l.id}`)}>
                <td className="py-4 px-6">
                  <div className="font-semibold" style={{ color: 'var(--foreground)' }}>{l.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--foreground-muted)' }}>{l.email}</div>
                </td>
                <td className="py-4 px-6" style={{ color: 'var(--foreground-muted)' }}>{l.company ?? "-"}</td>
                <td className="py-4 px-6">
                  <PotentialBadge score={l.potential} />
                </td>
                <td className="py-4 px-6">
                  <StatusBadge status={l.status} />
                </td>
                <td className="py-4 px-6" style={{ color: 'var(--foreground-muted)' }}>{l.owner ?? "-"}</td>
                <td className="py-4 px-6" style={{ color: 'var(--foreground-muted)' }}>{new Date(l.createdAt).toLocaleDateString()}</td>
                <td className="py-4 px-6" style={{ color: 'var(--foreground-muted)' }}>
                  {l.lastContactAt ? new Date(l.lastContactAt).toLocaleString() : "-"}
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-2">
                    {(l.status === "waiting_reply" || l.status === "contacted") && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onResend(l); }}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}
                      >
                        Resend
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); onNotify(l); }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{ border: '1px solid var(--border)', color: 'var(--foreground-muted)' }}
                    >
                      Notify
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function Chip({ children, onClick, active }: { children: React.ReactNode; onClick: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
      style={{
        background: active ? 'var(--primary)' : 'transparent',
        color: active ? 'white' : 'var(--foreground-muted)',
        border: active ? 'none' : '1px solid var(--border)',
      }}
    >
      {children}
    </button>
  );
}

function PotentialBadge({ score }: { score: number }) {
  const color = score >= 85 ? 'var(--success)' : score >= 70 ? 'var(--primary)' : score >= 50 ? 'var(--warning)' : 'var(--error)';
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: `${color}20`, color }}>
      {score}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusColors: Record<string, string> = {
    new: 'var(--info)',
    contacted: 'var(--primary)',
    waiting_reply: 'var(--warning)',
    qualified: 'var(--accent)',
    won: 'var(--success)',
    lost: 'var(--error)',
  };
  const color = statusColors[status] || 'var(--foreground-muted)';
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize" style={{ background: `${color}20`, color }}>
      {status.replace('_', ' ')}
    </span>
  );
}

function toDateRange(preset: Filters["datePreset"]): { from?: string; to?: string } {
  const now = new Date();
  if (preset === "any") return {};
  if (preset === "7d") {
    const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { from: from.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) };
  }
  if (preset === "30d") {
    const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { from: from.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) };
  }
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: from.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) };
}
