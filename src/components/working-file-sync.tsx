"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  FileConflictDialog,
  type FileConflictChoice,
} from "@/components/file-conflict-dialog";
import {
  applyBoardJsonToStore,
  boardJsonFromStoreState,
  boardPersistKeyFromStoreState,
  boardStatesEquivalent,
} from "@/lib/file-board-reconcile";
import {
  getWorkingFileHandle,
  getWorkingFileLabel,
  getActiveWorkingFileId,
  getLastSyncedBoardJson,
  getLastKnownFileModified,
  isKnownFileRevision,
  isMobileWorkingFileMode,
  isWorkingFileAttached,
  isWorkingFileDirty,
  isWorkingFilePersistPaused,
  isWorkingFileToStoreBlocked,
  markWorkingFileSessionHydrated,
  markWorkingFileSynced,
  persistWorkingFileJson,
  readWorkingFileSnapshot,
  restoreWorkingFileFromDisk,
  shouldSuppressExternalFilePoll,
  wasWorkingFileSessionHydrated,
  writeWorkingFileJson,
  WORKING_FILE_ATTACHED_EVENT,
  WORKING_FILE_DETACHED_EVENT,
} from "@/lib/working-file";
import { mayAutoRestoreWorkingFileFromStorage } from "@/lib/working-file-safety";
import {
  bindTabWorkingFile,
  getOrCreateTabSessionId,
  resolvePreferredWorkingFileId,
  resolvePreferredWorkingFileName,
} from "@/lib/working-file-tab-context";
import {
  ensureWorkingFileWriter,
  isWorkingFileWriterLeader,
  onWorkingFileWriterRoleChange,
  stopWorkingFileWriter,
} from "@/lib/working-file-writer";
import { useStormBoardStore } from "@/store/storm-board-store";

function urlHasPendingRoomJoin(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(new URLSearchParams(window.location.search).get("room")?.trim());
}

/** Collab / pending join: room owns the editor; file is backup only (editor → file). */
function isCollabBackupMode(): boolean {
  return isWorkingFileToStoreBlocked() || urlHasPendingRoomJoin();
}

function ensureWriterForAttachedFile(): void {
  const wf = getActiveWorkingFileId();
  const label = getWorkingFileLabel();
  if (wf && isWorkingFileAttached()) {
    ensureWorkingFileWriter(wf);
  } else if (label && isWorkingFileAttached()) {
    ensureWorkingFileWriter(label);
  } else {
    stopWorkingFileWriter();
  }
}

export interface WorkingFileSyncProps {
  onWorkingFileNameChange: (fileName: string | null) => void;
  onDirtyChange?: (dirty: boolean) => void;
  onSavingChange?: (saving: boolean) => void;
  onNeedsFileSetup?: () => void;
}

/**
 * Solo: autosave + rare conflict when disk was changed externally while dirty.
 * Collab: silent editor→file backup only; never pull file into editor; no dialogs for peers.
 */
export function WorkingFileSync({
  onWorkingFileNameChange,
  onDirtyChange,
  onSavingChange,
  onNeedsFileSetup,
}: WorkingFileSyncProps) {
  const [conflictOpen, setConflictOpen] = useState(false);
  const [conflictBusy, setConflictBusy] = useState(false);

  const callbacksRef = useRef({ onWorkingFileNameChange, onDirtyChange, onSavingChange, onNeedsFileSetup });
  callbacksRef.current = { onWorkingFileNameChange, onDirtyChange, onSavingChange, onNeedsFileSetup };

  const mountedRef = useRef(true);
  const saveQueuedRef = useRef(false);
  const saveInFlightRef = useRef(false);
  const suspendAutoPersistRef = useRef(false);
  const conflictActiveRef = useRef(false);
  const lastPersistKeyRef = useRef<string | null>(null);

  const syncFileLabel = () => {
    callbacksRef.current.onWorkingFileNameChange(getWorkingFileLabel());
  };

  const syncDirty = () => {
    callbacksRef.current.onDirtyChange?.(isWorkingFileDirty());
  };

  const handleConflictChoice = useCallback(async (choice: FileConflictChoice) => {
    if (conflictBusy) return;
    const handle = getWorkingFileHandle();
    if (!handle && !isMobileWorkingFileMode()) return;

    setConflictBusy(true);
    suspendAutoPersistRef.current = true;
    setConflictOpen(false);

    try {
      if (choice === "load_file" && handle && !isCollabBackupMode()) {
        const snap = await readWorkingFileSnapshot(handle);
        if (!snap) return;
        if (snap.text.trim()) applyBoardJsonToStore(snap.text);
        markWorkingFileSynced(snap.text, snap.lastModified);
        lastPersistKeyRef.current = boardPersistKeyFromStoreState();
        syncDirty();
        return;
      }

      if (!isWorkingFileWriterLeader()) return;

      const json = boardJsonFromStoreState();
      const expected = getLastKnownFileModified();
      const result = isMobileWorkingFileMode()
        ? await persistWorkingFileJson(json, { skipCas: true })
        : handle
          ? await writeWorkingFileJson(json, handle, {
              expectedLastModified: expected > 0 ? expected : undefined,
              skipCas: isCollabBackupMode(),
            })
          : { ok: false as const, reason: "no_handle" as const };

      if (!result.ok && result.reason === "conflict" && handle) {
        // Force keep-local after user chose keep: skip CAS once.
        const forced = await writeWorkingFileJson(json, handle, { skipCas: true });
        if (!forced.ok) {
          window.alert("Speichern fehlgeschlagen.");
          setConflictOpen(true);
          return;
        }
      } else if (!result.ok) {
        window.alert("Speichern fehlgeschlagen.");
        setConflictOpen(true);
        return;
      }
      lastPersistKeyRef.current = boardPersistKeyFromStoreState();
      syncDirty();
    } finally {
      conflictActiveRef.current = false;
      suspendAutoPersistRef.current = false;
      setConflictBusy(false);
    }
  }, [conflictBusy]);

  useEffect(() => {
    mountedRef.current = true;
    let storeUnsub: (() => void) | undefined;
    let roleUnsub: (() => void) | undefined;
    const externalListeners: Array<{ target: EventTarget; type: string; listener: () => void }> = [];

    const flushPersist = async (opts?: { skipCas?: boolean }): Promise<boolean> => {
      if (
        !isWorkingFileAttached() ||
        isWorkingFilePersistPaused() ||
        !isWorkingFileWriterLeader() ||
        saveInFlightRef.current ||
        conflictActiveRef.current ||
        suspendAutoPersistRef.current
      ) {
        return false;
      }
      if (!isWorkingFileDirty()) {
        syncDirty();
        return true;
      }

      saveInFlightRef.current = true;
      callbacksRef.current.onSavingChange?.(true);
      try {
        const skipCas = opts?.skipCas || isCollabBackupMode();
        const result = await persistWorkingFileJson(boardJsonFromStoreState(), { skipCas });
        if (!mountedRef.current) return false;
        if (result.ok) {
          lastPersistKeyRef.current = boardPersistKeyFromStoreState();
          syncDirty();
          return true;
        }
        // Solo: external change while dirty → one conflict dialog.
        // Collab backup: force rewrite (file is our mirror of the room).
        if (result.reason === "conflict") {
          if (isCollabBackupMode()) {
            const forced = await persistWorkingFileJson(boardJsonFromStoreState(), {
              skipCas: true,
            });
            if (forced.ok) {
              lastPersistKeyRef.current = boardPersistKeyFromStoreState();
              syncDirty();
              return true;
            }
          } else {
            conflictActiveRef.current = true;
            setConflictOpen(true);
          }
        }
        syncDirty();
        return false;
      } finally {
        saveInFlightRef.current = false;
        if (mountedRef.current) callbacksRef.current.onSavingChange?.(false);
      }
    };

    const schedulePersistOnChange = () => {
      if (
        !isWorkingFileAttached() ||
        isWorkingFilePersistPaused() ||
        !isWorkingFileWriterLeader() ||
        conflictActiveRef.current ||
        suspendAutoPersistRef.current
      ) {
        return;
      }
      if (saveQueuedRef.current) return;
      saveQueuedRef.current = true;
      queueMicrotask(() => {
        saveQueuedRef.current = false;
        void flushPersist();
      });
    };

    const onPersistedBoardChanged = () => {
      if (suspendAutoPersistRef.current) return;
      const key = boardPersistKeyFromStoreState();
      if (key === lastPersistKeyRef.current) return;
      lastPersistKeyRef.current = key;
      syncDirty();
      schedulePersistOnChange();
    };

    /**
     * Focus / visibility:
     * - Collab: never pull disk into editor (room owns editor).
     * - Solo, clean editor, disk changed: silent pull (like reopening the file).
     * - Solo, dirty editor, disk changed: one conflict dialog.
     * - Same file other tab wrote: follower pulls silently when clean; leader already wrote.
     */
    const applyExternalFileIfNeeded = async () => {
      if (isMobileWorkingFileMode()) return;
      if (isCollabBackupMode()) return;
      if (
        isWorkingFilePersistPaused() ||
        conflictActiveRef.current ||
        suspendAutoPersistRef.current ||
        saveInFlightRef.current ||
        shouldSuppressExternalFilePoll()
      ) {
        return;
      }

      const handle = getWorkingFileHandle();
      if (!handle) return;

      const snap = await readWorkingFileSnapshot(handle);
      if (!snap || !mountedRef.current) return;
      if (isKnownFileRevision(snap.lastModified)) return;

      const localJson = boardJsonFromStoreState();
      if (boardStatesEquivalent(snap.text, localJson)) {
        markWorkingFileSynced(snap.text, snap.lastModified);
        syncDirty();
        return;
      }

      if (!isWorkingFileDirty()) {
        // Disk ahead, editor clean → adopt silently (other tab or external save).
        suspendAutoPersistRef.current = true;
        try {
          if (snap.text.trim()) applyBoardJsonToStore(snap.text);
          markWorkingFileSynced(snap.text, snap.lastModified);
          lastPersistKeyRef.current = boardPersistKeyFromStoreState();
        } finally {
          suspendAutoPersistRef.current = false;
        }
        syncDirty();
        return;
      }

      // Dirty local + changed disk — only the writer tab asks once.
      if (!isWorkingFileWriterLeader()) return;
      conflictActiveRef.current = true;
      setConflictOpen(true);
    };

    const hydrateFromWorkingFileOnce = async (): Promise<void> => {
      if (wasWorkingFileSessionHydrated()) return;

      const handle = getWorkingFileHandle();
      if (handle) {
        const snap = await readWorkingFileSnapshot(handle);
        if (!snap || !mountedRef.current) return;
        markWorkingFileSessionHydrated();

        if (isCollabBackupMode()) {
          markWorkingFileSynced(snap.text, snap.lastModified);
          return;
        }

        suspendAutoPersistRef.current = true;
        try {
          if (snap.text.trim()) {
            applyBoardJsonToStore(snap.text);
            markWorkingFileSynced(snap.text, snap.lastModified);
          } else {
            markWorkingFileSynced(boardJsonFromStoreState(), snap.lastModified);
          }
        } finally {
          suspendAutoPersistRef.current = false;
        }
        return;
      }

      if (isMobileWorkingFileMode()) {
        const synced = getLastSyncedBoardJson();
        if (!synced?.trim()) {
          callbacksRef.current.onNeedsFileSetup?.();
          return;
        }
        markWorkingFileSessionHydrated();
        if (isCollabBackupMode()) return;
        suspendAutoPersistRef.current = true;
        try {
          applyBoardJsonToStore(synced);
        } finally {
          suspendAutoPersistRef.current = false;
        }
        return;
      }

      callbacksRef.current.onNeedsFileSetup?.();
    };

    const addExternalListener = (target: EventTarget, type: string, listener: () => void) => {
      target.addEventListener(type, listener);
      externalListeners.push({ target, type, listener });
    };

    void (async () => {
      getOrCreateTabSessionId();
      const preferred = resolvePreferredWorkingFileName();
      const preferredWf = resolvePreferredWorkingFileId();
      if (mayAutoRestoreWorkingFileFromStorage() || preferred || preferredWf) {
        await restoreWorkingFileFromDisk(preferred, preferredWf);
      }
      if (!mountedRef.current) return;
      ensureWriterForAttachedFile();
      await hydrateFromWorkingFileOnce();
      if (!mountedRef.current) return;

      lastPersistKeyRef.current = boardPersistKeyFromStoreState();
      syncFileLabel();
      syncDirty();

      storeUnsub = useStormBoardStore.subscribe(onPersistedBoardChanged);
      roleUnsub = onWorkingFileWriterRoleChange((role) => {
        if (role !== "leader") return;
        void (async () => {
          await applyExternalFileIfNeeded();
          if (conflictActiveRef.current) return;
          void flushPersist({ skipCas: isCollabBackupMode() });
        })();
      });

      const reflectSlotInUrl = () => {
        const wf = getActiveWorkingFileId();
        if (!wf || !isWorkingFileAttached()) return;
        bindTabWorkingFile(wf, getWorkingFileLabel());
      };
      const runExternalCheck = () => {
        reflectSlotInUrl();
        void applyExternalFileIfNeeded();
      };
      addExternalListener(window, "focus", runExternalCheck);
      addExternalListener(window, "pageshow", runExternalCheck);
      addExternalListener(document, "visibilitychange", () => {
        if (document.visibilityState === "visible") runExternalCheck();
      });

      const onPageHide = () => {
        if (conflictActiveRef.current) return;
        void flushPersist({ skipCas: isCollabBackupMode() });
      };
      window.addEventListener("pagehide", onPageHide);
      externalListeners.push({ target: window, type: "pagehide", listener: onPageHide });

      const onWorkingFileAttached = () => {
        ensureWriterForAttachedFile();
        lastPersistKeyRef.current = boardPersistKeyFromStoreState();
        syncFileLabel();
        syncDirty();
      };
      addExternalListener(window, WORKING_FILE_ATTACHED_EVENT, onWorkingFileAttached);
      addExternalListener(window, WORKING_FILE_DETACHED_EVENT, onWorkingFileAttached);
    })();

    return () => {
      mountedRef.current = false;
      storeUnsub?.();
      roleUnsub?.();
      stopWorkingFileWriter();
      for (const { target, type, listener } of externalListeners) {
        target.removeEventListener(type, listener);
      }
    };
  }, []);

  return (
    <FileConflictDialog
      open={conflictOpen}
      fileName={getWorkingFileLabel()}
      busy={conflictBusy}
      allowLoadFile={!isCollabBackupMode()}
      description="Die Datei wurde außerhalb dieses Tabs geändert, während ungespeicherte Änderungen vorliegen."
      keepLocalLabel="Meine Version speichern"
      loadFileLabel="Datei laden"
      onChoose={(choice) => void handleConflictChoice(choice)}
    />
  );
}
