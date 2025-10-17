import { NextResponse } from "next/server";
import { emailsByLead, leadById } from "@/lib/persist";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const lead = leadById(params.id);
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  const emails = emailsByLead(lead.id);
  return NextResponse.json({ emails });
}
