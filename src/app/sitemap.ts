import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { BASE_MATCHES } from "@/lib/data/fixtures";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = env.appUrl.replace(/\/$/, "");
  const routes = ["", "/fixtures", "/oracle", "/predictions", "/games", "/trash-talk", "/betting", "/leaderboard"].map(
    (path) => ({ url: `${base}${path}`, lastModified: new Date("2026-06-30") })
  );
  const matches = BASE_MATCHES.map((m) => ({
    url: `${base}/match/${m.id}`,
    lastModified: new Date("2026-06-30"),
  }));
  return [...routes, ...matches];
}
