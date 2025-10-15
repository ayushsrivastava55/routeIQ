import { NextResponse } from "next/server";
import { addActivity, getLeads, setLeads } from "@/app/api/_store";
import { Composio } from "@/lib/composio";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  const leads = getLeads();
  const lead = leads.find((l) => l.id === id);
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  await Composio.init();
  const activity = await Composio.resendFollowup(lead);
  addActivity(activity);

  // Update lastContactAt and status to waiting_reply
  lead.lastContactAt = new Date().toISOString();
  lead.status = "waiting_reply";
  setLeads([...leads]);

  return NextResponse.json({ ok: true, activity });
}
