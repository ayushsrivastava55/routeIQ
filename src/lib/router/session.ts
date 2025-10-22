export type RouterSession = { sessionId: string; mcpUrl: string };

export async function createToolRouterSession(userId: string, toolkits?: string[]): Promise<RouterSession> {
  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) throw new Error("COMPOSIO_API_KEY not set");
  
  // Note: Composio REST API for session creation only accepts user_id
  // Per docs: https://docs.composio.dev/api-reference/tool-router/post-labs-tool-router-session
  // Toolkit filtering is handled by COMPOSIO_MANAGE_CONNECTIONS or SDK methods
  const payload = {
    user_id: userId,
  };
  
  const res = await fetch("https://backend.composio.dev/api/v3/labs/tool_router/session", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify(payload),
  });
  
  if (!res.ok) {
    const errText = await res.text();
    console.error("Composio Tool Router session error:", { status: res.status, body: errText, payload });
    throw new Error(`session failed ${res.status}: ${errText}`);
  }
  const parsed: any = await res.json();
  const mcpUrl = parsed?.chat_session_mcp_url || parsed?.tool_router_instance_mcp_url;
  if (!mcpUrl) throw new Error("no mcp url");
  return { sessionId: String(parsed.session_id), mcpUrl: String(mcpUrl) };
}
