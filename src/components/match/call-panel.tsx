"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff, Phone, Users, Radio,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { PresenceMember } from "@/types";
import { useUserStore } from "@/stores/user";
import { publicFeatures } from "@/lib/env";
import { createCallToken } from "@/lib/livekit/token";
import { initials, cn, hslVar } from "@/lib/utils";
import { toast } from "@/components/ui/sonner";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useSound } from "@/hooks/use-sound";
import { useHaptics } from "@/hooks/use-haptics";

type Mode = "voice" | "video";

const SPRING = { type: "spring", stiffness: 340, damping: 30 } as const;
const POP = { type: "spring", stiffness: 500, damping: 24 } as const;

interface RemoteTile {
  id: string;
  name: string;
  attach: (el: HTMLVideoElement | null) => void;
  hasVideo: boolean;
}

export function CallPanel({ roomId, members }: { roomId: string; members: PresenceMember[] }) {
  const profile = useUserStore((s) => s.profile);
  const [joined, setJoined] = useState(false);
  const [mode, setMode] = useState<Mode>("voice");
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(false);
  const [screenOn, setScreenOn] = useState(false);
  const [remotes, setRemotes] = useState<RemoteTile[]>([]);

  const reduced = useReducedMotion();
  const { play } = useSound();
  const { buzz } = useHaptics();

  const selfVideo = useRef<HTMLVideoElement>(null);
  const localStream = useRef<MediaStream | null>(null);
  const screenStream = useRef<MediaStream | null>(null);
  const roomRef = useRef<any>(null);

  const simFriends = members.filter((m) => m.status === "in_call" && m.userId !== profile.id);

  const stopAll = useCallback(() => {
    localStream.current?.getTracks().forEach((t) => t.stop());
    screenStream.current?.getTracks().forEach((t) => t.stop());
    localStream.current = null;
    screenStream.current = null;
    roomRef.current?.disconnect?.();
    roomRef.current = null;
  }, []);

  useEffect(() => () => stopAll(), [stopAll]);

  const connectLiveKit = useCallback(async () => {
    if (!publicFeatures.livekit || !localStream.current) return;
    try {
      const tk = await createCallToken(`ff-${roomId}`, profile.id, profile.name);
      if (!tk) return;
      const { Room, RoomEvent } = await import("livekit-client");
      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;
      await room.connect(tk.url, tk.token);
      for (const track of localStream.current.getTracks()) {
        await room.localParticipant.publishTrack(track);
      }
      const refresh = () => {
        const tiles: RemoteTile[] = [];
        room.remoteParticipants.forEach((p: any) => {
          const vidPub = [...p.videoTrackPublications.values()][0];
          tiles.push({
            id: p.identity,
            name: p.name || p.identity,
            hasVideo: Boolean(vidPub?.track),
            attach: (el) => {
              if (el && vidPub?.track) vidPub.track.attach(el);
              p.audioTrackPublications.forEach((ap: any) => ap.track?.attach());
            },
          });
        });
        setRemotes(tiles);
      };
      room.on(RoomEvent.ParticipantConnected, refresh);
      room.on(RoomEvent.ParticipantDisconnected, refresh);
      room.on(RoomEvent.TrackSubscribed, refresh);
      room.on(RoomEvent.TrackUnsubscribed, refresh);
      refresh();
    } catch {
      /* fall back silently to local + simulated tiles */
    }
  }, [roomId, profile.id, profile.name]);

  const join = useCallback(
    async (m: Mode) => {
      setMode(m);
      play(m === "video" ? "swoosh" : "pop");
      buzz("success");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: m === "video" ? { width: 640, height: 480, facingMode: "user" } : false,
        });
        localStream.current = stream;
        setMicOn(true);
        setCamOn(m === "video");
        setJoined(true);
        if (selfVideo.current && m === "video") selfVideo.current.srcObject = stream;
        connectLiveKit();
      } catch {
        // Permissions denied — still join in "listen" mode with simulated room.
        setJoined(true);
        setMicOn(false);
        setCamOn(false);
        toast.message("Joined without mic/cam", { description: "Grant permissions to go live with the group." });
      }
    },
    [connectLiveKit, play, buzz]
  );

  const leave = useCallback(() => {
    play("whistle");
    buzz("impact");
    stopAll();
    setJoined(false);
    setCamOn(false);
    setScreenOn(false);
    setRemotes([]);
  }, [stopAll, play, buzz]);

  const toggleMic = useCallback(() => {
    const tracks = localStream.current?.getAudioTracks() ?? [];
    tracks.forEach((t) => (t.enabled = !micOn));
    roomRef.current?.localParticipant?.setMicrophoneEnabled?.(!micOn);
    play("click");
    buzz("select");
    setMicOn((v) => !v);
  }, [micOn, play, buzz]);

  const toggleCam = useCallback(async () => {
    play("click");
    buzz("select");
    if (camOn) {
      localStream.current?.getVideoTracks().forEach((t) => t.stop());
      setCamOn(false);
      roomRef.current?.localParticipant?.setCameraEnabled?.(false);
      return;
    }
    try {
      const vstream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      const vtrack = vstream.getVideoTracks()[0]!;
      localStream.current?.addTrack(vtrack);
      if (selfVideo.current) selfVideo.current.srcObject = localStream.current;
      roomRef.current?.localParticipant?.publishTrack?.(vtrack);
      setCamOn(true);
    } catch {
      toast.error("Couldn't start camera");
    }
  }, [camOn, play, buzz]);

  const toggleScreen = useCallback(async () => {
    play("click");
    buzz("select");
    if (screenOn) {
      screenStream.current?.getTracks().forEach((t) => t.stop());
      screenStream.current = null;
      setScreenOn(false);
      return;
    }
    try {
      const s = await (navigator.mediaDevices as any).getDisplayMedia({ video: true });
      screenStream.current = s;
      if (selfVideo.current) selfVideo.current.srcObject = s;
      const track = s.getVideoTracks()[0];
      track.onended = () => { setScreenOn(false); if (selfVideo.current) selfVideo.current.srcObject = localStream.current; };
      roomRef.current?.localParticipant?.publishTrack?.(track);
      setScreenOn(true);
      toast.success("Sharing your screen 📺");
    } catch {
      /* cancelled */
    }
  }, [screenOn, play, buzz]);

  if (!joined) {
    return (
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={SPRING}
        className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4"
      >
        {/* aurora accent */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background: `radial-gradient(130% 120% at 0% 0%, ${hslVar("var(--pitch)", 0.14)}, transparent 55%), radial-gradient(120% 130% at 100% 0%, ${hslVar("var(--electric)", 0.12)}, transparent 55%)`,
          }}
        />
        {!reduced && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -inset-x-10 -top-16 h-32 opacity-60 blur-2xl"
            style={{ background: `linear-gradient(90deg, ${hslVar("var(--pitch)", 0.18)}, ${hslVar("var(--electric)", 0.14)}, ${hslVar("var(--accent)", 0.16)})` }}
            animate={{ x: ["-8%", "8%", "-8%"] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.span
              className="relative grid h-9 w-9 place-items-center rounded-xl bg-pitch/15 text-pitch"
              animate={reduced ? undefined : { scale: [1, 1.06, 1] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
            >
              {!reduced && (
                <motion.span
                  aria-hidden
                  className="absolute inset-0 rounded-xl ring-2 ring-pitch/40"
                  animate={{ opacity: [0.5, 0, 0.5], scale: [1, 1.35, 1] }}
                  transition={{ duration: 2.6, repeat: Infinity, ease: "easeOut" }}
                />
              )}
              <Radio className="h-4 w-4" />
            </motion.span>
            <div>
              <p className="text-sm font-semibold">Watch party room</p>
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                {simFriends.length > 0 && <span className="live-dot bg-pitch" />}
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={simFriends.length}
                    initial={reduced ? false : { y: 6, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={reduced ? { opacity: 0 } : { y: -6, opacity: 0 }}
                    transition={POP}
                    className="inline-block"
                  >
                    {simFriends.length > 0 ? `${simFriends.length} friends in voice` : "Be the first in"}
                  </motion.span>
                </AnimatePresence>
              </p>
            </div>
          </div>
          {!publicFeatures.livekit && <Badge variant="secondary" className="text-[10px]">Demo</Badge>}
        </div>
        <div className="relative mt-3 grid grid-cols-2 gap-2">
          <Button variant="outline" className="transition-transform active:scale-[0.96]" onClick={() => join("voice")}><Phone className="h-4 w-4" /> Voice</Button>
          <Button variant="electric" className="transition-transform active:scale-[0.96]" onClick={() => join("video")}><Video className="h-4 w-4" /> Video</Button>
        </div>
      </motion.div>
    );
  }

  const selfShowsVideo = camOn || screenOn;
  const total = 1 + simFriends.length + remotes.length;

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={SPRING}
      className="rounded-2xl border border-pitch/20 bg-pitch/[0.04] p-3"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-pitch">
          <span className="live-dot bg-pitch" /> {mode === "video" ? "Video" : "Voice"} room ·{" "}
          <span className="relative inline-grid">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={total}
                initial={reduced ? false : { y: 8, opacity: 0, scale: 0.7 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={reduced ? { opacity: 0 } : { y: -8, opacity: 0, scale: 0.7 }}
                transition={POP}
                className="tabular-nums [grid-area:1/1]"
              >
                {total}
              </motion.span>
            </AnimatePresence>
          </span>
        </span>
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Users className="h-3 w-3" /> watch party</span>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {/* self */}
        <motion.div
          layout
          initial={reduced ? false : { opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={SPRING}
          className="relative aspect-square overflow-hidden rounded-xl bg-black/40 ring-1 ring-white/10"
        >
          {micOn && !reduced && (
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-xl ring-2"
              style={{ ["--tw-ring-color" as string]: hslVar("var(--pitch)", 0.5) }}
              animate={{ opacity: [0.35, 0.8, 0.35] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
          <video ref={selfVideo} autoPlay muted playsInline className={cn("h-full w-full object-cover", screenOn ? "" : "-scale-x-100", selfShowsVideo ? "block" : "hidden")} />
          {!selfShowsVideo && (
            <div className="grid h-full place-items-center">
              <motion.div
                animate={reduced ? undefined : { scale: micOn ? [1, 1.05, 1] : 1 }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              >
                <Avatar className="h-10 w-10"><AvatarImage src={profile.avatar} /><AvatarFallback>{initials(profile.name)}</AvatarFallback></Avatar>
              </motion.div>
            </div>
          )}
          <span className="absolute bottom-1 left-1 flex items-center gap-1 rounded bg-black/50 px-1 text-[9px] text-white">
            {micOn ? <SpeakingMic reduced={reduced} /> : <MicOff className="h-2.5 w-2.5 text-live" />} You
          </span>
        </motion.div>

        {/* remote (LiveKit) */}
        <AnimatePresence initial={false}>
          {remotes.map((r) => (
            <RemoteVideoTile key={r.id} tile={r} reduced={reduced} />
          ))}
        </AnimatePresence>

        {/* simulated friends */}
        {simFriends.map((f, i) => {
          const speaking = i % 3 !== 0;
          return (
            <motion.div
              key={f.userId}
              layout
              initial={reduced ? false : { opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
              transition={{ ...SPRING, delay: reduced ? 0 : Math.min(i, 5) * 0.04 }}
              className="relative aspect-square overflow-hidden rounded-xl bg-black/30 ring-1 ring-white/10"
            >
              {speaking && !reduced && (
                <motion.span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-xl ring-2"
                  style={{ ["--tw-ring-color" as string]: hslVar("var(--pitch)", 0.45) }}
                  animate={{ opacity: [0.25, 0.7, 0.25] }}
                  transition={{ duration: 1.4 + (i % 3) * 0.25, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
              <div className="grid h-full place-items-center">
                <motion.div
                  animate={reduced ? undefined : { scale: speaking ? [1, 1.05, 1] : [1, 1.02, 1] }}
                  transition={{ duration: 1.8 + (i % 4) * 0.3, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Avatar className="h-10 w-10"><AvatarImage src={f.avatar} /><AvatarFallback>{initials(f.name)}</AvatarFallback></Avatar>
                </motion.div>
              </div>
              <span className="absolute bottom-1 left-1 flex items-center gap-1 rounded bg-black/50 px-1 text-[9px] text-white">
                {speaking ? <SpeakingMic reduced={reduced} /> : <MicOff className="h-2.5 w-2.5 text-live" />} {f.name}
              </span>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-center gap-1.5">
        <CallBtn active={micOn} onClick={toggleMic} on={<Mic className="h-4 w-4" />} off={<MicOff className="h-4 w-4" />} />
        <CallBtn active={camOn} onClick={toggleCam} on={<Video className="h-4 w-4" />} off={<VideoOff className="h-4 w-4" />} />
        <motion.button
          whileHover={reduced ? undefined : { y: -2 }}
          whileTap={{ scale: 0.94 }}
          onClick={toggleScreen}
          aria-label={screenOn ? "Stop sharing screen" : "Share screen"}
          className={cn("grid h-10 w-10 place-items-center rounded-full transition", screenOn ? "bg-electric text-background" : "bg-white/10 hover:bg-white/15")}
        >
          <MonitorUp className="h-4 w-4" />
        </motion.button>
        <motion.button
          whileHover={reduced ? undefined : { y: -2 }}
          whileTap={{ scale: 0.9 }}
          onClick={leave}
          aria-label="Leave call"
          className="grid h-10 w-10 place-items-center rounded-full bg-live text-white transition hover:brightness-110"
        >
          <PhoneOff className="h-4 w-4" />
        </motion.button>
      </div>
    </motion.div>
  );
}

/** Animated three-bar "speaking" waveform that falls back to a static mic under reduced-motion. */
function SpeakingMic({ reduced }: { reduced: boolean }) {
  if (reduced) return <Mic className="h-2.5 w-2.5" />;
  return (
    <span aria-hidden className="flex h-2.5 items-end gap-[1.5px]" role="img" aria-label="speaking">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-[2px] rounded-full bg-pitch"
          animate={{ height: ["25%", "100%", "40%"] }}
          transition={{ duration: 0.6 + i * 0.12, repeat: Infinity, ease: "easeInOut", delay: i * 0.08 }}
          style={{ height: "50%" }}
        />
      ))}
    </span>
  );
}

function CallBtn({ active, onClick, on, off }: { active: boolean; onClick: () => void; on: React.ReactNode; off: React.ReactNode }) {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className={cn("grid h-10 w-10 place-items-center rounded-full transition", active ? "bg-white/15 hover:bg-white/20" : "bg-live/20 text-live hover:bg-live/30")}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={active ? "on" : "off"}
          initial={{ scale: 0.6, opacity: 0, rotate: -12 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 0.6, opacity: 0, rotate: 12 }}
          transition={POP}
          className="grid place-items-center"
        >
          {active ? on : off}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

function RemoteVideoTile({ tile, reduced }: { tile: RemoteTile; reduced: boolean }) {
  return (
    <motion.div
      layout
      initial={reduced ? false : { opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
      transition={SPRING}
      className="relative aspect-square overflow-hidden rounded-xl bg-black/40 ring-1 ring-white/10"
    >
      <video ref={(el) => tile.attach(el)} autoPlay playsInline className={cn("h-full w-full object-cover", tile.hasVideo ? "block" : "hidden")} />
      {!tile.hasVideo && (
        <div className="grid h-full place-items-center">
          <motion.div
            animate={reduced ? undefined : { scale: [1, 1.04, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Avatar className="h-10 w-10"><AvatarFallback>{initials(tile.name)}</AvatarFallback></Avatar>
          </motion.div>
        </div>
      )}
      <span className="absolute bottom-1 left-1 rounded bg-black/50 px-1 text-[9px] text-white">{tile.name}</span>
    </motion.div>
  );
}
