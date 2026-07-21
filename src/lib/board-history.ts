import type { BoardAppearance } from "@/lib/board-appearance";
import type {
  BoundedContext,
  GlossaryEntry,
  ModelingMode,
  StormElement,
  Swimlane,
  Timeline,
  WorkshopFormat,
} from "@/types/storm-element";
import type { ContextRelation, StormRelation } from "@/types/storm-relation";

export const HISTORY_LIMIT = 50;

/** Board domain state that participates in undo/redo (not UI ephemera). */
export interface BoardDomainSnapshot {
  title: string;
  modelingMode: ModelingMode;
  workshopFormat: WorkshopFormat;
  facilitatorEnabled: boolean;
  facilitatorPhase: number;
  elements: StormElement[];
  relations: StormRelation[];
  contextRelations: ContextRelation[];
  swimlanes: Swimlane[];
  boundedContexts: BoundedContext[];
  timeline: Timeline;
  glossary: GlossaryEntry[];
  appearance: BoardAppearance;
  snapToTimeline: boolean;
  snapToGrid: boolean;
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
