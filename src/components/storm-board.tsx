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
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { DataStoragePanel } from "@/components/data-storage-panel";
import { CanvasContextMenu } from "@/components/canvas-context-menu";
import { ElementDetailSidebar } from "@/components/element-detail-sidebar";
import { ElementPalette } from "@/components/element-palette";
import { FacilitatorPanel } from "@/components/facilitator-panel";
import { GlossaryPanel } from "@/components/glossary-panel";
import { HotspotList } from "@/components/hotspot-list";
import { StormCanvas } from "@/components/storm-canvas";
import { WorkingFileSetupDialog } from "@/components/working-file-setup-dialog";
import { WorkingFileSync } from "@/components/working-file-sync";
import { applyAppearanceToElement } from "@/lib/board-appearance";
import { clampZoom } from "@/lib/canvas-viewport";
import { boardJsonFromStoreState } from "@/lib/file-board-reconcile";
import {
  exportBoardPng,
  exportBoardSvg,
  exportContextMapMarkdown,
  exportEventCatalogMarkdown,
  exportGlossaryMarkdown,
  exportHotspotReportMarkdown,
} from "@/lib/storm-export";
import {
  BOARD_SNAPSHOT_SCHEMA_FILENAME,
  stringifyBoardSnapshotSchema,
} from "@/lib/storm-json";
import { FACILITATOR_FORMATS, type FacilitatorPhase } from "@/lib/facilitator-phases";
import { HelpDialog } from "@/components/help-dialog";
import { getElementHelp, getPhaseHelp, getRelationHelp, getContextMapHelp, type HelpDialogModel } from "@/lib/storm-help";
import {
  attachWorkingFileFromBrowserFile,
  attachWorkingFileFromPastedText,
  attachWorkingFileFromPicker,
  createAndAttachWorkingFile,
  isWorkingFileAttached,
  isWorkingFileSupported,
  isWorkingFileUiAvailable,
} from "@/lib/working-file";
import { useStormBoardStore } from "@/store/storm-board-store";
import type { ElementType, WorkshopFormat } from "@/types/storm-element";
import type { ContextMapPattern, RelationType } from "@/types/storm-relation";

const FORMAT_OPTIONS: { value: WorkshopFormat; label: string }[] = [
  { value: "free", label: "Frei" },
  ...FACILITATOR_FORMATS.map((f) => ({ value: f.format, label: f.label })),
];

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
  const facilitatorEnabled = useStormBoardStore((s) => s.facilitatorEnabled);
  const setFacilitatorEnabled = useStormBoardStore((s) => s.setFacilitatorEnabled);
  const viewport = useStormBoardStore((s) => s.viewport);
  const setViewport = useStormBoardStore((s) => s.setViewport);
  const snapToTimeline = useStormBoardStore((s) => s.snapToTimeline);
  const setSnapToTimeline = useStormBoardStore((s) => s.setSnapToTimeline);
  const snapToGrid = useStormBoardStore((s) => s.snapToGrid);
  const setSnapToGrid = useStormBoardStore((s) => s.setSnapToGrid);
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
      if (result) setSetupOpen(false);
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
      if (result.status === "read_error") window.alert(result.message);
      else setSetupOpen(false);
    } finally {
      setBusy(false);
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
        <select
          className="dock-control rounded-lg px-2 py-1 text-xs"
          value={workshopFormat}
          onChange={(e) => setWorkshopFormat(e.target.value as WorkshopFormat)}
        >
          {FORMAT_OPTIONS.map((o) => (
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
        busy={busy}
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
            if (result.status === "read_error") window.alert(result.message);
            else setSetupOpen(false);
          });
        }}
      />

      <HelpDialog open={helpOpen} model={helpModel} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
