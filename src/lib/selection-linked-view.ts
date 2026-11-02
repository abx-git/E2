import type { BoardClipboardPayload, ClipboardSelection } from "@/lib/board-clipboard";
import {
  extractClipboardPayload,
  remapClipboardForPaste,
  selectionCentroid,
} from "@/lib/board-clipboard";
import { computeCanvasContentBounds } from "@/lib/canvas-content-bounds";
import { viewportFitContent } from "@/lib/canvas-viewport";
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
import type {
  BoundedContext,
  ModelingMode,
  StormElement,
  Swimlane,
  WorkshopFormat,
} from "@/types/storm-element";

const DETAIL_VIEW_PADDING = 80;
const MIN_LINK_WIDTH = 140;
const MIN_LINK_HEIGHT = 72;
/** Fallback canvas size when fitting a new detail view (no DOM yet). */
const DETAIL_VIEW_FIT_WIDTH = 1280;
const DETAIL_VIEW_FIT_HEIGHT = 720;

function remapEndpoint(ep: ConnectorEndpoint, idMap: Map<string, string>): ConnectorEndpoint {
  if (ep.attach === "point") return { ...ep };
  const nextId = idMap.get(ep.id);
  if (!nextId) return { ...ep };
  return { attach: ep.attach, id: nextId };
}

function translateEndpoint(
  ep: ConnectorEndpoint,
  idMap: Map<string, string>,
  dx: number,
  dy: number,
): ConnectorEndpoint {
  if (ep.attach === "point") {
    return { attach: "point", x: ep.x + dx, y: ep.y + dy };
  }
  return remapEndpoint(ep, idMap);
}

/** Centroid target so the selection bounds' top-left lands at `padding`. */
export function detailViewPasteTarget(
  bounds: WorldRect,
  padding = DETAIL_VIEW_PADDING,
): { x: number; y: number } {
  return { x: padding + bounds.w / 2, y: padding + bounds.h / 2 };
}

export function initialViewportForDetailView(view: CanvasBoardView): {
  x: number;
  y: number;
  zoom: number;
} {
  const bounds = computeCanvasContentBounds({
    elements: view.elements,
    swimlanes: view.swimlanes,
    boundedContexts: view.boundedContexts,
    connectors: view.connectors,
    canvasLines: view.canvasLines,
  });
  return viewportFitContent(bounds, DETAIL_VIEW_FIT_WIDTH, DETAIL_VIEW_FIT_HEIGHT);
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
  return boundsForClipboardLike({
    elements: slice.elements,
    swimlanes: slice.swimlanes,
    boundedContexts: slice.boundedContexts,
  });
}

export function boundsForClipboardPayload(payload: BoardClipboardPayload): WorldRect {
  return boundsForClipboardLike(payload);
}

function boundsForClipboardLike(payload: {
  elements: StormElement[];
  swimlanes: Swimlane[];
  boundedContexts: BoundedContext[];
}): WorldRect {
  let bounds: WorldRect | null = null;
  for (const el of payload.elements) bounds = expandRect(bounds, elementBounds(el));
  for (const lane of payload.swimlanes) bounds = expandRect(bounds, swimlaneBounds(lane));
  for (const bc of payload.boundedContexts) bounds = expandRect(bounds, boundedContextBounds(bc));
  return bounds ?? { x: 0, y: 0, w: MIN_LINK_WIDTH, h: MIN_LINK_HEIGHT };
}

export function defaultLinkedViewName(slice: CanvasBoardView, viewCount: number): string {
  const label = slice.elements.find((e) => e.label.trim())?.label.trim();
  if (label) return label;
  return `Sicht ${viewCount + 1}`;
}

function singleElementStubTemplate(slice: CanvasBoardView): StormElement | null {
  if (slice.elements.length !== 1) return null;
  if (slice.swimlanes.length > 0 || slice.boundedContexts.length > 0) return null;
  return slice.elements[0]!;
}

/**
 * Placeholder left on the origin view after moving a selection into a linked detail view.
 * Single-element moves keep the original element type; multi-selection uses a view link card.
 */
export function createSelectionLinkElement(
  slice: CanvasBoardView,
  bounds: WorldRect,
  label: string,
  detailViewId: string,
): StormElement {
  const viewLabel = label.trim() || "Sicht";
  const template = singleElementStubTemplate(slice);
  if (template) {
    const width = Math.max(bounds.w, template.width ?? MIN_LINK_WIDTH);
    const height = Math.max(bounds.h, template.height ?? MIN_LINK_HEIGHT);
    return {
      ...structuredClone(template),
      id: generateStormId(),
      type: template.type,
      label: viewLabel || template.label,
      description: undefined,
      detailViewId,
      x: bounds.x,
      y: bounds.y,
      width,
      height,
      swimlaneId: undefined,
      boundedContextId: undefined,
      aggregateId: undefined,
      subdomainId: undefined,
      cloudBoundaryId: undefined,
      metadata: template.metadata ? { ...template.metadata } : undefined,
    };
  }

  return {
    id: generateStormId(),
    type: "link",
    label: viewLabel,
    x: bounds.x,
    y: bounds.y,
    width: Math.max(bounds.w, MIN_LINK_WIDTH),
    height: Math.max(bounds.h, MIN_LINK_HEIGHT),
    metadata: { linkKind: "view", linkViewId: detailViewId },
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
  const pasteTarget = detailViewPasteTarget(bounds);

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

  const dx = pasteTarget.x - payload.originX;
  const dy = pasteTarget.y - payload.originY;
  const remapped = remapClipboardForPaste(payload, pasteTarget.x, pasteTarget.y);

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
    source: translateEndpoint(c.source, idMap, dx, dy),
    target: translateEndpoint(c.target, idMap, dx, dy),
    waypoints: c.waypoints?.map((wp) => ({ x: wp.x + dx, y: wp.y + dy })),
  }));

  const view = createEmptyBoardView({
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
  return { ...view, viewport: initialViewportForDetailView(view) };
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
        if (next.cloudBoundaryId && elementIds.has(next.cloudBoundaryId)) {
          next = { ...next, cloudBoundaryId: undefined };
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
