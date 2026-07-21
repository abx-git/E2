/** Supabase connection: env (deploy) wins, else browser localStorage (solo static hosting). */

export const LOCAL_SUPABASE_STORAGE_KEY = "e2-supabase-connection";

export interface SupabaseConnection {
  url: string;
  key: string;
}

export type SupabaseConnectionSource = "env" | "local";

function trimOrNull(v: string | null | undefined): string | null {
  const t = v?.trim();
  return t ? t : null;
}

function readEnvConnection(): SupabaseConnection | null {
  const url = trimOrNull(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key =
    trimOrNull(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
    trimOrNull(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!url || !key) return null;
  return { url, key };
}

function readLocalConnection(): SupabaseConnection | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LOCAL_SUPABASE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SupabaseConnection>;
    const url = trimOrNull(parsed.url);
    const key = trimOrNull(parsed.key);
    if (!url || !key) return null;
    return { url, key };
  } catch {
    return null;
  }
}

/** Env first, then localStorage. */
export function getSupabaseConnection(): SupabaseConnection | null {
  return readEnvConnection() ?? readLocalConnection();
}

export function getSupabaseConnectionSource(): SupabaseConnectionSource | null {
  if (readEnvConnection()) return "env";
  if (readLocalConnection()) return "local";
  return null;
}

export function isEnvConfigured(): boolean {
  return readEnvConnection() !== null;
}

export function isCollabConfigured(): boolean {
  return getSupabaseConnection() !== null;
}

export function getSupabaseUrl(): string | null {
  return getSupabaseConnection()?.url ?? null;
}

export function getSupabasePublicKey(): string | null {
  return getSupabaseConnection()?.key ?? null;
}

export function getSupabaseConfig(): { url: string; anonKey: string } | null {
  const c = getSupabaseConnection();
  if (!c) return null;
  return { url: c.url, anonKey: c.key };
}

/** Persist browser-only credentials (ignored when env is set). */
export function saveLocalSupabaseConnection(connection: SupabaseConnection): { ok: true } | { ok: false; error: string } {
  const url = trimOrNull(connection.url);
  const key = trimOrNull(connection.key);
  if (!url || !key) {
    return { ok: false, error: "URL und Key sind erforderlich" };
  }
  if (!/^https:\/\//i.test(url)) {
    return { ok: false, error: "URL muss mit https:// beginnen" };
  }
  if (typeof window === "undefined") {
    return { ok: false, error: "Nur im Browser speicherbar" };
  }
  localStorage.setItem(LOCAL_SUPABASE_STORAGE_KEY, JSON.stringify({ url, key }));
  return { ok: true };
}

export function clearLocalSupabaseConnection(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LOCAL_SUPABASE_STORAGE_KEY);
}

export function getLocalSupabaseConnectionDraft(): SupabaseConnection {
  const local = readLocalConnection();
  return { url: local?.url ?? "", key: local?.key ?? "" };
}

export const ROOM_CODE_LENGTH = 6;
export const ROOM_TTL_DAYS = 14;
/** Debounce before writing board snapshot to Postgres (live peers poll/subscribe this). */
export const SNAPSHOT_DEBOUNCE_MS = 700;
/** Fallback poll when Realtime Broadcast / postgres_changes is unavailable. */
export const SNAPSHOT_POLL_MS = 1500;
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
