"use client";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gauge, Crosshair, Brain, Shield, Wand2, RotateCcw, Trophy, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSound } from "@/hooks/use-sound";
import { useConfetti } from "@/hooks/use-confetti";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { getSquad, squadTeams, type Player, type PlayerStats } from "@/lib/data/squads";
import { getTeam } from "@/lib/data";
import { cn, hslVar } from "@/lib/utils";

const ACCENT = "var(--brand-violet)";

const STATS: Array<{ key: keyof PlayerStats; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: "pace", label: "Pace", icon: Gauge },
  { key: "shooting", label: "Shooting", icon: Crosshair },
  { key: "passing", label: "Passing", icon: Brain },
  { key: "defending", label: "Defending", icon: Shield },
  { key: "flair", label: "Flair", icon: Wand2 },
];

export function TopTrumps({ cast, teamId }: { cast: Player[]; teamId: string }) {
  const { play } = useSound();
  const { celebrate } = useConfetti();
  const reduced = useReducedMotion();

  // The Oracle fields the strongest rival nation (deterministic).
  const oppId = useMemo(() => {
    const rival = squadTeams().find((t) => t.id !== teamId);
    return rival?.id ?? teamId;
  }, [teamId]);

  const oppTeam = getTeam(oppId);
  const oppSquad = useMemo(() => {
    const squad = getSquad(oppId);
    // Oracle fields its five best so the duel has teeth.
    return [...squad].sort((a, b) => b.overall - a.overall).slice(0, cast.length);
  }, [oppId, cast.length]);

  const rounds = Math.min(cast.length, oppSquad.length);
  const [step, setStep] = useState(0);
  const [you, setYou] = useState(0);
  const [opp, setOpp] = useState(0);
  const [chosen, setChosen] = useState<keyof PlayerStats | null>(null);

  const mine = cast[step];
  const theirs = oppSquad[step];
  const done = step >= rounds;

  const choose = (key: keyof PlayerStats) => {
    if (chosen || !mine || !theirs) return;
    setChosen(key);
    const a = mine.stats[key];
    const b = theirs.stats[key];
    if (a >= b) {
      setYou((v) => v + 1);
      play("win");
    } else {
      setOpp((v) => v + 1);
      play("error");
    }
  };

  const advance = () => {
    play("click");
    const next = step + 1;
    setChosen(null);
    setStep(next);
    if (next >= rounds && you > opp) celebrate(["#9b6bff", "#22e0a1", "#19c3ff"]);
  };

  const restart = () => {
    play("click");
    setStep(0);
    setYou(0);
    setOpp(0);
    setChosen(null);
  };

  if (done) {
    const win = you > opp;
    const draw = you === opp;
    const color = win ? "var(--pitch)" : draw ? "var(--gold)" : "var(--live)";
    return (
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <motion.div
          initial={{ scale: reduced ? 1 : 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 14 }}
          className="grid h-24 w-24 place-items-center rounded-full border"
          style={{ borderColor: hslVar(color, 0.5), background: hslVar(color, 0.12) }}
        >
          <Trophy className="h-9 w-9" style={{ color: hslVar(color) }} />
        </motion.div>
        <div>
          <p className="font-display text-2xl font-bold tabular-nums">{you} – {opp}</p>
          <p className="text-sm text-muted-foreground">
            {win ? "You schooled the Oracle." : draw ? "Honours even with the Oracle." : "The Oracle had your number."}
          </p>
        </div>
        <Button className="w-full" variant="default" onClick={restart}>
          <RotateCcw className="h-4 w-4" /> Rematch
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs text-muted-foreground">
        Top-trumps duel: your player vs the Oracle&apos;s {oppTeam?.name} pick. Choose the stat you think wins the round.
      </p>

      <div className="flex items-center justify-between text-sm font-semibold">
        <span className="text-electric">You {you}</span>
        <span className="text-xs text-muted-foreground">Round {step + 1} / {rounds}</span>
        <span className="text-accent">Oracle {opp}</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: reduced ? 0 : 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduced ? 0 : -16 }}
          className="space-y-3"
        >
          {/* the two cards */}
          <div className="grid grid-cols-2 gap-3">
            <PlayerCard player={mine} side="you" />
            <PlayerCard player={theirs} side="opp" reveal={!!chosen} />
          </div>

          {/* stat chooser */}
          <div className="grid gap-2">
            {STATS.map(({ key, label, icon: Ico }) => {
              const a = mine?.stats[key] ?? 0;
              const b = theirs?.stats[key] ?? 0;
              const picked = chosen === key;
              const won = picked && a >= b;
              return (
                <motion.button
                  key={key}
                  onClick={() => choose(key)}
                  disabled={!!chosen}
                  whileTap={reduced ? undefined : { scale: 0.99 }}
                  className={cn(
                    "flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition-colors disabled:cursor-default",
                    "border-white/[0.08] bg-white/[0.03]",
                    !chosen && "hover:border-accent/45 hover:bg-accent/8",
                    picked && won && "border-pitch/55 bg-pitch/12",
                    picked && !won && "border-live/55 bg-live/12"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Ico className="h-4 w-4 text-muted-foreground" /> {label}
                  </span>
                  <span className="flex items-center gap-3 tabular-nums">
                    <span className={cn(chosen && (a >= b ? "text-pitch" : "text-muted-foreground"))}>{a}</span>
                    {chosen ? (
                      <span className={cn(b > a ? "text-accent" : "text-muted-foreground")}>{b}</span>
                    ) : (
                      <span className="text-muted-foreground">?</span>
                    )}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      {chosen && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <Button size="sm" className="w-full" variant="default" onClick={advance}>
            {step + 1 >= rounds ? <><Trophy className="h-4 w-4" /> See result</> : "Next round"}
          </Button>
        </motion.div>
      )}
    </div>
  );
}

function PlayerCard({ player, side, reveal = true }: { player?: Player; side: "you" | "opp"; reveal?: boolean }) {
  if (!player) return null;
  const accent = side === "you" ? "var(--electric)" : ACCENT;
  return (
    <div
      className="rounded-2xl border p-3"
      style={{ borderColor: hslVar(accent, 0.3), background: hslVar(accent, 0.07) }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: hslVar(accent) }}>
          {side === "you" ? "Your pick" : "Oracle"}
        </span>
        <span className="grid h-6 w-6 place-items-center rounded-md bg-white/[0.06] text-[11px] font-bold tabular-nums">
          {player.number}
        </span>
      </div>
      <p className="mt-1.5 flex items-center gap-1 text-sm font-bold leading-tight">
        <span className="truncate">{reveal ? player.name : "•••••"}</span>
        {reveal && player.star && <Star className="h-3 w-3 shrink-0 fill-gold text-gold" />}
      </p>
      <p className="text-[11px] text-muted-foreground">{player.position} · {player.overall} OVR</p>
    </div>
  );
}
