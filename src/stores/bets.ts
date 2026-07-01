"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { nanoid } from "nanoid";
import type { BetSlipLeg, PlacedBet } from "@/types";
import { combinedOdds } from "@/lib/betting/odds";

export const STARTING_BALANCE = 1000;

interface BetsState {
  /** Play-coins. This is a friendly-stakes ledger, never real currency. */
  balance: number;
  upiId?: string;
  ageConfirmed: boolean;
  slip: BetSlipLeg[];
  placed: PlacedBet[];
  addLeg: (leg: BetSlipLeg) => void;
  removeLeg: (id: string) => void;
  clearSlip: () => void;
  placeBet: (stake: number) => PlacedBet | null;
  resolveBet: (id: string, status: PlacedBet["status"]) => void;
  setUpi: (upi: string) => void;
  confirmAge: () => void;
  topUp: () => void;
}

export const useBetsStore = create<BetsState>()(
  persist(
    (set, get) => ({
      balance: STARTING_BALANCE,
      ageConfirmed: false,
      slip: [],
      placed: [],
      addLeg: (leg) =>
        set((s) => {
          // one selection per match in an accumulator
          const slip = s.slip.filter((l) => l.matchId !== leg.matchId);
          return { slip: [...slip, leg] };
        }),
      removeLeg: (id) => set((s) => ({ slip: s.slip.filter((l) => l.id !== id) })),
      clearSlip: () => set({ slip: [] }),
      placeBet: (stake) => {
        const { slip, balance } = get();
        if (!slip.length || stake <= 0 || stake > balance) return null;
        const odds = combinedOdds(slip);
        const bet: PlacedBet = {
          id: nanoid(8),
          legs: slip,
          stake,
          combinedOdds: odds,
          potentialReturn: Math.round(stake * odds),
          placedAt: new Date().toISOString(),
          status: "open",
        };
        set((s) => ({
          placed: [bet, ...s.placed],
          slip: [],
          balance: s.balance - stake,
        }));
        return bet;
      },
      resolveBet: (id, status) =>
        set((s) => {
          const bet = s.placed.find((b) => b.id === id);
          if (!bet || bet.status !== "open") return {};
          const credit =
            status === "won" ? bet.potentialReturn : status === "void" ? bet.stake : 0;
          return {
            balance: s.balance + credit,
            placed: s.placed.map((b) => (b.id === id ? { ...b, status } : b)),
          };
        }),
      setUpi: (upiId) => set({ upiId }),
      confirmAge: () => set({ ageConfirmed: true }),
      topUp: () => set((s) => ({ balance: s.balance + 500 })),
    }),
    { name: "ff-bets", storage: createJSONStorage(() => localStorage) }
  )
);
