import { NextRequest } from "next/server";
import { streamText, experimental_createMCPClient as createMCPClient } from "ai";
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
1. ALWAYS provide clear, actionable responses AFTER using tools
2. After calling ANY tool, explain what you found or did in natural language
3. Show details in a user-friendly format (not raw JSON)
4. When listing leads, format them nicely with bullet points
5. Confirm actions before execution if uncertain
6. Provide step-by-step explanations for complex operations
7. Use natural language in all responses
8. If an action requires more info, ask the user clearly
9. NEVER just call a tool without providing a text response afterward

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

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const encoder = new TextEncoder();
          
          // First call: execute tools and collect results
          const result = await streamText({
            model: openai(modelId),
            tools: allTools,
            messages: historyMessages,
          });

          const toolCalls: any[] = [];
          const toolResults: any[] = [];
          let hadToolCalls = false;

          // Stream all events including multiple rounds of tool calls
          for await (const part of result.fullStream) {
            if (part.type === 'text-delta') {
              const payload = JSON.stringify({ type: "text-delta", delta: (part as any).text });
              controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
            } else if (part.type === 'tool-call') {
              hadToolCalls = true;
              const toolCall = {
                toolCallId: part.toolCallId,
                toolName: part.toolName,
                args: (part as any).input || {},
              };
              toolCalls.push(toolCall);
              
              const payload = JSON.stringify({
                type: "tool-call",
                ...toolCall,
              });
              controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
            } else if (part.type === 'tool-result') {
              const toolResult = {
                toolCallId: part.toolCallId,
                toolName: part.toolName,
                result: (part as any).output,
              };
              toolResults.push(toolResult);
              
              const payload = JSON.stringify({
                type: "tool-result",
                toolCallId: toolResult.toolCallId,
                result: toolResult.result,
              });
              controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
            }
          }

          // Fallback: if tools were used but no text was generated, make a summary call
          if (hadToolCalls && toolResults.length > 0) {
            const summaryMessages = [
              ...historyMessages,
              {
                role: "assistant" as const,
                content: `I've executed ${toolResults.length} tool(s). Here are the results: ${JSON.stringify(toolResults)}. Now I'll provide a natural language summary.`
              },
              {
                role: "user" as const,
                content: "Please provide a clear, natural language summary of what you found or did. Format any data nicely for the user."
              }
            ];

            const summaryResult = await streamText({
              model: openai(modelId),
              messages: summaryMessages,
            });

            // Stream the summary
            for await (const part of summaryResult.fullStream) {
              if (part.type === 'text-delta') {
                const payload = JSON.stringify({ type: "text-delta", delta: (part as any).text });
                controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
              }
            }
          }

          controller.close();
        } catch (err) {
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
