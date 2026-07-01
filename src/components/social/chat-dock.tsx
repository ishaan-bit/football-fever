"use client";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X, Users, Sparkles, Mic, Eye, Circle, Minus } from "lucide-react";
import { useRoom } from "@/hooks/use-room";
import { usePresence } from "@/hooks/use-presence";
import { useUserStore } from "@/stores/user";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { RoomChat } from "@/components/match/room-chat";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { TeamCrest } from "@/components/shared/team-crest";
import { FRIENDS_BY_ID } from "@/lib/data/people";
import { getTeam } from "@/lib/data";
import type { PresenceStatus } from "@/types";
import { cn, initials } from "@/lib/utils";

const LOBBY = "lobby";

const STATUS: Record<PresenceStatus, { label: string; color: string; icon: React.ReactNode }> = {
  watching: { label: "Watching", color: "var(--pitch)", icon: <Eye className="h-3 w-3" /> },
  in_call: { label: "In a call", color: "var(--gold)", icon: <Mic className="h-3 w-3" /> },
  online: { label: "Online", color: "var(--electric)", icon: <Circle className="h-2.5 w-2.5 fill-current" /> },
  away: { label: "Away", color: "var(--muted-foreground)", icon: <Circle className="h-2.5 w-2.5" /> },
  offline: { label: "Offline", color: "var(--muted-foreground)", icon: <Circle className="h-2.5 w-2.5" /> },
};

export function ChatDock() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"chat" | "people">("chat");
  const [seen, setSeen] = useState<number | null>(null);
  const profile = useUserStore((s) => s.profile);
  const presence = usePresence(LOBBY);
  const reduced = useReducedMotion();
  const room = useRoom(LOBBY, { simulate: true });

  // Unread accrual while collapsed.
  useEffect(() => {
    if (seen === null && room.messages.length) setSeen(room.messages.length);
  }, [room.messages.length, seen]);
  useEffect(() => {
    if (open) setSeen(room.messages.length);
  }, [open, room.messages.length]);
  const unread = open || seen === null ? 0 : Math.max(0, room.messages.length - seen);

  const onlineMembers = useMemo(
    () => presence.members.filter((m) => m.userId !== profile.id),
    [presence.members, profile.id]
  );

  return (
    <>
      {/* Launcher */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={reduced ? false : { scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={reduced ? undefined : { scale: 0.8, opacity: 0 }}
            onClick={() => setOpen(true)}
            className="glass-strong fixed bottom-28 right-4 z-30 flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 shadow-elevated transition hover:bg-white/[0.06] lg:bottom-12 lg:right-6"
            aria-label="Open the Lounge chat"
          >
            <span className="flex -space-x-2.5">
              {onlineMembers.slice(0, 3).map((m) => (
                <Avatar key={m.userId} className="h-7 w-7 ring-2 ring-background">
                  <AvatarImage src={m.avatar} alt={m.name} />
                  <AvatarFallback>{initials(m.name)}</AvatarFallback>
                </Avatar>
              ))}
            </span>
            <span className="flex items-center gap-1.5 text-sm font-semibold">
              <span className="live-dot bg-pitch" />
              {presence.online} online
            </span>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-live px-1 text-[10px] font-bold text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="glass-strong fixed z-50 flex flex-col overflow-hidden rounded-3xl shadow-elevated
                       inset-x-3 top-16 bottom-[max(0.75rem,env(safe-area-inset-bottom))]
                       sm:inset-x-auto sm:right-6 sm:bottom-6 sm:top-auto sm:h-[580px] sm:w-[384px] sm:max-h-[calc(100dvh-3rem)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
              <div>
                <p className="flex items-center gap-1.5 font-display text-base font-bold leading-none">
                  <Sparkles className="h-4 w-4 text-accent" /> The Lounge
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="live-dot bg-pitch" /> {presence.online} online · {presence.inCall} in voice
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition hover:bg-white/10 hover:text-foreground" aria-label="Minimise">
                  <Minus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Online avatars rail */}
            <div className="flex items-center gap-2 overflow-x-auto border-b border-white/[0.06] px-4 py-2.5 no-scrollbar">
              {presence.members.map((m) => {
                const meta = STATUS[m.status];
                return (
                  <div key={m.userId} className="flex shrink-0 flex-col items-center gap-1" title={`${m.name} · ${meta.label}`}>
                    <span className="relative">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={m.avatar} alt={m.name} />
                        <AvatarFallback>{initials(m.name)}</AvatarFallback>
                      </Avatar>
                      <span
                        className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-background"
                        style={{ background: `hsl(${meta.color})` }}
                      />
                    </span>
                    <span className="max-w-[3.5rem] truncate text-[10px] text-muted-foreground">
                      {m.userId === profile.id ? "You" : m.name}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-3 pt-2">
              <DockTab active={tab === "chat"} onClick={() => setTab("chat")} icon={<MessageCircle className="h-3.5 w-3.5" />} label="Chat" />
              <DockTab active={tab === "people"} onClick={() => setTab("people")} icon={<Users className="h-3.5 w-3.5" />} label={`People · ${presence.online}`} />
            </div>

            {/* Body */}
            <div className="min-h-0 flex-1 p-3">
              {tab === "chat" ? (
                <RoomChat
                  messages={room.messages}
                  pinnedIds={room.pinnedIds}
                  typingNames={room.typingNames}
                  profileId={profile.id}
                  onSend={(b, k, e) => room.send(b, k, e)}
                  onReact={room.react}
                  onPin={room.pin}
                  onTyping={room.broadcastTyping}
                />
              ) : (
                <div className="h-full space-y-1.5 overflow-y-auto no-scrollbar">
                  {presence.members.map((m) => {
                    const meta = STATUS[m.status];
                    const fav = m.userId === profile.id ? profile.favoriteTeamId : FRIENDS_BY_ID[m.userId]?.favoriteTeamId;
                    const team = getTeam(fav);
                    return (
                      <div key={m.userId} className="flex items-center gap-3 rounded-2xl border border-white/[0.05] p-2.5">
                        <span className="relative">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={m.avatar} alt={m.name} />
                            <AvatarFallback>{initials(m.name)}</AvatarFallback>
                          </Avatar>
                          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-background" style={{ background: `hsl(${meta.color})` }} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{m.userId === profile.id ? "You" : m.name}</p>
                          <p className="flex items-center gap-1 text-[11px]" style={{ color: `hsl(${meta.color})` }}>
                            {meta.icon} {meta.label}
                          </p>
                        </div>
                        {team && <TeamCrest team={team} size="xs" />}
                      </div>
                    );
                  })}
                  <p className="px-2 pt-2 text-center text-[11px] text-muted-foreground">
                    Everyone here can chat in the Lounge. Hop into a Match Room to watch together.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function DockTab({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition",
        active ? "bg-white/[0.08] text-foreground ring-1 ring-white/10" : "text-muted-foreground hover:bg-white/[0.04]"
      )}
    >
      {icon} {label}
    </button>
  );
}
