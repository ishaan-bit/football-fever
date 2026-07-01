"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Volume2 } from "lucide-react";
import { useSound } from "@/hooks/use-sound";
import { useHaptics } from "@/hooks/use-haptics";
import { useConfetti } from "@/hooks/use-confetti";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

/** Crowd Meter — mash to make noise. The room's collective energy is simulated
 *  so the bar always feels alive even solo. */
export function CrowdMeter({ compact = false }: { compact?: boolean }) {
  const [energy, setEnergy] = useState(28);
  const [taps, setTaps] = useState(0);
  const [combo, setCombo] = useState(0);
  const lastTap = useRef(0);
  const { play } = useSound();
  const { buzz } = useHaptics();
  const { celebrate } = useConfetti();
  const reduced = useReducedMotion();
  const deafening = useRef(false);

  // decay + ambient room noise
  useEffect(() => {
    const id = setInterval(() => {
      setEnergy((e) => {
        const ambient = 18 + Math.sin(Date.now() / 1400) * 10;
        const decayed = e - 3.5;
        return Math.max(ambient, Math.min(100, decayed));
      });
    }, 240);
    return () => clearInterval(id);
  }, []);

  const roar = () => {
    const now = Date.now();
    const fast = now - lastTap.current < 320;
    lastTap.current = now;
    const nextCombo = fast ? combo + 1 : 1;
    setCombo(nextCombo);
    setTaps((t) => t + 1);
    setEnergy((e) => {
      const next = Math.min(100, e + 6 + Math.min(nextCombo, 8));
      // Crossing into DEAFENING is the big payoff — celebrate once until it drops back.
      if (next > 85) {
        if (!deafening.current) {
          deafening.current = true;
          buzz("win");
          play("goal");
          celebrate(["#ff375f", "#ffce3a", "#19c3ff"]);
        } else {
          buzz("heavy");
        }
      } else if (next > 60) {
        deafening.current = false;
        buzz("impact");
      } else {
        deafening.current = false;
        buzz("tap");
      }
      return next;
    });
    play("pop");
  };

  const level = energy > 85 ? "DEAFENING" : energy > 60 ? "ROARING" : energy > 38 ? "Buzzing" : "Murmuring";
  const color = energy > 85 ? "var(--live)" : energy > 60 ? "var(--gold)" : "var(--electric)";
  const loud = Math.round(energy);
  const hot = energy > 85;

  return (
    <div className={cn("rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4", compact && "p-3")}>
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-semibold"><Volume2 className="h-4 w-4 text-electric" /> Crowd Meter</span>
        <AnimatePresence mode="popLayout">
          <motion.span
            key={level}
            initial={{ y: -6, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 6, opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 420, damping: 26 }}
            className="text-xs font-bold uppercase tracking-wide"
            style={{ color: `hsl(${color})` }}
          >
            {level}
          </motion.span>
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative h-28 w-7 overflow-hidden rounded-full bg-white/[0.06]">
          <motion.div
            className="absolute bottom-0 w-full rounded-full"
            style={{ background: `linear-gradient(to top, hsl(var(--electric)), hsl(${color}))` }}
            animate={{ height: `${energy}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 18 }}
          />
        </div>

        <div className="flex-1">
          <motion.button
            onClick={roar}
            whileTap={{ scale: 0.92 }}
            animate={
              !reduced && hot
                ? { boxShadow: ["0 0 0px hsl(var(--live)/0)", "0 0 26px hsl(var(--live)/0.6)", "0 0 0px hsl(var(--live)/0)"] }
                : { boxShadow: "0 0 0px hsl(var(--live)/0)" }
            }
            transition={{ duration: 0.7, repeat: hot ? Infinity : 0, ease: "easeInOut" }}
            className="relative grid aspect-square w-full max-w-[140px] place-items-center rounded-full border border-white/15 bg-gradient-to-br from-electric/30 to-accent/30 font-display text-lg font-bold"
          >
            <motion.span
              key={taps}
              initial={{ scale: 1, rotate: 0 }}
              animate={{ scale: [1, 1.18, 1], rotate: hot && !reduced ? [0, -3, 3, 0] : 0 }}
              transition={{ duration: 0.2 }}
            >
              ROAR
            </motion.span>
            <AnimatePresence>
              {combo > 2 && (
                <motion.span
                  key="combo"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 20 }}
                  className="absolute -right-1 -top-1 rounded-full bg-gold px-2 py-0.5 text-xs font-bold text-background"
                >
                  ×{combo}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
          <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
            <span>Your roars: <b className="text-foreground">{taps}</b></span>
            <span className="tabular-nums">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.b
                  key={loud}
                  initial={{ y: 6, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -6, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="inline-block text-foreground"
                >
                  {loud}
                </motion.b>
              </AnimatePresence>
              % loud
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
