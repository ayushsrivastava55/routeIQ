import { NextRequest, NextResponse } from "next/server";
import { getComposio } from "@/lib/composio";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      email,
      amount,
      currency = "usd",
      description = "",
      customerName = "",
      slackChannel,
      docusignAccountId,
      docusignTemplateId,
      recipientName,
      recipientEmail,
      docusignRoleName = "signer",
      docusignTabs = {},
    } = body || {};

    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });
    if (!email) return NextResponse.json({ error: "email is required" }, { status: 400 });
    if (!amount || isNaN(Number(amount))) return NextResponse.json({ error: "valid amount is required" }, { status: 400 });

    const composio = getComposio();

    const accounts = await composio.connectedAccounts.list({ userIds: [userId] });
    const items = accounts?.items || [];
    const stripeAcc = items.find((a: any) => a?.toolkit?.slug?.toLowerCase() === "stripe");
    const docusignAcc = items.find((a: any) => a?.toolkit?.slug?.toLowerCase() === "docusign");
    const slackAcc = items.find((a: any) => a?.toolkit?.slug?.toLowerCase() === "slack");
    if (!stripeAcc?.id) return NextResponse.json({ error: "stripe connected account not found" }, { status: 400 });

    let customerId: string | null = null;
    const search = await composio.tools.proxyExecute({
      endpoint: "/v1/customers/search",
      method: "GET",
      connectedAccountId: stripeAcc.id,
      parameters: [
        { name: "query", value: `email:'${email}'`, in: "query" },
      ],
    });
    const found = (search as any)?.data?.data?.[0];
    if (found?.id) {
      customerId = found.id;
    } else {
      const created = await composio.tools.proxyExecute({
        endpoint: "/v1/customers",
        method: "POST",
        connectedAccountId: stripeAcc.id,
        body: { email, name: customerName || email },
      });
      customerId = (created as any)?.data?.id || null;
    }

    if (!customerId) return NextResponse.json({ error: "failed to resolve stripe customer" }, { status: 500 });

    const amountCents = Math.round(Number(amount) * 100);
    await composio.tools.proxyExecute({
      endpoint: "/v1/invoiceitems",
      method: "POST",
      connectedAccountId: stripeAcc.id,
      body: { customer: customerId, amount: amountCents, currency, description },
    });

    const invoiceCreate = await composio.tools.proxyExecute({
      endpoint: "/v1/invoices",
      method: "POST",
      connectedAccountId: stripeAcc.id,
      body: { customer: customerId, collection_method: "send_invoice", days_until_due: 14 },
    });

    const invoiceId = (invoiceCreate as any)?.data?.id;
    let finalizedInvoice: any = null;
    if (invoiceId) {
      finalizedInvoice = await composio.tools.proxyExecute({
        endpoint: `/v1/invoices/${invoiceId}/finalize`,
        method: "POST",
        connectedAccountId: stripeAcc.id,
      });
    }

    if (docusignAccountId && docusignTemplateId && recipientName && recipientEmail && docusignAcc?.id) {
      try {
        await composio.tools.proxyExecute({
          endpoint: `/v2.1/accounts/${docusignAccountId}/envelopes`,
          method: "POST",
          connectedAccountId: docusignAcc.id,
          body: {
            templateId: docusignTemplateId,
            status: "sent",
            templateRoles: [
              { roleName: docusignRoleName, name: recipientName, email: recipientEmail, tabs: docusignTabs },
            ],
          },
        });
      } catch {}
    }

    if (slackChannel && slackAcc?.id) {
      try {
        const text = `Deal won for ${email}. Amount: ${amount} ${currency}. Invoice: ${invoiceId || "n/a"}.`;
        await composio.tools.proxyExecute({
          endpoint: "/chat.postMessage",
          method: "POST",
          connectedAccountId: slackAcc.id,
          body: { channel: slackChannel, text },
        });
      } catch {}
    }

    return NextResponse.json({ ok: true, invoiceId, finalized: finalizedInvoice?.data || null });
  } catch (error) {
    return NextResponse.json({ error: "Failed to process deal won" }, { status: 500 });
  }
}
