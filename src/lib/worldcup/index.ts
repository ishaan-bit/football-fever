import "server-only";
import type { Match, Team, Venue } from "@/types";
import { features } from "@/lib/env";
import { fetchMatches, fetchTeams, fetchStadiums, apiHealth } from "./client";
import {
  getMatches as seedMatches,
  ALL_TEAMS,
  ALL_VENUES,
} from "@/lib/data";

/**
 * The public data facade. Server code calls these; they transparently use the
 * live API when configured and fall back to the deterministic seed dataset.
 * Nothing else in the app needs to know which source is live.
 */

export interface DataSourceStatus {
  source: "live-api" | "seed";
  healthy: boolean;
  checkedAt: string;
}

export async function loadMatches(now = Date.now()): Promise<Match[]> {
  if (features.worldcupApi) {
    const live = await fetchMatches();
    if (live && live.length) return live;
  }
  return seedMatches(now);
}

export async function loadTeams(): Promise<Team[]> {
  if (features.worldcupApi) {
    const live = await fetchTeams();
    if (live && live.length) return live;
  }
  return ALL_TEAMS;
}

export async function loadVenues(): Promise<Venue[]> {
  if (features.worldcupApi) {
    const live = await fetchStadiums();
    if (live && live.length) return live;
  }
  return ALL_VENUES;
}

export async function dataSourceStatus(): Promise<DataSourceStatus> {
  if (!features.worldcupApi) {
    return { source: "seed", healthy: true, checkedAt: new Date().toISOString() };
  }
  const healthy = await apiHealth();
  return {
    source: healthy ? "live-api" : "seed",
    healthy,
    checkedAt: new Date().toISOString(),
  };
}

export { fetchMatch } from "./client";
