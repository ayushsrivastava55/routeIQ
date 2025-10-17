import { NextResponse } from "next/server";
import { leadById } from "@/lib/persist";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const lead = leadById(params.id);
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  return NextResponse.json({ lead });
}
