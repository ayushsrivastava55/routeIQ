import { NextRequest, NextResponse } from "next/server";
import { getComposio } from "@/lib/composio";
import { pushActivity } from "@/lib/persist";

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

    let customerId: string | null = null;
    const search = await (composio.tools as any).proxyExecute({
      toolkitSlug: "stripe",
      userId,
      data: {
        endpoint: "/v1/customers/search",
        method: "GET",
        params: { query: `email:'${email}'` },
      },
    });
    const found = (search as any)?.data?.data?.[0];
    if (found?.id) {
      customerId = found.id;
    } else {
      const created = await (composio.tools as any).proxyExecute({
        toolkitSlug: "stripe",
        userId,
        data: {
          endpoint: "/v1/customers",
          method: "POST",
          body: { email, name: customerName || email },
        },
      });
      customerId = (created as any)?.data?.id || null;
    }

    if (!customerId) return NextResponse.json({ error: "failed to resolve stripe customer" }, { status: 500 });

    const amountCents = Math.round(Number(amount) * 100);
    await (composio.tools as any).proxyExecute({
      toolkitSlug: "stripe",
      userId,
      data: {
        endpoint: "/v1/invoiceitems",
        method: "POST",
        body: { customer: customerId, amount: amountCents, currency, description },
      },
    });

    const invoiceCreate = await (composio.tools as any).proxyExecute({
      toolkitSlug: "stripe",
      userId,
      data: {
        endpoint: "/v1/invoices",
        method: "POST",
        body: { customer: customerId, collection_method: "send_invoice", days_until_due: 14 },
      },
    });

    const invoiceId = (invoiceCreate as any)?.data?.id;
    let finalizedInvoice: any = null;
    if (invoiceId) {
      finalizedInvoice = await (composio.tools as any).proxyExecute({
        toolkitSlug: "stripe",
        userId,
        data: {
          endpoint: `/v1/invoices/${invoiceId}/finalize`,
          method: "POST",
        },
      });
      pushActivity({
        id: crypto.randomUUID(),
        type: "invoice_created",
        leadId: undefined,
        message: `Stripe invoice created ${invoiceId}`,
        timestamp: new Date().toISOString(),
        status: "success",
        meta: { invoiceId },
      });
    }

    if (docusignAccountId && docusignTemplateId && recipientName && recipientEmail) {
      try {
        await (composio.tools as any).proxyExecute({
          toolkitSlug: "docusign",
          userId,
          data: {
            endpoint: `/v2.1/accounts/${docusignAccountId}/envelopes`,
            method: "POST",
            body: {
              templateId: docusignTemplateId,
              status: "sent",
              templateRoles: [
                { roleName: docusignRoleName, name: recipientName, email: recipientEmail, tabs: docusignTabs },
              ],
            },
          },
        });
        pushActivity({
          id: crypto.randomUUID(),
          type: "contract_sent",
          leadId: undefined,
          message: `DocuSign envelope sent to ${recipientEmail}`,
          timestamp: new Date().toISOString(),
          status: "success",
          meta: { docusignTemplateId },
        });
      } catch {}
    }

    if (slackChannel) {
      try {
        const text = `Deal won for ${email}. Amount: ${amount} ${currency}. Invoice: ${invoiceId || "n/a"}.`;
        await (composio.tools as any).proxyExecute({
          toolkitSlug: "slack",
          userId,
          data: {
            endpoint: "/chat.postMessage",
            method: "POST",
            body: { channel: slackChannel, text },
          },
        });
        pushActivity({
          id: crypto.randomUUID(),
          type: "slack_notified",
          leadId: undefined,
          message: `Notified ${slackChannel} about won deal ${invoiceId || "n/a"}`,
          timestamp: new Date().toISOString(),
          status: "success",
        });
      } catch {}
    }

    return NextResponse.json({ ok: true, invoiceId, finalized: finalizedInvoice?.data || null });
  } catch (error) {
    return NextResponse.json({ error: "Failed to process deal won" }, { status: 500 });
  }
}
