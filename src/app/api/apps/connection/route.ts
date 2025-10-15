import { NextRequest, NextResponse } from "next/server";
import { getComposio } from "@/lib/composio";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const composio = getComposio();
    const connectedAccounts = await composio.connectedAccounts.list({ userIds: [userId] });

    const detailed = await Promise.all(
      (connectedAccounts.items || []).map(async (account: any) => {
        try {
          const details = await composio.connectedAccounts.get(account.id);
          return details;
        } catch (_) {
          return account;
        }
      })
    );

    return NextResponse.json({ connectedAccounts: detailed }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch connection status" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { authConfigId, userId } = body;
    if (!authConfigId || !userId) {
      return NextResponse.json({ error: "authConfigId and userId are required" }, { status: 400 });
    }

    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/apps`;

    const composio = getComposio();
    const connectionRequest = await composio.connectedAccounts.initiate(userId, authConfigId, { callbackUrl });

    return NextResponse.json(connectionRequest, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create auth link" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId } = body;
    if (!accountId) {
      return NextResponse.json({ error: "accountId is required" }, { status: 400 });
    }

    const composio = getComposio();
    const result = await composio.connectedAccounts.delete(accountId);

    return NextResponse.json({ success: true, result }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to disconnect account" }, { status: 500 });
  }
}
