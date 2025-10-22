import { NextResponse } from "next/server";
import { getLeads } from "@/lib/db/queries";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const potentialMin = searchParams.get("potentialMin")
    ? Number(searchParams.get("potentialMin"))
    : undefined;
  const potentialMax = searchParams.get("potentialMax")
    ? Number(searchParams.get("potentialMax"))
    : undefined;
  const status = searchParams.get("status") || undefined;
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;
  const page = searchParams.get("page") ? Number(searchParams.get("page")) : 1;
  const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 20;

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  try {
    // Get leads from database with pagination
    const result = await getLeads({
      potentialMin,
      potentialMax,
      status,
      from,
      to,
      page,
      limit,
    });

    return NextResponse.json({
      leads: result.data,
      pagination: result.pagination,
    });
  } catch (err) {
    console.error("Error fetching leads:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Failed to fetch leads" },
      { status: 500 }
    );
  }
}
