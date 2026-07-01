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
import { initials, cn } from "@/lib/utils";
import { toast } from "@/components/ui/sonner";

type Mode = "voice" | "video";

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
    [connectLiveKit]
  );

  const leave = useCallback(() => {
    stopAll();
    setJoined(false);
    setCamOn(false);
    setScreenOn(false);
    setRemotes([]);
  }, [stopAll]);

  const toggleMic = useCallback(() => {
    const tracks = localStream.current?.getAudioTracks() ?? [];
    tracks.forEach((t) => (t.enabled = !micOn));
    roomRef.current?.localParticipant?.setMicrophoneEnabled?.(!micOn);
    setMicOn((v) => !v);
  }, [micOn]);

  const toggleCam = useCallback(async () => {
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
  }, [camOn]);

  const toggleScreen = useCallback(async () => {
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
  }, [screenOn]);

  if (!joined) {
    return (
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-pitch/15 text-pitch"><Radio className="h-4 w-4" /></span>
            <div>
              <p className="text-sm font-semibold">Watch party room</p>
              <p className="text-[11px] text-muted-foreground">
                {simFriends.length > 0 ? `${simFriends.length} friends in voice` : "Be the first in"}
              </p>
            </div>
          </div>
          {!publicFeatures.livekit && <Badge variant="secondary" className="text-[10px]">Demo</Badge>}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => join("voice")}><Phone className="h-4 w-4" /> Voice</Button>
          <Button variant="electric" onClick={() => join("video")}><Video className="h-4 w-4" /> Video</Button>
        </div>
      </div>
    );
  }

  const selfShowsVideo = camOn || screenOn;

  return (
    <div className="rounded-2xl border border-pitch/20 bg-pitch/[0.04] p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-pitch">
          <span className="live-dot bg-pitch" /> {mode === "video" ? "Video" : "Voice"} room · {1 + simFriends.length + remotes.length}
        </span>
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Users className="h-3 w-3" /> watch party</span>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {/* self */}
        <div className="relative aspect-square overflow-hidden rounded-xl bg-black/40 ring-1 ring-white/10">
          <video ref={selfVideo} autoPlay muted playsInline className={cn("h-full w-full object-cover", screenOn ? "" : "-scale-x-100", selfShowsVideo ? "block" : "hidden")} />
          {!selfShowsVideo && (
            <div className="grid h-full place-items-center">
              <Avatar className="h-10 w-10"><AvatarImage src={profile.avatar} /><AvatarFallback>{initials(profile.name)}</AvatarFallback></Avatar>
            </div>
          )}
          <span className="absolute bottom-1 left-1 flex items-center gap-1 rounded bg-black/50 px-1 text-[9px] text-white">
            {micOn ? <Mic className="h-2.5 w-2.5" /> : <MicOff className="h-2.5 w-2.5 text-live" />} You
          </span>
        </div>

        {/* remote (LiveKit) */}
        {remotes.map((r) => (
          <RemoteVideoTile key={r.id} tile={r} />
        ))}

        {/* simulated friends */}
        {simFriends.map((f, i) => (
          <div key={f.userId} className="relative aspect-square overflow-hidden rounded-xl bg-black/30 ring-1 ring-white/10">
            <div className="grid h-full place-items-center">
              <Avatar className="h-10 w-10"><AvatarImage src={f.avatar} /><AvatarFallback>{initials(f.name)}</AvatarFallback></Avatar>
            </div>
            <span className="absolute bottom-1 left-1 flex items-center gap-1 rounded bg-black/50 px-1 text-[9px] text-white">
              {i % 3 === 0 ? <MicOff className="h-2.5 w-2.5 text-live" /> : <Mic className="h-2.5 w-2.5" />} {f.name}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-center gap-1.5">
        <CallBtn active={micOn} onClick={toggleMic} on={<Mic className="h-4 w-4" />} off={<MicOff className="h-4 w-4" />} />
        <CallBtn active={camOn} onClick={toggleCam} on={<Video className="h-4 w-4" />} off={<VideoOff className="h-4 w-4" />} />
        <button onClick={toggleScreen} className={cn("grid h-10 w-10 place-items-center rounded-full transition", screenOn ? "bg-electric text-background" : "bg-white/10 hover:bg-white/15")}>
          <MonitorUp className="h-4 w-4" />
        </button>
        <button onClick={leave} className="grid h-10 w-10 place-items-center rounded-full bg-live text-white transition hover:brightness-110">
          <PhoneOff className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function CallBtn({ active, onClick, on, off }: { active: boolean; onClick: () => void; on: React.ReactNode; off: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn("grid h-10 w-10 place-items-center rounded-full transition", active ? "bg-white/15 hover:bg-white/20" : "bg-live/20 text-live hover:bg-live/30")}>
      {active ? on : off}
    </button>
  );
}

function RemoteVideoTile({ tile }: { tile: RemoteTile }) {
  return (
    <div className="relative aspect-square overflow-hidden rounded-xl bg-black/40 ring-1 ring-white/10">
      <video ref={(el) => tile.attach(el)} autoPlay playsInline className={cn("h-full w-full object-cover", tile.hasVideo ? "block" : "hidden")} />
      {!tile.hasVideo && (
        <div className="grid h-full place-items-center">
          <Avatar className="h-10 w-10"><AvatarFallback>{initials(tile.name)}</AvatarFallback></Avatar>
        </div>
      )}
      <span className="absolute bottom-1 left-1 rounded bg-black/50 px-1 text-[9px] text-white">{tile.name}</span>
    </div>
  );
}
