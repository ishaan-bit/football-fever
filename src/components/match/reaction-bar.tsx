"use client";
import { useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { REACTIONS } from "@/lib/constants";
import { useSound } from "@/hooks/use-sound";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useHaptics } from "@/hooks/use-haptics";
import { hslVar } from "@/lib/utils";

interface Floater {
  id: number;
  emoji: string;
  x: number;
  /** horizontal drift target (px) — seeded at spawn, never during render */
  drift: number;
  /** end rotation (deg) */
  rot: number;
  /** peak scale */
  scale: number;
  /** slight travel variance (px) */
  rise: number;
}

let fid = 0;

const SPRING = { type: "spring", stiffness: 500, damping: 24 } as const;

export function ReactionBar({ onReact }: { onReact?: (emoji: string) => void }) {
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [burst, setBurst] = useState(0);
  const { play } = useSound();
  const { buzz } = useHaptics();
  const reduced = useReducedMotion();

  const react = useCallback(
    (emoji: string) => {
      play("pop");
      buzz("tap");
      onReact?.(emoji);
      if (reduced) return;
      setBurst((b) => b + 1);
      const f: Floater = {
        id: fid++,
        emoji,
        x: 30 + Math.random() * 40,
        drift: (Math.random() - 0.5) * 60,
        rot: (Math.random() - 0.5) * 60,
        scale: 1.15 + Math.random() * 0.35,
        rise: -140 - Math.random() * 40,
      };
      setFloaters((prev) => [...prev, f]);
      setTimeout(() => setFloaters((prev) => prev.filter((x) => x.id !== f.id)), 1800);
    },
    [onReact, play, buzz, reduced]
  );

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 bottom-full h-40 overflow-hidden">
        <AnimatePresence>
          {floaters.map((f) => (
            <motion.span
              key={f.id}
              initial={{ opacity: 0, y: 0, scale: 0.5, rotate: 0 }}
              animate={{
                opacity: [0, 1, 1, 0],
                y: f.rise,
                scale: [0.5, f.scale, f.scale * 0.9],
                x: [0, f.drift * 0.4, f.drift],
                rotate: [0, f.rot * 0.6, f.rot],
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.8, ease: "easeOut" }}
              className="absolute bottom-0 text-2xl will-change-transform"
              style={{
                left: `${f.x}%`,
                filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.35))",
              }}
            >
              {f.emoji}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>

      <div className="relative flex items-center gap-1 overflow-x-auto rounded-full border border-white/[0.07] bg-white/[0.03] p-1 no-scrollbar">
        {/* live aurora glow on the bar — subtle, gated on !reduced */}
        {!reduced && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 rounded-full"
            style={{
              background: `radial-gradient(120% 120% at 30% 0%, ${hslVar(
                "var(--electric)",
                0.1
              )}, transparent 60%), radial-gradient(120% 120% at 80% 100%, ${hslVar(
                "var(--live)",
                0.08
              )}, transparent 60%)`,
            }}
            animate={{ opacity: [0.55, 1, 0.55] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        {/* ring that pops out from the bar each time a reaction fires */}
        {!reduced && (
          <AnimatePresence>
            <motion.span
              key={burst}
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10 rounded-full"
              style={{ boxShadow: `0 0 0 1px ${hslVar("var(--electric)", 0.5)}` }}
              initial={{ opacity: burst === 0 ? 0 : 0.7, scale: 1 }}
              animate={{ opacity: 0, scale: 1.12 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </AnimatePresence>
        )}

        {REACTIONS.map((emoji, i) => (
          <motion.button
            key={emoji}
            onClick={() => react(emoji)}
            initial={reduced ? false : { opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ ...SPRING, delay: reduced ? 0 : i * 0.03 }}
            whileHover={reduced ? undefined : { y: -2, scale: 1.2 }}
            whileTap={{ scale: 0.9, rotate: -8 }}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-lg transition-colors hover:bg-white/10"
            aria-label={`React ${emoji}`}
          >
            {emoji}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
