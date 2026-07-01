import { NextRequest, NextResponse } from "next/server";
import { getEvents } from "@/lib/notifications/server";
import { isLiveRooms } from "@/lib/rooms/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { headers: { "Cache-Control": "no-store" } };

/** GET ?since=<epoch ms> — notification events created after `since`. */
export async function GET(req: NextRequest) {
  const now = Date.now();
  if (!isLiveRooms()) {
    return NextResponse.json({ live: false, events: [], now }, noStore);
  }
  const since = Number(req.nextUrl.searchParams.get("since") ?? 0) || 0;
  const events = await getEvents(since);
  return NextResponse.json({ live: true, events, now }, noStore);
}
