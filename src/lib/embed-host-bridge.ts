import { loadEmbedBoardFromText } from "@/lib/embed-board-load";
import {
  EMBED_DIRTY_MESSAGE,
  EMBED_DOCUMENT_MESSAGE,
  EMBED_HOST_PROTOCOL_VERSION,
  EMBED_LOAD_MESSAGE,
  EMBED_READY_MESSAGE,
  EMBED_REQUEST_SAVE_MESSAGE,
  type EmbedDocumentReason,
  isEmbedLoadMessage,
  isEmbedRequestSaveMessage,
  isEmbedSaveAckMessage,
} from "@/lib/embed-messages";
import { boardJsonFromStoreState, boardPersistKeyFromStoreState } from "@/lib/file-board-reconcile";
import { isAllowedEmbedHostOrigin } from "@/lib/embed-host-origin";
import { useStormBoardStore } from "@/store/storm-board-store";

const AUTOSAVE_DEBOUNCE_MS = 1500;

export type EmbedHostBridgeOptions = {
  allowedParentOrigins: string[];
  onHostFileLoaded?: (hostFileId: string) => void;
  /** Fired after each host `embed-load` (incl. editable flag for shell UI). */
  onHostLoad?: (info: { hostFileId: string; editable: boolean }) => void;
};

export type EmbedHostBridge = {
  postReady: () => void;
  handleMessage: (event: MessageEvent) => void;
  dispose: () => void;
};

export function createEmbedHostBridge(opts: EmbedHostBridgeOptions): EmbedHostBridge {
  let hostFileId: string | null = null;
  let autosaveEnabled = false;
  let editable = false;
  let revision = 0;
  let lastSyncedPersistKey: string | null = null;
  let autosaveTimer: ReturnType<typeof setTimeout> | null = null;
  let unsubscribe: (() => void) | null = null;

  const postToParent = (payload: Record<string, unknown>) => {
    if (typeof window === "undefined") return;
    try {
      window.parent.postMessage(payload, "*");
    } catch {
      /* ignore */
    }
  };

  const postDirty = (dirty: boolean) => {
    if (!hostFileId) return;
    postToParent({
      type: EMBED_DIRTY_MESSAGE,
      hostFileId,
      dirty,
    });
  };

  const exportAndSend = (reason: EmbedDocumentReason) => {
    if (!hostFileId || !editable) return;
    const json = boardJsonFromStoreState();
    revision += 1;
  const msg = {
      type: EMBED_DOCUMENT_MESSAGE,
      json,
      hostFileId,
      revision,
      reason,
    };
    postToParent(msg);
    postDirty(false);
  };

  const scheduleAutosave = () => {
    if (!hostFileId || !editable || !autosaveEnabled) return;
    const key = boardPersistKeyFromStoreState();
    if (key === lastSyncedPersistKey) return;
    if (autosaveTimer) clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
      autosaveTimer = null;
      const keyNow = boardPersistKeyFromStoreState();
      if (keyNow === lastSyncedPersistKey) return;
      exportAndSend("autosave");
    }, AUTOSAVE_DEBOUNCE_MS);
  };

  const startStoreWatch = () => {
    unsubscribe?.();
    unsubscribe = useStormBoardStore.subscribe(() => {
      scheduleAutosave();
      if (!hostFileId) return;
      const key = boardPersistKeyFromStoreState();
      postDirty(key !== lastSyncedPersistKey);
    });
  };

  const stopStoreWatch = () => {
    unsubscribe?.();
    unsubscribe = null;
    if (autosaveTimer) {
      clearTimeout(autosaveTimer);
      autosaveTimer = null;
    }
  };

  const applyLoad = (json: string, nextHostFileId: string, nextEditable: boolean, nextAutosave: boolean) => {
    hostFileId = nextHostFileId;
    editable = nextEditable;
    autosaveEnabled = nextAutosave;
    revision = 0;
    loadEmbedBoardFromText(json, { editable: nextEditable });
    lastSyncedPersistKey = boardPersistKeyFromStoreState();
    startStoreWatch();
    opts.onHostFileLoaded?.(nextHostFileId);
    opts.onHostLoad?.({ hostFileId: nextHostFileId, editable: nextEditable });
    postDirty(false);
  };

  return {
    postReady: () => {
      postToParent({
        type: EMBED_READY_MESSAGE,
        hostProtocol: EMBED_HOST_PROTOCOL_VERSION,
      });
    },

    handleMessage: (event: MessageEvent) => {
      if (!isAllowedEmbedHostOrigin(event.origin, opts.allowedParentOrigins)) return;

      if (isEmbedLoadMessage(event.data)) {
        const data = event.data;
        const nextId =
          typeof data.hostFileId === "string" && data.hostFileId.trim()
            ? data.hostFileId.trim()
            : hostFileId ?? "default";
        const nextEditable = data.editable === true;
        const nextAutosave = data.autosave ?? nextEditable;
        if (autosaveTimer) {
          clearTimeout(autosaveTimer);
          autosaveTimer = null;
        }
        applyLoad(data.json, nextId, nextEditable, nextAutosave);
        return;
      }

      if (isEmbedRequestSaveMessage(event.data)) {
        const req = event.data;
        if (req.hostFileId && hostFileId && req.hostFileId !== hostFileId) return;
        if (autosaveTimer) {
          clearTimeout(autosaveTimer);
          autosaveTimer = null;
        }
        exportAndSend("flush");
        return;
      }

      if (isEmbedSaveAckMessage(event.data)) {
        const ack = event.data;
        if (hostFileId && ack.hostFileId !== hostFileId) return;
        if (ack.ok) {
          lastSyncedPersistKey = boardPersistKeyFromStoreState();
          postDirty(false);
        }
      }
    },

    dispose: () => {
      stopStoreWatch();
      hostFileId = null;
    },
  };
}