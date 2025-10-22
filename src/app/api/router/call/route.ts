import { NextRequest, NextResponse } from "next/server";
import { connectMCP } from "@/lib/router/mcpClient";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sessionId = String(body?.sessionId || "").trim();
    const mcpUrl = String(body?.mcpUrl || "").trim();
    const toolName = String(body?.toolName || "").trim();
    const args = (body?.args && typeof body.args === "object") ? body.args : {};

    if (!sessionId || !mcpUrl || !toolName) {
      return NextResponse.json({ error: "sessionId, mcpUrl, toolName are required" }, { status: 400 });
    }

    let client;
    let result;
    try {
      client = await connectMCP(mcpUrl);
      const enrichedArgs = {
        session_id: sessionId,
        memory: args.memory ?? {},
        ...args,
      };
      result = await client.callTool(toolName, enrichedArgs);
      await client.close();
    } catch (e: any) {
      const msg = `MCP tool call failed: ${e?.message || e}`;
      console.error("/api/router/call error", msg, { toolName, sessionId });
      return NextResponse.json({ ok: false, error: msg }, { status: 502 });
    }

    return NextResponse.json({ ok: true, result });
  } catch (err) {
    console.error("/api/router/call fatal error", err);
    return NextResponse.json({ ok: false, error: (err as Error).message || String(err) }, { status: 500 });
  }
}
