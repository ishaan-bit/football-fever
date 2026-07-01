"use client";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Check, X, Flame, RotateCcw, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useSound } from "@/hooks/use-sound";
import { useHaptics } from "@/hooks/use-haptics";
import { useConfetti } from "@/hooks/use-confetti";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn, hslVar, seededRandom, hashSeed } from "@/lib/utils";

const ACCENT = "var(--electric)";
const PICK = 5;

interface TriviaQ {
  q: string;
  options: string[];
  answer: number; // index
}

const BANK: TriviaQ[] = [
  { q: "Which country has won the most World Cups?", options: ["Germany", "Brazil", "Italy", "Argentina"], answer: 1 },
  { q: "Who won the 2022 World Cup in Qatar?", options: ["France", "Croatia", "Argentina", "Brazil"], answer: 2 },
  { q: "How many teams play at the 2026 World Cup?", options: ["32", "40", "48", "24"], answer: 2 },
  { q: "Which three nations co-host the 2026 World Cup?", options: ["USA, Mexico, Canada", "USA, Brazil, Mexico", "Canada, USA, Cuba", "Mexico, USA, Costa Rica"], answer: 0 },
  { q: "Who scored the 'Hand of God' goal in 1986?", options: ["Pelé", "Maradona", "Zidane", "Romário"], answer: 1 },
  { q: "Which player has scored the most World Cup goals overall?", options: ["Klose", "Ronaldo (BRA)", "Müller", "Messi"], answer: 0 },
  { q: "Where was the first ever World Cup held in 1930?", options: ["Brazil", "Italy", "Uruguay", "France"], answer: 2 },
  { q: "Who lifted the trophy as France's captain in 2018?", options: ["Griezmann", "Lloris", "Pogba", "Mbappé"], answer: 1 },
  { q: "Which nation reached the final in 2018 as an underdog?", options: ["Belgium", "England", "Croatia", "Sweden"], answer: 2 },
  { q: "What colour card means a player is sent off?", options: ["Yellow", "Green", "Red", "Blue"], answer: 2 },
  { q: "How many players per side are on the pitch at kickoff?", options: ["10", "11", "12", "9"], answer: 1 },
  { q: "Which African nation reached the 2022 semi-finals?", options: ["Senegal", "Ghana", "Morocco", "Cameroon"], answer: 2 },
];

export function TeamTrivia() {
  const { play } = useSound();
  const { buzz } = useHaptics();
  const { celebrate } = useConfetti();
  const reduced = useReducedMotion();

  const [run, setRun] = useState(0);
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);

  const questions = useMemo(() => {
    const rng = seededRandom(hashSeed(`trivia-${run}`));
    const pool = [...BANK];
    const out: TriviaQ[] = [];
    for (let i = 0; i < PICK && pool.length; i++) {
      const idx = Math.floor(rng() * pool.length);
      out.push(pool.splice(idx, 1)[0]!);
    }
    return out;
  }, [run]);

  const done = step >= PICK;
  const q = questions[step];

  const onPick = (i: number) => {
    if (picked !== null || !q) return;
    buzz("tap");
    play("pop");
    setPicked(i);
    const correct = i === q.answer;
    if (correct) {
      const mult = 1 + Math.min(streak, 4) * 0.5; // streak multiplier up to 3x
      const pts = Math.round(100 * mult);
      setScore((s) => s + pts);
      setStreak((st) => st + 1);
      setCorrectCount((c) => c + 1);
      buzz("success");
      play("goal");
    } else {
      setStreak(0);
      buzz("fail");
      play("error");
    }
  };

  const advance = () => {
    buzz("select");
    play("click");
    setPicked(null);
    const nextStep = step + 1;
    setStep(nextStep);
    if (nextStep >= PICK && correctCount >= 4) {
      buzz("win");
      play("win");
      celebrate(["#19c3ff", "#22e0a1", "#ffce3a"]);
    }
  };

  const restart = () => {
    buzz("tap");
    play("whistle");
    setRun((r) => r + 1);
    setStep(0);
    setScore(0);
    setStreak(0);
    setPicked(null);
    setCorrectCount(0);
  };

  const grade = useMemo(() => {
    const ratio = correctCount / PICK;
    if (ratio === 1) return { letter: "S", label: "Flawless. Pundit material.", color: "var(--gold)" };
    if (ratio >= 0.8) return { letter: "A", label: "Seriously sharp.", color: "var(--pitch)" };
    if (ratio >= 0.6) return { letter: "B", label: "Knows the game.", color: "var(--electric)" };
    if (ratio >= 0.4) return { letter: "C", label: "Bit rusty.", color: "var(--brand-violet)" };
    return { letter: "D", label: "Back to the highlights.", color: "var(--live)" };
  }, [correctCount]);

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <motion.div
          initial={{ scale: reduced ? 1 : 0.4, opacity: 0 }}
          animate={
            reduced
              ? { scale: 1, opacity: 1 }
              : { scale: [0.4, 1.12, 1], opacity: 1 }
          }
          transition={{ type: "spring", stiffness: 200, damping: 14 }}
          className="grid h-24 w-24 place-items-center rounded-full border"
          style={{ borderColor: hslVar(grade.color, 0.5), background: hslVar(grade.color, 0.12) }}
        >
          <span className="font-display text-4xl font-black" style={{ color: hslVar(grade.color) }}>
            {grade.letter}
          </span>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: reduced ? 0 : 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, type: "spring", stiffness: 260, damping: 20 }}
        >
          <p className="font-display text-2xl font-bold tabular-nums">{score.toLocaleString()} pts</p>
          <p className="text-sm text-muted-foreground">
            {correctCount}/{PICK} correct · {grade.label}
          </p>
        </motion.div>
        <motion.div className="w-full" whileTap={reduced ? undefined : { scale: 0.96 }}>
          <Button className="w-full" variant="electric" onClick={restart}>
            <RotateCcw className="h-4 w-4" /> Play again
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs text-muted-foreground">
        How to play: {PICK} World Cup questions. Build a streak — each one in a row multiplies your points.
      </p>

      {/* progress + score */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold">Question {step + 1} / {PICK}</span>
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-live">
              <Flame className="h-3.5 w-3.5" /> {streak}× ({1 + Math.min(streak, 4) * 0.5}x)
            </span>
            <span className="font-display font-bold tabular-nums text-electric">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={score}
                  initial={reduced ? false : { scale: 0.6, opacity: 0, y: -4 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={reduced ? undefined : { scale: 1.3, opacity: 0, y: 4 }}
                  transition={{ type: "spring", stiffness: 500, damping: 24 }}
                  className="inline-block"
                >
                  {score}
                </motion.span>
              </AnimatePresence>
            </span>
          </span>
        </div>
        <Progress value={(step / PICK) * 100} indicatorClassName="bg-electric" />
      </div>

      {/* question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: reduced ? 0 : 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: reduced ? 0 : -24 }}
          className="flex flex-col gap-4"
        >
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
            <p className="font-display text-lg font-semibold leading-snug">{q?.q}</p>
          </div>

          <div className="grid gap-2.5">
            {q?.options.map((opt, i) => {
              const isAnswer = i === q.answer;
              const isPicked = picked === i;
              const revealed = picked !== null;
              return (
                <motion.button
                  key={opt}
                  onClick={() => onPick(i)}
                  disabled={revealed}
                  whileTap={reduced ? undefined : { scale: 0.92 }}
                  animate={
                    reduced || !isPicked
                      ? undefined
                      : isAnswer
                        ? { scale: [1, 1.05, 1] }
                        : { x: [0, -6, 6, -4, 4, 0] }
                  }
                  transition={{ duration: 0.4 }}
                  className={cn(
                    "flex items-center justify-between rounded-2xl border px-4 py-3.5 text-left text-sm font-semibold transition-colors disabled:cursor-default",
                    "border-white/[0.08] bg-white/[0.03]",
                    !revealed && "hover:border-electric/40 hover:bg-electric/8",
                    revealed && isAnswer && "border-pitch/55 bg-pitch/12",
                    revealed && isPicked && !isAnswer && "border-live/55 bg-live/12"
                  )}
                >
                  <span>{opt}</span>
                  {revealed && isAnswer && <Check className="h-4 w-4 text-pitch" />}
                  {revealed && isPicked && !isAnswer && <X className="h-4 w-4 text-live" />}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      {picked !== null && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <motion.span
            className="flex items-center gap-1.5 text-sm font-semibold"
            initial={reduced ? false : { scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 16 }}
          >
            {picked === q?.answer ? (
              <span className="text-pitch">Correct!</span>
            ) : (
              <span className="text-live">Not quite.</span>
            )}
          </motion.span>
          <motion.div whileTap={reduced ? undefined : { scale: 0.92 }}>
            <Button variant="electric" size="sm" onClick={advance}>
              {step + 1 >= PICK ? <Trophy className="h-4 w-4" /> : <Brain className="h-4 w-4" />}
              {step + 1 >= PICK ? "See result" : "Next"}
            </Button>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
