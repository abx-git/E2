/**
 * Timestamped local board backups (download copies, independent of the working file).
 */

import { boardJsonFromStoreState } from "@/lib/file-board-reconcile";
import { documentHasContent } from "@/lib/storm-json";
import { boardImportPayloadFromStore } from "@/store/storm-board-store";

export const BACKUP_INTERVAL_OPTIONS_MINUTES = [0, 5, 10, 15, 30] as const;
export type BackupIntervalMinutes = (typeof BACKUP_INTERVAL_OPTIONS_MINUTES)[number];

const LS_INTERVAL = "e2-backup-interval-minutes";
const LS_LAST_AT = "e2-backup-last-at";

export function slugForBackupFilename(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_äöüß]/gi, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "board";
}

/** Local timestamp suitable for filenames: 2026-07-23-070015 */
export function formatBackupTimestamp(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

export function buildBackupFilename(title: string, date: Date = new Date()): string {
  return `${slugForBackupFilename(title)}-backup-${formatBackupTimestamp(date)}.storm.json`;
}

export function downloadBoardBackup(json: string, title: string, date: Date = new Date()): string {
  const filename = buildBackupFilename(title, date);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  rememberLastBackupAt(date.getTime());
  return filename;
}

/** Create a timestamped backup of the current editor board. */
export function createBoardBackupNow(
  options?: { allowEmpty?: boolean },
): { filename: string; skipped: false } | { skipped: true; reason: "empty" } {
  const payload = boardImportPayloadFromStore();
  if (!options?.allowEmpty && !documentHasContent(payload)) {
    return { skipped: true, reason: "empty" };
  }
  const json = boardJsonFromStoreState();
  const filename = downloadBoardBackup(json, payload.title || "board");
  return { filename, skipped: false };
}

export function readBackupIntervalMinutes(): BackupIntervalMinutes {
  if (typeof localStorage === "undefined") return 0;
  try {
    const raw = Number(localStorage.getItem(LS_INTERVAL));
    if ((BACKUP_INTERVAL_OPTIONS_MINUTES as readonly number[]).includes(raw)) {
      return raw as BackupIntervalMinutes;
    }
  } catch {
    /* ignore */
  }
  return 0;
}

export function writeBackupIntervalMinutes(minutes: BackupIntervalMinutes): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(LS_INTERVAL, String(minutes));
  } catch {
    /* ignore */
  }
}

export function readLastBackupAt(): number | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = Number(localStorage.getItem(LS_LAST_AT));
    return Number.isFinite(raw) && raw > 0 ? raw : null;
  } catch {
    return null;
  }
}

export function rememberLastBackupAt(ms: number = Date.now()): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(LS_LAST_AT, String(ms));
  } catch {
    /* ignore */
  }
}

export function formatLastBackupLabel(ms: number | null, locale = "de-DE"): string {
  if (!ms) return "Noch kein Backup";
  return `Zuletzt: ${new Date(ms).toLocaleString(locale)}`;
}
