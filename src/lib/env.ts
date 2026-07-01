/**
 * Centralized, typed environment access + feature detection.
 * The golden rule of this app: it must run with ZERO secrets. Every integration
 * is feature-flagged off these helpers and falls back to a local implementation.
 */

const str = (v: string | undefined) => (v && v.trim().length > 0 ? v.trim() : undefined);

// On Vercel these are injected server-side; used so the sitemap / metadataBase
// resolve to the real deployment URL instead of localhost when no explicit
// NEXT_PUBLIC_APP_URL is configured. Server-only usage, so no client mismatch.
const vercelUrl = str(process.env.VERCEL_PROJECT_PRODUCTION_URL) ?? str(process.env.VERCEL_URL);

export const env = {
  appUrl:
    str(process.env.NEXT_PUBLIC_APP_URL) ??
    (vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000"),
  appName: str(process.env.NEXT_PUBLIC_APP_NAME) ?? "Football Fever",
  defaultTz: str(process.env.NEXT_PUBLIC_DEFAULT_TZ) ?? "Asia/Kolkata",

  worldcup: {
    baseUrl: str(process.env.WORLDCUP_API_BASE_URL) ?? "https://worldcup26.ir",
    token: str(process.env.WORLDCUP_API_TOKEN),
    email: str(process.env.WORLDCUP_API_EMAIL),
    password: str(process.env.WORLDCUP_API_PASSWORD),
    pollMs: Number(str(process.env.NEXT_PUBLIC_LIVE_POLL_MS) ?? "20000"),
  },

  supabase: {
    url: str(process.env.NEXT_PUBLIC_SUPABASE_URL),
    anonKey: str(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    serviceKey: str(process.env.SUPABASE_SERVICE_ROLE_KEY),
  },

  livekit: {
    url: str(process.env.NEXT_PUBLIC_LIVEKIT_URL),
    apiKey: str(process.env.LIVEKIT_API_KEY),
    apiSecret: str(process.env.LIVEKIT_API_SECRET),
  },

  redis: {
    url: str(process.env.UPSTASH_REDIS_REST_URL),
    token: str(process.env.UPSTASH_REDIS_REST_TOKEN),
  },

  anthropic: {
    apiKey: str(process.env.ANTHROPIC_API_KEY),
    model: str(process.env.ANTHROPIC_MODEL) ?? "claude-opus-4-8",
  },

  firebase: {
    projectId: str(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
    apiKey: str(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
    appId: str(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
  },
} as const;

/** Feature flags derived from configured secrets. */
export const features = {
  /** True when the World Cup API base URL is set. The public endpoints
   *  (/get/games, /get/teams, /get/stadiums) need no auth, so live data is
   *  available whenever a base URL exists — a token only unlocks private ones. */
  get worldcupApi() {
    return Boolean(env.worldcup.baseUrl);
  },
  /** True when auth credentials are configured (unlocks any private endpoints). */
  get liveData() {
    return Boolean(env.worldcup.token || (env.worldcup.email && env.worldcup.password));
  },
  get supabase() {
    return Boolean(env.supabase.url && env.supabase.anonKey);
  },
  get livekit() {
    return Boolean(env.livekit.url && env.livekit.apiKey && env.livekit.apiSecret);
  },
  get redis() {
    return Boolean(env.redis.url && env.redis.token);
  },
  get anthropic() {
    return Boolean(env.anthropic.apiKey);
  },
  /** Firebase (Firestore) — the real backend for presence, chat and alerts. */
  get firebase() {
    return Boolean(env.firebase.projectId && env.firebase.apiKey && env.firebase.appId);
  },
};

/** Client-safe view of which integrations are live (no secrets leak). */
export const publicFeatures = {
  supabase: Boolean(env.supabase.url && env.supabase.anonKey),
  livekit: Boolean(env.livekit.url),
  firebase: Boolean(env.firebase.projectId && env.firebase.apiKey && env.firebase.appId),
};
