"use client";
import { useEffect, useMemo, useState } from "react";
import type { PresenceMember } from "@/types";
import { SEED_PRESENCE } from "@/lib/data/people";
import { useUserStore } from "@/stores/user";
import { REACTIONS } from "@/lib/constants";
import { seededRandom, hashSeed } from "@/lib/utils";

/** Live presence for a room. Uses simulated friend activity in demo mode so the
 *  room always feels populated; swap in Supabase Presence when configured. */
export function usePresence(roomId: string) {
  const profile = useUserStore((s) => s.profile);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 4500);
    return () => clearInterval(id);
  }, []);

  const members = useMemo<PresenceMember[]>(() => {
    const you: PresenceMember = {
      userId: profile.id,
      name: "You",
      avatar: profile.avatar,
      status: "watching",
      matchId: roomId,
    };
    const others = SEED_PRESENCE.map((m) => {
      const r = seededRandom(hashSeed(roomId + m.userId + tick))();
      return {
        ...m,
        matchId: roomId,
        typing: r > 0.82,
        reaction: r > 0.94 ? REACTIONS[Math.floor(r * REACTIONS.length)] : undefined,
      };
    });
    return [you, ...others];
  }, [profile.id, profile.avatar, roomId, tick]);

  const inCall = members.filter((m) => m.status === "in_call").length;
  const watching = members.filter(
    (m) => m.status === "watching" || m.status === "in_call"
  ).length;

  return { members, online: members.length, watching, inCall };
}
