"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type Theme = "dark" | "light";

interface UiState {
  theme: Theme;
  sound: boolean;
  reducedMotionOverride: boolean | null;
  paletteOpen: boolean;
  hostOpen: boolean;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  toggleSound: () => void;
  setReducedMotion: (v: boolean | null) => void;
  setPaletteOpen: (v: boolean) => void;
  toggleHost: () => void;
  setHostOpen: (v: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: "dark",
      sound: false,
      reducedMotionOverride: null,
      paletteOpen: false,
      hostOpen: false,
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
      toggleSound: () => set((s) => ({ sound: !s.sound })),
      setReducedMotion: (reducedMotionOverride) => set({ reducedMotionOverride }),
      setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
      toggleHost: () => set((s) => ({ hostOpen: !s.hostOpen })),
      setHostOpen: (hostOpen) => set({ hostOpen }),
    }),
    {
      name: "ff-ui",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        theme: s.theme,
        sound: s.sound,
        reducedMotionOverride: s.reducedMotionOverride,
      }),
    }
  )
);
