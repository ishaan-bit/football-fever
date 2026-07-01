import { NextResponse } from "next/server";
import { loadMatches } from "@/lib/worldcup";
import { scanMatches } from "@/lib/notifications/server";
import { isLiveRooms } from "@/lib/rooms/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The scheduler tick. Vercel Cron hits this on a schedule (see vercel.json), and
 * active clients also poke it as a fallback so alerts still fire without Cron.
 * It's idempotent — every alert is deduped server-side — and naturally rate
 * limited by the ~15s cache on the upstream match feed, so extra calls are cheap.
 */
export async function GET() {
  const now = Date.now();
  if (!isLiveRooms()) {
    return NextResponse.json(
      { live: false, created: 0 },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
  const matches = await loadMatches(now);
  const created = await scanMatches(matches, now);
  return NextResponse.json(
    {
      live: true,
      scanned: matches.length,
      created: created.length,
      events: created.map((e) => ({ id: e.id, type: e.type, title: e.title })),
      now,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
