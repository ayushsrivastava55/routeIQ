import { NextResponse } from "next/server";
import { getAgentSession, getAgentMessages } from "@/lib/db/queries";

// Get agent session details
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    const session = await getAgentSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Get messages for this session
    const messagesResult = await getAgentMessages(sessionId, { limit: 100 });

    return NextResponse.json({
      success: true,
      session,
      messages: messagesResult.data,
    });
  } catch (err: any) {
    console.error("Error fetching agent session:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to fetch session",
      },
      { status: 500 }
    );
  }
}
