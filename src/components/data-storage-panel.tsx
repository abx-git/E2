"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { Copy, Download, FolderOpen, Loader2, Upload, X } from "lucide-react";

export interface DataStoragePanelProps {
  open: boolean;
  onClose: () => void;
  fsAccessSupported: boolean;
  workingFileLabel: string | null;
  workingFileAttached: boolean;
  workingFileDirty: boolean;
  workingFileSaving: boolean;
  onOpenWorkingFile: () => void;
  onCreateWorkingFile: () => void;
  onRestoreBackupFile: () => void;
  onRestoreBackupPaste: () => void;
  onExportJson: () => void;
  onExportSvg: () => void;
  onExportPng: () => void;
  onExportHotspots: () => void;
  onExportGlossary: () => void;
  onExportContextMap: () => void;
  onExportEventCatalog: () => void;
  busy?: boolean;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      <div className="mt-3 space-y-2">{children}</div>
    </section>
  );
}

function ActionButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50 disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function DataStoragePanel({
  open,
  onClose,
  fsAccessSupported,
  workingFileLabel,
  workingFileAttached,
  workingFileDirty,
  workingFileSaving,
  onOpenWorkingFile,
  onCreateWorkingFile,
  onRestoreBackupFile,
  onRestoreBackupPaste,
  onExportJson,
  onExportSvg,
  onExportPng,
  onExportHotspots,
  onExportGlossary,
  onExportContextMap,
  onExportEventCatalog,
  busy,
}: DataStoragePanelProps) {
  if (!open) return null;

  const layer = (
    <div
      className="fixed inset-0 z-[1100] flex justify-end bg-slate-900/40 backdrop-blur-sm"
      role="presentation"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside
        className="flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Daten &amp; Export</h2>
            <p className="mt-1 text-xs text-slate-600">
              Alle Board-Daten liegen in einer lokalen JSON-Datei (.storm.json).
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-8 overflow-y-auto px-5 py-4">
          <Section title="Arbeitsdatei">
            {workingFileAttached ? (
              <p className="text-sm text-slate-800">
                {workingFileLabel ? `„${workingFileLabel}"` : "Verknüpft"}
                {workingFileSaving ? " — speichert …" : workingFileDirty ? " — ungespeichert" : " — synchron"}
              </p>
            ) : (
              <p className="text-sm text-slate-600">Noch keine Arbeitsdatei verknüpft.</p>
            )}
            {fsAccessSupported && (
              <>
                <ActionButton onClick={onOpenWorkingFile} disabled={busy}>
                  <FolderOpen className="h-4 w-4" /> Datei öffnen
                </ActionButton>
                <ActionButton onClick={onCreateWorkingFile} disabled={busy}>
                  <Upload className="h-4 w-4" /> Neue Datei anlegen
                </ActionButton>
              </>
            )}
            <ActionButton onClick={onRestoreBackupFile} disabled={busy}>
              <FolderOpen className="h-4 w-4" /> JSON importieren (Datei)
            </ActionButton>
            <ActionButton onClick={onRestoreBackupPaste} disabled={busy}>
              <Copy className="h-4 w-4" /> JSON einfügen
            </ActionButton>
          </Section>

          <Section title="Export">
            <ActionButton onClick={onExportJson} disabled={busy}>
              <Download className="h-4 w-4" /> JSON herunterladen
            </ActionButton>
            <ActionButton onClick={onExportSvg} disabled={busy}>
              <Download className="h-4 w-4" /> SVG
            </ActionButton>
            <ActionButton onClick={onExportPng} disabled={busy}>
              <Download className="h-4 w-4" /> PNG
            </ActionButton>
            <ActionButton onClick={onExportHotspots} disabled={busy}>
              <Download className="h-4 w-4" /> Hotspot-Report (MD)
            </ActionButton>
            <ActionButton onClick={onExportGlossary} disabled={busy}>
              <Download className="h-4 w-4" /> Glossary (MD)
            </ActionButton>
            <ActionButton onClick={onExportContextMap} disabled={busy}>
              <Download className="h-4 w-4" /> Context Map (MD)
            </ActionButton>
            <ActionButton onClick={onExportEventCatalog} disabled={busy}>
              <Download className="h-4 w-4" /> Event Catalog (MD)
            </ActionButton>
          </Section>
        </div>
      </aside>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(layer, document.body) : layer;
}
