import { NextResponse } from "next/server";
import { isLiveRooms, roomsBackend } from "@/lib/rooms/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Capability probe. The client hits this once to decide whether to run real
 * live rooms (presence + chat sync) or the fully-simulated demo experience.
 */
export async function GET() {
  return NextResponse.json(
    { live: isLiveRooms(), backend: roomsBackend() },
    { headers: { "Cache-Control": "no-store" } }
  );
}
