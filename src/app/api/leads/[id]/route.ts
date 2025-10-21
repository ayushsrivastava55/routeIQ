import { NextResponse } from "next/server";
import { getComposio } from "@/lib/composio";
import type { Lead } from "@/lib/types";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

    const composio = getComposio();
    const res: any = await (composio.tools as any).proxyExecute({
      toolkitSlug: "hubspot",
      userId,
      data: {
        endpoint: `/crm/v3/objects/contacts/${encodeURIComponent(params.id)}`,
        method: "GET",
        params: {
          properties: "email,firstname,lastname,company,hs_lead_status,hs_lead_score,lastmodifieddate,hubspot_owner_id,createdate",
        },
      },
    });

    const it = res?.data;
    if (!it) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    const p = it.properties || {};
    const first = String(p.firstname || "").trim();
    const last = String(p.lastname || "").trim();
    const name = [first, last].filter(Boolean).join(" ") || (p.email ? String(p.email).split("@")[0] : String(it.id));
    const potentialRaw = Number(p.hs_lead_score ?? 0);
    const potential = Math.min(100, Math.max(0, Number.isFinite(potentialRaw) ? potentialRaw : 0));
    const statusRaw = String(p.hs_lead_status || "new").toLowerCase();
    const status =
      statusRaw.includes("qual") ? ("qualified" as const) :
      statusRaw.includes("won") ? ("won" as const) :
      statusRaw.includes("lost") ? ("lost" as const) :
      statusRaw.includes("open") || statusRaw.includes("contact") ? ("contacted" as const) :
      statusRaw.includes("waiting") || statusRaw.includes("reply") ? ("waiting_reply" as const) :
      ("new" as const);
    const createdAt = (p.createdate as string) || new Date().toISOString();
    const lastContactAt = p.lastmodifieddate || (it.updatedAt as string) || undefined;
    const owner = p.hubspot_owner_id ? String(p.hubspot_owner_id) : undefined;
    const lead: Lead = {
      id: String(it.id),
      name,
      email: String(p.email || "") || `${String(it.id)}@example.com`,
      company: p.company ? String(p.company) : undefined,
      potential,
      status,
      owner,
      createdAt,
      lastContactAt,
    };
    return NextResponse.json({ lead });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 501 });
  }
}
