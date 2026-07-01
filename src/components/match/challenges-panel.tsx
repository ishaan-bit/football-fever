"use client";
import { useMemo, useState } from "react";
import { Plus, Coffee, Pizza, Crown, Swords, IndianRupee, Check, ExternalLink } from "lucide-react";
import type { Match, ChallengeKind, FriendlyChallenge } from "@/types";
import { useSocialStore } from "@/stores/social";
import { useUserStore } from "@/stores/user";
import { useHydrated } from "@/hooks/use-hydrated";
import { FRIENDS_BY_ID, ORACLE_PROFILE } from "@/lib/data/people";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { cn, formatCurrencyINR } from "@/lib/utils";
import { toast } from "@/components/ui/sonner";

const KINDS: { kind: ChallengeKind; label: string; icon: React.ReactNode; stake: string; amount?: number }[] = [
  { kind: "coffee", label: "Coffee run", icon: <Coffee className="h-4 w-4" />, stake: "1 cold brew ☕️", amount: 250 },
  { kind: "pizza", label: "Pizza", icon: <Pizza className="h-4 w-4" />, stake: "1 large pizza 🍕", amount: 600 },
  { kind: "bragging", label: "Bragging rights", icon: <Crown className="h-4 w-4" />, stake: "Eternal glory 👑" },
  { kind: "dare", label: "Custom dare", icon: <Swords className="h-4 w-4" />, stake: "Loser's choice" },
];

function upiLink(payee: string, name: string, amount: number, note: string) {
  const params = new URLSearchParams({ pa: payee, pn: name, cu: "INR", tn: note });
  if (amount > 0) params.set("am", String(amount));
  return `upi://pay?${params.toString()}`;
}

export function ChallengesPanel({ match }: { match: Match }) {
  const hydrated = useHydrated();
  // Select the raw array (stable reference) and derive locally. Returning a new
  // array straight from the selector breaks zustand v5's Object.is snapshot
  // check and triggers an infinite render loop ("getSnapshot should be cached").
  const allChallenges = useSocialStore((s) => s.challenges);
  const challenges = useMemo(
    () => allChallenges.filter((c) => c.matchId === match.id),
    [allChallenges, match.id]
  );
  const addChallenge = useSocialStore((s) => s.addChallenge);
  const markSettled = useSocialStore((s) => s.markChallengeSettled);
  const profile = useUserStore((s) => s.profile);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<ChallengeKind>("coffee");
  const [title, setTitle] = useState("");

  const create = () => {
    const meta = KINDS.find((k) => k.kind === picked)!;
    addChallenge({
      matchId: match.id,
      kind: picked,
      title: title.trim() || `${meta.label} — closest scoreline wins`,
      stake: meta.stake,
      amount: meta.amount,
      createdBy: profile.id,
      participants: [profile.id],
      settlement: meta.amount ? { method: "upi", settled: false } : undefined,
    });
    toast.success("Challenge created", { description: "Friends can now jump in." });
    setOpen(false);
    setTitle("");
  };

  const settle = (c: FriendlyChallenge) => {
    if (!c.amount) {
      markSettled(c.id);
      toast.success("Marked settled 🤝");
      return;
    }
    const payee = profile.upiId || "friend@upi";
    const link = upiLink(payee, profile.name, c.amount, c.title.slice(0, 40));
    window.location.href = link;
    setTimeout(() => markSettled(c.id), 800);
    toast.message("Opening your UPI app…", { description: profile.upiId ? `Paying ${formatCurrencyINR(c.amount)}` : "Set your UPI ID in profile for one-tap settle." });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Lightweight bets between friends. Keep it fun.</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline"><Plus className="h-4 w-4" /> New</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a friendly challenge</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-2">
              {KINDS.map((k) => (
                <button
                  key={k.kind}
                  onClick={() => setPicked(k.kind)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border p-3 text-left text-sm transition",
                    picked === k.kind ? "border-electric/50 bg-electric/10" : "border-white/[0.07] hover:bg-white/[0.04]"
                  )}
                >
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/[0.06]">{k.icon}</span>
                  <span>
                    <span className="block font-medium">{k.label}</span>
                    <span className="block text-[11px] text-muted-foreground">{k.stake}</span>
                  </span>
                </button>
              ))}
            </div>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a twist (optional)" />
            <DialogFooter>
              <Button onClick={create} className="w-full">Create challenge</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {!hydrated ? (
        <div className="h-20 shimmer rounded-2xl" />
      ) : challenges.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-muted-foreground">
          No challenges yet. Start one — loser buys the coffee. ☕️
        </div>
      ) : (
        challenges.map((c) => {
          const settled = c.settlement?.settled || c.status === "settled";
          return (
            <div key={c.id} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{c.title}</p>
                  <p className="text-[11px] text-muted-foreground">{c.stake}{c.amount ? ` · ${formatCurrencyINR(c.amount)}` : ""}</p>
                </div>
                <Badge variant={settled ? "success" : "secondary"}>{settled ? "Settled" : c.status}</Badge>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex -space-x-2">
                  {c.participants.slice(0, 4).map((pid) => {
                    const p = pid === profile.id ? profile : FRIENDS_BY_ID[pid] ?? ORACLE_PROFILE;
                    return <img key={pid} src={p.avatar} alt={p.name} className="h-6 w-6 rounded-full ring-2 ring-background" />;
                  })}
                </div>
                {!settled && (
                  <Button size="sm" variant={c.amount ? "gold" : "outline"} onClick={() => settle(c)}>
                    {c.amount ? <><IndianRupee className="h-3.5 w-3.5" /> Settle via UPI <ExternalLink className="h-3 w-3" /></> : <><Check className="h-3.5 w-3.5" /> Mark settled</>}
                  </Button>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
