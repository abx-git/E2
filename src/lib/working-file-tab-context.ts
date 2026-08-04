/**
 * Per-tab working-file intent: URL `?filename=` + sessionStorage.
 * Keeps multi-tab bookmarks from sharing a single "active file" slot via localStorage alone.
 */

export const WORKING_FILE_URL_PARAM = "filename";

const SS_TAB_SESSION_ID = "e2.working-file.tab-session-id";
const SS_ACTIVE_CONTEXT = "e2.working-file.tab-context";
const LS_LAST_FILE_NAME = "e2-last-working-file-name";

export interface TabWorkingFileContext {
  filename: string | null;
  attachedAt: number | null;
}

/** Normalize for IDB keys / Web Lock names (case-insensitive basename). */
export function normalizeWorkingFilename(fileName: string): string {
  const trimmed = fileName.trim();
  if (!trimmed) return "";
  const base = trimmed.split(/[/\\]/).pop() ?? trimmed;
  return base.trim().toLowerCase();
}

export function getOrCreateTabSessionId(): string {
  if (typeof sessionStorage === "undefined") return "ssr";
  try {
    const existing = sessionStorage.getItem(SS_TAB_SESSION_ID)?.trim();
    if (existing) return existing;
    const id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `tab-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
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

/** Update `?filename=` without navigation; preserves other params (e.g. room). */
export function syncFilenameInUrl(fileName: string | null): void {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    const normalized = fileName?.trim() || "";
    if (normalized) {
      url.searchParams.set(WORKING_FILE_URL_PARAM, normalized);
    } else {
      url.searchParams.delete(WORKING_FILE_URL_PARAM);
    }
    const next = url.toString();
    if (next !== window.location.href) {
      window.history.replaceState({}, "", next);
    }
  } catch {
    /* ignore */
  }
}

export function getTabWorkingFileContext(): TabWorkingFileContext {
  if (typeof sessionStorage === "undefined") {
    return { filename: null, attachedAt: null };
  }
  try {
    const raw = sessionStorage.getItem(SS_ACTIVE_CONTEXT);
    if (!raw) return { filename: null, attachedAt: null };
    const parsed = JSON.parse(raw) as Partial<TabWorkingFileContext>;
    const filename =
      typeof parsed.filename === "string" && parsed.filename.trim()
        ? parsed.filename.trim()
        : null;
    const attachedAt =
      typeof parsed.attachedAt === "number" && Number.isFinite(parsed.attachedAt)
        ? parsed.attachedAt
        : null;
    return { filename, attachedAt };
  } catch {
    return { filename: null, attachedAt: null };
  }
}

export function setTabWorkingFileContext(fileName: string | null): void {
  getOrCreateTabSessionId();
  if (typeof sessionStorage === "undefined") return;
  try {
    const trimmed = fileName?.trim() || null;
    if (!trimmed) {
      sessionStorage.removeItem(SS_ACTIVE_CONTEXT);
      return;
    }
    const record: TabWorkingFileContext = {
      filename: trimmed,
      attachedAt: Date.now(),
    };
    sessionStorage.setItem(SS_ACTIVE_CONTEXT, JSON.stringify(record));
  } catch {
    /* ignore */
  }
}

/**
 * Preferred working-file name for this tab:
 * 1) URL `?filename=`
 * 2) sessionStorage tab context
 * 3) localStorage last-used (only when URL has no filename)
 */
export function resolvePreferredWorkingFileName(): string | null {
  const fromUrl = readFilenameFromUrl();
  if (fromUrl) return fromUrl;

  const fromSession = getTabWorkingFileContext().filename;
  if (fromSession) return fromSession;

  if (typeof localStorage === "undefined") return null;
  try {
    const last = localStorage.getItem(LS_LAST_FILE_NAME)?.trim();
    return last || null;
  } catch {
    return null;
  }
}

/** Remember active file for this tab and reflect it in the URL (bookmarkable). */
export function bindTabWorkingFileName(fileName: string | null): void {
  const trimmed = fileName?.trim() || null;
  setTabWorkingFileContext(trimmed);
  syncFilenameInUrl(trimmed);
}
