import {
  type BoardClipboardPayload,
  remapClipboardForPaste,
  selectionCentroid,
} from "@/lib/board-clipboard";
import { createEmptyBoardView, type BoardView } from "@/lib/storm-json";
import { elementIdsInBoundedContext } from "@/lib/region-containment";
import type { BoundedContext, ModelingMode, StormElement, Swimlane, WorkshopFormat } from "@/types/storm-element";
import type { ContextRelation, StormRelation } from "@/types/storm-relation";

const DETAIL_VIEW_PADDING = 80;

export function resolveBoundedContextDetailView(
  bc: BoundedContext,
  views: BoardView[],
): BoardView | null {
  const viewId = bc.detailViewId?.trim();
  if (!viewId) return null;
  return views.find((v) => v.id === viewId) ?? null;
}

export interface BoundedContextViewNavigation {
  direction: "down" | "up";
  targetViewId: string;
  targetViewName: string;
  /** Parent BC id when navigating up to the overview. */
  parentBoundedContextId?: string;
}

/** Resolve drill-down (detail view) or drill-up (parent overview) navigation for a BC. */
export function resolveBoundedContextViewNavigation(
  bc: BoundedContext,
  activeViewId: string,
  views: BoardView[],
): BoundedContextViewNavigation | null {
  const detailView = resolveBoundedContextDetailView(bc, views);
  if (detailView) {
    return {
      direction: "down",
      targetViewId: detailView.id,
      targetViewName: detailView.name,
    };
  }

  const label = bc.label.trim();
  if (!label) return null;

  for (const view of views) {
    if (view.id === activeViewId) continue;
    for (const parentBc of view.boundedContexts) {
      if (parentBc.detailViewId?.trim() !== activeViewId) continue;
      if (parentBc.label.trim() === label) {
        return {
          direction: "up",
          targetViewId: view.id,
          targetViewName: view.name,
          parentBoundedContextId: parentBc.id,
        };
      }
    }
  }

  return null;
}

/**
 * Collect BC contents plus direct element/context-map references outside the BC.
 */
export function extractBoundedContextViewPayload(
  bcId: string,
  elements: StormElement[],
  relations: StormRelation[],
  boundedContexts: BoundedContext[],
  contextRelations: ContextRelation[],
  _swimlanes: Swimlane[] = [],
): BoardClipboardPayload | null {
  const bc = boundedContexts.find((b) => b.id === bcId);
  if (!bc) return null;

  const internalElementIds = new Set(elementIdsInBoundedContext(elements, bc));
  const internalBcIds = new Set([bcId]);

  const externalElementIds = new Set<string>();
  for (const rel of relations) {
    const srcInternal = internalElementIds.has(rel.sourceId);
    const tgtInternal = internalElementIds.has(rel.targetId);
    if (srcInternal && !tgtInternal) externalElementIds.add(rel.targetId);
    if (!srcInternal && tgtInternal) externalElementIds.add(rel.sourceId);
  }

  const externalBcIds = new Set<string>();
  for (const cr of contextRelations) {
    const srcInternal = cr.sourceContextId === bcId;
    const tgtInternal = cr.targetContextId === bcId;
    if (srcInternal && !tgtInternal) externalBcIds.add(cr.targetContextId);
    if (!srcInternal && tgtInternal) externalBcIds.add(cr.sourceContextId);
  }

  for (const extBcId of externalBcIds) {
    const extBc = boundedContexts.find((b) => b.id === extBcId);
    if (!extBc) continue;
    for (const id of elementIdsInBoundedContext(elements, extBc)) {
      externalElementIds.add(id);
    }
  }

  const allElementIds = new Set([...internalElementIds, ...externalElementIds]);
  const allBcIds = new Set([...internalBcIds, ...externalBcIds]);

  const selectedElements = elements.filter((e) => allElementIds.has(e.id));
  const selectedBcs = boundedContexts.filter((b) => allBcIds.has(b.id));

  if (selectedElements.length === 0 && selectedBcs.length === 0) return null;

  const selectedRelations = relations.filter(
    (r) => allElementIds.has(r.sourceId) && allElementIds.has(r.targetId),
  );
  const selectedContextRelations = contextRelations.filter(
    (r) => allBcIds.has(r.sourceContextId) && allBcIds.has(r.targetContextId),
  );

  const cleanedElements = selectedElements.map((el) => {
    const next = structuredClone(el);
    next.swimlaneId = undefined;
    if (!next.boundedContextId || !allBcIds.has(next.boundedContextId)) {
      next.boundedContextId = undefined;
    }
    return next;
  });

  const cleanedBcs = selectedBcs.map((b) => {
    const next = structuredClone(b);
    delete next.detailViewId;
    return next;
  });

  const { x, y } = selectionCentroid(cleanedElements, [], cleanedBcs);
  return {
    elements: cleanedElements,
    relations: structuredClone(selectedRelations),
    swimlanes: [],
    boundedContexts: cleanedBcs,
    contextRelations: structuredClone(selectedContextRelations),
    originX: x,
    originY: y,
  };
}

export function buildBoardViewFromBoundedContextPayload(
  payload: BoardClipboardPayload,
  options: {
    id: string;
    name: string;
    modelingMode: ModelingMode;
    workshopFormat: WorkshopFormat;
  },
): BoardView {
  const remapped = remapClipboardForPaste(payload, DETAIL_VIEW_PADDING, DETAIL_VIEW_PADDING);
  return createEmptyBoardView({
    id: options.id,
    name: options.name,
    modelingMode: options.modelingMode,
    workshopFormat: options.workshopFormat,
    elements: remapped.elements,
    relations: remapped.relations,
    boundedContexts: remapped.boundedContexts,
    contextRelations: remapped.contextRelations,
    viewport: { x: 0, y: 0, zoom: 1 },
  });
}
