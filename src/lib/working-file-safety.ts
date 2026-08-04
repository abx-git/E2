/**
 * Lightweight gates for Arbeitsdatei writes.
 * Concept: URL/session binding is internal; never block the user with URL theology.
 * Multi-tab: only the writer tab persists; missing URL is auto-healed by re-binding.
 */

import {
  normalizeWorkingFilename,
  readFilenameFromUrl,
  readWorkingFileIdFromUrl,
} from "@/lib/working-file-tab-context";

export type WorkingFileWriteBlockReason =
  | "not_attached"
  | "not_writer"
  | "url_context_mismatch";

export interface WorkingFileWriteGate {
  ok: boolean;
  reason?: WorkingFileWriteBlockReason;
  message?: string;
  /** Caller should re-bind filename/wf into the URL, then retry. */
  shouldRebindUrl?: boolean;
}

/**
 * Whether cold-start may auto-restore a remembered file.
 * URL or this-tab session only — never shared localStorage alone.
 */
export function mayAutoRestoreWorkingFileFromStorage(): boolean {
  if (readFilenameFromUrl() || readWorkingFileIdFromUrl()) return true;
  try {
    if (typeof sessionStorage === "undefined") return false;
    const raw = sessionStorage.getItem("e2.working-file.tab-context");
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { filename?: string; wf?: string };
    return Boolean(parsed.filename?.trim() || parsed.wf?.trim());
  } catch {
    return false;
  }
}

/**
 * Soft URL check: missing params → rebind (not a hard block).
 * Hard block only on mismatch (wrong file vs URL).
 */
export function evaluateWorkingFileWriteGate(input: {
  attached: boolean;
  isWriterLeader: boolean;
  activeWf: string | null;
  label: string | null;
  requireWriter?: boolean;
}): WorkingFileWriteGate {
  if (!input.attached) {
    return { ok: false, reason: "not_attached", message: "Keine Arbeitsdatei verknüpft." };
  }

  if (input.requireWriter !== false && !input.isWriterLeader) {
    return {
      ok: false,
      reason: "not_writer",
      message: "Dieser Tab schreibt die Datei gerade nicht (anderer Tab ist aktiv).",
    };
  }

  const urlName = readFilenameFromUrl();
  const urlWf = readWorkingFileIdFromUrl();
  const activeWf = input.activeWf?.trim() || null;
  const label = input.label?.trim() || null;

  if (!urlName && !urlWf) {
    return { ok: true, shouldRebindUrl: true };
  }

  if (urlWf && activeWf && urlWf !== activeWf) {
    return {
      ok: false,
      reason: "url_context_mismatch",
      message: "URL und verknüpfte Datei stimmen nicht überein.",
    };
  }

  if (
    urlName &&
    label &&
    normalizeWorkingFilename(urlName) !== normalizeWorkingFilename(label)
  ) {
    return {
      ok: false,
      reason: "url_context_mismatch",
      message: `URL („${urlName}“) weicht von der Datei („${label}“) ab.`,
    };
  }

  return { ok: true };
}
