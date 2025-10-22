import { NextRequest, NextResponse } from "next/server";
import { getComposio } from "@/lib/composio";
import { generateWelcomeEmail } from "@/lib/ai";
import { pushActivity } from "@/lib/persist";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, email, name, company } = body || {};
    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });
    if (!email) return NextResponse.json({ error: "email is required" }, { status: 400 });

    const composio = getComposio();
    const content = await generateWelcomeEmail({ email, name, company });

    // Gmail send via Composio
    const raw = [
      `To: ${email}`,
      `Subject: ${content.subject}`,
      "Content-Type: text/plain; charset=UTF-8",
      "",
      content.body,
    ].join("\r\n");
    const rawB64 = Buffer.from(raw).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

    await (composio.tools as any).proxyExecute({
      toolkitSlug: "gmail",
      userId,
      data: {
        endpoint: "/gmail/v1/users/me/messages/send",
        method: "POST",
        body: { raw: rawB64 },
      },
    });

    pushActivity({
      id: crypto.randomUUID(),
      type: "email_sent",
      message: `Welcome email sent to ${email}`,
      timestamp: new Date().toISOString(),
      status: "success",
      meta: { subject: content.subject },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to send welcome" }, { status: 500 });
  }
}
