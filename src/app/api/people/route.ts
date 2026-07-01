import { NextRequest, NextResponse } from "next/server";
import { getPeople, registerPerson, isLiveRooms } from "@/lib/rooms/store";
import { pushEvent } from "@/lib/notifications/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { headers: { "Cache-Control": "no-store" } };
const clip = (v: unknown, max: number) =>
  typeof v === "string" ? v.slice(0, max) : undefined;

/** GET — the community roster (everyone who's joined). */
export async function GET() {
  const people = isLiveRooms() ? await getPeople() : [];
  return NextResponse.json({ live: isLiveRooms(), people }, noStore);
}

/** POST — record/refresh me in the roster; announce genuine newcomers. */
export async function POST(req: NextRequest) {
  if (!isLiveRooms()) {
    return NextResponse.json({ live: false }, noStore);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const userId = clip(body.userId, 64);
  const name = clip(body.name, 40);
  if (!userId || !name) {
    return NextResponse.json({ error: "userId and name required" }, { status: 400 });
  }

  const { person, isNew } = await registerPerson({
    userId,
    name,
    avatar: clip(body.avatar, 512) ?? "",
    favoriteTeamId: clip(body.favoriteTeamId, 16),
  });

  // Announce a real newcomer to the room (skip default/guest identities).
  if (isNew && name !== "You") {
    await pushEvent({
      id: `join:${userId}:${person.firstSeen}`,
      type: "join",
      kind: "friend_joined",
      title: `${name} joined the party`,
      body: `${name} just pulled up to Football Fever. Say hi 👋`,
      href: "/",
      accent: "var(--electric)",
      userId,
    });
  }

  return NextResponse.json({ live: true, person, isNew }, noStore);
}
