import type { BoardAppearance } from "@/lib/board-appearance";
import type { BoardView } from "@/lib/storm-json";
import type { GlossaryEntry } from "@/types/storm-element";

export const HISTORY_LIMIT = 50;

/** Board domain state that participates in undo/redo (not UI ephemera). */
export interface BoardDomainSnapshot {
  title: string;
  glossary: GlossaryEntry[];
  appearance: BoardAppearance;
  workshopMode: boolean;
  activeViewId: string;
  views: BoardView[];
}

export function cloneDomainSnapshot(snap: BoardDomainSnapshot): BoardDomainSnapshot {
  return structuredClone(snap);
}

export function pushHistory(
  past: BoardDomainSnapshot[],
  current: BoardDomainSnapshot,
  limit = HISTORY_LIMIT,
): BoardDomainSnapshot[] {
  const next = [...past, cloneDomainSnapshot(current)];
  if (next.length > limit) return next.slice(next.length - limit);
  return next;
}

export function undoHistory(
  past: BoardDomainSnapshot[],
  future: BoardDomainSnapshot[],
  current: BoardDomainSnapshot,
): { past: BoardDomainSnapshot[]; future: BoardDomainSnapshot[]; restored: BoardDomainSnapshot } | null {
  if (past.length === 0) return null;
  const restored = past[past.length - 1]!;
  return {
    past: past.slice(0, -1),
    future: [...future, cloneDomainSnapshot(current)],
    restored: cloneDomainSnapshot(restored),
  };
}

export function redoHistory(
  past: BoardDomainSnapshot[],
  future: BoardDomainSnapshot[],
  current: BoardDomainSnapshot,
): { past: BoardDomainSnapshot[]; future: BoardDomainSnapshot[]; restored: BoardDomainSnapshot } | null {
  if (future.length === 0) return null;
  const restored = future[future.length - 1]!;
  return {
    past: [...past, cloneDomainSnapshot(current)],
    future: future.slice(0, -1),
    restored: cloneDomainSnapshot(restored),
  };
}
