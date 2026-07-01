import "server-only";
import { env, features } from "@/lib/env";
import type { Match, Team, Venue } from "@/types";
import {
  normalizeGame,
  normalizeStadium,
  normalizeTeam,
  type RawGame,
  type RawStadium,
  type RawTeam,
} from "./normalize";

/**
 * Thin, resilient client for the World Cup 2026 API.
 * The UI never imports this directly — it goes through `lib/worldcup/index.ts`,
 * which falls back to the bundled seed dataset whenever the API is unavailable
 * or unconfigured. This keeps the app fully decoupled from the data source.
 */

let cachedToken: { value: string; expires: number } | null = null;

async function getToken(): Promise<string | null> {
  if (env.worldcup.token) return env.worldcup.token;
  if (cachedToken && cachedToken.expires > Date.now()) return cachedToken.value;
  if (!env.worldcup.email || !env.worldcup.password) return null;

  try {
    const res = await fetch(`${env.worldcup.baseUrl}/auth/authenticate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: env.worldcup.email,
        password: env.worldcup.password,
      }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { token?: string };
    if (!data.token) return null;
    // Tokens are valid 84 days; refresh ours well before then.
    cachedToken = { value: data.token, expires: Date.now() + 80 * 864e5 };
    return data.token;
  } catch {
    return null;
  }
}

async function apiGet<T>(path: string, revalidate = 30): Promise<T | null> {
  // The /get/* endpoints are public; a token is only added when configured.
  const token = await getToken();
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  try {
    const res = await fetch(`${env.worldcup.baseUrl}${path}`, {
      headers,
      next: { revalidate },
      // Never let a slow upstream hang the page — fall back to seed instead.
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchTeams(): Promise<Team[] | null> {
  if (!features.worldcupApi) return null;
  const data = await apiGet<RawTeam[]>("/get/teams", 3600);
  return data ? data.map(normalizeTeam) : null;
}

export async function fetchStadiums(): Promise<Venue[] | null> {
  if (!features.worldcupApi) return null;
  const data = await apiGet<RawStadium[]>("/get/stadiums", 3600);
  return data ? data.map(normalizeStadium) : null;
}

export async function fetchMatches(): Promise<Match[] | null> {
  if (!features.worldcupApi) return null;
  // Live scores refresh fast; everything else is cached longer upstream.
  const data = await apiGet<{ games: RawGame[] }>("/get/games", 15);
  if (!data?.games) return null;
  return data.games.map(normalizeGame);
}

export async function fetchMatch(id: string): Promise<Match | null> {
  if (!features.worldcupApi) return null;
  const data = await apiGet<RawGame>(`/get/game/${id}`, 10);
  return data ? normalizeGame(data) : null;
}

export async function apiHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${env.worldcup.baseUrl}/health`, { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}
