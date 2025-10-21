import { NextResponse } from "next/server";
import { pushActivity } from "@/lib/persist";
import { getComposio } from "@/lib/composio";

// Simple assignment rules:
// - potential >= 85 → 'sam'
// - potential >= 70 → 'li'
// - else → 'queue'
export async function POST(req: Request) {
  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

    const composio = getComposio();
    const res: any = await (composio.tools as any).proxyExecute({
      toolkitSlug: "hubspot",
      userId,
      data: {
        endpoint: "/crm/v3/objects/contacts/search",
        method: "POST",
        body: {
          limit: 100,
          properties: [
            "email",
            "firstname",
            "lastname",
            "company",
            "hs_lead_status",
            "hs_lead_score",
            "hubspot_owner_id",
          ],
        },
      },
    });

    const ownerMapRaw = process.env.HUBSPOT_OWNER_MAP || "{}";
    let ownerMap: Record<string, string> = {};
    try { ownerMap = JSON.parse(ownerMapRaw); } catch {}

    const items: any[] = res?.data?.results || [];
    const changes: { id: string; owner: string }[] = [];
    for (const it of items) {
      const p = it.properties || {};
      const id = String(it.id);
      const potential = Math.min(100, Math.max(0, Number(p.hs_lead_score ?? 0)));
      const target = potential >= 85 ? "sam" : potential >= 70 ? "li" : "queue";
      const targetOwnerId = ownerMap[target];
      if (!targetOwnerId) continue;
      if (String(p.hubspot_owner_id || "") === String(targetOwnerId)) continue;
      await (composio.tools as any).proxyExecute({
        toolkitSlug: "hubspot",
        userId,
        data: {
          endpoint: `/crm/v3/objects/contacts/${encodeURIComponent(id)}`,
          method: "PATCH",
          body: { properties: { hubspot_owner_id: targetOwnerId } },
        },
      });
      pushActivity({
        id: crypto.randomUUID(),
        type: "lead_assigned",
        leadId: id,
        message: `Assigned to ${target}`,
        timestamp: new Date().toISOString(),
        status: "success",
      });
      changes.push({ id, owner: target });
    }

    return NextResponse.json({ ok: true, changes });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 501 });
  }
}
