"use client";
import { useCallback, useMemo } from "react";
import Link from "next/link";
import { Activity, Sparkles, BarChart3, Users2, MessageSquare, Target, Gamepad2, Swords, ArrowRight } from "lucide-react";
import type { MatchEvent, Match } from "@/types";
import { getMatch, getTeam } from "@/lib/data";
import { runOracle } from "@/lib/oracle/engine";
import { useNow } from "@/hooks/use-now";
import { usePresence } from "@/hooks/use-presence";
import { useRoom } from "@/hooks/use-room";
import { useUserStore } from "@/stores/user";
import { useConfetti } from "@/hooks/use-confetti";
import { useSound } from "@/hooks/use-sound";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { MatchTopbar } from "./match-topbar";
import { MatchHero } from "./match-hero";
import { EventTimeline } from "./event-timeline";
import { OraclePanel } from "./oracle-panel";
import { StatsPanel } from "./stats-panel";
import { LineupsPanel } from "./lineups-panel";
import { PresenceBar } from "./presence-bar";
import { CallPanel } from "./call-panel";
import { RoomChat } from "./room-chat";
import { ReactionBar } from "./reaction-bar";
import { PredictPanel } from "./predict-panel";
import { ChallengesPanel } from "./challenges-panel";
import { PollCard } from "./poll-card";
import { CrowdMeter } from "@/components/games/crowd-meter";
import { toast } from "@/components/ui/sonner";

export function MatchRoom({ matchId }: { matchId: string }) {
  const now = useNow(5000);
  // now is 0 on first render (SSR-stable) → match shows as upcoming until mount.
  const match = getMatch(matchId, now);
  const profile = useUserStore((s) => s.profile);
  const presence = usePresence(matchId);
  const { celebrate } = useConfetti();
  const { play } = useSound();

  const onGoal = useCallback(
    (ev: MatchEvent, m: Match) => {
      const team = getTeam(ev.team === "home" ? m.homeTeamId : m.awayTeamId);
      celebrate(team ? [team.colors.primary, team.colors.secondary, "#ffce3a"] : undefined);
      play("goal");
      toast(`⚽️ GOAL — ${team?.name ?? "Goal"}!`, { description: ev.player ? `${ev.player}, ${ev.minute}'` : `${ev.minute}'` });
    },
    [celebrate, play]
  );

  const room = useRoom(matchId, {
    match: () => getMatch(matchId, Date.now()),
    onGoal,
  });

  const oracle = useMemo(
    () => (match && match.homeTeamId && match.awayTeamId ? runOracle(match) : null),
    [match]
  );

  if (!match) {
    return (
      <div className="grid min-h-dvh place-items-center p-6">
        <EmptyState
          title="Match not found"
          description="This fixture isn't on the schedule."
          action={<Button asChild><Link href="/fixtures">Back to fixtures</Link></Button>}
        />
      </div>
    );
  }

  const home = getTeam(match.homeTeamId);
  const away = getTeam(match.awayTeamId);
  const winnerPollOptions = [
    { id: "home", label: home?.name ?? "Home" },
    { id: "draw", label: "Draw" },
    { id: "away", label: away?.name ?? "Away" },
  ];

  return (
    <div className="min-h-dvh">
      <MatchTopbar match={match} />
      <MatchHero match={match} momentum={oracle?.momentum ?? 0} watchingCount={presence.watching} />

      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-3 py-5 sm:px-5 lg:grid lg:grid-cols-[1fr_minmax(340px,400px)]">
        {/* MAIN */}
        <div className="order-2 lg:order-1">
          <Tabs defaultValue="pitch">
            <TabsList className="w-full justify-start overflow-x-auto no-scrollbar">
              <TabsTrigger value="pitch"><Activity className="mr-1.5 h-3.5 w-3.5" /> Pitch</TabsTrigger>
              <TabsTrigger value="oracle"><Sparkles className="mr-1.5 h-3.5 w-3.5" /> Oracle</TabsTrigger>
              <TabsTrigger value="stats"><BarChart3 className="mr-1.5 h-3.5 w-3.5" /> Stats</TabsTrigger>
              <TabsTrigger value="lineups"><Users2 className="mr-1.5 h-3.5 w-3.5" /> Line-ups</TabsTrigger>
            </TabsList>
            <TabsContent value="pitch" className="space-y-4">
              <PollCard
                id={`winner-${match.id}`}
                question="Who's winning this?"
                options={winnerPollOptions}
              />
              <EventTimeline match={match} />
            </TabsContent>
            <TabsContent value="oracle"><OraclePanel match={match} /></TabsContent>
            <TabsContent value="stats"><StatsPanel match={match} /></TabsContent>
            <TabsContent value="lineups"><LineupsPanel match={match} /></TabsContent>
          </Tabs>
        </div>

        {/* SOCIAL RAIL */}
        <aside className="order-1 space-y-3 lg:order-2 lg:sticky lg:top-[4.5rem] lg:self-start">
          <PresenceBar members={presence.members} inCall={presence.inCall} />
          <CallPanel roomId={matchId} members={presence.members} />

          <div className="rounded-2xl border border-white/[0.07] glass p-3">
            <Tabs defaultValue="chat">
              <TabsList className="w-full justify-start overflow-x-auto no-scrollbar">
                <TabsTrigger value="chat"><MessageSquare className="mr-1 h-3.5 w-3.5" /> Chat</TabsTrigger>
                <TabsTrigger value="predict"><Target className="mr-1 h-3.5 w-3.5" /> Predict</TabsTrigger>
                <TabsTrigger value="play"><Gamepad2 className="mr-1 h-3.5 w-3.5" /> Play</TabsTrigger>
                <TabsTrigger value="challenges"><Swords className="mr-1 h-3.5 w-3.5" /> Bets</TabsTrigger>
              </TabsList>

              <TabsContent value="chat" className="mt-3">
                <div className="flex h-[62vh] flex-col">
                  <div className="min-h-0 flex-1">
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
                  </div>
                  <div className="mt-2">
                    <ReactionBar onReact={(emoji) => room.send(emoji, "reaction")} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="predict" className="mt-3 max-h-[62vh] overflow-y-auto no-scrollbar">
                <PredictPanel match={match} />
              </TabsContent>

              <TabsContent value="play" className="mt-3 max-h-[62vh] space-y-3 overflow-y-auto no-scrollbar">
                <CrowdMeter />
                <PollCard
                  id={`nextgoal-${match.id}`}
                  question="Next goal comes from…"
                  options={[{ id: "home", label: home?.code ?? "H" }, { id: "away", label: away?.code ?? "A" }, { id: "none", label: "No more goals" }]}
                  accent="var(--gold)"
                />
                <Button asChild variant="outline" className="w-full">
                  <Link href="/games">More party games <ArrowRight className="h-4 w-4" /></Link>
                </Button>
              </TabsContent>

              <TabsContent value="challenges" className="mt-3 max-h-[62vh] overflow-y-auto no-scrollbar">
                <ChallengesPanel match={match} />
              </TabsContent>
            </Tabs>
          </div>
        </aside>
      </div>
    </div>
  );
}
