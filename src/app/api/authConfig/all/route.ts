import { NextResponse } from "next/server";
import { getComposio } from "@/lib/composio";

export async function POST() {
  try {
    const composio = getComposio();
    const authConfig = await composio.authConfigs.list();
    return NextResponse.json(authConfig);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch auth configs" }, { status: 500 });
  }
}
