import { NextResponse } from "next/server";
import { Composio } from "@/lib/composio";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const potentialMin = Number(searchParams.get("potentialMin") ?? 0);
  const potentialMax = Number(searchParams.get("potentialMax") ?? 100);
  const status = searchParams.get("status");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  try {
    const leads = await Composio.listLeads({
      potentialMin,
      potentialMax,
      status,
      from,
      to,
    });
    return NextResponse.json({ leads });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 501 }
    );
  }
}
