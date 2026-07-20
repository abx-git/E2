import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabasePublicKey, getSupabaseUrl } from "@/lib/collab/config";

export async function createClient() {
  const cookieStore = await cookies();
  const url = getSupabaseUrl();
  const key = getSupabasePublicKey();
  if (!url || !key) {
    throw new Error("Supabase env missing (NEXT_PUBLIC_SUPABASE_URL / PUBLISHABLE_KEY)");
  }

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component — middleware refreshes sessions.
        }
      },
    },
  });
}
