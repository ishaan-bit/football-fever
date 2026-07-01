import type { Match } from "@/types";
import { getTeam, getVenue } from "@/lib/data";

/* ------------------------------------------------------------------ *
 *  .ics (iCalendar) export for a single fixture.
 *  Builds a minimal, spec-valid VEVENT with a 1-hour VALARM reminder
 *  and triggers a client-side download. No deps, SSR-safe (guarded).
 * ------------------------------------------------------------------ */

const PRODID = "-//Football Fever//Fixtures//EN";

/** Format a Date as a UTC iCalendar timestamp: 20260630T160000Z. */
function toICSDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Escape text per RFC 5545 (commas, semicolons, backslashes, newlines). */
function escapeICS(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/** Human label for either resolved teams or projected bracket placeholders. */
export function matchTitle(match: Match): string {
  const home = getTeam(match.homeTeamId)?.name ?? match.homeLabel ?? "TBD";
  const away = getTeam(match.awayTeamId)?.name ?? match.awayLabel ?? "TBD";
  return `${home} vs ${away}`;
}

/** Build the raw .ics document for a fixture (kickoff → +2h window). */
export function buildICS(match: Match): string {
  const start = new Date(match.kickoff);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const venue = getVenue(match.venueId);
  const location = venue ? `${venue.name}, ${venue.city}, ${venue.country}` : "Venue TBD";
  const summary = `${matchTitle(match)} — FIFA World Cup 2026`;
  const description =
    "Football Fever watch party. Kick off, predict, and watch together.";

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${PRODID}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${match.id}@footballfever`,
    `DTSTAMP:${toICSDate(new Date())}`,
    `DTSTART:${toICSDate(start)}`,
    `DTEND:${toICSDate(end)}`,
    `SUMMARY:${escapeICS(summary)}`,
    `DESCRIPTION:${escapeICS(description)}`,
    `LOCATION:${escapeICS(location)}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeICS(`${matchTitle(match)} kicks off in 1 hour`)}`,
    "TRIGGER:-PT1H",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  // RFC 5545 wants CRLF line endings.
  return lines.join("\r\n");
}

/** Build the .ics and trigger a browser download. Safe no-op on the server. */
export function downloadICS(match: Match): void {
  if (typeof window === "undefined") return;
  const ics = buildICS(match);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${match.id}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
