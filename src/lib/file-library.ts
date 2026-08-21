/**
 * User-owned file library (`e2-library.json`) in a chosen folder.
 * Lists boards and backups with relative path + document title so the storage
 * panel can show a readable overview. Load/save of individual Arbeitsdateien
 * stays independent (File System Access pickers).
 */

export const FILE_LIBRARY_KIND = "e2-file-library";
export const FILE_LIBRARY_VERSION = 1;
export const STANDARD_LIBRARY_FILENAME = "e2-library.json";
export const FILE_LIBRARY_BACKUP_DIR = "backups";

export const FILE_LIBRARY_CHANGED_EVENT = "e2-file-library-changed";

export type FileLibraryEntryKind = "board" | "backup";

export interface FileLibraryEntry {
  id: string;
  title: string;
  /** POSIX path relative to the library folder, or basename when outside it. */
  path: string;
  kind: FileLibraryEntryKind;
  updatedAt: number;
}

export interface FileLibraryDocument {
  kind: typeof FILE_LIBRARY_KIND;
  version: number;
  files: FileLibraryEntry[];
}

const IDB_NAME = "e2-file-library";
const IDB_VERSION = 1;
const IDB_STORE = "handles";
const IDB_DIR_KEY = "directory";
const IDB_FILE_KEY = "library-file";
const IDB_EXTRA_KEY = "extra-handles";

let memoryDir: FileSystemDirectoryHandle | null = null;
let memoryFile: FileSystemFileHandle | null = null;
let memoryDoc: FileLibraryDocument | null = null;
const extraHandles = new Map<string, FileSystemFileHandle>();
let cachedRelativePath: { handle: FileSystemFileHandle; path: string } | null = null;

export function createEmptyFileLibrary(): FileLibraryDocument {
  return { kind: FILE_LIBRARY_KIND, version: FILE_LIBRARY_VERSION, files: [] };
}

export function createFileLibraryEntryId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `lib-${crypto.randomUUID()}`;
  }
  return `lib-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeLibraryRelativePath(path: string): string {
  return path
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\.\/+/, "")
    .replace(/\/{2,}/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

export function libraryBackupRelativePath(filename: string): string {
  const base = filename.trim().split(/[/\\]/).pop()?.trim() || "backup.storm.json";
  return `${FILE_LIBRARY_BACKUP_DIR}/${base}`;
}

export function replaceLibraryPathBasename(path: string, newName: string): string {
  const normalized = normalizeLibraryRelativePath(path);
  const next = newName.trim().split(/[/\\]/).pop()?.trim() || newName.trim();
  if (!normalized) return next;
  const parts = normalized.split("/");
  parts[parts.length - 1] = next;
  return parts.join("/");
}

export function titleFromBoardJson(json: string, fallback = ""): string {
  try {
    const parsed = JSON.parse(json) as { title?: unknown };
    if (typeof parsed?.title === "string" && parsed.title.trim()) return parsed.title.trim();
  } catch {
    /* ignore */
  }
  return fallback;
}

function looksLikeBoardJson(json: string): boolean {
  try {
    const parsed = JSON.parse(json) as { format?: unknown; title?: unknown };
    if (parsed?.format === "event-storming-tool") return true;
    if (parsed?.format === "event-storming-tool-ai-context") return true;
    return typeof parsed?.title === "string" && parsed.title.trim().length > 0;
  } catch {
    return false;
  }
}

export function parseFileLibraryJson(text: string): FileLibraryDocument | null {
  try {
    const parsed = JSON.parse(text) as Partial<FileLibraryDocument> & { files?: unknown };
    if (parsed?.kind !== FILE_LIBRARY_KIND) return null;
    if (!Array.isArray(parsed.files)) return null;
    const files: FileLibraryEntry[] = [];
    for (const raw of parsed.files) {
      const entry = normalizeLibraryEntry(raw);
      if (entry) files.push(entry);
    }
    return {
      kind: FILE_LIBRARY_KIND,
      version: typeof parsed.version === "number" ? parsed.version : FILE_LIBRARY_VERSION,
      files,
    };
  } catch {
    return null;
  }
}

function normalizeLibraryEntry(raw: unknown): FileLibraryEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const path = typeof rec.path === "string" ? normalizeLibraryRelativePath(rec.path) : "";
  if (!path) return null;
  const kind: FileLibraryEntryKind = rec.kind === "backup" ? "backup" : "board";
  const title =
    typeof rec.title === "string" && rec.title.trim() ? rec.title.trim() : path.split("/").pop() || path;
  const id =
    typeof rec.id === "string" && rec.id.trim() ? rec.id.trim() : createFileLibraryEntryId();
  const updatedAt =
    typeof rec.updatedAt === "number" && Number.isFinite(rec.updatedAt) ? rec.updatedAt : Date.now();
  return { id, title, path, kind, updatedAt };
}

export function serializeFileLibrary(doc: FileLibraryDocument): string {
  return `${JSON.stringify(
    {
      kind: FILE_LIBRARY_KIND,
      version: FILE_LIBRARY_VERSION,
      files: doc.files.map((f) => ({
        id: f.id,
        title: f.title,
        path: f.path,
        kind: f.kind,
        updatedAt: f.updatedAt,
      })),
    },
    null,
    2,
  )}\n`;
}

export function sortFileLibraryEntries(files: FileLibraryEntry[]): FileLibraryEntry[] {
  return [...files].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "board" ? -1 : 1;
    if (b.updatedAt !== a.updatedAt) return b.updatedAt - a.updatedAt;
    return a.title.localeCompare(b.title, "de");
  });
}

export function upsertFileLibraryEntry(
  doc: FileLibraryDocument,
  incoming: Omit<FileLibraryEntry, "id"> & { id?: string },
): { doc: FileLibraryDocument; entry: FileLibraryEntry; changed: boolean } {
  const path = normalizeLibraryRelativePath(incoming.path);
  const title = incoming.title.trim() || path.split("/").pop() || path;
  const kind = incoming.kind;
  const updatedAt = incoming.updatedAt;
  const existing = doc.files.find((f) => f.path === path && f.kind === kind);
  if (existing) {
    const entry: FileLibraryEntry = {
      ...existing,
      title,
      path,
      kind,
      updatedAt,
    };
    const changed =
      existing.title !== entry.title ||
      existing.path !== entry.path ||
      existing.kind !== entry.kind ||
      existing.updatedAt !== entry.updatedAt;
    if (!changed) return { doc, entry: existing, changed: false };
    return {
      doc: { ...doc, files: doc.files.map((f) => (f.id === existing.id ? entry : f)) },
      entry,
      changed: true,
    };
  }
  const entry: FileLibraryEntry = {
    id: incoming.id?.trim() || createFileLibraryEntryId(),
    title,
    path,
    kind,
    updatedAt,
  };
  return { doc: { ...doc, files: [entry, ...doc.files] }, entry, changed: true };
}

export function renameFileLibraryPath(
  doc: FileLibraryDocument,
  oldPath: string,
  newPath: string,
): FileLibraryDocument {
  const from = normalizeLibraryRelativePath(oldPath);
  const to = normalizeLibraryRelativePath(newPath);
  if (!from || from === to) return doc;
  return {
    ...doc,
    files: doc.files.map((f) => (f.path === from ? { ...f, path: to, updatedAt: Date.now() } : f)),
  };
}

export function isFileLibrarySupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.showDirectoryPicker === "function" &&
    typeof indexedDB !== "undefined"
  );
}

export function isFileLibraryAttached(): boolean {
  return memoryDir !== null && memoryFile !== null;
}

export function getFileLibraryDirectoryHandle(): FileSystemDirectoryHandle | null {
  return memoryDir;
}

export function getFileLibraryFolderName(): string | null {
  return memoryDir?.name?.trim() || null;
}

export function getFileLibraryEntries(): FileLibraryEntry[] {
  if (!memoryDoc) return [];
  return sortFileLibraryEntries(memoryDoc.files);
}

export type FileLibraryPermissionState = "none" | "prompt" | "granted";

export function getFileLibraryPermissionState(): FileLibraryPermissionState {
  if (!memoryDir || !memoryFile) return "none";
  return memoryDoc ? "granted" : "prompt";
}

export function notifyFileLibraryChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(FILE_LIBRARY_CHANGED_EVENT));
}

function openLibraryDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("indexedDB open failed"));
  });
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openLibraryDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const r = tx.objectStore(IDB_STORE).get(key);
      r.onsuccess = () => resolve(r.result as T | undefined);
      r.onerror = () => reject(r.error ?? new Error("indexedDB get failed"));
    });
  } finally {
    db.close();
  }
}

async function idbPut(key: string, value: unknown): Promise<void> {
  const db = await openLibraryDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("indexedDB put failed"));
      tx.objectStore(IDB_STORE).put(value, key);
    });
  } finally {
    db.close();
  }
}

async function idbDelete(key: string): Promise<void> {
  const db = await openLibraryDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("indexedDB delete failed"));
      tx.objectStore(IDB_STORE).delete(key);
    });
  } finally {
    db.close();
  }
}

async function persistExtraHandles(): Promise<void> {
  const rows = Array.from(extraHandles.entries()).map(([id, handle]) => ({ id, handle }));
  await idbPut(IDB_EXTRA_KEY, rows);
}

async function loadExtraHandles(): Promise<void> {
  extraHandles.clear();
  try {
    const rows = await idbGet<Array<{ id: string; handle: FileSystemFileHandle }>>(IDB_EXTRA_KEY);
    if (!Array.isArray(rows)) return;
    for (const row of rows) {
      if (row?.id && row.handle) extraHandles.set(row.id, row.handle);
    }
  } catch {
    /* ignore */
  }
}

async function ensureHandlePermission(
  handle: FileSystemHandle,
  mode: "read" | "readwrite" = "readwrite",
): Promise<boolean> {
  try {
    const query = handle.queryPermission?.bind(handle);
    const request = handle.requestPermission?.bind(handle);
    let ok = query ? (await query({ mode })) === "granted" : true;
    if (!ok && request) ok = (await request({ mode })) === "granted";
    return ok;
  } catch {
    return false;
  }
}

async function writeLibraryDocument(doc: FileLibraryDocument): Promise<boolean> {
  if (!memoryFile) return false;
  try {
    if (!(await ensureHandlePermission(memoryFile))) return false;
    const writable = await memoryFile.createWritable({ keepExistingData: false });
    await writable.write(serializeFileLibrary(doc));
    await writable.close();
    memoryDoc = doc;
    notifyFileLibraryChanged();
    return true;
  } catch (e) {
    console.error("File library write:", e);
    return false;
  }
}

async function readLibraryDocumentFromFile(): Promise<FileLibraryDocument | null> {
  if (!memoryFile) return null;
  try {
    const file = await memoryFile.getFile();
    const text = await file.text();
    if (!text.trim()) return createEmptyFileLibrary();
    return parseFileLibraryJson(text) ?? createEmptyFileLibrary();
  } catch (e) {
    console.error("File library read:", e);
    return null;
  }
}

async function relativePathForHandle(handle: FileSystemFileHandle): Promise<string> {
  if (cachedRelativePath && (await handlesAreSame(cachedRelativePath.handle, handle))) {
    return cachedRelativePath.path;
  }
  if (memoryDir && typeof memoryDir.resolve === "function") {
    try {
      const parts = await memoryDir.resolve(handle);
      if (parts && parts.length > 0) {
        const path = normalizeLibraryRelativePath(parts.join("/"));
        cachedRelativePath = { handle, path };
        return path;
      }
    } catch {
      /* not inside folder */
    }
  }
  const path = handle.name?.trim() || "board.storm.json";
  cachedRelativePath = { handle, path };
  return path;
}

async function handlesAreSame(a: FileSystemHandle, b: FileSystemHandle): Promise<boolean> {
  try {
    if (typeof a.isSameEntry === "function") return await a.isSameEntry(b);
  } catch {
    /* ignore */
  }
  return false;
}

async function getOrCreateDoc(): Promise<FileLibraryDocument | null> {
  if (memoryDoc) return memoryDoc;
  const doc = await readLibraryDocumentFromFile();
  if (doc) memoryDoc = doc;
  return doc;
}

export async function writeLibraryRelativeFile(
  relativePath: string,
  contents: string,
): Promise<FileSystemFileHandle | null> {
  if (!memoryDir) return null;
  const parts = normalizeLibraryRelativePath(relativePath).split("/").filter(Boolean);
  if (parts.length === 0) return null;
  try {
    if (!(await ensureHandlePermission(memoryDir))) return null;
    let dir = memoryDir;
    for (let i = 0; i < parts.length - 1; i++) {
      dir = await dir.getDirectoryHandle(parts[i], { create: true });
    }
    const file = await dir.getFileHandle(parts[parts.length - 1], { create: true });
    if (!(await ensureHandlePermission(file))) return null;
    const writable = await file.createWritable({ keepExistingData: false });
    await writable.write(contents);
    await writable.close();
    return file;
  } catch (e) {
    console.error("File library relative write:", e);
    return null;
  }
}

export async function resolveLibraryFileHandle(
  relativePath: string,
): Promise<FileSystemFileHandle | null> {
  const path = normalizeLibraryRelativePath(relativePath);
  if (!path) return null;
  const fromDoc = memoryDoc?.files.find((f) => f.path === path);
  if (fromDoc) {
    const extra = extraHandles.get(fromDoc.id);
    if (extra) {
      try {
        if (await ensureHandlePermission(extra)) return extra;
      } catch {
        /* fall through */
      }
    }
  }
  if (!memoryDir) return null;
  const parts = path.split("/").filter(Boolean);
  try {
    if (!(await ensureHandlePermission(memoryDir))) return null;
    let dir = memoryDir;
    for (let i = 0; i < parts.length - 1; i++) {
      dir = await dir.getDirectoryHandle(parts[i]);
    }
    const file = await dir.getFileHandle(parts[parts.length - 1]);
    if (!(await ensureHandlePermission(file))) return null;
    return file;
  } catch {
    return null;
  }
}

export async function rememberFileInLibrary(
  handle: FileSystemFileHandle,
  options?: { title?: string; kind?: FileLibraryEntryKind; json?: string },
): Promise<FileLibraryEntry | null> {
  if (!isFileLibraryAttached()) return null;
  const doc = await getOrCreateDoc();
  if (!doc) return null;
  const path = await relativePathForHandle(handle);
  if (path === STANDARD_LIBRARY_FILENAME) return null;
  const title =
    options?.title?.trim() ||
    (options?.json ? titleFromBoardJson(options.json) : "") ||
    path.split("/").pop() ||
    handle.name;
  const kind: FileLibraryEntryKind =
    options?.kind ?? (path.startsWith(`${FILE_LIBRARY_BACKUP_DIR}/`) ? "backup" : "board");
  const now = Date.now();
  const existing = doc.files.find((f) => f.path === path && f.kind === kind);
  const { doc: next, entry, changed } = upsertFileLibraryEntry(doc, {
    id: existing?.id,
    title,
    path,
    kind,
    updatedAt: now,
  });
  extraHandles.set(entry.id, handle);
  void persistExtraHandles();
  if (changed) await writeLibraryDocument(next);
  else memoryDoc = next;
  return entry;
}

export async function rememberLibraryTitleIfChanged(
  handle: FileSystemFileHandle,
  json: string,
): Promise<void> {
  if (!isFileLibraryAttached()) return;
  const title = titleFromBoardJson(json);
  if (!title) return;
  const doc = memoryDoc;
  if (doc) {
    const path = await relativePathForHandle(handle);
    const existing = doc.files.find((f) => f.path === path && f.kind === "board");
    if (existing && existing.title === title) return;
  }
  await rememberFileInLibrary(handle, { title, kind: "board", json });
}

export async function rememberRenamedFileInLibrary(
  handle: FileSystemFileHandle,
  oldName: string,
): Promise<void> {
  if (!isFileLibraryAttached()) return;
  const doc = await getOrCreateDoc();
  if (!doc) return;
  const newPath = await relativePathForHandle(handle);
  const oldBase = oldName.trim().split(/[/\\]/).pop()?.trim() || oldName;
  const guessedOld = replaceLibraryPathBasename(newPath, oldBase);
  const renamed = renameFileLibraryPath(doc, guessedOld, newPath);
  memoryDoc = renamed;
  await rememberFileInLibrary(handle, { kind: "board" });
}

async function discoverFolderEntries(
  dir: FileSystemDirectoryHandle,
  prefix: string,
  kind: FileLibraryEntryKind,
): Promise<FileLibraryEntry[]> {
  const found: FileLibraryEntry[] = [];
  try {
    for await (const entry of dir.values()) {
      if (entry.kind === "file") {
        const name = entry.name?.trim() || "";
        if (!name || name === STANDARD_LIBRARY_FILENAME) continue;
        if (!/\.json$/i.test(name)) continue;
        const fileHandle = entry as FileSystemFileHandle;
        try {
          const file = await fileHandle.getFile();
          const text = await file.text();
          if (!looksLikeBoardJson(text)) continue;
          const path = normalizeLibraryRelativePath(prefix ? `${prefix}/${name}` : name);
          found.push({
            id: createFileLibraryEntryId(),
            title: titleFromBoardJson(text, name),
            path,
            kind,
            updatedAt: file.lastModified || Date.now(),
          });
          extraHandles.set(found[found.length - 1].id, fileHandle);
        } catch {
          /* skip unreadable */
        }
      } else if (entry.kind === "directory" && !prefix && entry.name === FILE_LIBRARY_BACKUP_DIR) {
        const nested = await discoverFolderEntries(
          entry as FileSystemDirectoryHandle,
          FILE_LIBRARY_BACKUP_DIR,
          "backup",
        );
        found.push(...nested);
      }
    }
  } catch (e) {
    console.error("File library scan:", e);
  }
  return found;
}

function mergeDiscovered(
  doc: FileLibraryDocument,
  discovered: FileLibraryEntry[],
): { doc: FileLibraryDocument; changed: boolean } {
  let next = doc;
  let changed = false;
  const known = new Set(next.files.map((f) => `${f.kind}:${f.path}`));
  for (const entry of discovered) {
    const key = `${entry.kind}:${entry.path}`;
    if (known.has(key)) continue;
    next = { ...next, files: [...next.files, entry] };
    known.add(key);
    changed = true;
  }
  return { doc: next, changed };
}

async function activateLibrary(
  dir: FileSystemDirectoryHandle,
  file: FileSystemFileHandle,
  options?: { scan?: boolean },
): Promise<boolean> {
  memoryDir = dir;
  memoryFile = file;
  cachedRelativePath = null;
  extraHandles.clear();
  await loadExtraHandles();
  let doc = (await readLibraryDocumentFromFile()) ?? createEmptyFileLibrary();
  if (options?.scan !== false) {
    const discovered = await discoverFolderEntries(dir, "", "board");
    const merged = mergeDiscovered(doc, discovered);
    doc = merged.doc;
    if (merged.changed || !(await file.getFile()).size) {
      await writeLibraryDocument(doc);
    } else {
      memoryDoc = doc;
      notifyFileLibraryChanged();
    }
  } else {
    memoryDoc = doc;
    notifyFileLibraryChanged();
  }
  try {
    await idbPut(IDB_DIR_KEY, dir);
    await idbPut(IDB_FILE_KEY, file);
    await persistExtraHandles();
  } catch {
    /* ignore */
  }
  return true;
}

/** Pick (or re-pick) the folder that holds `e2-library.json`. Needs a user gesture. */
export async function pickFileLibraryFolder(): Promise<boolean> {
  if (!isFileLibrarySupported() || !window.showDirectoryPicker) return false;
  try {
    const dir = await window.showDirectoryPicker({
      id: "e2-file-library",
      mode: "readwrite",
    });
    if (!(await ensureHandlePermission(dir))) return false;
    const file = await dir.getFileHandle(STANDARD_LIBRARY_FILENAME, { create: true });
    return activateLibrary(dir, file, { scan: true });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return false;
    console.error("File library pick:", e);
    return false;
  }
}

/** Re-request permission after reload (must run from a user gesture). */
export async function grantFileLibraryPermission(): Promise<boolean> {
  if (!memoryDir || !memoryFile) {
    return restoreFileLibraryFromIdb({ requestPermission: true });
  }
  const dirOk = await ensureHandlePermission(memoryDir);
  const fileOk = await ensureHandlePermission(memoryFile);
  if (!dirOk || !fileOk) return false;
  const doc = await readLibraryDocumentFromFile();
  memoryDoc = doc ?? createEmptyFileLibrary();
  notifyFileLibraryChanged();
  return true;
}

export async function restoreFileLibraryFromIdb(options?: {
  requestPermission?: boolean;
}): Promise<boolean> {
  if (!isFileLibrarySupported()) return false;
  try {
    const dir = await idbGet<FileSystemDirectoryHandle>(IDB_DIR_KEY);
    const file = await idbGet<FileSystemFileHandle>(IDB_FILE_KEY);
    if (!dir || !file) return false;
    memoryDir = dir;
    memoryFile = file;
    memoryDoc = null;
    await loadExtraHandles();
    const dirPerm = dir.queryPermission
      ? await dir.queryPermission({ mode: "readwrite" })
      : "granted";
    const filePerm = file.queryPermission
      ? await file.queryPermission({ mode: "readwrite" })
      : "granted";
    const needRequest = dirPerm !== "granted" || filePerm !== "granted";
    if (needRequest) {
      if (!options?.requestPermission) {
        notifyFileLibraryChanged();
        return false;
      }
      if (!(await ensureHandlePermission(dir)) || !(await ensureHandlePermission(file))) {
        notifyFileLibraryChanged();
        return false;
      }
    }
    const doc = await readLibraryDocumentFromFile();
    memoryDoc = doc ?? createEmptyFileLibrary();
    notifyFileLibraryChanged();
    return true;
  } catch (e) {
    console.error("File library restore:", e);
    return false;
  }
}

export async function detachFileLibrary(): Promise<void> {
  memoryDir = null;
  memoryFile = null;
  memoryDoc = null;
  extraHandles.clear();
  cachedRelativePath = null;
  try {
    await idbDelete(IDB_DIR_KEY);
    await idbDelete(IDB_FILE_KEY);
    await idbDelete(IDB_EXTRA_KEY);
  } catch {
    /* ignore */
  }
  notifyFileLibraryChanged();
}

/** @internal test helper */
export function resetFileLibraryMemory(): void {
  memoryDir = null;
  memoryFile = null;
  memoryDoc = null;
  extraHandles.clear();
  cachedRelativePath = null;
}
