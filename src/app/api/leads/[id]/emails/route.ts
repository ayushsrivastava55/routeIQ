import { NextResponse } from "next/server";
import { getEmailsByLead, getLeadById } from "@/app/api/_store";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const lead = getLeadById(params.id);
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  const emails = getEmailsByLead(lead.id);
  return NextResponse.json({ emails });
}

