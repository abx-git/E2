/**
 * Per-tab working-file intent: URL `?filename=` + `?wf=` + sessionStorage.
 * `filename` is the display/bookmark name; `wf` is the unique slot id so two
 * tabs with the same basename (e.g. board.storm.json) do not share IDB/locks.
 */

export const WORKING_FILE_URL_PARAM = "filename";
export const WORKING_FILE_ID_URL_PARAM = "wf";

const SS_TAB_SESSION_ID = "e2.working-file.tab-session-id";
const SS_ACTIVE_CONTEXT = "e2.working-file.tab-context";
const LS_LAST_FILE_NAME = "e2-last-working-file-name";

export interface TabWorkingFileContext {
  filename: string | null;
  /** Unique working-file slot id (IndexedDB / Web Lock key). */
  wf: string | null;
  attachedAt: number | null;
}

/** Normalize for display comparison (case-insensitive basename). */
export function normalizeWorkingFilename(fileName: string): string {
  const trimmed = fileName.trim();
  if (!trimmed) return "";
  const base = trimmed.split(/[/\\]/).pop() ?? trimmed;
  return base.trim().toLowerCase();
}

export function createWorkingFileId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `wf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getOrCreateTabSessionId(): string {
  if (typeof sessionStorage === "undefined") return "ssr";
  try {
    const existing = sessionStorage.getItem(SS_TAB_SESSION_ID)?.trim();
    if (existing) return existing;
    const id = createWorkingFileId();
    sessionStorage.setItem(SS_TAB_SESSION_ID, id);
    return id;
  } catch {
    return `tab-${Date.now()}`;
  }
}

export function readFilenameFromUrl(search?: string): string | null {
  if (typeof window === "undefined" && search === undefined) return null;
  try {
    const raw =
      search ??
      (typeof window !== "undefined" ? window.location.search : "");
    const value = new URLSearchParams(raw).get(WORKING_FILE_URL_PARAM)?.trim();
    return value || null;
  } catch {
    return null;
  }
}

export function readWorkingFileIdFromUrl(search?: string): string | null {
  if (typeof window === "undefined" && search === undefined) return null;
  try {
    const raw =
      search ??
      (typeof window !== "undefined" ? window.location.search : "");
    const value = new URLSearchParams(raw).get(WORKING_FILE_ID_URL_PARAM)?.trim();
    return value || null;
  } catch {
    return null;
  }
}

/**
 * Update `?filename=` / `?wf=` without navigation; preserves other params (e.g. room).
 * Compares param values (not full href) so encoding / basePath differences cannot skip updates.
 */
export function syncWorkingFileParamsInUrl(fileName: string | null, wf: string | null): void {
  if (typeof window === "undefined") return;
  try {
    const nextName = fileName?.trim() || "";
    const nextWf = wf?.trim() || "";
    const loc = new URLSearchParams(window.location.search);
    const prevName = loc.get(WORKING_FILE_URL_PARAM)?.trim() || "";
    const prevWf = loc.get(WORKING_FILE_ID_URL_PARAM)?.trim() || "";
    if (prevName === nextName && prevWf === nextWf) return;

    const url = new URL(window.location.href);
    if (nextName) url.searchParams.set(WORKING_FILE_URL_PARAM, nextName);
    else url.searchParams.delete(WORKING_FILE_URL_PARAM);
    if (nextWf) url.searchParams.set(WORKING_FILE_ID_URL_PARAM, nextWf);
    else url.searchParams.delete(WORKING_FILE_ID_URL_PARAM);

    // Relative URL is more reliable with Next basePath than absolute href strings.
    const next = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState(window.history.state ?? {}, "", next);
  } catch {
    /* ignore */
  }
}

/** @deprecated use syncWorkingFileParamsInUrl — kept for tests / call sites that only set name */
export function syncFilenameInUrl(fileName: string | null): void {
  const wf = fileName?.trim() ? getTabWorkingFileContext().wf ?? readWorkingFileIdFromUrl() : null;
  syncWorkingFileParamsInUrl(fileName, fileName?.trim() ? wf : null);
}

export function getTabWorkingFileContext(): TabWorkingFileContext {
  if (typeof sessionStorage === "undefined") {
    return { filename: null, wf: null, attachedAt: null };
  }
  try {
    const raw = sessionStorage.getItem(SS_ACTIVE_CONTEXT);
    if (!raw) return { filename: null, wf: null, attachedAt: null };
    const parsed = JSON.parse(raw) as Partial<TabWorkingFileContext>;
    const filename =
      typeof parsed.filename === "string" && parsed.filename.trim()
        ? parsed.filename.trim()
        : null;
    const wf =
      typeof parsed.wf === "string" && parsed.wf.trim() ? parsed.wf.trim() : null;
    const attachedAt =
      typeof parsed.attachedAt === "number" && Number.isFinite(parsed.attachedAt)
        ? parsed.attachedAt
        : null;
    return { filename, wf, attachedAt };
  } catch {
    return { filename: null, wf: null, attachedAt: null };
  }
}

export function setTabWorkingFileContext(fileName: string | null, wf: string | null = null): void {
  getOrCreateTabSessionId();
  if (typeof sessionStorage === "undefined") return;
  try {
    const trimmed = fileName?.trim() || null;
    const trimmedWf = wf?.trim() || null;
    if (!trimmed && !trimmedWf) {
      sessionStorage.removeItem(SS_ACTIVE_CONTEXT);
      return;
    }
    const record: TabWorkingFileContext = {
      filename: trimmed,
      wf: trimmedWf,
      attachedAt: Date.now(),
    };
    sessionStorage.setItem(SS_ACTIVE_CONTEXT, JSON.stringify(record));
  } catch {
    /* ignore */
  }
}

/**
 * Preferred working-file **display name** for this tab:
 * 1) sessionStorage (authoritative after attach / switch in this tab)
 * 2) URL `?filename=` (bookmark / cold start)
 * 3) localStorage last-used
 */
export function resolvePreferredWorkingFileName(): string | null {
  const fromSession = getTabWorkingFileContext().filename;
  if (fromSession) return fromSession;

  const fromUrl = readFilenameFromUrl();
  if (fromUrl) return fromUrl;

  if (typeof localStorage === "undefined") return null;
  try {
    const last = localStorage.getItem(LS_LAST_FILE_NAME)?.trim();
    return last || null;
  } catch {
    return null;
  }
}

/**
 * Preferred working-file **slot id**:
 * 1) sessionStorage
 * 2) URL `?wf=`
 */
export function resolvePreferredWorkingFileId(): string | null {
  const fromSession = getTabWorkingFileContext().wf;
  if (fromSession) return fromSession;
  return readWorkingFileIdFromUrl();
}

/** Remember active file for this tab and reflect it in the URL (bookmarkable). */
export function bindTabWorkingFileName(fileName: string | null, wf: string | null = null): void {
  const trimmed = fileName?.trim() || null;
  const trimmedWf = wf?.trim() || null;
  setTabWorkingFileContext(trimmed, trimmedWf);
  syncWorkingFileParamsInUrl(trimmed, trimmedWf);
}
