"use client";

/** A notification event as delivered to the browser (see server NotifEvent). */
export interface NotifEventDTO {
  id: string;
  type: "prematch" | "result" | "join";
  kind: "kickoff" | "fulltime" | "friend_joined";
  title: string;
  body: string;
  matchId?: string;
  href?: string;
  accent?: string;
  userId?: string;
  ts: number;
  createdAt: string;
}

/** Fetch notification events created after `since` (epoch ms). Degrades to []. */
export async function fetchNotifications(
  since: number
): Promise<{ events: NotifEventDTO[]; now: number }> {
  try {
    const res = await fetch(`/api/notifications?since=${since}`, { cache: "no-store" });
    if (!res.ok) return { events: [], now: since };
    const data = (await res.json()) as { events?: NotifEventDTO[]; now?: number };
    return { events: data.events ?? [], now: data.now ?? since };
  } catch {
    return { events: [], now: since };
  }
}

/** Poke the scheduler scan (fallback for when Vercel Cron isn't running). */
export async function triggerScan(): Promise<void> {
  try {
    await fetch(`/api/notifications/scan`, { cache: "no-store" });
  } catch {
    // best-effort
  }
}
