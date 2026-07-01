"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Crown, Trophy, Sparkles, ArrowUp, ArrowDown, Minus, Lock,
  Award, Medal, Target,
} from "lucide-react";
import type { LeaderboardEntry } from "@/types";
import { PageShell, PageHeader } from "@/components/shared/page-shell";
import { SectionHeader } from "@/components/shared/section-header";
import { Icon } from "@/components/shared/icon";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useHydrated } from "@/hooks/use-hydrated";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { usePredictionStore } from "@/stores/predictions";
import { useUserStore } from "@/stores/user";
import { buildLeaderboard, FRIENDS } from "@/lib/data";
import { BADGES_CATALOG } from "@/lib/constants";
import { pct, ordinal, hslVar, cn, initials } from "@/lib/utils";

const TIER_COLOR: Record<string, string> = {
  bronze: "var(--gold)",
  silver: "var(--electric)",
  gold: "var(--gold)",
  legendary: "var(--brand-violet)",
};

const TIER_LABEL: Record<string, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  legendary: "Legendary",
};

const BADGE_BY_ID = Object.fromEntries(BADGES_CATALOG.map((b) => [b.id, b]));

export default function LeaderboardPage() {
  const hydrated = useHydrated();
  const reduce = useReducedMotion();
  const profile = useUserStore((s) => s.profile);
  const pointsTotal = usePredictionStore((s) => s.pointsTotal());

  const youPoints = 900 + (hydrated ? pointsTotal : 0);
  const board = useMemo(
    () => buildLeaderboard(profile.id, youPoints),
    [profile.id, youPoints]
  );

  const podium = board.slice(0, 3);
  const youEntry = board.find((e) => e.isYou);

  // Daily: a stable reorder by a derived key (recent-form weighting), not random.
  const daily = useMemo(() => {
    return [...board]
      .map((e) => ({ ...e, dailyScore: e.streak * 80 + e.accuracy * 600 + (e.points % 200) }))
      .sort((a, b) => b.dailyScore - a.dailyScore)
      .map((e, i) => ({ ...e, rank: i + 1 }));
  }, [board]);

  return (
    <PageShell className="space-y-6">
      <PageHeader
        eyebrow="Standings"
        title="Leaderboard"
        description="Where the room settles who actually knows ball. Climb the table, collect badges, and try not to finish below the Oracle."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/predictions"><Target className="h-4 w-4" /> Make a pick</Link>
          </Button>
        }
      />

      {/* Podium */}
      <Podium podium={podium} reduce={reduce} hydrated={hydrated} />

      {/* Your standing callout */}
      {youEntry && (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-electric/25 bg-electric/[0.05] p-4"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-electric/15 font-display text-lg font-bold text-electric">
              {hydrated ? ordinal(youEntry.rank) : "—"}
            </span>
            <div>
              <p className="text-sm font-semibold">You're {hydrated ? ordinal(youEntry.rank) : "—"} of {board.length}</p>
              <p className="text-[11px] text-muted-foreground">
                {hydrated ? `${youEntry.points.toLocaleString()} pts` : "—"} · keep predicting to climb
              </p>
            </div>
          </div>
          <Button asChild variant="electric" size="sm">
            <Link href="/predictions">Climb the table</Link>
          </Button>
        </motion.div>
      )}

      {/* Tables */}
      <Tabs defaultValue="tournament">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="tournament" className="flex-1 sm:flex-none">Tournament</TabsTrigger>
          <TabsTrigger value="daily" className="flex-1 sm:flex-none">Daily</TabsTrigger>
          <TabsTrigger value="friends" className="flex-1 sm:flex-none">Friends</TabsTrigger>
        </TabsList>

        <TabsContent value="tournament">
          <RankedList entries={board} reduce={reduce} hydrated={hydrated} caption="Full tournament standings" />
        </TabsContent>
        <TabsContent value="daily">
          <RankedList entries={daily} reduce={reduce} hydrated={hydrated} caption="Today's form movers" showStaticRank />
        </TabsContent>
        <TabsContent value="friends">
          <RankedList entries={board} reduce={reduce} hydrated={hydrated} caption="You and the watch-party crew" />
        </TabsContent>
      </Tabs>

      {/* Badges */}
      <BadgesSection reduce={reduce} />

      {/* Awards */}
      <AwardsSection board={board} reduce={reduce} />
    </PageShell>
  );
}

/* -------------------------------- Podium -------------------------------- */

const PODIUM_RING: Record<number, string> = {
  1: "var(--gold)",
  2: "var(--electric)",
  3: "var(--brand-violet)",
};

function Podium({ podium, reduce, hydrated }: { podium: LeaderboardEntry[]; reduce: boolean; hydrated: boolean }) {
  // Visual order: 2nd, 1st, 3rd so #1 sits centre and raised.
  const order = [podium[1], podium[0], podium[2]].filter(Boolean) as LeaderboardEntry[];

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/[0.07] glass-strong p-4 sm:p-6">
      <div className="absolute inset-x-0 -top-24 mx-auto h-48 w-3/4 rounded-full bg-gold/15 blur-3xl" />
      <div className="relative grid grid-cols-3 items-end gap-2 sm:gap-5">
        {order.map((entry, i) => {
          const place = entry.rank;
          const center = place === 1;
          const ring = PODIUM_RING[place] ?? "var(--electric)";
          const isOracle = entry.userId === "oracle";
          return (
            <motion.div
              key={entry.userId}
              initial={reduce ? false : { opacity: 0, y: 24 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08 * i, ease: [0.22, 1, 0.36, 1] }}
              className={cn("flex flex-col items-center text-center", center ? "-translate-y-3 sm:-translate-y-5" : "")}
            >
              {center && <Crown className="mb-1.5 h-6 w-6 text-gold drop-shadow-[0_2px_8px_hsl(var(--gold)/0.6)]" />}
              <div className="relative">
                <Avatar
                  className={cn("ring-4", center ? "h-20 w-20 sm:h-24 sm:w-24" : "h-14 w-14 sm:h-16 sm:w-16")}
                  style={{ boxShadow: `0 0 0 4px ${hslVar(ring, 0.35)}, 0 12px 40px -12px ${hslVar(ring, 0.6)}` }}
                >
                  <AvatarImage src={entry.avatar} alt={entry.name} />
                  <AvatarFallback>{initials(entry.name)}</AvatarFallback>
                </Avatar>
                <span
                  className="absolute -bottom-1 left-1/2 grid h-6 w-6 -translate-x-1/2 place-items-center rounded-full font-display text-xs font-bold text-background"
                  style={{ background: hslVar(ring) }}
                >
                  {place}
                </span>
              </div>
              <p className={cn("mt-3 flex items-center gap-1 truncate font-semibold", center ? "text-base" : "text-sm")}>
                {isOracle && <Sparkles className="h-3.5 w-3.5 text-accent" />}
                <span className="truncate">{entry.isYou ? "You" : entry.name}</span>
              </p>
              <p className="font-mono text-sm font-bold tabular-nums" style={{ color: hslVar(ring) }}>
                {hydrated || !entry.isYou ? entry.points.toLocaleString() : "—"}
              </p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{pct(entry.accuracy)} acc</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------ Ranked list ----------------------------- */

function DeltaArrow({ delta }: { delta: number }) {
  if (delta > 0) return <span className="flex items-center text-[11px] font-semibold text-pitch"><ArrowUp className="h-3 w-3" />{delta}</span>;
  if (delta < 0) return <span className="flex items-center text-[11px] font-semibold text-live"><ArrowDown className="h-3 w-3" />{Math.abs(delta)}</span>;
  return <span className="flex items-center text-[11px] text-muted-foreground"><Minus className="h-3 w-3" /></span>;
}

function RankedList({
  entries, reduce, hydrated, caption, showStaticRank,
}: {
  entries: LeaderboardEntry[];
  reduce: boolean;
  hydrated: boolean;
  caption: string;
  showStaticRank?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/[0.06] glass">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3 sm:px-5">
        <h3 className="font-display text-base font-semibold">{caption}</h3>
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{entries.length} players</span>
      </div>
      <ul className="divide-y divide-white/[0.04]">
        {entries.map((entry, i) => {
          const isOracle = entry.userId === "oracle";
          const badges = entry.badges.slice(0, 3);
          return (
            <motion.li
              key={entry.userId}
              initial={reduce ? false : { opacity: 0, x: -10 }}
              whileInView={reduce ? undefined : { opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-20px" }}
              transition={{ duration: 0.32, delay: Math.min(i * 0.025, 0.3), ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-white/[0.02] sm:px-4",
                entry.isYou && "bg-electric/[0.06] ring-1 ring-inset ring-electric/30 hover:bg-electric/[0.08]",
                isOracle && "bg-accent/[0.05]"
              )}
            >
              {/* Rank */}
              <span className={cn(
                "w-7 shrink-0 text-center font-display text-sm font-bold tabular-nums",
                entry.rank === 1 ? "text-gold" : entry.rank <= 3 ? "text-foreground" : "text-muted-foreground"
              )}>
                {entry.rank}
              </span>

              {/* Avatar */}
              <Avatar className={cn("h-9 w-9 shrink-0", isOracle && "ring-2 ring-accent/40")}>
                <AvatarImage src={entry.avatar} alt={entry.name} />
                <AvatarFallback>{initials(entry.name)}</AvatarFallback>
              </Avatar>

              {/* Name + badges */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 truncate text-sm font-semibold">
                  {isOracle && <Sparkles className="h-3.5 w-3.5 shrink-0 text-accent" />}
                  <span className="truncate">{entry.isYou ? "You" : entry.name}</span>
                  {entry.isYou && <Badge variant="electric" className="px-1.5 py-0 text-[9px]">YOU</Badge>}
                </div>
                <p className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="tabular-nums">{pct(entry.accuracy)} acc</span>
                  <span className="tabular-nums">{entry.streak}🔥</span>
                  {badges.length > 0 && (
                    <span className="hidden items-center gap-1 sm:flex">
                      {badges.map((bid) => {
                        const b = BADGE_BY_ID[bid];
                        if (!b) return null;
                        return (
                          <span
                            key={bid}
                            className="grid h-4 w-4 place-items-center rounded"
                            style={{ color: hslVar(TIER_COLOR[b.tier]) }}
                            title={b.name}
                          >
                            <Icon name={b.icon} className="h-3 w-3" />
                          </span>
                        );
                      })}
                    </span>
                  )}
                </p>
              </div>

              {/* Delta */}
              {!showStaticRank && <div className="hidden shrink-0 sm:block"><DeltaArrow delta={entry.delta} /></div>}

              {/* Points */}
              <div className="shrink-0 text-right">
                <p className="font-mono text-sm font-bold tabular-nums" style={{ color: isOracle ? hslVar("var(--brand-violet)") : undefined }}>
                  {hydrated || !entry.isYou ? entry.points.toLocaleString() : "—"}
                </p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">pts</p>
              </div>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}

/* ------------------------------- Badges --------------------------------- */

function BadgesSection({ reduce }: { reduce: boolean }) {
  return (
    <section>
      <SectionHeader title="Badges" icon={<Medal className="h-4 w-4 text-gold" />} />
      <TooltipProvider delayDuration={120}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {BADGES_CATALOG.map((badge, i) => {
            const earned = i < 3; // deterministic: first three earned
            const color = TIER_COLOR[badge.tier];
            return (
              <Tooltip key={badge.id}>
                <TooltipTrigger asChild>
                  <motion.div
                    initial={reduce ? false : { opacity: 0, scale: 0.94 }}
                    whileInView={reduce ? undefined : { opacity: 1, scale: 1 }}
                    viewport={{ once: true, margin: "-30px" }}
                    transition={{ duration: 0.34, delay: Math.min(i * 0.03, 0.24), ease: [0.22, 1, 0.36, 1] }}
                    className={cn(
                      "relative flex flex-col items-center rounded-2xl border p-4 text-center transition",
                      earned ? "border-white/10 glass" : "border-white/[0.05] bg-white/[0.01]"
                    )}
                    style={earned ? { borderColor: hslVar(color, 0.3) } : undefined}
                  >
                    {!earned && (
                      <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-white/[0.06] text-muted-foreground">
                        <Lock className="h-2.5 w-2.5" />
                      </span>
                    )}
                    <span
                      className={cn("grid h-12 w-12 place-items-center rounded-2xl", !earned && "grayscale")}
                      style={{
                        background: earned ? hslVar(color, 0.14) : "hsl(0 0% 100% / 0.04)",
                        color: earned ? hslVar(color) : "hsl(0 0% 100% / 0.3)",
                      }}
                    >
                      <Icon name={badge.icon} className="h-6 w-6" />
                    </span>
                    <p className={cn("mt-2.5 text-sm font-semibold", !earned && "text-muted-foreground")}>{badge.name}</p>
                    <Badge
                      variant="secondary"
                      className="mt-1.5 px-2 py-0 text-[9px] uppercase tracking-wide"
                      style={earned ? { color: hslVar(color) } : undefined}
                    >
                      {earned ? TIER_LABEL[badge.tier] : "Locked"}
                    </Badge>
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent>{badge.description}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
    </section>
  );
}

/* -------------------------------- Awards -------------------------------- */

interface AwardDef {
  id: string;
  title: string;
  reason: string;
  icon: string;
  accent: string;
  /** leaderboard userId, or a FRIENDS index fallback */
  recipientId: string;
}

const AWARDS: AwardDef[] = [
  { id: "oracle_slayer", title: "Oracle Slayer", reason: "Beat the Oracle's call more than anyone this week", icon: "Sparkles", accent: "var(--brand-violet)", recipientId: "u_ishaan" },
  { id: "night_owl", title: "Night Owl", reason: "In the room for every 3:30am IST kickoff", icon: "Moon", accent: "var(--electric)", recipientId: "u_sara" },
  { id: "loud_one", title: "The Loud One", reason: "Topped the Crowd Meter in four straight matches", icon: "Volume2", accent: "var(--live)", recipientId: "u_rohan" },
  { id: "nostradamus", title: "Nostradamus", reason: "Called two exact scorelines no one saw coming", icon: "Eye", accent: "var(--gold)", recipientId: "u_dev" },
];

function AwardsSection({ board, reduce }: { board: LeaderboardEntry[]; reduce: boolean }) {
  const byId = useMemo(() => Object.fromEntries(board.map((e) => [e.userId, e])), [board]);
  const friendById = useMemo(() => Object.fromEntries(FRIENDS.map((f) => [f.id, f])), []);

  return (
    <section>
      <SectionHeader title="Room awards" icon={<Award className="h-4 w-4 text-gold" />} />
      <div className="grid gap-3 sm:grid-cols-2">
        {AWARDS.map((award, i) => {
          const entry = byId[award.recipientId];
          const friend = friendById[award.recipientId];
          const name = entry?.name ?? friend?.name ?? "TBD";
          const avatar = entry?.avatar ?? friend?.avatar;
          return (
            <motion.div
              key={award.id}
              initial={reduce ? false : { opacity: 0, y: 14 }}
              whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.4, delay: Math.min(i * 0.05, 0.25), ease: [0.22, 1, 0.36, 1] }}
              className="relative flex items-center gap-4 overflow-hidden rounded-3xl border border-white/[0.07] glass p-4 sm:p-5"
            >
              <div
                className="absolute -right-12 -top-12 h-32 w-32 rounded-full blur-3xl"
                style={{ background: hslVar(award.accent, 0.18) }}
              />
              <span
                className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl"
                style={{ background: hslVar(award.accent, 0.14), color: hslVar(award.accent) }}
              >
                <Icon name={award.icon} className="h-6 w-6" />
              </span>
              <div className="relative min-w-0 flex-1">
                <p className="text-sm font-bold" style={{ color: hslVar(award.accent) }}>{award.title}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{award.reason}</p>
                <div className="mt-2 flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    {avatar && <AvatarImage src={avatar} alt={name} />}
                    <AvatarFallback>{initials(name)}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-semibold">{name}</span>
                  <Trophy className="h-3 w-3 text-gold" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
