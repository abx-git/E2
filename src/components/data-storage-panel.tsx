"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AppearanceSettings } from "@/components/appearance-settings";
import { Clock, ClipboardCopy, Download, FilePlus, FolderOpen, Loader2, Save, Upload, Users, X } from "lucide-react";
import {
  BACKUP_INTERVAL_OPTIONS_MINUTES,
  listLocalBackups,
  type BackupIntervalMinutes,
  type LocalBackupListItem,
} from "@/lib/board-backup";
import { listRecentWorkingFiles } from "@/lib/working-file";
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
  /** When true, opening another file/backup is disabled until the board is saved. */
  mustSaveBeforeOpen: boolean;
  backupIntervalMinutes: BackupIntervalMinutes;
  backupLastLabel: string;
  onBackupIntervalChange: (minutes: BackupIntervalMinutes) => void;
  onBackupNow: () => void;
  onNewWorkingFile: () => void;
  onSaveWorkingFile: () => void;
  onOpenWorkingFile: () => void;
  /** Speichern unter… — pick a new path; becomes the Arbeitsdatei. */
  onSaveWorkingFileAs: () => void;
  onOpenRecentWorkingFile: (handle: FileSystemFileHandle) => void;
  onOpenLocalBackup: (backupId: string) => void;
  onRestoreBackupFile: () => void;
  onRestoreBackupPaste: () => void;
  /** Import E2 file as new view tab(s); keeps open document appearance/globals. */
  onImportAsNewViews: () => void;
  onExportJson: () => void;
  /** Full board JSON into the OS clipboard (not the in-app sticky clipboard). */
  onCopyJsonToClipboard: () => boolean | Promise<boolean>;
  onExportJsonSchema: () => void;
  onExportSvg: () => void;
  onExportPng: () => void;
  onExportHotspots: () => void;
  onExportActionItems: () => void;
  onExportGlossary: () => void;
  onExportContextMap: () => void;
  onExportEventCatalog: () => void;
  onExportDomainModel: () => void;
  onExportExampleMapping: () => void;
  onExportStoryMap: () => void;
  onExportEventModel: () => void;
  onExportProcess: () => void;
  onExportDataModel: () => void;
  onExportArchitectureDocumentation: () => void;
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

function ExportGroup({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--control)]/35 p-2.5">
      <div className="mb-2 flex items-baseline justify-between gap-2 px-0.5">
        <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
          {title}
        </p>
        {hint ? <p className="text-[0.65rem] text-[var(--muted)]">{hint}</p> : null}
      </div>
      <div className="grid grid-cols-2 gap-1.5">{children}</div>
    </div>
  );
}

function ExportTile({
  onClick,
  disabled,
  label,
  detail,
  emphasize,
  icon: Icon = Download,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  detail?: string;
  emphasize?: boolean;
  icon?: typeof Download;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "flex min-h-[3.25rem] flex-col items-start justify-center gap-0.5 rounded-lg border px-2.5 py-2 text-left transition disabled:opacity-50",
        emphasize
          ? "border-[var(--accent)]/55 bg-[var(--accent)]/12 text-[var(--text)]"
          : "border-[var(--border)] bg-[var(--panel-solid)] text-[var(--text)] hover:bg-[var(--control-hover)]",
      ].join(" ")}
    >
      <span className="flex items-center gap-1.5 text-xs font-medium leading-tight">
        <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
        {label}
      </span>
      {detail ? (
        <span className="pl-5 text-[0.65rem] leading-snug text-[var(--muted)]">{detail}</span>
      ) : null}
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
  mustSaveBeforeOpen,
  backupIntervalMinutes,
  backupLastLabel,
  onBackupIntervalChange,
  onBackupNow,
  onNewWorkingFile,
  onSaveWorkingFile,
  onOpenWorkingFile,
  onSaveWorkingFileAs,
  onOpenRecentWorkingFile,
  onOpenLocalBackup,
  onRestoreBackupFile,
  onRestoreBackupPaste,
  onImportAsNewViews,
  onExportJson,
  onCopyJsonToClipboard,
  onExportJsonSchema,
  onExportSvg,
  onExportPng,
  onExportHotspots,
  onExportActionItems,
  onExportGlossary,
  onExportContextMap,
  onExportEventCatalog,
  onExportDomainModel,
  onExportExampleMapping,
  onExportStoryMap,
  onExportEventModel,
  onExportProcess,
  onExportDataModel,
  onExportArchitectureDocumentation,
  onOpenCollab,
  busy,
}: DataStoragePanelProps) {
  const modelingMode = useStormBoardStore((s) => s.modelingMode);
  const [recentFiles, setRecentFiles] = useState<
    Array<{ name: string; openedAt: number; handle: FileSystemFileHandle }>
  >([]);
  const [localBackups, setLocalBackups] = useState<LocalBackupListItem[]>([]);
  const [jsonCopied, setJsonCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    if (fsAccessSupported) {
      void listRecentWorkingFiles().then((entries) => {
        if (!cancelled) setRecentFiles(entries);
      });
    }
    void listLocalBackups().then((entries) => {
      if (!cancelled) setLocalBackups(entries);
    });
    return () => {
      cancelled = true;
    };
  }, [open, fsAccessSupported, workingFileLabel, busy, backupLastLabel]);

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
                Sync-Ziel: {workingFileLabel ?? "Arbeitsdatei"}
                {workingFileDirty
                  ? " · ungespeichert"
                  : workingFileSaving
                    ? " · speichert …"
                    : " · gespeichert"}
              </p>
            ) : (
              <p className="text-xs text-[var(--muted)]">
                Kein Sync-Ziel — „Speichern unter…“ verknüpft eine Arbeitsdatei.
              </p>
            )}
            {mustSaveBeforeOpen && (
              <p className="rounded-lg border border-[var(--accent-2)]/40 bg-[rgba(233,196,106,0.12)] px-2.5 py-2 text-xs text-[var(--accent-2)]">
                Ungespeicherter Stand — bitte zuerst speichern, bevor du eine andere Datei oder ein
                Backup öffnest.
              </p>
            )}
            {workingFileAttached ? (
              <ActionButton
                onClick={onSaveWorkingFile}
                disabled={busy || !workingFileDirty}
                emphasize={workingFileDirty || mustSaveBeforeOpen}
              >
                <Save className="h-4 w-4" /> Speichern
              </ActionButton>
            ) : null}
            <ActionButton
              onClick={onSaveWorkingFileAs}
              disabled={busy}
              emphasize={!workingFileAttached && mustSaveBeforeOpen}
            >
              <Save className="h-4 w-4" /> Speichern unter…
            </ActionButton>
            <ActionButton onClick={onNewWorkingFile} disabled={busy}>
              <FilePlus className="h-4 w-4" /> Neue Datei
            </ActionButton>
            {fsAccessSupported ? (
              <>
                <ActionButton onClick={onOpenWorkingFile} disabled={busy || mustSaveBeforeOpen}>
                  <FolderOpen className="h-4 w-4" /> Datei öffnen
                </ActionButton>
                {recentFiles.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[0.7rem] font-medium text-[var(--muted)]">
                      Zuletzt verwendet
                      {mustSaveBeforeOpen ? " — erst speichern" : " — anklicken zum Öffnen"}
                    </p>
                    <ul className="space-y-1">
                      {recentFiles.map((entry) => (
                        <li key={`${entry.name}-${entry.openedAt}`}>
                          <button
                            type="button"
                            disabled={busy || mustSaveBeforeOpen}
                            onClick={() => onOpenRecentWorkingFile(entry.handle)}
                            className="dock-control flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-sm disabled:opacity-50"
                            title={new Date(entry.openedAt).toLocaleString("de-DE")}
                          >
                            <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium">{entry.name}</span>
                              <span className="block text-[0.65rem] text-[var(--muted)]">
                                {new Date(entry.openedAt).toLocaleString("de-DE")}
                              </span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <>
                <ActionButton onClick={onRestoreBackupFile} disabled={busy || mustSaveBeforeOpen}>
                  <FolderOpen className="h-4 w-4" /> Datei wählen
                </ActionButton>
                <ActionButton onClick={onRestoreBackupPaste} disabled={busy || mustSaveBeforeOpen}>
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
              Zeitstempel-Kopie (.storm.json) — unabhängig von der Arbeitsdatei. Automatisch
              nur bei Änderungen. {backupLastLabel}.
            </p>
            <ActionButton onClick={onBackupNow} disabled={busy}>
              <Save className="h-4 w-4" /> Jetzt sichern
            </ActionButton>
            <ActionButton onClick={onRestoreBackupFile} disabled={busy || mustSaveBeforeOpen}>
              <FolderOpen className="h-4 w-4" /> Backup-Datei öffnen
            </ActionButton>
            {localBackups.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <p className="text-[0.7rem] font-medium text-[var(--muted)]">
                  Gesicherte Backups
                  {mustSaveBeforeOpen ? " — erst speichern" : " — anklicken zum Öffnen"}
                </p>
                <ul className="space-y-1">
                  {localBackups.map((entry) => (
                    <li key={entry.id}>
                      <button
                        type="button"
                        disabled={busy || mustSaveBeforeOpen}
                        onClick={() => onOpenLocalBackup(entry.id)}
                        className="dock-control flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-sm disabled:opacity-50"
                        title={new Date(entry.createdAt).toLocaleString("de-DE")}
                      >
                        <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{entry.filename}</span>
                          <span className="block text-[0.65rem] text-[var(--muted)]">
                            {new Date(entry.createdAt).toLocaleString("de-DE")}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
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

          <Section title="Import">
            <p className="text-xs text-[var(--muted)]">
              E2-Datei (.storm.json) als neue Sicht(en) hinzufügen. Farben und andere
              Projekt-Angaben bleiben aus der geöffneten Datei.
            </p>
            <ActionButton onClick={onImportAsNewViews} disabled={busy}>
              <Upload className="h-4 w-4" /> Als neue Seite importieren
            </ActionButton>
          </Section>

          <Section title="Export">
            <p className="text-xs text-[var(--muted)]">
              Aktive Methode: {MODELING_MODE_LABELS[modelingMode]} — passende Formate sind
              hervorgehoben.
            </p>

            <ExportGroup title="Board" hint="Datei & Bild">
              <ExportTile
                onClick={onExportJson}
                disabled={busy}
                label="JSON"
                detail=".storm.json herunterladen"
              />
              <ExportTile
                onClick={() => {
                  void Promise.resolve(onCopyJsonToClipboard()).then((ok) => {
                    if (!ok) return;
                    setJsonCopied(true);
                    window.setTimeout(() => setJsonCopied(false), 2000);
                  });
                }}
                disabled={busy}
                label={jsonCopied ? "Kopiert" : "JSON kopieren"}
                detail="System-Zwischenablage"
                icon={ClipboardCopy}
                emphasize={jsonCopied}
              />
              <ExportTile
                onClick={onExportJsonSchema}
                disabled={busy}
                label="Schema"
                detail="JSON Schema"
              />
              <ExportTile
                onClick={onExportSvg}
                disabled={busy}
                label="SVG"
                detail="Draw.io"
              />
              <ExportTile onClick={onExportPng} disabled={busy} label="PNG" detail="Rasterbild" />
            </ExportGroup>

            <ExportGroup title="Berichte" hint="Markdown">
              <ExportTile
                onClick={onExportHotspots}
                disabled={busy}
                label="Hotspots"
                detail="Report"
              />
              <ExportTile
                onClick={onExportActionItems}
                disabled={busy}
                label="To-dos"
                detail="Action Items"
              />
              <ExportTile
                onClick={onExportGlossary}
                disabled={busy}
                label="Glossary"
                detail="Begriffe"
              />
              <ExportTile
                onClick={onExportContextMap}
                disabled={busy}
                label="Context Map"
                detail="BC-Schnittstellen"
                emphasize={modeMatches(modelingMode, "eventStorming", "domainDrivenDesign")}
              />
            </ExportGroup>

            <ExportGroup title="Methoden" hint="Markdown">
              <ExportTile
                onClick={onExportEventCatalog}
                disabled={busy}
                label="Event Catalog"
                detail="Event Storming"
                emphasize={modeMatches(modelingMode, "eventStorming", "eventModeling")}
              />
              <ExportTile
                onClick={onExportDomainModel}
                disabled={busy}
                label="Domain Model"
                detail="DDD"
                emphasize={modeMatches(modelingMode, "domainDrivenDesign")}
              />
              <ExportTile
                onClick={onExportExampleMapping}
                disabled={busy}
                label="Example Mapping"
                detail="BDD"
                emphasize={modeMatches(modelingMode, "bdd")}
              />
              <ExportTile
                onClick={onExportStoryMap}
                disabled={busy}
                label="Story Map"
                detail="USM"
                emphasize={modeMatches(modelingMode, "userStoryMapping")}
              />
              <ExportTile
                onClick={onExportEventModel}
                disabled={busy}
                label="Event Model"
                detail="Slices"
                emphasize={modeMatches(modelingMode, "eventModeling")}
              />
              <ExportTile
                onClick={onExportProcess}
                disabled={busy}
                label="Prozess"
                detail="Ablauf"
                emphasize={modeMatches(modelingMode, "processFlow")}
              />
              <ExportTile
                onClick={onExportDataModel}
                disabled={busy}
                label="Datenmodell"
                detail="Entitäten"
                emphasize={modeMatches(modelingMode, "dataModel")}
              />
              <ExportTile
                onClick={onExportArchitectureDocumentation}
                disabled={busy}
                label="Architektur"
                detail="arc42 / C4 / ERM"
                emphasize={modeMatches(modelingMode, "architectureDocumentation")}
              />
            </ExportGroup>
          </Section>
        </div>
      </aside>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(layer, document.body) : layer;
}
