"use client";

import { useEffect, useMemo, useState } from "react";
import type { Activity, Lead } from "@/lib/types";

export default function AdminPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);

  useEffect(() => {
    Promise.all([fetch("/api/leads"), fetch("/api/activity")])
      .then(async ([l, a]) => [await l.json(), await a.json()])
      .then(([l, a]) => {
        setLeads(l.leads || []);
        setActivity(a.activity || []);
      });
  }, []);

  const metrics = useMemo(() => computeMetrics(leads, activity), [leads, activity]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Admin Overview</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPI title="Active Leads (24h)" value={metrics.activeLeads24h.toString()} />
        <KPI title="Avg Response Time" value={metrics.avgResponseTime} subtitle="from create → last contact" />
        <KPI title="Workflow Success Rate" value={`${metrics.successRate}%`} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPI title="Waiting > 24h" value={`${metrics.waitingOver24h}`} subtitle="needs immediate follow-up" />
        <KPI title="Won Rate" value={`${metrics.wonRate}%`} />
        <KPI title="Tools Connected" value="—" subtitle="Wire Composio OAuth to populate" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="Leads by Day">
          <MiniLine data={metrics.leadsByDay} />
        </Card>
        <Card title="Status Distribution">
          <MiniBars data={metrics.statusBuckets} />
        </Card>
      </div>
    </div>
  );
}

import type { LeadStatus } from "@/lib/types";

function computeMetrics(leads: Lead[], activity: Activity[]) {
  const now = Date.now();
  const activeLeads24h = leads.filter((l) => now - new Date(l.createdAt).getTime() <= 24 * 60 * 60 * 1000).length;
  const responseTimes = leads
    .filter((l) => l.lastContactAt)
    .map((l) => new Date(l.lastContactAt!).getTime() - new Date(l.createdAt).getTime());
  const avgResponseTime = responseTimes.length
    ? humanizeMs(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
    : "—";
  const waitingOver24h = leads.filter(
    (l) => (l.status === "waiting_reply" || l.status === "contacted") && (!l.lastContactAt || now - new Date(l.lastContactAt).getTime() > 24 * 60 * 60 * 1000)
  ).length;
  const wonRate = Math.round(((leads.filter((l) => l.status === "won").length || 0) / (leads.length || 1)) * 100);
  const succ = activity.filter((a) => a.status === "success").length;
  const rate = Math.round((succ / (activity.length || 1)) * 100);
  // build last 14 days counts
  const days = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date(now - (13 - i) * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    const count = leads.filter((l) => l.createdAt.slice(0, 10) === key).length;
    return { label: key.slice(5), value: count };
  });
  const statuses: LeadStatus[] = ["new", "contacted", "waiting_reply", "qualified", "won", "lost"];
  const statusBuckets = statuses.map((s) => ({ label: s.replace("_", " "), value: leads.filter((l) => l.status === s).length }));
  return { activeLeads24h, avgResponseTime, waitingOver24h, wonRate, successRate: rate, leadsByDay: days, statusBuckets };
}

function humanizeMs(ms: number) {
  const h = Math.round(ms / (60 * 60 * 1000));
  return `${h}h`;
}

function KPI({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) {
  return (
    <div className="rounded border border-black/10 dark:border-white/10 p-4">
      <div className="text-xs opacity-70">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {subtitle ? <div className="text-xs opacity-60 mt-1">{subtitle}</div> : null}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded border border-black/10 dark:border-white/10 p-4">
      <div className="text-sm font-medium mb-2">{title}</div>
      {children}
    </div>
  );
}

function MiniLine({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - (d.value / max) * 100;
    return `${x},${y}`;
  });
  return (
    <svg viewBox="0 0 100 100" className="w-full h-32">
      <polyline fill="none" stroke="currentColor" strokeWidth="2" points={points.join(" ")} />
    </svg>
  );
}

function MiniBars({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const bw = 100 / data.length;
  return (
    <svg viewBox="0 0 100 100" className="w-full h-32">
      {data.map((d, i) => {
        const h = (d.value / max) * 90;
        return <rect key={d.label} x={i * bw + 4} y={95 - h} width={bw - 8} height={h} fill="currentColor" rx="1" />;
      })}
    </svg>
  );
}
