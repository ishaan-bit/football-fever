"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PresenceMember } from "@/types";
import { SEED_PRESENCE, ORACLE_PROFILE } from "@/lib/data/people";
import { useUserStore } from "@/stores/user";
import { REACTIONS } from "@/lib/constants";
import { seededRandom, hashSeed } from "@/lib/utils";
import { roomsLive, heartbeat as apiHeartbeat } from "@/lib/rooms/client";
import { firebaseEnabled } from "@/lib/firebase/config";

/** Heartbeat cadence — also the demo simulation tick. */
const BEAT_MS = 4500;
/** Firebase heartbeat cadence (Firestore writes; a touch slower). */
const FB_BEAT_MS = 10_000;

/**
 * Live presence for a room. Three tiers, in priority order:
 *  1. Firebase (Firestore realtime) — reflects the actual people in the room
 *     the instant they join or leave. This is what fixes the Lounge.
 *  2. The lightweight API backend (Upstash/in-memory) — heartbeat + poll.
 *  3. Demo simulation — deterministic fake friends so the app never feels empty.
 */
export function usePresence(roomId: string) {
  const profile = useUserStore((s) => s.profile);
  const [tick, setTick] = useState(0);
  const [real, setReal] = useState(firebaseEnabled);
  const [remote, setRemote] = useState<PresenceMember[]>([]);

  const prof = useRef(profile);
  prof.current = profile;

  // Demo simulation heartbeat (only meaningful when not on a real backend).
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), BEAT_MS);
    return () => clearInterval(id);
  }, []);

  // Tier 1 — Firebase realtime presence.
  useEffect(() => {
    if (!firebaseEnabled) return;
    let cleanup = () => {};
    let hb: ReturnType<typeof setInterval>;
    let stopped = false;

    import("@/lib/firebase/presence").then((fp) => {
      if (stopped) return;
      const unsub = fp.subscribePresence(roomId, (members) =>
        setRemote(members.filter((m) => m.userId !== prof.current.id))
      );
      const beat = () =>
        fp.heartbeat(roomId, {
          userId: prof.current.id,
          name: prof.current.name,
          avatar: prof.current.avatar,
          favoriteTeamId: prof.current.favoriteTeamId,
        });
      beat();
      hb = setInterval(beat, FB_BEAT_MS);
      cleanup = () => {
        unsub();
        clearInterval(hb);
        fp.leave(roomId, prof.current.id);
      };
    });

    return () => {
      stopped = true;
      clearInterval(hb);
      cleanup();
    };
  }, [roomId]);

  // Tier 2 — API backend heartbeat (only when Firebase isn't configured).
  useEffect(() => {
    if (firebaseEnabled) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;

    roomsLive().then((isLive) => {
      if (stopped || !isLive) return;
      setReal(true);
      const beat = async () => {
        const p = prof.current;
        const members = await apiHeartbeat(roomId, {
          userId: p.id,
          name: p.name,
          avatar: p.avatar,
          status: "watching",
          favoriteTeamId: p.favoriteTeamId,
        });
        if (stopped) return;
        setRemote(members.filter((m) => m.userId !== p.id));
        timer = setTimeout(beat, BEAT_MS);
      };
      beat();
    });

    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [roomId]);

  const members = useMemo<PresenceMember[]>(() => {
    const you: PresenceMember = {
      userId: profile.id,
      name: profile.name,
      avatar: profile.avatar,
      status: "watching",
      matchId: roomId,
    };

    if (real) {
      // Real members + the Oracle as a persistent AI participant.
      const oracle: PresenceMember = {
        userId: "oracle",
        name: ORACLE_PROFILE.name,
        avatar: ORACLE_PROFILE.avatar,
        status: "watching",
        matchId: roomId,
      };
      const others = remote.filter((m) => m.userId !== "oracle" && m.userId !== profile.id);
      return [you, oracle, ...others];
    }

    // Demo mode: deterministic simulated friend activity.
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
  }, [real, remote, profile.id, profile.name, profile.avatar, roomId, tick]);

  const inCall = members.filter((m) => m.status === "in_call").length;
  const watching = members.filter(
    (m) => m.status === "watching" || m.status === "in_call"
  ).length;

  return { members, online: members.length, watching, inCall };
}
