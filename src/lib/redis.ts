import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";

let client: Redis | null = null;

/**
 * Upstash Redis singleton. Returns null in demo mode (no secrets configured),
 * mirroring the Supabase browser client pattern. `automaticDeserialization` is
 * disabled so we control JSON (de)serialization explicitly and stay robust
 * across SDK versions.
 */
export function getRedis(): Redis | null {
  if (!env.redis.url || !env.redis.token) return null;
  if (client) return client;
  client = new Redis({
    url: env.redis.url,
    token: env.redis.token,
    automaticDeserialization: false,
  });
  return client;
}
