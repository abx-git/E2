import { generateStormId } from "@/lib/storm-id";
import {
  boundedContextBounds,
  elementBounds,
  swimlaneBounds,
  type WorldRect,
} from "@/lib/selection-geometry";
import type { BoardConnector, ConnectorEndpoint } from "@/types/board-connector";
import type { BoundedContext, StormElement, Swimlane } from "@/types/storm-element";
import type { ContextRelation, StormRelation } from "@/types/storm-relation";

export const CLIPBOARD_DROP_ATTR = "data-clipboard-drop";

export interface ClipboardSelection {
  elementIds?: string[];
  swimlaneIds?: string[];
  boundedContextIds?: string[];
}

export interface BoardClipboardPayload {
  elements: StormElement[];
  relations: StormRelation[];
  connectors: BoardConnector[];
  swimlanes: Swimlane[];
  boundedContexts: BoundedContext[];
  contextRelations: ContextRelation[];
  /** Centroid of selection bounds at cut time (for paste alignment). */
  originX: number;
  originY: number;
}

function emptyPayload(originX = 0, originY = 0): BoardClipboardPayload {
  return {
    elements: [],
    relations: [],
    connectors: [],
    swimlanes: [],
    boundedContexts: [],
    contextRelations: [],
    originX,
    originY,
  };
}

function endpointInSelection(
  ep: ConnectorEndpoint,
  elementIdSet: Set<string>,
  swimlaneIdSet: Set<string>,
  bcIdSet: Set<string>,
): boolean {
  if (ep.attach === "element") return elementIdSet.has(ep.id);
  if (ep.attach === "swimlane") return swimlaneIdSet.has(ep.id);
  if (ep.attach === "boundedContext") return bcIdSet.has(ep.id);
  return false;
}

/** Board connectors with both ends inside the selection (moved/copied together). */
export function internalConnectorsForSelection(
  connectors: BoardConnector[],
  elementIdSet: Set<string>,
  swimlaneIdSet: Set<string>,
  bcIdSet: Set<string>,
): BoardConnector[] {
  return connectors.filter((c) => {
    if (c.source.attach === "point" || c.target.attach === "point") return false;
    const srcIn = endpointInSelection(c.source, elementIdSet, swimlaneIdSet, bcIdSet);
    const tgtIn = endpointInSelection(c.target, elementIdSet, swimlaneIdSet, bcIdSet);
    return srcIn && tgtIn;
  });
}

export function connectorTouchesSelection(
  c: BoardConnector,
  elementIdSet: Set<string>,
  swimlaneIdSet: Set<string>,
  bcIdSet: Set<string>,
): boolean {
  if (endpointInSelection(c.source, elementIdSet, swimlaneIdSet, bcIdSet)) return true;
  if (endpointInSelection(c.target, elementIdSet, swimlaneIdSet, bcIdSet)) return true;
  return false;
}

function normalizeSelection(selection: ClipboardSelection | string[]): ClipboardSelection {
  if (Array.isArray(selection)) {
    return { elementIds: selection };
  }
  return selection;
}

function expandRect(acc: WorldRect | null, next: WorldRect): WorldRect {
  if (!acc) return { ...next };
  const minX = Math.min(acc.x, next.x);
  const minY = Math.min(acc.y, next.y);
  const maxX = Math.max(acc.x + acc.w, next.x + next.w);
  const maxY = Math.max(acc.y + acc.h, next.y + next.h);
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function selectionCentroid(
  elements: StormElement[],
  swimlanes: Swimlane[] = [],
  boundedContexts: BoundedContext[] = [],
): { x: number; y: number } {
  let bounds: WorldRect | null = null;
  for (const el of elements) bounds = expandRect(bounds, elementBounds(el));
  for (const lane of swimlanes) bounds = expandRect(bounds, swimlaneBounds(lane));
  for (const bc of boundedContexts) bounds = expandRect(bounds, boundedContextBounds(bc));
  if (!bounds) return { x: 0, y: 0 };
  return { x: bounds.x + bounds.w / 2, y: bounds.y + bounds.h / 2 };
}

export function clipboardItemCount(payload: BoardClipboardPayload | null | undefined): number {
  if (!payload) return 0;
  return (
    payload.elements.length +
    (payload.swimlanes?.length ?? 0) +
    (payload.boundedContexts?.length ?? 0)
  );
}

export function isClipboardEmpty(payload: BoardClipboardPayload | null | undefined): boolean {
  return clipboardItemCount(payload) === 0;
}

/** Normalize older payloads that only stored elements/relations. */
export function normalizeClipboardPayload(
  payload: BoardClipboardPayload | null | undefined,
): BoardClipboardPayload | null {
  if (!payload) return null;
  return {
    elements: payload.elements ?? [],
    relations: payload.relations ?? [],
    connectors: payload.connectors ?? [],
    swimlanes: payload.swimlanes ?? [],
    boundedContexts: payload.boundedContexts ?? [],
    contextRelations: payload.contextRelations ?? [],
    originX: payload.originX,
    originY: payload.originY,
  };
}

/**
 * Selection → clipboard payload.
 * Keeps swimlaneId / boundedContextId / aggregateId / subdomainId only when that
 * container is also in the payload.
 */
export function extractClipboardPayload(
  elements: StormElement[],
  relations: StormRelation[],
  idsOrSelection: ClipboardSelection | string[],
  swimlanes: Swimlane[] = [],
  boundedContexts: BoundedContext[] = [],
  contextRelations: ContextRelation[] = [],
  connectors: BoardConnector[] = [],
): BoardClipboardPayload | null {
  const selection = normalizeSelection(idsOrSelection);
  const elementIdSet = new Set(selection.elementIds ?? []);
  const swimlaneIdSet = new Set(selection.swimlaneIds ?? []);
  const bcIdSet = new Set(selection.boundedContextIds ?? []);

  const selectedElements = elements.filter((e) => elementIdSet.has(e.id));
  const selectedSwimlanes = swimlanes.filter((l) => swimlaneIdSet.has(l.id));
  const selectedBcs = boundedContexts.filter((b) => bcIdSet.has(b.id));

  if (
    selectedElements.length === 0 &&
    selectedSwimlanes.length === 0 &&
    selectedBcs.length === 0
  ) {
    return null;
  }

  const internalRelations = relations.filter(
    (r) => elementIdSet.has(r.sourceId) && elementIdSet.has(r.targetId),
  );
  const internalContextRelations = contextRelations.filter(
    (r) => bcIdSet.has(r.sourceContextId) && bcIdSet.has(r.targetContextId),
  );
  const internalConnectors = internalConnectorsForSelection(
    connectors,
    elementIdSet,
    swimlaneIdSet,
    bcIdSet,
  );

  const cleanedElements = selectedElements.map((el) => {
    const next = structuredClone(el);
    if (!next.swimlaneId || !swimlaneIdSet.has(next.swimlaneId)) {
      next.swimlaneId = undefined;
    }
    if (!next.boundedContextId || !bcIdSet.has(next.boundedContextId)) {
      next.boundedContextId = undefined;
    }
    if (!next.aggregateId || !elementIdSet.has(next.aggregateId)) {
      next.aggregateId = undefined;
    }
    if (!next.subdomainId || !elementIdSet.has(next.subdomainId)) {
      next.subdomainId = undefined;
    }
    delete next.detailViewId;
    return next;
  });

  const { x, y } = selectionCentroid(cleanedElements, selectedSwimlanes, selectedBcs);
  return {
    elements: cleanedElements,
    relations: structuredClone(internalRelations),
    connectors: structuredClone(internalConnectors),
    swimlanes: structuredClone(selectedSwimlanes),
    boundedContexts: structuredClone(selectedBcs),
    contextRelations: structuredClone(internalContextRelations),
    originX: x,
    originY: y,
  };
}

export function mergeClipboardPayloads(
  existing: BoardClipboardPayload | null,
  incoming: BoardClipboardPayload,
): BoardClipboardPayload {
  if (!existing || isClipboardEmpty(existing)) return normalizeClipboardPayload(incoming)!;
  const a = normalizeClipboardPayload(existing)!;
  const b = normalizeClipboardPayload(incoming)!;
  const elements = [...a.elements, ...b.elements];
  const relations = [...a.relations, ...b.relations];
  const connectors = [...a.connectors, ...b.connectors];
  const swimlanes = [...a.swimlanes, ...b.swimlanes];
  const boundedContexts = [...a.boundedContexts, ...b.boundedContexts];
  const contextRelations = [...a.contextRelations, ...b.contextRelations];
  const { x, y } = selectionCentroid(elements, swimlanes, boundedContexts);
  return {
    elements,
    relations,
    connectors,
    swimlanes,
    boundedContexts,
    contextRelations,
    originX: x,
    originY: y,
  };
}

export interface RemappedPaste {
  elements: StormElement[];
  relations: StormRelation[];
  connectors: BoardConnector[];
  swimlanes: Swimlane[];
  boundedContexts: BoundedContext[];
  contextRelations: ContextRelation[];
  newIds: string[];
  newSwimlaneIds: string[];
  newBoundedContextIds: string[];
}

/** New IDs + offset so selection centroid lands at (targetX, targetY). */
export function remapClipboardForPaste(
  payload: BoardClipboardPayload,
  targetX: number,
  targetY: number,
): RemappedPaste {
  const normalized = normalizeClipboardPayload(payload)!;
  const dx = targetX - normalized.originX;
  const dy = targetY - normalized.originY;
  const idMap = new Map<string, string>();

  for (const el of normalized.elements) idMap.set(el.id, generateStormId());
  for (const lane of normalized.swimlanes) idMap.set(lane.id, generateStormId());
  for (const bc of normalized.boundedContexts) idMap.set(bc.id, generateStormId());

  const elements = normalized.elements.map((el) => {
    const next = structuredClone(el);
    next.id = idMap.get(el.id)!;
    next.x = el.x + dx;
    next.y = el.y + dy;
    next.swimlaneId = el.swimlaneId ? idMap.get(el.swimlaneId) : undefined;
    next.boundedContextId = el.boundedContextId ? idMap.get(el.boundedContextId) : undefined;
    next.aggregateId = el.aggregateId ? idMap.get(el.aggregateId) : undefined;
    next.subdomainId = el.subdomainId ? idMap.get(el.subdomainId) : undefined;
    delete next.detailViewId;
    return next;
  });

  const swimlanes = normalized.swimlanes.map((lane) => ({
    ...structuredClone(lane),
    id: idMap.get(lane.id)!,
    x: lane.x + dx,
    y: lane.y + dy,
  }));

  const boundedContexts = normalized.boundedContexts.map((bc) => ({
    ...structuredClone(bc),
    id: idMap.get(bc.id)!,
    x: bc.x + dx,
    y: bc.y + dy,
  }));

  const relations = normalized.relations.flatMap((r) => {
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

  const contextRelations = normalized.contextRelations.flatMap((r) => {
    const sourceContextId = idMap.get(r.sourceContextId);
    const targetContextId = idMap.get(r.targetContextId);
    if (!sourceContextId || !targetContextId) return [];
    return [
      {
        ...structuredClone(r),
        id: generateStormId(),
        sourceContextId,
        targetContextId,
      },
    ];
  });

  const remapConnectorEndpoint = (ep: ConnectorEndpoint): ConnectorEndpoint | null => {
    if (ep.attach === "point") {
      return { attach: "point", x: ep.x + dx, y: ep.y + dy };
    }
    const nextId = idMap.get(ep.id);
    if (!nextId) return null;
    return { attach: ep.attach, id: nextId };
  };

  const remappedConnectors = normalized.connectors.flatMap((c) => {
    const source = remapConnectorEndpoint(c.source);
    const target = remapConnectorEndpoint(c.target);
    if (!source || !target) return [];
    return [
      {
        ...structuredClone(c),
        id: generateStormId(),
        source,
        target,
      },
    ];
  });

  return {
    elements,
    relations,
    connectors: remappedConnectors,
    swimlanes,
    boundedContexts,
    contextRelations,
    newIds: elements.map((e) => e.id),
    newSwimlaneIds: swimlanes.map((l) => l.id),
    newBoundedContextIds: boundedContexts.map((b) => b.id),
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
 * Regions stay on the remaining side unless explicitly taken (not used by element drag-out).
 */
export function takeIdsFromClipboard(
  payload: BoardClipboardPayload,
  ids: string[],
): { taken: BoardClipboardPayload | null; remaining: BoardClipboardPayload | null } {
  const normalized = normalizeClipboardPayload(payload)!;
  const idSet = new Set(ids);
  const takenEls = normalized.elements.filter((e) => idSet.has(e.id));
  if (takenEls.length === 0) {
    return { taken: null, remaining: normalized };
  }
  const remainingEls = normalized.elements.filter((e) => !idSet.has(e.id));
  const takenRels = normalized.relations.filter(
    (r) => idSet.has(r.sourceId) && idSet.has(r.targetId),
  );
  const remainingRels = normalized.relations.filter(
    (r) => !idSet.has(r.sourceId) && !idSet.has(r.targetId),
  );
  const takenConnectors = normalized.connectors.filter((c) => {
    if (c.source.attach !== "element" || c.target.attach !== "element") return false;
    return idSet.has(c.source.id) && idSet.has(c.target.id);
  });
  const remainingConnectors = normalized.connectors.filter((c) => {
    if (c.source.attach === "element" && idSet.has(c.source.id)) return false;
    if (c.target.attach === "element" && idSet.has(c.target.id)) return false;
    return true;
  });

  const takenCentroid = selectionCentroid(takenEls);
  const remainingCentroid = selectionCentroid(
    remainingEls,
    normalized.swimlanes,
    normalized.boundedContexts,
  );

  const remaining: BoardClipboardPayload | null =
    remainingEls.length === 0 &&
    normalized.swimlanes.length === 0 &&
    normalized.boundedContexts.length === 0
      ? null
      : {
          elements: structuredClone(remainingEls),
          relations: structuredClone(remainingRels),
          connectors: structuredClone(remainingConnectors),
          swimlanes: structuredClone(normalized.swimlanes),
          boundedContexts: structuredClone(normalized.boundedContexts),
          contextRelations: structuredClone(normalized.contextRelations),
          originX: remainingCentroid.x,
          originY: remainingCentroid.y,
        };

  return {
    taken: {
      elements: structuredClone(takenEls),
      relations: structuredClone(takenRels),
      connectors: structuredClone(takenConnectors),
      swimlanes: [],
      boundedContexts: [],
      contextRelations: [],
      originX: takenCentroid.x,
      originY: takenCentroid.y,
    },
    remaining,
  };
}

export { emptyPayload };
