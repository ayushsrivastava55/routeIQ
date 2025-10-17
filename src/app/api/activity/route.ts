import { NextResponse } from "next/server";
import { loadActivity, pushActivity } from "@/lib/persist";
import type { Activity } from "@/lib/types";

export async function GET() {
  return NextResponse.json({ activity: loadActivity() });
}

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<Activity>;
  const a: Activity = {
    id: crypto.randomUUID(),
    type: body.type ?? "note",
    message: body.message ?? "",
    leadId: body.leadId,
    timestamp: new Date().toISOString(),
    status: body.status ?? "success",
    meta: body.meta ?? {},
  };
  pushActivity(a);
  return NextResponse.json({ ok: true, activity: a });
}
