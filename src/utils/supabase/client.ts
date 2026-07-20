import { createBrowserClient } from "@supabase/ssr";

import { getSupabasePublicKey, getSupabaseUrl } from "@/lib/collab/config";

export function createClient() {
  const url = getSupabaseUrl();
  const key = getSupabasePublicKey();
  if (!url || !key) {
    throw new Error("Supabase env missing (NEXT_PUBLIC_SUPABASE_URL / PUBLISHABLE_KEY)");
  }
  return createBrowserClient(url, key);
}
