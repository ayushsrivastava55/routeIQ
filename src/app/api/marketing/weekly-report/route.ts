import { NextRequest, NextResponse } from "next/server";
import { getComposio } from "@/lib/composio";
import { loadActivity } from "@/lib/persist";
import { summarizeWeeklyReport } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, channel } = body || {};
    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

    const composio = getComposio();

    // Fetch recent leads from HubSpot
    const leadsRes: any = await (composio.tools as any).proxyExecute({
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

    const items: any[] = leadsRes?.data?.results || [];
    const leads = items.map((it: any) => {
      const p = it.properties || {};
      const statusRaw = String(p.hs_lead_status || "new").toLowerCase();
      const mappedStatus =
        statusRaw.includes("qual") ? "qualified" :
        statusRaw.includes("won") ? "won" :
        statusRaw.includes("lost") ? "lost" :
        statusRaw.includes("open") || statusRaw.includes("contact") ? "contacted" :
        statusRaw.includes("waiting") || statusRaw.includes("reply") ? "waiting_reply" :
        "new";
      return { createdAt: (p.createdate as string) || new Date().toISOString(), status: mappedStatus };
    });

    // Activity-derived metrics
    const activity = loadActivity();
    const emailsSent = activity.filter((a) => a.type === "email_sent" || a.type === "followup_resend").length;
    const engaged = leads.filter((l) => l.status === "contacted" || l.status === "qualified").length;
    const resends = activity.filter((a) => a.type === "followup_resend").length;

    const metrics = { emailsSent, engaged, resends };
    const summary = await summarizeWeeklyReport(metrics);

    const resolvedChannel = channel || process.env.SLACK_DEFAULT_CHANNEL;
    if (resolvedChannel) {
      try {
        await (composio.tools as any).proxyExecute({
          toolkitSlug: "slack",
          userId,
          data: {
            endpoint: "/chat.postMessage",
            method: "POST",
            body: { channel: resolvedChannel, text: `Weekly report\n\n${summary}` },
          },
        });
      } catch {}
    }

    return NextResponse.json({ ok: true, metrics, summary });
  } catch (error) {
    return NextResponse.json({ error: "Failed to post weekly report" }, { status: 500 });
  }
}
