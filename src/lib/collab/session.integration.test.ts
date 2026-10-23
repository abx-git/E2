/**
 * Collab session integration smoke tests (mocked Supabase / rooms API).
 * Run: npm run test:collab-smoke
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_APPEARANCE } from "@/lib/board-appearance";
import { SNAPSHOT_DEBOUNCE_MS } from "@/lib/collab/config";
import {
  boardSnapshotToReplacePayload,
  buildBoardSnapshot,
  createDefaultBoardDocument,
  createEmptyBoardView,
  type BoardImportPayload,
} from "@/lib/storm-json";
import { useStormBoardStore } from "@/store/storm-board-store";

const roomId = "11111111-1111-1111-1111-111111111111";
const roomCode = "ABC123";

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (k: string) => data.get(k) ?? null,
    key: (i: number) => [...data.keys()][i] ?? null,
    removeItem: (k: string) => {
      data.delete(k);
    },
    setItem: (k: string, v: string) => {
      data.set(k, v);
    },
  };
}

function samplePayload(overrides?: Partial<BoardImportPayload>): BoardImportPayload {
  return createDefaultBoardDocument({
    title: "Integration Board",
    activeViewId: "v1",
    views: [
      createEmptyBoardView({
        id: "v1",
        name: "Board",
        elements: [
          {
            id: "e1",
            type: "domainEvent",
            label: "Order Placed",
            x: 10,
            y: 20,
            width: 100,
            height: 50,
          },
        ],
      }),
    ],
    appearance: { ...DEFAULT_APPEARANCE },
    ...overrides,
  });
}

const roomsApi = vi.hoisted(() => ({
  joinCollabRoom: vi.fn(),
  createCollabRoom: vi.fn(),
  fetchCollabSnapshot: vi.fn(),
  saveCollabSnapshot: vi.fn(),
}));

vi.mock("@/lib/collab/rooms", () => ({
  createCollabRoom: roomsApi.createCollabRoom,
  joinCollabRoom: roomsApi.joinCollabRoom,
  fetchCollabSnapshot: roomsApi.fetchCollabSnapshot,
  saveCollabSnapshot: roomsApi.saveCollabSnapshot,
  verifyHostToken: vi.fn(),
}));

vi.mock("@/lib/collab/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/collab/config")>();
  return {
    ...actual,
    isCollabConfigured: () => true,
    getSupabaseConnectionSource: () => "env" as const,
  };
});

vi.mock("@/lib/collab/supabase", () => ({
  getSupabase: () => ({
    auth: {
      getSession: async () => ({
        data: {
          session: { user: { id: "integration-user" }, access_token: "test-jwt" },
        },
      }),
    },
    realtime: { setAuth: async () => {} },
    channel: () => {
      const ch = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn(() => ch),
      };
      return ch;
    },
    removeChannel: async () => {},
  }),
  ensureAnonSession: async () => ({ userId: "integration-user" }),
  resetSupabaseClient: vi.fn(),
}));

vi.mock("@/lib/collab/supabase-yjs-provider", () => ({
  SupabaseYjsProvider: class MockSupabaseYjsProvider {
    async connect(): Promise<void> {}
    destroy(): void {}
  },
}));

vi.mock("@/lib/collab/tab-writer", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/collab/tab-writer")>();
  return {
    ...mod,
    createRoomTabWriter: mod.createAlwaysLeaderWriter,
  };
});

vi.mock("@/lib/working-file", () => ({
  isWorkingFileAttached: () => false,
  pauseWorkingFilePersistForCollab: vi.fn(),
  setWorkingFileToStoreBlocked: vi.fn(),
  setWorkingFilePersistPaused: vi.fn(),
  suppressWorkingFileExternalPoll: vi.fn(),
}));

function joinSuccessPayload(payload: BoardImportPayload, revision = 1) {
  return {
    room: { id: roomId, code: roomCode, title: payload.title, expiresAt: "2099-01-01T00:00:00.000Z" },
    payload,
    yjsState: null,
    revision,
    updatedAt: "2026-01-01T12:00:00.000Z",
    isHost: false,
  };
}

describe("collab session integration smoke", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    roomsApi.fetchCollabSnapshot.mockReset();
    roomsApi.saveCollabSnapshot.mockReset();
    roomsApi.joinCollabRoom.mockReset();
    roomsApi.createCollabRoom.mockReset();

    const sessionStorage = memoryStorage();
    vi.stubGlobal("sessionStorage", sessionStorage);
    vi.stubGlobal("window", {
      sessionStorage,
      location: new URL("http://localhost/"),
      history: { replaceState: vi.fn() },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      confirm: vi.fn(() => true),
    });

    const initial = samplePayload();
    useStormBoardStore.getState().replaceBoardFromImport(initial);
  });

  afterEach(async () => {
    const { useCollabStore } = await import("@/lib/collab/session");
    useCollabStore.getState().leaveRoom();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("joins a room and applies the remote board to the store", async () => {
    const remote = samplePayload({ title: "From Server" });
    roomsApi.joinCollabRoom.mockResolvedValue(joinSuccessPayload(remote));

    const { useCollabStore } = await import("@/lib/collab/session");
    const result = await useCollabStore.getState().joinRoom(roomCode, "Tester");

    expect(result).toEqual({ ok: true });
    expect(useCollabStore.getState().active).toBe(true);
    expect(useCollabStore.getState().room?.code).toBe(roomCode);
    expect(useCollabStore.getState().revision).toBe(1);
    expect(useStormBoardStore.getState().title).toBe("From Server");
    expect(useCollabStore.getState().displayName).toBe("Tester");
  });

  it("debounces local edits into a CAS snapshot save", async () => {
    const remote = samplePayload({ title: "Synced" });
    roomsApi.joinCollabRoom.mockResolvedValue(joinSuccessPayload(remote));
    roomsApi.fetchCollabSnapshot.mockResolvedValue({
      revision: 1,
      updatedAt: "2026-01-01T12:00:00.000Z",
      payload: remote,
      yjsState: null,
    });
    roomsApi.saveCollabSnapshot.mockResolvedValue({
      revision: 2,
      updatedAt: "2026-01-01T12:00:01.000Z",
    });

    const { useCollabStore } = await import("@/lib/collab/session");
    await useCollabStore.getState().joinRoom(roomCode, "Writer");

    useStormBoardStore.getState().setTitle("Edited locally");
    await vi.advanceTimersByTimeAsync(SNAPSHOT_DEBOUNCE_MS + 50);

    expect(roomsApi.saveCollabSnapshot).toHaveBeenCalledTimes(1);
    const call = roomsApi.saveCollabSnapshot.mock.calls[0]![0];
    expect(call.roomId).toBe(roomId);
    expect(call.revision).toBe(1);
    expect(call.snapshot.title).toBe("Edited locally");
    expect(useCollabStore.getState().revision).toBe(2);
  });

  it("surfaces a sync conflict when the server is newer while local edits are dirty", async () => {
    const remote = samplePayload({ title: "Baseline" });
    const newer = samplePayload({ title: "Peer wins" });
    roomsApi.joinCollabRoom.mockResolvedValue(joinSuccessPayload(remote));
    roomsApi.fetchCollabSnapshot.mockResolvedValue({
      revision: 2,
      updatedAt: "2026-01-02T12:00:00.000Z",
      payload: newer,
      yjsState: null,
    });

    const { useCollabStore } = await import("@/lib/collab/session");
    await useCollabStore.getState().joinRoom(roomCode, "Writer");

    useStormBoardStore.getState().setTitle("My local fork");
    await vi.advanceTimersByTimeAsync(SNAPSHOT_DEBOUNCE_MS + 50);

    const conflict = useCollabStore.getState().syncConflict;
    expect(conflict).not.toBeNull();
    expect(conflict?.remotePayload.title).toBe("Peer wins");
    expect(conflict?.localSnapshot.title).toBe("My local fork");
    expect(roomsApi.saveCollabSnapshot).not.toHaveBeenCalled();
  });

  it("resolveSyncConflict(take_remote) adopts the server snapshot", async () => {
    const remote = samplePayload({ title: "Baseline" });
    const newer = samplePayload({ title: "Server canonical" });
    roomsApi.joinCollabRoom.mockResolvedValue(joinSuccessPayload(remote));
    roomsApi.fetchCollabSnapshot.mockResolvedValue({
      revision: 3,
      updatedAt: "2026-01-03T12:00:00.000Z",
      payload: newer,
      yjsState: null,
    });

    const { useCollabStore } = await import("@/lib/collab/session");
    await useCollabStore.getState().joinRoom(roomCode, "Writer");
    useStormBoardStore.getState().setTitle("Diverged");
    await vi.advanceTimersByTimeAsync(SNAPSHOT_DEBOUNCE_MS + 50);

    const resolved = await useCollabStore.getState().resolveSyncConflict("take_remote");
    expect(resolved).toEqual({ ok: true });
    expect(useCollabStore.getState().syncConflict).toBeNull();
    expect(useStormBoardStore.getState().title).toBe("Server canonical");
    expect(useCollabStore.getState().revision).toBe(3);
  });

  it("createRoom chains host token storage into join", async () => {
    const local = samplePayload({ title: "Host board" });
    useStormBoardStore.getState().replaceBoardFromImport(local);

    const snapshot = buildBoardSnapshot(local);
    roomsApi.createCollabRoom.mockResolvedValue({
      room: { id: roomId, code: roomCode, title: local.title, expiresAt: "2099-01-01T00:00:00.000Z" },
      hostToken: "host-secret-token",
      snapshot,
    });
    roomsApi.joinCollabRoom.mockResolvedValue(
      joinSuccessPayload(boardSnapshotToReplacePayload(snapshot), 1),
    );

    const { useCollabStore } = await import("@/lib/collab/session");
    const created = await useCollabStore.getState().createRoom(local.title);

    expect(created).toEqual({ ok: true, code: roomCode });
    expect(roomsApi.createCollabRoom).toHaveBeenCalled();
    expect(roomsApi.joinCollabRoom).toHaveBeenCalledWith(roomCode, expect.any(String));
    expect(sessionStorage.getItem(`e2-collab-host-token:${roomCode}`)).toBe("host-secret-token");
    expect(useCollabStore.getState().active).toBe(true);
  });

  it("leaveRoom tears down an active session", async () => {
    const remote = samplePayload();
    roomsApi.joinCollabRoom.mockResolvedValue(joinSuccessPayload(remote));

    const { useCollabStore } = await import("@/lib/collab/session");
    await useCollabStore.getState().joinRoom(roomCode, "Guest");
    expect(useCollabStore.getState().active).toBe(true);

    useCollabStore.getState().leaveRoom();
    expect(useCollabStore.getState().active).toBe(false);
    expect(useCollabStore.getState().room).toBeNull();
    expect(useCollabStore.getState().peers).toEqual([]);
  });
});
