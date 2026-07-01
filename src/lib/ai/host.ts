import type { AiHostMessage, Match, MatchEvent } from "@/types";
import { getTeam } from "@/lib/data/teams";
import { seededRandom, hashSeed, pickFrom } from "@/lib/utils";

/* ------------------------------------------------------------------ *
 *  The AI host = The Oracle's voice. It is a member of the watch party,
 *  not a chatbot. Hard rule: it ONLY reacts to verified match data passed
 *  in — it never invents events. Every line is anchored to a real fact.
 * ------------------------------------------------------------------ */

let counter = 0;
const id = () => `ai-${Date.now()}-${counter++}`;

const msg = (
  mood: AiHostMessage["mood"],
  text: string,
  matchId?: string,
  anchor?: string
): AiHostMessage => ({ id: id(), mood, text, matchId, createdAt: new Date().toISOString(), anchor });

export function hostWelcome(match: Match): AiHostMessage {
  const home = getTeam(match.homeTeamId);
  const away = getTeam(match.awayTeamId);
  const rng = seededRandom(hashSeed("welcome:" + match.id));
  if (!home || !away) {
    return msg("calm", pickFrom([
      "Doors are open. Grab a seat, the bracket waits for no one.",
      "Welcome back. Let's see who books their ticket tonight.",
    ], rng), match.id);
  }
  return msg(
    "hype",
    pickFrom(
      [
        `Welcome to ${home.name} vs ${away.name}. I've run the numbers, made the popcorn, and prepared several jokes at your expense. Let's go. ⚽️`,
        `${home.name}. ${away.name}. One pitch, zero chill. Predictions lock at kickoff — make them count, friends.`,
        `Gather round. ${home.name} vs ${away.name} is about to begin, and ${home.nickname ?? home.name} fans are already too confident.`,
        `${home.name} vs ${away.name}: two flags, one ball, ninety minutes, zero casualties. This is how rivals are meant to settle it. 🕊️`,
      ],
      rng
    ),
    match.id,
    "kickoff"
  );
}

export function hostOnEvent(event: MatchEvent, match: Match): AiHostMessage | null {
  const home = getTeam(match.homeTeamId);
  const away = getTeam(match.awayTeamId);
  const scorer = event.team === "home" ? home : away;
  const rng = seededRandom(hashSeed(event.id + match.id));
  const anchor = `${event.type}@${event.minute}'`;

  switch (event.type) {
    case "goal":
    case "penalty_goal":
      return msg(
        "celebratory",
        pickFrom(
          [
            `GOAL! ${scorer?.name ?? "They"} strike on ${event.minute}'${event.player ? ` — take a bow, ${event.player}` : ""}! The room is officially unhinged. 🔥`,
            `${event.player ?? scorer?.name} scores! ${event.minute} minutes in and someone's prediction just aged beautifully — or terribly. You know who you are.`,
            `It's in! ${scorer?.name} lead${event.type === "penalty_goal" ? " from the spot" : ""}. I called this, by the way. Check the tape.`,
          ],
          rng
        ),
        match.id,
        anchor
      );
    case "var":
      return msg(
        "cheeky",
        pickFrom(
          [
            `VAR is having a look. Everyone freeze and pretend you understand the offside rule. 🧐`,
            `To the monitor we go. This is the most tense anyone's been about a man drawing lines on a screen.`,
            `VAR check — ${event.detail ?? "reviewing"}. Hold your celebrations, hold your breath, hold my drink.`,
          ],
          rng
        ),
        match.id,
        anchor
      );
    case "red":
      return msg("shook", `RED CARD. Down to ten. The Oracle did not see this coming, and the Oracle sees everything. 😳`, match.id, anchor);
    case "yellow":
      return rng() < 0.4
        ? msg("analytical", `Booking for ${event.player ?? scorer?.code}. One to watch — tackles get spicier from here.`, match.id, anchor)
        : null;
    case "halftime":
      return msg(
        "analytical",
        pickFrom(
          [
            `Halftime. ${scoreLine(match)}. Mini-games are unlocked — go embarrass each other while the players catch their breath.`,
            `45 done. ${scoreLine(match)}. Time for hot takes you'll regret in the second half.`,
          ],
          rng
        ),
        match.id,
        "halftime"
      );
    case "fulltime":
      return msg(
        "calm",
        pickFrom(
          [
            `Full time: ${scoreLine(match)}. Recap incoming. Spoiler: someone in this chat was very wrong.`,
            `That's all she wrote — ${scoreLine(match)}. Let's tally the damage to everyone's predictions.`,
          ],
          rng
        ),
        match.id,
        "fulltime"
      );
    default:
      return null;
  }
}

function scoreLine(match: Match): string {
  const home = getTeam(match.homeTeamId);
  const away = getTeam(match.awayTeamId);
  return `${home?.code ?? "HOM"} ${match.homeScore ?? 0}–${match.awayScore ?? 0} ${away?.code ?? "AWY"}`;
}

/** A roast for a prediction that just went wrong (verified by result). */
export function hostRoast(name: string, predictionLabel: string, match: Match): AiHostMessage {
  const rng = seededRandom(hashSeed(name + predictionLabel + match.id));
  return msg(
    "cheeky",
    pickFrom(
      [
        `${name} predicted "${predictionLabel}". The scoreboard says otherwise. Bold strategy, didn't pay off. 😂`,
        `Spare a thought for ${name}, who went "${predictionLabel}" with their whole chest. We move.`,
        `"${predictionLabel}" — ${name}, 2026, colourised. A prediction for the scrapbook.`,
      ],
      rng
    ),
    match.id
  );
}

/** Tone shifts as the tournament deepens — the personality evolves. */
export function hostStageMood(stage: Match["stage"]): AiHostMessage["mood"] {
  switch (stage) {
    case "group":
      return "cheeky";
    case "r32":
    case "r16":
      return "hype";
    case "qf":
    case "sf":
      return "analytical";
    case "final":
      return "celebratory";
    default:
      return "calm";
  }
}

export function hostIdleNudge(match?: Match): AiHostMessage {
  const rng = seededRandom(hashSeed("idle:" + (match?.id ?? "lobby") + counter));
  return msg(
    "calm",
    pickFrom(
      [
        "Quiet in here. Someone make a hot take so I have something to roast.",
        "The Oracle is bored. Start a mini-game. Chaos is good for the soul.",
        "Predictions are still open. Fortune favours the bold and mocks the indecisive.",
      ],
      rng
    ),
    match?.id
  );
}
