"use client";
import { Mic, Circle } from "lucide-react";
import type { PresenceMember } from "@/types";
import { FriendStack } from "@/components/shared/friend-stack";

export function PresenceBar({ members, inCall }: { members: PresenceMember[]; inCall: number }) {
  const typing = members.filter((m) => m.typing).slice(0, 2);
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
      <FriendStack
        people={members.map((m) => ({ userId: m.userId, name: m.name, avatar: m.avatar }))}
        size="sm"
        max={6}
        label={`${members.length} in the room`}
      />
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {typing.length > 0 && (
          <span className="hidden items-center gap-1 sm:flex">
            <span className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-1 w-1 animate-pulse rounded-full bg-electric" style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </span>
            {typing.map((t) => t.name).join(", ")} typing…
          </span>
        )}
        {inCall > 0 && (
          <span className="flex items-center gap-1 text-pitch">
            <Mic className="h-3 w-3" /> {inCall} in voice
          </span>
        )}
        <span className="flex items-center gap-1 text-live">
          <Circle className="h-2 w-2 fill-current" /> Live room
        </span>
      </div>
    </div>
  );
}
