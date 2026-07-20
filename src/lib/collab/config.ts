/** Public env for optional Supabase collab. Missing → Solo-only. */

export function getSupabaseUrl(): string | null {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || null;
}

/** Prefer publishable key (new Supabase); fall back to classic anon key. */
export function getSupabasePublicKey(): string | null {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    null
  );
}

export function isCollabConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabasePublicKey());
}

export function getSupabaseConfig(): { url: string; anonKey: string } | null {
  const url = getSupabaseUrl();
  const anonKey = getSupabasePublicKey();
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export const ROOM_CODE_LENGTH = 6;
export const ROOM_TTL_DAYS = 14;
export const SNAPSHOT_DEBOUNCE_MS = 4000;
export const HOST_TOKEN_STORAGE_KEY = "e2-collab-host-token";
export const DISPLAY_NAME_STORAGE_KEY = "e2-collab-display-name";

export function generateRoomCode(length = ROOM_CODE_LENGTH): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i]! % alphabet.length]!;
  }
  return out;
}

export function generateHostToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashHostToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export const PRESENCE_COLORS = [
  "#2a9d8f",
  "#e9c46a",
  "#e76f51",
  "#457b9d",
  "#9b5de5",
  "#00bbf9",
  "#f15bb5",
  "#fee440",
];

export function colorForUserId(userId: string): string {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) >>> 0;
  return PRESENCE_COLORS[h % PRESENCE_COLORS.length]!;
}
