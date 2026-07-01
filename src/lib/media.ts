import { hashSeed } from "@/lib/utils";

/**
 * Cinematic stadium/football video loops + posters.
 *
 * Every clip is from **Mixkit** under the Mixkit Free License (no attribution
 * required, commercial use allowed, no watermark) and has been hand-verified to
 * stream cross-origin as `video/mp4` (HTTP 206, range-supported) straight from
 * `assets.mixkit.co` — so we can hotlink without proxying or storing anything.
 *
 * Usage rule: these are **ambient backdrops**, always paired with a poster image
 * that paints first and remains as the graceful fallback. If a clip ever stops
 * resolving, the UI degrades to the poster (and the poster, via SmartImage, to a
 * brand gradient) — it can never show a broken element. See `AmbientVideo`.
 */

const MIXKIT = "https://assets.mixkit.co/videos";

export interface StadiumClip {
  id: string;
  label: string;
  /** Approx MB at 720p — used to keep autoplay light on the main heroes. */
  mb: number;
}

/** Wide, cinematic, low-motion stadium establishing shots — ideal behind heroes. */
export const STADIUM_CLIPS: readonly StadiumClip[] = [
  { id: "30601", label: "Flying low across an empty pitch", mb: 5.6 },
  { id: "4262", label: "Floodlit stadium from the air", mb: 2.2 },
  { id: "38480", label: "Stadium from the heights", mb: 4.8 },
  { id: "14190", label: "Skimming the grass before kickoff", mb: 5.6 },
  { id: "10029", label: "Modern stadium by the sea", mb: 4.3 },
  { id: "17398", label: "Stadium bowl, aerial", mb: 4.4 },
  { id: "17399", label: "Aerial over a packed stadium", mb: 6.0 },
  { id: "30312", label: "Walking out onto the pitch", mb: 5.6 },
];

/** Higher-energy clips reserved for live moments. */
export const ATMOSPHERE_CLIPS: readonly StadiumClip[] = [
  { id: "9585", label: "Crowd roaring in the stands", mb: 10 },
  { id: "41372", label: "Match from above", mb: 8.2 },
  ...STADIUM_CLIPS,
];

export type VideoQuality = 720 | 360;

export const clipVideo = (id: string, q: VideoQuality = 720) =>
  `${MIXKIT}/${id}/${id}-${q}.mp4`;

export const clipPoster = (id: string, q: VideoQuality = 720) =>
  `${MIXKIT}/${id}/${id}-thumb-${q}-0.jpg`;

/** Deterministic clip for a seed (WC day index or match id) — stable, no flicker. */
export function stadiumClipFor(seed: number | string): StadiumClip {
  const n = typeof seed === "number" ? Math.abs(Math.floor(seed)) : hashSeed(seed);
  return STADIUM_CLIPS[n % STADIUM_CLIPS.length]!;
}

export function atmosphereClipFor(seed: number | string): StadiumClip {
  const n = typeof seed === "number" ? Math.abs(Math.floor(seed)) : hashSeed(seed);
  return ATMOSPHERE_CLIPS[n % ATMOSPHERE_CLIPS.length]!;
}
