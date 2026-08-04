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
  planFileReconcile,
} from "@/lib/file-board-reconcile";
import {
  getWorkingFileHandle,
  getWorkingFileLabel,
  getActiveWorkingFileId,
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
  getLastKnownFileModified,
  WORKING_FILE_ATTACHED_EVENT,
} from "@/lib/working-file";
import {
  confirmMissingUrlContextWrite,
  evaluateWorkingFileWriteGate,
  mayAutoRestoreWorkingFileFromStorage,
} from "@/lib/working-file-safety";
import {
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

/** Disk must not replace the editor while collab owns the board (or a join is pending). */
function mustNotApplyFileToStore(): boolean {
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

function writeGateSnapshot(userConfirmed?: boolean) {
  return evaluateWorkingFileWriteGate({
    attached: isWorkingFileAttached(),
    isWriterLeader: isWorkingFileWriterLeader(),
    activeWf: getActiveWorkingFileId(),
    label: getWorkingFileLabel(),
    userConfirmed,
  });
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
  const [conflictKind, setConflictKind] = useState<"external" | "url_missing">("external");

  const callbacksRef = useRef({ onWorkingFileNameChange, onDirtyChange, onSavingChange, onNeedsFileSetup });
  callbacksRef.current = { onWorkingFileNameChange, onDirtyChange, onSavingChange, onNeedsFileSetup };

  const mountedRef = useRef(true);
  const saveQueuedRef = useRef(false);
  const saveInFlightRef = useRef(false);
  const suspendAutoPersistRef = useRef(false);
  const conflictActiveRef = useRef(false);
  const pendingExternalConflictRef = useRef(false);
  const lastPersistKeyRef = useRef<string | null>(null);
  const urlConfirmGrantedRef = useRef(false);

  const syncFileLabel = () => {
    callbacksRef.current.onWorkingFileNameChange(getWorkingFileLabel());
  };

  const syncDirty = () => {
    callbacksRef.current.onDirtyChange?.(isWorkingFileDirty());
  };

  const openExternalConflict = useCallback(() => {
    pendingExternalConflictRef.current = true;
    conflictActiveRef.current = true;
    setConflictKind("external");
    setConflictOpen(true);
  }, []);

  const handleConflictChoice = useCallback(async (choice: FileConflictChoice) => {
    if (conflictBusy) return;
    const handle = getWorkingFileHandle();
    if (!handle && !isMobileWorkingFileMode()) return;

    setConflictBusy(true);
    suspendAutoPersistRef.current = true;
    setConflictOpen(false);

    try {
      if (conflictKind === "url_missing") {
        if (choice !== "keep_local") {
          // User declined overwrite — leave unbound, do not write.
          return;
        }
        if (!confirmMissingUrlContextWrite(getWorkingFileLabel())) return;
        urlConfirmGrantedRef.current = true;
        const json = boardJsonFromStoreState();
        const result = await persistWorkingFileJson(json, { userConfirmed: true });
        if (!result.ok) {
          window.alert(result.message ?? "Speichern fehlgeschlagen.");
          return;
        }
        lastPersistKeyRef.current = boardPersistKeyFromStoreState();
        syncDirty();
        return;
      }

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

      if (!isWorkingFileWriterLeader()) {
        window.alert(
          "Dieser Tab schreibt die Arbeitsdatei gerade nicht (ein anderer Tab ist aktiv). Bitte den sichtbaren Tab nutzen.",
        );
        openExternalConflict();
        return;
      }

      const json = boardJsonFromStoreState();
      const expected = getLastKnownFileModified();
      const result = isMobileWorkingFileMode()
        ? await persistWorkingFileJson(json, { userConfirmed: urlConfirmGrantedRef.current })
        : handle
          ? await writeWorkingFileJson(json, handle, {
              expectedLastModified: expected > 0 ? expected : undefined,
            })
          : { ok: false as const, reason: "no_handle" as const };
      if (!result.ok) {
        if (result.reason === "conflict") {
          openExternalConflict();
          return;
        }
        window.alert("Speichern fehlgeschlagen.");
        openExternalConflict();
        return;
      }
      lastPersistKeyRef.current = boardPersistKeyFromStoreState();
      syncDirty();
    } finally {
      pendingExternalConflictRef.current = false;
      conflictActiveRef.current = false;
      suspendAutoPersistRef.current = false;
      setConflictBusy(false);
    }
  }, [conflictBusy, conflictKind, openExternalConflict]);

  useEffect(() => {
    mountedRef.current = true;
    let storeUnsub: (() => void) | undefined;
    let roleUnsub: (() => void) | undefined;
    const externalListeners: Array<{ target: EventTarget; type: string; listener: () => void }> = [];

    const openUrlMissingPrompt = () => {
      conflictActiveRef.current = true;
      setConflictKind("url_missing");
      setConflictOpen(true);
    };

    const flushPersist = async (): Promise<boolean> => {
      if (
        !isWorkingFileAttached() ||
        isWorkingFilePersistPaused() ||
        !isWorkingFileWriterLeader() ||
        saveInFlightRef.current ||
        conflictActiveRef.current ||
        suspendAutoPersistRef.current ||
        pendingExternalConflictRef.current
      ) {
        return false;
      }
      if (!isWorkingFileDirty()) {
        syncDirty();
        return true;
      }

      const gate = writeGateSnapshot(urlConfirmGrantedRef.current);
      if (!gate.ok) {
        if (gate.reason === "url_context_missing") {
          openUrlMissingPrompt();
          return false;
        }
        // mismatch / not_writer: never overwrite silently
        return false;
      }

      saveInFlightRef.current = true;
      callbacksRef.current.onSavingChange?.(true);
      try {
        const result = await persistWorkingFileJson(boardJsonFromStoreState(), {
          userConfirmed: urlConfirmGrantedRef.current,
        });
        if (!mountedRef.current) return false;
        if (result.ok) {
          lastPersistKeyRef.current = boardPersistKeyFromStoreState();
          syncDirty();
          return true;
        }
        if (result.reason === "conflict") {
          openExternalConflict();
        } else if (result.reason === "url_context_missing") {
          openUrlMissingPrompt();
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
        suspendAutoPersistRef.current ||
        pendingExternalConflictRef.current
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
     * On focus / visibility: never silently pull disk→editor or push editor→disk
     * when revisions diverge. Always require an explicit conflict choice.
     */
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

      // Divergent disk vs editor (dirty or not) → user must choose. Never silent apply.
      pendingExternalConflictRef.current = true;
      if (!isWorkingFileWriterLeader()) {
        // Follower: remember conflict; dialog opens when this tab becomes writer.
        return;
      }
      openExternalConflict();
    };

    const hydrateFromWorkingFileOnce = async (): Promise<void> => {
      if (wasWorkingFileSessionHydrated()) return;

      const handle = getWorkingFileHandle();
      if (handle) {
        const snap = await readWorkingFileSnapshot(handle);
        if (!snap || !mountedRef.current) return;

        markWorkingFileSessionHydrated();

        if (mustNotApplyFileToStore()) {
          markWorkingFileSynced(snap.text, snap.lastModified);
          return;
        }

        const localJson = boardJsonFromStoreState();
        const plan = planFileReconcile(localJson, snap.text);

        if (plan.action === "conflict") {
          markWorkingFileSynced(localJson, snap.lastModified);
          openExternalConflict();
          return;
        }

        suspendAutoPersistRef.current = true;
        try {
          if (plan.action === "apply_file" || plan.action === "in_sync") {
            if (snap.text.trim()) applyBoardJsonToStore(snap.text);
            markWorkingFileSynced(snap.text, snap.lastModified);
          } else if (plan.action === "push_local") {
            // Empty / weaker file — do NOT auto-write; wait for explicit save.
            markWorkingFileSynced(localJson, snap.lastModified);
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
        const localJson = boardJsonFromStoreState();
        const plan = planFileReconcile(localJson, synced);
        if (plan.action === "conflict") {
          openExternalConflict();
          return;
        }
        suspendAutoPersistRef.current = true;
        try {
          if (plan.action === "apply_file" || plan.action === "in_sync") {
            applyBoardJsonToStore(synced);
          }
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
          // Resolve any pending disk divergence BEFORE flushing local edits.
          await applyExternalFileIfNeeded();
          if (pendingExternalConflictRef.current || conflictActiveRef.current) return;
          void flushPersist();
        })();
      });

      const runExternalCheck = () => void applyExternalFileIfNeeded();
      addExternalListener(window, "focus", runExternalCheck);
      addExternalListener(window, "pageshow", runExternalCheck);
      addExternalListener(document, "visibilitychange", () => {
        if (document.visibilityState === "visible") runExternalCheck();
      });

      // pagehide: only flush when safe (gate + CAS); never force overwrite.
      const onPageHide = () => {
        if (pendingExternalConflictRef.current || conflictActiveRef.current) return;
        void flushPersist();
      };
      window.addEventListener("pagehide", onPageHide);
      externalListeners.push({ target: window, type: "pagehide", listener: onPageHide });

      const onWorkingFileAttached = () => {
        ensureWriterForAttachedFile();
        urlConfirmGrantedRef.current = false;
        pendingExternalConflictRef.current = false;
        lastPersistKeyRef.current = boardPersistKeyFromStoreState();
        syncFileLabel();
        syncDirty();
      };
      addExternalListener(window, WORKING_FILE_ATTACHED_EVENT, onWorkingFileAttached);
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
  }, [openExternalConflict]);

  const conflictTitle =
    conflictKind === "url_missing"
      ? "Speichern ohne URL-Zuordnung?"
      : undefined;
  const conflictDescription =
    conflictKind === "url_missing"
      ? "In der Adresszeile fehlt noch ?filename= / ?wf=. Ohne diese Zuordnung könnte die falsche Datei überschrieben werden. Speichern nur nach Bestätigung."
      : mustNotApplyFileToStore()
        ? "Während der Kollaboration wird die Arbeitsdatei nur vom Editor aus aktualisiert. Der Editor-/Raum-Stand bleibt erhalten."
        : "Datei und Editor weichen voneinander ab. Es wird nichts automatisch überschrieben — bitte wählen.";

  return (
    <FileConflictDialog
      open={conflictOpen}
      fileName={getWorkingFileLabel()}
      busy={conflictBusy}
      allowLoadFile={conflictKind === "url_missing" || !mustNotApplyFileToStore()}
      title={conflictTitle}
      description={conflictDescription}
      keepLocalLabel={
        conflictKind === "url_missing"
          ? "Trotzdem speichern (nach Bestätigung)"
          : mustNotApplyFileToStore()
            ? "Raum-/Editor-Stand in die Datei schreiben"
            : "E2-Stand in die Datei schreiben"
      }
      loadFileLabel={
        conflictKind === "url_missing" ? "Abbrechen — nicht speichern" : "Datei in E2 laden"
      }
      onChoose={(choice) => void handleConflictChoice(choice)}
    />
  );
}
