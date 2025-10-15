"use client";

import { useEffect, useMemo, useState } from "react";
import type { Lead } from "@/lib/types";

type Filters = {
  potentialMin: number;
  potentialMax: number;
  status: string;
  from: string;
  to: string;
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    potentialMin: 0,
    potentialMax: 100,
    status: "",
    from: "",
    to: "",
  });

  const qs = useMemo(() => {
    const params = new URLSearchParams();
    params.set("potentialMin", String(filters.potentialMin));
    params.set("potentialMax", String(filters.potentialMax));
    if (filters.status) params.set("status", filters.status);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
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
    <div className="grid grid-cols-1 md:grid-cols-5 gap-2 border rounded p-3 border-black/10 dark:border-white/10">
      <div>
        <label className="block text-xs mb-1">Potential Min</label>
        <input
          type="number"
          min={0}
          max={100}
          value={filters.potentialMin}
          onChange={(e) => setFilters({ ...filters, potentialMin: Number(e.target.value) })}
          className="w-full border rounded px-2 py-1 bg-transparent"
        />
      </div>
      <div>
        <label className="block text-xs mb-1">Potential Max</label>
        <input
          type="number"
          min={0}
          max={100}
          value={filters.potentialMax}
          onChange={(e) => setFilters({ ...filters, potentialMax: Number(e.target.value) })}
          className="w-full border rounded px-2 py-1 bg-transparent"
        />
      </div>
      <div>
        <label className="block text-xs mb-1">Status</label>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="w-full border rounded px-2 py-1 bg-transparent"
        >
          <option value="">All</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="waiting_reply">Waiting on reply</option>
          <option value="qualified">Qualified</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
        </select>
      </div>
      <div>
        <label className="block text-xs mb-1">From</label>
        <input
          type="date"
          value={filters.from}
          onChange={(e) => setFilters({ ...filters, from: e.target.value })}
          className="w-full border rounded px-2 py-1 bg-transparent"
        />
      </div>
      <div>
        <label className="block text-xs mb-1">To</label>
        <input
          type="date"
          value={filters.to}
          onChange={(e) => setFilters({ ...filters, to: e.target.value })}
          className="w-full border rounded px-2 py-1 bg-transparent"
        />
      </div>
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
              <tr key={l.id} className="border-b border-black/5 dark:border-white/5">
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
                      onClick={() => onResend(l)}
                      className="px-2 py-1 rounded border border-black/10 dark:border-white/10 hover:bg-black/[.03] dark:hover:bg-white/[.07]"
                    >
                      Resend
                    </button>
                  )}
                  <button
                    onClick={() => onNotify(l)}
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
