"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { nanoid } from "nanoid";
import type { AppNotification, NotificationKind } from "@/types";

const seed = (): AppNotification[] => {
  const now = Date.now();
  const at = (m: number) => new Date(now - m * 60000).toISOString();
  return [
    { id: "n1", kind: "oracle", title: "The Oracle has spoken", body: "Fresh predictions are live for tonight's Round of 32 ties.", read: false, createdAt: at(8), accent: "var(--brand-violet)", href: "/oracle" },
    { id: "n2", kind: "friend_joined", title: "Meera joined the room", body: "She's already calling a 2–1. Bold.", read: false, createdAt: at(22), accent: "var(--electric)", href: "/" },
    { id: "n3", kind: "prediction_closing", title: "Predictions closing soon", body: "Lock your picks before kickoff — 15 minutes to go.", read: false, createdAt: at(40), accent: "var(--gold)", href: "/predictions" },
    { id: "n4", kind: "recap", title: "Your daily recap is ready", body: "3 matches, 1 upset, and one very wrong prediction (not yours).", read: true, createdAt: at(180), accent: "var(--pitch)", href: "/" },
  ];
};

interface NotificationsState {
  items: AppNotification[];
  push: (n: Omit<AppNotification, "id" | "read" | "createdAt"> & { id?: string }) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clear: () => void;
  unread: () => number;
}

export const useNotificationStore = create<NotificationsState>()(
  persist(
    (set, get) => ({
      items: seed(),
      push: (n) =>
        set((s) => ({
          items: [
            { id: n.id ?? nanoid(8), read: false, createdAt: new Date().toISOString(), ...n },
            ...s.items,
          ].slice(0, 50),
        })),
      markRead: (id) =>
        set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, read: true } : i)) })),
      markAllRead: () => set((s) => ({ items: s.items.map((i) => ({ ...i, read: true })) })),
      clear: () => set({ items: [] }),
      unread: () => get().items.filter((i) => !i.read).length,
    }),
    {
      name: "ff-notifications",
      storage: createJSONStorage(() => localStorage),
      // Always refresh the seed set on load; only persist user-dismissed state.
      partialize: (s) => ({ items: s.items.filter((i) => !i.id.startsWith("n")) }),
      merge: (persisted, current) => {
        const p = (persisted as Partial<NotificationsState>) ?? {};
        return { ...current, items: [...(p.items ?? []), ...current.items] };
      },
    }
  )
);

export const NOTIFICATION_ICON: Record<NotificationKind, string> = {
  kickoff: "PlayCircle",
  goal: "Goal",
  var: "ScanSearch",
  halftime: "Coffee",
  fulltime: "Flag",
  friend_joined: "UserPlus",
  prediction_closing: "Timer",
  minigame: "Gamepad2",
  challenge: "Swords",
  oracle: "Sparkles",
  recap: "Newspaper",
  badge: "Award",
};
