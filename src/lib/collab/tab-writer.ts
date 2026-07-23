/**
 * Single-writer lock per collab room within one browser profile.
 * The visible tab holds an exclusive Web Lock; hidden tabs wait and must not push.
 */

export type TabWriterRole = "leader" | "follower";

type RoleListener = (role: TabWriterRole) => void;

export interface RoomTabWriterController {
  getRole: () => TabWriterRole;
  isLeader: () => boolean;
  start: () => void;
  stop: () => void;
  onRoleChange: (listener: RoleListener) => () => void;
}

function lockNameForRoom(roomCode: string): string {
  return `e2-collab-writer:${roomCode.trim().toUpperCase()}`;
}

function supportsWebLocks(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.locks?.request === "function";
}

function waitUntilVisible(isStopped: () => boolean): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();
  if (document.visibilityState === "visible") return Promise.resolve();
  return new Promise((resolve) => {
    const onChange = () => {
      if (isStopped() || document.visibilityState === "visible") {
        document.removeEventListener("visibilitychange", onChange);
        resolve();
      }
    };
    document.addEventListener("visibilitychange", onChange);
  });
}

/** Create a per-room writer controller. Call start() after join, stop() on leave. */
export function createRoomTabWriter(roomCode: string): RoomTabWriterController {
  let role: TabWriterRole = "follower";
  let stopped = true;
  const listeners = new Set<RoleListener>();
  let abort: AbortController | null = null;
  let releaseLock: (() => void) | null = null;
  let lockLoopActive = false;
  const visibilityHandlers: Array<() => void> = [];

  const emit = (next: TabWriterRole) => {
    if (role === next) return;
    role = next;
    for (const listener of listeners) {
      try {
        listener(role);
      } catch {
        /* ignore */
      }
    }
  };

  const addVisibilityHandler = (handler: () => void) => {
    if (typeof document === "undefined") return;
    document.addEventListener("visibilitychange", handler);
    visibilityHandlers.push(handler);
  };

  const clearVisibilityHandlers = () => {
    if (typeof document === "undefined") return;
    for (const handler of visibilityHandlers) {
      document.removeEventListener("visibilitychange", handler);
    }
    visibilityHandlers.length = 0;
  };

  async function runLockLoop(): Promise<void> {
    if (!supportsWebLocks() || lockLoopActive) return;
    lockLoopActive = true;

    while (!stopped) {
      await waitUntilVisible(() => stopped);
      if (stopped) break;

      abort = new AbortController();
      try {
        await navigator.locks.request(
          lockNameForRoom(roomCode),
          { signal: abort.signal },
          async () => {
            if (stopped) return;
            if (typeof document !== "undefined" && document.visibilityState !== "visible") {
              return;
            }
            emit("leader");
            await new Promise<void>((resolve) => {
              releaseLock = resolve;
            });
            releaseLock = null;
            if (!stopped) emit("follower");
          },
        );
      } catch (e) {
        const name = e instanceof DOMException ? e.name : "";
        if (name !== "AbortError" && !stopped) {
          emit("leader");
          break;
        }
      }

      if (!stopped) await new Promise((r) => setTimeout(r, 20));
    }

    lockLoopActive = false;
  }

  return {
    getRole: () => role,
    isLeader: () => role === "leader",
    onRoleChange: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    start: () => {
      stopped = false;
      if (supportsWebLocks()) {
        emit("follower");
        addVisibilityHandler(() => {
          if (stopped) return;
          if (document.visibilityState === "hidden" && role === "leader") {
            releaseLock?.();
            releaseLock = null;
          }
        });
        void runLockLoop();
      } else if (typeof document !== "undefined") {
        emit(document.visibilityState === "visible" ? "leader" : "follower");
        addVisibilityHandler(() => {
          if (stopped) return;
          emit(document.visibilityState === "visible" ? "leader" : "follower");
        });
      } else {
        emit("leader");
      }
    },
    stop: () => {
      stopped = true;
      clearVisibilityHandlers();
      abort?.abort();
      releaseLock?.();
      releaseLock = null;
      listeners.clear();
      role = "follower";
    },
  };
}

/** Deterministic leader for unit tests (no Web Locks). */
export function createAlwaysLeaderWriter(): RoomTabWriterController {
  let role: TabWriterRole = "leader";
  const listeners = new Set<RoleListener>();
  return {
    getRole: () => role,
    isLeader: () => role === "leader",
    start: () => {
      role = "leader";
    },
    stop: () => {
      role = "follower";
    },
    onRoleChange: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
