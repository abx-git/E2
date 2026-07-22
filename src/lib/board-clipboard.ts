import { generateStormId } from "@/lib/storm-id";
import { elementBounds } from "@/lib/selection-geometry";
import type { StormElement } from "@/types/storm-element";
import type { StormRelation } from "@/types/storm-relation";

export const CLIPBOARD_DROP_ATTR = "data-clipboard-drop";

export interface BoardClipboardPayload {
  elements: StormElement[];
  relations: StormRelation[];
  /** Centroid of selection bounds at cut time (for paste alignment). */
  originX: number;
  originY: number;
}

export function selectionCentroid(elements: StormElement[]): { x: number; y: number } {
  if (elements.length === 0) return { x: 0, y: 0 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const el of elements) {
    const b = elementBounds(el);
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w);
    maxY = Math.max(maxY, b.y + b.h);
  }
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
}

/** Elements + relations fully internal to the id set. Clears region refs. */
export function extractClipboardPayload(
  elements: StormElement[],
  relations: StormRelation[],
  ids: string[],
): BoardClipboardPayload | null {
  const idSet = new Set(ids);
  const selected = elements.filter((e) => idSet.has(e.id));
  if (selected.length === 0) return null;

  const internalRelations = relations.filter(
    (r) => idSet.has(r.sourceId) && idSet.has(r.targetId),
  );

  const cleaned = selected.map((el) => {
    const { swimlaneId: _s, boundedContextId: _b, ...rest } = el;
    return { ...rest } as StormElement;
  });

  const { x, y } = selectionCentroid(cleaned);
  return {
    elements: structuredClone(cleaned),
    relations: structuredClone(internalRelations),
    originX: x,
    originY: y,
  };
}

export interface RemappedPaste {
  elements: StormElement[];
  relations: StormRelation[];
  newIds: string[];
}

/** New IDs + offset so selection centroid lands at (targetX, targetY). */
export function remapClipboardForPaste(
  payload: BoardClipboardPayload,
  targetX: number,
  targetY: number,
): RemappedPaste {
  const dx = targetX - payload.originX;
  const dy = targetY - payload.originY;
  const idMap = new Map<string, string>();
  for (const el of payload.elements) {
    idMap.set(el.id, generateStormId());
  }

  const elements = payload.elements.map((el) => ({
    ...structuredClone(el),
    id: idMap.get(el.id)!,
    x: el.x + dx,
    y: el.y + dy,
    swimlaneId: undefined,
    boundedContextId: undefined,
  }));

  const relations = payload.relations.flatMap((r) => {
    const sourceId = idMap.get(r.sourceId);
    const targetId = idMap.get(r.targetId);
    if (!sourceId || !targetId) return [];
    return [
      {
        ...structuredClone(r),
        id: generateStormId(),
        sourceId,
        targetId,
      },
    ];
  });

  return {
    elements,
    relations,
    newIds: elements.map((e) => e.id),
  };
}

export function isPointerOverClipboardDrop(clientX: number, clientY: number): boolean {
  if (typeof document === "undefined") return false;
  const el = document.elementFromPoint(clientX, clientY);
  return Boolean(el?.closest(`[${CLIPBOARD_DROP_ATTR}]`));
}

export function isPointerOverStormCanvas(clientX: number, clientY: number): boolean {
  if (typeof document === "undefined") return false;
  const el = document.elementFromPoint(clientX, clientY);
  return Boolean(el?.closest("[data-storm-canvas]"));
}

/**
 * Split clipboard: `ids` leave with their fully-internal relations;
 * remaining clipboard keeps the rest (relations only if both ends remain).
 */
export function takeIdsFromClipboard(
  payload: BoardClipboardPayload,
  ids: string[],
): { taken: BoardClipboardPayload | null; remaining: BoardClipboardPayload | null } {
  const idSet = new Set(ids);
  const takenEls = payload.elements.filter((e) => idSet.has(e.id));
  if (takenEls.length === 0) {
    return { taken: null, remaining: payload };
  }
  const remainingEls = payload.elements.filter((e) => !idSet.has(e.id));
  const takenRels = payload.relations.filter(
    (r) => idSet.has(r.sourceId) && idSet.has(r.targetId),
  );
  const remainingRels = payload.relations.filter(
    (r) => !idSet.has(r.sourceId) && !idSet.has(r.targetId),
  );

  const takenCentroid = selectionCentroid(takenEls);
  const remainingCentroid = selectionCentroid(remainingEls);

  return {
    taken: {
      elements: structuredClone(takenEls),
      relations: structuredClone(takenRels),
      originX: takenCentroid.x,
      originY: takenCentroid.y,
    },
    remaining:
      remainingEls.length === 0
        ? null
        : {
            elements: structuredClone(remainingEls),
            relations: structuredClone(remainingRels),
            originX: remainingCentroid.x,
            originY: remainingCentroid.y,
          },
  };
}

