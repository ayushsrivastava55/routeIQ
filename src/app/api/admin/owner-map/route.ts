import { NextRequest, NextResponse } from "next/server";
import { loadOwnerMap, saveOwnerMap } from "@/lib/ownerMap";

export async function GET() {
  try {
    const map = loadOwnerMap();
    return NextResponse.json({ map });
  } catch (e) {
    return NextResponse.json({ error: "Failed to load owner map" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const map = body?.map || {};
    if (typeof map !== "object" || Array.isArray(map)) {
      return NextResponse.json({ error: "map must be an object" }, { status: 400 });
    }
    saveOwnerMap(map);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Failed to save owner map" }, { status: 500 });
  }
}
