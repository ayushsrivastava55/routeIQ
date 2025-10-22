import { NextResponse } from "next/server";
import { getActivities, createActivity } from "@/lib/db/queries";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const leadId = searchParams.get("leadId") || undefined;
  const page = searchParams.get("page") ? Number(searchParams.get("page")) : 1;
  const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 50;

  try {
    const result = await getActivities({
      leadId,
      page,
      limit,
    });

    return NextResponse.json({
      activity: result.data,
      pagination: result.pagination,
    });
  } catch (err) {
    console.error("Error fetching activities:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Failed to fetch activities" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const activity = await createActivity({
      id: crypto.randomUUID(),
      type: body.type ?? "note",
      message: body.message ?? "",
      leadId: body.leadId,
      status: body.status ?? "success",
      meta: body.meta ?? {},
    });

    return NextResponse.json({ ok: true, activity });
  } catch (err) {
    console.error("Error creating activity:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Failed to create activity" },
      { status: 500 }
    );
  }
}
