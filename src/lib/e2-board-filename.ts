/** Canonical working-file suffix for E2 board JSON. */
export const E2_BOARD_FILE_SUFFIX = ".e2.json";

/** Legacy suffix — still accepted on import/open. */
export const LEGACY_BOARD_FILE_SUFFIX = ".storm.json";

export const STANDARD_E2_BOARD_FILENAME = `board${E2_BOARD_FILE_SUFFIX}`;

const BOARD_FILE_SUFFIX_RE = /\.(e2|storm)\.json$/i;

/** Strip `.e2.json` or legacy `.storm.json` from a basename. */
export function stripBoardFileSuffix(name: string): string {
  return name.replace(BOARD_FILE_SUFFIX_RE, "");
}

export function hasBoardFileSuffix(name: string): boolean {
  return BOARD_FILE_SUFFIX_RE.test(name.trim());
}

/**
 * Build a picker-friendly board filename (`*.e2.json`).
 * Existing `.storm.json` names are upgraded to `.e2.json` for new saves.
 */
export function suggestedE2BoardFilename(
  titleOrLabel: string | null | undefined,
  fallback: string = STANDARD_E2_BOARD_FILENAME,
): string {
  const raw = titleOrLabel?.trim();
  if (!raw) return fallback;
  if (/\.e2\.json$/i.test(raw)) return raw;
  if (/\.storm\.json$/i.test(raw)) {
    return raw.replace(/\.storm\.json$/i, E2_BOARD_FILE_SUFFIX);
  }
  if (/\.json$/i.test(raw)) {
    return raw.replace(/\.json$/i, E2_BOARD_FILE_SUFFIX);
  }
  const slug = raw
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return `${slug || "board"}${E2_BOARD_FILE_SUFFIX}`;
}

export function boardBackupFilenameSuffix(mode: "rolling" | "history", slug: string, stamp: string): string {
  if (mode === "rolling") {
    return `${slug}-backup${E2_BOARD_FILE_SUFFIX}`;
  }
  return `${slug}-backup-${stamp}${E2_BOARD_FILE_SUFFIX}`;
}

export function singleViewBoardExportFilename(title: string, viewName: string, slugify: (text: string) => string): string {
  return `${slugify(title)}-${slugify(viewName)}${E2_BOARD_FILE_SUFFIX}`;
}
