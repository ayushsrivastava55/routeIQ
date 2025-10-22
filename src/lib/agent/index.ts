// AI Agent implementation using OpenAI with Composio integration

import OpenAI from "openai";
import { Composio as ComposioSDK } from "@composio/core";
import { createAgentSession, updateAgentSession, getAgentSession, createAgentMessage, getAgentMessages } from "../db/queries";
import { createToolRouterSession } from "../router/session";

// Initialize OpenAI client
let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

// Initialize Composio SDK
let composioSdk: ComposioSDK | null = null;

function getComposio(): ComposioSDK {
  if (!composioSdk) {
    if (!process.env.COMPOSIO_API_KEY) {
      throw new Error("COMPOSIO_API_KEY environment variable is not set");
    }
    composioSdk = new ComposioSDK({
      apiKey: process.env.COMPOSIO_API_KEY,
    });
  }
  return composioSdk;
}

// Agent system prompt
const SYSTEM_PROMPT = `You are RouteIQ Assistant, an intelligent AI agent that helps sales teams manage leads, automate workflows, and increase productivity.

You have access to various tools through Composio that allow you to:
- Manage leads in HubSpot CRM (create, update, search, assign)
- Send emails via Gmail
- Post notifications to Slack channels
- Create invoices in Stripe
- Enrich lead data using Clearbit/Apollo
- Send contracts via DocuSign
- And many more integrated tools

When a user asks you to perform an action:
1. Understand the request clearly
2. Use the appropriate Composio tools to fulfill the request
3. Provide clear, concise responses about what you did
4. Handle errors gracefully and inform the user

Be helpful, professional, and proactive. If you need more information to complete a task, ask the user.`;

// Tool definitions for function calling
const COMPOSIO_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "search_leads",
      description: "Search for leads in the CRM system with optional filters for status, potential score, and date range",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["new", "contacted", "waiting_reply", "qualified", "won", "lost"],
            description: "Filter by lead status",
          },
          potentialMin: {
            type: "number",
            description: "Minimum potential score (0-100)",
          },
          potentialMax: {
            type: "number",
            description: "Maximum potential score (0-100)",
          },
          page: {
            type: "number",
            description: "Page number for pagination (default: 1)",
          },
          limit: {
            type: "number",
            description: "Number of results per page (default: 20)",
          },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_lead_details",
      description: "Get detailed information about a specific lead by ID",
      parameters: {
        type: "object",
        properties: {
          leadId: {
            type: "string",
            description: "The ID of the lead to retrieve",
          },
        },
        required: ["leadId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "send_email",
      description: "Send an email to a lead using Gmail",
      parameters: {
        type: "object",
        properties: {
          leadId: {
            type: "string",
            description: "The ID of the lead to send email to",
          },
          subject: {
            type: "string",
            description: "Email subject line",
          },
          body: {
            type: "string",
            description: "Email body content",
          },
        },
        required: ["leadId", "subject", "body"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "notify_slack",
      description: "Send a notification to a Slack channel",
      parameters: {
        type: "object",
        properties: {
          channel: {
            type: "string",
            description: "Slack channel name (e.g., #sales)",
          },
          message: {
            type: "string",
            description: "Message to send",
          },
        },
        required: ["channel", "message"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_invoice",
      description: "Create an invoice in Stripe for a lead",
      parameters: {
        type: "object",
        properties: {
          leadId: {
            type: "string",
            description: "The ID of the lead to invoice",
          },
          amount: {
            type: "number",
            description: "Invoice amount in dollars",
          },
        },
        required: ["leadId", "amount"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_lead_status",
      description: "Update the status of a lead",
      parameters: {
        type: "object",
        properties: {
          leadId: {
            type: "string",
            description: "The ID of the lead to update",
          },
          status: {
            type: "string",
            enum: ["new", "contacted", "waiting_reply", "qualified", "won", "lost"],
            description: "New status for the lead",
          },
        },
        required: ["leadId", "status"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "execute_composio_tool",
      description: "Execute any Composio tool directly by name with provided arguments. Use this for advanced workflows or tools not covered by other functions.",
      parameters: {
        type: "object",
        properties: {
          toolName: {
            type: "string",
            description: "Name of the Composio tool to execute (e.g., COMPOSIO_SEARCH_TOOLS, COMPOSIO_CREATE_PLAN)",
          },
          args: {
            type: "object",
            description: "Arguments to pass to the tool",
          },
        },
        required: ["toolName", "args"],
      },
    },
  },
];

// Execute tool calls
async function executeToolCall(toolName: string, args: any, userId: string, sessionId: string) {
  const composio = getComposio();

  // Import database queries
  const { getLeads, getLeadById, updateLead } = await import("../db/queries");

  try {
    switch (toolName) {
      case "search_leads": {
        const result = await getLeads({
          status: args.status,
          potentialMin: args.potentialMin,
          potentialMax: args.potentialMax,
          page: args.page || 1,
          limit: args.limit || 20,
        });
        return {
          success: true,
          data: result,
        };
      }

      case "get_lead_details": {
        const lead = await getLeadById(args.leadId);
        if (!lead) {
          return {
            success: false,
            error: "Lead not found",
          };
        }
        return {
          success: true,
          data: lead,
        };
      }

      case "send_email": {
        const lead = await getLeadById(args.leadId);
        if (!lead) {
          return { success: false, error: "Lead not found" };
        }

        // Use Composio to send email via Gmail
        const gmailAccountId = process.env.COMPOSIO_GMAIL_ACCOUNT_ID;
        if (!gmailAccountId) {
          return { success: false, error: "Gmail not configured" };
        }

        const raw = [
          `To: ${lead.email}`,
          `Subject: ${args.subject}`,
          "Content-Type: text/plain; charset=UTF-8",
          "",
          args.body,
        ].join("\r\n");
        const rawB64 = Buffer.from(raw).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

        await composio.tools.proxyExecute({
          endpoint: "/gmail/v1/users/me/messages/send",
          method: "POST",
          connectedAccountId: gmailAccountId,
          body: { raw: rawB64 },
        });

        return {
          success: true,
          message: `Email sent to ${lead.email}`,
        };
      }

      case "notify_slack": {
        const slackAccountId = process.env.COMPOSIO_SLACK_ACCOUNT_ID;
        if (!slackAccountId) {
          return { success: false, error: "Slack not configured" };
        }

        await composio.tools.proxyExecute({
          endpoint: "/chat.postMessage",
          method: "POST",
          connectedAccountId: slackAccountId,
          body: {
            channel: args.channel || "#sales",
            text: args.message,
          },
        });

        return {
          success: true,
          message: `Message sent to ${args.channel}`,
        };
      }

      case "create_invoice": {
        const lead = await getLeadById(args.leadId);
        if (!lead) {
          return { success: false, error: "Lead not found" };
        }

        const stripeAccountId = process.env.COMPOSIO_STRIPE_ACCOUNT_ID;
        if (!stripeAccountId) {
          return { success: false, error: "Stripe not configured" };
        }

        // Search for customer
        const search: any = await composio.tools.proxyExecute({
          endpoint: "/v1/customers/search",
          method: "GET",
          connectedAccountId: stripeAccountId,
          parameters: [{ name: "query", value: `email:'${lead.email}'`, in: "query" }],
        });

        let customerId = search?.data?.data?.[0]?.id;

        // Create customer if not exists
        if (!customerId) {
          const created: any = await composio.tools.proxyExecute({
            endpoint: "/v1/customers",
            method: "POST",
            connectedAccountId: stripeAccountId,
            body: { email: lead.email, name: lead.name },
          });
          customerId = created?.data?.id;
        }

        // Create invoice item
        const amountCents = Math.round(Number(args.amount) * 100);
        await composio.tools.proxyExecute({
          endpoint: "/v1/invoiceitems",
          method: "POST",
          connectedAccountId: stripeAccountId,
          body: {
            customer: customerId,
            amount: amountCents,
            currency: "usd",
            description: `Invoice for ${lead.name}`,
          },
        });

        // Create and finalize invoice
        const invoiceCreate: any = await composio.tools.proxyExecute({
          endpoint: "/v1/invoices",
          method: "POST",
          connectedAccountId: stripeAccountId,
          body: {
            customer: customerId,
            collection_method: "send_invoice",
            days_until_due: 14,
          },
        });

        const invoiceId = invoiceCreate?.data?.id;
        if (invoiceId) {
          await composio.tools.proxyExecute({
            endpoint: `/v1/invoices/${invoiceId}/finalize`,
            method: "POST",
            connectedAccountId: stripeAccountId,
          });
        }

        return {
          success: true,
          message: `Invoice for $${args.amount} created for ${lead.name}`,
          invoiceId,
        };
      }

      case "update_lead_status": {
        const updated = await updateLead(args.leadId, { status: args.status });
        if (!updated) {
          return { success: false, error: "Lead not found" };
        }
        return {
          success: true,
          message: `Lead status updated to ${args.status}`,
          data: updated,
        };
      }

      case "execute_composio_tool": {
        // Get Composio session for this user
        const session = await getAgentSession(sessionId);
        if (!session?.composioSessionId || !session?.mcpUrl) {
          return { success: false, error: "Composio session not initialized" };
        }

        // Execute tool via Composio Tool Router
        const response = await fetch(`${process.env.COMPOSIO_API_URL || "https://backend.composio.dev"}/api/v1/router/${session.composioSessionId}/call`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": process.env.COMPOSIO_API_KEY || "",
          },
          body: JSON.stringify({
            toolName: args.toolName,
            args: args.args,
          }),
        });

        const result = await response.json();
        return result;
      }

      default:
        return {
          success: false,
          error: `Unknown tool: ${toolName}`,
        };
    }
  } catch (error: any) {
    console.error(`Error executing tool ${toolName}:`, error);
    return {
      success: false,
      error: error.message || "Tool execution failed",
    };
  }
}

// Main agent chat function
export async function chatWithAgent(params: {
  userId: string;
  sessionId?: string;
  message: string;
}): Promise<{
  sessionId: string;
  response: string;
  toolCalls?: any[];
}> {
  const openai = getOpenAI();
  const { userId, message } = params;

  // Get or create session
  let sessionId = params.sessionId;
  let session;

  if (sessionId) {
    session = await getAgentSession(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }
  } else {
    // Create new session
    const composioSession = await createToolRouterSession(userId);
    session = await createAgentSession({
      id: `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      composioSessionId: composioSession.sessionId,
      mcpUrl: composioSession.mcpUrl,
      state: { conversationCount: 0 },
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });
    sessionId = session.id;
  }

  // Save user message
  await createAgentMessage({
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    sessionId: sessionId!,
    role: "user",
    content: message,
    toolCalls: null,
  });

  // Get conversation history
  const messagesResult = await getAgentMessages(sessionId!, { limit: 50 });
  const history = messagesResult.data.map((msg) => ({
    role: msg.role as "user" | "assistant" | "system",
    content: msg.content,
    tool_calls: msg.toolCalls as any,
  }));

  // Add system prompt if first message
  const messages: any[] = history.length === 1
    ? [{ role: "system", content: SYSTEM_PROMPT }, ...history]
    : history;

  // Call OpenAI with function calling
  let response = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages,
    tools: COMPOSIO_TOOLS,
    tool_choice: "auto",
  });

  let assistantMessage = response.choices[0].message;
  const toolCalls = assistantMessage.tool_calls;

  // Execute tool calls if any
  if (toolCalls && toolCalls.length > 0) {
    // Save assistant message with tool calls
    await createAgentMessage({
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId: sessionId!,
      role: "assistant",
      content: assistantMessage.content || "",
      toolCalls: toolCalls,
    });

    // Execute each tool call
    const toolResults = await Promise.all(
      toolCalls.map(async (toolCall) => {
        // Type guard for function tool calls
        if (toolCall.type !== "function" || !toolCall.function) {
          return {
            tool_call_id: toolCall.id,
            role: "tool" as const,
            content: JSON.stringify({ error: "Unsupported tool call type" }),
          };
        }

        const result = await executeToolCall(
          toolCall.function.name,
          JSON.parse(toolCall.function.arguments),
          userId,
          sessionId!
        );

        // Save tool result message
        await createAgentMessage({
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          sessionId: sessionId!,
          role: "tool",
          content: JSON.stringify(result),
          toolCalls: null,
        });

        return {
          tool_call_id: toolCall.id,
          role: "tool" as const,
          content: JSON.stringify(result),
        };
      })
    );

    // Get final response after tool execution
    const finalMessages = [...messages, assistantMessage, ...toolResults];
    response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: finalMessages,
    });

    assistantMessage = response.choices[0].message;
  }

  // Save final assistant response
  await createAgentMessage({
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    sessionId: sessionId!,
    role: "assistant",
    content: assistantMessage.content || "",
    toolCalls: null,
  });

  // Update session activity
  await updateAgentSession(sessionId!, {
    state: {
      ...((session.state as any) || {}),
      conversationCount: ((session.state as any)?.conversationCount || 0) + 1,
    },
  });

  return {
    sessionId: sessionId!,
    response: assistantMessage.content || "",
    toolCalls: toolCalls?.filter(tc => tc.type === "function" && tc.function).map((tc) => ({
      name: tc.type === "function" ? tc.function!.name : "",
      arguments: tc.type === "function" ? tc.function!.arguments : "",
    })),
  };
}
