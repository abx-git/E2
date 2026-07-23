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
  getLastSyncedBoardJson,
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
} from "@/lib/working-file";
import { useStormBoardStore } from "@/store/storm-board-store";

function urlHasPendingRoomJoin(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(new URLSearchParams(window.location.search).get("room")?.trim());
}

/** Disk must not replace the editor while collab owns the board (or a join is pending). */
function mustNotApplyFileToStore(): boolean {
  return isWorkingFileToStoreBlocked() || urlHasPendingRoomJoin();
}

export interface WorkingFileSyncProps {
  onWorkingFileNameChange: (fileName: string | null) => void;
  onDirtyChange?: (dirty: boolean) => void;
  onSavingChange?: (saving: boolean) => void;
  onNeedsFileSetup?: () => void;
}

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
      // During collab, never load disk into the editor (would overwrite the room via Yjs).
      const resolved: FileConflictChoice =
        choice === "load_file" && mustNotApplyFileToStore() ? "keep_local" : choice;

      if (resolved === "load_file" && handle) {
        const snap = await readWorkingFileSnapshot(handle);
        if (!snap) return;
        if (snap.text.trim()) applyBoardJsonToStore(snap.text);
        markWorkingFileSynced(snap.text, snap.lastModified);
        lastPersistKeyRef.current = boardPersistKeyFromStoreState();
        syncDirty();
        return;
      }

      const json = boardJsonFromStoreState();
      const result = isMobileWorkingFileMode()
        ? await persistWorkingFileJson(json)
        : handle
          ? await writeWorkingFileJson(json, handle)
          : { ok: false as const, reason: "no_handle" as const };
      if (!result.ok) {
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
    const externalListeners: Array<{ target: EventTarget; type: string; listener: () => void }> = [];

    const flushPersist = async (): Promise<boolean> => {
      if (
        !isWorkingFileAttached() ||
        isWorkingFilePersistPaused() ||
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
        const result = await persistWorkingFileJson(boardJsonFromStoreState());
        if (!mountedRef.current) return false;
        if (result.ok) {
          lastPersistKeyRef.current = boardPersistKeyFromStoreState();
          syncDirty();
          return true;
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

    const applyExternalFileIfNeeded = async () => {
      if (isMobileWorkingFileMode()) return;
      if (
        mustNotApplyFileToStore() ||
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
        // Editor matches last sync, but disk differs — only safe to pull when not in collab.
        if (mustNotApplyFileToStore()) return;
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

        // Join pending / collab: attach handle + remember disk bytes, never replace editor.
        if (mustNotApplyFileToStore()) {
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
            await flushPersist();
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
        if (mustNotApplyFileToStore()) {
          return;
        }
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
      await restoreWorkingFileFromDisk();
      if (!mountedRef.current) return;
      await hydrateFromWorkingFileOnce();
      if (!mountedRef.current) return;

      lastPersistKeyRef.current = boardPersistKeyFromStoreState();
      syncFileLabel();
      syncDirty();

      storeUnsub = useStormBoardStore.subscribe(onPersistedBoardChanged);

      const runExternalCheck = () => void applyExternalFileIfNeeded();
      addExternalListener(window, "focus", runExternalCheck);
      addExternalListener(window, "pageshow", runExternalCheck);
      addExternalListener(document, "visibilitychange", () => {
        if (document.visibilityState === "visible") runExternalCheck();
      });

      const onPageHide = () => void flushPersist();
      window.addEventListener("pagehide", onPageHide);
      externalListeners.push({ target: window, type: "pagehide", listener: onPageHide });
    })();

    return () => {
      mountedRef.current = false;
      storeUnsub?.();
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
      allowLoadFile={!mustNotApplyFileToStore()}
      description={
        mustNotApplyFileToStore()
          ? "Während der Kollaboration wird die Arbeitsdatei nur vom Editor aus aktualisiert. Der Editor-/Raum-Stand bleibt erhalten."
          : undefined
      }
      keepLocalLabel={
        mustNotApplyFileToStore() ? "Raum-/Editor-Stand in die Datei schreiben" : undefined
      }
      onChoose={(choice) => void handleConflictChoice(choice)}
    />
  );
}
