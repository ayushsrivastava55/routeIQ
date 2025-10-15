"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Activity, Email, Lead } from "@/lib/types";

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(null);
  const [emails, setEmails] = useState<Email[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [leadRes, emailRes, actRes] = await Promise.all([
        fetch(`/api/leads/${params.id}`),
        fetch(`/api/leads/${params.id}/emails`),
        fetch(`/api/activity`),
      ]);
      const leadData = await leadRes.json();
      const emailData = await emailRes.json();
      const actData = await actRes.json();
      setLead(leadData.lead);
      setEmails(emailData.emails || []);
      setActivity((actData.activity || []).filter((a: Activity) => a.leadId === params.id));
      setLoading(false);
    }
    load();
  }, [params.id]);

  if (loading) return <div>Loading...</div>;
  if (!lead) return <div>Lead not found</div>;

  return (
    <div className="space-y-6">
      <button className="text-sm opacity-70 hover:underline" onClick={() => router.push("/leads")}>
        ← Back to leads
      </button>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{lead.name}</h1>
          <div className="text-sm opacity-80">{lead.email} · {lead.company ?? "—"}</div>
          <div className="mt-2 flex gap-2 text-xs">
            <Badge>{lead.status.replace("_", " ")}</Badge>
            <Badge>Potential {lead.potential}</Badge>
            {lead.owner ? <Badge>Owner {lead.owner}</Badge> : null}
          </div>
        </div>
        <div className="flex gap-2">
          <Action onClick={() => resend(lead.id)}>Resend</Action>
          <Action onClick={() => notify(lead.id)}>Notify</Action>
          <Action onClick={() => invoice(lead.id, 500)}>Invoice $500</Action>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <section className="md:col-span-2 border rounded p-3 border-black/10 dark:border-white/10">
          <h2 className="font-medium mb-2">Emails</h2>
          {emails.length === 0 ? (
            <div className="text-sm opacity-70">No emails yet.</div>
          ) : (
            <ul className="space-y-3">
              {emails.map((e) => (
                <li key={e.id} className="border rounded p-3 border-black/10 dark:border-white/10">
                  <div className="text-sm font-medium">{e.subject}</div>
                  <div className="text-xs opacity-70 mb-2">{new Date(e.timestamp).toLocaleString()} · {e.from} → {e.to}</div>
                  <pre className="whitespace-pre-wrap text-sm opacity-90">{e.body}</pre>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="border rounded p-3 border-black/10 dark:border-white/10">
          <h2 className="font-medium mb-2">Activity</h2>
          {activity.length === 0 ? (
            <div className="text-sm opacity-70">No activity for this lead.</div>
          ) : (
            <ul className="space-y-2">
              {activity.map((a) => (
                <li key={a.id} className="text-sm">
                  <span className="opacity-70">{new Date(a.timestamp).toLocaleString()} · </span>
                  <span className="font-medium">{a.type.replace("_", " ")}</span>
                  <span className="opacity-80"> — {a.message}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );

  async function resend(id: string) {
    await fetch(`/api/leads/${id}/resend`, { method: "POST" });
    const act = await fetch(`/api/activity`).then((r) => r.json());
    setActivity((act.activity || []).filter((a: Activity) => a.leadId === id));
  }
  async function notify(id: string) {
    await fetch("/api/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "slack_notified", leadId: id, message: "Notified #sales", status: "success" }),
    });
    const act = await fetch(`/api/activity`).then((r) => r.json());
    setActivity((act.activity || []).filter((a: Activity) => a.leadId === id));
  }
  async function invoice(id: string, amount: number) {
    await fetch("/api/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "invoice_created", leadId: id, message: `Invoice created $${amount}`, status: "success", meta: { amount } }),
    });
    const act = await fetch(`/api/activity`).then((r) => r.json());
    setActivity((act.activity || []).filter((a: Activity) => a.leadId === id));
  }
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="inline-block px-2 py-0.5 rounded bg-black/5 dark:bg-white/10 text-xs">{children}</span>;
}

function Action({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="px-3 py-2 rounded border border-black/10 dark:border-white/10 hover:bg-black/[.03] dark:hover:bg-white/[.07] text-sm">
      {children}
    </button>
  );
}

