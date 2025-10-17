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
    fetch(`/api/leads?${qs}`)
      .then((r) => r.json())
      .then((d) => setLeads(d.leads))
      .finally(() => setLoading(false));
  }, [qs]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Leads</h1>
      <div className="flex items-center gap-2">
        <button
          className="px-3 py-2 rounded border border-black/10 dark:border-white/10 hover:bg-black/[.03] dark:hover:bg-white/[.07] text-sm"
          onClick={async () => {
            await fetch("/api/leads/assign", { method: "POST" });
            fetch(`/api/leads?${qs}`).then((r) => r.json()).then((d) => setLeads(d.leads));
          }}
        >
          Run assignment
        </button>
      </div>
      <FiltersBar filters={filters} setFilters={setFilters} />
      <LeadsTable leads={leads} loading={loading} onResend={handleResend} onNotify={handleNotify} />
    </div>
  );

  async function handleResend(lead: Lead) {
    const res = await fetch(`/api/leads/${lead.id}/resend`, { method: "POST" });
    if (res.ok) {
      // refetch
      fetch(`/api/leads?${qs}`)
        .then((r) => r.json())
        .then((d) => setLeads(d.leads));
    }
  }

  async function handleNotify(lead: Lead) {
    await fetch("/api/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "slack_notified",
        leadId: lead.id,
        message: `Notified #sales about ${lead.name}`,
        status: "success",
      }),
    });
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
    <div className="flex flex-wrap items-center gap-3 border rounded p-3 border-black/10 dark:border-white/10">
      <div className="text-xs opacity-70">Potential</div>
      <Chip onClick={() => setFilters({ ...filters, potentialMin: 0 })} active={filters.potentialMin === 0}>All</Chip>
      <Chip onClick={() => setFilters({ ...filters, potentialMin: 50 })} active={filters.potentialMin === 50}>50+</Chip>
      <Chip onClick={() => setFilters({ ...filters, potentialMin: 70 })} active={filters.potentialMin === 70}>70+</Chip>
      <Chip onClick={() => setFilters({ ...filters, potentialMin: 85 })} active={filters.potentialMin === 85}>85+</Chip>

      <div className="w-px h-6 bg-black/10 dark:bg-white/10 mx-1" />

      <div className="text-xs opacity-70">Status</div>
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

      <div className="w-px h-6 bg-black/10 dark:bg-white/10 mx-1" />

      <div className="text-xs opacity-70">Date</div>
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
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left border-b border-black/10 dark:border-white/10">
            <th className="py-2 pr-4">Lead</th>
            <th className="py-2 pr-4">Company</th>
            <th className="py-2 pr-4">Potential</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2 pr-4">Owner</th>
            <th className="py-2 pr-4">Created</th>
            <th className="py-2 pr-4">Last Contact</th>
            <th className="py-2 pr-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={8} className="py-6 text-center opacity-70">
                Loading...
              </td>
            </tr>
          ) : leads.length === 0 ? (
            <tr>
              <td colSpan={8} className="py-6 text-center opacity-70">
                No leads
              </td>
            </tr>
          ) : (
            leads.map((l) => (
              <tr key={l.id} className="border-b border-black/5 dark:border-white/5 hover:bg-black/[.02] dark:hover:bg-white/[.03] cursor-pointer" onClick={() => router.push(`/leads/${l.id}`)}>
                <td className="py-2 pr-4">
                  <div className="font-medium">{l.name}</div>
                  <div className="text-xs opacity-70">{l.email}</div>
                </td>
                <td className="py-2 pr-4">{l.company ?? "-"}</td>
                <td className="py-2 pr-4">
                  <span className="inline-block px-2 py-0.5 rounded bg-black/5 dark:bg-white/10">
                    {l.potential}
                  </span>
                </td>
                <td className="py-2 pr-4 capitalize">{l.status.replace("_", " ")}</td>
                <td className="py-2 pr-4">{l.owner ?? "-"}</td>
                <td className="py-2 pr-4">{new Date(l.createdAt).toLocaleDateString()}</td>
                <td className="py-2 pr-4">
                  {l.lastContactAt ? new Date(l.lastContactAt).toLocaleString() : "-"}
                </td>
                <td className="py-2 pr-4 space-x-2">
                  {(l.status === "waiting_reply" || l.status === "contacted") && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onResend(l); }}
                      className="px-2 py-1 rounded border border-black/10 dark:border-white/10 hover:bg-black/[.03] dark:hover:bg-white/[.07]"
                    >
                      Resend
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); onNotify(l); }}
                    className="px-2 py-1 rounded border border-black/10 dark:border-white/10 hover:bg-black/[.03] dark:hover:bg-white/[.07]"
                  >
                    Notify
                  </button>
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
      className={`px-2 py-1 rounded-full text-xs border ${active ? "bg-black text-white dark:bg-white dark:text-black border-transparent" : "border-black/10 dark:border-white/10 hover:bg-black/[.03] dark:hover:bg-white/[.04]"}`}
    >
      {children}
    </button>
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
