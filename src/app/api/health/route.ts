import { NextResponse } from "next/server";
import { dataSourceStatus } from "@/lib/worldcup";
import { features } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const data = await dataSourceStatus();
  return NextResponse.json({
    status: "ok",
    app: "football-fever",
    time: new Date().toISOString(),
    data,
    integrations: {
      liveData: features.liveData,
      supabase: features.supabase,
      livekit: features.livekit,
      redis: features.redis,
      firebase: features.firebase,
      anthropic: features.anthropic,
    },
  });
}
