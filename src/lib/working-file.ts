/**
 * Arbeitsdatei (File System Access API): einziges Speichermedium.
 */

import {
  applyBoardJsonToStore,
  boardJsonFromStoreState,
  boardStatesEquivalent,
  planFileReconcile,
} from "@/lib/file-board-reconcile";
import { boardImportPayloadFromExportText } from "@/lib/storm-json";

export const STANDARD_WORKING_FILENAME = "board.storm.json";

const IDB_NAME = "e2-working-file";
const IDB_VERSION = 1;
const IDB_STORE = "handles";
const IDB_KEY = "board-json";
const IDB_MOBILE_COPY_KEY = "mobile-working-copy";
const LS_LAST_FILE_NAME = "e2-last-working-file-name";

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

export type WriteWorkingFileResult =
  | { ok: true; lastModified: number }
  | { ok: false; reason: "no_handle" | "permission_denied" | "conflict" | "io_error" };

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

async function idbPutHandle(handle: FileSystemFileHandle): Promise<void> {
  const db = await openIdb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("tx"));
      tx.objectStore(IDB_STORE).put(handle, IDB_KEY);
    });
  } finally {
    db.close();
  }
}

async function idbGetHandle(): Promise<FileSystemFileHandle | null> {
  try {
    const db = await openIdb();
    try {
      return await new Promise<FileSystemFileHandle | null>((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, "readonly");
        tx.onerror = () => reject(tx.error ?? new Error("tx"));
        const r = tx.objectStore(IDB_STORE).get(IDB_KEY);
        r.onsuccess = () => resolve((r.result as FileSystemFileHandle | undefined) ?? null);
      });
    } finally {
      db.close();
    }
  } catch {
    return null;
  }
}

async function idbClearHandle(): Promise<void> {
  try {
    const db = await openIdb();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, "readwrite");
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error("tx"));
        tx.objectStore(IDB_STORE).delete(IDB_KEY);
      });
    } finally {
      db.close();
    }
  } catch {
    /* ignore */
  }
}

async function idbPutMobileCopy(record: MobileWorkingCopyRecord): Promise<void> {
  const db = await openIdb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("tx"));
      tx.objectStore(IDB_STORE).put(record, IDB_MOBILE_COPY_KEY);
    });
  } finally {
    db.close();
  }
}

async function idbGetMobileCopy(): Promise<MobileWorkingCopyRecord | null> {
  try {
    const db = await openIdb();
    try {
      return await new Promise<MobileWorkingCopyRecord | null>((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, "readonly");
        tx.onerror = () => reject(tx.error ?? new Error("tx"));
        const r = tx.objectStore(IDB_STORE).get(IDB_MOBILE_COPY_KEY);
        r.onsuccess = () => resolve((r.result as MobileWorkingCopyRecord | undefined) ?? null);
      });
    } finally {
      db.close();
    }
  } catch {
    return null;
  }
}

async function idbClearMobileCopy(): Promise<void> {
  try {
    const db = await openIdb();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, "readwrite");
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error("tx"));
        tx.objectStore(IDB_STORE).delete(IDB_MOBILE_COPY_KEY);
      });
    } finally {
      db.close();
    }
  } catch {
    /* ignore */
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
  memoryHandle = null;
  await idbClearHandle();

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
  const fileName = handle.name?.trim() || STANDARD_WORKING_FILENAME;
  rememberLastFileNameInStorage(fileName);
  try {
    await idbPutHandle(handle);
  } catch {
    /* ignore */
  }
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

export async function attachWorkingFileCreate(): Promise<FileSystemFileHandle | null> {
  if (!isWorkingFileSupported() || !window.showSaveFilePicker) return null;
  try {
    const handle = await window.showSaveFilePicker({
      suggestedName: STANDARD_WORKING_FILENAME,
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

export async function createAndAttachWorkingFile(initialJson: string): Promise<FileSystemFileHandle | null> {
  const handle = await attachWorkingFileCreate();
  if (!handle) return null;
  const result = await writeWorkingFileJson(initialJson, handle);
  if (!result.ok) {
    await detachWorkingFile();
    return null;
  }
  markWorkingFileSessionHydrated();
  return handle;
}

export async function restoreWorkingFileFromDisk(): Promise<FileSystemFileHandle | null> {
  const persisted = await idbGetMobileCopy();
  if (persisted?.fileName?.trim()) {
    mobileWorkingFileName = persisted.fileName.trim();
    rememberLastFileNameInStorage(mobileWorkingFileName);
    if (persisted.json?.trim()) {
      lastSyncedBoardJson = persisted.json;
      lastKnownFileModified = persisted.sourceLastModified;
    }
  }

  if (!isWorkingFileSupported()) return null;

  const handle = await idbGetHandle();
  if (!handle) return null;

  try {
    let granted = (await handle.queryPermission({ mode: "readwrite" })) === "granted";
    if (!granted) granted = (await handle.requestPermission({ mode: "readwrite" })) === "granted";
    if (granted) {
      memoryHandle = handle;
      rememberLastFileNameInStorage(handle.name?.trim() || mobileWorkingFileName || STANDARD_WORKING_FILENAME);
      return handle;
    }
  } catch {
    /* ignore */
  }

  const nameFromHandle = handle.name?.trim();
  if (nameFromHandle) {
    mobileWorkingFileName = nameFromHandle;
    rememberLastFileNameInStorage(nameFromHandle);
  }
  memoryHandle = null;
  return null;
}

export async function detachWorkingFile(): Promise<void> {
  memoryHandle = null;
  mobileWorkingFileName = null;
  clearWorkingFileSyncState();
  clearWorkingFileSessionHydrated();
  clearRememberedFileNameInStorage();
  try {
    await idbClearHandle();
    await idbClearMobileCopy();
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
