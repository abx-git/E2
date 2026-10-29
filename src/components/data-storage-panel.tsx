"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AppearanceSettings } from "@/components/appearance-settings";
import {
  ArrowLeftRight,
  Clock,
  ClipboardCopy,
  ClipboardPaste,
  Download,
  FilePlus,
  FileText,
  FolderOpen,
  Library,
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
  type BackupHistoryMode,
  type BackupIntervalMinutes,
  type LocalBackupListItem,
} from "@/lib/board-backup";
import {
  FILE_LIBRARY_BACKUP_DIR,
  FILE_LIBRARY_CHANGED_EVENT,
  STANDARD_LIBRARY_FILENAME,
  getFileLibraryEntries,
  getFileLibraryFolderName,
  getFileLibraryPermissionState,
  isFileLibrarySupported,
  type FileLibraryEntry,
} from "@/lib/file-library";
import { listRecentWorkingFiles } from "@/lib/working-file";
import { useI18n, useT } from "@/i18n";
import { useStormBoardStore } from "@/store/storm-board-store";
import type { ModelingMode } from "@/types/storm-element";

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
  /** Autosave paused (foreign load / collab) — Speichern unter… required. */
  workingFilePersistPaused?: boolean;
  /** When true, show a hint that there are unsaved changes (Open/New still allowed — with prompt). */
  hasUnsavedDocument?: boolean;
  backupIntervalMinutes: BackupIntervalMinutes;
  backupHistoryMode: BackupHistoryMode;
  backupLastLabel: string;
  onBackupIntervalChange: (minutes: BackupIntervalMinutes) => void;
  onBackupHistoryModeChange: (mode: BackupHistoryMode) => void;
  onBackupNow: () => void;
  onNewWorkingFile: () => void;
  onSaveWorkingFile: () => void;
  onOpenWorkingFile: () => void;
  /** Speichern unter… — pick a new path; becomes the Arbeitsdatei. */
  onSaveWorkingFileAs: () => void;
  onCloseWorkingFile?: () => void;
  onRenameWorkingFile?: () => void;
  onOpenRecentWorkingFile: (handle: FileSystemFileHandle) => void;
  onPickFileLibrary?: () => void;
  onGrantFileLibrary?: () => void;
  onDetachFileLibrary?: () => void;
  onOpenFileLibraryEntry?: (entry: FileLibraryEntry) => void;
  onOpenLocalBackup: (backupId: string) => void;
  onRestoreBackupFile: () => void;
  /** Prüfen einer Remote-.e2.json und Teilen-Link erzeugen. */
  onOpenBoardShareLink?: () => void;
  /** Import file(s) as new view tab(s); keeps open document appearance/globals. */
  onImportFromFile: () => void;
  /** Read system clipboard and import as new view(s); format detected automatically. */
  onImportFromClipboard: () => void;
  /** Replace the open board from clipboard JSON (full snapshot). */
  onReplaceBoardFromClipboard: () => void;
  onExportJson: () => void;
  /** Full board JSON into the OS clipboard (not the in-app sticky clipboard). */
  onCopyJsonToClipboard: () => boolean | Promise<boolean>;
  /** Complete single-view diagram extract (.e2.json). */
  onExportViewJson: (viewId: string) => void;
  onCopyViewJsonToClipboard: (viewId: string) => boolean | Promise<boolean>;
  /** Mode schema + AI context data (with layout) for the system clipboard. */
  onCopyAiPackageToClipboard: (viewId: string) => boolean | Promise<boolean>;
  /** E2V: prompt + schema without view data. */
  onCopyE2vSchemaPromptPackageToClipboard: (viewId: string) => boolean | Promise<boolean>;
  onExportE2vSchemaPromptPackage: (viewId: string) => void;
  onExportJsonSchema: () => void;
  onCopyJsonSchemaToClipboard: () => boolean | Promise<boolean>;
  onCopyE2vSchemaToClipboard: () => boolean | Promise<boolean>;
  onExportViewMermaid: (viewId: string) => void;
  onCopyViewMermaidToClipboard: (viewId: string) => boolean | Promise<boolean>;
  onExportViewPlantUml: (viewId: string) => void;
  onCopyViewPlantUmlToClipboard: (viewId: string) => boolean | Promise<boolean>;
  /** Full board as compact E2V text file. */
  onExportE2vDocument?: () => void;
  onExportViewE2v?: (viewId: string) => void;
  onCopyE2vPackageToClipboard?: (viewId: string) => boolean | Promise<boolean>;
  onExportE2vSchema?: () => void;
  onExportSvg: () => void;
  onExportPng: () => void;
  onExportPdf: () => void;
  onCopyPromptToClipboard: () => boolean | Promise<boolean>;
  onCopyDrawioToClipboard: () => boolean | Promise<boolean>;
  onExportHotspots: () => void;
  onExportActionItems: () => void;
  onExportArchitectureMeasures: () => void;
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

function PanelSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-[0.7rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Disclosure({
  title,
  hint,
  defaultOpen,
  children,
}: {
  title: string;
  /** Compact status next to the title (e.g. last backup). */
  hint?: string;
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
          <span className="min-w-0 flex-1 truncate">
            {title}
            {hint ? (
              <span className="ml-2 font-normal text-[var(--muted)]">{hint}</span>
            ) : null}
          </span>
          <span
            className="shrink-0 text-[0.65rem] text-[var(--muted)] transition group-open:rotate-180"
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

const BACKUP_LIST_PREVIEW = 3;

function formatBackupWhen(createdAt: number, locale = "de-DE"): string {
  try {
    return new Date(createdAt).toLocaleString(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
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

type ExchangeScope = "allViews" | "currentView";
type ExchangeFormat =
  | "json"
  | "e2v"
  | "jsonSchema"
  | "e2vSchemaWithPrompt"
  | "e2vSchemaNoPrompt";
type ExchangeTarget = "file" | "clipboard";
type ImportSource = "file" | "clipboard";

function exchangeClipboardAllowed(format: ExchangeFormat, scope: ExchangeScope): boolean {
  if (scope === "allViews" && format === "e2v") return false;
  return true;
}

function ExchangeSelect({
  label,
  value,
  onChange,
  disabled,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-xs text-[var(--text)]">
      <span className="text-[var(--muted)]">{label}</span>
      <select
        className="dock-field"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
    </label>
  );
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
  workingFilePersistPaused,
  hasUnsavedDocument,
  backupIntervalMinutes,
  backupHistoryMode,
  backupLastLabel,
  onBackupIntervalChange,
  onBackupHistoryModeChange,
  onBackupNow,
  onNewWorkingFile,
  onSaveWorkingFile,
  onOpenWorkingFile,
  onSaveWorkingFileAs,
  onCloseWorkingFile,
  onRenameWorkingFile,
  onOpenRecentWorkingFile,
  onPickFileLibrary,
  onGrantFileLibrary,
  onDetachFileLibrary,
  onOpenFileLibraryEntry,
  onOpenLocalBackup,
  onRestoreBackupFile,
  onOpenBoardShareLink,
  onImportFromFile,
  onImportFromClipboard,
  onReplaceBoardFromClipboard,
  onExportJson,
  onCopyJsonToClipboard,
  onExportViewJson,
  onCopyViewJsonToClipboard,
  onCopyAiPackageToClipboard,
  onCopyE2vSchemaPromptPackageToClipboard,
  onExportE2vSchemaPromptPackage,
  onExportViewMermaid,
  onCopyViewMermaidToClipboard,
  onExportViewPlantUml,
  onCopyViewPlantUmlToClipboard,
  onExportJsonSchema,
  onCopyJsonSchemaToClipboard,
  onCopyE2vSchemaToClipboard,
  onExportE2vDocument,
  onExportViewE2v,
  onCopyE2vPackageToClipboard,
  onExportE2vSchema,
  onExportSvg,
  onExportPng,
  onExportPdf,
  onCopyPromptToClipboard,
  onCopyDrawioToClipboard,
  onExportHotspots,
  onExportActionItems,
  onExportArchitectureMeasures,
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
  const t = useT();
  const { bcp47 } = useI18n();
  const modelingMode = useStormBoardStore((s) => s.modelingMode);
  const activeViewId = useStormBoardStore((s) => s.activeViewId);
  const views = useStormBoardStore((s) => s.views);
  const [recentFiles, setRecentFiles] = useState<
    Array<{ name: string; openedAt: number; handle: FileSystemFileHandle }>
  >([]);
  const [localBackups, setLocalBackups] = useState<LocalBackupListItem[]>([]);
  const [backupListExpanded, setBackupListExpanded] = useState(false);
  const [libraryEntries, setLibraryEntries] = useState<FileLibraryEntry[]>([]);
  const [libraryFolderName, setLibraryFolderName] = useState<string | null>(null);
  const [libraryPermission, setLibraryPermission] = useState<ReturnType<
    typeof getFileLibraryPermissionState
  >>("none");
  const [promptCopied, setPromptCopied] = useState(false);
  const [drawioCopied, setDrawioCopied] = useState(false);
  const [mermaidCopied, setMermaidCopied] = useState(false);
  const [plantUmlCopied, setPlantUmlCopied] = useState(false);
  const [exchangeScope, setExchangeScope] = useState<ExchangeScope>("currentView");
  const [exchangeFormat, setExchangeFormat] = useState<ExchangeFormat>("json");
  const [exchangeTarget, setExchangeTarget] = useState<ExchangeTarget>("file");
  const [exchangeDone, setExchangeDone] = useState(false);
  const [importSource, setImportSource] = useState<ImportSource>("file");
  const [preferredTab, setPreferredTab] = useState<StorageTabId>(() => readStoredTab() ?? "file");

  const exportViewId =
    activeViewId && views.some((v) => v.id === activeViewId)
      ? activeViewId
      : views[0]?.id ?? "";

  useEffect(() => {
    if (exchangeClipboardAllowed(exchangeFormat, exchangeScope)) return;
    setExchangeTarget("file");
  }, [exchangeFormat, exchangeScope]);

  useEffect(() => {
    if (!open) {
      setBackupListExpanded(false);
      return;
    }
    if (hasUnsavedDocument || workingFileDirty) {
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
    setLibraryEntries(getFileLibraryEntries());
    setLibraryFolderName(getFileLibraryFolderName());
    setLibraryPermission(getFileLibraryPermissionState());
    return () => {
      cancelled = true;
    };
    // Prefer Datei only when the sheet opens while unsaved — not on every dirty flip.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open gate
  }, [open, fsAccessSupported, workingFileLabel, busy, backupLastLabel]);

  useEffect(() => {
    if (!open) return;
    const refreshLibrary = () => {
      setLibraryEntries(getFileLibraryEntries());
      setLibraryFolderName(getFileLibraryFolderName());
      setLibraryPermission(getFileLibraryPermissionState());
    };
    window.addEventListener(FILE_LIBRARY_CHANGED_EVENT, refreshLibrary);
    return () => window.removeEventListener(FILE_LIBRARY_CHANGED_EVENT, refreshLibrary);
  }, [open]);

  const selectTab = (id: StorageTabId) => {
    setPreferredTab(id);
    writeStoredTab(id);
  };

  const activeTab = preferredTab;

  const methodExports = useMemo<MethodExportDef[]>(
    () => [
      {
        id: "event-catalog",
        label: t("exportPanel.eventCatalog"),
        detail: t("exportPanel.eventCatalogDetail"),
        modes: ["eventStorming", "eventModeling"],
        onClick: onExportEventCatalog,
      },
      {
        id: "domain-model",
        label: t("exportPanel.domainModel"),
        detail: t("exportPanel.domainModelDetail"),
        modes: ["domainDrivenDesign"],
        onClick: onExportDomainModel,
      },
      {
        id: "example-mapping",
        label: t("exportPanel.exampleMapping"),
        detail: t("exportPanel.exampleMappingDetail"),
        modes: ["bdd"],
        onClick: onExportExampleMapping,
      },
      {
        id: "story-map",
        label: t("exportPanel.storyMap"),
        detail: t("exportPanel.storyMapDetail"),
        modes: ["userStoryMapping"],
        onClick: onExportStoryMap,
      },
      {
        id: "event-model",
        label: t("exportPanel.eventModel"),
        detail: t("exportPanel.eventModelDetail"),
        modes: ["eventModeling"],
        onClick: onExportEventModel,
      },
      {
        id: "process",
        label: t("exportPanel.process"),
        detail: t("exportPanel.processDetail"),
        modes: ["processFlow"],
        onClick: onExportProcess,
      },
      {
        id: "data-model",
        label: t("exportPanel.dataModel"),
        detail: t("exportPanel.dataModelDetail"),
        modes: ["dataModel"],
        onClick: onExportDataModel,
      },
      {
        id: "architecture",
        label: t("exportPanel.architecture"),
        detail: t("exportPanel.architectureDetail"),
        modes: ["c4", "arc42", "cloud"],
        onClick: onExportArchitectureDocumentation,
      },
    ],
    [
      t,
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
    ? workingFilePersistPaused
      ? t("storage.statusAutosavePaused")
      : workingFileDirty
        ? t("storage.statusUnsaved")
        : workingFileSaving
          ? t("storage.statusSaving")
          : t("storage.statusSaved")
    : null;

  const libraryReady = libraryPermission === "granted";
  const libraryBoards = libraryEntries.filter((e) => e.kind === "board");
  const libraryBackups = libraryEntries.filter((e) => e.kind === "backup");
  const librarySupported = isFileLibrarySupported();

  const clipboardExportOk = () => {
    setExchangeDone(true);
    window.setTimeout(() => setExchangeDone(false), 2000);
  };

  const runExchangeExport = () => {
    if (busy || !exportViewId) return;
    const viewId = exportViewId;

    const runClipboard = (p: boolean | Promise<boolean>) => {
      void Promise.resolve(p).then((ok) => {
        if (ok) clipboardExportOk();
      });
    };

    if (exchangeTarget === "file") {
      switch (exchangeFormat) {
        case "json":
          if (exchangeScope === "allViews") onExportJson();
          else onExportViewJson(viewId);
          break;
        case "e2v":
          if (exchangeScope === "allViews") onExportE2vDocument?.();
          else onExportViewE2v?.(viewId);
          break;
        case "jsonSchema":
          onExportJsonSchema();
          break;
        case "e2vSchemaNoPrompt":
          onExportE2vSchema?.();
          break;
        case "e2vSchemaWithPrompt":
          onExportE2vSchemaPromptPackage(viewId);
          break;
        default:
          break;
      }
      return;
    }

    switch (exchangeFormat) {
      case "json":
        runClipboard(
          exchangeScope === "allViews"
            ? onCopyJsonToClipboard()
            : onCopyViewJsonToClipboard(viewId),
        );
        break;
      case "e2v":
        if (onCopyE2vPackageToClipboard) {
          runClipboard(onCopyE2vPackageToClipboard(viewId));
        }
        break;
      case "jsonSchema":
        runClipboard(onCopyJsonSchemaToClipboard());
        break;
      case "e2vSchemaNoPrompt":
        runClipboard(onCopyE2vSchemaToClipboard());
        break;
      case "e2vSchemaWithPrompt":
        runClipboard(onCopyE2vSchemaPromptPackageToClipboard(viewId));
        break;
      default:
        break;
    }
  };

  const clipboardTargetDisabled = !exchangeClipboardAllowed(exchangeFormat, exchangeScope);

  if (!open) return null;

  const tabs: Array<{ id: StorageTabId; label: string; icon: typeof FolderOpen }> = [
    { id: "file", label: t("storage.tabFile"), icon: FolderOpen },
    { id: "export", label: t("storage.tabExport"), icon: ArrowLeftRight },
    { id: "appearance", label: t("storage.tabAppearance"), icon: Palette },
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
              {t("storage.panelTitle")}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="dock-control rounded-lg p-1.5 text-[var(--muted)] hover:text-[var(--text)]"
            aria-label={t("common.close")}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div
          className="flex shrink-0 gap-1 border-b border-[var(--border)] px-3 py-2"
          role="tablist"
          aria-label={t("storage.panelTitle")}
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
            <div className="space-y-5">
              <PanelSection title={t("storage.sectionWorkingFile")}>
                {workingFileAttached ? (
                  <p className="text-xs text-[var(--muted)]">
                    <span className="font-medium text-[var(--text)]">
                      {workingFileLabel ?? t("common.defaultWorkingFile")}
                    </span>
                    {syncStatus ? ` · ${syncStatus}` : null}
                  </p>
                ) : (
                  <p className="text-xs text-[var(--muted)]">{t("storage.noSyncTarget")}</p>
                )}
                {workingFilePersistPaused && (
                  <p className="rounded-lg border border-[var(--accent-2)]/40 bg-[rgba(233,196,106,0.12)] px-2.5 py-2 text-xs text-[var(--accent-2)]">
                    {t("storage.autosavePausedHint")}
                  </p>
                )}
                {hasUnsavedDocument && (
                  <p className="rounded-lg border border-[var(--accent-2)]/40 bg-[rgba(233,196,106,0.12)] px-2.5 py-2 text-xs text-[var(--accent-2)]">
                    {t("storage.unsavedHint")}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <ActionButton onClick={onNewWorkingFile} disabled={busy}>
                    <FilePlus className="h-4 w-4" /> {t("common.new")}
                  </ActionButton>
                  {fsAccessSupported ? (
                    <ActionButton onClick={onOpenWorkingFile} disabled={busy}>
                      <FolderOpen className="h-4 w-4" /> {t("common.open")}
                    </ActionButton>
                  ) : (
                    <ActionButton onClick={onRestoreBackupFile} disabled={busy}>
                      <FolderOpen className="h-4 w-4" /> {t("common.open")}
                    </ActionButton>
                  )}
                  {workingFileAttached ? (
                    <ActionButton
                      onClick={onSaveWorkingFile}
                      disabled={busy || (!workingFileDirty && !workingFilePersistPaused)}
                      emphasize={workingFileDirty || Boolean(hasUnsavedDocument)}
                    >
                      <Save className="h-4 w-4" /> {t("common.save")}
                    </ActionButton>
                  ) : null}
                  <ActionButton
                    onClick={onSaveWorkingFileAs}
                    disabled={busy}
                    emphasize={!workingFileAttached && Boolean(hasUnsavedDocument)}
                  >
                    <Save className="h-4 w-4" /> {t("storage.saveAs")}
                  </ActionButton>
                  {workingFileAttached && onCloseWorkingFile ? (
                    <ActionButton onClick={onCloseWorkingFile} disabled={busy}>
                      <X className="h-4 w-4" /> {t("common.close")}
                    </ActionButton>
                  ) : null}
                  {workingFileAttached && onRenameWorkingFile ? (
                    <ActionButton onClick={onRenameWorkingFile} disabled={busy}>
                      {t("common.rename")}
                    </ActionButton>
                  ) : null}
                </div>
                {busy && (
                  <p className="flex items-center gap-2 text-xs text-[var(--muted)]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("common.loading")}
                  </p>
                )}
                {fsAccessSupported && !libraryReady && recentFiles.length > 0 ? (
                  <ul className="space-y-1 pt-1">
                    <p className="text-[0.65rem] font-medium text-[var(--muted)]">
                      {t("storage.sectionRecent")}
                    </p>
                    {recentFiles.map((entry) => (
                      <li key={`${entry.name}-${entry.openedAt}`}>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => onOpenRecentWorkingFile(entry.handle)}
                          className="dock-control flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-sm disabled:opacity-50"
                          title={new Date(entry.openedAt).toLocaleString(bcp47)}
                        >
                          <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">{entry.name}</span>
                            <span className="block text-[0.65rem] text-[var(--muted)]">
                              {new Date(entry.openedAt).toLocaleString(bcp47)}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </PanelSection>

              <PanelSection title={t("storage.sectionLibrary")}>
                {libraryReady ? (
                  <p className="text-[0.7rem] leading-snug text-[var(--muted)]">
                    {t("storage.libraryHint", {
                      file: libraryFolderName
                        ? `${libraryFolderName}/${STANDARD_LIBRARY_FILENAME}`
                        : STANDARD_LIBRARY_FILENAME,
                    })}
                  </p>
                ) : libraryPermission === "prompt" ? (
                  <p className="text-[0.7rem] leading-snug text-[var(--muted)]">
                    {libraryFolderName
                      ? `${libraryFolderName}/${STANDARD_LIBRARY_FILENAME}`
                      : STANDARD_LIBRARY_FILENAME}
                  </p>
                ) : (
                  <p className="text-[0.7rem] leading-snug text-[var(--muted)]">
                    {librarySupported ? t("storage.libraryNeedFolder") : t("storage.libraryUnsupported")}
                  </p>
                )}
                {libraryReady && libraryBoards.length === 0 ? (
                  <p className="text-[0.7rem] text-[var(--muted)]">{t("storage.libraryEmpty")}</p>
                ) : null}
                {libraryReady && libraryBoards.length > 0 ? (
                  <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--panel-solid)]/40">
                    {libraryBoards.map((entry) => {
                      const isCurrent =
                        Boolean(workingFileLabel) &&
                        (workingFileLabel === entry.path.split("/").pop() ||
                          workingFileLabel === entry.path);
                      return (
                        <li key={entry.id}>
                          <button
                            type="button"
                            disabled={busy || !onOpenFileLibraryEntry}
                            onClick={() => onOpenFileLibraryEntry?.(entry)}
                            className="flex w-full items-start gap-2 px-2.5 py-2 text-left hover:bg-[var(--control-hover)] disabled:opacity-50"
                            title={entry.path}
                          >
                            <Library
                              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--muted)]"
                              aria-hidden
                            />
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-1.5">
                                <span className="block truncate text-sm font-medium text-[var(--text)]">
                                  {entry.title}
                                </span>
                                {isCurrent ? (
                                  <span className="shrink-0 text-[0.6rem] uppercase tracking-wide text-[var(--accent)]">
                                    {t("storage.libraryCurrent")}
                                  </span>
                                ) : null}
                              </span>
                              <span className="block truncate text-[0.65rem] text-[var(--muted)]">
                                {entry.path}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
                <div className="grid grid-cols-2 gap-2">
                  {librarySupported && libraryPermission === "prompt" && onGrantFileLibrary ? (
                    <ActionButton onClick={onGrantFileLibrary} disabled={busy} emphasize>
                      {t("storage.libraryGrant")}
                    </ActionButton>
                  ) : null}
                  {librarySupported && onPickFileLibrary ? (
                    <ActionButton onClick={onPickFileLibrary} disabled={busy}>
                      <FolderOpen className="h-4 w-4" />
                      {libraryPermission === "none"
                        ? t("storage.libraryPick")
                        : t("storage.libraryChange")}
                    </ActionButton>
                  ) : null}
                  {libraryPermission !== "none" && onDetachFileLibrary ? (
                    <ActionButton onClick={onDetachFileLibrary} disabled={busy}>
                      {t("storage.libraryDetach")}
                    </ActionButton>
                  ) : null}
                </div>
              </PanelSection>

              <Disclosure
                title={t("backup.title")}
                hint={
                  libraryReady && libraryBackups.length > 0
                    ? `${libraryBackups.length} · ${backupLastLabel}`
                    : localBackups.length > 0
                      ? `${localBackups.length} · ${backupLastLabel}`
                      : backupLastLabel
                }
              >
                <p className="text-[0.7rem] leading-snug text-[var(--muted)]">
                  {libraryReady
                    ? t("backup.hintLibrary", { dir: FILE_LIBRARY_BACKUP_DIR })
                    : t("backup.hintUnsaved")}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <ActionButton onClick={onBackupNow} disabled={busy}>
                    <Save className="h-4 w-4" /> {t("backup.saveNow")}
                  </ActionButton>
                  <ActionButton onClick={onRestoreBackupFile} disabled={busy}>
                    <FolderOpen className="h-4 w-4" /> {t("backup.openFile")}
                  </ActionButton>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex min-w-0 flex-col gap-1 text-xs text-[var(--text)]">
                    <span className="text-[var(--muted)]">{t("backup.history")}</span>
                    <select
                      className="dock-field"
                      value={backupHistoryMode}
                      onChange={(e) =>
                        onBackupHistoryModeChange(e.target.value as BackupHistoryMode)
                      }
                    >
                      <option value="history">{t("backup.historyOn")}</option>
                      <option value="rolling">{t("backup.historyRolling")}</option>
                    </select>
                  </label>
                  <label className="flex min-w-0 flex-col gap-1 text-xs text-[var(--text)]">
                    <span className="text-[var(--muted)]">{t("backup.automatic")}</span>
                    <select
                      className="dock-field"
                      value={backupIntervalMinutes}
                      onChange={(e) =>
                        onBackupIntervalChange(Number(e.target.value) as BackupIntervalMinutes)
                      }
                    >
                      {BACKUP_INTERVAL_OPTIONS_MINUTES.map((m) => (
                        <option key={m} value={m}>
                          {m === 0
                            ? t("backup.automaticOff")
                            : t("backup.automaticMinutes", { n: m })}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {libraryReady && libraryBackups.length > 0 ? (
                  <div className="space-y-1">
                    <p className="text-[0.65rem] font-medium text-[var(--muted)]">
                      {t("backup.recent")}
                    </p>
                    <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--panel-solid)]/40">
                      {(backupListExpanded
                        ? libraryBackups
                        : libraryBackups.slice(0, BACKUP_LIST_PREVIEW)
                      ).map((entry) => (
                        <li key={entry.id}>
                          <button
                            type="button"
                            disabled={busy || !onOpenFileLibraryEntry}
                            onClick={() => onOpenFileLibraryEntry?.(entry)}
                            className="flex w-full items-start gap-2 px-2.5 py-1.5 text-left hover:bg-[var(--control-hover)] disabled:opacity-50"
                            title={entry.path}
                          >
                            <Clock className="mt-0.5 h-3 w-3 shrink-0 text-[var(--muted)]" aria-hidden />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-xs font-medium">{entry.title}</span>
                              <span className="block truncate text-[0.65rem] text-[var(--muted)]">
                                {entry.path}
                              </span>
                            </span>
                            <span className="shrink-0 tabular-nums text-[0.65rem] text-[var(--muted)]">
                              {formatBackupWhen(entry.updatedAt, bcp47)}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                    {libraryBackups.length > BACKUP_LIST_PREVIEW ? (
                      <button
                        type="button"
                        className="text-[0.65rem] font-medium text-[var(--muted)] underline-offset-2 hover:text-[var(--text)] hover:underline"
                        onClick={() => setBackupListExpanded((v) => !v)}
                      >
                        {backupListExpanded
                          ? t("backup.showLess")
                          : t("backup.showAll", { n: libraryBackups.length })}
                      </button>
                    ) : null}
                  </div>
                ) : localBackups.length > 0 ? (
                  <div className="space-y-1">
                    <p className="text-[0.65rem] font-medium text-[var(--muted)]">
                      {t("backup.recent")}
                    </p>
                    <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--panel-solid)]/40">
                      {(backupListExpanded
                        ? localBackups
                        : localBackups.slice(0, BACKUP_LIST_PREVIEW)
                      ).map((entry) => (
                        <li key={entry.id}>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => onOpenLocalBackup(entry.id)}
                            className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs hover:bg-[var(--control-hover)] disabled:opacity-50"
                            title={new Date(entry.createdAt).toLocaleString(bcp47)}
                          >
                            <Clock className="h-3 w-3 shrink-0 text-[var(--muted)]" aria-hidden />
                            <span className="min-w-0 flex-1 truncate font-medium">
                              {entry.filename}
                            </span>
                            <span className="shrink-0 tabular-nums text-[0.65rem] text-[var(--muted)]">
                              {formatBackupWhen(entry.createdAt, bcp47)}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                    {localBackups.length > BACKUP_LIST_PREVIEW ? (
                      <button
                        type="button"
                        className="text-[0.65rem] font-medium text-[var(--muted)] underline-offset-2 hover:text-[var(--text)] hover:underline"
                        onClick={() => setBackupListExpanded((v) => !v)}
                      >
                        {backupListExpanded
                          ? t("backup.showLess")
                          : t("backup.showAll", { n: localBackups.length })}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </Disclosure>
            </div>
          )}

          {activeTab === "export" && (
            <div className="space-y-5">
              <PanelSection title={t("storage.sectionImport")}>
                <div className="grid grid-cols-2 gap-2">
                  <ExchangeSelect
                    label={t("exportPanel.exchangeImportSource")}
                    value={importSource}
                    disabled={busy}
                    onChange={(v) => setImportSource(v as ImportSource)}
                  >
                    <option value="file">{t("exportPanel.exchangeTargetFile")}</option>
                    <option value="clipboard">{t("exportPanel.exchangeTargetClipboard")}</option>
                  </ExchangeSelect>
                </div>
                {importSource === "file" ? (
                  <ActionButton onClick={onImportFromFile} disabled={busy}>
                    <Upload className="h-4 w-4" /> {t("exportPanel.exchangeImportFromFile")}
                  </ActionButton>
                ) : (
                  <>
                    <ActionButton onClick={onImportFromClipboard} disabled={busy}>
                      <ClipboardPaste className="h-4 w-4" />{" "}
                      {t("exportPanel.exchangeImportFromClipboard")}
                    </ActionButton>
                    <p className="text-[0.7rem] leading-snug text-[var(--muted)]">
                      {t("exportPanel.exchangeImportClipboardHint")}
                    </p>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={onReplaceBoardFromClipboard}
                      className="text-left text-[0.7rem] font-medium text-[var(--accent)] underline-offset-2 hover:underline disabled:opacity-50"
                    >
                      {t("exportPanel.exchangeReplaceBoard")}
                    </button>
                  </>
                )}
              </PanelSection>

              <PanelSection title={t("exportPanel.sectionExport")}>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <ExchangeSelect
                    label={t("exportPanel.exchangeScope")}
                    value={exchangeScope}
                    disabled={busy}
                    onChange={(v) => setExchangeScope(v as ExchangeScope)}
                  >
                    <option value="allViews">{t("exportPanel.exchangeScopeAllViews")}</option>
                    <option value="currentView">{t("exportPanel.exchangeScopeCurrentView")}</option>
                  </ExchangeSelect>
                  <ExchangeSelect
                    label={t("exportPanel.exchangeFormat")}
                    value={exchangeFormat}
                    disabled={busy}
                    onChange={(v) => setExchangeFormat(v as ExchangeFormat)}
                  >
                    <option value="json">{t("exportPanel.exchangeFormatJson")}</option>
                    <option value="e2v">{t("exportPanel.exchangeFormatE2v")}</option>
                    <option value="jsonSchema">{t("exportPanel.exchangeFormatJsonSchema")}</option>
                    <option value="e2vSchemaWithPrompt">
                      {t("exportPanel.exchangeFormatE2vSchemaWithPrompt")}
                    </option>
                    <option value="e2vSchemaNoPrompt">
                      {t("exportPanel.exchangeFormatE2vSchemaNoPrompt")}
                    </option>
                  </ExchangeSelect>
                  <ExchangeSelect
                    label={t("exportPanel.exchangeTarget")}
                    value={exchangeTarget}
                    disabled={busy || clipboardTargetDisabled}
                    onChange={(v) => setExchangeTarget(v as ExchangeTarget)}
                  >
                    <option value="file">{t("exportPanel.exchangeTargetFile")}</option>
                    <option value="clipboard" disabled={clipboardTargetDisabled}>
                      {t("exportPanel.exchangeTargetClipboard")}
                    </option>
                  </ExchangeSelect>
                </div>
                <ActionButton
                  onClick={runExchangeExport}
                  disabled={busy || !exportViewId || (clipboardTargetDisabled && exchangeTarget === "clipboard")}
                  emphasize={exchangeDone}
                >
                  {exchangeTarget === "clipboard" && exchangeDone ? (
                    <>
                      <ClipboardCopy className="h-4 w-4" /> {t("common.copied")}
                    </>
                  ) : exchangeTarget === "file" ? (
                    <>
                      <Download className="h-4 w-4" /> {t("exportPanel.exchangeRun")}
                    </>
                  ) : (
                    <>
                      <ClipboardCopy className="h-4 w-4" /> {t("exportPanel.exchangeRun")}
                    </>
                  )}
                </ActionButton>
              </PanelSection>

              {(onOpenCollab || onOpenBoardShareLink) && (
                <PanelSection title={t("storage.sectionCollab")}>
                  <div className="grid grid-cols-1 gap-1.5">
                    {onOpenCollab ? (
                      <ActionButton onClick={onOpenCollab} disabled={busy}>
                        <Users className="h-4 w-4" /> {t("storage.createJoinRoom")}
                      </ActionButton>
                    ) : null}
                    {onOpenBoardShareLink ? (
                      <ActionButton onClick={onOpenBoardShareLink} disabled={busy}>
                        <Share2 className="h-4 w-4" /> {t("storage.shareBoardLink")}
                      </ActionButton>
                    ) : null}
                  </div>
                </PanelSection>
              )}

              <ExportGroup title={t("exportPanel.groupActiveView")} hint={t("exportPanel.groupActiveViewHint")}>
                <ExportTile
                  onClick={() => {
                    void Promise.resolve(onCopyPromptToClipboard()).then((ok) => {
                      if (!ok) return;
                      setPromptCopied(true);
                      window.setTimeout(() => setPromptCopied(false), 2000);
                    });
                  }}
                  disabled={busy}
                  label={promptCopied ? t("common.copied") : t("exportPanel.prompt")}
                  detail={t("chrome.promptDetail")}
                  icon={FileText}
                  emphasize={promptCopied}
                />
                <ExportTile
                  onClick={onExportPng}
                  disabled={busy}
                  label="PNG"
                  detail={t("exportPanel.rasterImage")}
                />
                <ExportTile
                  onClick={onExportSvg}
                  disabled={busy}
                  label="SVG"
                  detail={t("exportPanel.drawioFile")}
                />
                <ExportTile
                  onClick={onExportPdf}
                  disabled={busy}
                  label="PDF"
                  detail={t("exportPanel.pdfOnePage")}
                />
                <ExportTile
                  onClick={() => {
                    void Promise.resolve(onCopyDrawioToClipboard()).then((ok) => {
                      if (!ok) return;
                      setDrawioCopied(true);
                      window.setTimeout(() => setDrawioCopied(false), 2000);
                    });
                  }}
                  disabled={busy}
                  label={drawioCopied ? t("common.copied") : "Draw.io"}
                  detail={t("exportPanel.drawioPaste")}
                  icon={ClipboardCopy}
                  emphasize={drawioCopied}
                />
              </ExportGroup>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--control)]/35 p-2.5">
                <div className="mb-2 flex items-baseline justify-between gap-2 px-0.5">
                  <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
                    {t("exportPanel.diagramSection")}
                  </p>
                  <p className="text-[0.65rem] text-[var(--muted)]">{t("exportPanel.diagramSectionHint")}</p>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <ExportTile
                    onClick={() => onExportViewMermaid(exportViewId)}
                    disabled={busy || !exportViewId}
                    label="Mermaid"
                    detail={t("exportPanel.mmdDownload")}
                    emphasize
                  />
                  <ExportTile
                    onClick={() => {
                      void Promise.resolve(onCopyViewMermaidToClipboard(exportViewId)).then(
                        (ok) => {
                          if (!ok) return;
                          setMermaidCopied(true);
                          window.setTimeout(() => setMermaidCopied(false), 2000);
                        },
                      );
                    }}
                    disabled={busy || !exportViewId}
                    label={mermaidCopied ? t("common.copied") : t("exportPanel.copyMermaid")}
                    detail={t("exportPanel.clipboard")}
                    icon={ClipboardCopy}
                    emphasize={mermaidCopied}
                  />
                  <ExportTile
                    onClick={() => onExportViewPlantUml(exportViewId)}
                    disabled={busy || !exportViewId}
                    label="PlantUML"
                    detail={t("exportPanel.pumlDownload")}
                    emphasize
                  />
                  <ExportTile
                    onClick={() => {
                      void Promise.resolve(
                        onCopyViewPlantUmlToClipboard(exportViewId),
                      ).then((ok) => {
                        if (!ok) return;
                        setPlantUmlCopied(true);
                        window.setTimeout(() => setPlantUmlCopied(false), 2000);
                      });
                    }}
                    disabled={busy || !exportViewId}
                    label={plantUmlCopied ? t("common.copied") : t("exportPanel.copyPlantUml")}
                    detail={t("exportPanel.clipboard")}
                    icon={ClipboardCopy}
                    emphasize={plantUmlCopied}
                  />
                </div>
              </div>

              <ExportGroup title={t("exportPanel.reports")} hint={t("exportPanel.reportsHint")}>
                <ExportTile
                  onClick={onExportHotspots}
                  disabled={busy}
                  label={t("exportPanel.hotspotsReport")}
                  detail={t("exportPanel.reportDetail")}
                />
                <ExportTile
                  onClick={onExportActionItems}
                  disabled={busy}
                  label={t("exportPanel.todosReport")}
                  detail={t("exportPanel.actionItemsDetail")}
                />
                <ExportTile
                  onClick={onExportArchitectureMeasures}
                  disabled={busy}
                  label={t("exportPanel.measuresReport")}
                  detail={t("exportPanel.measuresReportDetail")}
                />
                <ExportTile
                  onClick={onExportGlossary}
                  disabled={busy}
                  label={t("exportPanel.glossaryReport")}
                  detail={t("exportPanel.glossaryTermsDetail")}
                />
                <ExportTile
                  onClick={onExportContextMap}
                  disabled={busy}
                  label={t("exportPanel.contextMapReport")}
                  detail={t("exportPanel.contextMapBcDetail")}
                  emphasize={modeMatches(modelingMode, "eventStorming", "domainDrivenDesign")}
                />
              </ExportGroup>

              {matchedMethods.length > 0 && (
                <ExportGroup title={t("exportPanel.methodsGroup")} hint={t("exportPanel.markdownDetail")}>
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
                  title={
                    matchedMethods.length > 0
                      ? t("exportPanel.otherMethods")
                      : t("exportPanel.methodsFallback")
                  }
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
