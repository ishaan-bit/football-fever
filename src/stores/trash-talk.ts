"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { nanoid } from "nanoid";
import type { TrashTalkBurn } from "@/types";

interface TrashTalkState {
  burns: TrashTalkBurn[];
  seeded: boolean;
  firedCount: number;
  micDrops: number;
  /** Seed the arena once with evergreen flavour burns. */
  ensureSeed: (seed: TrashTalkBurn[]) => void;
  fire: (
    burn: Omit<TrashTalkBurn, "id" | "createdAt" | "reactions">
  ) => TrashTalkBurn;
  react: (id: string, emoji: string) => void;
  clear: (seed: TrashTalkBurn[]) => void;
}

const CAP = 60;

export const useTrashTalkStore = create<TrashTalkState>()(
  persist(
    (set, get) => ({
      burns: [],
      seeded: false,
      firedCount: 0,
      micDrops: 0,
      ensureSeed: (seed) => {
        if (get().seeded) return;
        set({ burns: seed, seeded: true });
      },
      fire: (input) => {
        const burn: TrashTalkBurn = {
          id: nanoid(10),
          createdAt: new Date().toISOString(),
          reactions: {},
          ...input,
        };
        set((s) => ({
          burns: [burn, ...s.burns].slice(0, CAP),
          firedCount: s.firedCount + 1,
          micDrops: s.micDrops + (burn.micDrop ? 1 : 0),
        }));
        return burn;
      },
      react: (id, emoji) =>
        set((s) => ({
          burns: s.burns.map((b) =>
            b.id === id
              ? {
                  ...b,
                  reactions: {
                    ...b.reactions,
                    [emoji]: (b.reactions[emoji] ?? 0) + 1,
                  },
                }
              : b
          ),
        })),
      clear: (seed) =>
        set({ burns: seed, seeded: true, firedCount: 0, micDrops: 0 }),
    }),
    {
      name: "ff-trash-talk",
      storage: createJSONStorage(() => localStorage),
      // Only persist the feed + tallies; never the seed flag-less defaults.
      partialize: (s) => ({
        burns: s.burns,
        seeded: s.seeded,
        firedCount: s.firedCount,
        micDrops: s.micDrops,
      }),
    }
  )
);
