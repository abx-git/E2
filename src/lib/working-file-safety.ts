/**
 * Hard safety gates for Arbeitsdatei / URL context.
 * Any path that would overwrite disk, IDB, or another tab's file must pass these checks
 * or obtain an explicit user confirmation — never silent Last-Write-Wins.
 */

import {
  normalizeWorkingFilename,
  readFilenameFromUrl,
  readWorkingFileIdFromUrl,
} from "@/lib/working-file-tab-context";

export type WorkingFileWriteBlockReason =
  | "not_attached"
  | "not_writer"
  | "url_context_missing"
  | "url_context_mismatch";

export interface WorkingFileWriteGate {
  ok: boolean;
  reason?: WorkingFileWriteBlockReason;
  /** Human-readable hint for confirm / alert. */
  message?: string;
}

export interface WorkingFileWriteGateInput {
  attached: boolean;
  isWriterLeader: boolean;
  activeWf: string | null;
  label: string | null;
  /** After an explicit confirm dialog for missing URL. */
  userConfirmed?: boolean;
  requireWriter?: boolean;
}

/**
 * URL must identify this tab's working-file slot before any overwrite of an existing file.
 * Missing `?filename=` / `?wf=` after attach is treated as unsafe (wrong-file risk).
 */
export function evaluateWorkingFileUrlContext(input: {
  attached: boolean;
  activeWf: string | null;
  label: string | null;
}): WorkingFileWriteGate {
  if (!input.attached) {
    return { ok: false, reason: "not_attached", message: "Keine Arbeitsdatei verknüpft." };
  }

  const urlName = readFilenameFromUrl();
  const urlWf = readWorkingFileIdFromUrl();
  const activeWf = input.activeWf?.trim() || null;
  const label = input.label?.trim() || null;

  if (!urlName && !urlWf) {
    return {
      ok: false,
      reason: "url_context_missing",
      message:
        "In der URL fehlt noch ?filename= / ?wf=. Ohne diese Zuordnung könnte die falsche Datei überschrieben werden.",
    };
  }

  if (urlWf && activeWf && urlWf !== activeWf) {
    return {
      ok: false,
      reason: "url_context_mismatch",
      message: `URL-Slot (?wf=${urlWf}) stimmt nicht mit der verknüpften Datei überein.`,
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
      message: `URL-Dateiname („${urlName}“) weicht von der verknüpften Datei („${label}“) ab.`,
    };
  }

  return { ok: true };
}

/**
 * Gate for autosave / background persist. Requires writer role + bound URL context.
 * Explicit user saves may pass `userConfirmed: true` after a confirm dialog for missing URL.
 */
export function evaluateWorkingFileWriteGate(
  input: WorkingFileWriteGateInput,
): WorkingFileWriteGate {
  const requireWriter = input.requireWriter !== false;
  if (requireWriter && !input.isWriterLeader) {
    return {
      ok: false,
      reason: "not_writer",
      message:
        "Dieser Tab schreibt die Arbeitsdatei gerade nicht (ein anderer Tab ist aktiv).",
    };
  }

  const urlGate = evaluateWorkingFileUrlContext(input);
  if (!urlGate.ok) {
    if (input.userConfirmed && urlGate.reason === "url_context_missing") {
      return { ok: true };
    }
    return urlGate;
  }

  return { ok: true };
}

/** Confirm dialog for missing URL context before the first overwrite. */
export function confirmMissingUrlContextWrite(fileLabel: string | null): boolean {
  if (typeof window === "undefined") return false;
  const name = fileLabel?.trim() || "der verknüpften Datei";
  return window.confirm(
    `Sicherheitshinweis\n\n` +
      `Die Browser-Adresse enthält noch keinen Dateinamen (?filename= / ?wf=).\n` +
      `Beim Speichern wird „${name}“ überschrieben.\n\n` +
      `Fortfahren und speichern?`,
  );
}

/**
 * Whether cold-start may auto-restore a remembered file.
 * URL or this-tab session only — never shared localStorage alone.
 */
export function mayAutoRestoreWorkingFileFromStorage(): boolean {
  if (readFilenameFromUrl() || readWorkingFileIdFromUrl()) return true;
  // sessionStorage is set only after an attach/bind in this tab (survives reload).
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
