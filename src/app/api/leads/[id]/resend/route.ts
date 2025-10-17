import { NextResponse } from "next/server";
import { Composio } from "@/lib/composio";
import { loadLeads, saveLeads, pushActivity } from "@/lib/persist";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  const leads = loadLeads();
  const lead = leads.find((l) => l.id === id);
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  await Composio.init();
  const activity = await Composio.resendFollowup(lead);
  pushActivity(activity);

  // Update lastContactAt and status to waiting_reply
  lead.lastContactAt = new Date().toISOString();
  lead.status = "waiting_reply";
  saveLeads([...leads]);

  return NextResponse.json({ ok: true, activity });
}
