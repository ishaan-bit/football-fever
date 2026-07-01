"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChatMessage, Match, MatchEvent, ChatKind } from "@/types";
import { useSocialStore } from "@/stores/social";
import { useUserStore } from "@/stores/user";
import { FRIENDS, avatarFor } from "@/lib/data/people";
import { hostOnEvent, hostWelcome, hostIdleNudge } from "@/lib/ai/host";
import { statusFromClock } from "@/lib/data";
import { seededRandom, hashSeed } from "@/lib/utils";

const AMBIENT_LINES = [
  "this ref is having a mare 😤",
  "back three is actually working ngl",
  "who's getting snacks",
  "called it. screenshot incoming",
  "voice room is popping rn, get in",
  "that touch... unreal 🤌",
  "my heart cannot take knockout football",
  "VAR about to ruin my life again",
  "we are SO back",
  "nah that was never a foul",
  "keeper standing on business today 🧤",
  "if they lose this i'm logging off forever (i won't)",
  "tactical masterclass or are they just better",
  "ok who predicted this exactly",
  "the away end is LOUD",
];

const GOAL_REACTIONS = [
  "GOOOOAL 🔥🔥🔥",
  "NO WAY",
  "GET IN!!! 🙌",
  "i'm shaking",
  "absolute scenes",
  "told you. TOLD YOU.",
  "what a finish 😱",
];

interface UseRoomOptions {
  /** Provides the freshest projected match each tick (for live event reactions). */
  match?: () => Match | undefined;
  /** Fired when a goal crosses into the timeline — drive confetti/sound here. */
  onGoal?: (event: MatchEvent, match: Match) => void;
  /** Disable the demo simulation (e.g. when real users are present). */
  simulate?: boolean;
}

export function useRoom(roomId: string, options: UseRoomOptions = {}) {
  const { match, onGoal, simulate = true } = options;
  const profile = useUserStore((s) => s.profile);
  const store = useSocialStore();
  const messages = useSocialStore((s) => s.messages[roomId]) ?? [];
  const pinnedIds = useSocialStore((s) => s.pinned[roomId]) ?? [];

  const [typing, setTyping] = useState<Record<string, number>>({});
  const channelRef = useRef<BroadcastChannel | null>(null);
  const announced = useRef<Set<string> | null>(null);
  const welcomed = useRef(false);

  // Seed the room + cross-tab transport.
  useEffect(() => {
    store.ensureRoom(roomId);
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      const ch = new BroadcastChannel(`ff-room-${roomId}`);
      ch.onmessage = (e) => {
        const data = e.data;
        if (!data) return;
        if (data.type === "msg" && data.msg) {
          store.sendMessage(data.msg);
        } else if (data.type === "react") {
          store.addReaction(roomId, data.messageId, data.emoji, data.userId);
        } else if (data.type === "typing") {
          setTyping((t) => ({ ...t, [data.name]: Date.now() + 4000 }));
        }
      };
      channelRef.current = ch;
      return () => ch.close();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // Expire stale typing indicators.
  useEffect(() => {
    const id = setInterval(() => {
      setTyping((t) => {
        const now = Date.now();
        const next: Record<string, number> = {};
        for (const [k, v] of Object.entries(t)) if (v > now) next[k] = v;
        return next;
      });
    }, 1500);
    return () => clearInterval(id);
  }, []);

  // The simulation heartbeat: AI host reacts to verified events; friends chatter.
  useEffect(() => {
    if (!simulate) return;
    let i = 0;
    const id = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      i++;
      const m = match?.();

      // 1) AI host reacts to any newly-surfaced match event (never invents one).
      if (m) {
        const clock = statusFromClock(m.kickoff, Date.now());
        if (announced.current === null) {
          announced.current = new Set(m.events.map((e) => e.id));
        } else if (clock.status === "live" || clock.status === "halftime") {
          for (const ev of m.events) {
            if (announced.current.has(ev.id)) continue;
            announced.current.add(ev.id);
            const ai = hostOnEvent(ev, m);
            if (ai) store.addAiMessage(roomId, ai);
            if ((ev.type === "goal" || ev.type === "penalty_goal") && onGoal) onGoal(ev, m);
            // A friend piles on after a goal.
            if (ev.type === "goal" || ev.type === "penalty_goal") {
              const f = FRIENDS[Math.floor(seededRandom(hashSeed(ev.id))() * FRIENDS.length)]!;
              const line = GOAL_REACTIONS[Math.floor(seededRandom(hashSeed(ev.id + "r"))() * GOAL_REACTIONS.length)]!;
              store.sendMessage({
                roomId, userId: f.id, authorName: f.name, authorAvatar: f.avatar,
                kind: "text", body: line,
              });
            }
          }
        }

        // Pre-match welcome once.
        if (!welcomed.current && clock.status === "scheduled") {
          const ko = new Date(m.kickoff).getTime() - Date.now();
          if (ko < 30 * 60000 && ko > 0) {
            welcomed.current = true;
            store.addAiMessage(roomId, hostWelcome(m));
          }
        }
      }

      // 2) Ambient friend chatter (demo only, gently paced).
      if (i % 3 === 0) {
        const seed = seededRandom(hashSeed(roomId + i));
        if (seed() < 0.7) {
          const f = FRIENDS[Math.floor(seed() * FRIENDS.length)]!;
          const line = AMBIENT_LINES[Math.floor(seed() * AMBIENT_LINES.length)]!;
          store.sendMessage({
            roomId, userId: f.id, authorName: f.name, authorAvatar: f.avatar,
            kind: "text", body: line,
          });
        }
      }

      // 3) Occasional Oracle nudge when it's quiet.
      if (i % 11 === 0 && seededRandom(hashSeed(roomId + "idle" + i))() < 0.5) {
        store.addAiMessage(roomId, hostIdleNudge(match?.()));
      }
    }, 5200);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, simulate]);

  const send = useCallback(
    (body: string, kind: ChatKind = "text", extra?: Partial<ChatMessage>) => {
      if (!body.trim() && kind === "text") return;
      const msg = store.sendMessage({
        roomId,
        userId: profile.id,
        authorName: "You",
        authorAvatar: profile.avatar,
        kind,
        body,
        ...extra,
      });
      channelRef.current?.postMessage({ type: "msg", msg });
      return msg;
    },
    [roomId, profile.id, profile.avatar, store]
  );

  const react = useCallback(
    (messageId: string, emoji: string) => {
      store.addReaction(roomId, messageId, emoji, profile.id);
      channelRef.current?.postMessage({ type: "react", roomId, messageId, emoji, userId: profile.id });
    },
    [roomId, profile.id, store]
  );

  const pin = useCallback((messageId: string) => store.togglePin(roomId, messageId), [roomId, store]);

  const broadcastTyping = useCallback(() => {
    channelRef.current?.postMessage({ type: "typing", name: "You" });
  }, []);

  const typingNames = useMemo(() => Object.keys(typing), [typing]);

  return {
    messages,
    pinnedIds,
    typingNames,
    send,
    react,
    pin,
    broadcastTyping,
    avatarFor,
  };
}
