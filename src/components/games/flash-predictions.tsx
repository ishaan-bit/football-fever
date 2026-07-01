"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Flame, Check, X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSound } from "@/hooks/use-sound";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn, hslVar, seededRandom, hashSeed } from "@/lib/utils";

const ACCENT = "var(--gold)";
const ROUND_MS = 10_000;

interface QField {
  q: string;
  options: string[];
}

const BANK: QField[] = [
  { q: "This corner — what comes next?", options: ["Goal", "Cleared", "Another corner"] },
  { q: "Free kick on the edge. Result?", options: ["On target", "Off target", "Wall blocks it"] },
  { q: "Keeper takes the goal kick. Where does it land?", options: ["Their half", "Midfield", "Our half"] },
  { q: "Striker through on goal — he…", options: ["Scores", "Saved", "Skies it"] },
  { q: "VAR check in progress. The call?", options: ["Goal stands", "Disallowed", "Penalty"] },
  { q: "Throw-in deep in the final third leads to…", options: ["A shot", "Lost possession", "A foul"] },
  { q: "Winger 1v1 with the full-back. He…", options: ["Beats him", "Crossed out", "Wins a corner"] },
  { q: "Next set piece in this half is a…", options: ["Corner", "Free kick", "Penalty"] },
  { q: "Counter-attack is on. It ends in…", options: ["A shot", "Offside", "A foul"] },
  { q: "Manager makes a sub. The new man is a…", options: ["Striker", "Midfielder", "Defender"] },
  { q: "Long ball over the top. The result?", options: ["Flicked on", "Keeper claims", "Out for a goal kick"] },
  { q: "Tackle in midfield — referee gives…", options: ["A foul", "Play on", "A card"] },
];

interface FlashState {
  index: number;
  picked: number | null;
  answer: number | null; // revealed correct index
  status: "running" | "revealed";
}

export function FlashPredictions() {
  const { play } = useSound();
  const reduced = useReducedMotion();

  const [attempt, setAttempt] = useState(0); // bumps each new round, seeds determinism
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [state, setState] = useState<FlashState>({ index: 0, picked: null, answer: null, status: "running" });
  const [progress, setProgress] = useState(0); // 0 -> 1 elapsed
  const startRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const pickQuestion = useCallback((a: number) => {
    const rng = seededRandom(hashSeed(`flash-q-${a}`));
    return Math.floor(rng() * BANK.length);
  }, []);

  const reveal = useCallback(
    (a: number) => {
      // read the freshest state via ref so a late pick still counts
      const s = stateRef.current;
      if (s.status === "revealed") return;
      const rng = seededRandom(hashSeed(`flash-ans-${a}-${s.index}`));
      const answer = Math.floor(rng() * BANK[s.index]!.options.length);
      const correct = s.picked !== null && s.picked === answer;
      setState({ ...s, answer, status: "revealed" });
      if (correct) {
        play("win");
        setScore((sc) => sc + 100);
        setStreak((st) => {
          const next = st + 1;
          setBest((b) => Math.max(b, next));
          return next;
        });
      } else {
        play("error");
        setStreak(0);
      }
    },
    [play]
  );

  // round timer
  useEffect(() => {
    if (state.status !== "running") return;
    play("whistle");
    startRef.current = performance.now();
    setProgress(0);

    const tick = () => {
      const elapsed = performance.now() - startRef.current;
      const p = Math.min(1, elapsed / ROUND_MS);
      setProgress(p);
      if (p >= 1) {
        reveal(attempt);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, state.status]);

  const start = useCallback(
    (a: number) => {
      const qIndex = pickQuestion(a);
      setState({ index: qIndex, picked: null, answer: null, status: "running" });
    },
    [pickQuestion]
  );

  // first round on mount
  useEffect(() => {
    start(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPick = (i: number) => {
    if (state.status !== "running" || state.picked !== null) return;
    play("pop");
    setState((s) => ({ ...s, picked: i }));
  };

  const next = () => {
    const a = attempt + 1;
    setAttempt(a);
    setRound((r) => r + 1);
    start(a);
  };

  const restart = () => {
    play("click");
    setScore(0);
    setStreak(0);
    setBest(0);
    setRound(0);
    const a = attempt + 1;
    setAttempt(a);
    start(a);
  };

  const q = BANK[state.index]!;
  const secondsLeft = Math.ceil((1 - progress) * (ROUND_MS / 1000));
  const ringColor = progress > 0.8 ? "var(--live)" : ACCENT;

  // circular ring geometry
  const R = 34;
  const C = 2 * Math.PI * R;

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs text-muted-foreground">
        How to play: lock an answer before the 10-second whistle. Correct calls bank 100 and build a streak.
      </p>

      {/* scoreboard */}
      <div className="grid grid-cols-3 gap-2.5">
        <Stat label="Round" value={`${round + 1}`} accent="var(--electric)" />
        <Stat label="Score" value={score.toLocaleString()} accent={ACCENT} />
        <Stat label="Streak" value={`${streak}🔥`} accent="var(--live)" />
      </div>

      {/* ring + question */}
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
        <div className="relative grid h-20 w-20 place-items-center">
          <svg viewBox="0 0 80 80" className="absolute inset-0 h-full w-full -rotate-90">
            <circle cx="40" cy="40" r={R} fill="none" stroke="hsl(0 0% 100% / 0.08)" strokeWidth="6" />
            <motion.circle
              cx="40"
              cy="40"
              r={R}
              fill="none"
              stroke={hslVar(ringColor)}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={C}
              animate={{ strokeDashoffset: C * (state.status === "revealed" ? 1 : progress) }}
              transition={{ duration: reduced ? 0 : 0.12, ease: "linear" }}
            />
          </svg>
          <span className="font-display text-2xl font-bold tabular-nums" style={{ color: hslVar(ringColor) }}>
            {state.status === "revealed" ? "—" : secondsLeft}
          </span>
        </div>

        <AnimatePresence mode="wait">
          <motion.p
            key={state.index + "-" + attempt}
            initial={{ opacity: 0, y: reduced ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduced ? 0 : -8 }}
            className="text-center font-display text-lg font-semibold"
          >
            {q.q}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* options */}
      <div className="grid gap-2.5">
        {q.options.map((opt, i) => {
          const isPicked = state.picked === i;
          const isAnswer = state.answer === i;
          const revealed = state.status === "revealed";
          const correctPick = revealed && isPicked && isAnswer;
          const wrongPick = revealed && isPicked && !isAnswer;
          return (
            <motion.button
              key={opt}
              onClick={() => onPick(i)}
              disabled={revealed || state.picked !== null}
              whileTap={reduced ? undefined : { scale: 0.98 }}
              className={cn(
                "flex items-center justify-between rounded-2xl border px-4 py-3.5 text-left text-sm font-semibold transition-colors disabled:cursor-default",
                "border-white/[0.08] bg-white/[0.03]",
                isPicked && !revealed && "border-gold/50 bg-gold/10",
                revealed && isAnswer && "border-pitch/50 bg-pitch/12",
                wrongPick && "border-live/50 bg-live/12"
              )}
            >
              <span>{opt}</span>
              {revealed && isAnswer && <Check className="h-4 w-4 text-pitch" />}
              {wrongPick && <X className="h-4 w-4 text-live" />}
              {!revealed && isPicked && <span className="text-[11px] uppercase tracking-wide text-gold">Locked</span>}
              {correctPick && <span className="ml-2 text-[11px] font-bold uppercase text-pitch">+100</span>}
            </motion.button>
          );
        })}
      </div>

      {/* footer */}
      {state.status === "revealed" ? (
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-sm font-semibold">
            {state.picked === state.answer ? (
              <span className="text-pitch">Nailed it.</span>
            ) : state.picked === null ? (
              <span className="text-muted-foreground">No call — the whistle beat you.</span>
            ) : (
              <span className="text-live">Off this time.</span>
            )}
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={restart}>
              <RotateCcw className="h-4 w-4" /> Reset
            </Button>
            <Button variant="gold" size="sm" onClick={next}>
              <Zap className="h-4 w-4" /> Next round
            </Button>
          </div>
        </div>
      ) : (
        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Flame className="h-3.5 w-3.5 text-gold" /> Best streak this run: <b className="text-foreground">{best}</b>
        </p>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 text-center">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-display text-lg font-bold tabular-nums" style={{ color: hslVar(accent) }}>
        {value}
      </p>
    </div>
  );
}
