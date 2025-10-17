import { NextResponse } from "next/server";
import { pushActivity } from "@/lib/persist";
import { Composio } from "@/lib/composio";

// Simple assignment rules:
// - potential >= 85 → 'sam'
// - potential >= 70 → 'li'
// - else → 'queue'
export async function POST() {
  try {
    const leads = await Composio.listLeads({});
    const changes: { id: string; owner: string }[] = [];
    for (const l of leads) {
      const target = l.potential >= 85 ? "sam" : l.potential >= 70 ? "li" : "queue";
      if (l.owner !== target) {
        await Composio.assignOwner(l.id, target);
        pushActivity({
          id: crypto.randomUUID(),
          type: "lead_assigned",
          leadId: l.id,
          message: `Assigned to ${target}`,
          timestamp: new Date().toISOString(),
          status: "success",
        });
        changes.push({ id: l.id, owner: target });
      }
    }
    return NextResponse.json({ ok: true, changes });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 501 });
  }
}
