// Lightweight stubs for Composio-driven actions used by the app.
// In production, replace with actual `@composio/core` client initialization
// and tool invocations as per PRD-defined workflows.

import type { Activity, Lead } from "./types";

export type ComposioContext = {
  userId?: string;
};

export const Composio = {
  async init(_ctx?: ComposioContext) {
    // Placeholder for initializing Composio client/router.
    return true;
  },

  async sendIntroEmail(lead: Lead): Promise<Activity> {
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

