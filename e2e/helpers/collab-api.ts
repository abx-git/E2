import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  generateHostToken,
  generateRoomCode,
  hashHostToken,
  ROOM_TTL_DAYS,
} from "../../src/lib/collab/config";
import {
  buildBoardSnapshot,
  createDefaultBoardDocument,
  createEmptyBoardView,
} from "../../src/lib/storm-json";
import { DEFAULT_APPEARANCE } from "../../src/lib/board-appearance";

export function getSupabaseE2EConfig(): { url: string; key: string } | null {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    "https://gedkcemrcdmmhkcqcbdw.supabase.co";
  const key = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    ""
  ).trim();
  if (!url || !key) return null;
  return { url, key };
}

export function hasSupabaseCredentials(): boolean {
  return getSupabaseE2EConfig() !== null;
}

function createServiceClient(): SupabaseClient {
  const cfg = getSupabaseE2EConfig();
  if (!cfg) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or ANON_KEY) fehlt für Live-Collab-E2E",
    );
  }
  return createClient(cfg.url, cfg.key);
}

async function ensureAnon(sb: SupabaseClient): Promise<void> {
  const { data: existing } = await sb.auth.getSession();
  if (existing.session) return;
  const { error } = await sb.auth.signInAnonymously();
  if (error) {
    throw new Error(`Anonymous Auth: ${error.message}`);
  }
}

export async function createCollabTestRoom(title: string): Promise<{ id: string; code: string }> {
  const sb = createServiceClient();
  await ensureAnon(sb);

  const hostToken = generateHostToken();
  const hostTokenHash = await hashHostToken(hostToken);
  const code = generateRoomCode();
  const expires = new Date();
  expires.setDate(expires.getDate() + ROOM_TTL_DAYS);

  const { data: roomRow, error: roomErr } = await sb
    .from("rooms")
    .insert({
      code,
      title,
      host_token_hash: hostTokenHash,
      expires_at: expires.toISOString(),
    })
    .select("id, code")
    .single();

  if (roomErr || !roomRow) {
    throw new Error(roomErr?.message ?? "Raum-Insert fehlgeschlagen");
  }

  const payload = createDefaultBoardDocument({
    title: "E2E Collab Smoke",
    activeViewId: "v1",
    views: [createEmptyBoardView({ id: "v1", name: "Board" })],
    appearance: { ...DEFAULT_APPEARANCE },
  });
  const snapshot = buildBoardSnapshot(payload);

  const { error: snapErr } = await sb.from("board_snapshots").insert({
    room_id: roomRow.id,
    snapshot,
    revision: 1,
  });

  if (snapErr) {
    await sb.from("rooms").delete().eq("id", roomRow.id);
    throw new Error(snapErr.message);
  }

  return { id: roomRow.id as string, code: roomRow.code as string };
}

export async function deleteCollabTestRoom(roomId: string): Promise<void> {
  const sb = createServiceClient();
  await ensureAnon(sb);
  await sb.from("rooms").delete().eq("id", roomId);
}
