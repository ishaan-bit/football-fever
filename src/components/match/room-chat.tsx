"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Send, Smile, ImageIcon, Mic, Pin, SmilePlus, Sparkles, Square, Play } from "lucide-react";
import type { ChatMessage } from "@/types";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { SmartImage } from "@/components/shared/smart-image";
import { Button } from "@/components/ui/button";
import { REACTIONS, GIF_CATEGORIES } from "@/lib/constants";
import { cn, initials, formatInTz } from "@/lib/utils";
import { useSound } from "@/hooks/use-sound";

const GIFS = [
  "https://media.giphy.com/media/3o7TKqnN349PBUtGFO/giphy.gif",
  "https://media.giphy.com/media/l0MYGb1LuZ3n7dRnO/giphy.gif",
  "https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif",
  "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif",
  "https://media.giphy.com/media/l46Cy1rHbQ92uuLXa/giphy.gif",
  "https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif",
];

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
    setText("");
    setShowEmoji(false);
  };

  const sendVoice = () => {
    setRecording(true);
    setTimeout(() => {
      setRecording(false);
      onSend("Voice note", "voice", { duration: 3 + Math.floor(Math.random() * 12) });
      play("pop");
    }, 1400);
  };

  return (
    <div className="flex h-full flex-col">
      {pinned.length > 0 && (
        <div className="mb-2 space-y-1">
          {pinned.map((m) => (
            <div key={m.id} className="flex items-center gap-2 rounded-xl border border-gold/20 bg-gold/[0.06] px-3 py-1.5 text-xs">
              <Pin className="h-3 w-3 shrink-0 text-gold" />
              <span className="truncate"><b>{m.authorName}:</b> {m.body}</span>
            </div>
          ))}
        </div>
      )}

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
            />
          ))}
        </AnimatePresence>
        {typingNames.length > 0 && (
          <p className="px-2 text-xs text-muted-foreground">
            {typingNames.join(", ")} {typingNames.length > 1 ? "are" : "is"} typing…
          </p>
        )}
      </div>

      {/* Composer */}
      <div className="mt-3 space-y-2">
        <AnimatePresence>
          {showEmoji && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
              className="flex flex-wrap gap-1 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-2"
            >
              {REACTIONS.map((e) => (
                <button key={e} onClick={() => setText((t) => t + e)} className="grid h-8 w-8 place-items-center rounded-lg text-lg hover:bg-white/10">
                  {e}
                </button>
              ))}
            </motion.div>
          )}
          {showGifs && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
              className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-2"
            >
              <div className="mb-2 flex flex-wrap gap-1">
                {GIF_CATEGORIES.slice(0, 5).map((c) => (
                  <span key={c} className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-muted-foreground">{c}</span>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {GIFS.map((g) => (
                  <button
                    key={g}
                    onClick={() => { onSend("", "gif", { mediaUrl: g }); setShowGifs(false); play("swoosh"); }}
                    className="aspect-video overflow-hidden rounded-lg border border-white/10"
                  >
                    <SmartImage src={g} alt="gif" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.03] p-1.5">
          <Button variant="ghost" size="icon-sm" onClick={() => { setShowEmoji((v) => !v); setShowGifs(false); }} aria-label="Emoji">
            <Smile className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => { setShowGifs((v) => !v); setShowEmoji(false); }} aria-label="GIF">
            <ImageIcon className="h-4 w-4" />
          </Button>
          <input
            value={text}
            onChange={(e) => { setText(e.target.value); onTyping?.(); }}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder={recording ? "Recording…" : "Say something…"}
            className="min-w-0 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground/70"
          />
          {text.trim() ? (
            <Button size="icon-sm" variant="electric" onClick={submit} aria-label="Send"><Send className="h-4 w-4" /></Button>
          ) : (
            <Button
              size="icon-sm"
              variant={recording ? "live" : "ghost"}
              onClick={sendVoice}
              aria-label="Voice note"
            >
              {recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Bubble({
  message: m, own, pinned, onReact, onPin,
}: {
  message: ChatMessage;
  own: boolean;
  pinned: boolean;
  onReact: (id: string, emoji: string) => void;
  onPin: (id: string) => void;
}) {
  const [hover, setHover] = useState(false);
  const ai = m.kind === "ai";
  const system = m.kind === "system";

  if (system) {
    return <p className="text-center text-[11px] text-muted-foreground">{m.body}</p>;
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={cn("group flex gap-2.5", own && "flex-row-reverse")}
    >
      {!own && (
        <Avatar className={cn("h-7 w-7 shrink-0", ai && "ring-2 ring-accent/40")}>
          <AvatarImage src={m.authorAvatar} alt={m.authorName} />
          <AvatarFallback>{initials(m.authorName)}</AvatarFallback>
        </Avatar>
      )}
      <div className={cn("min-w-0 max-w-[78%]", own && "items-end text-right")}>
        {!own && (
          <p className={cn("mb-0.5 flex items-center gap-1 text-[11px] font-semibold", ai ? "text-accent" : "text-muted-foreground")}>
            {ai && <Sparkles className="h-3 w-3" />}
            {m.authorName}
          </p>
        )}
        <div
          className={cn(
            "relative inline-block rounded-2xl px-3 py-2 text-sm",
            ai
              ? "border border-accent/25 bg-accent/[0.07]"
              : own
                ? "bg-electric/15 text-foreground"
                : m.kind === "prediction"
                  ? "border border-pitch/25 bg-pitch/[0.06]"
                  : "bg-white/[0.05]"
          )}
        >
          {m.kind === "gif" && m.mediaUrl ? (
            <SmartImage src={m.mediaUrl} alt="gif" className="max-h-40 rounded-lg" />
          ) : m.kind === "voice" ? (
            <span className="flex items-center gap-2">
              <Play className="h-4 w-4 text-electric" />
              <span className="flex items-end gap-0.5">
                {Array.from({ length: 14 }).map((_, i) => (
                  <span key={i} className="w-0.5 rounded-full bg-electric/60" style={{ height: 4 + ((i * 7) % 14) }} />
                ))}
              </span>
              <span className="tabular text-xs text-muted-foreground">0:{String(m.duration ?? 5).padStart(2, "0")}</span>
            </span>
          ) : (
            <span className="whitespace-pre-wrap break-words">{m.body}</span>
          )}

          {/* hover actions */}
          {(hover) && (
            <span className={cn("absolute top-1/2 flex -translate-y-1/2 items-center gap-0.5", own ? "right-full mr-1" : "left-full ml-1")}>
              <button onClick={() => onReact(m.id, "🔥")} className="grid h-6 w-6 place-items-center rounded-full bg-white/10 text-xs hover:bg-white/20"><SmilePlus className="h-3 w-3" /></button>
              <button onClick={() => onPin(m.id)} className={cn("grid h-6 w-6 place-items-center rounded-full bg-white/10 hover:bg-white/20", pinned && "text-gold")}><Pin className="h-3 w-3" /></button>
            </span>
          )}
        </div>

        {/* reactions */}
        {Object.keys(m.reactions).length > 0 && (
          <div className={cn("mt-1 flex flex-wrap gap-1", own && "justify-end")}>
            {Object.entries(m.reactions).map(([emoji, users]) => (
              <button
                key={emoji}
                onClick={() => onReact(m.id, emoji)}
                className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.05] px-1.5 py-0.5 text-[11px] hover:bg-white/10"
              >
                <span>{emoji}</span>
                <span className="tabular text-muted-foreground">{users.length}</span>
              </button>
            ))}
          </div>
        )}
        <p className="mt-0.5 text-[10px] text-muted-foreground/60">
          {formatInTz(m.createdAt, "Asia/Kolkata", { hour: "2-digit", minute: "2-digit", hour12: false })}
        </p>
      </div>
    </motion.div>
  );
}
