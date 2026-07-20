import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseConnection, isCollabConfigured } from "@/lib/collab/config";
import { createClient } from "@/utils/supabase/client";

let client: SupabaseClient | null = null;
let clientKey: string | null = null;

function connectionCacheKey(): string | null {
  const c = getSupabaseConnection();
  return c ? `${c.url}\0${c.key}` : null;
}

/** Drop cached client after local credentials change. */
export function resetSupabaseClient(): void {
  client = null;
  clientKey = null;
}

export function getSupabase(): SupabaseClient | null {
  if (!isCollabConfigured()) {
    resetSupabaseClient();
    return null;
  }
  const key = connectionCacheKey();
  if (!client || clientKey !== key) {
    client = createClient();
    clientKey = key;
  }
  return client;
}

/** Ensure anonymous session for Awareness user id. */
export async function ensureAnonSession(): Promise<{ userId: string } | { error: string }> {
  const sb = getSupabase();
  if (!sb) return { error: "Supabase nicht konfiguriert" };

  const { data: existing } = await sb.auth.getSession();
  if (existing.session?.user?.id) {
    return { userId: existing.session.user.id };
  }

  const { data, error } = await sb.auth.signInAnonymously();
  if (error || !data.user) {
    const msg = error?.message ?? "Anonymous Auth fehlgeschlagen";
    if (/anonymous sign-ins are disabled/i.test(msg)) {
      return {
        error:
          "Anonymous Auth ist in Supabase deaktiviert. Dashboard: Authentication → Providers → Anonymous aktivieren.",
      };
    }
    return { error: msg };
  }
  return { userId: data.user.id };
}
