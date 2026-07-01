"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Receipt, X, Trash2, Coins, Sparkles, ShieldCheck } from "lucide-react";
import type { BetSlipLeg } from "@/types";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { toast } from "@/components/ui/sonner";
import { useBetsStore } from "@/stores/bets";
import { combinedOdds } from "@/lib/betting/odds";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

const QUICK_STAKES = [50, 100, 250, 500];

export function BetSlip({
  open,
  onOpenChange,
  hydrated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  hydrated: boolean;
}) {
  const reduced = useReducedMotion();
  const slip = useBetsStore((s) => s.slip);
  const balance = useBetsStore((s) => s.balance);
  const removeLeg = useBetsStore((s) => s.removeLeg);
  const clearSlip = useBetsStore((s) => s.clearSlip);
  const placeBet = useBetsStore((s) => s.placeBet);

  const [stake, setStake] = useState(100);

  const legs = hydrated ? slip : [];
  const combined = useMemo(() => (legs.length ? combinedOdds(legs) : 0), [legs]);
  const potential = Math.round(stake * combined);
  const validStake = stake > 0 && stake <= balance;

  const onPlace = () => {
    if (!legs.length) return;
    if (!validStake) {
      toast.error("Not enough play-coins", {
        description: "Lower your stake or top up your balance.",
      });
      return;
    }
    const bet = placeBet(stake);
    if (bet) {
      toast.success("Bet placed — for fun!", {
        description: `${stake} coins on ${bet.legs.length} leg${bet.legs.length > 1 ? "s" : ""} @ ${bet.combinedOdds.toFixed(2)} · returns ${bet.potentialReturn}`,
      });
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-md">
        <SheetHeader className="border-b border-white/[0.06]">
          <SheetTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-electric" /> Your slip
            {legs.length > 0 && <Badge variant="electric">{legs.length}</Badge>}
          </SheetTitle>
          <SheetDescription>
            Play-coin accumulator — every selection multiplies the odds. No real money.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-5">
          {legs.length === 0 ? (
            <EmptyState
              icon={<Sparkles className="h-5 w-5" />}
              title="Slip's empty"
              description="Add a value pick or tap any odds to build your accumulator. One selection per match."
            />
          ) : (
            <div className="space-y-2.5">
              <AnimatePresence initial={false}>
                {legs.map((leg) => (
                  <SlipLegRow key={leg.id} leg={leg} reduced={reduced} onRemove={() => removeLeg(leg.id)} />
                ))}
              </AnimatePresence>
              <button
                onClick={clearSlip}
                className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-live"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear all
              </button>
            </div>
          )}
        </div>

        {legs.length > 0 && (
          <div className="space-y-4 border-t border-white/[0.06] p-5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Combined odds</span>
              <span className="font-display text-lg font-bold tabular text-electric">
                {combined.toFixed(2)}
              </span>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label htmlFor="stake">Stake (coins)</Label>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Coins className="h-3.5 w-3.5 text-gold" /> {hydrated ? balance : "—"} available
                </span>
              </div>
              <Input
                id="stake"
                type="number"
                min={1}
                max={balance}
                value={stake}
                onChange={(e) => setStake(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                className={cn("tabular", !validStake && "border-live/50 focus-visible:ring-live/30")}
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {QUICK_STAKES.map((q) => (
                  <button
                    key={q}
                    onClick={() => setStake(q)}
                    disabled={q > balance}
                    className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium tabular transition hover:bg-white/[0.07] disabled:opacity-40"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-pitch/20 bg-pitch/[0.05] p-3.5">
              <span className="text-sm text-muted-foreground">Potential return</span>
              <span className="font-display text-xl font-bold tabular text-pitch">{potential}</span>
            </div>

            <Button variant="electric" size="lg" className="w-full" onClick={onPlace} disabled={!validStake}>
              Place bet · {stake} coins
            </Button>
            <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-pitch" /> Play for fun — no real money is taken by the app.
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function SlipLegRow({
  leg,
  reduced,
  onRemove,
}: {
  leg: BetSlipLeg;
  reduced: boolean;
  onRemove: () => void;
}) {
  return (
    <motion.div
      layout={!reduced}
      initial={reduced ? false : { opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, x: 16 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{leg.label}</p>
        <p className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
          {leg.marketKey.replace(/_/g, " ")}
        </p>
      </div>
      <span className="font-display text-sm font-bold tabular text-electric">{leg.decimal.toFixed(2)}</span>
      <button
        onClick={onRemove}
        aria-label="Remove selection"
        className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-live/15 hover:text-live"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
}
