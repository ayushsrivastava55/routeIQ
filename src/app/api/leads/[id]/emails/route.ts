import { NextResponse } from "next/server";
import { emailsByLead } from "@/lib/persist";
import { Composio } from "@/lib/composio";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const lead = await Composio.getLeadById(params.id);
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    const emails = emailsByLead(lead.id);
    return NextResponse.json({ emails });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 501 });
  }
}
