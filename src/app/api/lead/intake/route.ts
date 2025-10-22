import { NextRequest, NextResponse } from "next/server";
import { getComposio, Composio } from "@/lib/composio";
import { pushActivity } from "@/lib/persist";
import { scoreLeadLLM } from "@/lib/ai";
import type { Lead } from "@/lib/types";

function splitName(full?: string) {
  const n = (full || "").trim();
  if (!n) return { first: "", last: "" };
  const parts = n.split(/\s+/);
  const first = parts.shift() || "";
  const last = parts.join(" ");
  return { first, last };
}

function isBusinessEmail(email: string) {
  const generic = [
    "gmail.com",
    "yahoo.com",
    "outlook.com",
    "hotmail.com",
    "icloud.com",
    "proton.me",
  ];
  const domain = String(email.split("@")[1] || "").toLowerCase();
  return domain && !generic.includes(domain);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      source,
      email,
      name,
      phone,
      company,
      utm = {},
      metadata = {},
      slackChannel,
      enrichmentToolkitSlug,
    } = body || {};

    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });
    if (!email) return NextResponse.json({ error: "email is required" }, { status: 400 });

    const composio = getComposio();

    const { first, last } = splitName(name);

    const searchRes = await (composio.tools as any).proxyExecute({
      toolkitSlug: "hubspot",
      userId,
      data: {
        endpoint: "/crm/v3/objects/contacts/search",
        method: "POST",
        body: {
          filterGroups: [
            {
              filters: [{ propertyName: "email", operator: "EQ", value: email }],
            },
          ],
          properties: ["email", "firstname", "lastname", "phone", "company"],
          limit: 1,
        },
      },
    });

    const found = (searchRes as any)?.data?.results?.[0] || null;

    const properties: Record<string, any> = {
      email,
      firstname: first,
      lastname: last,
      phone: phone || undefined,
      company: company || undefined,
    };

    let hubspotContactId: string | null = null;
    if (found?.id) {
      hubspotContactId = found.id;
      await (composio.tools as any).proxyExecute({
        toolkitSlug: "hubspot",
        userId,
        data: {
          endpoint: `/crm/v3/objects/contacts/${hubspotContactId}`,
          method: "PATCH",
          body: { properties },
        },
      });
    } else {
      const createRes = await (composio.tools as any).proxyExecute({
        toolkitSlug: "hubspot",
        userId,
        data: {
          endpoint: "/crm/v3/objects/contacts",
          method: "POST",
          body: { properties },
        },
      });
      hubspotContactId = (createRes as any)?.data?.id || null;
    }

    let aiScore: number | null = null;
    try {
      const ai = await scoreLeadLLM({ email, name, company, source, utm, metadata });
      aiScore = ai.score;
    } catch {}
    const finalScore = typeof aiScore === "number" ? aiScore : score;

    if (hubspotContactId != null) {
      try {
        await (composio.tools as any).proxyExecute({
          toolkitSlug: "hubspot",
          userId,
          data: {
            endpoint: `/crm/v3/objects/contacts/${hubspotContactId}`,
            method: "PATCH",
            body: { properties: { hs_lead_score: finalScore } },
          },
        });
      } catch {}
    }

    try {
      const leadLike: Lead = {
        id: hubspotContactId || crypto.randomUUID(),
        name: name || email.split("@")[0],
        email,
        company: company || undefined,
        potential: finalScore,
        status: "new",
        createdAt: new Date().toISOString(),
      };
      const activity = await Composio.sendIntroEmail(leadLike);
      pushActivity(activity);
    } catch {}

    let enrichment: any = null;
    if (enrichmentToolkitSlug) {
      try {
        if (enrichmentToolkitSlug.toLowerCase() === "clearbit") {
          const enr = await (composio.tools as any).proxyExecute({
            toolkitSlug: "clearbit",
            userId,
            data: {
              endpoint: `/v2/people/find`,
              method: "GET",
              params: { email },
            },
          });
          enrichment = (enr as any)?.data || null;
        } else if (enrichmentToolkitSlug.toLowerCase() === "apollo") {
          const enr = await (composio.tools as any).proxyExecute({
            toolkitSlug: "apollo",
            userId,
            data: {
              endpoint: "/v1/people/match",
              method: "POST",
              body: { q_organization_domains: [], q_emails: [email] },
            },
          });
          enrichment = (enr as any)?.data || null;
        }
      } catch (e) {
        enrichment = { error: "enrichment_failed" };
      }
    }

    let score = 50;
    if (isBusinessEmail(email)) score += 15;
    if (company) score += 10;
    if (source && /pricing|demo|contact/i.test(String(source))) score += 10;

    const domain = String(email.split("@")[1] || "").toLowerCase();
    const repByDomain: Record<string, { name: string; slackChannel?: string }> = {
      "bigco.com": { name: "Alice", slackChannel: process.env.SLACK_DEFAULT_CHANNEL },
      "enterprise.com": { name: "Bob", slackChannel: process.env.SLACK_DEFAULT_CHANNEL },
    };
    const owner = repByDomain[domain] || { name: "SDR Team", slackChannel: process.env.SLACK_DEFAULT_CHANNEL };

    const channel = slackChannel || owner.slackChannel || process.env.SLACK_DEFAULT_CHANNEL;
    if (channel) {
      const text = `New lead assigned to ${owner.name}:\n- Email: ${email}\n- Name: ${name || ""}\n- Company: ${company || ""}\n- Source: ${source || ""}\n- Score: ${score}\n- HubSpot Contact: ${hubspotContactId || "(pending)"}`;
      try {
        await (composio.tools as any).proxyExecute({
          toolkitSlug: "slack",
          userId,
          data: {
            endpoint: "/chat.postMessage",
            method: "POST",
            body: { channel, text },
          },
        });
      } catch (_) {
      }
    }

    return NextResponse.json(
      {
        ok: true,
        contactId: hubspotContactId,
        score: finalScore,
        enrichment,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("/api/lead/intake error", error);
    return NextResponse.json({ error: "Failed to process lead" }, { status: 500 });
  }
}
