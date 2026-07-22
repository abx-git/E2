"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Database,
  Layers,
  Link2,
  Loader2,
  Map,
  Presentation,
  Redo2,
  Undo2,
  Users,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { BoardViewTabs } from "@/components/board-view-tabs";
import { CollabEnterConfirmDialog } from "@/components/collab-enter-confirm-dialog";
import { CollabLeaveDialog, type CollabLeaveChoice } from "@/components/collab-leave-dialog";
import { CollabPresenceBanner } from "@/components/collab-presence-banner";
import { CollabRoomDialog } from "@/components/collab-room-dialog";
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
import { boardHasLocalContent, shouldConfirmCollabEnter } from "@/lib/collab/file-guard";
import { clampZoom } from "@/lib/canvas-viewport";
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
  exportStoryMapMarkdown,
} from "@/lib/storm-export";
import {
  BOARD_SNAPSHOT_SCHEMA_FILENAME,
  stringifyBoardSnapshotSchema,
} from "@/lib/storm-json";
import {
  getFacilitatorFormatsForMode,
  type FacilitatorPhase,
} from "@/lib/facilitator-phases";
import { HelpDialog } from "@/components/help-dialog";
import {
  getElementHelp,
  getPhaseHelp,
  getRelationHelp,
  getContextMapHelp,
  type HelpDialogModel,
} from "@/lib/storm-help";
import {
  attachWorkingFileFromBrowserFile,
  attachWorkingFileFromPastedText,
  attachWorkingFileFromPicker,
  createAndAttachWorkingFile,
  getLastSyncedBoardJson,
  getWorkingFileHandle,
  getWorkingFileLabel,
  hydrateStoreFromWorkingFile,
  isMobileWorkingFileMode,
  isWorkingFileAttached,
  isWorkingFileSupported,
  isWorkingFileUiAvailable,
  persistWorkingFileJson,
  resolveWorkingFileImportConflict,
  setWorkingFilePersistPaused,
} from "@/lib/working-file";
import { useStormBoardStore } from "@/store/storm-board-store";
import { useCollabStore } from "@/lib/collab/session";
import type { ElementType, ModelingMode, WorkshopFormat } from "@/types/storm-element";
import {
  MODELING_MODES,
  MODELING_MODE_LABELS,
  MODELING_MODE_SHORT_LABELS,
} from "@/types/storm-element";
import type { ContextMapPattern, RelationType } from "@/types/storm-relation";

function formatOptionsForMode(mode: ModelingMode): { value: WorkshopFormat; label: string }[] {
  return [
    { value: "free", label: "Frei" },
    ...getFacilitatorFormatsForMode(mode).map((f) => ({ value: f.format, label: f.label })),
  ];
}

export function StormBoard() {
  const [storageOpen, setStorageOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [workingFileName, setWorkingFileName] = useState<string | null>(null);
  const [workingFileDirty, setWorkingFileDirty] = useState(false);
  const [workingFileSaving, setWorkingFileSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const collabActive = useCollabStore((s) => s.active);
  const joinRoom = useCollabStore((s) => s.joinRoom);
  const leaveRoom = useCollabStore((s) => s.leaveRoom);

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
  const setTitle = useStormBoardStore((s) => s.setTitle);
  const workshopFormat = useStormBoardStore((s) => s.workshopFormat);
  const setWorkshopFormat = useStormBoardStore((s) => s.setWorkshopFormat);
  const modelingMode = useStormBoardStore((s) => s.modelingMode);
  const setModelingMode = useStormBoardStore((s) => s.setModelingMode);
  const facilitatorEnabled = useStormBoardStore((s) => s.facilitatorEnabled);
  const setFacilitatorEnabled = useStormBoardStore((s) => s.setFacilitatorEnabled);
  const workshopMode = useStormBoardStore((s) => s.workshopMode);
  const setWorkshopMode = useStormBoardStore((s) => s.setWorkshopMode);
  const viewport = useStormBoardStore((s) => s.viewport);
  const setViewport = useStormBoardStore((s) => s.setViewport);
  const snapToTimeline = useStormBoardStore((s) => s.snapToTimeline);
  const setSnapToTimeline = useStormBoardStore((s) => s.setSnapToTimeline);
  const snapToGrid = useStormBoardStore((s) => s.snapToGrid);
  const setSnapToGrid = useStormBoardStore((s) => s.setSnapToGrid);
  const focusMode = useStormBoardStore((s) => s.focusMode);
  const setFocusMode = useStormBoardStore((s) => s.setFocusMode);
  const timeline = useStormBoardStore((s) => s.timeline);
  const setTimeline = useStormBoardStore((s) => s.setTimeline);
  const appearance = useStormBoardStore((s) => s.appearance);
  const addSwimlane = useStormBoardStore((s) => s.addSwimlane);
  const relationMode = useStormBoardStore((s) => s.relationMode);
  const setRelationMode = useStormBoardStore((s) => s.setRelationMode);
  const setRelationDraftSource = useStormBoardStore((s) => s.setRelationDraftSource);
  const contextMapMode = useStormBoardStore((s) => s.contextMapMode);
  const setContextMapMode = useStormBoardStore((s) => s.setContextMapMode);
  const setContextMapDraftSource = useStormBoardStore((s) => s.setContextMapDraftSource);
  const undo = useStormBoardStore((s) => s.undo);
  const redo = useStormBoardStore((s) => s.redo);
  const pastLen = useStormBoardStore((s) => s.past.length);
  const futureLen = useStormBoardStore((s) => s.future.length);
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
      const handle = await createAndAttachWorkingFile(boardJsonFromStoreState());
      if (handle) setSetupOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const handleOpenWorkingFile = async () => {
    setBusy(true);
    try {
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
      setSetupOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const handlePasteJson = async () => {
    const raw = window.prompt("JSON einfügen:");
    if (!raw?.trim()) return;
    setBusy(true);
    try {
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
      // Tear down collab first so sync cannot push file reloads into the room.
      leaveRoom();
      if (choice === "save_file") {
        const result = await persistWorkingFileJson(boardJsonFromStoreState());
        if (!result.ok) window.alert("Speichern in die Arbeitsdatei fehlgeschlagen.");
      } else if (choice === "reload_file") {
        const handle = getWorkingFileHandle();
        if (handle) {
          const hydrate = await hydrateStoreFromWorkingFile(handle);
          if (hydrate.status === "conflict") {
            setImportConflict({
              fileText: hydrate.fileText,
              fileLastModified: hydrate.fileLastModified,
              fileName: handle.name || "Arbeitsdatei",
            });
          }
        } else if (isMobileWorkingFileMode()) {
          const synced = getLastSyncedBoardJson();
          if (synced?.trim()) applyBoardJsonToStore(synced);
        }
      }
      setWorkingFilePersistPaused(false);
      setLeaveOpen(false);
    } finally {
      setLeaveBusy(false);
    }
  };

  const handleBrowserFile = () => fileInputRef.current?.click();

  return (
    <div ref={boardRootRef} className="flex h-screen min-h-0 flex-col bg-[var(--bg)] text-[var(--text)]">
      <WorkingFileSync
        onWorkingFileNameChange={setWorkingFileName}
        onDirtyChange={setWorkingFileDirty}
        onSavingChange={setWorkingFileSaving}
        onNeedsFileSetup={() => setSetupOpen(true)}
      />

      <header className="dock-surface z-10 mx-3 mt-3 flex shrink-0 flex-wrap items-center gap-2 rounded-dock px-3 py-2">
        <input
          className="min-w-[140px] flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-semibold tracking-tight text-[var(--text)] hover:border-[var(--border)] focus:border-[var(--accent)] focus:outline-none"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => useStormBoardStore.getState().beginGesture()}
          onBlur={() => useStormBoardStore.getState().endGesture()}
        />

        <div className="dock-control flex items-center gap-0.5 rounded-lg">
          <button
            type="button"
            onClick={() => undo()}
            disabled={pastLen === 0}
            className="p-1.5 hover:text-[var(--accent)] disabled:opacity-40"
            title="Rückgängig (⌘Z / Ctrl+Z)"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => redo()}
            disabled={futureLen === 0}
            className="p-1.5 hover:text-[var(--accent)] disabled:opacity-40"
            title="Wiederholen (⌘⇧Z / Ctrl+Y)"
          >
            <Redo2 className="h-4 w-4" />
          </button>
        </div>
        <div className="dock-control flex max-w-full flex-wrap items-center gap-0.5 rounded-lg p-0.5">
          {MODELING_MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setModelingMode(mode)}
              className={[
                "rounded-md px-2 py-1 text-xs font-medium transition",
                modelingMode === mode
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--muted)] hover:text-[var(--text)]",
              ].join(" ")}
              title={MODELING_MODE_LABELS[mode]}
            >
              {MODELING_MODE_SHORT_LABELS[mode]}
            </button>
          ))}
        </div>
        <select
          className="dock-control rounded-lg px-2 py-1 text-xs"
          value={workshopFormat}
          onChange={(e) => setWorkshopFormat(e.target.value as WorkshopFormat)}
          aria-label="Workshop-Format"
        >
          {formatOptionsForMode(modelingMode).map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <label className="dock-control flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs">
          <input
            type="checkbox"
            checked={facilitatorEnabled}
            onChange={(e) => setFacilitatorEnabled(e.target.checked)}
            disabled={workshopFormat === "free"}
          />
          <Presentation className="h-3.5 w-3.5" />
          Facilitator
        </label>

        <label
          className="dock-control flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs"
          title="Kollaboration: aktiven Tab für alle Teilnehmer synchronisieren"
        >
          <input
            type="checkbox"
            checked={workshopMode}
            onChange={(e) => setWorkshopMode(e.target.checked)}
          />
          Workshop
        </label>

        <button
          type="button"
          onClick={() => {
            const next = !relationMode;
            setRelationMode(next);
            if (!next) setRelationDraftSource(null);
          }}
          className={[
            "flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium",
            relationMode ? "dock-control-active" : "dock-control",
          ].join(" ")}
          title="Relationen zwischen Elementen verbinden"
        >
          <Link2 className="h-4 w-4" />
          Verbinden
        </button>

        <button
          type="button"
          onClick={() => {
            const next = !contextMapMode;
            setContextMapMode(next);
            if (!next) setContextMapDraftSource(null);
          }}
          className={[
            "flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium",
            contextMapMode ? "dock-control-active" : "dock-control",
          ].join(" ")}
          title="Context-Map: zwei Bounded Contexts verbinden"
        >
          <Map className="h-4 w-4" />
          Context Map
        </button>
        <button
          type="button"
          onClick={() => addSwimlane()}
          className="dock-control rounded-lg p-1.5"
          title="Swimlane hinzufügen"
        >
          <Layers className="h-4 w-4" />
        </button>

        <label className="flex items-center gap-1 text-xs text-[var(--muted)]" title="Timeline-Linie anzeigen">
          <input
            type="checkbox"
            checked={timeline.visible !== false}
            onChange={(e) => setTimeline({ visible: e.target.checked })}
          />
          Timeline
        </label>
        <label className="flex items-center gap-1 text-xs text-[var(--muted)]" title="Elemente an Timeline einrasten">
          <input type="checkbox" checked={snapToTimeline} onChange={(e) => setSnapToTimeline(e.target.checked)} />
          Snap T
        </label>
        <label className="flex items-center gap-1 text-xs text-[var(--muted)]">
          <input type="checkbox" checked={snapToGrid} onChange={(e) => setSnapToGrid(e.target.checked)} />
          Grid
        </label>
        <label
          className="flex items-center gap-1 text-xs text-[var(--muted)]"
          title="Nur den aktuell gewählten Elementtyp (Palette) voll sichtbar; andere abdunkeln"
        >
          <input
            type="checkbox"
            checked={focusMode}
            onChange={(e) => setFocusMode(e.target.checked)}
          />
          Fokus
        </label>

        <div className="dock-control flex items-center gap-0.5 rounded-lg">
          <button
            type="button"
            onClick={() => setViewport({ ...viewport, zoom: clampZoom(viewport.zoom - 0.1) })}
            className="p-1.5 hover:text-[var(--accent)]"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="px-1 text-xs tabular-nums text-[var(--muted)]">{Math.round(viewport.zoom * 100)}%</span>
          <button
            type="button"
            onClick={() => setViewport({ ...viewport, zoom: clampZoom(viewport.zoom + 0.1) })}
            className="p-1.5 hover:text-[var(--accent)]"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setCollabOpen(true)}
          className={[
            "flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium",
            collabActive ? "dock-control-active" : "dock-control",
          ].join(" ")}
          title="Kollaborations-Raum"
        >
          <Users className="h-4 w-4" />
          Raum
        </button>

        <button
          type="button"
          onClick={() => setStorageOpen(true)}
          className="dock-control flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium"
        >
          {workingFileSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Database className="h-4 w-4" />
          )}
          Daten
        </button>
      </header>

      <CollabPresenceBanner onRequestLeave={() => setLeaveOpen(true)} />

      <div className="mx-3 flex shrink-0 items-center rounded-dock dock-surface px-1">
        <BoardViewTabs />
      </div>

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
        onOpenWorkingFile={() => void handleOpenWorkingFile()}
        onCreateWorkingFile={() => void handleCreateWorkingFile()}
        onRestoreBackupFile={() => fileInputRef.current?.click()}
        onRestoreBackupPaste={() => void handlePasteJson()}
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
        boardHasContent={boardHasLocalContent()}
        onExportJson={downloadJson}
        onChoose={(choice) => {
          setUrlJoinConfirm(false);
          if (choice !== "proceed" || !pendingRoomCode) return;
          const name = useCollabStore.getState().displayName || "Gast";
          void joinRoom(pendingRoomCode, name);
        }}
      />

      <CollabLeaveDialog
        open={leaveOpen}
        workingFileAttached={isWorkingFileAttached()}
        workingFileLabel={workingFileName ?? getWorkingFileLabel()}
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
          setBusy(true);
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
            setSetupOpen(false);
          });
        }}
      />

      <HelpDialog open={helpOpen} model={helpModel} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
