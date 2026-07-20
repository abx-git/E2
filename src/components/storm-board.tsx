"use client";

import { useCallback, useRef, useState } from "react";
import {
  Database,
  Layers,
  Link2,
  Loader2,
  Presentation,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { DataStoragePanel } from "@/components/data-storage-panel";
import { ElementDetailSidebar } from "@/components/element-detail-sidebar";
import { ElementPalette } from "@/components/element-palette";
import { FacilitatorPanel } from "@/components/facilitator-panel";
import { GlossaryPanel } from "@/components/glossary-panel";
import { HotspotList } from "@/components/hotspot-list";
import { StormCanvas } from "@/components/storm-canvas";
import { WorkingFileSetupDialog } from "@/components/working-file-setup-dialog";
import { WorkingFileSync } from "@/components/working-file-sync";
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
import { FACILITATOR_FORMATS, type FacilitatorPhase } from "@/lib/facilitator-phases";
import { HelpDialog } from "@/components/help-dialog";
import { getElementHelp, getPhaseHelp, getRelationHelp, type HelpDialogModel } from "@/lib/storm-help";
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
import type { RelationType } from "@/types/storm-relation";

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
  const addSwimlane = useStormBoardStore((s) => s.addSwimlane);
  const relationMode = useStormBoardStore((s) => s.relationMode);
  const setRelationMode = useStormBoardStore((s) => s.setRelationMode);
  const setRelationDraftSource = useStormBoardStore((s) => s.setRelationDraftSource);

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
    <div className="flex h-screen min-h-0 flex-col">
      <WorkingFileSync
        onWorkingFileNameChange={setWorkingFileName}
        onDirtyChange={setWorkingFileDirty}
        onSavingChange={setWorkingFileSaving}
        onNeedsFileSetup={() => setSetupOpen(true)}
      />

      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-3 py-2">
        <input
          className="min-w-[140px] flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-semibold hover:border-slate-200 focus:border-sky-300 focus:outline-none"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <select
          className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
          value={workshopFormat}
          onChange={(e) => setWorkshopFormat(e.target.value as WorkshopFormat)}
        >
          {FORMAT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <label className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1 text-xs">
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
            "flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-medium",
            relationMode
              ? "border-purple-500 bg-purple-50 text-purple-900"
              : "border-slate-200 text-slate-700 hover:bg-slate-50",
          ].join(" ")}
          title="Relationen zwischen Elementen verbinden"
        >
          <Link2 className="h-4 w-4" />
          Verbinden
        </button>

        <button
          type="button"
          onClick={() => addSwimlane()}
          className="rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
          title="Swimlane hinzufügen"
        >
          <Layers className="h-4 w-4" />
        </button>

        <label className="flex items-center gap-1 text-xs text-slate-600">
          <input type="checkbox" checked={snapToTimeline} onChange={(e) => setSnapToTimeline(e.target.checked)} />
          Timeline
        </label>
        <label className="flex items-center gap-1 text-xs text-slate-600">
          <input type="checkbox" checked={snapToGrid} onChange={(e) => setSnapToGrid(e.target.checked)} />
          Grid
        </label>

        <div className="flex items-center gap-0.5 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => setViewport({ ...viewport, zoom: clampZoom(viewport.zoom - 0.1) })}
            className="p-1.5 hover:bg-slate-50"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="px-1 text-xs tabular-nums">{Math.round(viewport.zoom * 100)}%</span>
          <button
            type="button"
            onClick={() => setViewport({ ...viewport, zoom: clampZoom(viewport.zoom + 0.1) })}
            className="p-1.5 hover:bg-slate-50"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setStorageOpen(true)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
        >
          {workingFileSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Database className="h-4 w-4" />
          )}
          Daten
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        <ElementPalette onSelectType={() => {}} onRequestHelp={openElementHelp} />
        <StormCanvas />
        <div className="flex w-72 shrink-0 flex-col border-l border-slate-200 bg-white">
          <ElementDetailSidebar
            onRequestHelpElementType={openElementHelp}
            onRequestHelpRelationType={openRelationHelp}
          />
          <HotspotList />
          <GlossaryPanel />
          <FacilitatorPanel onRequestHelpPhase={(phase, format) => openPhaseHelp(phase, format)} />
        </div>
      </div>

      <footer className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500">
        <span>
          {workingFileName
            ? `Arbeitsdatei: ${workingFileName}${workingFileDirty ? " · ungespeichert" : workingFileSaving ? " · speichert …" : " · gespeichert"}`
            : isWorkingFileAttached()
              ? "Arbeitsdatei verknüpft"
              : "Keine Arbeitsdatei — bitte einrichten"}
        </span>
        <span>E2 Event Storming</span>
      </footer>

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
