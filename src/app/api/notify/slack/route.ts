import { NextResponse } from "next/server";
import { getComposio } from "@/lib/composio";
import { pushActivity } from "@/lib/persist";

export async function POST(req: Request) {
  try {
    const { userId, channel, text } = await req.json();
    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });
    const resolvedChannel = channel || process.env.SLACK_DEFAULT_CHANNEL;
    if (!resolvedChannel) return NextResponse.json({ error: "channel is required" }, { status: 400 });
    if (!text) return NextResponse.json({ error: "text is required" }, { status: 400 });

    const composio = getComposio();
    await (composio.tools as any).proxyExecute({
      toolkitSlug: "slack",
      userId,
      data: {
        endpoint: "/chat.postMessage",
        method: "POST",
        body: { channel: resolvedChannel, text },
      },
    });

    pushActivity({
      id: crypto.randomUUID(),
      type: "slack_notified",
      leadId: undefined,
      message: `Notified ${resolvedChannel}`,
      timestamp: new Date().toISOString(),
      status: "success",
      meta: { text },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
