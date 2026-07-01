"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, RotateCcw, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSound } from "@/hooks/use-sound";
import { useConfetti } from "@/hooks/use-confetti";
import { useHaptics } from "@/hooks/use-haptics";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn, hslVar, seededRandom, hashSeed } from "@/lib/utils";

const ACCENT = "var(--gold)";

interface Result {
  actual: number;
  diff: number;
  points: number;
  label: string;
  color: string;
}

function scoreFor(pick: number, attempt: number): Result {
  const rng = seededRandom(hashSeed(`golden-${attempt}`));
  // weight goals toward the busier parts of a match
  const buckets = [
    [10, 30],
    [30, 45],
    [45, 60],
    [60, 80],
    [80, 90],
  ];
  const b = buckets[Math.floor(rng() * buckets.length)]!;
  const actual = Math.round(b[0]! + rng() * (b[1]! - b[0]!));
  const diff = Math.abs(actual - pick);
  let points: number, label: string, color: string;
  if (diff === 0) {
    points = 500;
    label = "EXACT! The room owes you.";
    color = "var(--gold)";
  } else if (diff <= 3) {
    points = 300;
    label = "So close you could taste it.";
    color = "var(--pitch)";
  } else if (diff <= 7) {
    points = 150;
    label = "Good read.";
    color = "var(--electric)";
  } else if (diff <= 15) {
    points = 60;
    label = "In the right neighbourhood.";
    color = "var(--brand-violet)";
  } else {
    points = 0;
    label = "Way off — try a different minute.";
    color = "var(--live)";
  }
  return { actual, diff, points, label, color };
}

export function GoldenGoal() {
  const { play } = useSound();
  const { celebrate } = useConfetti();
  const { buzz } = useHaptics();
  const reduced = useReducedMotion();

  const [pick, setPick] = useState(45);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result | null>(null);

  const lockIn = () => {
    play("whistle");
    buzz("impact");
    const a = attempt + 1;
    setAttempt(a);
    const r = scoreFor(pick, a);
    setResult(r);
    window.setTimeout(() => {
      if (r.diff === 0) {
        play("win");
        buzz("win");
        celebrate(["#ffce3a", "#22e0a1", "#19c3ff"]);
      } else if (r.points > 0) {
        play("goal");
        buzz("success");
      } else {
        play("error");
        buzz("fail");
      }
    }, reduced ? 0 : 250);
  };

  const reset = () => {
    play("click");
    buzz("tap");
    setResult(null);
  };

  const pct = (pick / 90) * 100;

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs text-muted-foreground">
        How to play: call the minute of the next goal. The closer you are, the bigger the bag — nail it for 500.
      </p>

      {/* your pick display */}
      <div className="grid place-items-center gap-1 rounded-2xl border border-white/[0.07] bg-white/[0.02] py-5">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Your minute</span>
        <div className="font-display text-5xl font-black tabular-nums" style={{ color: hslVar(ACCENT) }}>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={pick}
              className="inline-block"
              initial={reduced ? false : { scale: 0.6, opacity: 0, y: 6 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={reduced ? { opacity: 0 } : { scale: 0.6, opacity: 0, y: -6 }}
              transition={{ type: "spring", stiffness: 500, damping: 22 }}
            >
              {pick}'
            </motion.span>
          </AnimatePresence>
        </div>
      </div>

      {/* slider */}
      <div className="space-y-2">
        <div className="relative">
          <input
            type="range"
            min={1}
            max={90}
            value={pick}
            disabled={!!result}
            onChange={(e) => {
              setPick(Number(e.target.value));
              play("click");
              buzz("tick");
            }}
            className="w-full cursor-pointer accent-gold disabled:cursor-default"
            aria-label="Pick the minute"
          />
          {/* actual marker once revealed */}
          {result && (
            <motion.div
              className="pointer-events-none absolute -top-1 h-4 w-0.5 bg-pitch"
              initial={{ opacity: 0, left: `${pct}%` }}
              animate={{ opacity: 1, left: `${(result.actual / 90) * 100}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 16 }}
            />
          )}
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>1'</span>
          <span>HT</span>
          <span>90'</span>
        </div>
      </div>

      {/* quick minute chips */}
      {!result && (
        <div className="flex flex-wrap justify-center gap-2">
          {[15, 30, 44, 67, 88].map((m) => (
            <motion.button
              key={m}
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                setPick(m);
                play("pop");
                buzz("select");
              }}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                pick === m ? "border-gold/55 bg-gold/15 text-gold" : "border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]"
              )}
            >
              {m}'
            </motion.button>
          ))}
        </div>
      )}

      {/* result */}
      <AnimatePresence mode="wait">
        {result ? (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: reduced ? 0 : 10, scale: reduced ? 1 : 0.96 }}
            animate={
              reduced
                ? { opacity: 1, y: 0, scale: 1 }
                : result.points === 0
                  ? { opacity: 1, y: 0, scale: 1, x: [0, -8, 8, -5, 5, 0] }
                  : { opacity: 1, y: 0, scale: 1 }
            }
            transition={
              result.points === 0
                ? { x: { duration: 0.45 }, default: { type: "spring", stiffness: 320, damping: 22 } }
                : { type: "spring", stiffness: 320, damping: 20 }
            }
            className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 text-center"
          >
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">The goal came in the</p>
            <motion.p
              className="font-display text-4xl font-black tabular-nums"
              style={{ color: hslVar(result.color) }}
              initial={reduced ? false : { scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 16, delay: reduced ? 0 : 0.1 }}
            >
              {result.actual}'
            </motion.p>
            <p className="mt-1 text-sm">
              You called {pick}' —{" "}
              <b style={{ color: hslVar(result.color) }}>{result.diff === 0 ? "spot on" : `${result.diff} min off`}</b>
            </p>
            <motion.p
              className="mt-2 font-display text-lg font-bold"
              style={{ color: hslVar(result.color) }}
              initial={reduced ? false : { scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 18, delay: reduced ? 0 : 0.2 }}
            >
              +{result.points} pts
            </motion.p>
            <p className="text-xs text-muted-foreground">{result.label}</p>
            <Button className="mt-3 w-full" variant="gold" onClick={reset}>
              <RotateCcw className="h-4 w-4" /> Play again
            </Button>
          </motion.div>
        ) : (
          <Button key="lock" variant="gold" size="lg" className="w-full" onClick={lockIn}>
            <Target className="h-4 w-4" /> Lock in {pick}'
          </Button>
        )}
      </AnimatePresence>

      {!result && (
        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5 text-gold" /> Slide or tap a chip, then lock it in.
        </p>
      )}
    </div>
  );
}
