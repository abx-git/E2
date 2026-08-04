/**
 * Arbeitsdatei (File System Access API): einziges Speichermedium.
 * Handles / mobile mirrors are keyed by filename so tabs with different
 * `?filename=` bookmarks do not overwrite each other's IndexedDB slots.
 */

import {
  applyBoardJsonToStore,
  boardJsonFromStoreState,
  boardStatesEquivalent,
  planFileReconcile,
} from "@/lib/file-board-reconcile";
import { boardImportPayloadFromExportText } from "@/lib/storm-json";
import {
  bindTabWorkingFileName,
  normalizeWorkingFilename,
  resolvePreferredWorkingFileName,
} from "@/lib/working-file-tab-context";
import {
  ensureWorkingFileWriter,
  isWorkingFileWriterLeader,
  stopWorkingFileWriter,
} from "@/lib/working-file-writer";

export const STANDARD_WORKING_FILENAME = "board.storm.json";

const IDB_NAME = "e2-working-file";
const IDB_VERSION = 1;
const IDB_STORE = "handles";
/** Legacy singleton keys (pre multi-tab); migrated on read. */
export const LEGACY_IDB_HANDLE_KEY = "board-json";
export const LEGACY_IDB_MOBILE_KEY = "mobile-working-copy";
const IDB_RECENT_KEY = "recent-working-files";
const LS_LAST_FILE_NAME = "e2-last-working-file-name";
const RECENT_WORKING_FILES_LIMIT = 8;

export function workingFileHandleIdbKey(fileName: string): string {
  const normalized = normalizeWorkingFilename(fileName) || normalizeWorkingFilename(STANDARD_WORKING_FILENAME);
  return `handle:${normalized}`;
}

export function workingFileMobileIdbKey(fileName: string): string {
  const normalized = normalizeWorkingFilename(fileName) || normalizeWorkingFilename(STANDARD_WORKING_FILENAME);
  return `mobile:${normalized}`;
}

function syncTabContextAndWriter(fileName: string | null): void {
  bindTabWorkingFileName(fileName);
  if (fileName?.trim()) {
    ensureWorkingFileWriter(fileName.trim());
  } else {
    stopWorkingFileWriter();
  }
}

export interface RecentWorkingFileRecord {
  name: string;
  openedAt: number;
  handle: FileSystemFileHandle;
}

let memoryHandle: FileSystemFileHandle | null = null;
let mobileWorkingFileName: string | null = null;

interface MobileWorkingCopyRecord {
  fileName: string;
  json: string;
  sourceLastModified: number;
}

let lastSyncedBoardJson: string | null = null;
let lastKnownFileModified = 0;
let suppressExternalPollUntil = 0;
let sessionHydrated = false;

export function wasWorkingFileSessionHydrated(): boolean {
  return sessionHydrated;
}

export function markWorkingFileSessionHydrated(): void {
  sessionHydrated = true;
}

export function clearWorkingFileSessionHydrated(): void {
  sessionHydrated = false;
}

const OWN_WRITE_SUPPRESS_MS = 1500;

/** When true, working-file must never push disk content into the editor (collab/join). */
let workingFileToStoreBlocked = false;

export function setWorkingFileToStoreBlocked(blocked: boolean): void {
  workingFileToStoreBlocked = blocked;
}

export function isWorkingFileToStoreBlocked(): boolean {
  return workingFileToStoreBlocked;
}

/** Extend external-poll suppression (e.g. after join while mirroring room → file). */
export function suppressWorkingFileExternalPoll(ms: number): void {
  suppressExternalPollUntil = Math.max(suppressExternalPollUntil, Date.now() + Math.max(0, ms));
}

export type WriteWorkingFileResult =
  | { ok: true; lastModified: number }
  | {
      ok: false;
      reason: "no_handle" | "permission_denied" | "conflict" | "io_error" | "not_writer";
    };

export function isWorkingFileSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.showOpenFilePicker === "function" &&
    typeof window.showSaveFilePicker === "function"
  );
}

export function isMobileWorkingFileEnvironment(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function prefersBrowserFilePicker(): boolean {
  return isMobileWorkingFileEnvironment();
}

export function isWorkingFileUiAvailable(): boolean {
  return isWorkingFileSupported() || prefersBrowserFilePicker();
}

export function isMobileWorkingFileMode(): boolean {
  return mobileWorkingFileName !== null && memoryHandle === null;
}

export function fileSystemAccessUnavailableMessage(): string {
  return "Die Arbeitsdatei nutzt die File-System-API. Bitte Chrome, Edge oder Brave verwenden, oder JSON exportieren.";
}

export function getWorkingFileHandle(): FileSystemFileHandle | null {
  return memoryHandle;
}

export function isWorkingFileAttached(): boolean {
  return memoryHandle !== null || mobileWorkingFileName !== null;
}

/** When true, WorkingFileSync must not auto-write (reserved; unused in normal collab). */
let workingFilePersistPaused = false;

export function setWorkingFilePersistPaused(paused: boolean): void {
  workingFilePersistPaused = paused;
}

export function isWorkingFilePersistPaused(): boolean {
  return workingFilePersistPaused;
}

export function markWorkingFileSynced(json: string, fileLastModified: number): void {
  lastSyncedBoardJson = json;
  lastKnownFileModified = fileLastModified;
}

export function noteOwnWriteToWorkingFile(json: string, fileLastModified: number): void {
  markWorkingFileSynced(json, fileLastModified);
  suppressExternalPollUntil = Date.now() + OWN_WRITE_SUPPRESS_MS;
  void persistBrowserMirror(json, fileLastModified);
}

export function clearWorkingFileSyncState(): void {
  lastSyncedBoardJson = null;
  lastKnownFileModified = 0;
  suppressExternalPollUntil = 0;
}

export function isWorkingFileDirty(currentJson?: string): boolean {
  if (!isWorkingFileAttached()) return false;
  const json = currentJson ?? boardJsonFromStoreState();
  const synced = getLastSyncedBoardJson();
  if (!synced) return json.trim().length > 0;
  return !boardStatesEquivalent(json, synced);
}

export function getWorkingFileLabel(): string | null {
  if (memoryHandle) return workingFileDisplayName(memoryHandle);
  if (mobileWorkingFileName?.trim()) return mobileWorkingFileName.trim();
  return getRememberedWorkingFileName();
}

export function getRememberedWorkingFileName(): string | null {
  if (typeof localStorage === "undefined") return null;
  const name = localStorage.getItem(LS_LAST_FILE_NAME)?.trim();
  return name || null;
}

function rememberLastFileNameInStorage(fileName: string): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(LS_LAST_FILE_NAME, fileName);
  } catch {
    /* ignore */
  }
}

function clearRememberedFileNameInStorage(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(LS_LAST_FILE_NAME);
  } catch {
    /* ignore */
  }
}

async function persistBrowserMirror(json: string, fileLastModified: number): Promise<void> {
  const fileName =
    workingFileDisplayName(memoryHandle) ??
    mobileWorkingFileName?.trim() ??
    getRememberedWorkingFileName() ??
    STANDARD_WORKING_FILENAME;
  await rememberMobileCopy(json, fileName, fileLastModified);
}

export function shouldSuppressExternalFilePoll(): boolean {
  return Date.now() < suppressExternalPollUntil;
}

export function getLastKnownFileModified(): number {
  return lastKnownFileModified;
}

export function isKnownFileRevision(fileLastModified: number): boolean {
  return fileLastModified > 0 && fileLastModified === lastKnownFileModified;
}

export function getLastSyncedBoardJson(): string | null {
  return lastSyncedBoardJson;
}

export function noteExternalFileRevision(fileLastModified: number): void {
  lastKnownFileModified = fileLastModified;
}

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB"));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
  });
}

async function idbPut<T>(key: string, value: T): Promise<void> {
  const db = await openIdb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("tx"));
      tx.objectStore(IDB_STORE).put(value, key);
    });
  } finally {
    db.close();
  }
}

async function idbGet<T>(key: string): Promise<T | null> {
  try {
    const db = await openIdb();
    try {
      return await new Promise<T | null>((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, "readonly");
        tx.onerror = () => reject(tx.error ?? new Error("tx"));
        const r = tx.objectStore(IDB_STORE).get(key);
        r.onsuccess = () => resolve((r.result as T | undefined) ?? null);
      });
    } finally {
      db.close();
    }
  } catch {
    return null;
  }
}

async function idbDelete(key: string): Promise<void> {
  try {
    const db = await openIdb();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, "readwrite");
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error("tx"));
        tx.objectStore(IDB_STORE).delete(key);
      });
    } finally {
      db.close();
    }
  } catch {
    /* ignore */
  }
}

async function idbPutHandle(handle: FileSystemFileHandle, fileName?: string): Promise<void> {
  const name = fileName?.trim() || handle.name?.trim() || STANDARD_WORKING_FILENAME;
  await idbPut(workingFileHandleIdbKey(name), handle);
  // Drop legacy singleton so other tabs are not restored to the wrong file.
  await idbDelete(LEGACY_IDB_HANDLE_KEY);
}

async function idbGetHandle(preferredFileName?: string | null): Promise<FileSystemFileHandle | null> {
  const preferred = preferredFileName?.trim() || null;
  if (preferred) {
    const keyed = await idbGet<FileSystemFileHandle>(workingFileHandleIdbKey(preferred));
    if (keyed) return keyed;
  }

  const legacy = await idbGet<FileSystemFileHandle>(LEGACY_IDB_HANDLE_KEY);
  if (legacy) {
    const legacyName = legacy.name?.trim() || STANDARD_WORKING_FILENAME;
    if (
      !preferred ||
      normalizeWorkingFilename(legacyName) === normalizeWorkingFilename(preferred)
    ) {
      try {
        await idbPutHandle(legacy, legacyName);
      } catch {
        /* ignore migrate errors */
      }
      return legacy;
    }
  }

  if (!preferred) {
    const last = getRememberedWorkingFileName();
    if (last) {
      const byLast = await idbGet<FileSystemFileHandle>(workingFileHandleIdbKey(last));
      if (byLast) return byLast;
    }
  }

  return null;
}

async function idbClearHandle(fileName?: string | null): Promise<void> {
  const name =
    fileName?.trim() ||
    memoryHandle?.name?.trim() ||
    mobileWorkingFileName?.trim() ||
    getRememberedWorkingFileName();
  if (name) await idbDelete(workingFileHandleIdbKey(name));
  await idbDelete(LEGACY_IDB_HANDLE_KEY);
}

async function idbPutMobileCopy(record: MobileWorkingCopyRecord): Promise<void> {
  await idbPut(workingFileMobileIdbKey(record.fileName), record);
  await idbDelete(LEGACY_IDB_MOBILE_KEY);
}

async function idbGetMobileCopy(preferredFileName?: string | null): Promise<MobileWorkingCopyRecord | null> {
  const preferred = preferredFileName?.trim() || null;
  if (preferred) {
    const keyed = await idbGet<MobileWorkingCopyRecord>(workingFileMobileIdbKey(preferred));
    if (keyed) return keyed;
  }

  const legacy = await idbGet<MobileWorkingCopyRecord>(LEGACY_IDB_MOBILE_KEY);
  if (legacy?.fileName?.trim()) {
    if (
      !preferred ||
      normalizeWorkingFilename(legacy.fileName) === normalizeWorkingFilename(preferred)
    ) {
      try {
        await idbPutMobileCopy(legacy);
      } catch {
        /* ignore */
      }
      return legacy;
    }
  }

  if (!preferred) {
    const last = getRememberedWorkingFileName();
    if (last) {
      const byLast = await idbGet<MobileWorkingCopyRecord>(workingFileMobileIdbKey(last));
      if (byLast) return byLast;
    }
  }

  return null;
}

async function idbClearMobileCopy(fileName?: string | null): Promise<void> {
  const name =
    fileName?.trim() ||
    mobileWorkingFileName?.trim() ||
    memoryHandle?.name?.trim() ||
    getRememberedWorkingFileName();
  if (name) await idbDelete(workingFileMobileIdbKey(name));
  await idbDelete(LEGACY_IDB_MOBILE_KEY);
}

async function idbGetRecent(): Promise<RecentWorkingFileRecord[]> {
  try {
    const db = await openIdb();
    try {
      const raw = await new Promise<unknown>((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, "readonly");
        tx.onerror = () => reject(tx.error ?? new Error("tx"));
        const r = tx.objectStore(IDB_STORE).get(IDB_RECENT_KEY);
        r.onsuccess = () => resolve(r.result);
      });
      if (!Array.isArray(raw)) return [];
      return raw.filter(
        (entry): entry is RecentWorkingFileRecord =>
          Boolean(
            entry &&
              typeof entry === "object" &&
              typeof (entry as RecentWorkingFileRecord).name === "string" &&
              typeof (entry as RecentWorkingFileRecord).openedAt === "number" &&
              (entry as RecentWorkingFileRecord).handle,
          ),
      );
    } finally {
      db.close();
    }
  } catch {
    return [];
  }
}

async function idbPutRecent(entries: RecentWorkingFileRecord[]): Promise<void> {
  const db = await openIdb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("tx"));
      tx.objectStore(IDB_STORE).put(entries, IDB_RECENT_KEY);
    });
  } finally {
    db.close();
  }
}

async function handlesAreSame(
  a: FileSystemFileHandle,
  b: FileSystemFileHandle,
): Promise<boolean> {
  try {
    if (typeof a.isSameEntry === "function") return await a.isSameEntry(b);
  } catch {
    /* ignore */
  }
  return a.name === b.name;
}

async function rememberRecentWorkingFile(handle: FileSystemFileHandle): Promise<void> {
  const name = handle.name?.trim() || STANDARD_WORKING_FILENAME;
  const openedAt = Date.now();
  try {
    const existing = await idbGetRecent();
    const next: RecentWorkingFileRecord[] = [{ name, openedAt, handle }];
    for (const entry of existing) {
      if (await handlesAreSame(entry.handle, handle)) continue;
      next.push(entry);
      if (next.length >= RECENT_WORKING_FILES_LIMIT) break;
    }
    await idbPutRecent(next);
  } catch {
    /* ignore */
  }
}

/** Recent Arbeitsdateien (File System Access handles), newest first. */
export async function listRecentWorkingFiles(): Promise<
  Array<{ name: string; openedAt: number; handle: FileSystemFileHandle }>
> {
  if (!isWorkingFileSupported()) return [];
  return idbGetRecent();
}

export async function clearRecentWorkingFiles(): Promise<void> {
  try {
    await idbPutRecent([]);
  } catch {
    /* ignore */
  }
}

/**
 * Re-open a recent file (must be called from a user gesture for permission).
 * Promotes it to the current Arbeitsdatei and hydrates the editor.
 */
export async function openRecentWorkingFile(
  handle: FileSystemFileHandle,
  options?: { skipPermission?: boolean },
): Promise<{
  handle: FileSystemFileHandle;
  hydrate: HydrateWorkingFileResult;
} | null> {
  if (!isWorkingFileSupported()) return null;
  try {
    if (!options?.skipPermission) {
      const granted = await ensureReadWritePermission(handle);
      if (!granted) return null;
    }
    await rememberHandle(handle);
    return { handle, hydrate: await hydrateStoreFromWorkingFile(handle) };
  } catch (e) {
    console.error("Recent file open:", e);
    return null;
  }
}

/**
 * Request readwrite permission for a remembered handle.
 * Must run from a user gesture *before* any programmatic download (which consumes activation).
 */
export async function requestWorkingFilePermission(
  handle: FileSystemFileHandle,
): Promise<boolean> {
  if (!isWorkingFileSupported()) return false;
  try {
    return await ensureReadWritePermission(handle);
  } catch {
    return false;
  }
}

async function ensureReadWritePermission(handle: FileSystemFileHandle): Promise<boolean> {
  let ok = (await handle.queryPermission({ mode: "readwrite" })) === "granted";
  if (!ok) ok = (await handle.requestPermission({ mode: "readwrite" })) === "granted";
  return ok;
}

const JSON_PICKER_TYPES: FilePickerAcceptType[] = [
  { description: "Event Storming JSON", accept: { "application/json": [".json", ".storm.json"] } },
];

export async function readWorkingFileSnapshot(
  handle: FileSystemFileHandle = memoryHandle!,
): Promise<{ text: string; lastModified: number } | null> {
  if (!handle) return null;
  try {
    const file = await handle.getFile();
    return { text: await file.text(), lastModified: file.lastModified };
  } catch (e) {
    console.error("Arbeitsdatei lesen:", e);
    return null;
  }
}

export async function writeWorkingFileJson(
  json: string,
  handle: FileSystemFileHandle = memoryHandle!,
  options?: { expectedLastModified?: number },
): Promise<WriteWorkingFileResult> {
  if (!handle) return { ok: false, reason: "no_handle" };
  try {
    if (!(await ensureReadWritePermission(handle))) {
      return { ok: false, reason: "permission_denied" };
    }
    const before = await handle.getFile();
    if (
      options?.expectedLastModified !== undefined &&
      before.lastModified !== options.expectedLastModified
    ) {
      return { ok: false, reason: "conflict" };
    }
    const writable = await handle.createWritable({ keepExistingData: false });
    await writable.write(json);
    await writable.close();
    const file = await handle.getFile();
    noteOwnWriteToWorkingFile(json, file.lastModified);
    return { ok: true, lastModified: file.lastModified };
  } catch (e) {
    console.error("Arbeitsdatei schreiben:", e);
    return { ok: false, reason: "io_error" };
  }
}

function loadBoardFromJsonText(text: string): boolean {
  return applyBoardJsonToStore(text);
}

function hydrateFromFileText(fileJson: string, fileLastModified: number): HydrateWorkingFileResult {
  const localJson = boardJsonFromStoreState();

  if (!fileJson.trim()) {
    markWorkingFileSynced(localJson, fileLastModified);
    return { status: "empty" };
  }

  const plan = planFileReconcile(localJson, fileJson);
  if (plan.action === "in_sync" || plan.action === "apply_file") {
    loadBoardFromJsonText(fileJson);
    markWorkingFileSynced(fileJson, fileLastModified);
    return { status: "loaded" };
  }
  if (plan.action === "push_local") {
    markWorkingFileSynced(localJson, fileLastModified);
    return { status: "pushed_local" };
  }
  return { status: "conflict", fileText: fileJson, fileLastModified };
}

async function rememberMobileCopy(json: string, fileName: string, sourceLastModified: number): Promise<void> {
  const trimmedName = fileName.trim() || STANDARD_WORKING_FILENAME;
  mobileWorkingFileName = trimmedName;
  rememberLastFileNameInStorage(trimmedName);
  syncTabContextAndWriter(trimmedName);
  try {
    await idbPutMobileCopy({ fileName: trimmedName, json, sourceLastModified });
  } catch {
    /* ignore */
  }
}

export type HydrateWorkingFileResult =
  | { status: "loaded" | "empty" | "pushed_local" }
  | { status: "conflict"; fileText: string; fileLastModified: number };

export type BrowserFileAttachResult =
  | HydrateWorkingFileResult
  | { status: "read_error"; message: string };

export function normalizeImportedFileText(text: string): string {
  const trimmed = text.trim();
  if (trimmed.charCodeAt(0) === 0xfeff) return trimmed.slice(1);
  return trimmed;
}

export async function readUserPickedFileText(file: File): Promise<string> {
  const text = normalizeImportedFileText(await file.text());
  if (!text && file.size > 0) throw new Error("Dateiinhalt konnte nicht gelesen werden.");
  return text;
}

async function attachWorkingFileFromText(
  text: string,
  fileName: string,
  fileLastModified: number,
): Promise<BrowserFileAttachResult> {
  const previousName =
    memoryHandle?.name?.trim() || mobileWorkingFileName?.trim() || null;
  memoryHandle = null;
  await idbClearHandle(previousName);

  if (text.trim() && !boardImportPayloadFromExportText(text)) {
    return {
      status: "read_error",
      message: 'Die Datei ist keine gültige E2-Arbeitsdatei (Format "event-storming-tool" erwartet).',
    };
  }

  const result = hydrateFromFileText(text, fileLastModified);
  if (result.status === "conflict") return result;

  const syncedJson = getLastSyncedBoardJson() ?? text;
  await rememberMobileCopy(syncedJson, fileName, fileLastModified);
  markWorkingFileSessionHydrated();
  return result;
}

async function rememberHandle(handle: FileSystemFileHandle): Promise<void> {
  memoryHandle = handle;
  // File-System-Handle ist die Quelle der Wahrheit — Mobile-Copy-Name nur als Fallback.
  mobileWorkingFileName = null;
  const fileName = handle.name?.trim() || STANDARD_WORKING_FILENAME;
  rememberLastFileNameInStorage(fileName);
  syncTabContextAndWriter(fileName);
  try {
    await idbPutHandle(handle, fileName);
  } catch {
    /* ignore */
  }
  await rememberRecentWorkingFile(handle);
  try {
    // Clear mobile mirror for this file only (handle is authoritative).
    await idbClearMobileCopy(fileName);
  } catch {
    /* ignore */
  }
  notifyWorkingFileAttached();
}

export async function attachWorkingFileOpen(): Promise<FileSystemFileHandle | null> {
  if (!isWorkingFileSupported() || !window.showOpenFilePicker) return null;
  try {
    const [handle] = await window.showOpenFilePicker({ multiple: false, types: JSON_PICKER_TYPES });
    await rememberHandle(handle);
    return handle;
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return null;
    throw e;
  }
}

/** Ensure a picker-friendly `.storm.json` file name. */
export function suggestedWorkingFileName(
  titleOrLabel: string | null | undefined,
  fallback: string = STANDARD_WORKING_FILENAME,
): string {
  const raw = titleOrLabel?.trim();
  if (!raw) return fallback;
  if (/\.storm\.json$/i.test(raw)) return raw;
  if (/\.json$/i.test(raw)) return raw.replace(/\.json$/i, ".storm.json");
  const slug = raw
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return `${slug || "board"}.storm.json`;
}

export async function attachWorkingFileCreate(
  suggestedName: string = STANDARD_WORKING_FILENAME,
): Promise<FileSystemFileHandle | null> {
  if (!isWorkingFileSupported() || !window.showSaveFilePicker) return null;
  try {
    const handle = await window.showSaveFilePicker({
      suggestedName: suggestedWorkingFileName(suggestedName),
      types: JSON_PICKER_TYPES,
    });
    await rememberHandle(handle);
    return handle;
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return null;
    throw e;
  }
}

export async function hydrateStoreFromWorkingFile(handle: FileSystemFileHandle): Promise<HydrateWorkingFileResult> {
  const snap = await readWorkingFileSnapshot(handle);
  if (!snap) return { status: "empty" };

  const result = hydrateFromFileText(snap.text, snap.lastModified);
  if (result.status !== "conflict") {
    markWorkingFileSessionHydrated();
    const syncedJson = getLastSyncedBoardJson() ?? snap.text;
    const fileName = handle.name?.trim() || STANDARD_WORKING_FILENAME;
    await rememberMobileCopy(syncedJson, fileName, snap.lastModified);
  }
  return result;
}

/**
 * Always apply the working-file contents to the editor (no conflict UI).
 * Used when the user explicitly chooses to restore from disk / stash mirror.
 */
export async function forceHydrateFromWorkingFile(
  handle: FileSystemFileHandle,
): Promise<"loaded" | "empty" | "error"> {
  try {
    const snap = await readWorkingFileSnapshot(handle);
    if (!snap) return "empty";
    if (!snap.text.trim()) {
      markWorkingFileSynced(boardJsonFromStoreState(), snap.lastModified);
      markWorkingFileSessionHydrated();
      return "empty";
    }
    if (!loadBoardFromJsonText(snap.text)) return "error";
    markWorkingFileSynced(snap.text, snap.lastModified);
    markWorkingFileSessionHydrated();
    const fileName = handle.name?.trim() || STANDARD_WORKING_FILENAME;
    await rememberMobileCopy(snap.text, fileName, snap.lastModified);
    return "loaded";
  } catch (e) {
    console.error("Arbeitsdatei force-hydrate:", e);
    return "error";
  }
}

/**
 * Apply arbitrary board JSON to the store and mark the working file as needing
 * a persist (caller should `persistWorkingFileJson` afterwards).
 */
export function forceApplyBoardJson(json: string): boolean {
  if (!json.trim()) return false;
  if (!loadBoardFromJsonText(json)) return false;
  // Leave sync marker stale so autosave / explicit persist writes the restored stand.
  lastSyncedBoardJson = null;
  markWorkingFileSessionHydrated();
  return true;
}

export async function attachWorkingFileFromBrowserFile(
  file: File,
  preReadText?: string,
): Promise<BrowserFileAttachResult> {
  try {
    const text = preReadText ?? (await readUserPickedFileText(file));
    const fileName = file.name?.trim() || STANDARD_WORKING_FILENAME;
    return await attachWorkingFileFromText(text, fileName, file.lastModified);
  } catch (e) {
    console.error("Arbeitsdatei aus Datei-Dialog:", e);
    return { status: "read_error", message: e instanceof Error ? e.message : "Datei konnte nicht gelesen werden." };
  }
}

export async function attachWorkingFileFromPastedText(
  rawText: string,
  fileName: string = STANDARD_WORKING_FILENAME,
): Promise<BrowserFileAttachResult> {
  try {
    return await attachWorkingFileFromText(normalizeImportedFileText(rawText), fileName, Date.now());
  } catch (e) {
    return { status: "read_error", message: e instanceof Error ? e.message : "Import fehlgeschlagen." };
  }
}

/** Resolve paste/import conflict after attachWorkingFileFrom* returned `conflict`. */
export async function resolveWorkingFileImportConflict(
  choice: "keep_local" | "load_file",
  fileText: string,
  fileLastModified: number,
  fileName: string = STANDARD_WORKING_FILENAME,
): Promise<void> {
  if (choice === "load_file") {
    if (fileText.trim()) loadBoardFromJsonText(fileText);
    markWorkingFileSynced(fileText, fileLastModified);
    await rememberMobileCopy(fileText, fileName, fileLastModified);
  } else {
    const localJson = boardJsonFromStoreState();
    markWorkingFileSynced(localJson, fileLastModified);
    await rememberMobileCopy(localJson, fileName, fileLastModified);
  }
  markWorkingFileSessionHydrated();
}

export async function persistWorkingFileJson(json: string): Promise<WriteWorkingFileResult> {
  // Multi-tab: only the visible writer tab may push the shared file / mirror.
  if (!isWorkingFileWriterLeader()) return { ok: false, reason: "not_writer" };
  if (memoryHandle) return writeWorkingFileJson(json);
  if (!mobileWorkingFileName) return { ok: false, reason: "no_handle" };
  try {
    const sourceLastModified = lastKnownFileModified || Date.now();
    await rememberMobileCopy(json, mobileWorkingFileName, sourceLastModified);
    noteOwnWriteToWorkingFile(json, sourceLastModified);
    return { ok: true, lastModified: sourceLastModified };
  } catch {
    return { ok: false, reason: "io_error" };
  }
}

export async function createAndAttachWorkingFile(
  initialJson: string,
  suggestedName: string = STANDARD_WORKING_FILENAME,
): Promise<FileSystemFileHandle | null> {
  const handle = await attachWorkingFileCreate(suggestedName);
  if (!handle) return null;
  const result = await writeWorkingFileJson(initialJson, handle);
  if (!result.ok) {
    await detachWorkingFile();
    return null;
  }
  markWorkingFileSessionHydrated();
  // After write: sync state is clean — refresh listeners (dirty/label).
  notifyWorkingFileAttached();
  return handle;
}

/**
 * Speichern unter… — current board JSON to a newly picked path; that file becomes the
 * Arbeitsdatei (auto-sync target for subsequent Speichern / Hintergrund-Sync).
 */
export async function saveWorkingFileAs(
  json: string,
  suggestedName?: string | null,
): Promise<FileSystemFileHandle | null> {
  if (!isWorkingFileSupported() || typeof window.showSaveFilePicker !== "function") {
    return null;
  }
  const name =
    suggestedName?.trim() ||
    getWorkingFileLabel() ||
    STANDARD_WORKING_FILENAME;
  return createAndAttachWorkingFile(json, name);
}

/** Fired when a file handle becomes the live Arbeitsdatei / sync target. */
export const WORKING_FILE_ATTACHED_EVENT = "e2-working-file-attached";

export function notifyWorkingFileAttached(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(WORKING_FILE_ATTACHED_EVENT));
}

export async function restoreWorkingFileFromDisk(
  preferredFileName?: string | null,
): Promise<FileSystemFileHandle | null> {
  const preferred =
    preferredFileName?.trim() || resolvePreferredWorkingFileName();

  const persisted = await idbGetMobileCopy(preferred);
  if (persisted?.fileName?.trim()) {
    // Honor URL/session preference: do not restore a different file's mirror.
    if (
      !preferred ||
      normalizeWorkingFilename(persisted.fileName) === normalizeWorkingFilename(preferred)
    ) {
      mobileWorkingFileName = persisted.fileName.trim();
      rememberLastFileNameInStorage(mobileWorkingFileName);
      syncTabContextAndWriter(mobileWorkingFileName);
      if (persisted.json?.trim()) {
        lastSyncedBoardJson = persisted.json;
        lastKnownFileModified = persisted.sourceLastModified;
      }
    }
  }

  if (!isWorkingFileSupported()) {
    if (mobileWorkingFileName) syncTabContextAndWriter(mobileWorkingFileName);
    return null;
  }

  const handle = await idbGetHandle(preferred);
  if (!handle) {
    if (mobileWorkingFileName) syncTabContextAndWriter(mobileWorkingFileName);
    return null;
  }

  const handleName = handle.name?.trim() || STANDARD_WORKING_FILENAME;
  if (
    preferred &&
    normalizeWorkingFilename(handleName) !== normalizeWorkingFilename(preferred)
  ) {
    // Preferred name has no matching handle; keep mobile mirror if any.
    if (mobileWorkingFileName) syncTabContextAndWriter(mobileWorkingFileName);
    return null;
  }

  try {
    let granted = (await handle.queryPermission({ mode: "readwrite" })) === "granted";
    if (!granted) granted = (await handle.requestPermission({ mode: "readwrite" })) === "granted";
    if (granted) {
      memoryHandle = handle;
      rememberLastFileNameInStorage(handleName);
      syncTabContextAndWriter(handleName);
      return handle;
    }
  } catch {
    /* ignore */
  }

  if (handleName) {
    mobileWorkingFileName = handleName;
    rememberLastFileNameInStorage(handleName);
    syncTabContextAndWriter(handleName);
  }
  memoryHandle = null;
  return null;
}

export async function detachWorkingFile(): Promise<void> {
  const name =
    memoryHandle?.name?.trim() ||
    mobileWorkingFileName?.trim() ||
    getRememberedWorkingFileName();
  memoryHandle = null;
  mobileWorkingFileName = null;
  clearWorkingFileSyncState();
  clearWorkingFileSessionHydrated();
  clearRememberedFileNameInStorage();
  syncTabContextAndWriter(null);
  try {
    await idbClearHandle(name);
    await idbClearMobileCopy(name);
  } catch {
    /* ignore */
  }
}

export function workingFileDisplayName(handle: FileSystemFileHandle | null): string | null {
  if (!handle) return null;
  return handle.name?.trim() || "Arbeitsdatei";
}

export async function attachWorkingFileFromPicker(): Promise<{
  handle: FileSystemFileHandle;
  hydrate: HydrateWorkingFileResult;
} | null> {
  const handle = await attachWorkingFileOpen();
  if (!handle) return null;
  return { handle, hydrate: await hydrateStoreFromWorkingFile(handle) };
}
