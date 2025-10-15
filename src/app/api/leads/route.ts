import { NextResponse } from "next/server";
import { getLeads } from "../_store";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const potentialMin = Number(searchParams.get("potentialMin") ?? 0);
  const potentialMax = Number(searchParams.get("potentialMax") ?? 100);
  const status = searchParams.get("status");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const leads = getLeads().filter((l) => {
    const pOk = l.potential >= potentialMin && l.potential <= potentialMax;
    const sOk = status ? l.status === status : true;
    const created = new Date(l.createdAt).getTime();
    const fOk = from ? created >= new Date(from).getTime() : true;
    const tOk = to ? created <= new Date(to).getTime() : true;
    return pOk && sOk && fOk && tOk;
  });

  return NextResponse.json({ leads });
}

