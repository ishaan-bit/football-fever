"use client";
import { useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { REACTIONS } from "@/lib/constants";
import { useSound } from "@/hooks/use-sound";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

interface Floater {
  id: number;
  emoji: string;
  x: number;
}

let fid = 0;

export function ReactionBar({ onReact }: { onReact?: (emoji: string) => void }) {
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const { play } = useSound();
  const reduced = useReducedMotion();

  const react = useCallback(
    (emoji: string) => {
      play("pop");
      onReact?.(emoji);
      if (reduced) return;
      const f = { id: fid++, emoji, x: 30 + Math.random() * 40 };
      setFloaters((prev) => [...prev, f]);
      setTimeout(() => setFloaters((prev) => prev.filter((x) => x.id !== f.id)), 1800);
    },
    [onReact, play, reduced]
  );

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 bottom-full h-40 overflow-hidden">
        <AnimatePresence>
          {floaters.map((f) => (
            <motion.span
              key={f.id}
              initial={{ opacity: 0, y: 0, scale: 0.6 }}
              animate={{ opacity: [0, 1, 1, 0], y: -150, scale: 1.2, x: [0, (Math.random() - 0.5) * 30] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.8, ease: "easeOut" }}
              className="absolute bottom-0 text-2xl"
              style={{ left: `${f.x}%` }}
            >
              {f.emoji}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
      <div className="flex items-center gap-1 overflow-x-auto rounded-full border border-white/[0.07] bg-white/[0.03] p-1 no-scrollbar">
        {REACTIONS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => react(emoji)}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-lg transition hover:scale-125 hover:bg-white/10 active:scale-95"
            aria-label={`React ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
