"use client";
import type { ChatMessage, PresenceMember, PresenceStatus } from "@/types";

/**
 * Browser transport for the live-rooms backend. All calls degrade gracefully:
 * a failed fetch resolves to an empty/neutral result so the UI never throws and
 * simply falls back to the simulated demo experience.
 */

/** Payload sent on a presence heartbeat. */
export interface HeartbeatInput {
  userId: string;
  name: string;
  avatar: string;
  status?: PresenceStatus;
  favoriteTeamId?: string;
}

interface RoomMemberDTO extends PresenceMember {
  ts: number;
}

// Probe the backend once per page load; both hooks share the result.
let modePromise: Promise<boolean> | null = null;

/** Whether real-time rooms are enabled for this deployment. Memoized. */
export function roomsLive(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (!modePromise) {
    modePromise = fetch("/api/rooms/status", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { live: false }))
      .then((d) => Boolean(d?.live))
      .catch(() => false);
  }
  return modePromise;
}

const enc = encodeURIComponent;

export async function heartbeat(
  roomId: string,
  input: HeartbeatInput
): Promise<PresenceMember[]> {
  try {
    const res = await fetch(`/api/rooms/${enc(roomId)}/presence`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ status: "watching", ...input }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { members?: RoomMemberDTO[] };
    return (data.members ?? []).map(toMember(roomId));
  } catch {
    return [];
  }
}

export async function fetchMessages(
  roomId: string,
  since: number
): Promise<{ messages: ChatMessage[]; now: number }> {
  try {
    const res = await fetch(
      `/api/rooms/${enc(roomId)}/messages?since=${since}`,
      { cache: "no-store" }
    );
    if (!res.ok) return { messages: [], now: since };
    const data = (await res.json()) as { messages?: ChatMessage[]; now?: number };
    return { messages: data.messages ?? [], now: data.now ?? since };
  } catch {
    return { messages: [], now: since };
  }
}

export async function publishMessage(roomId: string, msg: ChatMessage): Promise<void> {
  try {
    await fetch(`/api/rooms/${enc(roomId)}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      keepalive: true,
      body: JSON.stringify(msg),
    });
  } catch {
    // best-effort; the optimistic local copy already rendered
  }
}

const toMember = (roomId: string) => (m: RoomMemberDTO): PresenceMember => ({
  userId: m.userId,
  name: m.name,
  avatar: m.avatar,
  status: m.status,
  matchId: roomId,
});
