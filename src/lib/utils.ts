import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* ------------------------------- Time / TZ ------------------------------ */

/** Format an ISO time in a target IANA timezone. Defaults to IST. */
export function formatInTz(
  iso: string,
  tz = "Asia/Kolkata",
  opts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" }
) {
  try {
    return new Intl.DateTimeFormat("en-GB", { timeZone: tz, ...opts }).format(new Date(iso));
  } catch {
    return new Intl.DateTimeFormat("en-GB", opts).format(new Date(iso));
  }
}

export function formatMatchDate(iso: string, tz = "Asia/Kolkata") {
  return formatInTz(iso, tz, { weekday: "short", day: "numeric", month: "short" });
}

export function formatKickoff(iso: string, tz = "Asia/Kolkata") {
  const time = formatInTz(iso, tz, { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${time} IST`;
}

export function isSameDay(a: string | Date, b: string | Date) {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

export function relativeTime(iso: string, now = Date.now()): string {
  const diff = new Date(iso).getTime() - now;
  const abs = Math.abs(diff);
  const mins = Math.round(abs / 60000);
  const hrs = Math.round(abs / 3_600_000);
  const days = Math.round(abs / 86_400_000);
  const fmt = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;
  const phrase =
    mins < 1 ? "now" : mins < 60 ? fmt(mins, "min") : hrs < 24 ? fmt(hrs, "hr") : fmt(days, "day");
  if (phrase === "now") return "now";
  return diff > 0 ? `in ${phrase}` : `${phrase} ago`;
}

export interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
  done: boolean;
}

export function countdownTo(iso: string, now = Date.now()): Countdown {
  const total = Math.max(0, new Date(iso).getTime() - now);
  return {
    total,
    done: total <= 0,
    days: Math.floor(total / 86_400_000),
    hours: Math.floor((total % 86_400_000) / 3_600_000),
    minutes: Math.floor((total % 3_600_000) / 60_000),
    seconds: Math.floor((total % 60_000) / 1000),
  };
}

/* -------------------------------- Numbers ------------------------------- */

/** Wrap a bare HSL token (e.g. "var(--gold)") into a usable CSS color, with
 *  optional alpha — our accent tokens store the H S L triplet, not a color. */
export const hslVar = (token: string, alpha?: number) =>
  alpha === undefined ? `hsl(${token})` : `hsl(${token} / ${alpha})`;

export const pct = (n: number, digits = 0) => `${(n * 100).toFixed(digits)}%`;
export const clamp = (n: number, min = 0, max = 1) => Math.min(max, Math.max(min, n));
export const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

export function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** Deterministic, seedable PRNG (mulberry32) — keeps SSR/CSR output identical. */
export function seededRandom(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable hash for strings -> int seed. */
export function hashSeed(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function pickFrom<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)] as T;
}

export const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export function formatCurrencyINR(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}
