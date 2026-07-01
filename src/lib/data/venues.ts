import type { Venue, Host } from "@/types";
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

const STADIUM_IMAGES = [
  "https://images.unsplash.com/photo-1540379708242-14a809bef941?w=1200&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1522778526097-ce0a22ceb253?w=1200&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1459865264687-595d652de67e?w=1200&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1577223625816-7546f13df25d?w=1200&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1551958219-acbc608c6377?w=1200&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&q=80&auto=format&fit=crop",
];

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
