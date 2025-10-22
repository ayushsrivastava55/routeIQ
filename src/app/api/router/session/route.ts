import { NextRequest, NextResponse } from "next/server";
import { createToolRouterSession } from "@/lib/router/session";
import { connectMCP } from "@/lib/router/mcpClient";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = String(body?.userId || "").trim();
    const toolkits: string[] | undefined = Array.isArray(body?.toolkits) ? body.toolkits : undefined;
    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

    let session;
    try {
      session = await createToolRouterSession(userId, toolkits);
    } catch (e: any) {
      const msg = `Failed to create Tool Router session: ${e?.message || e}`;
      console.error("/api/router/session session error", msg);
      return NextResponse.json({ ok: false, error: msg }, { status: 502 });
    }

    let tools: { name: string; description?: string }[] = [];
    let warning: string | undefined;
    try {
      const client = await connectMCP(session.mcpUrl);
      tools = await client.listTools();
      await client.close();
    } catch (e: any) {
      warning = `Session created but failed to list tools via MCP: ${e?.message || e}`;
      console.error("/api/router/session listTools error", warning);
    }

    return NextResponse.json({ ok: true, sessionId: session.sessionId, mcpUrl: session.mcpUrl, tools, warning });
  } catch (err) {
    console.error("/api/router/session fatal error", err);
    return NextResponse.json({ ok: false, error: (err as Error).message || String(err) }, { status: 500 });
  }
}
