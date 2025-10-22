// AI Agent implementation using Vercel AI SDK (OpenAI Agents) with Composio integration

import { streamText, stepCountIs, experimental_createMCPClient as createMCPClient } from "ai";
import { openai } from "@ai-sdk/openai";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Composio as ComposioSDK } from "@composio/core";
import { createAgentSession, updateAgentSession, getAgentSession, createAgentMessage, getAgentMessages } from "../db/queries";

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

// Session cache for MCP clients
const sessionCache = new Map<string, { client: any; tools: any; sessionId: string; url: string }>();

// Agent system prompt
const SYSTEM_PROMPT = `You are RouteIQ Assistant, an intelligent AI-powered CRM assistant that controls EVERYTHING in the sales pipeline.

You are the PRIMARY INTERFACE for this CRM - users interact with you to control all features:

**🎯 Your Core Responsibilities:**
1. Lead Management: Search, view, update, assign, and track leads
2. Communication: Send emails, Slack notifications, follow-ups
3. Deals & Revenue: Create invoices, manage deals, track conversions
4. Analytics: Provide insights, reports, and metrics
5. Automation: Execute workflows and sequences

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

// Main agent chat function using Vercel AI SDK
export async function chatWithAgent(params: {
  userId: string;
  sessionId?: string;
  message: string;
  messages?: Array<{ role: "user" | "assistant" | "system"; content: string }>;
}): Promise<{
  sessionId: string;
  response: string;
  toolCalls?: any[];
}> {
  const { userId, message, messages: existingMessages } = params;

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
      toolkits: [], // Add specific toolkits if needed
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
  let sessionId = params.sessionId;
  let session;

  if (sessionId) {
    session = await getAgentSession(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }
  } else {
    // Create new database session
    session = await createAgentSession({
      id: `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      composioSessionId,
      mcpUrl: sessionCache.get(userId)?.url || "",
      state: { conversationCount: 0 },
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });
    sessionId = session.id;
  }

  // Prepare messages
  const systemMessage = { role: "system" as const, content: SYSTEM_PROMPT };
  const historyMessages = existingMessages || [];
  const userMessage = { role: "user" as const, content: message };
  
  const allMessages = [systemMessage, ...historyMessages, userMessage];

  // Use Vercel AI SDK to generate response with Composio tools
  const modelId = process.env.OPENAI_MODEL || "gpt-4o";
  
  const result = await streamText({
    model: openai(modelId),
    tools,
    messages: allMessages,
    maxSteps: 10,
    stopWhen: stepCountIs(50),
  });

  // Save messages to database
  await createAgentMessage({
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    sessionId: sessionId!,
    role: "user",
    content: message,
    toolCalls: null,
  });

  // Get the final text
  const responseText = await result.text;
  
  // Save assistant response
  await createAgentMessage({
    id: `msg_${Date.now() + 1}_${Math.random().toString(36).substr(2, 9)}`,
    sessionId: sessionId!,
    role: "assistant",
    content: responseText,
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
    response: responseText,
    toolCalls: [], // Extract tool calls if needed
  };
}

// Streaming version for real-time chat
export async function streamChatWithAgent(params: {
  userId: string;
  sessionId?: string;
  message: string;
  messages?: Array<{ role: "user" | "assistant" | "system"; content: string }>;
}): Promise<ReadableStream> {
  const { userId, message, messages: existingMessages } = params;

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
    const composio = getComposio();
    const mcpSession = await composio.experimental.toolRouter.createSession(userId, {
      toolkits: [],
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

  // Prepare messages
  const systemMessage = { role: "system" as const, content: SYSTEM_PROMPT };
  const historyMessages = existingMessages || [];
  const userMessage = { role: "user" as const, content: message };
  
  const allMessages = [systemMessage, ...historyMessages, userMessage];

  // Use Vercel AI SDK streaming
  const modelId = process.env.OPENAI_MODEL || "gpt-4o";
  
  const result = await streamText({
    model: openai(modelId),
    tools,
    messages: allMessages,
    maxSteps: 10,
    stopWhen: stepCountIs(50),
  });

  return result.toDataStreamResponse();
}
