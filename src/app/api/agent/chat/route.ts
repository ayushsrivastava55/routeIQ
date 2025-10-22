import { NextResponse } from "next/server";
import { chatWithAgent } from "@/lib/agent";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, sessionId, message } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { error: "message is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    // Chat with the AI agent
    const result = await chatWithAgent({
      userId,
      sessionId,
      message: message.trim(),
    });

    return NextResponse.json({
      success: true,
      sessionId: result.sessionId,
      response: result.response,
      toolCalls: result.toolCalls,
    });
  } catch (err: any) {
    console.error("Error in agent chat:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to process agent chat",
      },
      { status: 500 }
    );
  }
}
