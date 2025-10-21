"use client";

import { useEffect, useMemo, useState } from "react";
import type { Activity, Lead } from "@/lib/types";

export default function MarketingPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);

  useEffect(() => {
    const userId = typeof window !== "undefined" ? localStorage.getItem("routeiq_userId") : null;
    Promise.all([fetch(`/api/leads?userId=${encodeURIComponent(String(userId || ""))}`), fetch("/api/activity")])
      .then(async ([l, a]) => [await l.json(), await a.json()])
      .then(([l, a]) => {
        setLeads(l.leads || []);
        setActivity(a.activity || []);
      });
  }, []);

  const metrics = useMemo(() => computeMarketing(leads, activity), [leads, activity]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Marketing KPIs</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPI title="Welcome/Intro Emails" value={`${metrics.emailsSent}`} />
        <KPI title="Engaged Leads (contacted/qualified)" value={`${metrics.engaged}`} />
        <KPI title="Weekly Reports" value="—" subtitle="Connect ESP/analytics to populate" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPI title="Re-engagement Nudges" value={`${metrics.resends}`} />
        <KPI title="Open Rate" value="—" subtitle="Needs ESP events" />
        <KPI title="Audience Sync" value="—" subtitle="Connect Ads tooling" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="Emails Sent by Day">
          <MiniLine data={metrics.emailsByDay} />
        </Card>
        <Card title="Lead Engagement (last 14d)">
          <MiniLine data={metrics.engagedByDay} />
        </Card>
      </div>
    </div>
  );
}

function computeMarketing(leads: Lead[], activity: Activity[]) {
  const emailsSent = activity.filter((a) => a.type === "email_sent" || a.type === "followup_resend").length;
  const engaged = leads.filter((l) => l.status === "contacted" || l.status === "qualified").length;
  const resends = activity.filter((a) => a.type === "followup_resend").length;
  const now = Date.now();
  const last14 = Array.from({ length: 14 }).map((_, i) => new Date(now - (13 - i) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const emailsByDay = last14.map((key) => ({ label: key.slice(5), value: activity.filter((a) => a.timestamp.slice(0, 10) === key && (a.type === "email_sent" || a.type === "followup_resend")).length }));
  const engagedByDay = last14.map((key) => ({ label: key.slice(5), value: leads.filter((l) => l.status !== "new" && l.createdAt.slice(0, 10) <= key).length }));
  return { emailsSent, engaged, resends, emailsByDay, engagedByDay };
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
