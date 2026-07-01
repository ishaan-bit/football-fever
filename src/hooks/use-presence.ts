"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PresenceMember } from "@/types";
import { SEED_PRESENCE, ORACLE_PROFILE } from "@/lib/data/people";
import { useUserStore } from "@/stores/user";
import { REACTIONS } from "@/lib/constants";
import { seededRandom, hashSeed } from "@/lib/utils";
import { roomsLive, heartbeat } from "@/lib/rooms/client";

/** Heartbeat cadence — also the demo simulation tick. */
const BEAT_MS = 4500;

/**
 * Live presence for a room. When a real backend is configured it reflects the
 * actual people in the room (with their real nicknames); otherwise it falls
 * back to simulated friend activity so the demo always feels populated.
 */
export function usePresence(roomId: string) {
  const profile = useUserStore((s) => s.profile);
  const [tick, setTick] = useState(0);
  const [live, setLive] = useState(false);
  const [remote, setRemote] = useState<PresenceMember[]>([]);

  // Demo simulation heartbeat (only meaningful when not live).
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), BEAT_MS);
    return () => clearInterval(id);
  }, []);

  // Real presence: announce myself on a heartbeat and read back who's here.
  const prof = useRef(profile);
  prof.current = profile;
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;

    roomsLive().then((isLive) => {
      if (stopped || !isLive) return;
      setLive(true);
      const beat = async () => {
        const p = prof.current;
        const members = await heartbeat(roomId, {
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

    if (live) {
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
  }, [live, remote, profile.id, profile.name, profile.avatar, roomId, tick]);

  const inCall = members.filter((m) => m.status === "in_call").length;
  const watching = members.filter(
    (m) => m.status === "watching" || m.status === "in_call"
  ).length;

  return { members, online: members.length, watching, inCall };
}
