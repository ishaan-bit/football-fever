import type { Venue, Host } from "@/types";
import { unsplashImg } from "@/lib/imagery";
import rawStadiums from "./raw/stadiums.json";

interface RawStadium {
  id: string;
  name_en: string;
  name_fa?: string;
  fifa_name?: string;
  city_en: string;
  country_en: string;
  capacity: number;
}

// Verified, on-theme stadium/pitch stills for the host-venue cards. A wider set
// than before so neighbouring cards rarely repeat the same frame.
const STADIUM_IMAGES = [
  "1540379708242-14a809bef941", // stadium bowl at golden hour
  "1489944440615-453fc2b6a9a9", // floodlit, packed stadium at night
  "1522778526097-ce0a22ceb253", // empty stadium seats, blue hour
  "1556056504-5c7696c4c28d", // top-down floodlit pitch from the air
  "1459865264687-595d652de67e", // dewy pitch sideline, close up
  "1431324155629-1a6deb1dec8d", // a match under the floodlights
  "1577223625816-7546f13df25d", // the players' tunnel
  "1574629810360-7efbbe195018", // a ball struck in front of the stands
].map((id) => unsplashImg(id, 1200));

const COUNTRY: Record<string, Host> = {
  Mexico: "Mexico",
  Canada: "Canada",
  "United States": "USA",
  USA: "USA",
};

const TZ: Record<string, string> = {
  Mexico: "America/Mexico_City",
  Canada: "America/Toronto",
  "United States": "America/New_York",
  USA: "America/New_York",
};

const raw = rawStadiums as unknown as RawStadium[];

export const VENUES: Venue[] = raw.map((s, i) => ({
  id: s.id,
  name: s.name_en,
  fifaName: s.fifa_name,
  city: s.city_en,
  country: COUNTRY[s.country_en] ?? "USA",
  capacity: typeof s.capacity === "string" ? Number(s.capacity) || 0 : s.capacity,
  timezone: TZ[s.country_en] ?? "America/New_York",
  image: STADIUM_IMAGES[i % STADIUM_IMAGES.length]!,
  surface: "Hybrid grass",
}));

export const VENUES_BY_ID: Record<string, Venue> = Object.fromEntries(
  VENUES.map((v) => [v.id, v])
);

export function getVenue(id: string | null | undefined): Venue | undefined {
  if (!id) return undefined;
  return VENUES_BY_ID[id];
}
