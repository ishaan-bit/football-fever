"use client";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useNow } from "@/hooks/use-now";
import { backdropForDay } from "@/lib/backgrounds";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo } from "react";

/** The ambient stadium-night backdrop: a daily-rotating stadium photograph,
 *  aurora light field, faint pitch grid, drifting particles and a vignette.
 *  Sits fixed behind all content. */
export function BackgroundFX() {
  const reduced = useReducedMotion();
  // The backdrop only changes at the turn of each WC day (UTC midnight), so a
  // slow tick is plenty and keeps re-renders cheap.
  const now = useNow(60_000);
  const backdrop = backdropForDay(now);

  const particles = useMemo(
    () =>
      Array.from({ length: 18 }).map((_, i) => ({
        left: (i * 53) % 100,
        top: (i * 37 + 13) % 100,
        size: 1 + ((i * 7) % 3),
        delay: (i % 6) * 1.2,
        duration: 8 + ((i * 3) % 7),
      })),
    []
  );

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-background" />
      {/* The day's stadium photograph — crossfades at the turn of each WC day.
          Kept faint and top-masked so foreground content stays legible. */}
      <AnimatePresence initial={false}>
        <motion.div
          key={backdrop}
          className={`absolute inset-0 bg-cover bg-center ${reduced ? "" : "animate-ken-burns"}`}
          style={{
            backgroundImage: `url("${backdrop}")`,
            maskImage:
              "radial-gradient(125% 100% at 50% 0%, black 35%, transparent 78%)",
            WebkitMaskImage:
              "radial-gradient(125% 100% at 50% 0%, black 35%, transparent 78%)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.18 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 1.2, ease: "easeInOut" }}
        />
      </AnimatePresence>
      <div className={`absolute inset-0 aurora-field ${reduced ? "!animate-none" : ""}`} />
      {/* faint pitch grid */}
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--border)/0.4) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)/0.4) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(120% 90% at 50% 0%, black 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(120% 90% at 50% 0%, black 30%, transparent 75%)",
        }}
      />
      {!reduced && (
        <div className="absolute inset-0">
          {particles.map((p, i) => (
            <span
              key={i}
              className="absolute rounded-full bg-white/40 animate-float"
              style={{
                left: `${p.left}%`,
                top: `${p.top}%`,
                width: p.size,
                height: p.size,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
                opacity: 0.25,
              }}
            />
          ))}
        </div>
      )}
      {/* vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 100% at 50% -10%, transparent 40%, hsl(var(--background)) 100%)",
        }}
      />
    </div>
  );
}
