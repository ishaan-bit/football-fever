"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { nanoid } from "nanoid";
import type { UserProfile } from "@/types";
import { avatarFor } from "@/lib/data/people";

const GUEST: UserProfile = {
  id: "you",
  name: "You",
  handle: "@you",
  avatar: avatarFor("you-guest"),
  isGuest: true,
  joinedAt: "2026-06-11T00:00:00Z",
  vibe: "New to the room",
};

interface UserState {
  profile: UserProfile;
  onboarded: boolean;
  /** Whether the first-time guided tour has been seen/dismissed. */
  tourDone: boolean;
  setName: (name: string) => void;
  setHandle: (handle: string) => void;
  setFavoriteTeam: (teamId: string) => void;
  setUpiId: (upi: string) => void;
  setVibe: (vibe: string) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  /** Mark the guided tour finished (or dismissed). */
  completeTour: () => void;
  /** Re-arm the guided tour so it runs again (menu "Replay tour"). */
  startTour: () => void;
  /** Assign a stable guest id on first client mount. */
  ensureIdentity: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      profile: GUEST,
      onboarded: false,
      tourDone: false,
      setName: (name) =>
        set((s) => ({
          profile: { ...s.profile, name, avatar: avatarFor(name + s.profile.id) },
        })),
      setHandle: (handle) => set((s) => ({ profile: { ...s.profile, handle } })),
      setFavoriteTeam: (favoriteTeamId) =>
        set((s) => ({ profile: { ...s.profile, favoriteTeamId } })),
      setUpiId: (upiId) => set((s) => ({ profile: { ...s.profile, upiId } })),
      setVibe: (vibe) => set((s) => ({ profile: { ...s.profile, vibe } })),
      completeOnboarding: () => set({ onboarded: true }),
      resetOnboarding: () => set({ onboarded: false }),
      completeTour: () => set({ tourDone: true }),
      startTour: () => set({ tourDone: false }),
      ensureIdentity: () => {
        const { profile } = get();
        if (profile.id === "you") {
          set({ profile: { ...profile, id: `you-${nanoid(6)}` } });
        }
      },
    }),
    {
      name: "ff-user",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
