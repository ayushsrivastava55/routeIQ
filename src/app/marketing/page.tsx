"use client";

import { useEffect, useMemo, useState } from "react";
import type { Activity, Lead } from "@/lib/types";

export default function MarketingPage() {
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
    </div>
  );
}

function computeMarketing(leads: Lead[], activity: Activity[]) {
  const emailsSent = activity.filter((a) => a.type === "email_sent" || a.type === "followup_resend").length;
  const engaged = leads.filter((l) => l.status === "contacted" || l.status === "qualified").length;
  const resends = activity.filter((a) => a.type === "followup_resend").length;
  return { emailsSent, engaged, resends };
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

