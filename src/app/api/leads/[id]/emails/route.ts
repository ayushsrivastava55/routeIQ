import { NextResponse } from "next/server";
import { getComposio } from "@/lib/composio";
import type { Email } from "@/lib/types";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });
    const composio = getComposio();

    const contactRes: any = await (composio.tools as any).proxyExecute({
      toolkitSlug: "hubspot",
      userId,
      data: {
        endpoint: `/crm/v3/objects/contacts/${encodeURIComponent(params.id)}`,
        method: "GET",
        params: { properties: "email,firstname,lastname" },
      },
    });
    const contact = contactRes?.data;
    const leadEmail = contact?.properties?.email as string | undefined;
    if (!leadEmail) return NextResponse.json({ error: "email not found for contact" }, { status: 404 });

    const q = `("to:${leadEmail}" OR "from:${leadEmail}")`;
    const listRes: any = await (composio.tools as any).proxyExecute({
      toolkitSlug: "gmail",
      userId,
      data: {
        endpoint: "/gmail/v1/users/me/messages",
        method: "GET",
        params: { q, maxResults: 10 },
      },
    });

    const msgs: any[] = listRes?.data?.messages || [];
    const emails: Email[] = [];

    for (const m of msgs) {
      const msgId = m.id;
      if (!msgId) continue;
      const detail: any = await (composio.tools as any).proxyExecute({
        toolkitSlug: "gmail",
        userId,
        data: {
          endpoint: `/gmail/v1/users/me/messages/${encodeURIComponent(msgId)}`,
          method: "GET",
          params: { format: "full" },
        },
      });
      const payload = detail?.data?.payload || {};
      const headers: Array<{ name: string; value: string }> = payload.headers || [];
      const getHeader = (n: string) => headers.find((h) => h.name?.toLowerCase() === n.toLowerCase())?.value || "";
      const subject = getHeader("Subject");
      const from = getHeader("From");
      const to = getHeader("To");
      const date = getHeader("Date");
      const snippet = detail?.data?.snippet || "";

      const bodyText = extractGmailBodyText(payload) || snippet;
      emails.push({
        id: String(msgId),
        leadId: String(params.id),
        subject: subject || "(no subject)",
        snippet: snippet || undefined,
        body: bodyText || "",
        from: from || "",
        to: to || "",
        timestamp: date ? new Date(date).toISOString() : new Date().toISOString(),
      });
    }

    return NextResponse.json({ emails });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 501 });
  }
}

function extractGmailBodyText(payload: any): string {
  const queue: any[] = [payload];
  while (queue.length) {
    const part = queue.shift();
    if (part?.body?.data) {
      try {
        const data = part.body.data.replace(/-/g, '+').replace(/_/g, '/');
        const buf = Buffer.from(data, 'base64');
        const text = buf.toString('utf-8');
        if (text.trim()) return text;
      } catch {}
    }
    const parts = part?.parts || [];
    for (const p of parts) queue.push(p);
  }
  return "";
}
