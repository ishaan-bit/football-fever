"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Goal, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSound } from "@/hooks/use-sound";
import { useHaptics } from "@/hooks/use-haptics";
import { useConfetti } from "@/hooks/use-confetti";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn, hslVar, seededRandom, hashSeed } from "@/lib/utils";

const ACCENT = "var(--magenta)";
const TOTAL = 5;
// 6 zones in a 3x2 grid. index = row*3 + col.
const ZONES = [0, 1, 2, 3, 4, 5];

// pixel target offsets (relative to goal box) for keeper + ball animation
const ZONE_POS = [
  { x: "16%", y: "30%" },
  { x: "50%", y: "26%" },
  { x: "84%", y: "30%" },
  { x: "16%", y: "70%" },
  { x: "50%", y: "74%" },
  { x: "84%", y: "70%" },
];

interface Shot {
  pick: number;
  keeper: number;
  scored: boolean;
}

export function PenaltyPanic() {
  const { play } = useSound();
  const { buzz } = useHaptics();
  const { celebrate, burst } = useConfetti();
  const reduced = useReducedMotion();

  const [shots, setShots] = useState<Shot[]>([]);
  const [current, setCurrent] = useState<Shot | null>(null);
  const [locked, setLocked] = useState(false);
  const [run, setRun] = useState(0); // seeds keeper per fresh game

  const goals = shots.filter((s) => s.scored).length;
  const done = shots.length >= TOTAL;

  const keeperFor = useCallback(
    (shotIndex: number) => {
      const rng = seededRandom(hashSeed(`pen-${run}-${shotIndex}`));
      return Math.floor(rng() * 6);
    },
    [run]
  );

  const shoot = (pick: number) => {
    if (locked || done) return;
    setLocked(true);
    const keeper = keeperFor(shots.length);
    const scored = keeper !== pick;
    const shot: Shot = { pick, keeper, scored };
    setCurrent(shot);
    play("whistle");
    buzz("impact");

    const resolve = () => {
      if (scored) {
        play("goal");
        buzz("success");
        const pos = ZONE_POS[pick]!;
        // burst near the picked zone (approximate, upper area of screen)
        burst(0.5, 0.4, ["#22e0a1", "#ffce3a", "#19c3ff"]);
      } else {
        play("error");
        buzz("fail");
      }
      setShots((s) => [...s, shot]);
      setCurrent(null);
      setLocked(false);
    };
    if (reduced) resolve();
    else window.setTimeout(resolve, 850);
  };

  const restart = () => {
    play("click");
    buzz("tap");
    setShots([]);
    setCurrent(null);
    setLocked(false);
    setRun((r) => r + 1);
  };

  const grade = useMemo(() => {
    if (!done) return null;
    if (goals === 5) return { label: "PERFECT — ice in the veins.", color: "var(--gold)" };
    if (goals >= 4) return { label: "Clinical from the spot.", color: "var(--pitch)" };
    if (goals >= 3) return { label: "Held your nerve. Mostly.", color: "var(--electric)" };
    if (goals >= 1) return { label: "The keeper had your number.", color: "var(--live)" };
    return { label: "Brutal. Not a single one.", color: "var(--live)" };
  }, [done, goals]);

  const keeperPos = current ? ZONE_POS[current.keeper]! : ZONE_POS[4]!;

  // celebrate a great final result exactly once per completed game
  const celebrated = useRef(false);
  useEffect(() => {
    if (!done) {
      celebrated.current = false;
      return;
    }
    if (celebrated.current) return;
    celebrated.current = true;
    if (goals >= 4) {
      play("win");
      buzz("win");
      void celebrate(goals === 5 ? ["#ffce3a", "#22e0a1", "#19c3ff"] : undefined);
    }
  }, [done, goals, play, buzz, celebrate]);

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs text-muted-foreground">
        How to play: tap a corner to shoot. The keeper guesses too — beat him {TOTAL} times.
      </p>

      {/* scoreline */}
      <div className="flex items-center justify-between rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
        <span className="text-sm font-semibold">
          You{" "}
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={goals}
              className="inline-block font-display text-xl font-bold text-magenta tabular-nums"
              initial={reduced ? false : { scale: 0.4, y: -6, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={reduced ? { opacity: 0 } : { scale: 1.6, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 18 }}
            >
              {goals}
            </motion.span>
          </AnimatePresence>
        </span>
        <div className="flex gap-1.5">
          {Array.from({ length: TOTAL }).map((_, i) => {
            const s = shots[i];
            return (
              <span
                key={i}
                className={cn(
                  "h-2.5 w-2.5 rounded-full",
                  s ? (s.scored ? "bg-pitch" : "bg-live") : "bg-white/15"
                )}
              />
            );
          })}
        </div>
        <span className="text-sm font-semibold text-muted-foreground">
          {shots.length}/{TOTAL}
        </span>
      </div>

      {/* goal */}
      <motion.div
        className="relative mx-auto aspect-[3/2] w-full max-w-sm select-none overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-electric/10 to-pitch/10 p-2"
        animate={
          reduced || !current
            ? undefined
            : current.scored
              ? { scale: [1, 1.02, 1] }
              : { x: [0, -7, 7, -5, 5, 0] }
        }
        transition={{ delay: current && !reduced ? 0.5 : 0, duration: 0.35 }}
      >
        {/* net */}
        <div
          className="absolute inset-2 rounded-xl border border-white/15"
          style={{
            backgroundImage:
              "linear-gradient(hsl(0 0% 100% / 0.06) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100% / 0.06) 1px, transparent 1px)",
            backgroundSize: "14px 14px",
          }}
        />

        {/* zones */}
        <div className="relative grid h-full grid-cols-3 grid-rows-2 gap-1.5">
          {ZONES.map((z) => (
            <motion.button
              key={z}
              onTapStart={() => {
                if (locked || done) return;
                play("pop");
                buzz("tap");
              }}
              onClick={() => shoot(z)}
              disabled={locked || done}
              whileTap={reduced ? undefined : { scale: 0.92 }}
              transition={{ type: "spring", stiffness: 600, damping: 22 }}
              className={cn(
                "group rounded-lg border border-white/[0.06] transition-colors disabled:cursor-default",
                "hover:border-magenta/50 hover:bg-magenta/10"
              )}
              aria-label={`Shoot zone ${z + 1}`}
            >
              <span className="grid h-full place-items-center text-xl opacity-0 transition-opacity group-hover:opacity-100">
                🎯
              </span>
            </motion.button>
          ))}
        </div>

        {/* keeper */}
        <AnimatePresence>
          {current && (
            <motion.div
              key={`keeper-${shots.length}`}
              className="pointer-events-none absolute text-3xl"
              initial={{ left: "50%", top: "70%", x: "-50%", y: "-50%", scale: 0.8 }}
              animate={{ left: keeperPos.x, top: keeperPos.y, x: "-50%", y: "-50%", scale: 1.05, rotate: reduced ? 0 : current.keeper < 3 ? -12 : 12 }}
              transition={{ type: "spring", stiffness: 200, damping: 16 }}
            >
              🧤
            </motion.div>
          )}
        </AnimatePresence>

        {/* ball */}
        <AnimatePresence>
          {current && (
            <motion.div
              key={`ball-${shots.length}`}
              className="pointer-events-none absolute text-2xl"
              initial={{ left: "50%", top: "108%", x: "-50%", y: "-50%", scale: 0.6 }}
              animate={{
                left: ZONE_POS[current.pick]!.x,
                top: ZONE_POS[current.pick]!.y,
                x: "-50%",
                y: "-50%",
                scale: current.scored ? 0.9 : 0.7,
              }}
              transition={{ duration: reduced ? 0 : 0.5, ease: [0.4, 0, 0.2, 1] }}
            >
              ⚽️
            </motion.div>
          )}
        </AnimatePresence>

        {/* result flash */}
        <AnimatePresence>
          {current && !reduced && (
            <motion.div
              key={`flash-${shots.length}`}
              className="pointer-events-none absolute inset-0 grid place-items-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0, 1, 1], scale: [0.6, 0.6, 1.1, 1] }}
              transition={{ duration: 0.85, times: [0, 0.5, 0.7, 1] }}
            >
              <span
                className="font-display text-2xl font-black uppercase tracking-wider drop-shadow-lg"
                style={{ color: current.scored ? hslVar("var(--pitch)") : hslVar("var(--live)") }}
              >
                {current.scored ? "GOAL!" : "SAVED!"}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* footer / result */}
      {done ? (
        <motion.div
          className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 text-center"
          initial={reduced ? false : { opacity: 0, scale: 0.9, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
        >
          <motion.p
            className="font-display text-2xl font-black tabular-nums"
            initial={reduced ? false : { scale: 0.6 }}
            animate={reduced ? undefined : { scale: [0.6, 1.18, 1] }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            {goals} / {TOTAL}
          </motion.p>
          {grade && <p className="mt-1 text-sm font-semibold" style={{ color: hslVar(grade.color) }}>{grade.label}</p>}
          <motion.div whileTap={reduced ? undefined : { scale: 0.96 }}>
            <Button variant="default" className="mt-3 w-full" onClick={restart} style={{ background: hslVar(ACCENT), color: "hsl(var(--background))" }}>
              <RotateCcw className="h-4 w-4" /> Play again
            </Button>
          </motion.div>
        </motion.div>
      ) : (
        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Goal className="h-3.5 w-3.5 text-magenta" /> Pick a corner. The keeper's already guessing.
        </p>
      )}
    </div>
  );
}
