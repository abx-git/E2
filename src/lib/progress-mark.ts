/**
 * Optional progress / review marks on elements and connectors
 * (Ctrl+1 OK, Ctrl+2 !, Ctrl+3 …).
 */

export const PROGRESS_MARKS = ["ok", "attention", "pending"] as const;
export type ProgressMark = (typeof PROGRESS_MARKS)[number];

export const PROGRESS_MARK_BY_DIGIT: Record<"1" | "2" | "3", ProgressMark> = {
  "1": "ok",
  "2": "attention",
  "3": "pending",
};

export const PROGRESS_MARK_GLYPH: Record<ProgressMark, string> = {
  ok: "OK",
  attention: "!",
  pending: "…",
};

export const PROGRESS_MARK_LABEL: Record<ProgressMark, string> = {
  ok: "OK — erledigt / freigegeben",
  attention: "! — Aufmerksamkeit nötig",
  pending: "… — in Arbeit / offen",
};

/** Compact badge colors for canvas overlays. */
export const PROGRESS_MARK_STYLE: Record<
  ProgressMark,
  { bg: string; fg: string; border: string }
> = {
  ok: { bg: "#dcfce7", fg: "#14532d", border: "#86efac" },
  attention: { bg: "#fee2e2", fg: "#7f1d1d", border: "#fca5a5" },
  pending: { bg: "#fef9c3", fg: "#713f12", border: "#fde047" },
};

export function isProgressMark(value: unknown): value is ProgressMark {
  return value === "ok" || value === "attention" || value === "pending";
}

/** Same shortcut again clears; otherwise set. */
export function toggleProgressMark(
  current: ProgressMark | undefined | null,
  next: ProgressMark,
): ProgressMark | undefined {
  return current === next ? undefined : next;
}

export function progressMarkFromDigit(key: string): ProgressMark | null {
  if (key === "1" || key === "2" || key === "3") {
    return PROGRESS_MARK_BY_DIGIT[key];
  }
  return null;
}
