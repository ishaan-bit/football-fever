import { hashSeed } from "@/lib/utils";

/**
 * The single source of truth for still photography across the app.
 *
 * Every image is sourced from Unsplash (free-to-use, no attribution required)
 * and has been hand-verified to resolve (HTTP 200) and to be genuinely on-theme
 * — football, stadiums, pitches, fans, trophies. They are grouped into "scenes"
 * so any surface can ask for the *kind* of image it wants (a goal, the crowd, a
 * trophy) and get a deterministic pick that is stable across renders (no SSR
 * mismatch, no reshuffle on tick).
 *
 * Reliability: these are only ever rendered through `SmartImage` /
 * `SceneBackground`, which degrade a dead URL to a brand gradient — so a link
 * that rots can never show a broken element, only a slightly plainer panel.
 */

/** Build an Unsplash delivery URL at a given width. */
export const unsplashImg = (id: string, w = 1600, q = 80) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=${q}&auto=format&fit=crop`;

/**
 * Verified photo ids, tagged by what they actually depict. Keeping the raw ids
 * here (with a human label) means every consumer shares one vetted pool.
 */
const PHOTO = {
  stadiumPacked: "1489944440615-453fc2b6a9a9", // floodlit, packed stadium at night
  stadiumGolden: "1540379708242-14a809bef941", // stadium bowl at golden hour
  stadiumSeats: "1522778526097-ce0a22ceb253", // empty stadium seats, blue hour
  stadiumFloodlit: "1431324155629-1a6deb1dec8d", // a match under the floodlights
  pitchAerial: "1556056504-5c7696c4c28d", // top-down floodlit pitch from the air
  pitchWet: "1486286701208-1d58e9338013", // a lone ball on a wet pitch
  pitchDewy: "1459865264687-595d652de67e", // dewy pitch sideline, close up
  ballBoot: "1579952363873-27f3bade9f55", // a boot resting on a match ball
  ballTrio: "1551958219-acbc608c6377", // three match balls on the grass
  ballSingle: "1552667466-07770ae110d0", // a single ball, shallow focus
  ballPile: "1518604666860-9ed391f76460", // a pile of training balls
  actionDuel: "1543326727-cf6c39e8f84c", // two players duelling for the ball
  actionVolley: "1517466787929-bc90951d0974", // a player striking a volley
  actionChallenge: "1624880357913-a8539238245b", // a 50/50 challenge near goal
  actionStrike: "1606925797300-0b35e9d1794e", // a striker about to connect
  shotOnGoal: "1560272564-c83b66b1ad12", // a volley toward the goal, dramatic sky
  crowdRoar: "1574629810360-7efbbe195018", // a ball struck in front of the stands
  tunnel: "1577223625816-7546f13df25d", // the players' tunnel
  boots: "1529900748604-07564a03e7a6", // boots on the touchline
  trophy: "1518091043644-c1d4457512c6", // the World Cup trophy beside a ball
  fire: "1495467033336-2effd8753d51", // flames — for the roast / hot takes
} as const;

export type SceneName =
  | "stadium"
  | "pitch"
  | "ball"
  | "action"
  | "shot"
  | "crowd"
  | "tunnel"
  | "trophy"
  | "fire"
  | "boots";

/** Each scene is an ordered list of ids; the picker spreads deterministically. */
const SCENE_IDS: Record<SceneName, readonly string[]> = {
  stadium: [PHOTO.stadiumPacked, PHOTO.stadiumGolden, PHOTO.stadiumFloodlit, PHOTO.stadiumSeats],
  pitch: [PHOTO.pitchAerial, PHOTO.pitchWet, PHOTO.pitchDewy],
  ball: [PHOTO.ballBoot, PHOTO.ballTrio, PHOTO.ballSingle, PHOTO.ballPile],
  action: [PHOTO.actionDuel, PHOTO.actionVolley, PHOTO.actionChallenge, PHOTO.actionStrike],
  shot: [PHOTO.shotOnGoal, PHOTO.actionVolley, PHOTO.actionStrike],
  crowd: [PHOTO.crowdRoar, PHOTO.stadiumPacked, PHOTO.stadiumSeats],
  tunnel: [PHOTO.tunnel, PHOTO.boots],
  trophy: [PHOTO.trophy, PHOTO.stadiumGolden],
  fire: [PHOTO.fire],
  boots: [PHOTO.boots, PHOTO.ballBoot],
};

/**
 * A deterministic image URL for a scene. `seed` (a string or number) keeps the
 * choice stable for a given surface — e.g. a game id or match id — so it never
 * flickers or disagrees between server and client.
 */
export function sceneImage(scene: SceneName, seed: number | string = 0, w = 1600): string {
  const ids = SCENE_IDS[scene];
  const n = typeof seed === "number" ? Math.abs(Math.floor(seed)) : hashSeed(seed);
  const id = ids[n % ids.length] ?? ids[0]!;
  return unsplashImg(id, w);
}

/** All image URLs for a scene (e.g. to build a rotating strip). */
export function sceneImages(scene: SceneName, w = 1600): string[] {
  return SCENE_IDS[scene].map((id) => unsplashImg(id, w));
}

/** The full landscape pool, wide, for full-bleed daily backdrops. */
export const BACKDROP_POOL: readonly string[] = [
  PHOTO.stadiumPacked,
  PHOTO.pitchDewy,
  PHOTO.stadiumGolden,
  PHOTO.shotOnGoal,
  PHOTO.stadiumSeats,
  PHOTO.pitchAerial,
  PHOTO.stadiumFloodlit,
  PHOTO.pitchWet,
  PHOTO.actionStrike,
  PHOTO.ballBoot,
  PHOTO.tunnel,
  PHOTO.actionDuel,
  PHOTO.actionChallenge,
  PHOTO.ballSingle,
  PHOTO.trophy,
  PHOTO.crowdRoar,
].map((id) => unsplashImg(id, 1920));
