/**
 * Optional progress / review marks on elements and connectors.
 * Ctrl+1…5 — same key again clears.
 */

export const PROGRESS_MARKS = [
  "ok",
  "attention",
  "question",
  "working",
  "neu",
] as const;
export type ProgressMark = (typeof PROGRESS_MARKS)[number];

/** Legacy value from earlier builds — treated as `working`. */
export type LegacyProgressMark = ProgressMark | "pending";

export const PROGRESS_MARK_BY_DIGIT: Record<"1" | "2" | "3" | "4" | "5", ProgressMark> = {
  "1": "ok",
  "2": "attention",
  "3": "question",
  "4": "working",
  "5": "neu",
};

export const PROGRESS_MARK_SHORT: Record<ProgressMark, string> = {
  ok: "OK",
  attention: "!",
  question: "?",
  working: "Arbeit",
  neu: "Neu",
};

export const PROGRESS_MARK_LABEL: Record<ProgressMark, string> = {
  ok: "OK — erledigt / freigegeben",
  attention: "! — Aufmerksamkeit nötig",
  question: "? — Klärung offen",
  working: "In Arbeit",
  neu: "Neu",
};

export const PROGRESS_MARK_SHORTCUT: Record<ProgressMark, string> = {
  ok: "Ctrl+1",
  attention: "Ctrl+2",
  question: "Ctrl+3",
  working: "Ctrl+4",
  neu: "Ctrl+5",
};

/** Compact badge colors for canvas overlays. */
export const PROGRESS_MARK_STYLE: Record<
  ProgressMark,
  { bg: string; fg: string; border: string }
> = {
  ok: { bg: "#16a34a", fg: "#ffffff", border: "#15803d" },
  attention: { bg: "#dc2626", fg: "#ffffff", border: "#b91c1c" },
  question: { bg: "#2563eb", fg: "#ffffff", border: "#1d4ed8" },
  working: { bg: "#d97706", fg: "#ffffff", border: "#b45309" },
  neu: { bg: "#7c3aed", fg: "#ffffff", border: "#6d28d9" },
};

export function isProgressMark(value: unknown): value is ProgressMark {
  return (
    value === "ok" ||
    value === "attention" ||
    value === "question" ||
    value === "working" ||
    value === "neu"
  );
}

/** Accept stored values including legacy `pending`. */
export function normalizeProgressMark(value: unknown): ProgressMark | undefined {
  if (value === "pending") return "working";
  if (isProgressMark(value)) return value;
  return undefined;
}

/** Same shortcut again clears; otherwise set. */
export function toggleProgressMark(
  current: ProgressMark | undefined | null,
  next: ProgressMark,
): ProgressMark | undefined {
  return current === next ? undefined : next;
}

export function progressMarkFromDigit(key: string): ProgressMark | null {
  if (key === "1" || key === "2" || key === "3" || key === "4" || key === "5") {
    return PROGRESS_MARK_BY_DIGIT[key];
  }
  return null;
}
