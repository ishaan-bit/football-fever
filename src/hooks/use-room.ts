"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChatMessage, Match, MatchEvent, ChatKind } from "@/types";
import { useSocialStore } from "@/stores/social";
import { useUserStore } from "@/stores/user";
import { FRIENDS, avatarFor } from "@/lib/data/people";
import { hostOnEvent, hostWelcome, hostIdleNudge } from "@/lib/ai/host";
import { statusFromClock } from "@/lib/data";
import { seededRandom, hashSeed } from "@/lib/utils";
import { roomsLive, fetchMessages, publishMessage } from "@/lib/rooms/client";
import { firebaseEnabled } from "@/lib/firebase/config";

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
  // Firebase, when configured, is the real backend — treat it as "live" so the
  // demo bots stay quiet and real people carry the room.
  const [live, setLive] = useState(firebaseEnabled);
  const liveRef = useRef(firebaseEnabled);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const announced = useRef<Set<string> | null>(null);
  const welcomed = useRef(false);
  const sinceRef = useRef(0);
  const fbRef = useRef<typeof import("@/lib/firebase/rooms") | null>(null);

  // Detect whether the API backend is available (skipped when Firebase is on).
  useEffect(() => {
    if (firebaseEnabled) return;
    roomsLive().then((isLive) => {
      liveRef.current = isLive;
      setLive(isLive);
    });
  }, []);

  // Firebase chat: subscribe to realtime messages and merge them (de-duped).
  useEffect(() => {
    if (!firebaseEnabled) return;
    let stopped = false;
    let unsub = () => {};
    import("@/lib/firebase/rooms").then((mod) => {
      if (stopped) return;
      fbRef.current = mod;
      unsub = mod.subscribeMessages(roomId, (msgs) => store.mergeMessages(roomId, msgs));
    });
    return () => {
      stopped = true;
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // Live mode: poll the API backend for messages and merge them (de-duped).
  // Skipped when Firebase is on (that path uses realtime subscriptions above).
  useEffect(() => {
    if (firebaseEnabled || !live) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      if (typeof document !== "undefined" && document.hidden) {
        timer = setTimeout(poll, 3000);
        return;
      }
      const { messages: incoming, now } = await fetchMessages(roomId, sinceRef.current);
      if (stopped) return;
      if (incoming.length) store.mergeMessages(roomId, incoming);
      sinceRef.current = now;
      timer = setTimeout(poll, 3000);
    };
    poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, roomId]);

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
            // A friend piles on after a goal (simulated demo chatter only —
            // in a live room the real people do the reacting).
            if (!liveRef.current && (ev.type === "goal" || ev.type === "penalty_goal")) {
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

      // Ambient chatter + idle nudges are demo texture only. In a live room the
      // real people carry the conversation, so we stay out of their way.
      if (!liveRef.current) {
        // 2) Ambient friend chatter (gently paced).
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
        // Your real nickname travels with the message so everyone else in the
        // room sees who's talking — not a generic "You".
        authorName: profile.name,
        authorAvatar: profile.avatar,
        kind,
        body,
        ...extra,
      });
      if (firebaseEnabled) {
        // Realtime fan-out to everyone in the room; the snapshot echoes our own
        // message back and merge de-dupes it by id.
        if (fbRef.current) fbRef.current.publishMessage(roomId, msg);
        else import("@/lib/firebase/rooms").then((m) => m.publishMessage(roomId, msg));
      } else if (liveRef.current) {
        // API backend: our optimistic copy is added above; the next poll echoes
        // it back and merge de-dupes by id (no cursor bump — avoids clock skew).
        publishMessage(roomId, msg);
      } else {
        // Demo mode: same-browser cross-tab echo.
        channelRef.current?.postMessage({ type: "msg", msg });
      }
      return msg;
    },
    [roomId, profile.id, profile.name, profile.avatar, store]
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
    channelRef.current?.postMessage({ type: "typing", name: profile.name });
  }, [profile.name]);

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
