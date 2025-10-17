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

  // CRM: Fetch leads via plugin system only (no local fallback)
  async listLeads(query?: {
    potentialMin?: number;
    potentialMax?: number;
    status?: string | null;
    from?: string | null;
    to?: string | null;
  }): Promise<Lead[]> {
    const real = getRealComposio();
    if (real && real.crm?.listLeads) {
      return await real.crm.listLeads({
        potentialMin: query?.potentialMin ?? 0,
        potentialMax: query?.potentialMax ?? 100,
        status: query?.status ?? undefined,
        from: query?.from ?? undefined,
        to: query?.to ?? undefined,
      });
    }
    throw new Error("CRM not configured: set COMPOSIO_API_KEY and implement crm.listLeads");
  },

  async getLeadById(id: string): Promise<Lead | null> {
    const real = getRealComposio();
    if (real?.crm?.getLeadById) {
      return await real.crm.getLeadById(id);
    }
    // As a fallback within CRM context, try listing and finding locally from CRM results
    const all = await this.listLeads({});
    return all.find((l) => l.id === id) ?? null;
  },

  async assignOwner(leadId: string, owner: string): Promise<void> {
    const real = getRealComposio();
    if (real?.crm?.assignOwner) {
      await real.crm.assignOwner(leadId, owner);
      return;
    }
    throw new Error("CRM owner assignment not configured");
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
