import { NextResponse } from "next/server";
import { getComposio } from "@/lib/composio";
import { pushActivity } from "@/lib/persist";
import type { Activity } from "@/lib/types";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const id = params.id;
  try {
    const body = await req.json().catch(() => ({}));
    const userId = body.userId as string | undefined;
    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

    const composio = getComposio();
    const contactRes: any = await (composio.tools as any).proxyExecute({
      toolkitSlug: "hubspot",
      userId,
      data: {
        endpoint: `/crm/v3/objects/contacts/${encodeURIComponent(id)}`,
        method: "GET",
        params: { properties: "email,firstname,lastname" },
      },
    });
    const contact = contactRes?.data;
    const leadEmail: string | undefined = contact?.properties?.email;
    const first = String(contact?.properties?.firstname || "").trim();
    const last = String(contact?.properties?.lastname || "").trim();
    const leadName = [first, last].filter(Boolean).join(" ") || (leadEmail ? leadEmail.split("@")[0] : "there");
    if (!leadEmail) return NextResponse.json({ error: "email not found for contact" }, { status: 404 });

    const subject = body.subject || `Following up, ${leadName}`;
    const emailBody = body.body || `Hi ${leadName || "there"},\n\nJust following up on your interest. Happy to help with any questions.\n\nBest,\nRouteIQ`;
    const raw = [
      `To: ${leadEmail}`,
      `Subject: ${subject}`,
      "Content-Type: text/plain; charset=UTF-8",
      "",
      emailBody,
    ].join("\r\n");
    const rawB64 = Buffer.from(raw).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

    const sendRes: any = await (composio.tools as any).proxyExecute({
      toolkitSlug: "gmail",
      userId,
      data: {
        endpoint: "/gmail/v1/users/me/messages/send",
        method: "POST",
        body: { raw: rawB64 },
      },
    });

    const activity: Activity = {
      id: crypto.randomUUID(),
      type: "email_sent",
      leadId: id,
      message: `Email sent to ${leadEmail}`,
      timestamp: new Date().toISOString(),
      status: "success",
      meta: { gmailMessageId: sendRes?.data?.id },
    };
    pushActivity(activity);
    return NextResponse.json({ ok: true, activity });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 501 });
  }
}
