"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/** How many players make up "your" squad for the party games. */
export const SQUAD_SIZE = 5;

interface SquadState {
  teamId: string | null;
  /** Chosen player ids, max SQUAD_SIZE. */
  picks: string[];
  /** Pick a nation. Switching nation clears the player picks. */
  setTeam: (teamId: string) => void;
  /** Add/remove a player, capped at SQUAD_SIZE. */
  togglePick: (playerId: string) => void;
  /** Wipe the whole selection. */
  reset: () => void;
  /** Keep the team, clear just the players (re-draft). */
  clearPicks: () => void;
}

export const useSquadStore = create<SquadState>()(
  persist(
    (set) => ({
      teamId: null,
      picks: [],
      setTeam: (teamId) =>
        set((s) => (s.teamId === teamId ? s : { teamId, picks: [] })),
      togglePick: (playerId) =>
        set((s) => {
          if (s.picks.includes(playerId)) {
            return { picks: s.picks.filter((id) => id !== playerId) };
          }
          if (s.picks.length >= SQUAD_SIZE) return s;
          return { picks: [...s.picks, playerId] };
        }),
      reset: () => set({ teamId: null, picks: [] }),
      clearPicks: () => set({ picks: [] }),
    }),
    {
      name: "ff-squad",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
