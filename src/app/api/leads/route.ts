import { NextResponse } from "next/server";
import { getComposio } from "@/lib/composio";
import type { Lead } from "@/lib/types";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const potentialMin = Number(searchParams.get("potentialMin") ?? 0);
  const potentialMax = Number(searchParams.get("potentialMax") ?? 100);
  const status = searchParams.get("status") || "";
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

  try {
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
            "lastmodifieddate",
            "hubspot_owner_id",
            "createdate",
          ],
        },
      },
    });

    const items: any[] = res?.data?.results || [];
    const leads: Lead[] = items.map((it: any) => {
      const p = it.properties || {};
      const id = String(it.id);
      const first = String(p.firstname || "").trim();
      const last = String(p.lastname || "").trim();
      const name = [first, last].filter(Boolean).join(" ") || (p.email ? String(p.email).split("@")[0] : id);
      const potentialRaw = Number(p.hs_lead_score ?? 0);
      const potential = Math.min(100, Math.max(0, Number.isFinite(potentialRaw) ? potentialRaw : 0));
      const statusRaw = String(p.hs_lead_status || "new").toLowerCase();
      const mappedStatus =
        statusRaw.includes("qual") ? ("qualified" as const) :
        statusRaw.includes("won") ? ("won" as const) :
        statusRaw.includes("lost") ? ("lost" as const) :
        statusRaw.includes("open") || statusRaw.includes("contact") ? ("contacted" as const) :
        statusRaw.includes("waiting") || statusRaw.includes("reply") ? ("waiting_reply" as const) :
        ("new" as const);
      const createdAt = (p.createdate as string) || new Date().toISOString();
      const lastContactAt = p.lastmodifieddate || (it.updatedAt as string) || undefined;
      const owner = p.hubspot_owner_id ? String(p.hubspot_owner_id) : undefined;
      return {
        id,
        name,
        email: String(p.email || "") || `${id}@example.com`,
        company: p.company ? String(p.company) : undefined,
        potential,
        status: mappedStatus,
        owner,
        createdAt,
        lastContactAt,
      } satisfies Lead;
    });

    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;
    const filtered = leads.filter((l) => {
      if (l.potential < potentialMin || l.potential > potentialMax) return false;
      if (status && l.status !== status) return false;
      if (fromDate && new Date(l.createdAt) < fromDate) return false;
      if (toDate && new Date(l.createdAt) > toDate) return false;
      return true;
    });

    return NextResponse.json({ leads: filtered });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 501 });
  }
}
