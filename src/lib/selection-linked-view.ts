import type { ClipboardSelection } from "@/lib/board-clipboard";
import {
  extractClipboardPayload,
  remapClipboardForPaste,
  selectionCentroid,
} from "@/lib/board-clipboard";
import { generateStormId } from "@/lib/storm-id";
import type { CanvasBoardView } from "@/lib/storm-json";
import { createEmptyBoardView } from "@/lib/storm-json";
import { sliceCanvasViewForSelection } from "@/lib/e2v/selection-slice";
import {
  boundedContextBounds,
  elementBounds,
  swimlaneBounds,
  type WorldRect,
} from "@/lib/selection-geometry";

function expandRect(acc: WorldRect | null, next: WorldRect): WorldRect {
  if (!acc) return { ...next };
  const minX = Math.min(acc.x, next.x);
  const minY = Math.min(acc.y, next.y);
  const maxX = Math.max(acc.x + acc.w, next.x + next.w);
  const maxY = Math.max(acc.y + acc.h, next.y + next.h);
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}
import type { BoardConnector, ConnectorEndpoint } from "@/types/board-connector";
import type { ModelingMode, StormElement, WorkshopFormat } from "@/types/storm-element";

const DETAIL_VIEW_PADDING = 80;
const MIN_LINK_WIDTH = 140;
const MIN_LINK_HEIGHT = 72;

function remapEndpoint(ep: ConnectorEndpoint, idMap: Map<string, string>): ConnectorEndpoint {
  if (ep.attach === "point") return { ...ep };
  const nextId = idMap.get(ep.id);
  if (!nextId) return { ...ep };
  return { attach: ep.attach, id: nextId };
}

export interface ExtractedSelectionIds {
  elementIds: Set<string>;
  swimlaneIds: Set<string>;
  bcIds: Set<string>;
}

function selectionIdSets(slice: CanvasBoardView): ExtractedSelectionIds {
  return {
    elementIds: new Set(slice.elements.map((e) => e.id)),
    swimlaneIds: new Set(slice.swimlanes.map((s) => s.id)),
    bcIds: new Set(slice.boundedContexts.map((b) => b.id)),
  };
}

function endpointInExtracted(
  ep: ConnectorEndpoint,
  ids: ExtractedSelectionIds,
): boolean {
  if (ep.attach === "element") return ids.elementIds.has(ep.id);
  if (ep.attach === "swimlane") return ids.swimlaneIds.has(ep.id);
  if (ep.attach === "boundedContext") return ids.bcIds.has(ep.id);
  return false;
}

function linkElementEndpoint(linkElementId: string): ConnectorEndpoint {
  return { attach: "element", id: linkElementId };
}

/** Reattach ends that pointed into the extracted set to the link placeholder. */
function rehomeConnectorEndpoints(
  c: BoardConnector,
  ids: ExtractedSelectionIds,
  linkElementId: string,
): BoardConnector | null {
  const srcIn = endpointInExtracted(c.source, ids);
  const tgtIn = endpointInExtracted(c.target, ids);
  if (srcIn && tgtIn) return null;
  if (!srcIn && !tgtIn) return c;
  const link = linkElementEndpoint(linkElementId);
  if (srcIn) return { ...structuredClone(c), source: link };
  return { ...structuredClone(c), target: link };
}

/** Union bounds of all items in a selection slice (for link placeholder size/position). */
export function boundsForSelectionSlice(slice: CanvasBoardView): WorldRect {
  let bounds: WorldRect | null = null;
  for (const el of slice.elements) bounds = expandRect(bounds, elementBounds(el));
  for (const lane of slice.swimlanes) bounds = expandRect(bounds, swimlaneBounds(lane));
  for (const bc of slice.boundedContexts) bounds = expandRect(bounds, boundedContextBounds(bc));
  return bounds ?? { x: 0, y: 0, w: MIN_LINK_WIDTH, h: MIN_LINK_HEIGHT };
}

export function defaultLinkedViewName(slice: CanvasBoardView, viewCount: number): string {
  const label = slice.elements.find((e) => e.label.trim())?.label.trim();
  if (label) return label;
  return `Sicht ${viewCount + 1}`;
}

/** Note sticky with `detailViewId` — uses the same linked-view UX as the inspector. */
export function createSelectionLinkElement(
  bounds: WorldRect,
  label: string,
  detailViewId: string,
): StormElement {
  return {
    id: generateStormId(),
    type: "note",
    label: label.trim() || "Sicht",
    detailViewId,
    x: bounds.x,
    y: bounds.y,
    width: Math.max(bounds.w, MIN_LINK_WIDTH),
    height: Math.max(bounds.h, MIN_LINK_HEIGHT),
    metadata: { noteColor: "cream" },
  };
}

export function buildLinkedDetailViewFromSlice(
  slice: CanvasBoardView,
  options: {
    id: string;
    name: string;
    modelingMode: ModelingMode;
    workshopFormat: WorkshopFormat;
  },
): CanvasBoardView {
  const bounds = boundsForSelectionSlice(slice);
  const targetX = DETAIL_VIEW_PADDING;
  const targetY = DETAIL_VIEW_PADDING;
  const originX = bounds.x + bounds.w / 2;
  const originY = bounds.y + bounds.h / 2;

  const elementIds = slice.elements.map((e) => e.id);
  const payload = extractClipboardPayload(
    slice.elements,
    slice.relations,
    elementIds,
    slice.swimlanes,
    slice.boundedContexts,
    slice.contextRelations,
  );
  if (!payload) {
    return createEmptyBoardView({
      id: options.id,
      name: options.name,
      modelingMode: options.modelingMode,
      workshopFormat: options.workshopFormat,
    });
  }

  const remapped = remapClipboardForPaste(
    { ...payload, originX, originY },
    targetX,
    targetY,
  );

  const idMap = new Map<string, string>();
  slice.elements.forEach((el, i) => {
    const next = remapped.elements[i];
    if (next) idMap.set(el.id, next.id);
  });
  slice.swimlanes.forEach((lane, i) => {
    const next = remapped.swimlanes[i];
    if (next) idMap.set(lane.id, next.id);
  });
  slice.boundedContexts.forEach((bc, i) => {
    const next = remapped.boundedContexts[i];
    if (next) idMap.set(bc.id, next.id);
  });

  const connectors = slice.connectors.map((c) => ({
    ...structuredClone(c),
    id: generateStormId(),
    source: remapEndpoint(c.source, idMap),
    target: remapEndpoint(c.target, idMap),
  }));

  return createEmptyBoardView({
    id: options.id,
    name: options.name,
    modelingMode: options.modelingMode,
    workshopFormat: options.workshopFormat,
    elements: remapped.elements,
    relations: remapped.relations,
    swimlanes: remapped.swimlanes,
    boundedContexts: remapped.boundedContexts,
    contextRelations: remapped.contextRelations,
    connectors,
    customCardTypes: structuredClone(slice.customCardTypes ?? []),
    viewport: { x: 0, y: 0, zoom: 1 },
  });
}

function rehomeRelationEndpoints(
  r: { id: string; sourceId: string; targetId: string },
  ids: ExtractedSelectionIds,
  linkElementId: string,
) {
  const srcIn = ids.elementIds.has(r.sourceId);
  const tgtIn = ids.elementIds.has(r.targetId);
  if (srcIn && tgtIn) return null;
  if (!srcIn && !tgtIn) return r;
  if (srcIn) return { ...r, sourceId: linkElementId };
  return { ...r, targetId: linkElementId };
}

/** Remove slice entities; rehome external connectors/relations onto the link sticky. */
export function stripSelectionFromCanvasView(
  view: CanvasBoardView,
  slice: CanvasBoardView,
  linkElementId: string,
): CanvasBoardView {
  const ids = selectionIdSets(slice);
  const { elementIds, swimlaneIds, bcIds } = ids;
  const relationIds = new Set(slice.relations.map((r) => r.id));
  const connectorIds = new Set(slice.connectors.map((c) => c.id));
  const contextRelationIds = new Set(slice.contextRelations.map((r) => r.id));

  const connectors = view.connectors
    .filter((c) => !connectorIds.has(c.id))
    .map((c) => rehomeConnectorEndpoints(c, ids, linkElementId))
    .filter((c): c is BoardConnector => c !== null);

  const relations = view.relations
    .filter((r) => !relationIds.has(r.id))
    .map((r) => rehomeRelationEndpoints(r, ids, linkElementId))
    .filter((r): r is typeof view.relations[number] => r !== null);

  return {
    ...view,
    elements: view.elements
      .filter((e) => !elementIds.has(e.id))
      .map((e) => {
        let next = e;
        if (next.aggregateId && elementIds.has(next.aggregateId)) {
          next = { ...next, aggregateId: undefined };
        }
        if (next.subdomainId && elementIds.has(next.subdomainId)) {
          next = { ...next, subdomainId: undefined };
        }
        if (next.swimlaneId && swimlaneIds.has(next.swimlaneId)) {
          next = { ...next, swimlaneId: undefined };
        }
        if (next.boundedContextId && bcIds.has(next.boundedContextId)) {
          next = { ...next, boundedContextId: undefined };
        }
        return next;
      }),
    swimlanes: view.swimlanes.filter((s) => !swimlaneIds.has(s.id)),
    boundedContexts: view.boundedContexts.filter((b) => !bcIds.has(b.id)),
    relations,
    contextRelations: view.contextRelations.filter((r) => !contextRelationIds.has(r.id)),
    connectors,
  };
}

/** Origin view after extract: stripped content + link placeholder element. */
export function buildOriginViewAfterSelectionExtract(
  view: CanvasBoardView,
  slice: CanvasBoardView,
  linkEl: StormElement,
): CanvasBoardView {
  const stripped = stripSelectionFromCanvasView(view, slice, linkEl.id);
  return {
    ...stripped,
    elements: [...stripped.elements, linkEl],
  };
}

export function sliceCanvasSelection(
  view: CanvasBoardView,
  selection: ClipboardSelection,
): CanvasBoardView | null {
  return sliceCanvasViewForSelection(view, { selection });
}

export function selectionCentroidForSlice(slice: CanvasBoardView): { x: number; y: number } {
  return selectionCentroid(slice.elements, slice.swimlanes, slice.boundedContexts);
}
