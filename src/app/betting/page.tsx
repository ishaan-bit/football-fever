"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Coins, Sparkles, ShieldCheck, Plus, Receipt, Pencil, Wallet, Trophy,
  TrendingUp, Crown, ArrowUpRight, Lock, BadgeCheck, ScrollText, Check,
} from "lucide-react";
import { PageShell, PageHeader } from "@/components/shared/page-shell";
import { SectionHeader } from "@/components/shared/section-header";
import { TeamCrest } from "@/components/shared/team-crest";
import { StatusPill, stageLabel } from "@/components/shared/status-pill";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/components/ui/sonner";
import { BetSlip } from "@/components/betting/bet-slip";
import { ValuePickCard, type ValuePick } from "@/components/betting/value-pick-card";
import { useNow } from "@/hooks/use-now";
import { useHydrated } from "@/hooks/use-hydrated";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useBetsStore } from "@/stores/bets";
import { useUserStore } from "@/stores/user";
import {
  getUpcomingMatches, getLiveMatches, getStandings, getTeam, buildLeaderboard,
} from "@/lib/data";
import { runOracle, type OracleContext } from "@/lib/oracle/engine";
import { makeOdds, decimalToFractional } from "@/lib/betting/odds";
import type { Match, MatchOdds, MarketKey, OddsSelection, BetSlipLeg, PlacedBet } from "@/types";
import { pct, hslVar, initials } from "@/lib/utils";

/* ------------------------------------------------------------------ *
 *  Markets — AI value picks. A FRIENDLY-STAKES, play-coin feature.
 *  The Oracle prices every market and flags where it thinks the price
 *  is wrong. Nothing here is real-money gambling; settlement between
 *  friends (if any) is optional, peer-to-peer UPI.
 * ------------------------------------------------------------------ */

interface PricedMatch {
  match: Match;
  odds: MatchOdds;
  verdict: string;
}

const STATUS_STYLE: Record<PlacedBet["status"], { label: string; cls: string }> = {
  open: { label: "Open", cls: "bg-electric/15 text-electric" },
  won: { label: "Won", cls: "bg-pitch/15 text-pitch" },
  lost: { label: "Lost", cls: "bg-live/15 text-live" },
  void: { label: "Void", cls: "bg-white/[0.08] text-muted-foreground" },
};

export default function BettingPage() {
  const now = useNow(15000);
  const clock = now; // SSR-stable: 0 on first render, then ticks (avoids hydration mismatch)
  const hydrated = useHydrated();

  const ageConfirmed = useBetsStore((s) => s.ageConfirmed);
  const slip = useBetsStore((s) => s.slip);
  const addLeg = useBetsStore((s) => s.addLeg);

  const [slipOpen, setSlipOpen] = useState(false);

  // Price every upcoming + live match through the Oracle once.
  const priced = useMemo<PricedMatch[]>(() => {
    const standings = getStandings();
    const formOf = (teamId: string) =>
      standings.flatMap((g) => g.standings).find((r) => r.teamId === teamId)?.form ?? [];
    const matches = [...getLiveMatches(clock), ...getUpcomingMatches(8, clock)];
    const out: PricedMatch[] = [];
    for (const match of matches) {
      const home = getTeam(match.homeTeamId);
      const away = getTeam(match.awayTeamId);
      if (!home || !away) continue;
      const ctx: OracleContext = {
        homeForm: formOf(home.id),
        awayForm: formOf(away.id),
        homeIsHost: ["usa", "mex", "can"].includes(home.id),
      };
      const oracle = runOracle(match, ctx);
      if (!oracle) continue;
      const odds = makeOdds(match, oracle);
      if (!odds) continue;
      out.push({ match, odds, verdict: oracle.verdict });
    }
    return out;
  }, [clock]);

  // Top value picks across all matches (highest positive edge first).
  const valuePicks = useMemo<ValuePick[]>(() => {
    const picks: ValuePick[] = [];
    for (const { match, odds, verdict } of priced) {
      if (!odds.bestValue) continue;
      const market = odds.markets.find((m) => m.key === odds.bestValue!.marketKey);
      const sel = market?.selections.find((s) => s.id === odds.bestValue!.selectionId);
      if (!market || !sel || sel.edge <= 0) continue;
      picks.push({ match, marketKey: market.key, marketLabel: market.label, selection: sel, verdict });
    }
    return picks.sort((a, b) => b.selection.edge - a.selection.edge).slice(0, 5);
  }, [priced]);

  const slipIds = useMemo(() => new Set(hydrated ? slip.map((l) => l.id) : []), [slip, hydrated]);

  const legFor = (match: Match, marketKey: MarketKey, sel: OddsSelection): BetSlipLeg => {
    const home = getTeam(match.homeTeamId);
    const away = getTeam(match.awayTeamId);
    const tag = home && away ? `${home.code}–${away.code}` : "Match";
    return {
      id: `${match.id}:${marketKey}:${sel.id}`,
      matchId: match.id,
      marketKey,
      selectionId: sel.id,
      label: `${tag} · ${sel.label}`,
      decimal: sel.decimal,
    };
  };

  const onAddSelection = (match: Match, marketKey: MarketKey, sel: OddsSelection) => {
    addLeg(legFor(match, marketKey, sel));
    toast.success("Added to slip", { description: `${sel.label} @ ${sel.decimal.toFixed(2)}` });
  };

  const onAddValuePick = (p: ValuePick) => onAddSelection(p.match, p.marketKey, p.selection);

  const slipCount = hydrated ? slip.length : 0;

  // Gate: don't reveal markets until 18+ is confirmed (after hydration).
  if (hydrated && !ageConfirmed) {
    return (
      <PageShell size="narrow" className="py-12">
        <AgeGate />
        <Disclaimer className="mt-8" />
      </PageShell>
    );
  }

  return (
    <PageShell className="space-y-10 pb-28">
      <PageHeader
        eyebrow="Friendly stakes · Play-coins"
        title={
          <span className="flex items-center gap-2">
            Markets <span className="text-gradient">AI value picks</span>
          </span>
        }
        description="The Oracle prices every market off recent form and flags where it thinks the odds are wrong. Play-coins only — for fun with friends, not a sportsbook."
        action={
          <Button variant="electric" onClick={() => setSlipOpen(true)} className="relative">
            <Receipt className="h-4 w-4" /> Bet slip
            {slipCount > 0 && (
              <span className="ml-1 grid h-5 min-w-5 place-items-center rounded-full bg-background/30 px-1 text-xs font-bold tabular">
                {slipCount}
              </span>
            )}
          </Button>
        }
      />

      <WalletStrip hydrated={hydrated} />

      {/* AI recommendations */}
      <section>
        <SectionHeader
          title="AI recommendations"
          icon={<Sparkles className="h-4 w-4 text-gold" />}
          action={<span className="text-xs text-muted-foreground">Based on recent form</span>}
        />
        {valuePicks.length === 0 ? (
          <EmptyState
            icon={<Sparkles className="h-5 w-5" />}
            title="No standout value right now"
            description="The Oracle only flags picks where it beats the price. Check back as the next fixtures lock in."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {valuePicks.map((p, i) => (
              <ValuePickCard
                key={`${p.match.id}:${p.marketKey}:${p.selection.id}`}
                pick={p}
                index={i}
                inSlip={slipIds.has(`${p.match.id}:${p.marketKey}:${p.selection.id}`)}
                onAdd={onAddValuePick}
              />
            ))}
          </div>
        )}
      </section>

      {/* All markets */}
      <section>
        <SectionHeader
          title="All markets"
          icon={<ScrollText className="h-4 w-4 text-electric" />}
          action={<span className="text-xs text-muted-foreground">{priced.length} matches priced</span>}
        />
        {priced.length === 0 ? (
          <EmptyState
            icon={<ScrollText className="h-5 w-5" />}
            title="No matches to price"
            description="Markets open as soon as the next fixtures are confirmed."
          />
        ) : (
          <div className="space-y-3">
            {priced.map(({ match, odds }) => (
              <MarketCard
                key={match.id}
                match={match}
                odds={odds}
                slipIds={slipIds}
                onSelect={(marketKey, sel) => onAddSelection(match, marketKey, sel)}
              />
            ))}
          </div>
        )}
      </section>

      {/* My bets + leaders */}
      <section className="grid gap-4 lg:grid-cols-3">
        <MyBets hydrated={hydrated} className="lg:col-span-2" />
        <PlayCoinLeaders hydrated={hydrated} />
      </section>

      <Disclaimer />

      <BetSlip open={slipOpen} onOpenChange={setSlipOpen} hydrated={hydrated} />
    </PageShell>
  );
}

/* ------------------------------- Age gate ------------------------------- */

function AgeGate() {
  const confirmAge = useBetsStore((s) => s.confirmAge);
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-3xl border border-white/10 glass-strong p-7 sm:p-9"
    >
      <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-electric/15 blur-3xl" />
      <div className="relative">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-electric/15 text-electric">
          <Lock className="h-6 w-6" />
        </span>
        <Badge variant="electric" className="mt-5">
          <ShieldCheck className="h-3 w-3" /> 18+ · Play for fun
        </Badge>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          A quick check before you play
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Markets is a <span className="font-semibold text-foreground/80">friendly-stakes, play-coin</span> game.
          The Oracle shares AI odds and value picks for entertainment — this is{" "}
          <span className="font-semibold text-foreground/80">not a sportsbook</span> and the app takes{" "}
          <span className="font-semibold text-foreground/80">no real money</span>. Any settlement between
          friends is optional and strictly peer-to-peer.
        </p>

        <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
          {[
            "You are 18 or older.",
            "You understand this is for fun, with play-coins — not real wagering.",
            "Odds and picks are AI estimates, never a guarantee.",
          ].map((t) => (
            <li key={t} className="flex items-start gap-2.5">
              <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-pitch" />
              {t}
            </li>
          ))}
        </ul>

        <Button variant="electric" size="lg" className="mt-7 w-full sm:w-auto" onClick={confirmAge}>
          <Check className="h-4 w-4" /> I'm 18+ — let's play for fun
        </Button>
        <p className="mt-4 text-xs text-muted-foreground">
          If betting stops being fun, take a break. Help is available — please play responsibly.
        </p>
      </div>
    </motion.div>
  );
}

/* ----------------------------- Wallet strip ----------------------------- */

function maskUpi(upi: string) {
  const [name, handle] = upi.split("@");
  if (!name) return upi;
  const head = name.slice(0, 2);
  return `${head}${"•".repeat(Math.max(2, name.length - 2))}${handle ? "@" + handle : ""}`;
}

function WalletStrip({ hydrated }: { hydrated: boolean }) {
  const balance = useBetsStore((s) => s.balance);
  const topUp = useBetsStore((s) => s.topUp);
  const setUpi = useBetsStore((s) => s.setUpi);

  const profile = useUserStore((s) => s.profile);
  const setUpiId = useUserStore((s) => s.setUpiId);

  const upiId = hydrated ? profile.upiId : undefined;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const saveUpi = () => {
    const v = draft.trim();
    if (!/.+@.+/.test(v)) {
      toast.error("Enter a valid UPI ID", { description: "Looks like name@bank." });
      return;
    }
    setUpiId(v);
    setUpi(v);
    setEditing(false);
    setDraft("");
    toast.success("UPI saved", { description: "Only used to settle friendly bets, peer-to-peer." });
  };

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      {/* Balance */}
      <div className="flex items-center justify-between rounded-3xl border border-gold/20 glass p-5">
        <div className="flex items-center gap-3.5">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gold/15 text-gold">
            <Coins className="h-6 w-6" />
          </span>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Play-coin balance</p>
            <p className="font-display text-2xl font-bold tabular text-gold">
              {hydrated ? balance.toLocaleString() : "—"}
            </p>
          </div>
        </div>
        <Button variant="gold" size="sm" onClick={topUp}>
          <Plus className="h-4 w-4" /> Top up
        </Button>
      </div>

      {/* UPI onboarding */}
      <div className="rounded-3xl border border-white/[0.07] glass p-5">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-electric" />
          <p className="text-sm font-semibold">Settle with friends</p>
          <Badge variant="secondary" className="ml-auto">Optional · P2P</Badge>
        </div>

        {!editing && upiId ? (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="flex items-center gap-2.5">
              <BadgeCheck className="h-4 w-4 text-pitch" />
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Your UPI</p>
                <p className="tabular text-sm font-semibold">{maskUpi(upiId)}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDraft(upiId);
                setEditing(true);
              }}
            >
              <Pencil className="h-4 w-4" /> Edit
            </Button>
          </div>
        ) : (
          <div className="mt-3">
            <Label htmlFor="upi" className="text-muted-foreground">
              Add a UPI ID to settle friendly bets directly with friends
            </Label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <Input
                id="upi"
                inputMode="email"
                placeholder="name@bank"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveUpi()}
                className="tabular"
              />
              <Button variant="electric" onClick={saveUpi} className="shrink-0">
                Save UPI ID
              </Button>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Peer-to-peer only. The app never collects or holds money — it just makes splitting a friendly bet easier.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------ Market card ----------------------------- */

function MarketCard({
  match,
  odds,
  slipIds,
  onSelect,
}: {
  match: Match;
  odds: MatchOdds;
  slipIds: Set<string>;
  onSelect: (marketKey: MarketKey, sel: OddsSelection) => void;
}) {
  const home = getTeam(match.homeTeamId);
  const away = getTeam(match.awayTeamId);

  return (
    <div className="overflow-hidden rounded-3xl border border-white/[0.07] glass">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] p-4">
        <div className="flex items-center gap-2.5">
          <TeamCrest team={home} size="sm" />
          <span className="text-sm font-semibold">{home?.code ?? "TBD"}</span>
          <span className="text-xs text-muted-foreground">vs</span>
          <span className="text-sm font-semibold">{away?.code ?? "TBD"}</span>
          <TeamCrest team={away} size="sm" />
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-[11px] uppercase tracking-wide text-muted-foreground sm:inline">
            {stageLabel(match.stage, match.group)}
          </span>
          <StatusPill match={match} />
        </div>
      </div>

      {/* Markets */}
      <div className="divide-y divide-white/[0.05]">
        {odds.markets.map((market) => (
          <div key={market.key} className="p-4">
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {market.label}
            </p>
            <div
              className="grid gap-2"
              style={{ gridTemplateColumns: `repeat(${Math.min(market.selections.length, 3)}, minmax(0, 1fr))` }}
            >
              {market.selections.map((sel) => {
                const id = `${match.id}:${market.key}:${sel.id}`;
                const selected = slipIds.has(id);
                return (
                  <OddsButton
                    key={id}
                    sel={sel}
                    selected={selected}
                    onClick={() => onSelect(market.key, sel)}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OddsButton({
  sel,
  selected,
  onClick,
}: {
  sel: OddsSelection;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "group relative flex flex-col items-start gap-0.5 rounded-2xl border p-3 text-left transition",
        selected
          ? "border-electric/50 bg-electric/[0.08]"
          : sel.recommended
            ? "border-gold/30 bg-gold/[0.05] hover:border-gold/50"
            : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05]",
      ].join(" ")}
    >
      {sel.recommended && (
        <span className="absolute right-2 top-2 inline-flex items-center gap-0.5 rounded-full bg-gold/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-gold">
          <TrendingUp className="h-2.5 w-2.5" /> Value
        </span>
      )}
      <span className="max-w-full truncate pr-10 text-xs font-medium text-foreground/80">{sel.label}</span>
      <span className="flex items-baseline gap-1.5">
        <span className={`font-display text-base font-bold tabular ${selected ? "text-electric" : sel.recommended ? "text-gold" : ""}`}>
          {sel.decimal.toFixed(2)}
        </span>
        <span className="text-[10px] text-muted-foreground tabular">{decimalToFractional(sel.decimal)}</span>
      </span>
    </button>
  );
}

/* ------------------------------- My bets -------------------------------- */

function MyBets({ hydrated, className }: { hydrated: boolean; className?: string }) {
  const placed = useBetsStore((s) => s.placed);
  const resolveBet = useBetsStore((s) => s.resolveBet);
  const bets = hydrated ? placed : [];

  return (
    <div className={`rounded-3xl border border-white/[0.07] glass p-6 ${className ?? ""}`}>
      <SectionHeader title="Your bets" icon={<Receipt className="h-4 w-4 text-electric" />} />
      {bets.length === 0 ? (
        <EmptyState
          icon={<Receipt className="h-5 w-5" />}
          title="No bets placed yet"
          description="Add selections to your slip and place a friendly play-coin bet to see it tracked here."
        />
      ) : (
        <div className="space-y-2.5">
          {bets.map((bet) => {
            const s = STATUS_STYLE[bet.status];
            return (
              <div key={bet.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    {bet.legs.length === 1 ? "Single" : `${bet.legs.length}-leg acca`}
                    <span className="text-xs font-normal text-muted-foreground tabular">
                      @ {bet.combinedOdds.toFixed(2)}
                    </span>
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${s.cls}`}>{s.label}</span>
                </div>
                <p className="mt-1.5 truncate text-xs text-muted-foreground">
                  {bet.legs.map((l) => l.label).join("  ·  ")}
                </p>
                <div className="mt-2.5 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground tabular">
                    Stake {bet.stake} → <span className="font-semibold text-pitch">{bet.potentialReturn}</span>
                  </span>
                  {bet.status === "open" && (
                    <span className="flex gap-1.5">
                      <button
                        onClick={() => resolveBet(bet.id, "won")}
                        className="rounded-full bg-pitch/15 px-2.5 py-1 font-semibold text-pitch transition hover:bg-pitch/25"
                      >
                        Mark won
                      </button>
                      <button
                        onClick={() => resolveBet(bet.id, "lost")}
                        className="rounded-full bg-white/[0.06] px-2.5 py-1 font-medium text-muted-foreground transition hover:bg-white/10"
                      >
                        Lost
                      </button>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* --------------------------- Play-coin leaders -------------------------- */

function PlayCoinLeaders({ hydrated }: { hydrated: boolean }) {
  const profile = useUserStore((s) => s.profile);
  const balance = useBetsStore((s) => s.balance);

  const board = useMemo(
    () => buildLeaderboard(profile.id, hydrated ? balance + 700 : 0).slice(0, 6),
    [profile.id, balance, hydrated]
  );

  return (
    <div className="rounded-3xl border border-white/[0.07] glass p-6">
      <SectionHeader title="Play-coin leaders" icon={<Trophy className="h-4 w-4 text-gold" />} />
      <div className="space-y-1.5">
        {board.map((e) => (
          <div
            key={e.userId}
            className={`flex items-center gap-3 rounded-2xl border p-2.5 ${
              e.isYou ? "border-electric/30 bg-electric/[0.05]" : "border-white/[0.05]"
            }`}
          >
            <span
              className="grid h-6 w-6 shrink-0 place-items-center rounded-lg text-xs font-bold tabular"
              style={
                e.rank === 1
                  ? { background: hslVar("var(--gold)", 0.16), color: hslVar("var(--gold)") }
                  : { background: "rgba(255,255,255,0.05)", color: "hsl(var(--muted-foreground))" }
              }
            >
              {e.rank === 1 ? <Crown className="h-3.5 w-3.5" /> : e.rank}
            </span>
            <Avatar className="h-7 w-7">
              <AvatarImage src={e.avatar} alt={e.name} />
              <AvatarFallback>{initials(e.name)}</AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {e.name}
              {e.userId === "oracle" && <span className="ml-1 text-[10px] text-accent">AI</span>}
            </span>
            <span className="flex items-center gap-1 text-sm font-semibold tabular text-gold">
              <Coins className="h-3.5 w-3.5" /> {hydrated ? e.points.toLocaleString() : "—"}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <ArrowUpRight className="h-3.5 w-3.5" /> Friendly standings — bragging rights, not cash.
      </p>
    </div>
  );
}

/* ------------------------------ Disclaimer ------------------------------ */

function Disclaimer({ className }: { className?: string }) {
  return (
    <div className={`rounded-3xl border border-white/[0.06] bg-white/[0.02] p-5 text-center ${className ?? ""}`}>
      <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground/80">
        <ShieldCheck className="h-4 w-4 text-pitch" /> Play for fun — not a sportsbook
      </p>
      <p className="mx-auto mt-2 max-w-2xl text-[11px] leading-relaxed text-muted-foreground">
        Football Fever is a friendly-stakes, play-coin experience. Odds and AI recommendations are estimates
        for entertainment and carry no guarantee. The app takes no real money and does not facilitate gambling;
        any settlement between friends is optional and peer-to-peer. 18+ only. If it ever stops being fun,
        take a break and play responsibly.
      </p>
    </div>
  );
}
