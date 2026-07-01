"use client";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, Users, Sparkles, Mic, Eye, Circle, Minus } from "lucide-react";
import { useRoom } from "@/hooks/use-room";
import { usePresence } from "@/hooks/use-presence";
import { useUserStore } from "@/stores/user";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useSound } from "@/hooks/use-sound";
import { useHaptics } from "@/hooks/use-haptics";
import { RoomChat } from "@/components/match/room-chat";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { TeamCrest } from "@/components/shared/team-crest";
import { FRIENDS_BY_ID } from "@/lib/data/people";
import { getTeam } from "@/lib/data";
import type { PresenceStatus } from "@/types";
import { cn, initials, hslVar } from "@/lib/utils";

const LOBBY = "lobby";

const SPRING = { type: "spring", stiffness: 340, damping: 30 } as const;
const POP = { type: "spring", stiffness: 500, damping: 24 } as const;

const STATUS: Record<PresenceStatus, { label: string; color: string; icon: React.ReactNode }> = {
  watching: { label: "Watching", color: "var(--pitch)", icon: <Eye className="h-3 w-3" /> },
  in_call: { label: "In a call", color: "var(--gold)", icon: <Mic className="h-3 w-3" /> },
  online: { label: "Online", color: "var(--electric)", icon: <Circle className="h-2.5 w-2.5 fill-current" /> },
  away: { label: "Away", color: "var(--muted-foreground)", icon: <Circle className="h-2.5 w-2.5" /> },
  offline: { label: "Offline", color: "var(--muted-foreground)", icon: <Circle className="h-2.5 w-2.5" /> },
};

/** Presence dot with a soft pulse ring for live statuses. */
function StatusDot({ color, reduced, live }: { color: string; reduced: boolean; live?: boolean }) {
  return (
    <span className="absolute -bottom-0.5 -right-0.5 grid h-3 w-3 place-items-center">
      {!reduced && live && (
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{ background: hslVar(color) }}
          initial={{ opacity: 0.5, scale: 1 }}
          animate={{ opacity: 0, scale: 2.1 }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
        />
      )}
      <span className="relative h-3 w-3 rounded-full ring-2 ring-background" style={{ background: hslVar(color) }} />
    </span>
  );
}

/** A count that pops when its value changes. */
function LiveCount({ value, reduced }: { value: number; reduced: boolean }) {
  return (
    <span className="relative inline-grid tabular-nums">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={reduced ? false : { y: 8, opacity: 0, scale: 0.7 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={reduced ? { opacity: 0 } : { y: -8, opacity: 0, scale: 0.7 }}
          transition={POP}
          className="col-start-1 row-start-1"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function ChatDock() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"chat" | "people">("chat");
  const [seen, setSeen] = useState<number | null>(null);
  const profile = useUserStore((s) => s.profile);
  const presence = usePresence(LOBBY);
  const reduced = useReducedMotion();
  const { play } = useSound();
  const { buzz } = useHaptics();
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

  const openDock = () => {
    setOpen(true);
    play("swoosh");
    buzz("select");
  };
  const closeDock = () => {
    setOpen(false);
    play("click");
    buzz("tap");
  };
  const selectTab = (next: "chat" | "people") => {
    if (next === tab) return;
    setTab(next);
    play("pop");
    buzz("tap");
  };

  const isLive = (s: PresenceStatus) => s === "watching" || s === "in_call" || s === "online";

  return (
    <>
      {/* Launcher */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={reduced ? false : { scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={reduced ? undefined : { scale: 0.8, opacity: 0 }}
            transition={POP}
            whileHover={reduced ? undefined : { y: -2 }}
            whileTap={reduced ? undefined : { scale: 0.94 }}
            onClick={openDock}
            className="glass-strong group fixed bottom-28 right-4 z-30 flex items-center gap-2 overflow-hidden rounded-full py-1.5 pl-1.5 pr-3 shadow-elevated transition hover:bg-white/[0.06] lg:bottom-12 lg:right-6"
            aria-label="Open the Lounge chat"
          >
            {/* Aurora sheen */}
            {!reduced && (
              <motion.span
                aria-hidden
                className="pointer-events-none absolute inset-0 -z-10 opacity-60"
                style={{
                  background: `linear-gradient(115deg, transparent 30%, ${hslVar("var(--electric)", 0.14)} 50%, transparent 70%)`,
                }}
                initial={{ x: "-120%" }}
                animate={{ x: "120%" }}
                transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 2 }}
              />
            )}
            <span className="flex -space-x-2.5">
              {onlineMembers.slice(0, 3).map((m, i) => (
                <motion.span
                  key={m.userId}
                  initial={reduced ? false : { scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ ...POP, delay: reduced ? 0 : i * 0.06 }}
                >
                  <Avatar className="h-7 w-7 ring-2 ring-background">
                    <AvatarImage src={m.avatar} alt={m.name} />
                    <AvatarFallback>{initials(m.name)}</AvatarFallback>
                  </Avatar>
                </motion.span>
              ))}
            </span>
            <span className="flex items-center gap-1.5 text-sm font-semibold">
              <span className="live-dot bg-pitch" />
              <LiveCount value={presence.online} reduced={reduced} /> online
            </span>
            <MessageCircle className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
            <AnimatePresence>
              {unread > 0 && (
                <motion.span
                  key={unread}
                  initial={reduced ? { opacity: 0 } : { scale: 0, y: -4 }}
                  animate={reduced ? { opacity: 1 } : { scale: [1.4, 1], y: 0 }}
                  exit={reduced ? { opacity: 0 } : { scale: 0 }}
                  transition={POP}
                  className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-live px-1 text-[10px] font-bold text-white shadow-[0_0_12px_hsl(var(--live)/0.6)]"
                >
                  {unread > 9 ? "9+" : unread}
                </motion.span>
              )}
            </AnimatePresence>
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
            transition={SPRING}
            className="glass-strong fixed z-50 flex flex-col overflow-hidden rounded-3xl shadow-elevated
                       inset-x-3 top-16 bottom-[max(0.75rem,env(safe-area-inset-bottom))]
                       sm:inset-x-auto sm:right-6 sm:bottom-6 sm:top-auto sm:h-[580px] sm:w-[384px] sm:max-h-[calc(100dvh-3rem)]"
          >
            {/* Header */}
            <div className="relative flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
              {/* Aurora accent behind the header */}
              {!reduced && (
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 -z-10"
                  style={{
                    background: `radial-gradient(120% 140% at 0% 0%, ${hslVar("var(--accent)", 0.16)}, transparent 55%), radial-gradient(120% 140% at 100% 0%, ${hslVar("var(--electric)", 0.14)}, transparent 55%)`,
                  }}
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
              <div>
                <p className="flex items-center gap-1.5 font-display text-base font-bold leading-none">
                  <motion.span
                    animate={reduced ? undefined : { rotate: [0, 12, -8, 0], scale: [1, 1.12, 1] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", repeatDelay: 2 }}
                  >
                    <Sparkles className="h-4 w-4 text-accent" />
                  </motion.span>{" "}
                  The Lounge
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="live-dot bg-pitch" /> <LiveCount value={presence.online} reduced={reduced} /> online ·{" "}
                  <LiveCount value={presence.inCall} reduced={reduced} /> in voice
                </p>
              </div>
              <div className="flex items-center gap-1">
                <motion.button
                  whileHover={reduced ? undefined : { y: -2 }}
                  whileTap={reduced ? undefined : { scale: 0.9, rotate: 90 }}
                  onClick={closeDock}
                  className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
                  aria-label="Minimise"
                >
                  <Minus className="h-4 w-4" />
                </motion.button>
              </div>
            </div>

            {/* Online avatars rail */}
            <div className="flex items-center gap-2 overflow-x-auto border-b border-white/[0.06] px-4 py-2.5 no-scrollbar">
              {presence.members.map((m, i) => {
                const meta = STATUS[m.status];
                const live = isLive(m.status);
                return (
                  <motion.div
                    key={m.userId}
                    layout
                    initial={reduced ? false : { opacity: 0, y: 8, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ ...SPRING, delay: reduced ? 0 : Math.min(i * 0.04, 0.3) }}
                    whileHover={reduced ? undefined : { y: -3 }}
                    className="flex shrink-0 flex-col items-center gap-1"
                    title={`${m.name} · ${meta.label}`}
                  >
                    <span className="relative">
                      <motion.span
                        className="block"
                        animate={reduced || !live ? undefined : { scale: [1, 1.04, 1] }}
                        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }}
                      >
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={m.avatar} alt={m.name} />
                          <AvatarFallback>{initials(m.name)}</AvatarFallback>
                        </Avatar>
                      </motion.span>
                      <StatusDot color={meta.color} reduced={reduced} live={live} />
                    </span>
                    <span className="max-w-[3.5rem] truncate text-[10px] text-muted-foreground">
                      {m.userId === profile.id ? "You" : m.name}
                    </span>
                  </motion.div>
                );
              })}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-3 pt-2">
              <DockTab active={tab === "chat"} onClick={() => selectTab("chat")} icon={<MessageCircle className="h-3.5 w-3.5" />} label="Chat" reduced={reduced} />
              <DockTab
                active={tab === "people"}
                onClick={() => selectTab("people")}
                icon={<Users className="h-3.5 w-3.5" />}
                label={`People · ${presence.online}`}
                reduced={reduced}
              />
            </div>

            {/* Body */}
            <div className="min-h-0 flex-1 p-3">
              <AnimatePresence mode="wait" initial={false}>
                {tab === "chat" ? (
                  <motion.div
                    key="chat"
                    initial={reduced ? { opacity: 0 } : { opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={reduced ? { opacity: 0 } : { opacity: 0, x: -12 }}
                    transition={SPRING}
                    className="h-full"
                  >
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
                  </motion.div>
                ) : (
                  <motion.div
                    key="people"
                    initial={reduced ? { opacity: 0 } : { opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={reduced ? { opacity: 0 } : { opacity: 0, x: 12 }}
                    transition={SPRING}
                    className="h-full space-y-1.5 overflow-y-auto no-scrollbar"
                  >
                    {presence.members.map((m, i) => {
                      const meta = STATUS[m.status];
                      const live = isLive(m.status);
                      const fav = m.userId === profile.id ? profile.favoriteTeamId : FRIENDS_BY_ID[m.userId]?.favoriteTeamId;
                      const team = getTeam(fav);
                      return (
                        <motion.div
                          key={m.userId}
                          layout
                          initial={reduced ? false : { opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ ...SPRING, delay: reduced ? 0 : Math.min(i * 0.04, 0.3) }}
                          whileHover={reduced ? undefined : { y: -2, transition: POP }}
                          className="flex items-center gap-3 rounded-2xl border border-white/[0.05] p-2.5 transition-colors hover:border-white/10 hover:bg-white/[0.03]"
                        >
                          <span className="relative">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={m.avatar} alt={m.name} />
                              <AvatarFallback>{initials(m.name)}</AvatarFallback>
                            </Avatar>
                            <StatusDot color={meta.color} reduced={reduced} live={live} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{m.userId === profile.id ? "You" : m.name}</p>
                            <p className="flex items-center gap-1 text-[11px]" style={{ color: hslVar(meta.color) }}>
                              {meta.icon} {meta.label}
                            </p>
                          </div>
                          {team && <TeamCrest team={team} size="xs" />}
                        </motion.div>
                      );
                    })}
                    <p className="px-2 pt-2 text-center text-[11px] text-muted-foreground">
                      Everyone here can chat in the Lounge. Hop into a Match Room to watch together.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function DockTab({
  active,
  onClick,
  icon,
  label,
  reduced,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  reduced: boolean;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={reduced ? undefined : { scale: 0.94 }}
      className={cn(
        "relative flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition",
        active ? "text-foreground" : "text-muted-foreground hover:bg-white/[0.04]"
      )}
    >
      {active && (
        <motion.span
          layoutId="dock-tab-pill"
          className="absolute inset-0 -z-10 rounded-full bg-white/[0.08] ring-1 ring-white/10"
          transition={SPRING}
        />
      )}
      {icon} {label}
    </motion.button>
  );
}
