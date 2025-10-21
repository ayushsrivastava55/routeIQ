// Optional real Composio client wiring. Falls back to stub if not configured.
// This keeps networked calls behind env gates.

import type { Lead } from "@/lib/types";
import { Composio as ComposioSDK } from "@composio/core";

type RealClient = {
  email: { sendIntro: (lead: Lead) => Promise<void> };
  slack: { notify: (lead: Lead, channel?: string) => Promise<void> };
  billing: { invoice: (lead: Lead, amount: number) => Promise<void> };
  crm?: {
    listLeads: (q: {
      potentialMin?: number;
      potentialMax?: number;
      status?: string;
      from?: string;
      to?: string;
    }) => Promise<Lead[]>;
    getLeadById: (id: string) => Promise<Lead | null>;
    assignOwner: (id: string, owner: string) => Promise<void>;
  };
};

let sdk: InstanceType<typeof ComposioSDK> | null = null;
function getSdk() {
  if (!sdk) sdk = new ComposioSDK({ apiKey: process.env.COMPOSIO_API_KEY || undefined });
  return sdk;
}

export function getRealComposio(): RealClient | null {
  if (!process.env.COMPOSIO_API_KEY) return null;

  const CRM_ACCOUNT_ID = process.env.COMPOSIO_CRM_ACCOUNT_ID; // e.g., conn_xxx (HubSpot)
  const CRM_TOOLKIT = (process.env.COMPOSIO_CRM_TOOLKIT || "hubspot").toLowerCase();
  const SLACK_ACCOUNT_ID = process.env.COMPOSIO_SLACK_ACCOUNT_ID;
  const GMAIL_ACCOUNT_ID = process.env.COMPOSIO_GMAIL_ACCOUNT_ID;
  const STRIPE_ACCOUNT_ID = process.env.COMPOSIO_STRIPE_ACCOUNT_ID;

  return {
    email: {
      async sendIntro(lead) {
        if (!GMAIL_ACCOUNT_ID) throw new Error("Set COMPOSIO_GMAIL_ACCOUNT_ID to send email via Composio");
        const composio = getSdk();
        const subject = `Welcome, ${lead.name}`;
        const body = `Hi ${lead.name || "there"},\n\nThanks for your interest. Happy to help with your evaluation.\n\nBest,\nRouteIQ`;
        const raw = [
          `To: ${lead.email}`,
          `Subject: ${subject}`,
          "Content-Type: text/plain; charset=UTF-8",
          "",
          body,
        ].join("\r\n");
        const rawB64 = Buffer.from(raw).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
        await composio.tools.proxyExecute({
          endpoint: "/gmail/v1/users/me/messages/send",
          method: "POST",
          connectedAccountId: GMAIL_ACCOUNT_ID,
          body: { raw: rawB64 },
        });
      },
    },
    slack: {
      async notify(lead, channel) {
        if (!SLACK_ACCOUNT_ID) throw new Error("Set COMPOSIO_SLACK_ACCOUNT_ID to notify Slack via Composio");
        const composio = getSdk();
        const text = `New lead: ${lead.name} <${lead.email}> (${lead.company ?? "-"})`;
        const resolved = channel || process.env.SLACK_DEFAULT_CHANNEL || "#sales";
        await composio.tools.proxyExecute({
          endpoint: "/chat.postMessage",
          method: "POST",
          connectedAccountId: SLACK_ACCOUNT_ID,
          body: { channel: resolved, text },
        });
      },
    },
    billing: {
      async invoice(lead, amount) {
        if (!STRIPE_ACCOUNT_ID) throw new Error("Set COMPOSIO_STRIPE_ACCOUNT_ID to invoice via Composio");
        const composio = getSdk();
        const search: any = await composio.tools.proxyExecute({
          endpoint: "/v1/customers/search",
          method: "GET",
          connectedAccountId: STRIPE_ACCOUNT_ID,
          parameters: [
            { name: "query", value: `email:'${lead.email}'`, in: "query" },
          ],
        });
        let customerId: string | null = search?.data?.data?.[0]?.id || null;
        if (!customerId) {
          const created: any = await composio.tools.proxyExecute({
            endpoint: "/v1/customers",
            method: "POST",
            connectedAccountId: STRIPE_ACCOUNT_ID,
            body: { email: lead.email, name: lead.name || lead.email },
          });
          customerId = created?.data?.id || null;
        }
        if (!customerId) throw new Error("Failed to resolve Stripe customer");
        const amountCents = Math.round(Number(amount) * 100);
        await composio.tools.proxyExecute({
          endpoint: "/v1/invoiceitems",
          method: "POST",
          connectedAccountId: STRIPE_ACCOUNT_ID,
          body: { customer: customerId, amount: amountCents, currency: "usd", description: `Invoice for ${lead.name}` },
        });
        const invoiceCreate: any = await composio.tools.proxyExecute({
          endpoint: "/v1/invoices",
          method: "POST",
          connectedAccountId: STRIPE_ACCOUNT_ID,
          body: { customer: customerId, collection_method: "send_invoice", days_until_due: 14 },
        });
        const invoiceId: string | null = invoiceCreate?.data?.id || null;
        if (invoiceId) {
          await composio.tools.proxyExecute({
            endpoint: `/v1/invoices/${invoiceId}/finalize`,
            method: "POST",
            connectedAccountId: STRIPE_ACCOUNT_ID,
          });
        }
      },
    },
    crm: {
      async listLeads(q) {
        if (!CRM_ACCOUNT_ID) throw new Error("Set COMPOSIO_CRM_ACCOUNT_ID to use CRM via Composio");
        const composio = getSdk();
        // HubSpot: search contacts with desired properties
        const res: any = await composio.tools.proxyExecute({
          endpoint: "/crm/v3/objects/contacts/search",
          method: "POST",
          connectedAccountId: CRM_ACCOUNT_ID,
          body: {
            limit: 50,
            properties: [
              "email",
              "firstname",
              "lastname",
              "company",
              "hs_lead_status",
              "hs_lead_score",
              "lastmodifieddate",
              "hubspot_owner_id",
            ],
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
          const status =
            statusRaw.includes("qual") ? ("qualified" as const) :
            statusRaw.includes("won") ? ("won" as const) :
            statusRaw.includes("lost") ? ("lost" as const) :
            statusRaw.includes("open") || statusRaw.includes("contact") ? ("contacted" as const) :
            statusRaw.includes("waiting") || statusRaw.includes("reply") ? ("waiting_reply" as const) :
            ("new" as const);
          const createdAt = (it.createdAt as string) || new Date().toISOString();
          const lastContactAt = p.lastmodifieddate || (it.updatedAt as string) || undefined;
          const owner = p.hubspot_owner_id ? String(p.hubspot_owner_id) : undefined;
          return {
            id,
            name,
            email: String(p.email || "") || `${id}@example.com`,
            company: p.company ? String(p.company) : undefined,
            potential,
            status,
            owner,
            createdAt,
            lastContactAt,
          } satisfies Lead;
        });

        // Apply filters locally
        const min = q?.potentialMin ?? 0;
        const max = q?.potentialMax ?? 100;
        const statusFilter = q?.status ? String(q.status) : "";
        const from = q?.from ? new Date(q.from) : null;
        const to = q?.to ? new Date(q.to) : null;
        return leads.filter((l) => {
          if (l.potential < min || l.potential > max) return false;
          if (statusFilter && l.status !== statusFilter) return false;
          if (from && new Date(l.createdAt) < from) return false;
          if (to && new Date(l.createdAt) > to) return false;
          return true;
        });
      },
      async getLeadById(id) {
        if (!CRM_ACCOUNT_ID) throw new Error("Set COMPOSIO_CRM_ACCOUNT_ID to use CRM via Composio");
        const composio = getSdk();
        const res: any = await composio.tools.proxyExecute({
          endpoint: `/crm/v3/objects/contacts/${encodeURIComponent(id)}`,
          method: "GET",
          connectedAccountId: CRM_ACCOUNT_ID,
        });
        const it = res?.data;
        if (!it) return null;
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
        const createdAt = (it.createdAt as string) || new Date().toISOString();
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
        return lead;
      },
      async assignOwner(id, owner) {
        if (!CRM_ACCOUNT_ID) throw new Error("Set COMPOSIO_CRM_ACCOUNT_ID to use CRM via Composio");
        const mapRaw = process.env.HUBSPOT_OWNER_MAP || "{}";
        let map: Record<string, string> = {};
        try { map = JSON.parse(mapRaw); } catch {}
        const ownerId = map[owner];
        if (!ownerId) throw new Error("HubSpot owner mapping not found for " + owner);
        const composio = getSdk();
        await composio.tools.proxyExecute({
          endpoint: `/crm/v3/objects/contacts/${encodeURIComponent(id)}`,
          method: "PATCH",
          connectedAccountId: CRM_ACCOUNT_ID,
          body: { properties: { hubspot_owner_id: ownerId } },
        });
      },
    },
  };
}
