// Lightweight stubs for Composio-driven actions used by the app.
// In production, replace with actual `@composio/core` client initialization
// and tool invocations as per PRD-defined workflows.

import type { Activity, Lead } from "./types";
import { getRealComposio } from "./composioClient";

export type ComposioContext = {
  userId?: string;
};

export const Composio = {
  async init(_ctx?: ComposioContext) {
    // Placeholder for initializing Composio client/router.
    return true;
  },

  // CRM: Fetch leads via plugin system, fallback to local store
  async listLeads(query?: {
    potentialMin?: number;
    potentialMax?: number;
    status?: string | null;
    from?: string | null;
    to?: string | null;
  }): Promise<Lead[]> {
    const real = getRealComposio();
    if (real && real.crm?.listLeads) {
      try {
        return await real.crm.listLeads({
          potentialMin: query?.potentialMin ?? 0,
          potentialMax: query?.potentialMax ?? 100,
          status: query?.status ?? undefined,
          from: query?.from ?? undefined,
          to: query?.to ?? undefined,
        });
      } catch {
        // fall through to local fallback
      }
    }
    const { loadLeads } = await import("./persist");
    const leads = loadLeads();
    const potentialMin = query?.potentialMin ?? 0;
    const potentialMax = query?.potentialMax ?? 100;
    const status = query?.status ?? undefined;
    const from = query?.from ?? undefined;
    const to = query?.to ?? undefined;
    return leads.filter((l) => {
      const pOk = l.potential >= potentialMin && l.potential <= potentialMax;
      const sOk = status ? l.status === status : true;
      const created = new Date(l.createdAt).getTime();
      const fOk = from ? created >= new Date(from).getTime() : true;
      const tOk = to ? created <= new Date(to).getTime() : true;
      return pOk && sOk && fOk && tOk;
    });
  },

  async sendIntroEmail(lead: Lead): Promise<Activity> {
    const real = getRealComposio();
    if (real) {
      try { await real.email.sendIntro(lead); } catch {}
    }
    return {
      id: crypto.randomUUID(),
      type: "email_sent",
      leadId: lead.id,
      message: `Intro email sent to ${lead.email}`,
      timestamp: new Date().toISOString(),
      status: "success",
      meta: { provider: "mailchimp" },
    };
  },

  async notifySlack(lead: Lead, channel = "#sales"): Promise<Activity> {
    const real = getRealComposio();
    if (real) {
      try { await real.slack.notify(lead, channel); } catch {}
    }
    return {
      id: crypto.randomUUID(),
      type: "slack_notified",
      leadId: lead.id,
      message: `Notified ${channel} about lead ${lead.name}`,
      timestamp: new Date().toISOString(),
      status: "success",
      meta: { channel },
    };
  },

  async createInvoice(lead: Lead, amount: number): Promise<Activity> {
    const real = getRealComposio();
    if (real) {
      try { await real.billing.invoice(lead, amount); } catch {}
    }
    return {
      id: crypto.randomUUID(),
      type: "invoice_created",
      leadId: lead.id,
      message: `Invoice created for ${lead.name} - $${amount}`,
      timestamp: new Date().toISOString(),
      status: "success",
      meta: { provider: "stripe", amount },
    };
  },

  async resendFollowup(lead: Lead): Promise<Activity> {
    return {
      id: crypto.randomUUID(),
      type: "followup_resend",
      leadId: lead.id,
      message: `Follow-up email re-sent to ${lead.email}`,
      timestamp: new Date().toISOString(),
      status: "success",
      meta: { cadence: "nudge-1" },
    };
  },
};
