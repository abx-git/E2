import type { BoardImportPayload, BoardSnapshotV1 } from "@/lib/storm-json";
import {
  boardSnapshotToReplacePayload,
  buildBoardSnapshot,
  isBoardSnapshot,
} from "@/lib/storm-json";
import {
  generateHostToken,
  generateRoomCode,
  hashHostToken,
  ROOM_TTL_DAYS,
} from "@/lib/collab/config";
import { ensureAnonSession, getSupabase } from "@/lib/collab/supabase";

export interface CollabRoom {
  id: string;
  code: string;
  title: string;
  expiresAt: string;
}

export interface CreateRoomResult {
  room: CollabRoom;
  hostToken: string;
  snapshot: BoardSnapshotV1;
}

export interface JoinRoomResult {
  room: CollabRoom;
  payload: BoardImportPayload;
  yjsState: Uint8Array | null;
  revision: number;
  isHost: boolean;
}

function mapRoom(row: {
  id: string;
  code: string;
  title: string;
  expires_at: string;
}): CollabRoom {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    expiresAt: row.expires_at,
  };
}

export async function createCollabRoom(
  title: string,
  initial: BoardImportPayload,
): Promise<CreateRoomResult | { error: string }> {
  const sb = getSupabase();
  if (!sb) return { error: "Supabase nicht konfiguriert" };

  const auth = await ensureAnonSession();
  if ("error" in auth) return auth;

  const hostToken = generateHostToken();
  const hostTokenHash = await hashHostToken(hostToken);
  const code = generateRoomCode();
  const expires = new Date();
  expires.setDate(expires.getDate() + ROOM_TTL_DAYS);

  const { data: roomRow, error: roomErr } = await sb
    .from("rooms")
    .insert({
      code,
      title: title || "Event Storming Board",
      host_token_hash: hostTokenHash,
      expires_at: expires.toISOString(),
    })
    .select("id, code, title, expires_at")
    .single();

  if (roomErr || !roomRow) {
    return { error: roomErr?.message ?? "Raum konnte nicht erstellt werden" };
  }

  const snapshot = buildBoardSnapshot({ ...initial, title: title || initial.title });
  const { error: snapErr } = await sb.from("board_snapshots").insert({
    room_id: roomRow.id,
    snapshot,
    revision: 1,
  });

  if (snapErr) {
    await sb.from("rooms").delete().eq("id", roomRow.id);
    return { error: snapErr.message };
  }

  return {
    room: mapRoom(roomRow),
    hostToken,
    snapshot,
  };
}

export async function joinCollabRoom(
  code: string,
  hostToken?: string | null,
): Promise<JoinRoomResult | { error: string }> {
  const sb = getSupabase();
  if (!sb) return { error: "Supabase nicht konfiguriert" };

  const auth = await ensureAnonSession();
  if ("error" in auth) return auth;

  const normalized = code.trim().toUpperCase();
  const { data: roomRow, error: roomErr } = await sb
    .from("rooms")
    .select("id, code, title, expires_at, host_token_hash")
    .eq("code", normalized)
    .maybeSingle();

  if (roomErr) return { error: roomErr.message };
  if (!roomRow) return { error: "Raum nicht gefunden oder abgelaufen" };

  if (new Date(roomRow.expires_at).getTime() <= Date.now()) {
    return { error: "Raum ist abgelaufen" };
  }

  const { data: snapRow, error: snapErr } = await sb
    .from("board_snapshots")
    .select("snapshot, yjs_state, revision")
    .eq("room_id", roomRow.id)
    .maybeSingle();

  if (snapErr) return { error: snapErr.message };
  if (!snapRow?.snapshot || !isBoardSnapshot(snapRow.snapshot)) {
    return { error: "Kein gültiger Board-Snapshot im Raum" };
  }

  let isHost = false;
  if (hostToken) {
    const hash = await hashHostToken(hostToken);
    isHost = hash === roomRow.host_token_hash;
  }

  let yjsState: Uint8Array | null = null;
  if (snapRow.yjs_state) {
    const raw = snapRow.yjs_state as string | Uint8Array;
    if (typeof raw === "string") {
      // Supabase may return bytea as hex \x...
      const hex = raw.startsWith("\\x") ? raw.slice(2) : raw;
      if (/^[0-9a-fA-F]+$/.test(hex) && hex.length % 2 === 0) {
        yjsState = new Uint8Array(hex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
      }
    } else if (raw instanceof Uint8Array) {
      yjsState = raw;
    }
  }

  return {
    room: mapRoom(roomRow),
    payload: boardSnapshotToReplacePayload(snapRow.snapshot as BoardSnapshotV1),
    yjsState,
    revision: Number(snapRow.revision) || 1,
    isHost,
  };
}

export async function saveCollabSnapshot(args: {
  roomId: string;
  snapshot: BoardSnapshotV1;
  yjsState?: Uint8Array | null;
  revision: number;
}): Promise<{ revision: number } | { error: string }> {
  const sb = getSupabase();
  if (!sb) return { error: "Supabase nicht konfiguriert" };

  const nextRevision = args.revision + 1;
  const update: Record<string, unknown> = {
    snapshot: args.snapshot,
    revision: nextRevision,
    updated_at: new Date().toISOString(),
  };
  if (args.yjsState) {
    update.yjs_state = Array.from(args.yjsState);
  }

  const { error } = await sb
    .from("board_snapshots")
    .update(update)
    .eq("room_id", args.roomId);

  if (error) return { error: error.message };

  await sb
    .from("rooms")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", args.roomId);

  return { revision: nextRevision };
}

/** Lightweight fetch for live sync / poll. */
export async function fetchCollabSnapshot(roomId: string): Promise<
  | { revision: number; payload: BoardImportPayload; yjsState: Uint8Array | null }
  | { error: string }
> {
  const sb = getSupabase();
  if (!sb) return { error: "Supabase nicht konfiguriert" };

  const { data: snapRow, error } = await sb
    .from("board_snapshots")
    .select("snapshot, yjs_state, revision")
    .eq("room_id", roomId)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!snapRow?.snapshot || !isBoardSnapshot(snapRow.snapshot)) {
    return { error: "Kein gültiger Board-Snapshot im Raum" };
  }

  let yjsState: Uint8Array | null = null;
  if (snapRow.yjs_state) {
    const raw = snapRow.yjs_state as string | Uint8Array;
    if (typeof raw === "string") {
      const hex = raw.startsWith("\\x") ? raw.slice(2) : raw;
      if (/^[0-9a-fA-F]+$/.test(hex) && hex.length % 2 === 0) {
        yjsState = new Uint8Array(hex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
      }
    } else if (raw instanceof Uint8Array) {
      yjsState = raw;
    }
  }

  return {
    revision: Number(snapRow.revision) || 1,
    payload: boardSnapshotToReplacePayload(snapRow.snapshot as BoardSnapshotV1),
    yjsState,
  };
}

export async function verifyHostToken(roomId: string, hostToken: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { data } = await sb
    .from("rooms")
    .select("host_token_hash")
    .eq("id", roomId)
    .maybeSingle();
  if (!data) return false;
  const hash = await hashHostToken(hostToken);
  return hash === data.host_token_hash;
}
