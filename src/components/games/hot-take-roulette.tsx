"use client";
import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSound } from "@/hooks/use-sound";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn, hslVar, seededRandom, hashSeed } from "@/lib/utils";

const ACCENT = "var(--live)";

const TAKES = [
  "The World Cup should be every two years.",
  "Penalty shootouts are the fairest way to decide a final.",
  "Group stage games are mostly boring and we all know it.",
  "A 0–0 can be the best match you'll ever watch.",
  "VAR has made football worse, not better.",
  "Defenders deserve the Ballon d'Or more than they get it.",
  "Home advantage at a World Cup is wildly overrated.",
  "Extra time should be scrapped — go straight to penalties.",
  "Tiki-taka is just passing the ball sideways with extra steps.",
  "The best player on the pitch is usually the goalkeeper.",
  "Friendlies should be abolished entirely.",
  "A great manager matters more than a great striker.",
  "Underdogs winning is what keeps football alive.",
  "The offside rule should be scrapped completely.",
  "Diving deserves a retroactive three-match ban.",
  "Club football is better than international football. Sorry.",
];

type Vote = "based" | "banned" | null;

export function HotTakeRoulette() {
  const { play } = useSound();
  const reduced = useReducedMotion();

  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [landed, setLanded] = useState<number | null>(null);
  const [vote, setVote] = useState<Vote>(null);
  const [spins, setSpins] = useState(0);
  const segAngle = 360 / TAKES.length;

  // deterministic baseline tally per take, your vote shifts it
  const baseTally = useMemo(() => {
    if (landed === null) return { based: 0, banned: 0 };
    const rng = seededRandom(hashSeed(`take-${landed}`));
    const total = 40 + Math.floor(rng() * 120);
    const basedPct = 0.2 + rng() * 0.6;
    const based = Math.round(total * basedPct);
    return { based, banned: total - based };
  }, [landed]);

  const tally = {
    based: baseTally.based + (vote === "based" ? 1 : 0),
    banned: baseTally.banned + (vote === "banned" ? 1 : 0),
  };
  const total = tally.based + tally.banned || 1;
  const basedPct = Math.round((tally.based / total) * 100);

  const spinRef = useRef(0);

  const spin = () => {
    if (spinning) return;
    play("swoosh");
    setVote(null);
    setSpinning(true);
    const a = spinRef.current + 1;
    spinRef.current = a;
    setSpins((s) => s + 1);

    const rng = seededRandom(hashSeed(`spin-${a}`));
    const target = Math.floor(rng() * TAKES.length);
    const turns = 4 + Math.floor(rng() * 3);
    // land target segment under the top pointer
    const finalRotation = turns * 360 + (360 - target * segAngle - segAngle / 2);
    const base = rotation - (rotation % 360);
    const next = base + finalRotation;
    setRotation(next);

    const settle = () => {
      setLanded(target);
      setSpinning(false);
      play("pop");
    };
    if (reduced) settle();
    else window.setTimeout(settle, 2300);
  };

  const castVote = (v: "based" | "banned") => {
    if (vote || landed === null) return;
    setVote(v);
    play(v === "based" ? "win" : "error");
  };

  const conic = useMemo(
    () =>
      TAKES.map((_, i) => {
        const hue = (i * 360) / TAKES.length;
        return `hsl(${hue} 70% 22%) ${i * segAngle}deg ${(i + 1) * segAngle}deg`;
      }).join(", "),
    [segAngle]
  );

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs text-muted-foreground">
        How to play: spin the wheel, defend whatever spicy take it hands you, then let the room rule — based or banned.
      </p>

      {/* wheel */}
      <div className="relative mx-auto grid place-items-center">
        <div className="absolute -top-1 z-10 h-0 w-0 border-x-8 border-t-[14px] border-x-transparent border-t-live drop-shadow" />
        <div className="relative h-48 w-48 rounded-full p-1.5" style={{ boxShadow: `0 0 0 1px ${hslVar(ACCENT, 0.3)}, 0 0 60px -16px ${hslVar(ACCENT, 0.6)}` }}>
          <motion.div
            className="h-full w-full rounded-full"
            style={{ background: `conic-gradient(${conic})` }}
            animate={{ rotate: rotation }}
            transition={{ duration: reduced ? 0 : 2.3, ease: [0.16, 1, 0.3, 1] }}
          />
          <div className="absolute inset-0 grid place-items-center">
            <div className="grid h-16 w-16 place-items-center rounded-full border border-white/10 bg-background/90 text-center">
              <Flame className={cn("h-7 w-7 text-live", spinning && !reduced && "animate-pulse")} />
            </div>
          </div>
        </div>
      </div>

      {/* take */}
      <div className="min-h-[92px] rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
        <AnimatePresence mode="wait">
          {landed !== null && !spinning ? (
            <motion.div
              key={landed}
              initial={{ opacity: 0, scale: reduced ? 1 : 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-live">The take</p>
              <p className="mt-1 font-display text-lg font-bold leading-snug">“{TAKES[landed]}”</p>
            </motion.div>
          ) : (
            <p className="grid h-full place-items-center text-center text-sm text-muted-foreground">
              {spinning ? "Spinning up a hot one…" : "Spin to get your take."}
            </p>
          )}
        </AnimatePresence>
      </div>

      {/* votes */}
      {landed !== null && !spinning && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => castVote("based")}
              disabled={!!vote}
              className={cn(
                "rounded-2xl border px-4 py-3 text-sm font-bold transition-colors",
                vote === "based" ? "border-pitch/60 bg-pitch/15 text-pitch" : "border-white/[0.08] bg-white/[0.03] hover:bg-pitch/10 disabled:opacity-60"
              )}
            >
              Based 🔥
            </button>
            <button
              onClick={() => castVote("banned")}
              disabled={!!vote}
              className={cn(
                "rounded-2xl border px-4 py-3 text-sm font-bold transition-colors",
                vote === "banned" ? "border-live/60 bg-live/15 text-live" : "border-white/[0.08] bg-white/[0.03] hover:bg-live/10 disabled:opacity-60"
              )}
            >
              Banned 🚫
            </button>
          </div>

          {vote && (
            <div>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  className="bg-pitch"
                  initial={{ width: 0 }}
                  animate={{ width: `${basedPct}%` }}
                  transition={{ duration: reduced ? 0 : 0.5, ease: "easeOut" }}
                />
                <div className="flex-1 bg-live" />
              </div>
              <div className="mt-1.5 flex justify-between text-[11px] font-semibold">
                <span className="text-pitch">{basedPct}% based · {tally.based}</span>
                <span className="text-live">{tally.banned} · banned {100 - basedPct}%</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">Spins: <b className="text-foreground">{spins}</b></span>
        <Button variant="live" size="sm" onClick={spin} disabled={spinning}>
          {spins === 0 ? <Flame className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
          {spins === 0 ? "Spin" : "Spin again"}
        </Button>
      </div>
    </div>
  );
}
