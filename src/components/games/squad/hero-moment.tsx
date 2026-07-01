"use client";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, RotateCcw, Trophy, Star, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useSound } from "@/hooks/use-sound";
import { useHaptics } from "@/hooks/use-haptics";
import { useConfetti } from "@/hooks/use-confetti";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn, hslVar } from "@/lib/utils";
import type { Player, PlayerStats } from "@/lib/data/squads";

const ROUNDS = 5;
const ACCENT = "var(--gold)";

interface Moment {
  label: string;
  blurb: string;
  stat: keyof PlayerStats;
  hero: (n: string) => string;
}

const MOMENTS: Moment[] = [
  { label: "Stoppage time, free kick", blurb: "The wall lines up. The whole stadium holds its breath.", stat: "shooting", hero: (n) => `${n} curls it into the top corner. Bedlam.` },
  { label: "One-on-one breakaway", blurb: "Through on goal, just the keeper to beat.", stat: "pace", hero: (n) => `${n} burns the last defender and slots it home.` },
  { label: "Corner swung in", blurb: "Bodies everywhere in the six-yard box.", stat: "defending", hero: (n) => `${n} rises highest and powers the header in.` },
  { label: "Penalty. Sudden death.", blurb: "Ice in the veins required. The keeper dances on the line.", stat: "shooting", hero: (n) => `${n} sends the keeper the wrong way. Cold.` },
  { label: "Mazy run from midfield", blurb: "Space opens up. Heads up, who takes it on?", stat: "flair", hero: (n) => `${n} nutmegs two and finishes with the outside of the boot.` },
  { label: "Last-ditch goal-line clearance", blurb: "It's goalbound. Someone has to be the hero.", stat: "defending", hero: (n) => `${n} hooks it off the line. Absolute scenes.` },
  { label: "Quick free kick, killer pass", blurb: "The defence switches off for half a second.", stat: "passing", hero: (n) => `${n} threads a no-look ball through for the winner.` },
];

const CHAOS = [
  "…but VAR is checking. Three minutes of pure agony. It stands!",
  "…the bench empties. Pure chaos on the touchline.",
  "…and the commentator has completely lost his voice.",
  "…somewhere, a neutral is crying with joy.",
];

/** Weighted-random hero so your star usually delivers, but the #14 can still
 *  become a legend. weight = (stat^2) keeps upsets spicy but rare. */
function rollHero(cast: Player[], stat: keyof PlayerStats): Player {
  const weights = cast.map((p) => {
    const s = p.stats[stat] * 0.7 + p.overall * 0.3;
    return Math.max(1, s * s);
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < cast.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return cast[i]!;
  }
  return cast[cast.length - 1]!;
}

export function HeroMoment({ cast }: { cast: Player[] }) {
  const { play } = useSound();
  const { buzz } = useHaptics();
  const { celebrate } = useConfetti();
  const reduced = useReducedMotion();

  const [run, setRun] = useState(0);
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [hits, setHits] = useState(0);
  const [pick, setPick] = useState<string | null>(null);
  const [hero, setHero] = useState<Player | null>(null);

  // A fresh, stable moment per step within a run.
  const moment = useMemo(() => MOMENTS[(step + run * 3) % MOMENTS.length]!, [step, run]);
  const chaos = useMemo(() => CHAOS[(step + run) % CHAOS.length]!, [step, run]);

  const done = step >= ROUNDS;
  const revealed = hero !== null;

  const choose = (p: Player) => {
    if (revealed) return;
    setPick(p.id);
    buzz("select");
    play("pop");
    const winner = rollHero(cast, moment.stat);
    setHero(winner);
    if (winner.id === p.id) {
      const mult = 1 + Math.min(streak, 4) * 0.5;
      setScore((s) => s + Math.round(150 * mult));
      setStreak((st) => st + 1);
      setHits((h) => h + 1);
      buzz("success");
      play("goal");
    } else {
      setStreak(0);
      buzz("fail");
      play("error");
    }
  };

  const advance = () => {
    play("click");
    const next = step + 1;
    setPick(null);
    setHero(null);
    setStep(next);
    if (next >= ROUNDS && hits >= 3) {
      buzz("win");
      play("win");
      celebrate(["#ffce3a", "#22e0a1", "#19c3ff"]);
    } else {
      buzz("tap");
    }
  };

  const restart = () => {
    play("whistle");
    buzz("tap");
    setRun((r) => r + 1);
    setStep(0);
    setScore(0);
    setStreak(0);
    setHits(0);
    setPick(null);
    setHero(null);
  };

  if (done) {
    const grade =
      hits === ROUNDS ? { letter: "S", label: "You read the game like a manager.", color: "var(--gold)" }
      : hits >= 4 ? { letter: "A", label: "Elite gut instinct.", color: "var(--pitch)" }
      : hits >= 3 ? { letter: "B", label: "Solid calls.", color: "var(--electric)" }
      : hits >= 1 ? { letter: "C", label: "The bench saw better.", color: "var(--brand-violet)" }
      : { letter: "D", label: "Sack the gaffer.", color: "var(--live)" };
    return (
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <motion.div
          initial={{ scale: reduced ? 1 : 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 14 }}
          className="grid h-24 w-24 place-items-center rounded-full border"
          style={{ borderColor: hslVar(grade.color, 0.5), background: hslVar(grade.color, 0.12) }}
        >
          <span className="font-display text-4xl font-black" style={{ color: hslVar(grade.color) }}>
            {grade.letter}
          </span>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: reduced ? 0 : 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduced ? 0 : 0.18, type: "spring", stiffness: 300, damping: 20 }}
        >
          <p className="font-display text-2xl font-bold tabular-nums">{score.toLocaleString()} pts</p>
          <p className="text-sm text-muted-foreground">{hits}/{ROUNDS} heroes called · {grade.label}</p>
        </motion.div>
        <motion.div
          className="w-full"
          initial={{ opacity: 0, y: reduced ? 0 : 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduced ? 0 : 0.3, type: "spring", stiffness: 300, damping: 22 }}
        >
          <Button className="w-full" variant="gold" onClick={restart}>
            <RotateCcw className="h-4 w-4" /> Run it back
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs text-muted-foreground">
        How to play: read the moment, then call which of your five delivers it. Build a streak for a points multiplier.
      </p>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold">Moment {step + 1} / {ROUNDS}</span>
          <span className="flex items-center gap-3">
            <motion.span
              key={streak}
              initial={reduced ? false : { scale: 1.35 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 16 }}
              className="flex items-center gap-1 text-live"
            >
              <Flame className="h-3.5 w-3.5" /> {streak}×
            </motion.span>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={score}
                initial={reduced ? false : { scale: 1.4, color: hslVar("var(--pitch)") }}
                animate={{ scale: 1, color: hslVar("var(--gold)") }}
                transition={{ type: "spring", stiffness: 480, damping: 18 }}
                className="font-display font-bold tabular-nums text-gold"
              >
                {score}
              </motion.span>
            </AnimatePresence>
          </span>
        </div>
        <Progress value={(step / ROUNDS) * 100} indicatorClassName="bg-gold" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: reduced ? 0 : 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: reduced ? 0 : -24 }}
          className="flex flex-col gap-4"
        >
          <div
            className="rounded-2xl border p-4"
            style={{ borderColor: hslVar(ACCENT, 0.25), background: hslVar(ACCENT, 0.08) }}
          >
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gold">
              <Sparkles className="h-3.5 w-3.5" /> {moment.label}
            </p>
            <p className="mt-1 font-display text-lg font-semibold leading-snug">{moment.blurb}</p>
            <p className="mt-1 text-xs text-muted-foreground">Who steps up? (favours {moment.stat})</p>
          </div>

          <div className="grid gap-2.5">
            {cast.map((p) => {
              const isPick = pick === p.id;
              const isHero = hero?.id === p.id;
              return (
                <motion.button
                  key={p.id}
                  onClick={() => choose(p)}
                  disabled={revealed}
                  whileTap={reduced ? undefined : { scale: 0.96 }}
                  animate={
                    reduced || !revealed
                      ? undefined
                      : isHero
                        ? { scale: [1, 1.05, 1] }
                        : isPick
                          ? { x: [0, -6, 6, -4, 4, 0] }
                          : undefined
                  }
                  transition={{ duration: 0.4 }}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-colors disabled:cursor-default",
                    "border-white/[0.08] bg-white/[0.03]",
                    !revealed && "hover:border-gold/45 hover:bg-gold/8",
                    revealed && isHero && "border-gold/60 bg-gold/14",
                    revealed && isPick && !isHero && "border-live/55 bg-live/12"
                  )}
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/[0.06] text-xs font-bold tabular-nums">
                    {p.number}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-semibold">{p.name}</span>
                      {p.star && <Star className="h-3 w-3 shrink-0 fill-gold text-gold" />}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{p.position} · {p.overall} OVR</span>
                  </span>
                  {revealed && isHero && <Trophy className="h-4 w-4 shrink-0 text-gold" />}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      {revealed && hero && (
        <motion.div
          initial={{ opacity: 0, y: reduced ? 0 : 8, scale: reduced ? 1 : 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 20 }}
          className="space-y-3"
        >
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3 text-sm">
            <p className="font-semibold">
              {pick === hero.id ? <span className="text-gold">Called it. </span> : <span className="text-live">Not this time. </span>}
              {moment.hero(hero.name)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{chaos}</p>
          </div>
          <Button variant="gold" size="sm" className="w-full" onClick={advance}>
            {step + 1 >= ROUNDS ? <><Trophy className="h-4 w-4" /> See result</> : "Next moment"}
          </Button>
        </motion.div>
      )}
    </div>
  );
}
