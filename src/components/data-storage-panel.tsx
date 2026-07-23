"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { AppearanceSettings } from "@/components/appearance-settings";
import { Download, FolderOpen, Loader2, Save, Upload, Users, X } from "lucide-react";
import {
  BACKUP_INTERVAL_OPTIONS_MINUTES,
  type BackupIntervalMinutes,
} from "@/lib/board-backup";
import { useStormBoardStore } from "@/store/storm-board-store";
import type { ModelingMode } from "@/types/storm-element";
import { MODELING_MODE_LABELS } from "@/types/storm-element";

export interface DataStoragePanelProps {
  open: boolean;
  onClose: () => void;
  fsAccessSupported: boolean;
  workingFileLabel: string | null;
  workingFileAttached: boolean;
  workingFileDirty: boolean;
  workingFileSaving: boolean;
  backupIntervalMinutes: BackupIntervalMinutes;
  backupLastLabel: string;
  onBackupIntervalChange: (minutes: BackupIntervalMinutes) => void;
  onBackupNow: () => void;
  onOpenWorkingFile: () => void;
  onCreateWorkingFile: () => void;
  onRestoreBackupFile: () => void;
  onRestoreBackupPaste: () => void;
  onExportJson: () => void;
  onExportJsonSchema: () => void;
  onExportSvg: () => void;
  onExportPng: () => void;
  onExportHotspots: () => void;
  onExportGlossary: () => void;
  onExportContextMap: () => void;
  onExportEventCatalog: () => void;
  onExportDomainModel: () => void;
  onExportExampleMapping: () => void;
  onExportStoryMap: () => void;
  onExportEventModel: () => void;
  onExportProcess: () => void;
  onExportDataModel: () => void;
  onOpenCollab?: () => void;
  busy?: boolean;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="group-label">{title}</h3>
      <div className="mt-3 space-y-2">{children}</div>
    </section>
  );
}

function ActionButton({
  onClick,
  disabled,
  children,
  emphasize,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
  emphasize?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "dock-control flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm disabled:opacity-50",
        emphasize ? "ring-1 ring-[var(--accent)]/40" : "",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function modeMatches(mode: ModelingMode, ...modes: ModelingMode[]): boolean {
  return modes.includes(mode);
}

export function DataStoragePanel({
  open,
  onClose,
  fsAccessSupported,
  workingFileLabel,
  workingFileAttached,
  workingFileDirty,
  workingFileSaving,
  backupIntervalMinutes,
  backupLastLabel,
  onBackupIntervalChange,
  onBackupNow,
  onOpenWorkingFile,
  onCreateWorkingFile,
  onRestoreBackupFile,
  onRestoreBackupPaste,
  onExportJson,
  onExportJsonSchema,
  onExportSvg,
  onExportPng,
  onExportHotspots,
  onExportGlossary,
  onExportContextMap,
  onExportEventCatalog,
  onExportDomainModel,
  onExportExampleMapping,
  onExportStoryMap,
  onExportEventModel,
  onExportProcess,
  onExportDataModel,
  onOpenCollab,
  busy,
}: DataStoragePanelProps) {
  const modelingMode = useStormBoardStore((s) => s.modelingMode);

  if (!open) return null;

  const layer = (
    <div
      className="fixed inset-0 z-[1100] flex justify-end bg-black/50 backdrop-blur-sm"
      role="presentation"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside
        className="dock-surface flex h-full w-full max-w-md flex-col rounded-none border-y-0 border-r-0 text-[var(--text)]"
        role="dialog"
        aria-modal="true"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Daten &amp; Darstellung</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Arbeitsdatei, Farben und Export (.storm.json). Aktiv:{" "}
              {MODELING_MODE_LABELS[modelingMode]}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="dock-control rounded-lg p-1.5 text-[var(--muted)] hover:text-[var(--text)]"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-8 overflow-y-auto px-5 py-4">
          <Section title="Darstellung">
            <AppearanceSettings />
          </Section>

          <Section title="Arbeitsdatei">
            {workingFileAttached ? (
              <p className="text-xs text-[var(--muted)]">
                {workingFileLabel ?? "Arbeitsdatei"}
                {workingFileDirty
                  ? " · ungespeichert"
                  : workingFileSaving
                    ? " · speichert …"
                    : " · gespeichert"}
              </p>
            ) : (
              <p className="text-xs text-[var(--muted)]">Keine Arbeitsdatei verknüpft.</p>
            )}
            {fsAccessSupported ? (
              <>
                <ActionButton onClick={onOpenWorkingFile} disabled={busy}>
                  <FolderOpen className="h-4 w-4" /> Datei öffnen
                </ActionButton>
                <ActionButton onClick={onCreateWorkingFile} disabled={busy}>
                  <Upload className="h-4 w-4" /> Neue Datei anlegen
                </ActionButton>
              </>
            ) : (
              <>
                <ActionButton onClick={onRestoreBackupFile} disabled={busy}>
                  <FolderOpen className="h-4 w-4" /> Datei wählen
                </ActionButton>
                <ActionButton onClick={onRestoreBackupPaste} disabled={busy}>
                  JSON einfügen
                </ActionButton>
              </>
            )}
            {busy && (
              <p className="flex items-center gap-2 text-xs text-[var(--muted)]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Bitte warten …
              </p>
            )}
          </Section>

          <Section title="Backup">
            <p className="text-xs text-[var(--muted)]">
              Zeitstempel-Kopie (.storm.json) — unabhängig von der Arbeitsdatei.{" "}
              {backupLastLabel}.
            </p>
            <ActionButton onClick={onBackupNow} disabled={busy}>
              <Save className="h-4 w-4" /> Jetzt sichern
            </ActionButton>
            <label className="flex flex-col gap-1 text-xs text-[var(--text)]">
              <span className="text-[var(--muted)]">Automatisch alle …</span>
              <select
                className="dock-field"
                value={backupIntervalMinutes}
                onChange={(e) =>
                  onBackupIntervalChange(Number(e.target.value) as BackupIntervalMinutes)
                }
              >
                {BACKUP_INTERVAL_OPTIONS_MINUTES.map((m) => (
                  <option key={m} value={m}>
                    {m === 0 ? "Aus" : `${m} Minuten`}
                  </option>
                ))}
              </select>
            </label>
          </Section>

          {onOpenCollab && (
            <Section title="Kollaboration">
              <ActionButton onClick={onOpenCollab}>
                <Users className="h-4 w-4" /> Raum erstellen / beitreten
              </ActionButton>
            </Section>
          )}

          <Section title="Export — Board">
            <ActionButton onClick={onExportJson} disabled={busy}>
              <Download className="h-4 w-4" /> JSON herunterladen
            </ActionButton>
            <ActionButton onClick={onExportJsonSchema} disabled={busy}>
              <Download className="h-4 w-4" /> JSON Schema herunterladen
            </ActionButton>
            <p className="text-xs text-[var(--muted)]">
              Schema für{" "}
              <code className="rounded bg-[var(--control)] px-1">.storm.json</code>
              — exportierte Boards enthalten{" "}
              <code className="rounded bg-[var(--control)] px-1">$schema</code>.
            </p>
            <ActionButton onClick={onExportSvg} disabled={busy}>
              <Download className="h-4 w-4" /> SVG (Draw.io)
            </ActionButton>
            <ActionButton onClick={onExportPng} disabled={busy}>
              <Download className="h-4 w-4" /> PNG
            </ActionButton>
          </Section>

          <Section title="Export — Gemeinsam">
            <ActionButton onClick={onExportHotspots} disabled={busy}>
              <Download className="h-4 w-4" /> Hotspot-Report (MD)
            </ActionButton>
            <ActionButton onClick={onExportGlossary} disabled={busy}>
              <Download className="h-4 w-4" /> Glossary (MD)
            </ActionButton>
            <ActionButton
              onClick={onExportContextMap}
              disabled={busy}
              emphasize={modeMatches(modelingMode, "eventStorming", "domainDrivenDesign")}
            >
              <Download className="h-4 w-4" /> Context Map (MD)
            </ActionButton>
          </Section>

          <Section title="Export — Event Storming">
            <ActionButton
              onClick={onExportEventCatalog}
              disabled={busy}
              emphasize={modeMatches(modelingMode, "eventStorming", "eventModeling")}
            >
              <Download className="h-4 w-4" /> Event Catalog (MD)
            </ActionButton>
          </Section>

          <Section title="Export — Domain-Driven Design">
            <ActionButton
              onClick={onExportDomainModel}
              disabled={busy}
              emphasize={modeMatches(modelingMode, "domainDrivenDesign")}
            >
              <Download className="h-4 w-4" /> Domain Model (MD)
            </ActionButton>
          </Section>

          <Section title="Export — BDD / Example Mapping">
            <ActionButton
              onClick={onExportExampleMapping}
              disabled={busy}
              emphasize={modeMatches(modelingMode, "bdd")}
            >
              <Download className="h-4 w-4" /> Example Mapping (MD)
            </ActionButton>
          </Section>

          <Section title="Export — User Story Mapping">
            <ActionButton
              onClick={onExportStoryMap}
              disabled={busy}
              emphasize={modeMatches(modelingMode, "userStoryMapping")}
            >
              <Download className="h-4 w-4" /> Story Map (MD)
            </ActionButton>
          </Section>

          <Section title="Export — Event Modeling">
            <ActionButton
              onClick={onExportEventModel}
              disabled={busy}
              emphasize={modeMatches(modelingMode, "eventModeling")}
            >
              <Download className="h-4 w-4" /> Event Model / Slices (MD)
            </ActionButton>
          </Section>

          <Section title="Export — Prozess">
            <ActionButton
              onClick={onExportProcess}
              disabled={busy}
              emphasize={modeMatches(modelingMode, "processFlow")}
            >
              <Download className="h-4 w-4" /> Prozessmodell (MD)
            </ActionButton>
          </Section>

          <Section title="Export — Daten">
            <ActionButton
              onClick={onExportDataModel}
              disabled={busy}
              emphasize={modeMatches(modelingMode, "dataModel")}
            >
              <Download className="h-4 w-4" /> Datenmodell (MD)
            </ActionButton>
          </Section>
        </div>
      </aside>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(layer, document.body) : layer;
}
