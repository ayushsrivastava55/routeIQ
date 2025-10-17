import { NextResponse } from "next/server";
import { Composio } from "@/lib/composio";
import { pushActivity } from "@/lib/persist";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  try {
    const lead = await Composio.getLeadById(id);
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    await Composio.init();
    const activity = await Composio.resendFollowup(lead);
    pushActivity(activity);
    return NextResponse.json({ ok: true, activity });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 501 });
  }
}
