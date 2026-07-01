"use client";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Users, Pencil, Repeat, Trophy, Swords, Star } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { TeamCrest } from "@/components/shared/team-crest";
import { Skeleton } from "@/components/ui/skeleton";
import { useHydrated } from "@/hooks/use-hydrated";
import { useSound } from "@/hooks/use-sound";
import { getTeam } from "@/lib/data";
import { getPlayer, type Player } from "@/lib/data/squads";
import { useSquadStore, SQUAD_SIZE } from "@/stores/squad";
import { cn } from "@/lib/utils";
import { SquadBuilder } from "./squad-builder";
import { HeroMoment } from "./hero-moment";
import { TopTrumps } from "./top-trumps";

export function SquadLab() {
  const hydrated = useHydrated();
  const teamId = useSquadStore((s) => s.teamId);
  const picks = useSquadStore((s) => s.picks);
  const clearPicks = useSquadStore((s) => s.clearPicks);
  const reset = useSquadStore((s) => s.reset);
  const { play } = useSound();

  const [editing, setEditing] = useState(false);

  const ready = !!teamId && picks.length === SQUAD_SIZE;

  const cast = useMemo<Player[]>(() => {
    if (!teamId) return [];
    return picks.map((id) => getPlayer(teamId, id)).filter(Boolean) as Player[];
  }, [teamId, picks]);

  if (!hydrated) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  if (!ready || editing) {
    return <SquadBuilder onLocked={() => setEditing(false)} />;
  }

  const team = getTeam(teamId);

  return (
    <div className="space-y-5">
      {/* squad summary */}
      <div className="rounded-2xl border border-white/[0.07] glass p-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <TeamCrest team={team} size="lg" />
            <div>
              <p className="font-display text-lg font-bold leading-tight">{team?.name}</p>
              <p className="text-xs text-muted-foreground">Your famous five</p>
            </div>
          </div>
          <div className="flex gap-1.5">
            <Button variant="ghost" size="sm" onClick={() => { play("click"); clearPicks(); setEditing(true); }}>
              <Pencil className="h-4 w-4" /> Re-draft
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { play("click"); reset(); setEditing(true); }}>
              <Repeat className="h-4 w-4" /> Nation
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {cast.map((p) => (
            <motion.span
              key={p.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                "flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] py-1 pl-1.5 pr-3 text-xs font-semibold"
              )}
            >
              <span className="grid h-5 w-5 place-items-center rounded-full bg-electric/15 text-[10px] tabular-nums text-electric">
                {p.number}
              </span>
              {p.name}
              {p.star && <Star className="h-3 w-3 fill-gold text-gold" />}
            </motion.span>
          ))}
        </div>
      </div>

      {/* games */}
      <Tabs defaultValue="hero">
        <TabsList className="w-full">
          <TabsTrigger value="hero" className="flex-1">
            <Trophy className="mr-1.5 h-3.5 w-3.5" /> Hero Moment
          </TabsTrigger>
          <TabsTrigger value="duel" className="flex-1">
            <Swords className="mr-1.5 h-3.5 w-3.5" /> Squad Duel
          </TabsTrigger>
        </TabsList>
        <TabsContent value="hero" className="mt-4">
          <HeroMoment cast={cast} />
        </TabsContent>
        <TabsContent value="duel" className="mt-4">
          <TopTrumps cast={cast} teamId={teamId!} />
        </TabsContent>
      </Tabs>

      <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
        <Users className="h-3 w-3" /> {SQUAD_SIZE} players picked · more squad games landing in match rooms
      </p>
    </div>
  );
}
