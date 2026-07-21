import { create } from "zustand";
import type { RealtimeChannel } from "@supabase/supabase-js";
import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";

import {
  colorForUserId,
  DISPLAY_NAME_STORAGE_KEY,
  getSupabaseConnectionSource,
  HOST_TOKEN_STORAGE_KEY,
  isCollabConfigured,
  SNAPSHOT_DEBOUNCE_MS,
  SNAPSHOT_POLL_MS,
} from "@/lib/collab/config";
import {
  createCollabRoom,
  fetchCollabSnapshot,
  joinCollabRoom,
  saveCollabSnapshot,
  type CollabRoom,
} from "@/lib/collab/rooms";
import { getSupabase, resetSupabaseClient } from "@/lib/collab/supabase";
import { SupabaseYjsProvider } from "@/lib/collab/supabase-yjs-provider";
import {
  applyPayloadToYDoc,
  applyYDocState,
  createBoardYDoc,
  encodeYDocState,
  LOCAL_ORIGIN,
  REMOTE_ORIGIN,
  readPayloadFromYDoc,
} from "@/lib/collab/yjs-board";
import { buildBoardSnapshot, type BoardImportPayload } from "@/lib/storm-json";
import {
  boardImportPayloadFromStore,
  useStormBoardStore,
} from "@/store/storm-board-store";

export interface PresencePeer {
  clientId: number;
  userId: string;
  name: string;
  color: string;
}

interface CollabState {
  configured: boolean;
  connectionSource: "env" | "local" | null;
  active: boolean;
  connecting: boolean;
  status: "idle" | "connecting" | "connected" | "disconnected" | "error";
  error: string | null;
  room: CollabRoom | null;
  isHost: boolean;
  displayName: string;
  userId: string | null;
  peers: PresencePeer[];
  revision: number;

  refreshConfigured: () => void;
  setDisplayName: (name: string) => void;
  createRoom: (title?: string) => Promise<{ ok: true; code: string } | { ok: false; error: string }>;
  joinRoom: (
    code: string,
    displayName?: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  leaveRoom: () => void;
  pushLocalToYjs: () => void;
}

let doc: Y.Doc | null = null;
let awareness: Awareness | null = null;
let provider: SupabaseYjsProvider | null = null;
let snapshotChannel: RealtimeChannel | null = null;
let snapshotTimer: ReturnType<typeof setTimeout> | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let applyingRemote = false;
let savingSnapshot = false;
let storeUnsub: (() => void) | null = null;
/** ISO timestamp of last applied/saved snapshot — pull uses this, not inflated local revision. */
let lastAppliedUpdatedAt = "";
/** True while local domain edits are waiting to be written. */
let localDirty = false;

function hostTokenKey(code: string): string {
  return `${HOST_TOKEN_STORAGE_KEY}:${code}`;
}

function clearSnapshotTimer(): void {
  if (snapshotTimer) {
    clearTimeout(snapshotTimer);
    snapshotTimer = null;
  }
}

function clearPollTimer(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function scheduleSnapshot(roomId: string, setRevision: (n: number) => void): void {
  localDirty = true;
  clearSnapshotTimer();
  snapshotTimer = setTimeout(() => {
    void (async () => {
      snapshotTimer = null;
      if (!doc || applyingRemote || savingSnapshot) return;
      const payload = readPayloadFromYDoc(doc) ?? boardImportPayloadFromStore();
      const snapshot = buildBoardSnapshot(payload);
      const yjsState = encodeYDocState(doc);
      savingSnapshot = true;
      try {
        // Always rebase onto the server revision so local clocks can't drift ahead.
        const latest = await fetchCollabSnapshot(roomId);
        if ("error" in latest) return;
        let baseRevision = latest.revision;

        let result = await saveCollabSnapshot({
          roomId,
          snapshot,
          yjsState,
          revision: baseRevision,
        });

        if ("conflict" in result && result.conflict) {
          result = await saveCollabSnapshot({
            roomId,
            snapshot,
            yjsState,
            revision: result.revision,
          });
        }

        if ("error" in result || "conflict" in result) return;

        lastAppliedUpdatedAt = result.updatedAt;
        localDirty = false;
        setRevision(result.revision);
      } finally {
        savingSnapshot = false;
      }
    })();
  }, SNAPSHOT_DEBOUNCE_MS);
}

function syncPeers(set: (p: Partial<CollabState>) => void): void {
  if (!awareness) {
    set({ peers: [] });
    return;
  }
  const peers: PresencePeer[] = [];
  awareness.getStates().forEach((state, clientId) => {
    const user = state.user as { id?: string; name?: string; color?: string } | undefined;
    if (!user?.name) return;
    peers.push({
      clientId,
      userId: user.id ?? String(clientId),
      name: user.name,
      color: user.color ?? "#2a9d8f",
    });
  });
  set({ peers });
}

function teardownSession(): void {
  clearSnapshotTimer();
  clearPollTimer();
  storeUnsub?.();
  storeUnsub = null;
  if (snapshotChannel) {
    const sb = getSupabase();
    if (sb) void sb.removeChannel(snapshotChannel);
    snapshotChannel = null;
  }
  provider?.destroy();
  provider = null;
  awareness?.destroy();
  awareness = null;
  doc?.destroy();
  doc = null;
  applyingRemote = false;
  savingSnapshot = false;
  lastAppliedUpdatedAt = "";
  localDirty = false;
}

/** Apply remote board without wiping local viewport / selection / undo-hostile UX. */
function applyPayloadToStore(payload: BoardImportPayload): void {
  applyingRemote = true;
  try {
    const current = useStormBoardStore.getState();
    const elementIds = new Set(payload.elements.map((e) => e.id));
    const relationIds = new Set(payload.relations.map((r) => r.id));
    const contextRelationIds = new Set((payload.contextRelations ?? []).map((r) => r.id));
    const swimlaneIds = new Set(payload.swimlanes.map((s) => s.id));
    const bcIds = new Set(payload.boundedContexts.map((b) => b.id));

    useStormBoardStore.setState({
      title: payload.title,
      workshopFormat: payload.workshopFormat,
      facilitatorEnabled: payload.facilitatorEnabled,
      facilitatorPhase: payload.facilitatorPhase,
      elements: payload.elements,
      relations: payload.relations,
      contextRelations: payload.contextRelations ?? [],
      swimlanes: payload.swimlanes,
      boundedContexts: payload.boundedContexts,
      timeline: payload.timeline,
      // Keep local camera — collaborators shouldn't steal pan/zoom.
      viewport: current.viewport,
      glossary: payload.glossary,
      appearance: payload.appearance,
      snapToTimeline: payload.snapToTimeline,
      snapToGrid: payload.snapToGrid,
      selectedElementIds: current.selectedElementIds.filter((id) => elementIds.has(id)),
      selectedRelationId:
        current.selectedRelationId && relationIds.has(current.selectedRelationId)
          ? current.selectedRelationId
          : null,
      selectedContextRelationId:
        current.selectedContextRelationId &&
        contextRelationIds.has(current.selectedContextRelationId)
          ? current.selectedContextRelationId
          : null,
      selectedSwimlaneId:
        current.selectedSwimlaneId && swimlaneIds.has(current.selectedSwimlaneId)
          ? current.selectedSwimlaneId
          : null,
      selectedBoundedContextId:
        current.selectedBoundedContextId && bcIds.has(current.selectedBoundedContextId)
          ? current.selectedBoundedContextId
          : null,
      past: [],
      future: [],
      gestureActive: false,
      gestureSnapshotTaken: false,
    });
  } finally {
    applyingRemote = false;
  }
}

function applyRemoteSnapshot(
  payload: BoardImportPayload,
  revision: number,
  yjsState: Uint8Array | null,
  updatedAt: string,
  setRevision: (n: number) => void,
): void {
  if (!doc) return;
  if (yjsState && yjsState.byteLength > 0) {
    try {
      applyYDocState(doc, yjsState, REMOTE_ORIGIN);
    } catch {
      applyPayloadToYDoc(doc, payload, REMOTE_ORIGIN);
    }
  } else {
    applyPayloadToYDoc(doc, payload, REMOTE_ORIGIN);
  }
  const fromDoc = readPayloadFromYDoc(doc) ?? payload;
  applyPayloadToStore(fromDoc);
  lastAppliedUpdatedAt = updatedAt;
  localDirty = false;
  setRevision(revision);
}

async function pullRemoteIfNewer(
  roomId: string,
  _getRevision: () => number,
  setRevision: (n: number) => void,
): Promise<void> {
  if (applyingRemote || savingSnapshot || !doc) return;
  if (useStormBoardStore.getState().gestureActive) return;
  // Don't overwrite in-flight local edits; save path will LWW afterwards.
  if (localDirty || snapshotTimer) return;

  const result = await fetchCollabSnapshot(roomId);
  if ("error" in result) return;
  // updated_at is the source of truth — local revision can drift ahead and hide peer writes.
  if (result.updatedAt <= lastAppliedUpdatedAt) return;
  applyRemoteSnapshot(
    result.payload,
    result.revision,
    result.yjsState,
    result.updatedAt,
    setRevision,
  );
}

function bindStoreToYjs(
  roomId: string,
  get: () => CollabState,
  set: (p: Partial<CollabState>) => void,
): void {
  storeUnsub?.();
  let wasGesture = useStormBoardStore.getState().gestureActive;

  storeUnsub = useStormBoardStore.subscribe((state, prev) => {
    if (!doc || applyingRemote || !get().active) return;

    const gestureEnded = wasGesture && !state.gestureActive;
    wasGesture = state.gestureActive;

    if (state.gestureActive) return;

    const domainChanged =
      gestureEnded ||
      state.title !== prev.title ||
      state.elements !== prev.elements ||
      state.relations !== prev.relations ||
      state.contextRelations !== prev.contextRelations ||
      state.swimlanes !== prev.swimlanes ||
      state.boundedContexts !== prev.boundedContexts ||
      state.timeline !== prev.timeline ||
      state.glossary !== prev.glossary ||
      state.appearance !== prev.appearance ||
      state.workshopFormat !== prev.workshopFormat ||
      state.facilitatorEnabled !== prev.facilitatorEnabled ||
      state.facilitatorPhase !== prev.facilitatorPhase ||
      state.snapToTimeline !== prev.snapToTimeline ||
      state.snapToGrid !== prev.snapToGrid;

    if (!domainChanged) return;

    const payload = boardImportPayloadFromStore();
    applyPayloadToYDoc(doc, payload, LOCAL_ORIGIN);
    scheduleSnapshot(roomId, (n) => set({ revision: n }));
  });
}

function startSnapshotSync(
  roomId: string,
  get: () => CollabState,
  set: (p: Partial<CollabState>) => void,
): void {
  clearPollTimer();
  const sb = getSupabase();
  if (!sb) return;

  // Primary reliable path: listen to Postgres row updates (same data reload uses).
  snapshotChannel = sb
    .channel(`snapshot-row:${roomId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "board_snapshots",
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => {
        const row = payload.new as {
          revision?: number;
          updated_at?: string;
        };
        const updatedAt = typeof row.updated_at === "string" ? row.updated_at : "";
        if (updatedAt && updatedAt <= lastAppliedUpdatedAt) return;
        void pullRemoteIfNewer(
          roomId,
          () => get().revision,
          (n) => set({ revision: n }),
        );
      },
    )
    .subscribe();

  // Fallback: poll — works even if table is not in supabase_realtime publication.
  pollTimer = setInterval(() => {
    if (!get().active) return;
    void pullRemoteIfNewer(
      roomId,
      () => get().revision,
      (n) => set({ revision: n }),
    );
  }, SNAPSHOT_POLL_MS);
}

export const useCollabStore = create<CollabState>((set, get) => ({
  configured: isCollabConfigured(),
  connectionSource: getSupabaseConnectionSource(),
  active: false,
  connecting: false,
  status: "idle",
  error: null,
  room: null,
  isHost: false,
  displayName:
    typeof window !== "undefined"
      ? sessionStorage.getItem(DISPLAY_NAME_STORAGE_KEY) ?? ""
      : "",
  userId: null,
  peers: [],
  revision: 1,

  refreshConfigured: () => {
    resetSupabaseClient();
    set({
      configured: isCollabConfigured(),
      connectionSource: getSupabaseConnectionSource(),
    });
  },

  setDisplayName: (name) => {
    const trimmed = name.trim().slice(0, 40);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(DISPLAY_NAME_STORAGE_KEY, trimmed);
    }
    set({ displayName: trimmed });
    if (awareness) {
      const uid = get().userId ?? "anon";
      awareness.setLocalStateField("user", {
        id: uid,
        name: trimmed || "Gast",
        color: colorForUserId(uid),
      });
    }
  },

  createRoom: async (title) => {
    if (!isCollabConfigured()) {
      return { ok: false, error: "Supabase nicht konfiguriert (siehe docs/COLLABORATION.md)" };
    }
    set({ connecting: true, error: null, status: "connecting" });
    const payload = boardImportPayloadFromStore();
    const result = await createCollabRoom(title ?? payload.title, payload);
    if ("error" in result) {
      set({ connecting: false, status: "error", error: result.error });
      return { ok: false, error: result.error };
    }

    if (typeof window !== "undefined") {
      sessionStorage.setItem(hostTokenKey(result.room.code), result.hostToken);
    }

    const join = await get().joinRoom(result.room.code, get().displayName || "Host");
    if (!join.ok) return join;
    return { ok: true, code: result.room.code };
  },

  joinRoom: async (code, displayName) => {
    if (!isCollabConfigured()) {
      return { ok: false, error: "Supabase nicht konfiguriert" };
    }
    const sb = getSupabase();
    if (!sb) return { ok: false, error: "Supabase nicht konfiguriert" };

    set({ connecting: true, error: null, status: "connecting" });
    teardownSession();

    const hostToken =
      typeof window !== "undefined"
        ? sessionStorage.getItem(hostTokenKey(code.trim().toUpperCase()))
        : null;

    const result = await joinCollabRoom(code, hostToken);
    if ("error" in result) {
      set({ connecting: false, status: "error", error: result.error });
      return { ok: false, error: result.error };
    }

    const name =
      (displayName ?? get().displayName).trim() ||
      (typeof window !== "undefined"
        ? sessionStorage.getItem(DISPLAY_NAME_STORAGE_KEY) ?? ""
        : "") ||
      "Gast";
    if (typeof window !== "undefined") {
      sessionStorage.setItem(DISPLAY_NAME_STORAGE_KEY, name);
    }

    const { data: sessionData } = await sb.auth.getSession();
    const userId = sessionData.session?.user?.id ?? "anon";
    if (sessionData.session?.access_token) {
      await sb.realtime.setAuth(sessionData.session.access_token);
    }

    doc = createBoardYDoc();
    const activeDoc = doc;
    if (result.yjsState && result.yjsState.byteLength > 0) {
      try {
        applyYDocState(activeDoc, result.yjsState);
      } catch {
        applyPayloadToYDoc(activeDoc, result.payload);
      }
    } else {
      applyPayloadToYDoc(activeDoc, result.payload);
    }

    const fromDoc = readPayloadFromYDoc(activeDoc) ?? result.payload;
    applyPayloadToStore(fromDoc);
    lastAppliedUpdatedAt = result.updatedAt;
    localDirty = false;

    awareness = new Awareness(activeDoc);
    awareness.setLocalStateField("user", {
      id: userId,
      name,
      color: colorForUserId(userId),
    });
    awareness.on("change", () => syncPeers(set));

    activeDoc.on("update", (_u, origin) => {
      if (origin === LOCAL_ORIGIN || origin === REMOTE_ORIGIN || applyingRemote) return;
      const payload = readPayloadFromYDoc(activeDoc);
      if (!payload) return;
      // Fast path via Broadcast — do not mark dirty / save (sender persists the snapshot).
      applyPayloadToStore(payload);
    });

    provider = new SupabaseYjsProvider({
      supabase: sb,
      roomCode: result.room.code,
      doc: activeDoc,
      awareness,
      onStatus: (s) => {
        if (s === "connected") set({ status: "connected" });
        else if (s === "disconnected") set({ status: "disconnected" });
        else set({ status: "connecting" });
      },
      onError: (message) => {
        // Don't fail the room for broadcast issues — snapshot poll keeps content in sync.
        set({ error: message });
      },
    });

    try {
      await provider.connect();
    } catch (e) {
      // Broadcast may fail on some projects; continue with snapshot sync.
      const msg = e instanceof Error ? e.message : "Realtime-Broadcast eingeschränkt";
      set({ error: msg, status: "connected" });
    }

    set({
      active: true,
      connecting: false,
      status: "connected",
      room: result.room,
      isHost: result.isHost,
      displayName: name,
      userId,
      revision: result.revision,
    });
    syncPeers(set);
    bindStoreToYjs(result.room.id, get, set);
    startSnapshotSync(result.room.id, get, set);

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("room", result.room.code);
      window.history.replaceState({}, "", url.toString());
    }

    return { ok: true };
  },

  leaveRoom: () => {
    teardownSession();
    set({
      active: false,
      connecting: false,
      status: "idle",
      error: null,
      room: null,
      isHost: false,
      peers: [],
      revision: 1,
    });
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("room");
      window.history.replaceState({}, "", url.toString());
    }
  },

  pushLocalToYjs: () => {
    if (!doc || !get().active) return;
    applyPayloadToYDoc(doc, boardImportPayloadFromStore(), LOCAL_ORIGIN);
  },
}));

export function getCollabShareUrl(code: string): string {
  if (typeof window === "undefined") return `?room=${code}`;
  const url = new URL(window.location.href);
  url.searchParams.set("room", code);
  return url.toString();
}
