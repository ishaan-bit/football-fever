import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import type { ChatKind, ChatMessage } from "@/types";
import { appendMessage, getMessages, isLiveRooms } from "@/lib/rooms/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { headers: { "Cache-Control": "no-store" } };

const VALID_KINDS: ChatKind[] = [
  "text", "gif", "voice", "reaction", "system", "ai", "prediction", "moment",
];

const clip = (v: unknown, max: number) =>
  typeof v === "string" ? v.slice(0, max) : undefined;

/** GET ?since=<epoch ms> — messages received after `since`. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const now = Date.now();
  if (!isLiveRooms()) {
    return NextResponse.json({ live: false, messages: [], now }, noStore);
  }
  const since = Number(req.nextUrl.searchParams.get("since") ?? 0) || 0;
  const messages = await getMessages(roomId, since);
  return NextResponse.json({ live: true, messages, now }, noStore);
}

/** POST — publish a message to everyone in the room. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
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
  const authorName = clip(body.authorName, 40);
  if (!userId || !authorName) {
    return NextResponse.json({ error: "userId and authorName required" }, { status: 400 });
  }

  const kind = (VALID_KINDS as string[]).includes(body.kind as string)
    ? (body.kind as ChatKind)
    : "text";
  const bodyText = clip(body.body, 1000) ?? "";
  if (!bodyText.trim() && kind === "text") {
    return NextResponse.json({ error: "empty message" }, { status: 400 });
  }

  const msg: ChatMessage = {
    id: clip(body.id, 32) || nanoid(10),
    roomId,
    userId,
    authorName,
    authorAvatar: clip(body.authorAvatar, 512) ?? "",
    kind,
    body: bodyText,
    mediaUrl: clip(body.mediaUrl, 512),
    duration: typeof body.duration === "number" ? body.duration : undefined,
    reactions: {},
    createdAt: clip(body.createdAt, 40) || new Date().toISOString(),
  };

  const stored = await appendMessage(roomId, msg);
  return NextResponse.json({ ok: true, message: stored }, noStore);
}
