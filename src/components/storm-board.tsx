"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
import { BoardDockReopenButton } from "@/components/board-dock-toggle";
import { BoardSideRail } from "@/components/board-side-rail";
import { MobileBoardBar } from "@/components/mobile-board-bar";
import {
  CollabEnterConfirmDialog,
  type CollabEnterChoice,
} from "@/components/collab-enter-confirm-dialog";
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
import { ActionsBoardView } from "@/components/actions/ActionsBoardView";
import { StormCanvas } from "@/components/storm-canvas";
import { isActionsView } from "@/lib/storm-json";
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
  detachFileLibrary,
  grantFileLibraryPermission,
  isFileLibraryAttached,
  pickFileLibraryFolder,
  resolveLibraryFileHandle,
  restoreFileLibraryFromIdb,
  type FileLibraryEntry,
} from "@/lib/file-library";
import {
  fetchAndValidateRemoteBoard,
  readBoardUrlFromSearch,
  stripBoardUrlParamFromLocation,
} from "@/lib/board-remote-url";
import {
  copyBoardDrawioToClipboard,
  copyBoardPromptToClipboard,
  exportBoardPdf,
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
  exportArchitectureMeasuresMarkdown,
  exportProcessMarkdown,
  exportDataModelMarkdown,
  exportArchitectureDocumentationMarkdown,
  exportStoryMapMarkdown,
} from "@/lib/storm-export";
import {
  BOARD_SNAPSHOT_SCHEMA_FILENAME,
  stringifyBoardSnapshotSchema,
} from "@/lib/storm-json";
import {
  boardImportPayloadFromAnyExportText,
  boardImportPayloadFromJsonText,
  looksLikePasteImportText,
} from "@/lib/board-import-text";
import {
  singleViewExportFilename,
  stringifySingleViewExport,
} from "@/lib/view-export";
import {
  diagramExportFilename,
  downloadTextFile,
  mermaidFromViewId,
  plantUmlFromViewId,
} from "@/lib/diagram-io";
import { buildAiClipboardPackage } from "@/lib/ai-context-mode-schema";
import {
  buildE2vClipboardPackage,
  buildE2vSchemaPromptPackageForView,
  encodeE2vDocument,
  encodeE2vSingleView,
  e2vExportFilename,
  e2vSchemaPromptExportFilename,
  E2V_SCHEMA_FILENAME,
  stringifyE2vSchema,
} from "@/lib/e2v";
import { type FacilitatorPhase } from "@/lib/facilitator-phases";
import { HelpDialog } from "@/components/help-dialog";
import { JsonPasteDialog } from "@/components/json-paste-dialog";
import { resolveHelpRequest, type HelpRequest } from "@/lib/storm-help";
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
  isCollabGuestLocalPersistEnabled,
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
  STANDARD_WORKING_FILENAME,
  suggestedWorkingFileName,
  renameWorkingFile,
} from "@/lib/working-file";
import { bindTabWorkingFile } from "@/lib/working-file-tab-context";
import { createDefaultBoardDocument } from "@/lib/storm-json";
import { boardImportPayloadFromStore, useStormBoardStore } from "@/store/storm-board-store";
import { flushCollabSnapshotNow, useCollabStore } from "@/lib/collab/session";
import type { ElementType, WorkshopFormat } from "@/types/storm-element";
import type { ContextMapPattern, RelationType } from "@/types/storm-relation";
import {
  UnsavedChangesDialog,
  type UnsavedChangesChoice,
} from "@/components/unsaved-changes-dialog";
import {
  runElementAttributeCopy,
  runElementAttributePaste,
} from "@/lib/element-attribute-clipboard-ui";
import { useLocale, useT } from "@/i18n";

export function StormBoard() {
  const t = useT();
  const locale = useLocale();
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
  const canvasFileDragDepthRef = useRef(0);
  const [canvasFileDragOver, setCanvasFileDragOver] = useState(false);

  useEffect(() => {
    setBackupIntervalMinutes(readBackupIntervalMinutes());
    setBackupHistoryMode(readBackupHistoryMode());
    void restoreFileLibraryFromIdb();
  }, []);

  const [helpOpen, setHelpOpen] = useState(false);
  const [helpRequest, setHelpRequest] = useState<HelpRequest | null>(null);
  const helpModel = useMemo(
    () => (helpRequest ? resolveHelpRequest(helpRequest, locale) : null),
    [helpRequest, locale],
  );
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
  const [unsavedPrompt, setUnsavedPrompt] = useState<{
    actionLabel: string;
    /** Runs after Speichern or Nicht speichern (same user-gesture chain when possible). */
    proceed: () => void | Promise<void>;
  } | null>(null);
  const [unsavedBusy, setUnsavedBusy] = useState(false);
  const [jsonPasteMode, setJsonPasteMode] = useState<
    "board" | "ai-view" | "e2v-view" | "diagram" | "json-view" | null
  >(null);
  const [jsonPasteInitial, setJsonPasteInitial] = useState("");
  const [shareLinkOpen, setShareLinkOpen] = useState(false);
  const [remoteBoardUrl, setRemoteBoardUrl] = useState<string | null>(null);
  const [remoteBoardBusy, setRemoteBoardBusy] = useState(false);
  const [remoteBoardError, setRemoteBoardError] = useState<string | null>(null);
  const joinRoom = useCollabStore((s) => s.joinRoom);
  const leaveRoom = useCollabStore((s) => s.leaveRoom);
  const syncConflict = useCollabStore((s) => s.syncConflict);
  const resolveSyncConflict = useCollabStore((s) => s.resolveSyncConflict);

  const openHelpRequest = (request: HelpRequest) => {
    setHelpRequest(request);
    setHelpOpen(true);
  };

  const openElementHelp = (type: ElementType) => openHelpRequest({ kind: "element", type });
  const openRelationHelp = (type: RelationType) => openHelpRequest({ kind: "relation", type });
  const openContextMapHelp = (type: ContextMapPattern) =>
    openHelpRequest({ kind: "contextMap", type });
  const openPhaseHelp = (phase: FacilitatorPhase, format: WorkshopFormat) =>
    openHelpRequest({ kind: "phase", format, phase });

  const title = useStormBoardStore((s) => s.title);
  const appearance = useStormBoardStore((s) => s.appearance);
  const undo = useStormBoardStore((s) => s.undo);
  const redo = useStormBoardStore((s) => s.redo);
  const elementsPanelOpen = useStormBoardStore((s) => s.elementsPanelOpen);
  const propertiesPanelOpen = useStormBoardStore((s) => s.propertiesPanelOpen);
  const activeViewId = useStormBoardStore((s) => s.activeViewId);
  const activeView = useStormBoardStore((s) =>
    s.views.find((v) => v.id === s.activeViewId),
  );
  const isActionsActive = activeView ? isActionsView(activeView) : false;
  const setElementsPanelOpen = useStormBoardStore((s) => s.setElementsPanelOpen);
  const setPropertiesPanelOpen = useStormBoardStore((s) => s.setPropertiesPanelOpen);
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
    setUrlJoinConfirm(true);
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
        setRemoteBoardError(t("alerts.boardLoadFailed"));
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

      if (e.altKey && e.key === "ArrowLeft") {
        e.preventDefault();
        useStormBoardStore.getState().navigateViewBack();
        return;
      }

      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      if (e.key === "d" || e.key === "D") {
        const ids = useStormBoardStore.getState().selectedElementIds;
        if (ids.length === 0) return;
        e.preventDefault();
        duplicateElements(ids);
        return;
      }

      if (e.shiftKey && (e.key === "c" || e.key === "C")) {
        const ids = useStormBoardStore.getState().selectedElementIds;
        if (ids.length !== 1) return;
        e.preventDefault();
        runElementAttributeCopy(ids[0]!);
        return;
      }

      if (e.shiftKey && (e.key === "v" || e.key === "V")) {
        const ids = useStormBoardStore.getState().selectedElementIds;
        if (ids.length !== 1) {
          window.alert(t("alerts.elementAttributesPasteNoTarget"));
          return;
        }
        e.preventDefault();
        const outcome = runElementAttributePaste(t, ids[0]!);
        if (outcome.status === "error") {
          if (outcome.reason === "no_clipboard") {
            window.alert(t("alerts.elementAttributesPasteNoClipboard"));
          } else if (outcome.reason === "same_element") {
            window.alert(t("alerts.elementAttributesPasteSameElement"));
          } else {
            window.alert(t("alerts.elementAttributesPasteNoTarget"));
          }
        }
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
  }, [undo, redo, duplicateElements, applyProgressMark, t]);

  const downloadJson = useCallback(() => {
    const json = boardJsonFromStoreState();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = suggestedWorkingFileName(title);
    a.click();
    URL.revokeObjectURL(url);
  }, [title]);

  const copyJsonToClipboard = useCallback(async (): Promise<boolean> => {
    const json = boardJsonFromStoreState();
    try {
      await navigator.clipboard.writeText(json);
      return true;
    } catch {
      window.alert(t("alerts.jsonClipboardFailed"));
      return false;
    }
  }, []);

  const downloadViewJson = useCallback((viewId: string) => {
    const payload = boardImportPayloadFromStore();
    const json = stringifySingleViewExport(payload, viewId);
    const view = payload.views.find((v) => v.id === viewId);
    if (!json || !view) {
      window.alert(t("alerts.viewExportFailed"));
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
      window.alert(t("alerts.viewExportFailed"));
      return false;
    }
    try {
      await navigator.clipboard.writeText(json);
      return true;
    } catch {
      window.alert(t("alerts.jsonClipboardFailed"));
      return false;
    }
  }, []);

  const copyAiPackageToClipboard = useCallback(
    async (viewId: string): Promise<boolean> => {
      const pack = buildAiClipboardPackage(boardImportPayloadFromStore(), viewId);
      if (!pack) {
        window.alert(t("alerts.aiContextExportFailed"));
        return false;
      }
      try {
        await navigator.clipboard.writeText(pack);
        return true;
      } catch {
        window.alert(t("alerts.aiContextClipboardFailed"));
        return false;
      }
    },
    [t],
  );

  const downloadE2vDocument = useCallback(() => {
    const payload = boardImportPayloadFromStore();
    const text = encodeE2vDocument(payload, { scope: "document" });
    const slug =
      title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "board";
    downloadTextFile(`${slug}.e2v.txt`, text, "text/plain");
  }, [title]);

  const downloadViewE2v = useCallback((viewId: string) => {
    const payload = boardImportPayloadFromStore();
    const text = encodeE2vSingleView(payload, viewId);
    const view = payload.views.find((v) => v.id === viewId);
    if (!text || !view) {
      window.alert(t("alerts.viewExportFailed"));
      return;
    }
    downloadTextFile(e2vExportFilename(payload.title, view.name), text, "text/plain");
  }, [t]);

  const copyE2vPackageToClipboard = useCallback(
    async (viewId: string): Promise<boolean> => {
      const pack = buildE2vClipboardPackage(boardImportPayloadFromStore(), viewId);
      if (!pack) {
        window.alert(t("alerts.viewExportFailed"));
        return false;
      }
      try {
        await navigator.clipboard.writeText(pack);
        return true;
      } catch {
        window.alert(t("alerts.aiContextClipboardFailed"));
        return false;
      }
    },
    [t],
  );

  const copyE2vSchemaPromptPackageToClipboard = useCallback(
    async (viewId: string): Promise<boolean> => {
      const payload = boardImportPayloadFromStore();
      const pack = buildE2vSchemaPromptPackageForView(payload, viewId);
      if (!pack) {
        window.alert(t("alerts.viewExportFailed"));
        return false;
      }
      try {
        await navigator.clipboard.writeText(pack);
        return true;
      } catch {
        window.alert(t("alerts.aiContextClipboardFailed"));
        return false;
      }
    },
    [t],
  );

  const downloadE2vSchemaPromptPackage = useCallback(
    (viewId: string) => {
      const payload = boardImportPayloadFromStore();
      const view = payload.views.find((v) => v.id === viewId);
      const pack = buildE2vSchemaPromptPackageForView(payload, viewId);
      if (!pack || !view) {
        window.alert(t("alerts.viewExportFailed"));
        return;
      }
      downloadTextFile(
        e2vSchemaPromptExportFilename(payload.title, view.name),
        pack,
        "text/markdown;charset=utf-8",
      );
    },
    [t],
  );

  const downloadE2vSchema = useCallback(() => {
    downloadTextFile(E2V_SCHEMA_FILENAME, stringifyE2vSchema(), "application/schema+json");
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

  const copyJsonSchemaToClipboard = useCallback(async (): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(stringifyBoardSnapshotSchema());
      return true;
    } catch {
      window.alert(t("alerts.jsonClipboardFailed"));
      return false;
    }
  }, [t]);

  const copyE2vSchemaToClipboard = useCallback(async (): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(stringifyE2vSchema());
      return true;
    } catch {
      window.alert(t("alerts.jsonClipboardFailed"));
      return false;
    }
  }, [t]);

  const downloadViewMermaid = useCallback((viewId: string) => {
    const text = mermaidFromViewId(viewId);
    const payload = boardImportPayloadFromStore();
    const view = payload.views.find((v) => v.id === viewId);
    if (!text || !view) {
      window.alert(t("alerts.mermaidExportFailed"));
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
      window.alert(t("alerts.mermaidExportFailed"));
      return false;
    }
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      window.alert(t("alerts.mermaidClipboardFailed"));
      return false;
    }
  }, []);

  const downloadViewPlantUml = useCallback((viewId: string) => {
    const text = plantUmlFromViewId(viewId);
    const payload = boardImportPayloadFromStore();
    const view = payload.views.find((v) => v.id === viewId);
    if (!text || !view) {
      window.alert(t("alerts.plantUmlExportFailed"));
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
      window.alert(t("alerts.plantUmlExportFailed"));
      return false;
    }
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      window.alert(t("alerts.plantUmlClipboardFailed"));
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
        window.alert(t("alerts.saveAsNeedsFsApi"));
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
            ? t("alerts.saveConflictDownloaded")
            : result.reason === "empty_over_nonempty"
              ? t("alerts.saveEmptyOverNonempty")
              : result.reason === "persist_paused"
                ? t("alerts.savePaused")
                : result.reason === "not_writer"
                  ? t("alerts.saveNotWriter")
                  : result.message ?? t("alerts.saveFailed"),
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

  /** Windows-style prompt before New / Open / Close when the document is dirty. */
  const runWithUnsavedGuard = useCallback(
    async (actionLabel: string, proceed: () => void | Promise<void>) => {
      const attached = isWorkingFileAttached();
      const dirty = isWorkingFileDirty() || persistPaused;
      const unsavedWithoutFile = !attached && boardHasLocalContent();
      if (!dirty && !unsavedWithoutFile) {
        await proceed();
        return;
      }
      setUnsavedPrompt({ actionLabel, proceed });
    },
    [persistPaused],
  );

  const handleUnsavedChoice = async (choice: UnsavedChangesChoice) => {
    if (!unsavedPrompt) return;
    const { proceed } = unsavedPrompt;
    if (choice === "cancel") {
      setUnsavedPrompt(null);
      return;
    }
    if (choice === "discard") {
      setUnsavedPrompt(null);
      await proceed();
      return;
    }
    // save — then continue (picker needs this click activation when possible)
    setUnsavedBusy(true);
    try {
      if (!isWorkingFileAttached() || isWorkingFilePersistPaused()) {
        const suggested = suggestedWorkingFileName(
          getWorkingFileLabel() || title || undefined,
        );
        const handle = await saveWorkingFileAs(boardJsonFromStoreState(), suggested);
        if (!handle) return; // aborted Speichern unter
        syncWorkingFileUrlContext();
        setWorkingFileDirty(false);
        setPersistPaused(false);
      } else {
        const result = await persistWorkingFileJson(boardJsonFromStoreState());
        if (!result.ok) {
          window.alert(result.message ?? t("alerts.saveFailedShort"));
          return;
        }
        setWorkingFileDirty(false);
      }
      setUnsavedPrompt(null);
      await proceed();
    } finally {
      setUnsavedBusy(false);
    }
  };

  const handleNewWorkingFile = () => {
    if (useCollabStore.getState().active || useCollabStore.getState().connecting) {
      window.alert(t("alerts.collabNoNewFile"));
      return;
    }
    void runWithUnsavedGuard(t("alerts.actionNew"), () => {
      setNewFileOpen(true);
    });
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
      setPersistPaused(false);
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

  const openWorkingFileNow = async () => {
    setBusy(true);
    try {
      const handle = await attachWorkingFileOpen();
      if (!handle) return;
      backupBeforeSuspiciousSwitch("file");
      const hydrate = await hydrateStoreFromWorkingFile(handle);
      if (hydrate.status === "conflict") {
        setImportConflict({
          fileText: hydrate.fileText,
          fileLastModified: hydrate.fileLastModified,
          fileName: handle.name || t("common.defaultWorkingFile"),
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

  const handleOpenWorkingFile = () => {
    if (useCollabStore.getState().active || useCollabStore.getState().connecting) {
      window.alert(t("alerts.collabNoOpenFile"));
      return;
    }
    void runWithUnsavedGuard(t("alerts.actionOpen"), () => openWorkingFileNow());
  };

  const handleCloseWorkingFile = () => {
    if (useCollabStore.getState().active || useCollabStore.getState().connecting) {
      window.alert(t("alerts.collabNoCloseFile"));
      return;
    }
    void runWithUnsavedGuard(t("alerts.actionClose"), async () => {
      setBusy(true);
      try {
        backupBeforeSuspiciousSwitch("file");
        await detachWorkingFile();
        useStormBoardStore.getState().replaceBoardFromImport(createDefaultBoardDocument({ title: "" }));
        bindTabWorkingFile(null);
        setWorkingFileName(null);
        setWorkingFileDirty(false);
        setPersistPaused(false);
        markWorkingFileSessionHydrated();
        setStorageOpen(false);
      } finally {
        setBusy(false);
      }
    });
  };

  const handleRenameWorkingFile = async () => {
    if (!isWorkingFileAttached()) {
      window.alert(t("alerts.noWorkingFileLinked"));
      return;
    }
    const current = getWorkingFileLabel() || STANDARD_WORKING_FILENAME;
    const next = window.prompt(t("alerts.renamePrompt"), current);
    if (next == null) return;
    const trimmed = next.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      const result = await renameWorkingFile(trimmed);
      if (!result.ok) {
        window.alert(result.reason);
        return;
      }
      setWorkingFileName(result.name);
      syncWorkingFileUrlContext();
    } finally {
      setBusy(false);
    }
  };

  const handleOpenRecentWorkingFile = (handle: FileSystemFileHandle) => {
    if (useCollabStore.getState().active || useCollabStore.getState().connecting) {
      window.alert(t("alerts.collabNoOpenFile"));
      return;
    }
    void runWithUnsavedGuard(t("alerts.actionOpen"), async () => {
      setBusy(true);
      try {
        const permitted = await requestWorkingFilePermission(handle);
        if (!permitted) {
          window.alert(t("alerts.openFileFailedPermission"));
          return;
        }
        backupBeforeSuspiciousSwitch("file");
        const result = await openRecentWorkingFile(handle, { skipPermission: true });
        if (!result) {
          window.alert(t("alerts.openFileFailedRetry"));
          return;
        }
        if (result.hydrate.status === "conflict") {
          setImportConflict({
            fileText: result.hydrate.fileText,
            fileLastModified: result.hydrate.fileLastModified,
            fileName: result.handle.name || t("common.defaultWorkingFile"),
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
    });
  };

  const handlePickFileLibrary = async () => {
    setBusy(true);
    try {
      const ok = await pickFileLibraryFolder();
      if (!ok) return;
    } finally {
      setBusy(false);
    }
  };

  const handleGrantFileLibrary = async () => {
    setBusy(true);
    try {
      await grantFileLibraryPermission();
    } finally {
      setBusy(false);
    }
  };

  const handleDetachFileLibrary = async () => {
    await detachFileLibrary();
  };

  const handleOpenFileLibraryEntry = (entry: FileLibraryEntry) => {
    if (useCollabStore.getState().active || useCollabStore.getState().connecting) {
      window.alert(t("alerts.collabNoOpenFile"));
      return;
    }
    const actionLabel = entry.kind === "backup" ? t("alerts.actionOpenBackup") : t("alerts.actionOpen");
    void runWithUnsavedGuard(actionLabel, async () => {
      setBusy(true);
      try {
        const handle = await resolveLibraryFileHandle(entry.path);
        if (!handle) {
          window.alert(t("alerts.libraryEntryMissing"));
          return;
        }
        if (entry.kind === "backup") {
          const file = await handle.getFile();
          const json = await file.text();
          if (!json.trim()) {
            window.alert(t("alerts.backupOpenEmpty"));
            return;
          }
          backupBeforeSuspiciousSwitch("file");
          if (!loadForeignBoardIntoEditor(json, { reason: "backup" })) {
            window.alert(t("alerts.backupLoadFailed"));
            return;
          }
          setWorkingFileName(getWorkingFileLabel());
          setPersistPaused(true);
          setStorageOpen(false);
          return;
        }
        const permitted = await requestWorkingFilePermission(handle);
        if (!permitted) {
          window.alert(t("alerts.openFileFailedOpenDialog"));
          return;
        }
        backupBeforeSuspiciousSwitch("file");
        const result = await openRecentWorkingFile(handle, { skipPermission: true });
        if (!result) {
          window.alert(t("alerts.openFileFailedOpenDialog"));
          return;
        }
        if (result.hydrate.status === "conflict") {
          setImportConflict({
            fileText: result.hydrate.fileText,
            fileLastModified: result.hydrate.fileLastModified,
            fileName: result.handle.name || entry.title,
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
    });
  };

  const handleOpenLocalBackup = (backupId: string) => {
    if (useCollabStore.getState().active || useCollabStore.getState().connecting) {
      window.alert(t("alerts.collabNoBackupLoad"));
      return;
    }
    void runWithUnsavedGuard(t("alerts.actionOpenBackup"), async () => {
      setBusy(true);
      try {
        const record = await getLocalBackup(backupId);
        if (!record?.json?.trim()) {
          window.alert(t("alerts.backupOpenEmpty"));
          return;
        }
        backupBeforeSuspiciousSwitch("file");
        if (!loadForeignBoardIntoEditor(record.json, { reason: "backup" })) {
          window.alert(t("alerts.backupLoadFailed"));
          return;
        }
        setWorkingFileName(getWorkingFileLabel());
        setPersistPaused(true);
        setStorageOpen(false);
      } finally {
        setBusy(false);
      }
    });
  };

  const handlePasteJson = () => {
    if (useCollabStore.getState().active || useCollabStore.getState().connecting) {
      window.alert(t("alerts.collabNoJsonLoad"));
      return;
    }
    void runWithUnsavedGuard(t("alerts.actionPasteJson"), () => {
      setJsonPasteInitial("");
      setJsonPasteMode("board");
    });
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
          fileName: t("alerts.pasteFileName"),
        });
        setJsonPasteMode(null);
        setJsonPasteInitial("");
        return;
      }
      setJsonPasteMode(null);
      setJsonPasteInitial("");
      setSetupOpen(false);
      setStorageOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const handleRestoreBackupFilePick = () => {
    void runWithUnsavedGuard(t("alerts.actionOpen"), () => {
      fileInputRef.current?.click();
    });
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
        window.alert(t("alerts.keepEditorAfterConflict"));
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
        const ok = window.confirm(t("alerts.restorePreCollabConfirm"));
        if (!ok) return;
        backupBeforeSuspiciousSwitch("room");
      }

      await flushCollabSnapshotNow();
      if (isCollabGuestLocalPersistEnabled() && isWorkingFileAttached()) {
        await persistWorkingFileJson(boardJsonFromStoreState());
      }
      leaveRoom();

      if (choice === "restore_pre_collab") {
        const stash = getPreCollabStash();
        if (stash?.json.trim()) {
          if (!loadForeignBoardIntoEditor(stash.json, { reason: "pre_collab_restore" })) {
            window.alert(t("alerts.restorePreCollabFailed"));
          } else {
            setPersistPaused(true);
            window.alert(t("alerts.restorePreCollabDone"));
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
    choice: CollabEnterChoice,
    enter: (opts: { guestSaveToDisk: boolean }) => Promise<void>,
  ) => {
    if (choice === "cancel") return;
    if (choice === "save_and_proceed" && isWorkingFileAttached()) {
      const result = await persistWorkingFileJson(boardJsonFromStoreState());
      if (!result.ok) {
        window.alert(t("dialogs.collabSaveFailed"));
        return;
      }
    }
    backupBeforeSuspiciousSwitch("room");
    capturePreCollabStash();
    await enter({ guestSaveToDisk: choice === "join_with_disk" });
  };

  const handleBrowserFile = () => fileInputRef.current?.click();

  const handleImportAsNewViews = () => importViewsInputRef.current?.click();

  const collabBlocksPasteAsNewView = (action: string): boolean => {
    if (useCollabStore.getState().active || useCollabStore.getState().connecting) {
      window.alert(t("alerts.collabNoPaste", { kind: action }));
      return true;
    }
    return false;
  };

  const importFileTextAsNewViews = (text: string): boolean => {
    const payload = boardImportPayloadFromAnyExportText(text);
    if (!payload) return false;
    const result = useStormBoardStore.getState().importDocumentAsNewViews(payload);
    if (!result.ok) {
      window.alert(result.error);
      return false;
    }
    setStorageOpen(false);
    return true;
  };

  const applyImportedFileAsNewViews = (text: string): boolean => {
    if (!importFileTextAsNewViews(text)) {
      window.alert(t("alerts.invalidImportFormat"));
      return false;
    }
    return true;
  };

  const applyDroppedFilesAsNewViews = async (files: FileList | File[]): Promise<void> => {
    if (collabBlocksPasteAsNewView(t("alerts.dropImportKind"))) return;
    const list = Array.from(files);
    if (!list.length) return;
    setBusy(true);
    let imported = 0;
    try {
      for (const file of list) {
        try {
          const text = await file.text();
          if (importFileTextAsNewViews(text)) imported += 1;
        } catch {
          window.alert(t("alerts.fileReadFailed"));
        }
      }
      if (imported === 0) {
        window.alert(t("alerts.invalidImportFormat"));
      }
    } finally {
      setBusy(false);
    }
  };

  const applyImportedJsonAsNewViews = (text: string): boolean => {
    const payload = boardImportPayloadFromJsonText(text);
    if (!payload) {
      window.alert(t("alerts.invalidImportJson"));
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

  const handleImportFromClipboard = () => {
    if (collabBlocksPasteAsNewView(t("alerts.dropImportKind"))) return;
    void (async () => {
      let clip = "";
      try {
        clip = (await navigator.clipboard.readText()).trim();
      } catch {
        clip = "";
      }
      if (clip && importFileTextAsNewViews(clip)) return;
      setJsonPasteInitial(clip && looksLikePasteImportText(clip) ? clip : "");
      setJsonPasteMode("json-view");
    })();
  };

  const handlePasteJsonAsNewView = handleImportFromClipboard;

  const handlePasteAiContextAsNewView = () => {
    if (collabBlocksPasteAsNewView("KI-Kontext")) return;
    setJsonPasteInitial("");
    setJsonPasteMode("ai-view");
  };

  const handlePasteE2vAsNewView = () => {
    if (collabBlocksPasteAsNewView("E2V")) return;
    setJsonPasteInitial("");
    setJsonPasteMode("e2v-view");
  };

  const handlePasteDiagramAsNewView = () => {
    if (collabBlocksPasteAsNewView("Diagramm")) return;
    setJsonPasteInitial("");
    setJsonPasteMode("diagram");
  };

  const applyPastedAiOrViewJson = (raw: string) => {
    if (applyImportedFileAsNewViews(raw)) {
      setJsonPasteMode(null);
      setJsonPasteInitial("");
    }
  };

  const applyPastedJsonAsNewView = (raw: string) => {
    if (applyImportedJsonAsNewViews(raw)) {
      setJsonPasteMode(null);
      setJsonPasteInitial("");
    }
  };

  const closeJsonPaste = () => {
    setJsonPasteMode(null);
    setJsonPasteInitial("");
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
        onPasteJsonAsNewView={handlePasteJsonAsNewView}
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
        {elementsPanelOpen && !isActionsActive ? (
          <div className="dock-surface hidden overflow-hidden rounded-dock lg:flex">
            <ElementPalette
              onSelectType={() => {}}
              onRequestHelp={openElementHelp}
              onHide={() => setElementsPanelOpen(false)}
            />
          </div>
        ) : null}
        <div
          className="dock-surface relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-dock"
          onDragEnter={(e) => {
            if (!e.dataTransfer.types.includes("Files")) return;
            e.preventDefault();
            canvasFileDragDepthRef.current += 1;
            setCanvasFileDragOver(true);
          }}
          onDragLeave={() => {
            canvasFileDragDepthRef.current -= 1;
            if (canvasFileDragDepthRef.current <= 0) {
              canvasFileDragDepthRef.current = 0;
              setCanvasFileDragOver(false);
            }
          }}
          onDragOver={(e) => {
            if (!e.dataTransfer.types.includes("Files")) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
          }}
          onDrop={(e) => {
            canvasFileDragDepthRef.current = 0;
            setCanvasFileDragOver(false);
            if (!e.dataTransfer.types.includes("Files")) return;
            e.preventDefault();
            const { files } = e.dataTransfer;
            if (!files?.length) return;
            void applyDroppedFilesAsNewViews(files);
          }}
        >
          {!elementsPanelOpen && !isActionsActive ? (
            <BoardDockReopenButton side="left" onOpen={() => setElementsPanelOpen(true)} />
          ) : null}
          {!propertiesPanelOpen ? (
            <BoardDockReopenButton side="right" onOpen={() => setPropertiesPanelOpen(true)} />
          ) : null}
          {canvasFileDragOver ? (
            <div
              className="pointer-events-none absolute inset-0 z-[70] flex items-center justify-center border-2 border-dashed border-[var(--accent-2)] bg-[var(--accent-2)]/10 px-6 text-center"
              aria-hidden
            >
              <p className="max-w-md text-sm font-medium text-[var(--text)]">
                {t("chrome.dropImportHint")}
              </p>
            </div>
          ) : null}
          {isActionsActive ? (
            <ActionsBoardView viewId={activeViewId} />
          ) : (
            <>
              <StormCanvas />
              <BoundedContextMobileActions onOpenDetails={() => setBcMobileSheetOpen(true)} />
              <MobileBoardBar
                onRequestHelpElementType={openElementHelp}
                onRequestHelpRelationType={openRelationHelp}
                onRequestHelpPhase={openPhaseHelp}
              />
            </>
          )}
        </div>
        {propertiesPanelOpen ? (
          <BoardSideRail
            onRequestHelpElementType={openElementHelp}
            onRequestHelpRelationType={openRelationHelp}
            onRequestHelpPhase={openPhaseHelp}
            onHide={() => setPropertiesPanelOpen(false)}
          />
        ) : null}
      </div>

      <footer className="flex shrink-0 items-center justify-between px-4 pb-2 text-[0.72rem] text-[var(--muted)]">
        <span>
          {multiTabUnsafe ? (
            <span className="mr-2 text-[var(--accent-2)]">{t("footer.multiTabUnsafe")} </span>
          ) : null}
          {persistPaused ? (
            <span className="text-[var(--accent-2)]">
              {t("footer.persistPaused", {
                file: workingFileName ? ` · ${workingFileName}` : "",
              })}
            </span>
          ) : workingFileName ? (
            t("footer.workingFileLine", {
              name: workingFileName,
              status: workingFileDirty
                ? t("footer.statusUnsaved")
                : workingFileSaving
                  ? t("footer.statusSaving")
                  : t("footer.statusSaved"),
            })
          ) : isWorkingFileAttached() ? (
            t("footer.workingFileLinked")
          ) : (
            <>
              {t("footer.noWorkingFile")}{" "}
              {isWorkingFileUiAvailable() ? (
                <button
                  type="button"
                  className="underline decoration-dotted underline-offset-2 hover:text-[var(--text)]"
                  onClick={() => void handleSaveWorkingFileAs()}
                >
                  {t("storage.saveAs")}
                </button>
              ) : (
                <button
                  type="button"
                  className="underline decoration-dotted underline-offset-2 hover:text-[var(--text)]"
                  onClick={() => setStorageOpen(true)}
                >
                  {t("footer.pickSaveLocation")}
                </button>
              )}
            </>
          )}
        </span>
        <span className="hidden sm:inline">{t("footer.hintsDesktop")}</span>
        <span className="sm:hidden">{t("footer.hintsMobile")}</span>
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
        hasUnsavedDocument={
          workingFileDirty || persistPaused || (!isWorkingFileAttached() && boardHasLocalContent())
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
          if (mode === "rolling" && isWorkingFileSupported() && !isFileLibraryAttached()) {
            const title =
              useStormBoardStore.getState().title?.trim() || "board";
            const suggested = buildBackupFilename(title, new Date(), "rolling");
            void ensureRollingBackupHandle(suggested, { allowPick: true });
          }
        }}
        onBackupNow={() => void runManualBoardBackup(setBackupLastLabel)}
        onNewWorkingFile={() => void handleNewWorkingFile()}
        onSaveWorkingFile={() => void handleSaveWorkingFile()}
        onOpenWorkingFile={() => void handleOpenWorkingFile()}
        onSaveWorkingFileAs={() => void handleSaveWorkingFileAs()}
        onCloseWorkingFile={() => void handleCloseWorkingFile()}
        onRenameWorkingFile={() => void handleRenameWorkingFile()}
        onOpenRecentWorkingFile={(handle) => void handleOpenRecentWorkingFile(handle)}
        onPickFileLibrary={() => void handlePickFileLibrary()}
        onGrantFileLibrary={() => void handleGrantFileLibrary()}
        onDetachFileLibrary={() => void handleDetachFileLibrary()}
        onOpenFileLibraryEntry={(entry) => void handleOpenFileLibraryEntry(entry)}
        onOpenLocalBackup={(id) => void handleOpenLocalBackup(id)}
        onRestoreBackupFile={handleRestoreBackupFilePick}
        onOpenBoardShareLink={() => {
          setStorageOpen(false);
          setShareLinkOpen(true);
        }}
        onImportFromFile={handleImportAsNewViews}
        onImportFromClipboard={handleImportFromClipboard}
        onReplaceBoardFromClipboard={() => void handlePasteJson()}
        onExportJson={downloadJson}
        onCopyJsonToClipboard={copyJsonToClipboard}
        onExportViewJson={downloadViewJson}
        onCopyViewJsonToClipboard={copyViewJsonToClipboard}
        onCopyAiPackageToClipboard={copyAiPackageToClipboard}
        onCopyE2vSchemaPromptPackageToClipboard={copyE2vSchemaPromptPackageToClipboard}
        onExportE2vSchemaPromptPackage={downloadE2vSchemaPromptPackage}
        onExportE2vDocument={downloadE2vDocument}
        onExportViewE2v={downloadViewE2v}
        onCopyE2vPackageToClipboard={copyE2vPackageToClipboard}
        onExportE2vSchema={downloadE2vSchema}
        onExportViewMermaid={downloadViewMermaid}
        onCopyViewMermaidToClipboard={copyViewMermaidToClipboard}
        onExportViewPlantUml={downloadViewPlantUml}
        onCopyViewPlantUmlToClipboard={copyViewPlantUmlToClipboard}
        onExportJsonSchema={downloadJsonSchema}
        onCopyJsonSchemaToClipboard={copyJsonSchemaToClipboard}
        onCopyE2vSchemaToClipboard={copyE2vSchemaToClipboard}
        onExportSvg={exportBoardSvg}
        onExportPng={() => void exportBoardPng()}
        onExportPdf={exportBoardPdf}
        onCopyPromptToClipboard={copyBoardPromptToClipboard}
        onCopyDrawioToClipboard={copyBoardDrawioToClipboard}
        onExportHotspots={exportHotspotReportMarkdown}
        onExportActionItems={exportActionItemsMarkdown}
        onExportArchitectureMeasures={exportArchitectureMeasuresMarkdown}
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
          const name = useCollabStore.getState().displayName || t("common.guest");
          const code = pendingRoomCode;
          void beginCollabEnter(choice, async ({ guestSaveToDisk }) => {
            await joinRoom(code, name, { guestSaveToDisk });
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
        title={t("dialogs.importOpenTitle")}
        description={t("dialogs.importOpenBody")}
        keepLocalLabel={t("dialogs.importKeepEditor")}
        loadFileLabel={t("dialogs.importTryLoad")}
        onChoose={(choice) => void handleImportConflict(choice)}
      />

      <JsonPasteDialog
        open={jsonPasteMode === "board"}
        title={t("dialogs.jsonPasteBoardTitle")}
        description={t("dialogs.jsonPasteBoardBody")}
        placeholder={'{ "format": "event-storming-tool", … }\n\n# e2v/1\n@format event-storming-tool-e2v\n…'}
        confirmLabel={t("dialogs.jsonPasteBoardConfirm")}
        busy={busy}
        onClose={closeJsonPaste}
        onConfirm={(text) => void applyPastedBoardJson(text)}
      />

      <JsonPasteDialog
        open={jsonPasteMode === "json-view"}
        title={t("dialogs.jsonPasteViewTitle")}
        description={t("dialogs.jsonPasteViewBody")}
        placeholder={'{ "format": "event-storming-tool", … }\n\n# e2v/1\n@format event-storming-tool-e2v\n…'}
        confirmLabel={t("dialogs.jsonPasteViewConfirm")}
        busy={busy}
        initialText={jsonPasteInitial}
        onClose={closeJsonPaste}
        onConfirm={applyPastedJsonAsNewView}
      />

      <JsonPasteDialog
        open={jsonPasteMode === "ai-view"}
        title={t("dialogs.jsonPasteAiTitle")}
        description={t("dialogs.jsonPasteAiBody")}
        placeholder='{ "format": "event-storming-tool-ai-context", "version": 1, … }'
        confirmLabel={t("dialogs.jsonPasteViewConfirm")}
        busy={busy}
        onClose={closeJsonPaste}
        onConfirm={applyPastedAiOrViewJson}
      />

      <JsonPasteDialog
        open={jsonPasteMode === "e2v-view"}
        title={t("dialogs.jsonPasteE2vTitle")}
        description={t("dialogs.jsonPasteE2vBody")}
        placeholder={"# e2v/1\n@format event-storming-tool-e2v\n…"}
        confirmLabel={t("dialogs.jsonPasteViewConfirm")}
        busy={busy}
        onClose={closeJsonPaste}
        onConfirm={applyPastedAiOrViewJson}
      />

      <JsonPasteDialog
        open={jsonPasteMode === "diagram"}
        title={t("dialogs.jsonPasteDiagramTitle")}
        description={t("dialogs.jsonPasteDiagramBody")}
        placeholder={"flowchart LR\n  A[Place Order] -->|triggers| B[Order Placed]"}
        confirmLabel={t("dialogs.jsonPasteViewConfirm")}
        busy={busy}
        onClose={closeJsonPaste}
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
        hasUnsavedChanges={false}
        hasBoardContent={false}
        fsAccessSupported={isWorkingFileSupported()}
        onChoose={(choice) => void handleNewWorkingFileChoice(choice)}
      />

      <UnsavedChangesDialog
        open={unsavedPrompt !== null}
        actionLabel={unsavedPrompt?.actionLabel ?? ""}
        fileName={workingFileName ?? getWorkingFileLabel()}
        busy={unsavedBusy}
        canSave={isWorkingFileSupported() || isWorkingFileAttached()}
        saveLabel={
          isWorkingFileAttached() && !isWorkingFilePersistPaused()
            ? t("common.save")
            : t("storage.saveAs")
        }
        onChoose={(choice) => void handleUnsavedChoice(choice)}
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
        accept=".json,.e2.json,.storm.json,application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          if (useCollabStore.getState().active || useCollabStore.getState().connecting) {
            window.alert(t("alerts.collabNoOpenFile"));
            return;
          }
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
            setPersistPaused(false);
            setWorkingFileDirty(false);
            syncWorkingFileUrlContext();
            setSetupOpen(false);
            setStorageOpen(false);
          });
        }}
      />

      <input
        ref={importViewsInputRef}
        type="file"
        accept=".json,.e2.json,.storm.json,.txt,.md,.mmd,.mermaid,.puml,.plantuml,application/json,text/plain"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          if (collabBlocksPasteAsNewView(t("alerts.dropImportKind"))) return;
          setBusy(true);
          void file
            .text()
            .then((text) => {
              applyImportedFileAsNewViews(text);
            })
            .catch(() => {
              window.alert(t("alerts.fileReadFailed"));
            })
            .finally(() => setBusy(false));
        }}
      />

      <HelpDialog
        open={helpOpen}
        model={helpModel}
        onClose={() => {
          setHelpOpen(false);
          setHelpRequest(null);
        }}
      />
    </div>
  );
}
