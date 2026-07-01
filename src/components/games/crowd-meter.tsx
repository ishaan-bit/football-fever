"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Volume2 } from "lucide-react";
import { useSound } from "@/hooks/use-sound";
import { cn } from "@/lib/utils";

/** Crowd Meter — mash to make noise. The room's collective energy is simulated
 *  so the bar always feels alive even solo. */
export function CrowdMeter({ compact = false }: { compact?: boolean }) {
  const [energy, setEnergy] = useState(28);
  const [taps, setTaps] = useState(0);
  const [combo, setCombo] = useState(0);
  const lastTap = useRef(0);
  const { play } = useSound();

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
    setEnergy((e) => Math.min(100, e + 6 + Math.min(nextCombo, 8)));
    play("pop");
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(12);
  };

  const level = energy > 85 ? "DEAFENING" : energy > 60 ? "ROARING" : energy > 38 ? "Buzzing" : "Murmuring";
  const color = energy > 85 ? "var(--live)" : energy > 60 ? "var(--gold)" : "var(--electric)";

  return (
    <div className={cn("rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4", compact && "p-3")}>
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-semibold"><Volume2 className="h-4 w-4 text-electric" /> Crowd Meter</span>
        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: `hsl(${color})` }}>{level}</span>
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
            whileTap={{ scale: 0.94 }}
            className="relative grid aspect-square w-full max-w-[140px] place-items-center rounded-full border border-white/15 bg-gradient-to-br from-electric/30 to-accent/30 font-display text-lg font-bold"
          >
            <motion.span
              key={taps}
              initial={{ scale: 1 }}
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 0.2 }}
            >
              ROAR
            </motion.span>
            {combo > 2 && (
              <span className="absolute -right-1 -top-1 rounded-full bg-gold px-2 py-0.5 text-xs font-bold text-background">
                ×{combo}
              </span>
            )}
          </motion.button>
          <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
            <span>Your roars: <b className="text-foreground">{taps}</b></span>
            <span>{Math.round(energy)}% loud</span>
          </div>
        </div>
      </div>
    </div>
  );
}
