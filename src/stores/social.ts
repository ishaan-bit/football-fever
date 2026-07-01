"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { nanoid } from "nanoid";
import type { ChatMessage, FriendlyChallenge, AiHostMessage } from "@/types";
import { seedMessages, SEED_CHALLENGES } from "@/lib/data/people";

interface SocialState {
  messages: Record<string, ChatMessage[]>;
  seededRooms: Record<string, boolean>;
  pinned: Record<string, string[]>;
  challenges: FriendlyChallenge[];
  ensureRoom: (roomId: string) => void;
  sendMessage: (msg: Omit<ChatMessage, "id" | "createdAt" | "reactions"> & { id?: string }) => ChatMessage;
  addAiMessage: (roomId: string, ai: AiHostMessage) => void;
  addReaction: (roomId: string, messageId: string, emoji: string, userId: string) => void;
  togglePin: (roomId: string, messageId: string) => void;
  addChallenge: (c: Omit<FriendlyChallenge, "id" | "createdAt" | "status"> & { status?: FriendlyChallenge["status"] }) => void;
  settleChallenge: (id: string, winnerId: string) => void;
  markChallengeSettled: (id: string) => void;
}

export const useSocialStore = create<SocialState>()(
  persist(
    (set, get) => ({
      messages: {},
      seededRooms: {},
      pinned: {},
      challenges: SEED_CHALLENGES,
      ensureRoom: (roomId) => {
        if (get().seededRooms[roomId]) return;
        set((s) => ({
          messages: { ...s.messages, [roomId]: seedMessages(roomId) },
          seededRooms: { ...s.seededRooms, [roomId]: true },
        }));
      },
      sendMessage: (input) => {
        const msg: ChatMessage = {
          id: input.id ?? nanoid(10),
          createdAt: new Date().toISOString(),
          reactions: {},
          ...input,
        };
        set((s) => ({
          messages: {
            ...s.messages,
            [msg.roomId]: [...(s.messages[msg.roomId] ?? []), msg].slice(-200),
          },
        }));
        return msg;
      },
      addAiMessage: (roomId, ai) => {
        const msg: ChatMessage = {
          id: ai.id,
          roomId,
          userId: "oracle",
          authorName: "The Oracle",
          authorAvatar: "https://api.dicebear.com/9.x/thumbs/svg?seed=the-oracle-fc&radius=50&backgroundType=gradientLinear",
          kind: "ai",
          body: ai.text,
          reactions: {},
          createdAt: ai.createdAt,
        };
        set((s) => {
          const existing = s.messages[roomId] ?? [];
          if (existing.some((m) => m.id === msg.id)) return {};
          return { messages: { ...s.messages, [roomId]: [...existing, msg].slice(-200) } };
        });
      },
      addReaction: (roomId, messageId, emoji, userId) =>
        set((s) => ({
          messages: {
            ...s.messages,
            [roomId]: (s.messages[roomId] ?? []).map((m) => {
              if (m.id !== messageId) return m;
              const users = new Set(m.reactions[emoji] ?? []);
              if (users.has(userId)) users.delete(userId);
              else users.add(userId);
              const reactions = { ...m.reactions, [emoji]: [...users] };
              if (!reactions[emoji]!.length) delete reactions[emoji];
              return { ...m, reactions };
            }),
          },
        })),
      togglePin: (roomId, messageId) =>
        set((s) => {
          const cur = s.pinned[roomId] ?? [];
          const next = cur.includes(messageId)
            ? cur.filter((x) => x !== messageId)
            : [...cur, messageId];
          return { pinned: { ...s.pinned, [roomId]: next } };
        }),
      addChallenge: (c) =>
        set((s) => ({
          challenges: [
            { id: nanoid(8), createdAt: new Date().toISOString(), status: c.status ?? "open", ...c },
            ...s.challenges,
          ],
        })),
      settleChallenge: (id, winnerId) =>
        set((s) => ({
          challenges: s.challenges.map((c) =>
            c.id === id ? { ...c, status: "settled", winnerId } : c
          ),
        })),
      markChallengeSettled: (id) =>
        set((s) => ({
          challenges: s.challenges.map((c) =>
            c.id === id
              ? { ...c, settlement: { ...(c.settlement ?? { method: "upi" }), settled: true } }
              : c
          ),
        })),
    }),
    {
      name: "ff-social",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ challenges: s.challenges, pinned: s.pinned }),
    }
  )
);
