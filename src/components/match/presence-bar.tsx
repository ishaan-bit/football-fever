"use client";
import { useEffect, useRef } from "react";
import { Mic, Circle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { PresenceMember } from "@/types";
import { FriendStack } from "@/components/shared/friend-stack";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useSound } from "@/hooks/use-sound";
import { useHaptics } from "@/hooks/use-haptics";
import { hslVar } from "@/lib/utils";

export function PresenceBar({ members, inCall }: { members: PresenceMember[]; inCall: number }) {
  const typing = members.filter((m) => m.typing).slice(0, 2);
  const reduced = useReducedMotion();
  const { play } = useSound();
  const { buzz } = useHaptics();

  // Pop a subtle blip + buzz when someone joins the voice channel.
  const prevInCall = useRef(inCall);
  useEffect(() => {
    if (inCall > prevInCall.current) {
      play("pop");
      buzz("select");
    }
    prevInCall.current = inCall;
  }, [inCall, play, buzz]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 340, damping: 30 }}
      className="relative flex items-center justify-between gap-3 overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3 py-2"
    >
      {/* Ambient aurora sweep — gated on reduced motion. */}
      {!reduced && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-60"
          style={{
            background: `linear-gradient(110deg, transparent 30%, ${hslVar("var(--electric)", 0.1)} 50%, transparent 70%)`,
            backgroundSize: "220% 100%",
          }}
          animate={{ backgroundPosition: ["120% 0%", "-120% 0%"] }}
          transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
        />
      )}

      <div className="flex items-center gap-2">
        <FriendStack
          people={members.map((m) => ({ userId: m.userId, name: m.name, avatar: m.avatar }))}
          size="sm"
          max={6}
          label=""
        />
        <span className="text-xs text-muted-foreground">
          <motion.span
            key={members.length}
            initial={{ scale: reduced ? 1 : 1.5, color: hslVar("var(--electric)") }}
            animate={{ scale: 1, color: "inherit" }}
            transition={{ type: "spring", stiffness: 500, damping: 24 }}
            className="inline-block font-semibold tabular-nums text-foreground"
          >
            {members.length}
          </motion.span>{" "}
          in the room
        </span>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <AnimatePresence mode="popLayout">
          {typing.length > 0 && (
            <motion.span
              key="typing"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ type: "spring", stiffness: 340, damping: 30 }}
              className="hidden items-center gap-1 sm:flex"
            >
              <span className="flex gap-0.5">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="h-1 w-1 rounded-full bg-electric"
                    animate={reduced ? undefined : { y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }}
                  />
                ))}
              </span>
              {typing.map((t) => t.name).join(", ")} typing…
            </motion.span>
          )}
        </AnimatePresence>

        <AnimatePresence mode="popLayout">
          {inCall > 0 && (
            <motion.span
              key="voice"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 500, damping: 24 }}
              className="flex items-center gap-1 text-pitch"
            >
              <motion.span
                animate={reduced ? undefined : { scale: [1, 1.18, 1] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
              >
                <Mic className="h-3 w-3" />
              </motion.span>
              <motion.span
                key={inCall}
                initial={{ scale: reduced ? 1 : 1.6, y: reduced ? 0 : -2 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 24 }}
                className="inline-block font-semibold tabular-nums"
              >
                {inCall}
              </motion.span>{" "}
              in voice
            </motion.span>
          )}
        </AnimatePresence>

        <span className="relative flex items-center gap-1.5 text-live">
          <span className="relative flex h-2 w-2 items-center justify-center">
            {!reduced && (
              <motion.span
                aria-hidden
                className="absolute inset-0 rounded-full bg-live"
                animate={{ scale: [1, 2.4, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
              />
            )}
            <Circle className="relative h-2 w-2 fill-current" />
          </span>
          Live room
        </span>
      </div>
    </motion.div>
  );
}
