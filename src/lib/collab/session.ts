import { create } from "zustand";
import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";

import {
  colorForUserId,
  DISPLAY_NAME_STORAGE_KEY,
  HOST_TOKEN_STORAGE_KEY,
  isCollabConfigured,
  SNAPSHOT_DEBOUNCE_MS,
} from "@/lib/collab/config";
import {
  createCollabRoom,
  joinCollabRoom,
  saveCollabSnapshot,
  type CollabRoom,
} from "@/lib/collab/rooms";
import { getSupabase } from "@/lib/collab/supabase";
import { SupabaseYjsProvider } from "@/lib/collab/supabase-yjs-provider";
import {
  applyPayloadToYDoc,
  applyYDocState,
  createBoardYDoc,
  encodeYDocState,
  LOCAL_ORIGIN,
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
let snapshotTimer: ReturnType<typeof setTimeout> | null = null;
let applyingRemote = false;
let storeUnsub: (() => void) | null = null;

function hostTokenKey(code: string): string {
  return `${HOST_TOKEN_STORAGE_KEY}:${code}`;
}

function clearSnapshotTimer(): void {
  if (snapshotTimer) {
    clearTimeout(snapshotTimer);
    snapshotTimer = null;
  }
}

function scheduleSnapshot(roomId: string, getRevision: () => number, setRevision: (n: number) => void): void {
  clearSnapshotTimer();
  snapshotTimer = setTimeout(() => {
    void (async () => {
      if (!doc) return;
      const payload = readPayloadFromYDoc(doc);
      if (!payload) return;
      const snapshot = buildBoardSnapshot(payload);
      const yjsState = encodeYDocState(doc);
      const result = await saveCollabSnapshot({
        roomId,
        snapshot,
        yjsState,
        revision: getRevision(),
      });
      if (!("error" in result)) setRevision(result.revision);
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
  storeUnsub?.();
  storeUnsub = null;
  provider?.destroy();
  provider = null;
  awareness?.destroy();
  awareness = null;
  doc?.destroy();
  doc = null;
  applyingRemote = false;
}

function applyPayloadToStore(payload: BoardImportPayload): void {
  applyingRemote = true;
  try {
    useStormBoardStore.getState().replaceBoardFromImport(payload);
    // Avoid bloating undo with remote joins: clear history after remote apply
    useStormBoardStore.setState({ past: [], future: [] });
  } finally {
    applyingRemote = false;
  }
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
    scheduleSnapshot(roomId, () => get().revision, (n) => set({ revision: n }));
  });
}

export const useCollabStore = create<CollabState>((set, get) => ({
  configured: isCollabConfigured(),
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

    awareness = new Awareness(activeDoc);
    awareness.setLocalStateField("user", {
      id: userId,
      name,
      color: colorForUserId(userId),
    });
    awareness.on("change", () => syncPeers(set));

    activeDoc.on("update", (_u, origin) => {
      if (origin === LOCAL_ORIGIN || applyingRemote) return;
      const payload = readPayloadFromYDoc(activeDoc);
      if (!payload) return;
      applyPayloadToStore(payload);
      scheduleSnapshot(result.room.id, () => get().revision, (n) => set({ revision: n }));
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
    });

    try {
      await provider.connect();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Realtime-Verbindung fehlgeschlagen";
      set({ connecting: false, status: "error", error: msg, active: false });
      teardownSession();
      return { ok: false, error: msg };
    }

    set({
      active: true,
      connecting: false,
      status: "connected",
      error: null,
      room: result.room,
      isHost: result.isHost,
      displayName: name,
      userId,
      revision: result.revision,
    });
    syncPeers(set);
    bindStoreToYjs(result.room.id, get, set);

    // Update URL without reload
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
