"use client";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, Check, ArrowLeft, Star, Shuffle, Lock } from "lucide-react";
import { getTeam } from "@/lib/data";
import {
  getSquad,
  squadTeams,
  POSITION_ORDER,
  POSITION_LABEL,
  type Player,
  type Position,
} from "@/lib/data/squads";
import { useSquadStore, SQUAD_SIZE } from "@/stores/squad";
import { useSound } from "@/hooks/use-sound";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TeamCrest } from "@/components/shared/team-crest";
import { cn, hslVar } from "@/lib/utils";

/** Two-phase picker: choose a nation, then draft your five. */
export function SquadBuilder({ onLocked }: { onLocked?: () => void }) {
  const teamId = useSquadStore((s) => s.teamId);
  return teamId ? <DraftPhase teamId={teamId} onLocked={onLocked} /> : <NationPhase />;
}

/* ------------------------------ Nation pick ----------------------------- */

function NationPhase() {
  const setTeam = useSquadStore((s) => s.setTeam);
  const { play } = useSound();
  const reduced = useReducedMotion();
  const [q, setQ] = useState("");

  const teams = useMemo(() => {
    const all = squadTeams();
    const needle = q.trim().toLowerCase();
    if (!needle) return all;
    return all.filter(
      (t) => t.name.toLowerCase().includes(needle) || t.code.toLowerCase().includes(needle)
    );
  }, [q]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search 48 nations…"
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {teams.map((t, i) => (
          <motion.button
            key={t.id}
            onClick={() => {
              play("pop");
              setTeam(t.id);
            }}
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: reduced ? 0 : Math.min(i, 16) * 0.015 }}
            whileTap={reduced ? undefined : { scale: 0.97 }}
            className="group flex items-center gap-3 rounded-2xl border border-white/[0.07] glass p-3 text-left transition-colors hover:border-white/20"
          >
            <TeamCrest team={t} size="md" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{t.name}</span>
              <span className="block text-[11px] text-muted-foreground">
                {t.code} · {t.rating} OVR
              </span>
            </span>
          </motion.button>
        ))}
        {teams.length === 0 && (
          <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
            No nation matches “{q}”.
          </p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------- Draft XI ------------------------------- */

function DraftPhase({ teamId, onLocked }: { teamId: string; onLocked?: () => void }) {
  const picks = useSquadStore((s) => s.picks);
  const togglePick = useSquadStore((s) => s.togglePick);
  const setTeam = useSquadStore((s) => s.setTeam);
  const reset = useSquadStore((s) => s.reset);
  const clearPicks = useSquadStore((s) => s.clearPicks);
  const { play } = useSound();
  const reduced = useReducedMotion();

  const team = getTeam(teamId);
  const squad = getSquad(teamId);
  const full = picks.length >= SQUAD_SIZE;

  const grouped = useMemo(() => {
    const map: Record<Position, Player[]> = { GK: [], DEF: [], MID: [], FWD: [] };
    for (const p of squad) map[p.position].push(p);
    return map;
  }, [squad]);

  const onToggle = (p: Player) => {
    const picked = picks.includes(p.id);
    if (!picked && full) {
      play("error");
      return;
    }
    play(picked ? "click" : "pop");
    togglePick(p.id);
  };

  const autoPick = () => {
    // Drop the current picks and grab the five highest-rated outfield + GK mix.
    clearPicks();
    const best = [...squad].sort((a, b) => b.overall - a.overall).slice(0, SQUAD_SIZE);
    best.forEach((p) => togglePick(p.id));
    play("win");
  };

  return (
    <div className="space-y-5">
      {/* nation header */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.07] glass p-3">
        <div className="flex items-center gap-3">
          <TeamCrest team={team} size="lg" />
          <div>
            <p className="font-display text-lg font-bold leading-tight">{team?.name}</p>
            <p className="text-xs text-muted-foreground">Pick your famous five</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => { play("click"); reset(); }}>
          <ArrowLeft className="h-4 w-4" /> Change
        </Button>
      </div>

      {/* progress */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {Array.from({ length: SQUAD_SIZE }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-2 w-7 rounded-full transition-colors",
                i < picks.length ? "bg-electric" : "bg-white/10"
              )}
            />
          ))}
          <span className="ml-2 text-xs font-semibold text-muted-foreground">
            {picks.length}/{SQUAD_SIZE}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={autoPick}>
          <Shuffle className="h-4 w-4" /> Auto-pick
        </Button>
      </div>

      {/* roster by position */}
      <div className="space-y-5">
        {POSITION_ORDER.map((pos) => (
          <div key={pos}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {POSITION_LABEL[pos]}
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {grouped[pos].map((p) => {
                const picked = picks.includes(p.id);
                const dim = !picked && full;
                return (
                  <motion.button
                    key={p.id}
                    onClick={() => onToggle(p)}
                    whileTap={reduced ? undefined : { scale: 0.98 }}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors",
                      picked
                        ? "border-electric/55 bg-electric/10"
                        : "border-white/[0.07] bg-white/[0.02] hover:border-white/20",
                      dim && "opacity-45"
                    )}
                  >
                    <span
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-bold tabular-nums"
                      style={{
                        background: hslVar("var(--electric)", picked ? 0.18 : 0.08),
                        color: hslVar("var(--electric)"),
                      }}
                    >
                      {p.number}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-semibold">{p.name}</span>
                        {p.star && <Star className="h-3 w-3 shrink-0 fill-gold text-gold" />}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {p.trait} · {p.overall} OVR
                      </span>
                    </span>
                    {picked ? (
                      <Check className="h-4 w-4 shrink-0 text-electric" />
                    ) : (
                      <span className="text-[11px] font-semibold text-muted-foreground">Pick</span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* sticky lock-in */}
      <div className="sticky bottom-2 z-10">
        <Button
          variant="electric"
          size="lg"
          className="w-full shadow-elevated"
          disabled={!full}
          onClick={() => { play("whistle"); onLocked?.(); }}
        >
          <Lock className="h-4 w-4" />
          {full ? "Lock in your five & play" : `Pick ${SQUAD_SIZE - picks.length} more`}
        </Button>
      </div>
    </div>
  );
}
