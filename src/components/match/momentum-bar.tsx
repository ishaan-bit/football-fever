"use client";
import { motion } from "framer-motion";
import { clamp } from "@/lib/utils";

/** Broadcast-style momentum bar. `value` is -100 (away) .. 100 (home). */
export function MomentumBar({
  value, homeCode, awayCode, label = "Momentum",
}: {
  value: number;
  homeCode?: string;
  awayCode?: string;
  label?: string;
}) {
  const homeShare = clamp((value + 100) / 2, 0, 100);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide">
        <span className="text-electric">{homeCode}</span>
        <span className="text-muted-foreground">{label}</span>
        <span className="text-accent">{awayCode}</span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-gradient-to-r from-electric/25 via-white/10 to-accent/25">
        <motion.div
          className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white shadow-[0_0_12px_2px_rgba(255,255,255,0.5)]"
          animate={{ left: `calc(${homeShare}% - 6px)` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
      </div>
    </div>
  );
}
