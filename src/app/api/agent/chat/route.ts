import { NextRequest } from "next/server";
import { streamText, stepCountIs, experimental_createMCPClient as createMCPClient } from "ai";
import { openai } from "@ai-sdk/openai";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Composio as ComposioSDK } from "@composio/core";
import { createAgentSession, updateAgentSession, getAgentSession, createAgentMessage } from "@/lib/db/queries";
import { createLeadTool } from "../create-lead-tool";
import {
  searchLeadsTool,
  updateLeadStatusTool,
  assignLeadTool,
  getLeadAnalyticsTool,
  bulkUpdateLeadsTool,
  sendEmailTool,
  notifyTeamTool,
  createInvoiceTool,
  getActivityFeedTool,
  searchAdvancedTool,
} from "../tools";

// Session cache for MCP clients
const sessionCache = new Map<string, { client: any; tools: any; sessionId: string; url: string }>();

// System prompt for the AI agent
const SYSTEM_PROMPT = `You are RouteIQ Assistant, an intelligent AI-powered CRM assistant that controls EVERYTHING in the sales pipeline.

You are the PRIMARY INTERFACE for this CRM - users interact with you to control all features:

**🎯 Your Core Responsibilities:**
1. Lead Management: Search, view, update, assign, and track leads through the CRM tools
2. Communication: Send emails, Slack notifications, follow-ups via Gmail and Slack
3. Deals & Revenue: Create invoices, manage deals, track conversions via Stripe
4. Analytics: Provide insights, reports, and metrics from the database
5. Automation: Execute workflows and sequences across multiple tools

**Available Tools:**
You have access to all Composio tools including:
- HubSpot: Contact management, deal tracking, company data
- Gmail: Send emails, read messages
- Slack: Post messages, send notifications
- Stripe: Create invoices, manage customers
- DocuSign: Send contracts
- And many more through the Composio integration

**⚡ Important Rules:**
1. ALWAYS provide clear, actionable responses
2. Show details in a user-friendly format (not raw JSON)
3. When listing leads, format them nicely with bullet points
4. Confirm actions before execution if uncertain
5. Provide step-by-step explanations for complex operations
6. Use natural language in all responses
7. If an action requires more info, ask the user clearly

**🔄 Context Management:**
- Remember previous conversations in the session
- Reference earlier leads or actions mentioned
- Build on what was discussed

Be conversational, helpful, and make the user feel like they're talking to a knowledgeable sales teammate, not a technical tool.`;

function getComposio(): ComposioSDK {
  if (!process.env.COMPOSIO_API_KEY) {
    throw new Error("COMPOSIO_API_KEY environment variable is not set");
  }
  return new ComposioSDK({
    apiKey: process.env.COMPOSIO_API_KEY,
  });
}

export async function POST(request: NextRequest) {
  try {
    const { userId, messages, sessionId } = await request.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: "userId is required" }), { status: 400 });
    }

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages array is required" }), { status: 400 });
    }

    // Get or create Composio MCP session
    let mcpClient: any;
    let tools: any;
    let composioSessionId: string;

    if (sessionCache.has(userId)) {
      const cached = sessionCache.get(userId)!;
      mcpClient = cached.client;
      tools = cached.tools;
      composioSessionId = cached.sessionId;
    } else {
      // Create new Composio Tool Router session
      const composio = getComposio();
      const mcpSession = await composio.experimental.toolRouter.createSession(userId, {
        toolkits: [], // Will auto-discover connected toolkits
      });

      const url = new URL(mcpSession.url);
      const client = await createMCPClient({
        transport: new StreamableHTTPClientTransport(url, { sessionId: mcpSession.sessionId }),
      });

      tools = await client.tools();
      mcpClient = client;
      composioSessionId = mcpSession.sessionId;
      
      sessionCache.set(userId, { 
        client: mcpClient, 
        tools, 
        sessionId: composioSessionId, 
        url: mcpSession.url 
      });
    }

    // Get or create database session
    let dbSessionId = sessionId;
    let dbSession;

    if (dbSessionId) {
      dbSession = await getAgentSession(dbSessionId);
      if (!dbSession) {
        throw new Error("Session not found");
      }
    } else {
      // Create new database session
      dbSession = await createAgentSession({
        id: `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        composioSessionId,
        mcpUrl: sessionCache.get(userId)?.url || "",
        state: { conversationCount: 0 },
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      });
      dbSessionId = dbSession.id;
    }

    // Extract the last user message
    const lastMessage = messages[messages.length - 1];
    const userMessage = lastMessage?.content || "";

    // Save user message to database
    await createAgentMessage({
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId: dbSessionId!,
      role: "user",
      content: userMessage,
      toolCalls: null,
    });

    // Prepare messages with system prompt
    const historyMessages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      ...messages.map((msg: any) => ({
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content,
      })),
    ];

    // Use Vercel AI SDK to generate streaming response
    const modelId = process.env.OPENAI_MODEL || "gpt-4o";
    
    // Combine Composio tools with our custom automation tools
    const allTools: any = {
      ...(tools || {}),
      createLead: createLeadTool,
      searchLeads: searchLeadsTool,
      updateLeadStatus: updateLeadStatusTool,
      assignLead: assignLeadTool,
      getLeadAnalytics: getLeadAnalyticsTool,
      bulkUpdateLeads: bulkUpdateLeadsTool,
      sendEmail: sendEmailTool,
      notifyTeam: notifyTeamTool,
      createInvoice: createInvoiceTool,
      getActivityFeed: getActivityFeedTool,
      searchAdvanced: searchAdvancedTool,
    };

    // Create a custom stream so we can interleave tool-call events with text
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const encoder = new TextEncoder();
          const result = await streamText({
            model: openai(modelId),
            tools: allTools,
            messages: historyMessages,
            onStepFinish: async (step) => {
              if (step.toolCalls && step.toolCalls.length > 0) {
                for (const toolCall of step.toolCalls) {
                  const payload = JSON.stringify({
                    type: "tool-call",
                    toolCallId: toolCall.toolCallId,
                    toolName: toolCall.toolName,
                    // args may not be typed on some versions; cast for safety
                    args: (toolCall as any).args || {},
                  });
                  controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
                  console.log("🛠️ Tool call:", toolCall.toolName);
                }
              }

              if (step.toolResults && step.toolResults.length > 0) {
                for (const toolResult of step.toolResults) {
                  const payload = JSON.stringify({
                    type: "tool-result",
                    toolCallId: toolResult.toolCallId,
                    result: (toolResult as any).result,
                  });
                  controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
                  console.log("✅ Tool result:", toolResult.toolCallId);
                }
              }
            },
          });

          for await (const chunk of result.textStream) {
            controller.enqueue(encoder.encode(chunk));
          }

          controller.close();
        } catch (err) {
          // surface error to client
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "X-Session-Id": dbSessionId!,
      },
    });
  } catch (error: any) {
    console.error("Agent chat error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to process chat" }),
      { status: 500 }
    );
  }
}
