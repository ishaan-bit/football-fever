import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env, features } from "@/lib/env";

/** Server Supabase client bound to the request cookies. Null in demo mode. */
export async function getSupabaseServer(): Promise<SupabaseClient | null> {
  if (!features.supabase) return null;
  const cookieStore = await cookies();
  return createServerClient(env.supabase.url!, env.supabase.anonKey!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) => {
        try {
          toSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options as any)
          );
        } catch {
          /* called from a Server Component — safe to ignore */
        }
      },
    },
  });
}
