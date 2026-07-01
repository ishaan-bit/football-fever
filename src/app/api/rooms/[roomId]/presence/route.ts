import { NextRequest, NextResponse } from "next/server";
import type { PresenceStatus } from "@/types";
import { getPresence, heartbeat, isLiveRooms, type RoomMember } from "@/lib/rooms/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { headers: { "Cache-Control": "no-store" } };
const VALID_STATUS: PresenceStatus[] = ["watching", "online", "in_call", "away", "offline"];

const clip = (v: unknown, max: number) =>
  typeof v === "string" ? v.slice(0, max) : undefined;

/** GET — the room's currently-live members. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const members = isLiveRooms() ? await getPresence(roomId) : [];
  return NextResponse.json({ live: isLiveRooms(), members }, noStore);
}

/** POST — heartbeat: announce/refresh me, and read back who's here. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  if (!isLiveRooms()) {
    return NextResponse.json({ live: false, members: [] }, noStore);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const userId = clip(body.userId, 64);
  const name = clip(body.name, 40);
  const avatar = clip(body.avatar, 512);
  if (!userId || !name) {
    return NextResponse.json({ error: "userId and name required" }, { status: 400 });
  }

  const status = (VALID_STATUS as string[]).includes(body.status as string)
    ? (body.status as PresenceStatus)
    : "watching";

  const member: Omit<RoomMember, "ts"> = {
    userId,
    name,
    avatar: avatar ?? "",
    status,
    favoriteTeamId: clip(body.favoriteTeamId, 16),
  };

  const members = await heartbeat(roomId, member);
  return NextResponse.json({ live: true, members }, noStore);
}
