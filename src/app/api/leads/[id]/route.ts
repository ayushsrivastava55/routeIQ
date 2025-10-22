import { NextRequest, NextResponse } from "next/server";
import { getLeadById } from "@/lib/db/queries";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const leadId = params.id;
    const lead = await getLeadById(leadId);

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json({ lead });
  } catch (error: any) {
    console.error("Get lead error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get lead" },
      { status: 500 }
    );
  }
}
