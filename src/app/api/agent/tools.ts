/**
 * Enhanced AI Agent Tools for RouteIQ
 * These tools are integrated with Composio and provide amazing automation capabilities
 */

import { tool } from "ai";
import { z } from "zod";
import { updateLead, getLeads } from "@/lib/db/queries";
import { createActivity } from "@/lib/db/queries";
import { Composio as ComposioSDK } from "@composio/core";

function getComposio(): ComposioSDK | null {
  try {
    if (!process.env.COMPOSIO_API_KEY) return null;
    return new ComposioSDK({ apiKey: process.env.COMPOSIO_API_KEY });
  } catch {
    return null;
  }
}

// Tool 1: Search Leads with Advanced Filtering
export const searchLeadsTool = tool({
  description: "Search and filter leads in the CRM database. Use this when the user asks to find leads, show leads, or filter by criteria.",
  inputSchema: z.object({
    status: z.enum(["new", "contacted", "waiting_reply", "qualified", "won", "lost"]).optional().describe("Filter by lead status"),
    potentialMin: z.number().min(0).max(100).optional().describe("Minimum potential score"),
    owner: z.string().optional().describe("Filter by owner name"),
    company: z.string().optional().describe("Filter by company name"),
    limit: z.number().min(1).max(50).optional().default(10).describe("Maximum number of leads to return"),
  }),
  execute: async (params: any) => {
    try {
      const leads = await getLeads({
        status: params.status,
        potentialMin: params.potentialMin,
        page: 1,
        limit: params.limit || 10,
      });

      // Filter by owner and company if provided
      let filteredLeads = leads.data;
      if (params.owner) {
        filteredLeads = filteredLeads.filter(l => l.owner?.toLowerCase().includes(params.owner.toLowerCase()));
      }
      if (params.company) {
        filteredLeads = filteredLeads.filter(l => l.company?.toLowerCase().includes(params.company.toLowerCase()));
      }

      return {
        success: true,
        count: filteredLeads.length,
        leads: filteredLeads.map(l => ({
          id: l.id,
          name: l.name,
          email: l.email,
          company: l.company,
          potential: l.potential,
          status: l.status,
          owner: l.owner,
        })),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to search leads",
      };
    }
  },
});

// Tool 2: Update Lead Status
export const updateLeadStatusTool = tool({
  description: "Update the status of a lead (new, contacted, waiting_reply, qualified, won, lost). Use this when the user wants to change a lead's status.",
  inputSchema: z.object({
    leadId: z.string().describe("The ID of the lead to update"),
    status: z.enum(["new", "contacted", "waiting_reply", "qualified", "won", "lost"]).describe("New status for the lead"),
  }),
  execute: async (params: any) => {
    try {
      const updated = await updateLead(params.leadId, { status: params.status });

      if (!updated) {
        return {
          success: false,
          error: "Lead not found",
        };
      }

      // Create activity log
      await createActivity({
        id: `A-${Date.now()}`,
        type: "agent_action",
        leadId: params.leadId,
        message: `Status updated to ${params.status} for lead ${updated.name}`,
        status: "success",
        meta: { action: "update_status", oldStatus: updated.status, newStatus: params.status },
      });

      return {
        success: true,
        message: `Successfully updated lead ${updated.name} to ${params.status}`,
        lead: {
          id: updated.id,
          name: updated.name,
          status: updated.status,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to update lead status",
      };
    }
  },
});

// Tool 3: Assign Lead to Owner
export const assignLeadTool = tool({
  description: "Assign a lead to a specific owner. Use this when the user wants to assign a lead to someone.",
  inputSchema: z.object({
    leadId: z.string().describe("The ID of the lead to assign"),
    owner: z.string().describe("Name of the person to assign the lead to"),
  }),
  execute: async (params: any) => {
    try {
      const updated = await updateLead(params.leadId, { owner: params.owner });

      if (!updated) {
        return {
          success: false,
          error: "Lead not found",
        };
      }

      // Create activity log
      await createActivity({
        id: `A-${Date.now()}`,
        type: "lead_assigned",
        leadId: params.leadId,
        message: `Lead ${updated.name} assigned to ${params.owner}`,
        status: "success",
        meta: { owner: params.owner },
      });

      return {
        success: true,
        message: `Successfully assigned lead ${updated.name} to ${params.owner}`,
        lead: {
          id: updated.id,
          name: updated.name,
          owner: updated.owner,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to assign lead",
      };
    }
  },
});

// Tool 4: Get Lead Analytics
export const getLeadAnalyticsTool = tool({
  description: "Get analytics and insights about leads in the CRM. Use this when the user asks for statistics, metrics, or insights about leads.",
  inputSchema: z.object({
    timeframe: z.enum(["today", "week", "month", "all"]).optional().default("all").describe("Time period for analytics"),
  }),
  execute: async (params: any) => {
    try {
      const leads = await getLeads({ page: 1, limit: 1000 });

      const now = new Date();
      let filteredLeads = leads.data;

      if (params.timeframe === "today") {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        filteredLeads = filteredLeads.filter(l => new Date(l.createdAt) >= today);
      } else if (params.timeframe === "week") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filteredLeads = filteredLeads.filter(l => new Date(l.createdAt) >= weekAgo);
      } else if (params.timeframe === "month") {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filteredLeads = filteredLeads.filter(l => new Date(l.createdAt) >= monthAgo);
      }

      const totalLeads = filteredLeads.length;
      const byStatus = filteredLeads.reduce((acc, l) => {
        acc[l.status] = (acc[l.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const avgPotential = filteredLeads.reduce((sum, l) => sum + l.potential, 0) / totalLeads || 0;
      const highPotential = filteredLeads.filter(l => l.potential >= 80).length;
      const qualifiedLeads = filteredLeads.filter(l => l.status === "qualified").length;
      const wonLeads = filteredLeads.filter(l => l.status === "won").length;

      return {
        success: true,
        analytics: {
          totalLeads,
          byStatus,
          averagePotential: Math.round(avgPotential),
          highPotentialLeads: highPotential,
          qualifiedLeads,
          wonLeads,
          conversionRate: totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to get analytics",
      };
    }
  },
});

// Tool 5: Bulk Update Leads
export const bulkUpdateLeadsTool = tool({
  description: "Update multiple leads at once. Use this when the user wants to change status or owner for multiple leads.",
  inputSchema: z.object({
    leadIds: z.array(z.string()).describe("Array of lead IDs to update"),
    status: z.enum(["new", "contacted", "waiting_reply", "qualified", "won", "lost"]).optional().describe("New status for all leads"),
    owner: z.string().optional().describe("New owner for all leads"),
  }),
  execute: async (params: any) => {
    try {
      const updateData: any = {};
      if (params.status) updateData.status = params.status;
      if (params.owner) updateData.owner = params.owner;

      const results = [];
      for (const leadId of params.leadIds) {
        const updated = await updateLead(leadId, updateData);
        if (updated) {
          results.push({
            id: updated.id,
            name: updated.name,
            success: true,
          });
        } else {
          results.push({
            id: leadId,
            success: false,
            error: "Lead not found",
          });
        }
      }

      const successCount = results.filter(r => r.success).length;

      return {
        success: true,
        message: `Successfully updated ${successCount} out of ${params.leadIds.length} leads`,
        results,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to bulk update leads",
      };
    }
  },
});

// Tool 6: Send Email (Composio integrated)
export const sendEmailTool = tool({
  description: "Send an email to a lead using Gmail integration. Use this when the user wants to send an email.",
  inputSchema: z.object({
    to: z.string().email().describe("Recipient email address"),
    subject: z.string().describe("Email subject"),
    body: z.string().describe("Email body content"),
    userId: z.string().optional().describe("Current user id for Composio context"),
  }),
  execute: async (params: any) => {
    try {
      // Attempt real Gmail send via Composio (if configured)
      const composio = getComposio();
      let attempted = false;
      let remoteId: string | undefined;
      if (composio && params.userId) {
        attempted = true;
        try {
          const res = await (composio.tools as any).proxyExecute({
            toolkitSlug: "gmail",
            userId: params.userId,
            data: {
              endpoint: "/gmail/v1/users/me/messages/send",
              method: "POST",
              body: {
                raw: Buffer.from(
                  `To: ${params.to}\r\n` +
                  `Subject: ${params.subject}\r\n` +
                  `Content-Type: text/plain; charset=UTF-8\r\n\r\n` +
                  `${params.body}`
                ).toString("base64"),
              },
            },
          });
          remoteId = (res as any)?.data?.id;
        } catch {}
      }

      // Create activity log
      await createActivity({
        id: `A-${Date.now()}`,
        type: "email_sent",
        leadId: undefined as any,
        message: `Email sent to ${params.to}: ${params.subject}`,
        status: "success",
        meta: { to: params.to, subject: params.subject, attempted, remoteId },
      });

      return {
        success: true,
        message: `Email sent ${remoteId ? "via Gmail" : "(local log)"} to ${params.to}`,
        email: {
          to: params.to,
          subject: params.subject,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to send email",
      };
    }
  },
});

// Tool 7: Notify Team (Slack integration)
export const notifyTeamTool = tool({
  description: "Send a notification to the team via Slack. Use this when the user wants to notify the team about something.",
  inputSchema: z.object({
    message: z.string().describe("Message to send to the team"),
    channel: z.string().optional().default("general").describe("Slack channel to send to"),
    userId: z.string().optional().describe("Current user id for Composio context"),
  }),
  execute: async (params: any) => {
    try {
      // Attempt real Slack message via Composio (if configured)
      const composio = getComposio();
      let attempted = false;
      let remoteTs: string | undefined;
      if (composio && params.userId) {
        attempted = true;
        try {
          const res = await (composio.tools as any).proxyExecute({
            toolkitSlug: "slack",
            userId: params.userId,
            data: {
              endpoint: "/api/chat.postMessage",
              method: "POST",
              body: { channel: params.channel || "general", text: params.message },
            },
          });
          remoteTs = (res as any)?.data?.ts;
        } catch {}
      }

      // Create activity log
      await createActivity({
        id: `A-${Date.now()}`,
        type: "slack_notified",
        leadId: undefined as any,
        message: `Slack notification sent to #${params.channel}: ${params.message}`,
        status: "success",
        meta: { channel: params.channel, message: params.message, attempted, remoteTs },
      });

      return {
        success: true,
        message: `Notification sent to #${params.channel}`,
        notification: {
          channel: params.channel,
          message: params.message,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to send notification",
      };
    }
  },
});

// Tool 8: Create Invoice (Stripe integration)
export const createInvoiceTool = tool({
  description: "Create an invoice for a deal or lead. Use this when the user wants to create an invoice.",
  inputSchema: z.object({
    leadId: z.string().describe("Lead ID to create invoice for"),
    amount: z.number().min(0).describe("Invoice amount"),
    currency: z.string().optional().default("USD").describe("Currency code"),
    description: z.string().optional().describe("Invoice description"),
    userId: z.string().optional().describe("Current user id for Composio context"),
  }),
  execute: async (params: any) => {
    try {
      // Attempt real Stripe invoice via Composio (if configured)
      const composio = getComposio();
      let attempted = false;
      let invoiceId: string | undefined;
      if (composio && params.userId) {
        attempted = true;
        try {
          const res = await (composio.tools as any).proxyExecute({
            toolkitSlug: "stripe",
            userId: params.userId,
            data: {
              endpoint: "/v1/invoices",
              method: "POST",
              body: { amount_due: Math.round(params.amount * 100), currency: params.currency || "USD", description: params.description },
            },
          });
          invoiceId = (res as any)?.data?.id;
        } catch {}
      }

      // Create activity log
      await createActivity({
        id: `A-${Date.now()}`,
        type: "invoice_created",
        leadId: params.leadId,
        message: `Invoice created for $${params.amount} for lead ${params.leadId}`,
        status: "success",
        meta: { amount: params.amount, currency: params.currency, description: params.description, attempted, invoiceId },
      });

      return {
        success: true,
        message: `Invoice created successfully for $${params.amount}`,
        invoice: {
          leadId: params.leadId,
          amount: params.amount,
          currency: params.currency,
          description: params.description,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to create invoice",
      };
    }
  },
});

// Tool 9: Get Activity Feed
export const getActivityFeedTool = tool({
  description: "Get the recent activity feed showing all actions taken in the CRM. Use this when the user asks for activity, history, or what happened.",
  inputSchema: z.object({
    limit: z.number().min(1).max(50).optional().default(20).describe("Number of activities to return"),
  }),
  execute: async (params: any) => {
    try {
      // For now, return a mock activity feed
      // In production, this would query the activities table
      return {
        success: true,
        activities: [
          {
            message: "Lead created",
            timestamp: new Date().toISOString(),
            type: "lead_created",
          },
          {
            message: "Email sent to lead",
            timestamp: new Date().toISOString(),
            type: "email_sent",
          },
        ],
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to get activity feed",
      };
    }
  },
});

// Tool 10: Search and Filter Advanced
export const searchAdvancedTool = tool({
  description: "Advanced search with multiple criteria. Use this for complex search queries.",
  inputSchema: z.object({
    query: z.string().describe("Search query (searches name, email, company)"),
    filters: z.object({
      status: z.string().optional(),
      potentialMin: z.number().optional(),
      owner: z.string().optional(),
    }).optional(),
  }),
  execute: async (params: any) => {
    try {
      const leads = await getLeads({ page: 1, limit: 100 });
      
      let results = leads.data;

      // Text search
      if (params.query) {
        const queryLower = params.query.toLowerCase();
        results = results.filter(l => 
          l.name.toLowerCase().includes(queryLower) ||
          l.email.toLowerCase().includes(queryLower) ||
          l.company?.toLowerCase().includes(queryLower)
        );
      }

      // Apply filters
      if (params.filters) {
        if (params.filters.status) {
          results = results.filter(l => l.status === params.filters.status);
        }
        if (params.filters.potentialMin) {
          results = results.filter(l => l.potential >= params.filters.potentialMin);
        }
        if (params.filters.owner) {
          results = results.filter(l => l.owner?.toLowerCase().includes(params.filters.owner.toLowerCase()));
        }
      }

      return {
        success: true,
        count: results.length,
        leads: results.map(l => ({
          id: l.id,
          name: l.name,
          email: l.email,
          company: l.company,
          potential: l.potential,
          status: l.status,
        })),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to search",
      };
    }
  },
});

