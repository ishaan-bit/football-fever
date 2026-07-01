"use client";

import { useMemo, useRef } from "react";
import { motion } from "framer-motion";
import {
  CalendarDays, Radio, Trophy, MapPin, CalendarPlus, BellRing,
  ChevronRight, ArrowDownToLine, Clock,
} from "lucide-react";
import { PageShell, PageHeader } from "@/components/shared/page-shell";
import { SectionHeader } from "@/components/shared/section-header";
import { MatchCard } from "@/components/shared/match-card";
import { CountdownInline } from "@/components/shared/countdown";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/components/ui/sonner";
import { GroupTable } from "@/components/fixtures/group-table";
import { KnockoutBracket } from "@/components/fixtures/knockout-bracket";
import { VenueCard } from "@/components/fixtures/venue-card";
import { useNow } from "@/hooks/use-now";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import {
  getMatches, getLiveMatches, getUpcomingMatches, getStandings,
  getBracket, getThirdPlaceMatch, getTeam, ALL_VENUES,
} from "@/lib/data";
import { downloadICS, matchTitle } from "@/lib/calendar";
import { formatMatchDate, formatKickoff, cn } from "@/lib/utils";
import type { Match } from "@/types";

/* ---------------------- Timeline day grouping ----------------------- */

interface DayGroup {
  key: string;
  label: string;
  iso: string;
  isToday: boolean;
  matches: Match[];
}

/** Group all matches by their IST calendar day, ordered by kickoff. */
function groupByDay(matches: Match[], now: number): DayGroup[] {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const todayKey = now ? fmt.format(new Date(now)) : "";
  const map = new Map<string, Match[]>();
  for (const m of matches) {
    const key = fmt.format(new Date(m.kickoff));
    const bucket = map.get(key);
    if (bucket) bucket.push(m);
    else map.set(key, [m]);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, ms]) => {
      const sorted = ms.sort(
        (a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime()
      );
      return {
        key,
        iso: sorted[0]!.kickoff,
        label: formatMatchDate(sorted[0]!.kickoff),
        isToday: key === todayKey,
        matches: sorted,
      };
    });
}

export default function FixturesPage() {
  const now = useNow(15000);
  const clock = now; // SSR-stable: 0 on first render, then ticks (avoids hydration mismatch)
  const reduce = useReducedMotion();

  const allMatches = useMemo(() => getMatches(clock), [clock]);
  const live = useMemo(() => getLiveMatches(clock), [clock]);
  const nextMatch = useMemo(() => getUpcomingMatches(1, clock)[0], [clock]);
  const days = useMemo(() => groupByDay(allMatches, clock), [allMatches, clock]);

  const standings = useMemo(() => getStandings(), [clock]);
  const bracket = useMemo(() => getBracket(clock), [clock]);
  const thirdPlace = useMemo(() => getThirdPlaceMatch(clock), [clock]);

  // Match count per venue for the Venues tab.
  const venueCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of allMatches) counts[m.venueId] = (counts[m.venueId] ?? 0) + 1;
    return counts;
  }, [allMatches]);

  const todayRef = useRef<HTMLElement>(null);
  const jumpToToday = () => {
    todayRef.current?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "start",
    });
  };

  const todayDay = days.find((d) => d.isToday);

  return (
    <PageShell size="wide" className="space-y-6">
      <PageHeader
        eyebrow="World Cup 2026"
        title="Fixtures"
        description="Every kickoff, group table, and knockout tie across the three host nations — all times in IST."
        action={
          live.length > 0 ? (
            <Badge variant="live" className="px-3 py-1">
              <span className="live-dot" /> {live.length} live now
            </Badge>
          ) : nextMatch ? (
            <div className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5 text-electric" />
              Next kickoff
              <CountdownInline iso={nextMatch.kickoff} className="font-semibold text-foreground" />
            </div>
          ) : undefined
        }
      />

      <Tabs defaultValue="timeline">
        <TabsList className="flex w-full max-w-xl flex-wrap">
          <TabsTrigger value="timeline" className="flex-1 gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" /> Timeline
          </TabsTrigger>
          <TabsTrigger value="groups" className="flex-1 gap-1.5">
            <Trophy className="h-3.5 w-3.5" /> Groups
          </TabsTrigger>
          <TabsTrigger value="bracket" className="flex-1 gap-1.5">
            <ChevronRight className="h-3.5 w-3.5" /> Bracket
          </TabsTrigger>
          <TabsTrigger value="venues" className="flex-1 gap-1.5">
            <MapPin className="h-3.5 w-3.5" /> Venues
          </TabsTrigger>
        </TabsList>

        {/* ----------------------------- Timeline ---------------------------- */}
        <TabsContent value="timeline">
          <TimelineView
            days={days}
            live={live}
            nextMatch={nextMatch}
            todayDay={todayDay}
            todayRef={todayRef}
            onJumpToToday={jumpToToday}
            reduce={reduce}
          />
        </TabsContent>

        {/* ------------------------------ Groups ----------------------------- */}
        <TabsContent value="groups">
          <SectionHeader
            title="Group standings"
            icon={<Trophy className="h-4 w-4 text-gold" />}
            action={<span className="text-xs text-muted-foreground">12 groups · top 2 advance</span>}
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {standings.map((g, i) => (
              <GroupTable key={g.id} group={g} index={i} />
            ))}
          </div>
        </TabsContent>

        {/* ------------------------------ Bracket ---------------------------- */}
        <TabsContent value="bracket">
          <SectionHeader
            title="Knockout bracket"
            icon={<Trophy className="h-4 w-4 text-gold" />}
            action={<span className="hidden text-xs text-muted-foreground sm:inline">Scroll to follow the path to the final →</span>}
          />
          <div className="rounded-3xl border border-white/[0.06] glass-subtle p-4 sm:p-5">
            <KnockoutBracket rounds={bracket} thirdPlace={thirdPlace} />
          </div>
        </TabsContent>

        {/* ------------------------------ Venues ----------------------------- */}
        <TabsContent value="venues">
          <SectionHeader
            title="Host stadiums"
            icon={<MapPin className="h-4 w-4 text-electric" />}
            action={<span className="text-xs text-muted-foreground">{ALL_VENUES.length} venues · 3 nations</span>}
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ALL_VENUES.map((v, i) => (
              <VenueCard key={v.id} venue={v} matchCount={venueCounts[v.id] ?? 0} index={i} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}

/* ----------------------------- Timeline view ---------------------------- */

function TimelineView({
  days, live, nextMatch, todayDay, todayRef, onJumpToToday, reduce,
}: {
  days: DayGroup[];
  live: Match[];
  nextMatch?: Match;
  todayDay?: DayGroup;
  todayRef: React.RefObject<HTMLElement | null>;
  onJumpToToday: () => void;
  reduce: boolean;
}) {
  if (days.length === 0) {
    return (
      <EmptyState
        icon={<CalendarDays className="h-5 w-5" />}
        title="No fixtures yet"
        description="The schedule will appear here as soon as kickoffs are confirmed."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Live + next-up control rail */}
      <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.06] glass-subtle p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm">
          {live.length > 0 ? (
            <span className="flex items-center gap-1.5 font-semibold text-live">
              <span className="live-dot" /> {live.length} match{live.length === 1 ? "" : "es"} live
            </span>
          ) : nextMatch ? (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-4 w-4 text-electric" /> Next kickoff
              <CountdownInline iso={nextMatch.kickoff} className="font-semibold text-foreground" />
            </span>
          ) : (
            <span className="text-muted-foreground">Tournament complete</span>
          )}
        </div>
        {(todayDay || live.length > 0) && (
          <Button variant="outline" size="sm" onClick={onJumpToToday}>
            <ArrowDownToLine className="h-3.5 w-3.5" />
            Jump to {live.length > 0 ? "live" : "today"}
          </Button>
        )}
      </div>

      {/* Live matches surfaced at the very top */}
      {live.length > 0 && (
        <section>
          <SectionHeader title="Live now" icon={<Radio className="h-4 w-4 text-live" />} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {live.map((m) => (
              <div key={m.id} className="group/fx relative">
                <MatchCard match={m} />
                <MatchActions match={m} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Day-by-day schedule */}
      {days.map((day) => (
        <motion.section
          key={day.key}
          ref={day.isToday ? todayRef : undefined}
          initial={reduce ? false : { opacity: 0, y: 12 }}
          whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="scroll-mt-24"
        >
          <div className="sticky top-2 z-10 mb-3 flex items-center justify-between rounded-2xl border border-white/[0.06] glass px-3.5 py-2">
            <div className="flex items-center gap-2.5">
              <h2 className="font-display text-sm font-semibold tracking-tight sm:text-base">
                {day.label}
              </h2>
              {day.isToday && <Badge variant="electric">Today</Badge>}
            </div>
            <span className="text-[11px] text-muted-foreground tabular">
              {day.matches.length} {day.matches.length === 1 ? "match" : "matches"}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {day.matches.map((m) => (
              <div key={m.id} className="group/fx relative">
                <MatchCard match={m} />
                <MatchActions match={m} />
              </div>
            ))}
          </div>
        </motion.section>
      ))}
    </div>
  );
}

/* ------------------------- Per-match quick actions ---------------------- */

/** Floating "add to calendar" + "set reminder" buttons overlaid on a card. */
function MatchActions({ match }: { match: Match }) {
  const onAddToCalendar = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    downloadICS(match);
    toast.success("Added to your calendar", {
      description: `${matchTitle(match)} · ${formatKickoff(match.kickoff)}`,
    });
  };

  const onRemind = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const home = getTeam(match.homeTeamId)?.code ?? match.homeLabel ?? "TBD";
    const away = getTeam(match.awayTeamId)?.code ?? match.awayLabel ?? "TBD";
    toast.success("Reminder set", {
      description: `We'll ping you before ${home} vs ${away} kicks off.`,
    });
  };

  return (
    <div
      className={cn(
        "absolute right-3 top-3 z-10 flex gap-1.5 transition-opacity duration-200",
        "opacity-0 group-hover/fx:opacity-100 group-focus-within/fx:opacity-100"
      )}
    >
      <button
        type="button"
        onClick={onAddToCalendar}
        aria-label="Add to calendar"
        className="grid h-7 w-7 place-items-center rounded-full border border-white/10 bg-background/70 text-muted-foreground backdrop-blur transition-colors hover:border-electric/40 hover:text-electric"
      >
        <CalendarPlus className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onRemind}
        aria-label="Set reminder"
        className="grid h-7 w-7 place-items-center rounded-full border border-white/10 bg-background/70 text-muted-foreground backdrop-blur transition-colors hover:border-gold/40 hover:text-gold"
      >
        <BellRing className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
