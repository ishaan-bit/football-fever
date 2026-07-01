"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { nanoid } from "nanoid";
import type { Match, Prediction, PredictionMarket, RiskLevel } from "@/types";
import { scorePrediction } from "@/lib/predictions/scoring";

interface PredictionsState {
  predictions: Prediction[];
  add: (input: {
    userId: string;
    matchId: string;
    market: PredictionMarket;
    value: string;
    risk: RiskLevel;
  }) => Prediction;
  remove: (id: string) => void;
  settleForMatch: (match: Match) => void;
  byMatch: (matchId: string) => Prediction[];
  pointsTotal: () => number;
  accuracy: () => number;
  streak: () => number;
}

export const usePredictionStore = create<PredictionsState>()(
  persist(
    (set, get) => ({
      predictions: [],
      add: (input) => {
        const existing = get().predictions.find(
          (p) => p.matchId === input.matchId && p.market === input.market && !p.locked
        );
        const prediction: Prediction = {
          id: existing?.id ?? nanoid(8),
          userId: input.userId,
          matchId: input.matchId,
          market: input.market,
          value: input.value,
          risk: input.risk,
          createdAt: new Date().toISOString(),
          locked: false,
          settled: false,
          correct: null,
          points: 0,
        };
        set((s) => ({
          predictions: [
            ...s.predictions.filter((p) => p.id !== prediction.id),
            prediction,
          ],
        }));
        return prediction;
      },
      remove: (id) =>
        set((s) => ({ predictions: s.predictions.filter((p) => p.id !== id) })),
      settleForMatch: (match) => {
        if (match.status !== "finished") return;
        set((s) => ({
          predictions: s.predictions.map((p) => {
            if (p.matchId !== match.id || p.settled) return p;
            const { correct, points } = scorePrediction(p, match);
            return { ...p, settled: true, locked: true, correct, points };
          }),
        }));
      },
      byMatch: (matchId) => get().predictions.filter((p) => p.matchId === matchId),
      pointsTotal: () => get().predictions.reduce((a, p) => a + p.points, 0),
      accuracy: () => {
        const settled = get().predictions.filter((p) => p.settled);
        if (!settled.length) return 0;
        return settled.filter((p) => p.correct).length / settled.length;
      },
      streak: () => {
        const settled = get()
          .predictions.filter((p) => p.settled)
          .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
        let n = 0;
        for (const p of settled) {
          if (p.correct) n++;
          else break;
        }
        return n;
      },
    }),
    { name: "ff-predictions", storage: createJSONStorage(() => localStorage) }
  )
);
