const STORAGE_KEY = "e2.side-rail.width";

export const SIDE_RAIL_WIDTH_DEFAULT = 336;
export const SIDE_RAIL_WIDTH_MIN = 288;
export const SIDE_RAIL_WIDTH_MAX = 520;

export function clampSideRailWidth(px: number): number {
  return Math.round(Math.min(SIDE_RAIL_WIDTH_MAX, Math.max(SIDE_RAIL_WIDTH_MIN, px)));
}

export function readSideRailWidth(): number {
  if (typeof window === "undefined") return SIDE_RAIL_WIDTH_DEFAULT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SIDE_RAIL_WIDTH_DEFAULT;
    const n = Number(raw);
    if (!Number.isFinite(n)) return SIDE_RAIL_WIDTH_DEFAULT;
    return clampSideRailWidth(n);
  } catch {
    return SIDE_RAIL_WIDTH_DEFAULT;
  }
}

export function writeSideRailWidth(px: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(clampSideRailWidth(px)));
  } catch {
    /* ignore */
  }
}
