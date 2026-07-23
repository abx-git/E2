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
import {
  createRoomTabWriter,
  type RoomTabWriterController,
  type TabWriterRole,
} from "@/lib/collab/tab-writer";
import {
  isWorkingFileAttached,
  persistWorkingFileJson,
  setWorkingFileToStoreBlocked,
  suppressWorkingFileExternalPoll,
} from "@/lib/working-file";
import { boardJsonFromStoreState } from "@/lib/file-board-reconcile";
import {
  boardExportTextsEquivalent,
  boardImportPayloadFromExportText,
  buildBoardSnapshot,
  stringifyExportedDocument,
  type BoardImportPayload,
  type BoardSnapshot,
} from "@/lib/storm-json";
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

export type CollabSyncConflictChoice = "take_remote" | "push_local" | "cancel";

export interface CollabSyncConflict {
  roomId: string;
  localSnapshot: BoardSnapshot;
  localYjsState: Uint8Array;
  remoteRevision: number;
  remoteUpdatedAt: string;
  remotePayload: BoardImportPayload;
  remoteYjsState: Uint8Array | null;
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
  /** This browser tab's writer role for the room (single-writer lock). */
  tabWriterRole: TabWriterRole;
  /** Local vs newer server — requires explicit user choice. */
  syncConflict: CollabSyncConflict | null;

  refreshConfigured: () => void;
  setDisplayName: (name: string) => void;
  createRoom: (title?: string) => Promise<{ ok: true; code: string } | { ok: false; error: string }>;
  joinRoom: (
    code: string,
    displayName?: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  leaveRoom: () => void;
  pushLocalToYjs: () => void;
  resolveSyncConflict: (
    choice: CollabSyncConflictChoice,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  clearSyncConflict: () => void;
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
/** Revision we last successfully applied or wrote — CAS base for saves. */
let lastKnownRevision = 1;
/** True while local domain edits are waiting to be written. */
let localDirty = false;
/** Room id for the active session — used by flush / pagehide. */
let activeRoomId: string | null = null;
let pagehideBound = false;
let tabWriter: RoomTabWriterController | null = null;
let tabWriterUnsub: (() => void) | null = null;
/** Prevent stacking multiple conflict dialogs. */
let syncConflictOpen = false;

function isTabWriterLeader(): boolean {
  // Before the lock resolves, treat as non-leader (safe default: no push).
  if (!tabWriter) return true; // no controller (tests / edge) → allow writes
  return tabWriter.isLeader();
}

function payloadsEquivalent(a: BoardImportPayload, b: BoardImportPayload): boolean {
  return boardExportTextsEquivalent(
    stringifyExportedDocument(buildBoardSnapshot(a)),
    stringifyExportedDocument(buildBoardSnapshot(b)),
  );
}

function raiseSyncConflict(
  roomId: string,
  localSnapshot: BoardSnapshot,
  localYjsState: Uint8Array,
  remote: {
    revision: number;
    updatedAt: string;
    payload: BoardImportPayload;
    yjsState: Uint8Array | null;
  },
): void {
  if (syncConflictOpen) return;
  syncConflictOpen = true;
  useCollabStore.setState({
    syncConflict: {
      roomId,
      localSnapshot,
      localYjsState,
      remoteRevision: remote.revision,
      remoteUpdatedAt: remote.updatedAt,
      remotePayload: remote.payload,
      remoteYjsState: remote.yjsState,
    },
  });
}

/**
 * Server is ahead of our last applied clock. Never silently overwrite the server.
 * If we have no meaningful local divergence, adopt server. Otherwise ask the user.
 */
function handleNewerRemote(
  roomId: string,
  remote: {
    revision: number;
    updatedAt: string;
    payload: BoardImportPayload;
    yjsState: Uint8Array | null;
  },
  localSnapshot: BoardSnapshot,
  localYjsState: Uint8Array,
  setRevision: (n: number) => void,
): "applied" | "conflict" | "skipped" {
  const localPayload = boardImportPayloadFromStore();
  if (!localDirty || payloadsEquivalent(localPayload, remote.payload)) {
    applyRemoteSnapshot(
      remote.payload,
      remote.revision,
      remote.yjsState,
      remote.updatedAt,
      setRevision,
    );
    return "applied";
  }
  raiseSyncConflict(roomId, localSnapshot, localYjsState, remote);
  return "conflict";
}

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

async function persistSnapshotNow(
  roomId: string,
  setRevision?: (n: number) => void,
): Promise<boolean> {
  if (!doc || applyingRemote) return false;
  if (syncConflictOpen) return false;
  if (!isTabWriterLeader()) {
    clearSnapshotTimer();
    return false;
  }
  if (savingSnapshot) {
    for (let i = 0; i < 40 && savingSnapshot; i++) {
      await new Promise((r) => setTimeout(r, 50));
    }
    if (savingSnapshot) return false;
  }
  if (!isTabWriterLeader() || syncConflictOpen) return false;

  const payload = readPayloadFromYDoc(doc) ?? boardImportPayloadFromStore();
  const snapshot = buildBoardSnapshot(payload);
  const yjsState = encodeYDocState(doc);
  const setRev = setRevision ?? ((n: number) => useCollabStore.setState({ revision: n }));
  savingSnapshot = true;
  try {
    // Preflight: detect newer server without using its revision as our write base.
    const latest = await fetchCollabSnapshot(roomId);
    if ("error" in latest) return false;

    if (
      latest.updatedAt > lastAppliedUpdatedAt ||
      latest.revision > lastKnownRevision
    ) {
      handleNewerRemote(roomId, latest, snapshot, yjsState, setRev);
      return false;
    }

    // CAS against the revision we last applied/wrote — never "fetch latest then overwrite".
    const result = await saveCollabSnapshot({
      roomId,
      snapshot,
      yjsState,
      revision: lastKnownRevision,
    });

    if ("conflict" in result && result.conflict) {
      const again = await fetchCollabSnapshot(roomId);
      if (!("error" in again)) {
        handleNewerRemote(roomId, again, snapshot, yjsState, setRev);
      }
      return false;
    }

    if ("error" in result) return false;

    lastAppliedUpdatedAt = result.updatedAt;
    lastKnownRevision = result.revision;
    localDirty = false;
    setRev(result.revision);
    return true;
  } finally {
    savingSnapshot = false;
  }
}

function scheduleSnapshot(roomId: string, setRevision: (n: number) => void): void {
  if (!isTabWriterLeader()) return;
  localDirty = true;
  clearSnapshotTimer();
  snapshotTimer = setTimeout(() => {
    snapshotTimer = null;
    void persistSnapshotNow(roomId, setRevision);
  }, SNAPSHOT_DEBOUNCE_MS);
}

/**
 * Cancel debounce and write the current board to the room snapshot immediately.
 * Call before leave / pagehide so peers don't miss the last edits.
 * No-op on follower tabs (single-writer lock).
 */
export async function flushCollabSnapshotNow(): Promise<void> {
  clearSnapshotTimer();
  const roomId = activeRoomId ?? useCollabStore.getState().room?.id ?? null;
  if (!roomId || !doc) {
    localDirty = false;
    return;
  }
  if (!isTabWriterLeader()) {
    localDirty = false;
    return;
  }
  await persistSnapshotNow(roomId, (n) => useCollabStore.setState({ revision: n }));
}

function onCollabPageHide(): void {
  if (!useCollabStore.getState().active) return;
  if (isTabWriterLeader()) {
    void flushCollabSnapshotNow();
  }
  if (isWorkingFileAttached()) {
    void persistWorkingFileJson(boardJsonFromStoreState());
  }
}

function bindPageHideFlush(): void {
  if (typeof window === "undefined" || pagehideBound) return;
  window.addEventListener("pagehide", onCollabPageHide);
  window.addEventListener("beforeunload", onCollabPageHide);
  pagehideBound = true;
}

function unbindPageHideFlush(): void {
  if (typeof window === "undefined" || !pagehideBound) return;
  window.removeEventListener("pagehide", onCollabPageHide);
  window.removeEventListener("beforeunload", onCollabPageHide);
  pagehideBound = false;
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
  tabWriterUnsub?.();
  tabWriterUnsub = null;
  tabWriter?.stop();
  tabWriter = null;
  unbindPageHideFlush();
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
  lastKnownRevision = 1;
  localDirty = false;
  activeRoomId = null;
  syncConflictOpen = false;
  setWorkingFileToStoreBlocked(false);
}

/** Apply remote board without wiping local viewport / selection / undo-hostile UX. */
function applyPayloadToStore(payload: BoardImportPayload): void {
  applyingRemote = true;
  try {
    const current = useStormBoardStore.getState();
    const localViewport = current.viewport;
    const localActiveViewId = current.activeViewId;
    const keepLocalTab = !payload.workshopMode;

    // Import remote document (may change active view when workshopMode is on).
    useStormBoardStore.getState().replaceBoardFromImport(payload);

    let after = useStormBoardStore.getState();

    if (keepLocalTab && after.views.some((v) => v.id === localActiveViewId)) {
      if (localActiveViewId !== after.activeViewId) {
        // Switch back without clearing history again via public API side effects —
        // setActiveView clears undo stacks (desired after remote).
        useStormBoardStore.getState().setActiveView(localActiveViewId);
        after = useStormBoardStore.getState();
      }
      // Same (local) tab: keep camera.
      useStormBoardStore.setState({ viewport: localViewport });
    } else if (after.activeViewId === localActiveViewId) {
      // Workshop sync kept us on the same tab — keep camera.
      useStormBoardStore.setState({ viewport: localViewport });
    }
    // else: workshop switched tab → keep remote view viewport from import

    after = useStormBoardStore.getState();
    const elementIds = new Set(after.elements.map((e) => e.id));
    const relationIds = new Set(after.relations.map((r) => r.id));
    const contextRelationIds = new Set(after.contextRelations.map((r) => r.id));
    const swimlaneIds = new Set(after.swimlanes.map((s) => s.id));
    const bcIds = new Set(after.boundedContexts.map((b) => b.id));

    useStormBoardStore.setState({
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
  lastKnownRevision = revision;
  localDirty = false;
  setRevision(revision);
}

async function pullRemoteIfNewer(
  roomId: string,
  _getRevision: () => number,
  setRevision: (n: number) => void,
): Promise<void> {
  if (applyingRemote || savingSnapshot || !doc) return;
  if (syncConflictOpen) return;
  if (useStormBoardStore.getState().gestureActive) return;

  const result = await fetchCollabSnapshot(roomId);
  if ("error" in result) return;
  if (result.updatedAt <= lastAppliedUpdatedAt && result.revision <= lastKnownRevision) {
    return;
  }

  // Server advanced. With local edits → ask; without → safe adopt.
  if (localDirty || snapshotTimer) {
    const localPayload = readPayloadFromYDoc(doc) ?? boardImportPayloadFromStore();
    const localSnapshot = buildBoardSnapshot(localPayload);
    const localYjs = encodeYDocState(doc);
    handleNewerRemote(roomId, result, localSnapshot, localYjs, setRevision);
    return;
  }

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
    // Follower tabs must not push — stale tab overwrites are the failure mode we lock against.
    if (!isTabWriterLeader()) return;

    const gestureEnded = wasGesture && !state.gestureActive;
    wasGesture = state.gestureActive;

    if (state.gestureActive) return;

    const domainChanged =
      gestureEnded ||
      state.title !== prev.title ||
      state.workshopMode !== prev.workshopMode ||
      state.activeViewId !== prev.activeViewId ||
      state.views !== prev.views ||
      state.elements !== prev.elements ||
      state.relations !== prev.relations ||
      state.contextRelations !== prev.contextRelations ||
      state.swimlanes !== prev.swimlanes ||
      state.boundedContexts !== prev.boundedContexts ||
      state.timeline !== prev.timeline ||
      state.glossary !== prev.glossary ||
      state.appearance !== prev.appearance ||
      state.workshopFormat !== prev.workshopFormat ||
      state.modelingMode !== prev.modelingMode ||
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

function startTabWriter(
  roomCode: string,
  roomId: string,
  set: (p: Partial<CollabState>) => void,
): void {
  tabWriterUnsub?.();
  tabWriter?.stop();
  tabWriter = createRoomTabWriter(roomCode);
  tabWriterUnsub = tabWriter.onRoleChange((role) => {
    set({ tabWriterRole: role });
    if (role !== "leader" || !useCollabStore.getState().active) return;
    if (syncConflictOpen) return;
    clearSnapshotTimer();
    void (async () => {
      const latest = await fetchCollabSnapshot(roomId);
      if ("error" in latest) return;
      if (
        latest.updatedAt > lastAppliedUpdatedAt ||
        latest.revision > lastKnownRevision
      ) {
        const localPayload = readPayloadFromYDoc(doc!) ?? boardImportPayloadFromStore();
        const localSnapshot = buildBoardSnapshot(localPayload);
        const localYjs = doc ? encodeYDocState(doc) : new Uint8Array();
        handleNewerRemote(
          roomId,
          latest,
          localSnapshot,
          localYjs,
          (n) => set({ revision: n }),
        );
        return;
      }
      if (isTabWriterLeader() && localDirty) {
        scheduleSnapshot(roomId, (n) => set({ revision: n }));
      }
    })();
  });
  tabWriter.start();
  set({ tabWriterRole: tabWriter.getRole() });
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
  tabWriterRole: "follower",
  syncConflict: null,

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

    // Block disk→editor for the whole join + session (prevents old file overwriting the room).
    setWorkingFileToStoreBlocked(true);
    suppressWorkingFileExternalPoll(15_000);
    set({ connecting: true, error: null, status: "connecting" });
    teardownSession();
    // teardown clears the block — re-assert for the new session.
    setWorkingFileToStoreBlocked(true);
    suppressWorkingFileExternalPoll(15_000);

    const hostToken =
      typeof window !== "undefined"
        ? sessionStorage.getItem(hostTokenKey(code.trim().toUpperCase()))
        : null;

    const result = await joinCollabRoom(code, hostToken);
    if ("error" in result) {
      setWorkingFileToStoreBlocked(false);
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
    lastKnownRevision = result.revision;
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
      // Never clobber in-progress local edits with a peer broadcast — snapshot poll
      // will surface an explicit sync conflict with revision metadata.
      if (localDirty || snapshotTimer || syncConflictOpen) return;
      applyPayloadToStore(payload);
    });

    provider = new SupabaseYjsProvider({
      supabase: sb,
      roomCode: result.room.code,
      doc: activeDoc,
      awareness,
      onStatus: (s) => {
        if (s === "connected") set({ status: "connected" });
        else if (s === "disconnected") {
          set({ status: "disconnected" });
          // Best-effort: push pending edits via Postgres while broadcast is down.
          void flushCollabSnapshotNow();
        } else set({ status: "connecting" });
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

    activeRoomId = result.room.id;
    set({
      active: true,
      connecting: false,
      status: "connected",
      room: result.room,
      isHost: result.isHost,
      displayName: name,
      userId,
      revision: result.revision,
      tabWriterRole: "follower",
      syncConflict: null,
    });

    // Mirror room → file BEFORE binding store→Yjs, so an old disk snapshot cannot
    // win a race into the editor and then broadcast into the room.
    if (isWorkingFileAttached()) {
      suppressWorkingFileExternalPoll(10_000);
      await persistWorkingFileJson(boardJsonFromStoreState());
      suppressWorkingFileExternalPoll(5_000);
    }

    syncPeers(set);
    startTabWriter(result.room.code, result.room.id, set);
    bindStoreToYjs(result.room.id, get, set);
    startSnapshotSync(result.room.id, get, set);
    bindPageHideFlush();

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
      tabWriterRole: "follower",
      syncConflict: null,
    });
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("room");
      window.history.replaceState({}, "", url.toString());
    }
  },

  clearSyncConflict: () => {
    syncConflictOpen = false;
    set({ syncConflict: null });
  },

  resolveSyncConflict: async (choice) => {
    const conflict = get().syncConflict;
    if (!conflict) return { ok: true };
    if (choice === "cancel") {
      // Dismiss for now; keep local edits. Next save/pull re-raises if still divergent.
      syncConflictOpen = false;
      set({ syncConflict: null });
      localDirty = true;
      return { ok: true };
    }

    if (choice === "take_remote") {
      applyRemoteSnapshot(
        conflict.remotePayload,
        conflict.remoteRevision,
        conflict.remoteYjsState,
        conflict.remoteUpdatedAt,
        (n) => set({ revision: n }),
      );
      syncConflictOpen = false;
      set({ syncConflict: null });
      return { ok: true };
    }

    // push_local — explicit overwrite of server, CAS from remote revision.
    if (!isTabWriterLeader()) {
      return { ok: false, error: "Dieser Tab darf gerade nicht schreiben (passiv)." };
    }
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        "Meinen Stand auf den Server schreiben?\n\nDas überschreibt den aktuellen Server-Stand für alle Teilnehmer. Besser vorher JSON exportieren.",
      )
    ) {
      return { ok: true };
    }

    savingSnapshot = true;
    try {
      if (!doc) return { ok: false, error: "Keine Session" };
      const localPayload =
        boardImportPayloadFromExportText(stringifyExportedDocument(conflict.localSnapshot)) ??
        boardImportPayloadFromStore();
      applyPayloadToStore(localPayload);
      applyPayloadToYDoc(doc, localPayload, LOCAL_ORIGIN);
      const yjsState = encodeYDocState(doc);

      const result = await saveCollabSnapshot({
        roomId: conflict.roomId,
        snapshot: conflict.localSnapshot,
        yjsState,
        revision: conflict.remoteRevision,
      });
      if ("conflict" in result && result.conflict) {
        const again = await fetchCollabSnapshot(conflict.roomId);
        if ("error" in again) return { ok: false, error: again.error };
        set({
          syncConflict: {
            ...conflict,
            remoteRevision: again.revision,
            remoteUpdatedAt: again.updatedAt,
            remotePayload: again.payload,
            remoteYjsState: again.yjsState,
          },
        });
        return {
          ok: false,
          error: "Server hat sich erneut geändert — bitte nochmal wählen.",
        };
      }
      if ("error" in result) return { ok: false, error: result.error };

      lastAppliedUpdatedAt = result.updatedAt;
      lastKnownRevision = result.revision;
      localDirty = false;
      set({ revision: result.revision, syncConflict: null });
      syncConflictOpen = false;
      return { ok: true };
    } finally {
      savingSnapshot = false;
    }
  },

  pushLocalToYjs: () => {
    if (!doc || !get().active || !isTabWriterLeader() || syncConflictOpen) return;
    applyPayloadToYDoc(doc, boardImportPayloadFromStore(), LOCAL_ORIGIN);
  },
}));

export function getCollabShareUrl(code: string): string {
  if (typeof window === "undefined") return `?room=${code}`;
  const url = new URL(window.location.href);
  url.searchParams.set("room", code);
  return url.toString();
}
