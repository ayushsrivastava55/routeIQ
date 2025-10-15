import { NextRequest, NextResponse } from "next/server";
import { getComposio } from "@/lib/composio";

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

    const accounts = await composio.connectedAccounts.list({ userIds: [userId] });
    const items = accounts?.items || [];
    const hubspotAcc = items.find((a: any) => a?.toolkit?.slug?.toLowerCase() === "hubspot");
    const slackAcc = items.find((a: any) => a?.toolkit?.slug?.toLowerCase() === "slack");
    const clearbitAcc = items.find((a: any) => a?.toolkit?.slug?.toLowerCase() === "clearbit");
    const apolloAcc = items.find((a: any) => a?.toolkit?.slug?.toLowerCase() === "apollo");
    if (!hubspotAcc?.id) return NextResponse.json({ error: "hubspot connected account not found" }, { status: 400 });

    const searchRes = await composio.tools.proxyExecute({
      endpoint: "/crm/v3/objects/contacts/search",
      method: "POST",
      connectedAccountId: hubspotAcc.id,
      body: {
        filterGroups: [
          {
            filters: [{ propertyName: "email", operator: "EQ", value: email }],
          },
        ],
        properties: ["email", "firstname", "lastname", "phone", "company"],
        limit: 1,
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
      await composio.tools.proxyExecute({
        endpoint: `/crm/v3/objects/contacts/${hubspotContactId}`,
        method: "PATCH",
        connectedAccountId: hubspotAcc.id,
        body: { properties },
      });
    } else {
      const createRes = await composio.tools.proxyExecute({
        endpoint: "/crm/v3/objects/contacts",
        method: "POST",
        connectedAccountId: hubspotAcc.id,
        body: { properties },
      });
      hubspotContactId = (createRes as any)?.data?.id || null;
    }

    let enrichment: any = null;
    if (enrichmentToolkitSlug) {
      try {
        if (enrichmentToolkitSlug.toLowerCase() === "clearbit") {
          if (clearbitAcc?.id) {
            const enr = await composio.tools.proxyExecute({
              endpoint: `/v2/people/find`,
              method: "GET",
              connectedAccountId: clearbitAcc.id,
              parameters: [
                { name: "email", value: email, in: "query" },
              ],
            });
            enrichment = (enr as any)?.data || null;
          }
        } else if (enrichmentToolkitSlug.toLowerCase() === "apollo") {
          if (apolloAcc?.id) {
            const enr = await composio.tools.proxyExecute({
              endpoint: "/v1/people/match",
              method: "POST",
              connectedAccountId: apolloAcc.id,
              body: { q_organization_domains: [], q_emails: [email] },
            });
            enrichment = (enr as any)?.data || null;
          }
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
    if (channel && slackAcc?.id) {
      const text = `New lead assigned to ${owner.name}:\n- Email: ${email}\n- Name: ${name || ""}\n- Company: ${company || ""}\n- Source: ${source || ""}\n- Score: ${score}\n- HubSpot Contact: ${hubspotContactId || "(pending)"}`;
      try {
        await composio.tools.proxyExecute({
          endpoint: "/chat.postMessage",
          method: "POST",
          connectedAccountId: slackAcc.id,
          body: { channel, text },
        });
      } catch (_) {
      }
    }

    return NextResponse.json(
      {
        ok: true,
        contactId: hubspotContactId,
        score,
        enrichment,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("/api/lead/intake error", error);
    return NextResponse.json({ error: "Failed to process lead" }, { status: 500 });
  }
}
