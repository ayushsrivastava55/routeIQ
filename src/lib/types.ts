export type LeadStatus = "new" | "contacted" | "waiting_reply" | "qualified" | "won" | "lost";

export type Lead = {
  id: string;
  name: string;
  email: string;
  company?: string;
  potential: number; // score 0-100
  status: LeadStatus;
  owner?: string; // sales rep
  createdAt: string; // ISO
  lastContactAt?: string; // ISO
};

export type Activity = {
  id: string;
  type:
    | "lead_created"
    | "lead_enriched"
    | "lead_assigned"
    | "email_sent"
    | "slack_notified"
    | "invoice_created"
    | "contract_sent"
    | "followup_resend"
    | "note";
  leadId?: string;
  message: string;
  timestamp: string; // ISO
  meta?: Record<string, unknown>;
  status?: "success" | "error" | "pending";
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
};

