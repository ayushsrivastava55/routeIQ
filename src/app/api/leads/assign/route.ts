import { NextResponse } from "next/server";
import { loadLeads, saveLeads, pushActivity } from "@/lib/persist";

// Simple assignment rules:
// - potential >= 85 → 'sam'
// - potential >= 70 → 'li'
// - else → 'queue'
export async function POST() {
  const leads = loadLeads();
  const updated = leads.map((l) => {
    const prev = l.owner;
    if (l.potential >= 85) l.owner = "sam";
    else if (l.potential >= 70) l.owner = "li";
    else l.owner = "queue";
    if (l.owner !== prev) {
      pushActivity({
        id: crypto.randomUUID(),
        type: "lead_assigned",
        leadId: l.id,
        message: `Assigned to ${l.owner}`,
        timestamp: new Date().toISOString(),
        status: "success",
      });
    }
    return l;
  });
  saveLeads(updated);
  return NextResponse.json({ ok: true, leads: updated });
}

