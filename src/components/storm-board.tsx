"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { BoardAppBar } from "@/components/board-app-bar";
import {
  BoardBackupSync,
  runManualBoardBackup,
} from "@/components/board-backup-sync";
import { ClipboardPanel } from "@/components/clipboard-panel";
import { CollabEnterConfirmDialog } from "@/components/collab-enter-confirm-dialog";
import { CollabLeaveDialog, type CollabLeaveChoice } from "@/components/collab-leave-dialog";
import { CollabPresenceBanner } from "@/components/collab-presence-banner";
import { CollabRoomDialog } from "@/components/collab-room-dialog";
import { CollabSyncConflictDialog } from "@/components/collab-sync-conflict-dialog";
import { DataStoragePanel } from "@/components/data-storage-panel";
import { CanvasContextMenu } from "@/components/canvas-context-menu";
import { ElementDetailSidebar } from "@/components/element-detail-sidebar";
import { ElementPalette } from "@/components/element-palette";
import { FacilitatorPanel } from "@/components/facilitator-panel";
import {
  FileConflictDialog,
  type FileConflictChoice,
} from "@/components/file-conflict-dialog";
import { GlossaryPanel } from "@/components/glossary-panel";
import { HotspotList } from "@/components/hotspot-list";
import { StormCanvas } from "@/components/storm-canvas";
import { WorkingFileSetupDialog } from "@/components/working-file-setup-dialog";
import { WorkingFileSync } from "@/components/working-file-sync";
import { applyAppearanceToElement } from "@/lib/board-appearance";
import {
  formatLastBackupLabel,
  readBackupIntervalMinutes,
  readLastBackupAt,
  type BackupIntervalMinutes,
  writeBackupIntervalMinutes,
  backupBeforeSuspiciousSwitch,
} from "@/lib/board-backup";
import { boardHasLocalContent, shouldConfirmCollabEnter } from "@/lib/collab/file-guard";
import {
  capturePreCollabStash,
  clearPreCollabStash,
  getPreCollabStash,
  hasPreCollabStash,
} from "@/lib/collab/pre-collab-stash";
import { boardJsonFromStoreState, applyBoardJsonToStore } from "@/lib/file-board-reconcile";
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
  exportProcessMarkdown,
  exportDataModelMarkdown,
  exportStoryMapMarkdown,
} from "@/lib/storm-export";
import {
  BOARD_SNAPSHOT_SCHEMA_FILENAME,
  boardImportPayloadFromExportText,
  stringifyBoardSnapshotSchema,
} from "@/lib/storm-json";
import { type FacilitatorPhase } from "@/lib/facilitator-phases";
import { HelpDialog } from "@/components/help-dialog";
import {
  getElementHelp,
  getPhaseHelp,
  getRelationHelp,
  getContextMapHelp,
  type HelpDialogModel,
} from "@/lib/storm-help";
import {
  forceApplyBoardJson,
  attachWorkingFileFromBrowserFile,
  attachWorkingFileFromPastedText,
  attachWorkingFileFromPicker,
  createAndAttachWorkingFile,
  getWorkingFileLabel,
  isWorkingFileAttached,
  isWorkingFileDirty,
  isWorkingFileSupported,
  isWorkingFileUiAvailable,
  openRecentWorkingFile,
  persistWorkingFileJson,
  resolveWorkingFileImportConflict,
  saveWorkingFileAs,
  suggestedWorkingFileName,
} from "@/lib/working-file";
import { useStormBoardStore } from "@/store/storm-board-store";
import { flushCollabSnapshotNow, useCollabStore } from "@/lib/collab/session";
import type { ElementType, WorkshopFormat } from "@/types/storm-element";
import type { ContextMapPattern, RelationType } from "@/types/storm-relation";

export function StormBoard() {
  const [storageOpen, setStorageOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [workingFileName, setWorkingFileName] = useState<string | null>(null);
  const [workingFileDirty, setWorkingFileDirty] = useState(false);
  const [workingFileSaving, setWorkingFileSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [backupIntervalMinutes, setBackupIntervalMinutes] = useState<BackupIntervalMinutes>(0);
  const [backupLastLabel, setBackupLastLabel] = useState(() =>
    formatLastBackupLabel(readLastBackupAt()),
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importViewsInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setBackupIntervalMinutes(readBackupIntervalMinutes());
  }, []);

  const [helpOpen, setHelpOpen] = useState(false);
  const [helpModel, setHelpModel] = useState<HelpDialogModel | null>(null);
  const [collabOpen, setCollabOpen] = useState(false);
  const [pendingRoomCode, setPendingRoomCode] = useState<string | null>(null);
  const [urlJoinConfirm, setUrlJoinConfirm] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveBusy, setLeaveBusy] = useState(false);
  const [importConflict, setImportConflict] = useState<{
    fileText: string;
    fileLastModified: number;
    fileName: string;
  } | null>(null);
  const [importConflictBusy, setImportConflictBusy] = useState(false);
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
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || target?.isContentEditable) return;

      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

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
  }, [undo, redo]);

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

  const handleCreateWorkingFile = async () => {
    setBusy(true);
    try {
      const suggested = suggestedWorkingFileName(title || getWorkingFileLabel());
      const handle = await createAndAttachWorkingFile(boardJsonFromStoreState(), suggested);
      if (handle) {
        setWorkingFileName(getWorkingFileLabel());
        setSetupOpen(false);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSaveWorkingFileAs = async () => {
    setBusy(true);
    try {
      const suggested = suggestedWorkingFileName(
        getWorkingFileLabel() || title || undefined,
      );
      const handle = await saveWorkingFileAs(boardJsonFromStoreState(), suggested);
      if (handle) {
        setWorkingFileName(getWorkingFileLabel());
        setSetupOpen(false);
        setStorageOpen(false);
      }
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
    setBusy(true);
    try {
      backupBeforeSuspiciousSwitch("file");
      const result = await attachWorkingFileFromPicker();
      if (!result) return;
      if (result.hydrate.status === "conflict") {
        setImportConflict({
          fileText: result.hydrate.fileText,
          fileLastModified: result.hydrate.fileLastModified,
          fileName: result.handle.name || "Arbeitsdatei",
        });
        return;
      }
      setWorkingFileName(getWorkingFileLabel());
      setSetupOpen(false);
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
    setBusy(true);
    try {
      backupBeforeSuspiciousSwitch("file");
      const result = await openRecentWorkingFile(handle);
      if (!result) {
        window.alert(
          "Datei konnte nicht geöffnet werden. Bitte Berechtigung erteilen oder die Datei erneut über „Datei öffnen“ wählen.",
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
      setWorkingFileName(getWorkingFileLabel());
      setSetupOpen(false);
      setStorageOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const handlePasteJson = async () => {
    if (useCollabStore.getState().active || useCollabStore.getState().connecting) {
      window.alert(
        "Während der Kollaboration kann kein JSON in den Editor geladen werden. Bitte zuerst den Raum verlassen.",
      );
      return;
    }
    const raw = window.prompt("JSON einfügen:");
    if (!raw?.trim()) return;
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
        return;
      }
      setSetupOpen(false);
    } finally {
      setBusy(false);
    }
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
          "Stand vor dem Raum wiederherstellen?\n\nDer aktuelle Board-Inhalt (Raum-Stand) wird im Editor und in der Arbeitsdatei durch die ältere lokale Kopie ersetzt.\n\nWähle Abbrechen und danach „Raum verlassen“, wenn du den Remote-Stand behalten willst.",
        );
        if (!ok) return;
        backupBeforeSuspiciousSwitch("room");
      }

      await flushCollabSnapshotNow();
      leaveRoom();

      if (choice === "restore_pre_collab") {
        const stash = getPreCollabStash();
        if (stash?.json.trim()) {
          if (!forceApplyBoardJson(stash.json)) {
            window.alert("Vorheriger Stand konnte nicht wiederhergestellt werden.");
          } else if (isWorkingFileAttached()) {
            const result = await persistWorkingFileJson(boardJsonFromStoreState());
            if (!result.ok) {
              window.alert("Wiederhergestellt, aber Speichern in die Arbeitsdatei fehlgeschlagen.");
            }
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

  const applyImportedFileAsNewViews = (text: string) => {
    const payload = boardImportPayloadFromExportText(text);
    if (!payload) {
      window.alert("Ungültige E2-Datei (.storm.json).");
      return;
    }
    const result = useStormBoardStore.getState().importDocumentAsNewViews(payload);
    if (!result.ok) {
      window.alert(result.error);
      return;
    }
    setStorageOpen(false);
  };

  return (
    <div ref={boardRootRef} className="flex h-screen min-h-0 flex-col bg-[var(--bg)] text-[var(--text)]">
      <WorkingFileSync
        onWorkingFileNameChange={setWorkingFileName}
        onDirtyChange={setWorkingFileDirty}
        onSavingChange={setWorkingFileSaving}
        onNeedsFileSetup={() => setSetupOpen(true)}
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

      <div className="mx-3 mb-3 mt-2 flex min-h-0 flex-1 gap-2">
        <div className="dock-surface flex overflow-hidden rounded-dock">
          <ElementPalette onSelectType={() => {}} onRequestHelp={openElementHelp} />
        </div>
        <div className="dock-surface relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-dock">
          <StormCanvas />
        </div>
        <div className="dock-surface flex w-72 shrink-0 flex-col overflow-hidden rounded-dock">
          <ElementDetailSidebar
            onRequestHelpElementType={openElementHelp}
            onRequestHelpRelationType={openRelationHelp}
          />
          <div className="min-h-0 flex-1 overflow-y-auto">
            <ClipboardPanel />
            <HotspotList />
            <GlossaryPanel />
            <FacilitatorPanel onRequestHelpPhase={(phase, format) => openPhaseHelp(phase, format)} />
          </div>
        </div>
      </div>

      <footer className="flex shrink-0 items-center justify-between px-4 pb-2 text-[0.72rem] text-[var(--muted)]">
        <span>
          {workingFileName
            ? `Arbeitsdatei: ${workingFileName}${workingFileDirty ? " · ungespeichert" : workingFileSaving ? " · speichert …" : " · gespeichert"}`
            : isWorkingFileAttached()
              ? "Arbeitsdatei verknüpft"
              : "Keine Arbeitsdatei — bitte einrichten"}
        </span>
        <span>Rechtsklick · Aktionen · E2</span>
      </footer>

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
        backupIntervalMinutes={backupIntervalMinutes}
        backupLastLabel={backupLastLabel}
        onBackupIntervalChange={(minutes) => {
          writeBackupIntervalMinutes(minutes);
          setBackupIntervalMinutes(minutes);
        }}
        onBackupNow={() => runManualBoardBackup(setBackupLastLabel)}
        onOpenWorkingFile={() => void handleOpenWorkingFile()}
        onSaveWorkingFileAs={() => void handleSaveWorkingFileAs()}
        onOpenRecentWorkingFile={(handle) => void handleOpenRecentWorkingFile(handle)}
        onRestoreBackupFile={() => fileInputRef.current?.click()}
        onRestoreBackupPaste={() => void handlePasteJson()}
        onImportAsNewViews={handleImportAsNewViews}
        onExportJson={downloadJson}
        onExportJsonSchema={downloadJsonSchema}
        onExportSvg={exportBoardSvg}
        onExportPng={() => void exportBoardPng()}
        onExportHotspots={exportHotspotReportMarkdown}
        onExportGlossary={exportGlossaryMarkdown}
        onExportContextMap={exportContextMapMarkdown}
        onExportEventCatalog={exportEventCatalogMarkdown}
        onExportDomainModel={exportDomainModelMarkdown}
        onExportExampleMapping={exportExampleMappingMarkdown}
        onExportStoryMap={exportStoryMapMarkdown}
        onExportEventModel={exportEventModelMarkdown}
        onExportProcess={exportProcessMarkdown}
        onExportDataModel={exportDataModelMarkdown}
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
          if (choice === "cancel" || !pendingRoomCode) return;
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
        title="Import-Konflikt"
        description="Der Import und dein aktueller Board-Stand unterscheiden sich beide vom leeren Zustand. Was soll übernommen werden?"
        keepLocalLabel="Aktuellen E2-Stand behalten"
        loadFileLabel="Importierten Stand laden"
        onChoose={(choice) => void handleImportConflict(choice)}
      />

      <WorkingFileSetupDialog
        open={setupOpen && !isWorkingFileAttached()}
        fsAccessSupported={isWorkingFileUiAvailable()}
        busy={busy}
        onOpenFile={() => void handleOpenWorkingFile()}
        onCreateFile={() => void handleCreateWorkingFile()}
        onPasteJson={() => void handlePasteJson()}
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
            setWorkingFileName(getWorkingFileLabel());
            setSetupOpen(false);
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
