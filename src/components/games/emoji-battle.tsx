"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Laugh, Timer, RotateCcw, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSound } from "@/hooks/use-sound";
import { useHaptics } from "@/hooks/use-haptics";
import { useConfetti } from "@/hooks/use-confetti";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn, hslVar, seededRandom, hashSeed } from "@/lib/utils";

const ACCENT = "var(--brand-violet)";
const POOL = ["⚽️", "🔥", "😱", "😂", "🙌", "💔", "🤯", "👏", "🧤", "🥅", "🟥", "🟨"];
const ROUNDS = 8;
const GRID = 9;

type Phase = "idle" | "playing" | "over";

interface RoundState {
  target: string;
  grid: string[];
  windowMs: number;
}

function buildRound(attempt: number, round: number): RoundState {
  const rng = seededRandom(hashSeed(`emoji-${attempt}-${round}`));
  // shuffle pool deterministically
  const shuffled = [...POOL].sort(() => rng() - 0.5);
  const grid = shuffled.slice(0, GRID);
  const target = grid[Math.floor(rng() * grid.length)]!;
  const windowMs = Math.max(900, 2200 - round * 170);
  return { target, grid, windowMs };
}

export function EmojiBattle() {
  const { play } = useSound();
  const { buzz } = useHaptics();
  const { celebrate } = useConfetti();
  const reduced = useReducedMotion();

  const [phase, setPhase] = useState<Phase>("idle");
  const [attempt, setAttempt] = useState(0);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [data, setData] = useState<RoundState | null>(null);
  const [progress, setProgress] = useState(1); // 1 -> 0 remaining
  const [flash, setFlash] = useState<{ text: string; good: boolean } | null>(null);

  const startRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const answeredRef = useRef(false);

  const clearRaf = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  };

  const finish = useCallback(
    (finalScore: number) => {
      clearRaf();
      setPhase("over");
      setBest((b) => {
        const next = Math.max(b, finalScore);
        if (finalScore > 0 && finalScore >= b) {
          buzz("win");
          celebrate();
        } else {
          buzz("success");
        }
        return next;
      });
      play("whistle");
      play("win");
    },
    [play, buzz, celebrate]
  );

  const advance = useCallback(
    (nextRound: number, a: number, runningScore: number) => {
      if (nextRound >= ROUNDS) {
        finish(runningScore);
        return;
      }
      const rd = buildRound(a, nextRound);
      answeredRef.current = false;
      setData(rd);
      setRound(nextRound);
      setProgress(1);
      startRef.current = performance.now();
      buzz("tick");
      play("pop");

      const tick = () => {
        const elapsed = performance.now() - startRef.current;
        const p = Math.max(0, 1 - elapsed / rd.windowMs);
        setProgress(p);
        if (p <= 0) {
          if (!answeredRef.current) {
            answeredRef.current = true;
            setFlash({ text: "Too slow!", good: false });
            buzz("fail");
            play("error");
            const ns = Math.max(0, runningScore - 40);
            setScore(ns);
            window.setTimeout(() => advance(nextRound + 1, a, ns), reduced ? 0 : 380);
          }
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [finish, play, buzz, reduced]
  );

  const start = () => {
    const a = attempt + 1;
    setAttempt(a);
    setScore(0);
    setRound(0);
    setFlash(null);
    setPhase("playing");
    buzz("select");
    play("whistle");
    advance(0, a, 0);
  };

  useEffect(() => () => clearRaf(), []);

  const onTap = (emoji: string) => {
    if (phase !== "playing" || !data || answeredRef.current) return;
    answeredRef.current = true;
    clearRaf();
    if (emoji === data.target) {
      const speed = progress; // fraction of window remaining
      const pts = 50 + Math.round(speed * 100);
      const ns = score + pts;
      setScore(ns);
      setFlash({ text: `+${pts}`, good: true });
      buzz(speed > 0.5 ? "impact" : "success");
      play("goal");
      window.setTimeout(() => advance(round + 1, attempt, ns), reduced ? 0 : 360);
    } else {
      const ns = Math.max(0, score - 30);
      setScore(ns);
      setFlash({ text: "Miss −30", good: false });
      buzz("fail");
      play("error");
      window.setTimeout(() => advance(round + 1, attempt, ns), reduced ? 0 : 360);
    }
  };

  const barColor = progress > 0.5 ? ACCENT : progress > 0.25 ? "var(--gold)" : "var(--live)";

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs text-muted-foreground">
        How to play: match the target emoji as fast as you can. Speed scores, misses cost — and the clock keeps shrinking.
      </p>

      <div className="grid grid-cols-3 gap-2.5">
        <Stat label="Round" value={phase === "idle" ? "—" : `${Math.min(round + 1, ROUNDS)}/${ROUNDS}`} accent="var(--electric)" />
        <Stat label="Score" value={score.toLocaleString()} accent={ACCENT} />
        <Stat label="Best" value={best.toLocaleString()} accent="var(--gold)" />
      </div>

      {phase === "idle" && (
        <div className="grid place-items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] py-10 text-center">
          <motion.span
            className="text-5xl"
            animate={reduced ? undefined : { rotate: [0, -8, 8, -4, 0] }}
            transition={reduced ? undefined : { duration: 2.4, repeat: Infinity, repeatDelay: 1.2 }}
          >
            🤯
          </motion.span>
          <p className="font-display text-lg font-semibold">Out-react the room.</p>
          <motion.div whileTap={reduced ? undefined : { scale: 0.92 }}>
            <Button onClick={start} style={{ background: hslVar(ACCENT), color: "#fff" }}>
              <Play className="h-4 w-4" /> Start battle
            </Button>
          </motion.div>
        </div>
      )}

      {phase === "playing" && data && (
        <div className="flex flex-col gap-4">
          {/* target + timer */}
          <div className="flex items-center justify-between rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
            <div className="flex items-center gap-3">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Tap</span>
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={data.target + round}
                  initial={{ scale: reduced ? 1 : 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-4xl"
                >
                  {data.target}
                </motion.span>
              </AnimatePresence>
            </div>
            <div className="flex w-28 flex-col items-end gap-1">
              <Timer className="h-4 w-4" style={{ color: hslVar(barColor) }} />
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.08]">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: hslVar(barColor), width: `${progress * 100}%` }}
                  transition={{ duration: 0 }}
                />
              </div>
            </div>
          </div>

          {/* grid */}
          <motion.div
            key={round}
            className="relative grid grid-cols-3 gap-2.5"
            animate={flash && !flash.good && !reduced ? { x: [0, -7, 7, -5, 5, 0] } : undefined}
            transition={{ duration: 0.32 }}
          >
            {data.grid.map((e, i) => (
              <motion.button
                key={`${e}-${i}`}
                onClick={() => onTap(e)}
                initial={reduced ? false : { scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={reduced ? undefined : { type: "spring", stiffness: 460, damping: 24, delay: i * 0.02 }}
                whileTap={reduced ? undefined : { scale: 0.92 }}
                className="grid aspect-square place-items-center rounded-2xl border border-white/[0.07] bg-white/[0.03] text-3xl transition-colors hover:bg-white/[0.07]"
              >
                {e}
              </motion.button>
            ))}

            <AnimatePresence>
              {flash && !reduced && (
                <motion.div
                  key={flash.text + round}
                  className="pointer-events-none absolute inset-0 grid place-items-center"
                  initial={{ opacity: 0, scale: 0.6, y: 10 }}
                  animate={{ opacity: 1, scale: 1.1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                >
                  <span
                    className="font-display text-3xl font-black drop-shadow-lg"
                    style={{ color: flash.good ? hslVar("var(--pitch)") : hslVar("var(--live)") }}
                  >
                    {flash.text}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}

      {phase === "over" && (
        <motion.div
          className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 text-center"
          initial={reduced ? false : { opacity: 0, scale: 0.9, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={reduced ? undefined : { type: "spring", stiffness: 320, damping: 22 }}
        >
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Final score</p>
          <motion.p
            className="font-display text-4xl font-black tabular-nums"
            style={{ color: hslVar(ACCENT) }}
            initial={reduced ? false : { scale: 0.6 }}
            animate={reduced ? undefined : { scale: [0.6, 1.18, 1] }}
            transition={reduced ? undefined : { duration: 0.5, delay: 0.1, times: [0, 0.6, 1] }}
          >
            {score.toLocaleString()}
          </motion.p>
          <p className="mt-1 text-sm text-muted-foreground">
            {score >= best && score > 0 ? "New personal best! 🏆" : `Best: ${best.toLocaleString()}`}
          </p>
          <motion.div whileTap={reduced ? undefined : { scale: 0.96 }}>
            <Button className="mt-4 w-full" variant="outline" onClick={start}>
              <RotateCcw className="h-4 w-4" /> Play again
            </Button>
          </motion.div>
        </motion.div>
      )}

      {phase === "idle" && (
        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Laugh className="h-3.5 w-3.5 text-violet" /> {ROUNDS} rounds, each one faster than the last.
        </p>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  const reduced = useReducedMotion();
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 text-center">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-display text-lg font-bold tabular-nums" style={{ color: hslVar(accent) }}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={value}
            className="inline-block"
            initial={reduced ? false : { scale: 0.5, opacity: 0, y: -6 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { scale: 0.5, opacity: 0, y: 6 }}
            transition={{ type: "spring", stiffness: 520, damping: 22 }}
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </p>
    </div>
  );
}
