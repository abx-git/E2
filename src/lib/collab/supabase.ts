import type { SupabaseClient } from "@supabase/supabase-js";

import { isCollabConfigured } from "@/lib/collab/config";
import { createClient } from "@/utils/supabase/client";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isCollabConfigured()) return null;
  if (!client) {
    client = createClient();
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
    return { error: error?.message ?? "Anonymous Auth fehlgeschlagen (Provider aktivieren?)" };
  }
  return { userId: data.user.id };
}
