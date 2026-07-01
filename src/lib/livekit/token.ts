"use server";
import { AccessToken } from "livekit-server-sdk";
import { env, features } from "@/lib/env";

export interface CallToken {
  token: string;
  url: string;
  room: string;
}

/**
 * Mint a LiveKit access token for a voice/video watch-party room.
 * Returns null when LiveKit isn't configured — the client then renders a
 * fully-interactive local mock of the call (avatars, mute states, grid).
 */
export async function createCallToken(
  room: string,
  identity: string,
  name: string,
  opts: { canPublish?: boolean } = {}
): Promise<CallToken | null> {
  if (!features.livekit) return null;
  try {
    const at = new AccessToken(env.livekit.apiKey!, env.livekit.apiSecret!, {
      identity,
      name,
      ttl: "3h",
    });
    at.addGrant({
      roomJoin: true,
      room,
      canPublish: opts.canPublish ?? true,
      canSubscribe: true,
      canPublishData: true,
    });
    const token = await at.toJwt();
    return { token, url: env.livekit.url!, room };
  } catch {
    return null;
  }
}
