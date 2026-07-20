import { createBrowserClient } from "@supabase/ssr";

import { getSupabasePublicKey, getSupabaseUrl } from "@/lib/collab/config";

export function createClient() {
  const url = getSupabaseUrl();
  const key = getSupabasePublicKey();
  if (!url || !key) {
    throw new Error(
      "Supabase nicht konfiguriert (Env oder lokale Browser-Einstellungen unter Raum)",
    );
  }
  return createBrowserClient(url, key);
}
