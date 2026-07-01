"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Send, Smile, ImageIcon, Mic, Pin, SmilePlus, Sparkles, Square, Play } from "lucide-react";
import type { ChatMessage } from "@/types";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { SmartImage } from "@/components/shared/smart-image";
import { Button } from "@/components/ui/button";
import { REACTIONS, GIF_CATEGORIES } from "@/lib/constants";
import { cn, initials, formatInTz, hslVar } from "@/lib/utils";
import { useSound } from "@/hooks/use-sound";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useHaptics } from "@/hooks/use-haptics";

const GIFS = [
  "https://media.giphy.com/media/3o7TKqnN349PBUtGFO/giphy.gif",
  "https://media.giphy.com/media/l0MYGb1LuZ3n7dRnO/giphy.gif",
  "https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif",
  "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif",
  "https://media.giphy.com/media/l46Cy1rHbQ92uuLXa/giphy.gif",
  "https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif",
];

const SPRING = { type: "spring" as const, stiffness: 340, damping: 30 };
const POP = { type: "spring" as const, stiffness: 500, damping: 24 };

interface RoomChatProps {
  messages: ChatMessage[];
  pinnedIds: string[];
  typingNames: string[];
  profileId: string;
  onSend: (body: string, kind?: ChatMessage["kind"], extra?: Partial<ChatMessage>) => void;
  onReact: (messageId: string, emoji: string) => void;
  onPin: (messageId: string) => void;
  onTyping?: () => void;
}

export function RoomChat({
  messages, pinnedIds, typingNames, profileId, onSend, onReact, onPin, onTyping,
}: RoomChatProps) {
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGifs, setShowGifs] = useState(false);
  const [recording, setRecording] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { play } = useSound();
  const reduced = useReducedMotion();
  const { buzz } = useHaptics();

  const pinned = useMemo(
    () => messages.filter((m) => pinnedIds.includes(m.id)),
    [messages, pinnedIds]
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const submit = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    play("swoosh");
    buzz("success");
    setText("");
    setShowEmoji(false);
  };

  const sendVoice = () => {
    setRecording(true);
    buzz("select");
    setTimeout(() => {
      setRecording(false);
      onSend("Voice note", "voice", { duration: 3 + Math.floor(Math.random() * 12) });
      play("pop");
      buzz("success");
    }, 1400);
  };

  return (
    <div className="flex h-full flex-col">
      <AnimatePresence initial={false}>
        {pinned.length > 0 && (
          <motion.div
            layout
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={SPRING}
            className="mb-2 space-y-1 overflow-hidden"
          >
            {pinned.map((m, i) => (
              <motion.div
                key={m.id}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ ...SPRING, delay: reduced ? 0 : i * 0.04 }}
                className="relative flex items-center gap-2 overflow-hidden rounded-xl border border-gold/20 bg-gold/[0.06] px-3 py-1.5 text-xs"
              >
                {!reduced && (
                  <motion.span
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-20deg]"
                    style={{ background: `linear-gradient(90deg, transparent, ${hslVar("var(--gold)", 0.14)}, transparent)` }}
                    animate={{ left: ["-33%", "133%"] }}
                    transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut", repeatDelay: 2.4 }}
                  />
                )}
                <motion.span
                  animate={reduced ? undefined : { rotate: [0, -12, 10, 0] }}
                  transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}
                >
                  <Pin className="h-3 w-3 shrink-0 text-gold" />
                </motion.span>
                <span className="truncate"><b>{m.authorName}:</b> {m.body}</span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto pr-1 no-scrollbar">
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <Bubble
              key={m.id}
              message={m}
              own={m.userId === profileId}
              pinned={pinnedIds.includes(m.id)}
              onReact={onReact}
              onPin={onPin}
              reduced={reduced}
            />
          ))}
        </AnimatePresence>
        <AnimatePresence>
          {typingNames.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={SPRING}
              className="flex items-center gap-2 px-2 text-xs text-muted-foreground"
            >
              <span className="flex items-end gap-1" aria-hidden>
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-electric/70"
                    animate={reduced ? undefined : { y: [0, -4, 0], opacity: [0.45, 1, 0.45] }}
                    transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }}
                  />
                ))}
              </span>
              <span>
                {typingNames.join(", ")} {typingNames.length > 1 ? "are" : "is"} typing…
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Composer */}
      <div className="mt-3 space-y-2">
        <AnimatePresence>
          {showEmoji && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={SPRING}
              className="flex flex-wrap gap-1 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-2"
            >
              {REACTIONS.map((e, i) => (
                <motion.button
                  key={e}
                  initial={{ opacity: 0, scale: 0.4 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ ...POP, delay: reduced ? 0 : i * 0.02 }}
                  whileHover={{ y: -2, scale: 1.12 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { setText((t) => t + e); play("click"); buzz("tap"); }}
                  className="grid h-8 w-8 place-items-center rounded-lg text-lg hover:bg-white/10"
                >
                  {e}
                </motion.button>
              ))}
            </motion.div>
          )}
          {showGifs && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={SPRING}
              className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-2"
            >
              <div className="mb-2 flex flex-wrap gap-1">
                {GIF_CATEGORIES.slice(0, 5).map((c, i) => (
                  <motion.span
                    key={c}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...SPRING, delay: reduced ? 0 : i * 0.03 }}
                    className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-muted-foreground"
                  >
                    {c}
                  </motion.span>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {GIFS.map((g, i) => (
                  <motion.button
                    key={g}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ ...POP, delay: reduced ? 0 : i * 0.03 }}
                    whileHover={{ y: -2, scale: 1.03 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { onSend("", "gif", { mediaUrl: g }); setShowGifs(false); play("swoosh"); buzz("success"); }}
                    className="aspect-video overflow-hidden rounded-lg border border-white/10"
                  >
                    <SmartImage src={g} alt="gif" className="h-full w-full object-cover" />
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          animate={
            recording && !reduced
              ? { boxShadow: [`0 0 0 0 ${hslVar("var(--live)", 0.5)}`, `0 0 0 6px ${hslVar("var(--live)", 0)}`] }
              : { boxShadow: `0 0 0 0 ${hslVar("var(--live)", 0)}` }
          }
          transition={recording ? { duration: 1.1, repeat: Infinity, ease: "easeOut" } : { duration: 0.2 }}
          className={cn(
            "flex items-center gap-1.5 rounded-2xl border bg-white/[0.03] p-1.5 transition-colors",
            recording ? "border-live/40" : "border-white/10"
          )}
        >
          <Button variant="ghost" size="icon-sm" className="transition-transform active:scale-90" onClick={() => { setShowEmoji((v) => !v); setShowGifs(false); play("click"); buzz("tap"); }} aria-label="Emoji">
            <Smile className={cn("h-4 w-4 transition-colors", showEmoji && "text-gold")} />
          </Button>
          <Button variant="ghost" size="icon-sm" className="transition-transform active:scale-90" onClick={() => { setShowGifs((v) => !v); setShowEmoji(false); play("click"); buzz("tap"); }} aria-label="GIF">
            <ImageIcon className={cn("h-4 w-4 transition-colors", showGifs && "text-accent")} />
          </Button>
          <input
            value={text}
            onChange={(e) => { setText(e.target.value); onTyping?.(); }}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder={recording ? "Recording…" : "Say something…"}
            className="min-w-0 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground/70"
          />
          <AnimatePresence mode="popLayout" initial={false}>
            {text.trim() ? (
              <motion.div
                key="send"
                initial={{ opacity: 0, scale: 0.6, rotate: -30 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={POP}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.9 }}
              >
                <Button size="icon-sm" variant="electric" onClick={submit} aria-label="Send"><Send className="h-4 w-4" /></Button>
              </motion.div>
            ) : (
              <motion.div
                key="voice"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={POP}
                whileTap={{ scale: 0.9 }}
              >
                <Button
                  size="icon-sm"
                  variant={recording ? "live" : "ghost"}
                  onClick={sendVoice}
                  aria-label="Voice note"
                >
                  {recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

function Bubble({
  message: m, own, pinned, onReact, onPin, reduced,
}: {
  message: ChatMessage;
  own: boolean;
  pinned: boolean;
  onReact: (id: string, emoji: string) => void;
  onPin: (id: string) => void;
  reduced: boolean;
}) {
  const [hover, setHover] = useState(false);
  const { play } = useSound();
  const { buzz } = useHaptics();
  const ai = m.kind === "ai";
  const system = m.kind === "system";

  const react = (emoji: string) => {
    onReact(m.id, emoji);
    play("pop");
    buzz("tap");
  };

  if (system) {
    return (
      <motion.p
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={SPRING}
        className="text-center text-[11px] text-muted-foreground"
      >
        {m.body}
      </motion.p>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={SPRING}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={cn("group flex gap-2.5", own && "flex-row-reverse")}
    >
      {!own && (
        <motion.div whileHover={reduced ? undefined : { y: -2 }} transition={POP} className="shrink-0">
          <Avatar className={cn("relative h-7 w-7", ai && "ring-2 ring-accent/40")}>
            {ai && !reduced && (
              <motion.span
                aria-hidden
                className="pointer-events-none absolute -inset-1 rounded-full"
                style={{ background: `radial-gradient(circle, ${hslVar("var(--accent)", 0.4)}, transparent 70%)` }}
                animate={{ opacity: [0.35, 0.7, 0.35], scale: [0.9, 1.08, 0.9] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
            <AvatarImage src={m.authorAvatar} alt={m.authorName} />
            <AvatarFallback>{initials(m.authorName)}</AvatarFallback>
          </Avatar>
        </motion.div>
      )}
      <div className={cn("min-w-0 max-w-[78%]", own && "items-end text-right")}>
        {!own && (
          <p className={cn("mb-0.5 flex items-center gap-1 text-[11px] font-semibold", ai ? "text-accent" : "text-muted-foreground")}>
            {ai && (
              <motion.span
                animate={reduced ? undefined : { rotate: [0, 15, -15, 0], scale: [1, 1.15, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <Sparkles className="h-3 w-3" />
              </motion.span>
            )}
            {m.authorName}
          </p>
        )}
        <div
          className={cn(
            "relative inline-block overflow-hidden rounded-2xl px-3 py-2 text-sm",
            ai
              ? "border border-accent/25 bg-accent/[0.07]"
              : own
                ? "bg-electric/15 text-foreground"
                : m.kind === "prediction"
                  ? "border border-pitch/25 bg-pitch/[0.06]"
                  : "bg-white/[0.05]"
          )}
        >
          {(ai || own) && !reduced && (
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-0"
              style={{
                background: `radial-gradient(120% 120% at ${own ? "100%" : "0%"} 0%, ${hslVar(own ? "var(--electric)" : "var(--accent)", 0.16)}, transparent 60%)`,
              }}
              animate={{ opacity: [0.55, 0.95, 0.55] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
          <span className="relative z-10 block">
            {m.kind === "gif" && m.mediaUrl ? (
              <SmartImage src={m.mediaUrl} alt="gif" className="max-h-40 rounded-lg" />
            ) : m.kind === "voice" ? (
              <span className="flex items-center gap-2">
                <Play className="h-4 w-4 text-electric" />
                <span className="flex items-end gap-0.5">
                  {Array.from({ length: 14 }).map((_, i) => (
                    <motion.span
                      key={i}
                      className="w-0.5 rounded-full bg-electric/60"
                      style={{ height: 4 + ((i * 7) % 14) }}
                      animate={reduced ? undefined : { scaleY: [0.55, 1.35, 0.7, 1.1, 0.55] }}
                      transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut", delay: (i % 7) * 0.08 }}
                    />
                  ))}
                </span>
                <span className="tabular text-xs text-muted-foreground">0:{String(m.duration ?? 5).padStart(2, "0")}</span>
              </span>
            ) : (
              <span className="whitespace-pre-wrap break-words">{m.body}</span>
            )}
          </span>

          {/* hover actions */}
          <AnimatePresence>
            {hover && (
              <motion.span
                initial={{ opacity: 0, scale: 0.7, x: own ? 6 : -6 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.7, x: own ? 6 : -6 }}
                transition={POP}
                className={cn("absolute top-1/2 z-20 flex -translate-y-1/2 items-center gap-0.5", own ? "right-full mr-1" : "left-full ml-1")}
              >
                <motion.button whileHover={{ y: -2, scale: 1.1 }} whileTap={{ scale: 0.85 }} onClick={() => react("🔥")} className="grid h-6 w-6 place-items-center rounded-full bg-white/10 text-xs hover:bg-white/20" aria-label="React with fire"><SmilePlus className="h-3 w-3" /></motion.button>
                <motion.button whileHover={{ y: -2, scale: 1.1 }} whileTap={{ scale: 0.85 }} onClick={() => { onPin(m.id); play("click"); buzz("select"); }} className={cn("grid h-6 w-6 place-items-center rounded-full bg-white/10 hover:bg-white/20", pinned && "text-gold")} aria-label={pinned ? "Unpin message" : "Pin message"}><Pin className="h-3 w-3" /></motion.button>
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* reactions */}
        {Object.keys(m.reactions).length > 0 && (
          <div className={cn("mt-1 flex flex-wrap gap-1", own && "justify-end")}>
            <AnimatePresence initial={false}>
              {Object.entries(m.reactions).map(([emoji, users]) => (
                <motion.button
                  key={emoji}
                  layout
                  initial={{ opacity: 0, scale: 0.4 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.4 }}
                  transition={POP}
                  whileHover={{ y: -1, scale: 1.06 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => react(emoji)}
                  className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.05] px-1.5 py-0.5 text-[11px] hover:bg-white/10"
                >
                  <span>{emoji}</span>
                  <span className="tabular text-muted-foreground">
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.span
                        key={users.length}
                        initial={{ opacity: 0, y: reduced ? 0 : -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: reduced ? 0 : 6 }}
                        transition={POP}
                        className="inline-block"
                      >
                        {users.length}
                      </motion.span>
                    </AnimatePresence>
                  </span>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        )}
        <p className="mt-0.5 text-[10px] text-muted-foreground/60">
          {formatInTz(m.createdAt, "Asia/Kolkata", { hour: "2-digit", minute: "2-digit", hour12: false })}
        </p>
      </div>
    </motion.div>
  );
}
