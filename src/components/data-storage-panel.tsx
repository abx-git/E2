"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AppearanceSettings } from "@/components/appearance-settings";
import {
  Clock,
  ClipboardCopy,
  Download,
  FilePlus,
  FolderOpen,
  Loader2,
  Palette,
  Save,
  Share2,
  Upload,
  Users,
  X,
} from "lucide-react";
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

const STORAGE_TAB_KEY = "e2.storage-panel.tab";

type StorageTabId = "file" | "export" | "appearance";

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

function readStoredTab(): StorageTabId | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_TAB_KEY);
    if (raw === "file" || raw === "export" || raw === "appearance") return raw;
  } catch {
    /* ignore */
  }
  return null;
}

function writeStoredTab(id: StorageTabId) {
  try {
    sessionStorage.setItem(STORAGE_TAB_KEY, id);
  } catch {
    /* ignore */
  }
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

function Disclosure({
  title,
  defaultOpen,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  return (
    <details
      className="group rounded-lg border border-[var(--border)] bg-[var(--control)]/25 open:bg-[var(--control)]/35"
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className="cursor-pointer list-none px-3 py-2 text-xs font-medium text-[var(--text)] marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="flex items-center justify-between gap-2">
          {title}
          <span
            className="text-[0.65rem] text-[var(--muted)] transition group-open:rotate-180"
            aria-hidden
          >
            ▾
          </span>
        </span>
      </summary>
      <div className="space-y-2 border-t border-[var(--border)] px-3 py-2.5">{children}</div>
    </details>
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

interface MethodExportDef {
  id: string;
  label: string;
  detail: string;
  modes: ModelingMode[];
  onClick: () => void;
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
  const [preferredTab, setPreferredTab] = useState<StorageTabId>(() => readStoredTab() ?? "file");

  useEffect(() => {
    if (!open) return;
    if (mustSaveBeforeOpen || workingFileDirty) {
      setPreferredTab("file");
    }
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
    // Prefer Datei only when the sheet opens while unsaved — not on every dirty flip.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open gate
  }, [open, fsAccessSupported, workingFileLabel, busy, backupLastLabel]);

  const selectTab = (id: StorageTabId) => {
    setPreferredTab(id);
    writeStoredTab(id);
  };

  const activeTab = preferredTab;

  const methodExports = useMemo<MethodExportDef[]>(
    () => [
      {
        id: "event-catalog",
        label: "Event Catalog",
        detail: "Event Storming",
        modes: ["eventStorming", "eventModeling"],
        onClick: onExportEventCatalog,
      },
      {
        id: "domain-model",
        label: "Domain Model",
        detail: "DDD",
        modes: ["domainDrivenDesign"],
        onClick: onExportDomainModel,
      },
      {
        id: "example-mapping",
        label: "Example Mapping",
        detail: "BDD",
        modes: ["bdd"],
        onClick: onExportExampleMapping,
      },
      {
        id: "story-map",
        label: "Story Map",
        detail: "USM",
        modes: ["userStoryMapping"],
        onClick: onExportStoryMap,
      },
      {
        id: "event-model",
        label: "Event Model",
        detail: "Slices",
        modes: ["eventModeling"],
        onClick: onExportEventModel,
      },
      {
        id: "process",
        label: "Prozess",
        detail: "Ablauf",
        modes: ["processFlow"],
        onClick: onExportProcess,
      },
      {
        id: "data-model",
        label: "Datenmodell",
        detail: "Entitäten",
        modes: ["dataModel"],
        onClick: onExportDataModel,
      },
      {
        id: "architecture",
        label: "Architektur",
    detail: "Blackbox / C4 / ERM",
    modes: ["architectureDocumentation"],
    onClick: onExportArchitectureDocumentation,
      },
    ],
    [
      onExportEventCatalog,
      onExportDomainModel,
      onExportExampleMapping,
      onExportStoryMap,
      onExportEventModel,
      onExportProcess,
      onExportDataModel,
      onExportArchitectureDocumentation,
    ],
  );

  const matchedMethods = methodExports.filter((m) => modeMatches(modelingMode, ...m.modes));
  const otherMethods = methodExports.filter((m) => !modeMatches(modelingMode, ...m.modes));

  const syncStatus = workingFileAttached
    ? workingFileDirty
      ? "ungespeichert"
      : workingFileSaving
        ? "speichert …"
        : "gespeichert"
    : null;

  if (!open) return null;

  const tabs: Array<{ id: StorageTabId; label: string; icon: typeof FolderOpen }> = [
    { id: "file", label: "Datei", icon: FolderOpen },
    { id: "export", label: "Export", icon: Share2 },
    { id: "appearance", label: "Darstellung", icon: Palette },
  ];

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
        aria-labelledby="storage-panel-title"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
          <div>
            <h2 id="storage-panel-title" className="text-base font-semibold tracking-tight">
              Daten &amp; Darstellung
            </h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Arbeitsdatei, Export und Farben
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="dock-control rounded-lg p-1.5 text-[var(--muted)] hover:text-[var(--text)]"
            aria-label="Schließen"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div
          className="flex shrink-0 gap-1 border-b border-[var(--border)] px-3 py-2"
          role="tablist"
          aria-label="Daten & Darstellung"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const selected = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => selectTab(tab.id)}
                className={[
                  "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition",
                  selected
                    ? "bg-[var(--control)] text-[var(--text)]"
                    : "text-[var(--muted)] hover:bg-[var(--control-hover)] hover:text-[var(--text)]",
                ].join(" ")}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4" role="tabpanel">
          {activeTab === "file" && (
            <div className="space-y-4">
              <div className="space-y-2">
                {workingFileAttached ? (
                  <p className="text-xs text-[var(--muted)]">
                    <span className="font-medium text-[var(--text)]">
                      {workingFileLabel ?? "Arbeitsdatei"}
                    </span>
                    {syncStatus ? ` · ${syncStatus}` : null}
                  </p>
                ) : (
                  <p className="text-xs text-[var(--muted)]">
                    Kein Sync-Ziel — „Speichern unter…“ verknüpft eine Arbeitsdatei.
                  </p>
                )}
                {mustSaveBeforeOpen && (
                  <p className="rounded-lg border border-[var(--accent-2)]/40 bg-[rgba(233,196,106,0.12)] px-2.5 py-2 text-xs text-[var(--accent-2)]">
                    Ungespeichert — zuerst speichern, bevor du eine andere Datei öffnest.
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2">
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
                  {fsAccessSupported ? (
                    <ActionButton
                      onClick={onOpenWorkingFile}
                      disabled={busy || mustSaveBeforeOpen}
                    >
                      <FolderOpen className="h-4 w-4" /> Datei öffnen
                    </ActionButton>
                  ) : (
                    <ActionButton
                      onClick={onRestoreBackupFile}
                      disabled={busy || mustSaveBeforeOpen}
                    >
                      <FolderOpen className="h-4 w-4" /> Datei wählen
                    </ActionButton>
                  )}
                </div>
                {busy && (
                  <p className="flex items-center gap-2 text-xs text-[var(--muted)]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Bitte warten …
                  </p>
                )}
              </div>

              <Disclosure title="Weitere Datei-Aktionen">
                <ActionButton onClick={onNewWorkingFile} disabled={busy}>
                  <FilePlus className="h-4 w-4" /> Neue Datei
                </ActionButton>
                {!fsAccessSupported && (
                  <ActionButton
                    onClick={onRestoreBackupPaste}
                    disabled={busy || mustSaveBeforeOpen}
                  >
                    JSON einfügen
                  </ActionButton>
                )}
                {fsAccessSupported && recentFiles.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[0.7rem] font-medium text-[var(--muted)]">
                      Zuletzt verwendet
                      {mustSaveBeforeOpen ? " — erst speichern" : ""}
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
              </Disclosure>

              <Disclosure
                key={localBackups.length > 0 ? "backup-has" : "backup-empty"}
                title="Backup"
                defaultOpen={localBackups.length > 0}
              >
                <p className="text-xs text-[var(--muted)]">
                  Zeitstempel-Kopie (.storm.json) nur bei ungespeichertem Stand — vor
                  Datei-/Sichtwechsel und optional zeitgesteuert. {backupLastLabel}.
                </p>
                <ActionButton onClick={onBackupNow} disabled={busy}>
                  <Save className="h-4 w-4" /> Jetzt sichern
                </ActionButton>
                <ActionButton
                  onClick={onRestoreBackupFile}
                  disabled={busy || mustSaveBeforeOpen}
                >
                  <FolderOpen className="h-4 w-4" /> Backup-Datei öffnen
                </ActionButton>
                {localBackups.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[0.7rem] font-medium text-[var(--muted)]">
                      Gesicherte Backups
                      {mustSaveBeforeOpen ? " — erst speichern" : ""}
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
              </Disclosure>

              <div className="space-y-2 border-t border-[var(--border)] pt-4">
                <p className="text-xs text-[var(--muted)]">
                  E2-Datei als neue Sicht(en) — Farben bleiben aus der geöffneten Datei.
                </p>
                <ActionButton onClick={onImportAsNewViews} disabled={busy}>
                  <Upload className="h-4 w-4" /> Als neue Seite importieren
                </ActionButton>
                {onOpenCollab && (
                  <ActionButton onClick={onOpenCollab}>
                    <Users className="h-4 w-4" /> Raum erstellen / beitreten
                  </ActionButton>
                )}
              </div>
            </div>
          )}

          {activeTab === "export" && (
            <div className="space-y-3">
              <p className="text-xs text-[var(--muted)]">
                {MODELING_MODE_LABELS[modelingMode]} — passende Formate sind hervorgehoben.
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

              {matchedMethods.length > 0 && (
                <ExportGroup title="Methoden" hint="Markdown">
                  {matchedMethods.map((m) => (
                    <ExportTile
                      key={m.id}
                      onClick={m.onClick}
                      disabled={busy}
                      label={m.label}
                      detail={m.detail}
                      emphasize
                    />
                  ))}
                </ExportGroup>
              )}

              {otherMethods.length > 0 && (
                <Disclosure
                  title={matchedMethods.length > 0 ? "Weitere Methoden" : "Methoden"}
                  defaultOpen={matchedMethods.length === 0}
                >
                  <div className="grid grid-cols-2 gap-1.5">
                    {otherMethods.map((m) => (
                      <ExportTile
                        key={m.id}
                        onClick={m.onClick}
                        disabled={busy}
                        label={m.label}
                        detail={m.detail}
                      />
                    ))}
                  </div>
                </Disclosure>
              )}
            </div>
          )}

          {activeTab === "appearance" && (
            <div>
              <AppearanceSettings />
            </div>
          )}
        </div>
      </aside>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(layer, document.body) : layer;
}
