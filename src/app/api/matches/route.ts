import { NextResponse } from "next/server";
import { loadMatches, dataSourceStatus } from "@/lib/worldcup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Serves the live World Cup feed (worldcup26.ir) to the client, normalized to
 * our Match shape, with the deterministic seed as an automatic fallback. The
 * upstream fetch is cached ~15s (see lib/worldcup/client apiGet), so client
 * polling never hammers the API.
 */
export async function GET() {
  const [matches, status] = await Promise.all([loadMatches(), dataSourceStatus()]);
  return NextResponse.json(
    { matches, source: status.source },
    { headers: { "Cache-Control": "no-store" } }
  );
}
