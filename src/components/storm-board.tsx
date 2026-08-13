"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { BetaRibbon } from "@/components/beta-ribbon";
import { BoardAppBar } from "@/components/board-app-bar";
import {
  BoundedContextMobileActions,
  BoundedContextMobileSheet,
} from "@/components/bounded-context-mobile-sheet";
import {
  BoardBackupSync,
  runManualBoardBackup,
} from "@/components/board-backup-sync";
import { progressMarkFromDigit } from "@/lib/progress-mark";
import { BoardSideRail } from "@/components/board-side-rail";
import { MobileBoardBar } from "@/components/mobile-board-bar";
import { CollabEnterConfirmDialog } from "@/components/collab-enter-confirm-dialog";
import { CollabLeaveDialog, type CollabLeaveChoice } from "@/components/collab-leave-dialog";
import { CollabPresenceBanner } from "@/components/collab-presence-banner";
import { CollabRoomDialog } from "@/components/collab-room-dialog";
import { CollabSyncConflictDialog } from "@/components/collab-sync-conflict-dialog";
import { DataStoragePanel } from "@/components/data-storage-panel";
import { BoardShareLinkDialog } from "@/components/board-share-link-dialog";
import { RemoteBoardLoadDialog } from "@/components/remote-board-load-dialog";
import { CanvasContextMenu } from "@/components/canvas-context-menu";
import { ElementPalette } from "@/components/element-palette";
import {
  FileConflictDialog,
  type FileConflictChoice,
} from "@/components/file-conflict-dialog";
import { StormCanvas } from "@/components/storm-canvas";
import { WorkingFileSetupDialog } from "@/components/working-file-setup-dialog";
import {
  NewWorkingFileDialog,
  type NewWorkingFileChoice,
} from "@/components/new-working-file-dialog";
import { WorkingFileSync } from "@/components/working-file-sync";
import { applyAppearanceToElement } from "@/lib/board-appearance";
import {
  backupBeforeSuspiciousSwitch,
  buildBackupFilename,
  formatLastBackupLabel,
  getLocalBackup,
  readBackupHistoryMode,
  readBackupIntervalMinutes,
  readLastBackupAt,
  type BackupHistoryMode,
  type BackupIntervalMinutes,
  writeBackupHistoryMode,
  writeBackupIntervalMinutes,
  ensureRollingBackupHandle,
} from "@/lib/board-backup";
import { boardHasLocalContent, shouldConfirmCollabEnter } from "@/lib/collab/file-guard";
import {
  capturePreCollabStash,
  clearPreCollabStash,
  getPreCollabStash,
  hasPreCollabStash,
} from "@/lib/collab/pre-collab-stash";
import { boardJsonFromStoreState } from "@/lib/file-board-reconcile";
import {
  fetchAndValidateRemoteBoard,
  readBoardUrlFromSearch,
  stripBoardUrlParamFromLocation,
} from "@/lib/board-remote-url";
import {
  exportBoardPng,
  exportBoardSvg,
  exportContextMapMarkdown,
  exportDomainModelMarkdown,
  exportEventCatalogMarkdown,
  exportEventModelMarkdown,
  exportExampleMappingMarkdown,
  exportGlossaryMarkdown,
  exportHotspotReportMarkdown,
  exportActionItemsMarkdown,
  exportProcessMarkdown,
  exportDataModelMarkdown,
  exportArchitectureDocumentationMarkdown,
  exportStoryMapMarkdown,
} from "@/lib/storm-export";
import {
  BOARD_SNAPSHOT_SCHEMA_FILENAME,
  stringifyBoardSnapshotSchema,
} from "@/lib/storm-json";
import { boardImportPayloadFromAnyExportText } from "@/lib/board-import-text";
import {
  AI_BOARD_CONTEXT_SCHEMA_FILENAME,
  aiContextExportFilename,
  singleViewExportFilename,
  stringifyAiBoardContext,
  stringifySingleViewExport,
} from "@/lib/view-export";
import {
  diagramExportFilename,
  downloadTextFile,
  mermaidFromViewId,
  plantUmlFromViewId,
} from "@/lib/diagram-io";
import { stringifyAiBoardContextSchema } from "@/lib/ai-board-context-import";
import { type FacilitatorPhase } from "@/lib/facilitator-phases";
import { HelpDialog } from "@/components/help-dialog";
import { JsonPasteDialog } from "@/components/json-paste-dialog";
import {
  getElementHelp,
  getPhaseHelp,
  getRelationHelp,
  getContextMapHelp,
  type HelpDialogModel,
} from "@/lib/storm-help";
import {
  loadForeignBoardIntoEditor,
  downloadWorkingFileSafetyCopy,
  attachWorkingFileFromBrowserFile,
  attachWorkingFileFromPastedText,
  attachWorkingFileOpen,
  createAndAttachWorkingFile,
  detachWorkingFile,
  getActiveWorkingFileId,
  getWorkingFileLabel,
  hydrateStoreFromWorkingFile,
  isWorkingFileAttached,
  isWorkingFileDirty,
  isWorkingFilePersistPaused,
  isWorkingFileSupported,
  isWorkingFileUiAvailable,
  markWorkingFileSessionHydrated,
  openRecentWorkingFile,
  persistWorkingFileJson,
  requestWorkingFilePermission,
  resolveWorkingFileImportConflict,
  saveWorkingFileAs,
  suggestedWorkingFileName,
} from "@/lib/working-file";
import { bindTabWorkingFile } from "@/lib/working-file-tab-context";
import { createDefaultBoardDocument } from "@/lib/storm-json";
import { boardImportPayloadFromStore, useStormBoardStore } from "@/store/storm-board-store";
import { flushCollabSnapshotNow, useCollabStore } from "@/lib/collab/session";
import type { ElementType, WorkshopFormat } from "@/types/storm-element";
import type { ContextMapPattern, RelationType } from "@/types/storm-relation";

export function StormBoard() {
  const [storageOpen, setStorageOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [newFileOpen, setNewFileOpen] = useState(false);
  const [workingFileName, setWorkingFileName] = useState<string | null>(null);
  const [workingFileDirty, setWorkingFileDirty] = useState(false);
  const [workingFileSaving, setWorkingFileSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [backupIntervalMinutes, setBackupIntervalMinutes] = useState<BackupIntervalMinutes>(0);
  const [backupHistoryMode, setBackupHistoryMode] = useState<BackupHistoryMode>("history");
  const [backupLastLabel, setBackupLastLabel] = useState(() =>
    formatLastBackupLabel(readLastBackupAt()),
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importViewsInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setBackupIntervalMinutes(readBackupIntervalMinutes());
    setBackupHistoryMode(readBackupHistoryMode());
  }, []);

  const [helpOpen, setHelpOpen] = useState(false);
  const [helpModel, setHelpModel] = useState<HelpDialogModel | null>(null);
  const [collabOpen, setCollabOpen] = useState(false);
  const [pendingRoomCode, setPendingRoomCode] = useState<string | null>(null);
  const [urlJoinConfirm, setUrlJoinConfirm] = useState(false);
  const [persistPaused, setPersistPaused] = useState(false);
  const [multiTabUnsafe, setMultiTabUnsafe] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveBusy, setLeaveBusy] = useState(false);
  const [bcMobileSheetOpen, setBcMobileSheetOpen] = useState(false);
  const [importConflict, setImportConflict] = useState<{
    fileText: string;
    fileLastModified: number;
    fileName: string;
  } | null>(null);
  const [importConflictBusy, setImportConflictBusy] = useState(false);
  const [jsonPasteMode, setJsonPasteMode] = useState<"board" | "ai-view" | "diagram" | null>(null);
  const [shareLinkOpen, setShareLinkOpen] = useState(false);
  const [remoteBoardUrl, setRemoteBoardUrl] = useState<string | null>(null);
  const [remoteBoardBusy, setRemoteBoardBusy] = useState(false);
  const [remoteBoardError, setRemoteBoardError] = useState<string | null>(null);
  const joinRoom = useCollabStore((s) => s.joinRoom);
  const leaveRoom = useCollabStore((s) => s.leaveRoom);
  const syncConflict = useCollabStore((s) => s.syncConflict);
  const resolveSyncConflict = useCollabStore((s) => s.resolveSyncConflict);

  const openHelp = (model: HelpDialogModel) => {
    setHelpModel(model);
    setHelpOpen(true);
  };

  const openElementHelp = (type: ElementType) => openHelp(getElementHelp(type));
  const openRelationHelp = (type: RelationType) => openHelp(getRelationHelp(type));
  const openContextMapHelp = (type: ContextMapPattern) => openHelp(getContextMapHelp(type));
  const openPhaseHelp = (phase: FacilitatorPhase, format: WorkshopFormat) =>
    openHelp(getPhaseHelp(format, phase));

  const title = useStormBoardStore((s) => s.title);
  const appearance = useStormBoardStore((s) => s.appearance);
  const undo = useStormBoardStore((s) => s.undo);
  const redo = useStormBoardStore((s) => s.redo);
  const duplicateElements = useStormBoardStore((s) => s.duplicateElements);
  const applyProgressMark = useStormBoardStore((s) => s.applyProgressMark);
  const boardRootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    applyAppearanceToElement(boardRootRef.current, appearance);
    applyAppearanceToElement(document.documentElement, appearance);
  }, [appearance]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const room = params.get("room");
    if (!room || useCollabStore.getState().active) return;
    setPendingRoomCode(room.trim().toUpperCase());
    setCollabOpen(true);
    if (shouldConfirmCollabEnter()) {
      setUrlJoinConfirm(true);
    } else {
      const name = useCollabStore.getState().displayName || "Gast";
      backupBeforeSuspiciousSwitch("room");
      capturePreCollabStash();
      void joinRoom(room, name);
    }
  }, [joinRoom]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("room")?.trim()) return;
    const boardUrl = readBoardUrlFromSearch(window.location.search);
    if (!boardUrl) return;
    setRemoteBoardUrl(boardUrl);
    setRemoteBoardError(null);
  }, []);

  const handleRemoteBoardCancel = useCallback(() => {
    setRemoteBoardUrl(null);
    setRemoteBoardError(null);
    setRemoteBoardBusy(false);
    stripBoardUrlParamFromLocation();
  }, []);

  const handleRemoteBoardConfirm = useCallback(async () => {
    if (!remoteBoardUrl || remoteBoardBusy) return;
    setRemoteBoardBusy(true);
    setRemoteBoardError(null);
    try {
      const outcome = await fetchAndValidateRemoteBoard(remoteBoardUrl);
      if (!outcome.ok) {
        setRemoteBoardError(outcome.reason);
        return;
      }
      backupBeforeSuspiciousSwitch("file");
      if (!loadForeignBoardIntoEditor(outcome.rawText, { reason: "remote_board" })) {
        setRemoteBoardError("Board konnte nicht geladen werden.");
        return;
      }
      setRemoteBoardUrl(null);
      stripBoardUrlParamFromLocation();
    } finally {
      setRemoteBoardBusy(false);
    }
  }, [remoteBoardUrl, remoteBoardBusy]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || target?.isContentEditable) return;

      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      if (e.key === "d" || e.key === "D") {
        const ids = useStormBoardStore.getState().selectedElementIds;
        if (ids.length === 0) return;
        e.preventDefault();
        duplicateElements(ids);
        return;
      }

      const progressMark = progressMarkFromDigit(e.key);
      if (progressMark) {
        const s = useStormBoardStore.getState();
        if (s.selectedElementIds.length === 0 && !s.selectedRelationId) return;
        e.preventDefault();
        applyProgressMark(progressMark);
        return;
      }

      if (e.key === "z" || e.key === "Z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (e.key === "y" || e.key === "Y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo, duplicateElements, applyProgressMark]);

  const downloadJson = useCallback(() => {
    const json = boardJsonFromStoreState();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/\s+/g, "-").toLowerCase()}.storm.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [title]);

  const copyJsonToClipboard = useCallback(async (): Promise<boolean> => {
    const json = boardJsonFromStoreState();
    try {
      await navigator.clipboard.writeText(json);
      return true;
    } catch {
      window.alert(
        "JSON konnte nicht in die System-Zwischenablage kopiert werden. Bitte Browser-Berechtigung prüfen oder JSON herunterladen.",
      );
      return false;
    }
  }, []);

  const downloadViewJson = useCallback((viewId: string) => {
    const payload = boardImportPayloadFromStore();
    const json = stringifySingleViewExport(payload, viewId);
    const view = payload.views.find((v) => v.id === viewId);
    if (!json || !view) {
      window.alert("Sicht konnte nicht exportiert werden.");
      return;
    }
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = singleViewExportFilename(payload.title, view.name);
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const copyViewJsonToClipboard = useCallback(async (viewId: string): Promise<boolean> => {
    const json = stringifySingleViewExport(boardImportPayloadFromStore(), viewId);
    if (!json) {
      window.alert("Sicht konnte nicht exportiert werden.");
      return false;
    }
    try {
      await navigator.clipboard.writeText(json);
      return true;
    } catch {
      window.alert(
        "JSON konnte nicht in die System-Zwischenablage kopiert werden. Bitte Browser-Berechtigung prüfen oder JSON herunterladen.",
      );
      return false;
    }
  }, []);

  const downloadViewAiContext = useCallback((viewId: string) => {
    const payload = boardImportPayloadFromStore();
    const json = stringifyAiBoardContext(payload, viewId);
    const view = payload.views.find((v) => v.id === viewId);
    if (!json || !view) {
      window.alert("KI-Kontext konnte nicht exportiert werden.");
      return;
    }
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = aiContextExportFilename(payload.title, view.name);
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const copyViewAiContextToClipboard = useCallback(async (viewId: string): Promise<boolean> => {
    const json = stringifyAiBoardContext(boardImportPayloadFromStore(), viewId);
    if (!json) {
      window.alert("KI-Kontext konnte nicht exportiert werden.");
      return false;
    }
    try {
      await navigator.clipboard.writeText(json);
      return true;
    } catch {
      window.alert(
        "KI-Kontext konnte nicht in die System-Zwischenablage kopiert werden. Bitte Browser-Berechtigung prüfen oder herunterladen.",
      );
      return false;
    }
  }, []);

  const downloadJsonSchema = useCallback(() => {
    const json = stringifyBoardSnapshotSchema();
    const blob = new Blob([json], { type: "application/schema+json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = BOARD_SNAPSHOT_SCHEMA_FILENAME;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const downloadAiContextSchema = useCallback(() => {
    const json = stringifyAiBoardContextSchema();
    const blob = new Blob([json], { type: "application/schema+json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = AI_BOARD_CONTEXT_SCHEMA_FILENAME;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const downloadViewMermaid = useCallback((viewId: string) => {
    const text = mermaidFromViewId(viewId);
    const payload = boardImportPayloadFromStore();
    const view = payload.views.find((v) => v.id === viewId);
    if (!text || !view) {
      window.alert("Mermaid konnte nicht exportiert werden.");
      return;
    }
    downloadTextFile(
      diagramExportFilename("mermaid", payload.title, view.name),
      text,
      "text/plain;charset=utf-8",
    );
  }, []);

  const copyViewMermaidToClipboard = useCallback(async (viewId: string): Promise<boolean> => {
    const text = mermaidFromViewId(viewId);
    if (!text) {
      window.alert("Mermaid konnte nicht exportiert werden.");
      return false;
    }
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      window.alert(
        "Mermaid konnte nicht in die Zwischenablage kopiert werden. Bitte herunterladen.",
      );
      return false;
    }
  }, []);

  const downloadViewPlantUml = useCallback((viewId: string) => {
    const text = plantUmlFromViewId(viewId);
    const payload = boardImportPayloadFromStore();
    const view = payload.views.find((v) => v.id === viewId);
    if (!text || !view) {
      window.alert("PlantUML konnte nicht exportiert werden.");
      return;
    }
    downloadTextFile(
      diagramExportFilename("plantuml", payload.title, view.name),
      text,
      "text/plain;charset=utf-8",
    );
  }, []);

  const copyViewPlantUmlToClipboard = useCallback(async (viewId: string): Promise<boolean> => {
    const text = plantUmlFromViewId(viewId);
    if (!text) {
      window.alert("PlantUML konnte nicht exportiert werden.");
      return false;
    }
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      window.alert(
        "PlantUML konnte nicht in die Zwischenablage kopiert werden. Bitte herunterladen.",
      );
      return false;
    }
  }, []);

  const syncWorkingFileUrlContext = () => {
    const label = getWorkingFileLabel();
    bindTabWorkingFile(getActiveWorkingFileId(), label);
    setWorkingFileName(label);
  };

  const handleStartWithoutFile = () => {
    markWorkingFileSessionHydrated();
    setSetupOpen(false);
  };

  const handleCreateWorkingFile = async () => {
    setBusy(true);
    try {
      const suggested = suggestedWorkingFileName(title || getWorkingFileLabel());
      const handle = await createAndAttachWorkingFile(boardJsonFromStoreState(), suggested);
      if (handle) {
        syncWorkingFileUrlContext();
        setSetupOpen(false);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSaveWorkingFileAs = async () => {
    setBusy(true);
    try {
      if (!isWorkingFileSupported()) {
        window.alert(
          "Speichern unter… braucht die File-System-API (Chrome, Edge oder Brave). Alternativ JSON exportieren.",
        );
        return;
      }
      const suggested = suggestedWorkingFileName(
        getWorkingFileLabel() || title || undefined,
      );
      const handle = await saveWorkingFileAs(boardJsonFromStoreState(), suggested);
      if (handle) {
        syncWorkingFileUrlContext();
        setWorkingFileDirty(false);
        setPersistPaused(false);
        setSetupOpen(false);
        setStorageOpen(false);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSaveWorkingFile = async () => {
    if (!isWorkingFileAttached() || isWorkingFilePersistPaused()) {
      await handleSaveWorkingFileAs();
      return;
    }
    setBusy(true);
    try {
      const result = await persistWorkingFileJson(boardJsonFromStoreState());
      if (!result.ok) {
        if (result.diskJson?.trim()) {
          downloadWorkingFileSafetyCopy(result.diskJson, "disk");
        }
        window.alert(
          result.reason === "conflict" || result.reason === "content_cas_mismatch"
            ? "Die Datei wurde zwischenzeitlich geändert und wurde nicht überschrieben. Eine Kopie des Dateistands wurde heruntergeladen — bitte „Speichern unter…“ nutzen oder die Datei neu öffnen."
            : result.reason === "empty_over_nonempty"
              ? "Leerer Stand wird nicht über die Arbeitsdatei geschrieben."
              : result.reason === "persist_paused"
                ? "Speichern ist pausiert — bitte „Speichern unter…“ nutzen."
                : result.reason === "not_writer"
                  ? "Ein anderer Tab speichert diese Datei gerade. Bitte den sichtbaren Tab nutzen."
                  : result.message ?? "Speichern fehlgeschlagen — Datei nicht überschrieben.",
        );
        return;
      }
      syncWorkingFileUrlContext();
      setWorkingFileDirty(false);
      setPersistPaused(false);
    } finally {
      setBusy(false);
    }
  };

  /** Block loading another document while the current board is not persisted. */
  const ensureSavedBeforeOpen = (): boolean => {
    const attached = isWorkingFileAttached();
    const dirty = isWorkingFileDirty();
    const unsavedWithoutFile = !attached && boardHasLocalContent();
    if (!dirty && !unsavedWithoutFile) return true;

    window.alert(
      attached
        ? "Es gibt ungespeicherte Änderungen. Bitte zuerst speichern (Speichern oder Speichern unter…), bevor du eine andere Datei oder ein Backup öffnest."
        : "Das Board ist noch nicht gespeichert. Bitte zuerst „Speichern unter…“ wählen, bevor du eine andere Datei oder ein Backup öffnest.",
    );
    return false;
  };

  const handleNewWorkingFile = () => {
    if (useCollabStore.getState().active || useCollabStore.getState().connecting) {
      window.alert(
        "Während der Kollaboration kann keine neue Datei angelegt werden — das würde den Raum überschreiben. Bitte zuerst den Raum verlassen.",
      );
      return;
    }
    setNewFileOpen(true);
  };

  const handleNewWorkingFileChoice = async (choice: NewWorkingFileChoice) => {
    if (choice.action === "cancel") {
      setNewFileOpen(false);
      return;
    }

    setBusy(true);
    try {
      backupBeforeSuspiciousSwitch("file");
      await detachWorkingFile();
      useStormBoardStore.getState().replaceBoardFromImport(
        createDefaultBoardDocument({ title: choice.title }),
      );
      setWorkingFileDirty(false);
      setSetupOpen(false);
      setStorageOpen(false);

      if (choice.action === "empty_without_file") {
        // Tab-Kontext leeren — kein stilles Wiederanbinden der alten Datei.
        bindTabWorkingFile(null);
        setWorkingFileName(null);
        setWorkingFileDirty(false);
        setWorkingFileSaving(false);
        markWorkingFileSessionHydrated();
        setNewFileOpen(false);
        return;
      }

      // create_with_file: neuen Speicherort wählen → neuer wf in der URL.
      const handle = await createAndAttachWorkingFile(
        boardJsonFromStoreState(),
        choice.suggestedFileName,
      );
      if (!handle) {
        // User aborted picker — keep empty board, clear URL context.
        bindTabWorkingFile(null);
        setWorkingFileName(null);
        markWorkingFileSessionHydrated();
        setNewFileOpen(false);
        return;
      }
      syncWorkingFileUrlContext();
      setWorkingFileDirty(false);
      setNewFileOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const handleOpenWorkingFile = async () => {
    if (useCollabStore.getState().active || useCollabStore.getState().connecting) {
      window.alert(
        "Während der Kollaboration kann keine andere Datei in den Editor geladen werden — das würde den Raum überschreiben. Bitte zuerst den Raum verlassen.",
      );
      return;
    }
    if (!ensureSavedBeforeOpen()) return;
    setBusy(true);
    try {
      // Picker needs user activation — run before any safety-download click.
      const handle = await attachWorkingFileOpen();
      if (!handle) return;
      backupBeforeSuspiciousSwitch("file");
      const hydrate = await hydrateStoreFromWorkingFile(handle);
      if (hydrate.status === "conflict") {
        setImportConflict({
          fileText: hydrate.fileText,
          fileLastModified: hydrate.fileLastModified,
          fileName: handle.name || "Arbeitsdatei",
        });
        return;
      }
      setPersistPaused(false);
      setWorkingFileDirty(false);
      syncWorkingFileUrlContext();
      setSetupOpen(false);
      setStorageOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const handleOpenRecentWorkingFile = async (handle: FileSystemFileHandle) => {
    if (useCollabStore.getState().active || useCollabStore.getState().connecting) {
      window.alert(
        "Während der Kollaboration kann keine andere Datei in den Editor geladen werden — das würde den Raum überschreiben. Bitte zuerst den Raum verlassen.",
      );
      return;
    }
    if (!ensureSavedBeforeOpen()) return;
    setBusy(true);
    try {
      // Permission must run while the click gesture is still valid — before backup download.
      const permitted = await requestWorkingFilePermission(handle);
      if (!permitted) {
        window.alert(
          "Datei konnte nicht geöffnet werden. Bitte Berechtigung erteilen oder die Datei erneut über „Datei öffnen“ wählen.",
        );
        return;
      }
      backupBeforeSuspiciousSwitch("file");
      const result = await openRecentWorkingFile(handle, { skipPermission: true });
      if (!result) {
        window.alert(
          "Datei konnte nicht geöffnet werden. Bitte die Datei erneut über „Datei öffnen“ wählen.",
        );
        return;
      }
      if (result.hydrate.status === "conflict") {
        setImportConflict({
          fileText: result.hydrate.fileText,
          fileLastModified: result.hydrate.fileLastModified,
          fileName: result.handle.name || "Arbeitsdatei",
        });
        return;
      }
      setPersistPaused(false);
      setWorkingFileDirty(false);
      syncWorkingFileUrlContext();
      setSetupOpen(false);
      setStorageOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const handleOpenLocalBackup = async (backupId: string) => {
    if (useCollabStore.getState().active || useCollabStore.getState().connecting) {
      window.alert(
        "Während der Kollaboration kann kein Backup in den Editor geladen werden. Bitte zuerst den Raum verlassen.",
      );
      return;
    }
    if (!ensureSavedBeforeOpen()) return;
    setBusy(true);
    try {
      const record = await getLocalBackup(backupId);
      if (!record?.json?.trim()) {
        window.alert("Backup wurde nicht gefunden oder ist leer.");
        return;
      }
      backupBeforeSuspiciousSwitch("file");
      if (!loadForeignBoardIntoEditor(record.json, { reason: "backup" })) {
        window.alert("Backup konnte nicht geladen werden.");
        return;
      }
      setWorkingFileName(getWorkingFileLabel());
      setPersistPaused(true);
      setStorageOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const handlePasteJson = () => {
    if (useCollabStore.getState().active || useCollabStore.getState().connecting) {
      window.alert(
        "Während der Kollaboration kann kein JSON in den Editor geladen werden. Bitte zuerst den Raum verlassen.",
      );
      return;
    }
    if (!ensureSavedBeforeOpen()) return;
    setJsonPasteMode("board");
  };

  const applyPastedBoardJson = async (raw: string) => {
    setBusy(true);
    try {
      backupBeforeSuspiciousSwitch("file");
      const result = await attachWorkingFileFromPastedText(raw);
      if (result.status === "read_error") {
        window.alert(result.message);
        return;
      }
      if (result.status === "conflict") {
        setImportConflict({
          fileText: result.fileText,
          fileLastModified: result.fileLastModified,
          fileName: "Einfügen",
        });
        setJsonPasteMode(null);
        return;
      }
      setJsonPasteMode(null);
      setSetupOpen(false);
      setStorageOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const handleRestoreBackupFilePick = () => {
    if (!ensureSavedBeforeOpen()) return;
    fileInputRef.current?.click();
  };

  const handleImportConflict = async (choice: FileConflictChoice) => {
    if (!importConflict || importConflictBusy) return;
    setImportConflictBusy(true);
    try {
      await resolveWorkingFileImportConflict(
        choice,
        importConflict.fileText,
        importConflict.fileLastModified,
        importConflict.fileName,
      );
      setImportConflict(null);
      if (choice === "keep_local") {
        setPersistPaused(true);
        window.alert(
          "Editor behalten — die geöffnete Datei wurde nicht überschrieben. Nutze „Speichern unter…“, wenn du speichern willst.",
        );
      } else {
        setPersistPaused(false);
      }
      setSetupOpen(false);
    } finally {
      setImportConflictBusy(false);
    }
  };

  const handleLeaveChoice = async (choice: CollabLeaveChoice) => {
    setLeaveBusy(true);
    try {
      if (choice === "restore_pre_collab") {
        const ok = window.confirm(
          "Stand vor dem Raum wiederherstellen?\n\nDer aktuelle Board-Inhalt (Raum-Stand) wird im Editor durch die ältere lokale Kopie ersetzt. Die Arbeitsdatei wird dabei nicht überschrieben.\n\nWähle Abbrechen und danach „Raum verlassen“, wenn du den Remote-Stand behalten willst.",
        );
        if (!ok) return;
        backupBeforeSuspiciousSwitch("room");
      }

      await flushCollabSnapshotNow();
      leaveRoom();

      if (choice === "restore_pre_collab") {
        const stash = getPreCollabStash();
        if (stash?.json.trim()) {
          if (!loadForeignBoardIntoEditor(stash.json, { reason: "pre_collab_restore" })) {
            window.alert("Vorheriger Stand konnte nicht wiederhergestellt werden.");
          } else {
            setPersistPaused(true);
            window.alert(
              "Stand vor dem Raum wiederhergestellt. Die Arbeitsdatei wurde nicht überschrieben — nutze „Speichern unter…“, wenn du speichern willst.",
            );
          }
        }
      }

      clearPreCollabStash();
      setLeaveOpen(false);
    } finally {
      setLeaveBusy(false);
    }
  };

  const beginCollabEnter = async (
    choice: "proceed" | "save_and_proceed",
    enter: () => Promise<void>,
  ) => {
    if (choice === "save_and_proceed" && isWorkingFileAttached()) {
      const result = await persistWorkingFileJson(boardJsonFromStoreState());
      if (!result.ok) {
        window.alert("Speichern in die Arbeitsdatei fehlgeschlagen.");
        return;
      }
    }
    backupBeforeSuspiciousSwitch("room");
    capturePreCollabStash();
    await enter();
  };

  const handleBrowserFile = () => fileInputRef.current?.click();

  const handleImportAsNewViews = () => importViewsInputRef.current?.click();

  const applyImportedFileAsNewViews = (text: string): boolean => {
    const payload = boardImportPayloadFromAnyExportText(text);
    if (!payload) {
      window.alert(
        'Ungültiges E2-JSON, KI-Kontext oder Diagramm (Mermaid / PlantUML).',
      );
      return false;
    }
    const result = useStormBoardStore.getState().importDocumentAsNewViews(payload);
    if (!result.ok) {
      window.alert(result.error);
      return false;
    }
    setStorageOpen(false);
    return true;
  };

  const handlePasteAiContextAsNewView = () => {
    if (useCollabStore.getState().active || useCollabStore.getState().connecting) {
      window.alert(
        "Während der Kollaboration kann kein KI-Kontext eingefügt werden. Bitte zuerst den Raum verlassen.",
      );
      return;
    }
    setJsonPasteMode("ai-view");
  };

  const handlePasteDiagramAsNewView = () => {
    if (useCollabStore.getState().active || useCollabStore.getState().connecting) {
      window.alert(
        "Während der Kollaboration kann kein Diagramm eingefügt werden. Bitte zuerst den Raum verlassen.",
      );
      return;
    }
    setJsonPasteMode("diagram");
  };

  const applyPastedAiOrViewJson = (raw: string) => {
    if (applyImportedFileAsNewViews(raw)) {
      setJsonPasteMode(null);
    }
  };

  return (
    <div
      ref={boardRootRef}
      className="relative flex h-screen min-h-0 flex-col overflow-hidden bg-[var(--bg)] text-[var(--text)]"
    >
      <BetaRibbon />
      <WorkingFileSync
        onWorkingFileNameChange={setWorkingFileName}
        onDirtyChange={setWorkingFileDirty}
        onSavingChange={setWorkingFileSaving}
        onNeedsFileSetup={() => setSetupOpen(true)}
        onPersistPausedChange={setPersistPaused}
        onMultiTabUnsafeChange={setMultiTabUnsafe}
      />
      <BoardBackupSync
        intervalMinutes={backupIntervalMinutes}
        onLastBackupChange={setBackupLastLabel}
      />

      <BoardAppBar
        workingFileSaving={workingFileSaving}
        onOpenCollab={() => setCollabOpen(true)}
        onOpenStorage={() => setStorageOpen(true)}
      />

      <CollabPresenceBanner onRequestLeave={() => setLeaveOpen(true)} />

      <CollabSyncConflictDialog
        open={syncConflict !== null}
        onExportJson={downloadJson}
        onChoose={(choice) => {
          void resolveSyncConflict(choice).then((r) => {
            if (!r.ok) window.alert(r.error);
          });
        }}
      />

      <div className="mx-2 mb-2 mt-2 flex min-h-0 flex-1 gap-2 lg:mx-3 lg:mb-3">
        <div className="dock-surface hidden overflow-hidden rounded-dock lg:flex">
          <ElementPalette onSelectType={() => {}} onRequestHelp={openElementHelp} />
        </div>
        <div className="dock-surface relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-dock">
          <StormCanvas />
          <BoundedContextMobileActions onOpenDetails={() => setBcMobileSheetOpen(true)} />
          <MobileBoardBar
            onRequestHelpElementType={openElementHelp}
            onRequestHelpRelationType={openRelationHelp}
            onRequestHelpPhase={openPhaseHelp}
          />
        </div>
        <BoardSideRail
          onRequestHelpElementType={openElementHelp}
          onRequestHelpRelationType={openRelationHelp}
          onRequestHelpPhase={openPhaseHelp}
        />
      </div>

      <footer className="flex shrink-0 items-center justify-between px-4 pb-2 text-[0.72rem] text-[var(--muted)]">
        <span>
          {multiTabUnsafe ? (
            <span className="mr-2 text-[var(--accent-2)]">
              Mehrere Tabs ohne Lock — nur der sichtbare Tab speichert.{" "}
            </span>
          ) : null}
          {persistPaused ? (
            <span className="text-[var(--accent-2)]">
              Nicht in Arbeitsdatei speichern — „Speichern unter…“
              {workingFileName ? ` · ${workingFileName}` : ""}
            </span>
          ) : workingFileName ? (
            `Arbeitsdatei: ${workingFileName}${workingFileDirty ? " · ungespeichert" : workingFileSaving ? " · speichert …" : " · gespeichert"}`
          ) : isWorkingFileAttached() ? (
            "Arbeitsdatei verknüpft"
          ) : (
                <>
                  Keine Arbeitsdatei —{" "}
                  {isWorkingFileUiAvailable() ? (
                    <button
                      type="button"
                      className="underline decoration-dotted underline-offset-2 hover:text-[var(--text)]"
                      onClick={() => void handleSaveWorkingFileAs()}
                    >
                      Speichern unter…
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="underline decoration-dotted underline-offset-2 hover:text-[var(--text)]"
                      onClick={() => setStorageOpen(true)}
                    >
                      Speicherort wählen
                    </button>
                  )}
                </>
              )}
        </span>
        <span className="hidden sm:inline">
          Rechtsklick · Pan · E2 · © A. Bergmann
        </span>
        <span className="sm:hidden">Wischen · Panel · © A. Bergmann</span>
      </footer>

      <BoundedContextMobileSheet
        open={bcMobileSheetOpen}
        onClose={() => setBcMobileSheetOpen(false)}
      />

      <CanvasContextMenu
        onRequestHelpElementType={(type) => openElementHelp(type as ElementType)}
        onRequestHelpRelationType={openRelationHelp}
        onRequestHelpContextMap={openContextMapHelp}
      />

      <DataStoragePanel
        open={storageOpen}
        onClose={() => setStorageOpen(false)}
        fsAccessSupported={isWorkingFileSupported()}
        workingFileLabel={workingFileName}
        workingFileAttached={isWorkingFileAttached()}
        workingFileDirty={workingFileDirty}
        workingFileSaving={workingFileSaving}
        workingFilePersistPaused={persistPaused}
        mustSaveBeforeOpen={
          workingFileDirty || (!isWorkingFileAttached() && boardHasLocalContent())
        }
        backupIntervalMinutes={backupIntervalMinutes}
        backupHistoryMode={backupHistoryMode}
        backupLastLabel={backupLastLabel}
        onBackupIntervalChange={(minutes) => {
          writeBackupIntervalMinutes(minutes);
          setBackupIntervalMinutes(minutes);
        }}
        onBackupHistoryModeChange={(mode) => {
          writeBackupHistoryMode(mode);
          setBackupHistoryMode(mode);
          if (mode === "rolling" && isWorkingFileSupported()) {
            const title =
              useStormBoardStore.getState().title?.trim() || "board";
            const suggested = buildBackupFilename(title, new Date(), "rolling");
            void ensureRollingBackupHandle(suggested, { allowPick: true });
          }
        }}
        onBackupNow={() => void runManualBoardBackup(setBackupLastLabel)}
        onNewWorkingFile={() => handleNewWorkingFile()}
        onSaveWorkingFile={() => void handleSaveWorkingFile()}
        onOpenWorkingFile={() => void handleOpenWorkingFile()}
        onSaveWorkingFileAs={() => void handleSaveWorkingFileAs()}
        onOpenRecentWorkingFile={(handle) => void handleOpenRecentWorkingFile(handle)}
        onOpenLocalBackup={(id) => void handleOpenLocalBackup(id)}
        onRestoreBackupFile={handleRestoreBackupFilePick}
        onRestoreBackupPaste={() => void handlePasteJson()}
        onOpenBoardShareLink={() => {
          setStorageOpen(false);
          setShareLinkOpen(true);
        }}
        onImportAsNewViews={handleImportAsNewViews}
        onExportJson={downloadJson}
        onCopyJsonToClipboard={copyJsonToClipboard}
        onExportViewJson={downloadViewJson}
        onCopyViewJsonToClipboard={copyViewJsonToClipboard}
        onExportViewAiContext={downloadViewAiContext}
        onCopyViewAiContextToClipboard={copyViewAiContextToClipboard}
        onExportAiContextSchema={downloadAiContextSchema}
        onPasteAiContextAsNewView={handlePasteAiContextAsNewView}
        onExportViewMermaid={downloadViewMermaid}
        onCopyViewMermaidToClipboard={copyViewMermaidToClipboard}
        onExportViewPlantUml={downloadViewPlantUml}
        onCopyViewPlantUmlToClipboard={copyViewPlantUmlToClipboard}
        onPasteDiagramAsNewView={handlePasteDiagramAsNewView}
        onExportJsonSchema={downloadJsonSchema}
        onExportSvg={exportBoardSvg}
        onExportPng={() => void exportBoardPng()}
        onExportHotspots={exportHotspotReportMarkdown}
        onExportActionItems={exportActionItemsMarkdown}
        onExportGlossary={exportGlossaryMarkdown}
        onExportContextMap={exportContextMapMarkdown}
        onExportEventCatalog={exportEventCatalogMarkdown}
        onExportDomainModel={exportDomainModelMarkdown}
        onExportExampleMapping={exportExampleMappingMarkdown}
        onExportStoryMap={exportStoryMapMarkdown}
        onExportEventModel={exportEventModelMarkdown}
        onExportProcess={exportProcessMarkdown}
        onExportDataModel={exportDataModelMarkdown}
        onExportArchitectureDocumentation={exportArchitectureDocumentationMarkdown}
        onOpenCollab={() => {
          setStorageOpen(false);
          setCollabOpen(true);
        }}
        busy={busy}
      />

      <CollabRoomDialog
        open={collabOpen}
        onClose={() => {
          setCollabOpen(false);
          setPendingRoomCode(null);
          if (typeof window !== "undefined") {
            const url = new URL(window.location.href);
            if (url.searchParams.has("room") && !useCollabStore.getState().active) {
              url.searchParams.delete("room");
              window.history.replaceState({}, "", url.toString());
            }
          }
        }}
        initialJoinCode={pendingRoomCode}
        onExportJson={downloadJson}
        onRequestLeave={() => setLeaveOpen(true)}
      />

      <CollabEnterConfirmDialog
        open={urlJoinConfirm}
        mode="join"
        workingFileAttached={isWorkingFileAttached()}
        workingFileDirty={isWorkingFileDirty()}
        boardHasContent={boardHasLocalContent()}
        onExportJson={downloadJson}
        onChoose={(choice) => {
          setUrlJoinConfirm(false);
          if (choice === "cancel" || !pendingRoomCode) {
            setPendingRoomCode(null);
            if (typeof window !== "undefined") {
              const url = new URL(window.location.href);
              url.searchParams.delete("room");
              window.history.replaceState({}, "", url.toString());
            }
            return;
          }
          const name = useCollabStore.getState().displayName || "Gast";
          const code = pendingRoomCode;
          void beginCollabEnter(choice, async () => {
            await joinRoom(code, name);
          });
        }}
      />

      <CollabLeaveDialog
        open={leaveOpen}
        hasPreCollabStash={hasPreCollabStash()}
        preCollabFileLabel={getPreCollabStash()?.fileLabel ?? workingFileName ?? getWorkingFileLabel()}
        busy={leaveBusy}
        onCancel={() => setLeaveOpen(false)}
        onChoose={(choice) => void handleLeaveChoice(choice)}
      />

      <FileConflictDialog
        open={importConflict !== null}
        fileName={importConflict?.fileName ?? null}
        busy={importConflictBusy}
        title="Datei öffnen"
        description="Die gewählte Datei konnte nicht als E2-Board geladen werden, oder der Inhalt ist ungültig. Der Editor behält deinen aktuellen Stand — die Datei wird nicht überschrieben."
        keepLocalLabel="Editor behalten (Datei nicht überschreiben)"
        loadFileLabel="Datei trotzdem versuchen"
        onChoose={(choice) => void handleImportConflict(choice)}
      />

      <JsonPasteDialog
        open={jsonPasteMode === "board"}
        title="JSON einfügen"
        description="Vollständiges Board (.storm.json) oder KI-Kontext einfügen. Ersetzt den aktuellen Board-Stand."
        placeholder='{ "format": "event-storming-tool", "version": 2, … }'
        confirmLabel="Board laden"
        busy={busy}
        onClose={() => setJsonPasteMode(null)}
        onConfirm={(text) => void applyPastedBoardJson(text)}
      />

      <JsonPasteDialog
        open={jsonPasteMode === "ai-view"}
        title="KI-Kontext einfügen"
        description="Reduziertes KI-JSON (oder .storm.json) als neue Sicht hinzufügen. Bestehende Sichten bleiben erhalten; Elemente werden automatisch arrangiert."
        placeholder='{ "format": "event-storming-tool-ai-context", "version": 1, … }'
        confirmLabel="Als Sicht importieren"
        busy={busy}
        onClose={() => setJsonPasteMode(null)}
        onConfirm={applyPastedAiOrViewJson}
      />

      <JsonPasteDialog
        open={jsonPasteMode === "diagram"}
        title="Diagramm einfügen"
        description="Mermaid- oder PlantUML-Text als neue Sicht importieren. Elemente werden automatisch arrangiert."
        placeholder={"flowchart LR\n  A[Place Order] -->|löst aus| B[Order Placed]"}
        confirmLabel="Als Sicht importieren"
        busy={busy}
        onClose={() => setJsonPasteMode(null)}
        onConfirm={applyPastedAiOrViewJson}
      />

      <BoardShareLinkDialog open={shareLinkOpen} onClose={() => setShareLinkOpen(false)} />

      <RemoteBoardLoadDialog
        open={remoteBoardUrl !== null}
        sourceUrl={remoteBoardUrl ?? ""}
        busy={remoteBoardBusy}
        boardHasContent={boardHasLocalContent()}
        error={remoteBoardError}
        onCancel={handleRemoteBoardCancel}
        onConfirm={() => void handleRemoteBoardConfirm()}
      />

      <NewWorkingFileDialog
        open={newFileOpen}
        busy={busy}
        currentFileName={workingFileName}
        hasUnsavedChanges={workingFileDirty}
        hasBoardContent={boardHasLocalContent()}
        fsAccessSupported={isWorkingFileSupported()}
        onChoose={(choice) => void handleNewWorkingFileChoice(choice)}
      />

      <WorkingFileSetupDialog
        open={setupOpen && !isWorkingFileAttached()}
        fsAccessSupported={isWorkingFileUiAvailable()}
        busy={busy}
        onStartWithoutFile={handleStartWithoutFile}
        onOpenFile={() => void handleOpenWorkingFile()}
        onCreateFile={() => void handleCreateWorkingFile()}
        onPickBrowserFile={handleBrowserFile}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.storm.json,application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          if (useCollabStore.getState().active || useCollabStore.getState().connecting) {
            window.alert(
              "Während der Kollaboration kann keine Datei in den Editor geladen werden. Bitte zuerst den Raum verlassen.",
            );
            return;
          }
          if (!ensureSavedBeforeOpen()) return;
          setBusy(true);
          backupBeforeSuspiciousSwitch("file");
          void attachWorkingFileFromBrowserFile(file).then((result) => {
            setBusy(false);
            if (result.status === "read_error") {
              window.alert(result.message);
              return;
            }
            if (result.status === "conflict") {
              setImportConflict({
                fileText: result.fileText,
                fileLastModified: result.fileLastModified,
                fileName: file.name || "Import",
              });
              return;
            }
            syncWorkingFileUrlContext();
            setSetupOpen(false);
            setStorageOpen(false);
          });
        }}
      />

      <input
        ref={importViewsInputRef}
        type="file"
        accept=".json,.storm.json,application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setBusy(true);
          void file
            .text()
            .then((text) => {
              applyImportedFileAsNewViews(text);
            })
            .catch(() => {
              window.alert("Datei konnte nicht gelesen werden.");
            })
            .finally(() => setBusy(false));
        }}
      />

      <HelpDialog open={helpOpen} model={helpModel} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
