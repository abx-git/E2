import {
  type BoardClipboardPayload,
  remapClipboardForPaste,
  selectionCentroid,
} from "@/lib/board-clipboard";
import { createEmptyBoardView, type BoardView } from "@/lib/storm-json";
import { generateStormId } from "@/lib/storm-id";
import { ELEMENT_STYLES, styleForElementType } from "@/lib/element-styles";
import {
  supportsArchDrilldown,
  type ModelingMode,
  type StormElement,
  type WorkshopFormat,
} from "@/types/storm-element";
import type { StormRelation } from "@/types/storm-relation";

const DETAIL_VIEW_PADDING = 80;
const WHITEBOX_WIDTH = 640;
const WHITEBOX_HEIGHT = 420;

export function resolveElementDetailView(
  el: StormElement,
  views: BoardView[],
): BoardView | null {
  const viewId = el.detailViewId?.trim();
  if (!viewId) return null;
  return views.find((v) => v.id === viewId) ?? null;
}

export interface BuildingBlockViewNavigation {
  direction: "down" | "up";
  targetViewId: string;
  targetViewName: string;
  /** Parent building-block element id when navigating up. */
  parentElementId?: string;
}

/** Resolve drill-down or drill-up for an architecture building block. */
export function resolveBuildingBlockViewNavigation(
  el: StormElement,
  activeViewId: string,
  views: BoardView[],
): BuildingBlockViewNavigation | null {
  if (!supportsArchDrilldown(el.type) && el.type !== "archComponent") {
    // Components can only navigate up if they match a parent label (rare); skip.
  }

  const detailView = resolveElementDetailView(el, views);
  if (detailView && supportsArchDrilldown(el.type)) {
    return {
      direction: "down",
      targetViewId: detailView.id,
      targetViewName: detailView.name,
    };
  }

  const label = el.label.trim();
  if (!label) return null;

  for (const view of views) {
    if (view.id === activeViewId) continue;
    for (const parent of view.elements) {
      if (!supportsArchDrilldown(parent.type)) continue;
      if (parent.detailViewId?.trim() !== activeViewId) continue;
      if (parent.label.trim() === label) {
        return {
          direction: "up",
          targetViewId: view.id,
          targetViewName: view.name,
          parentElementId: parent.id,
        };
      }
    }
  }

  return null;
}

/**
 * Collect building-block children via `contains` relations, plus any
 * cross-boundary relation endpoints needed for context.
 */
export function extractBuildingBlockViewPayload(
  elementId: string,
  elements: StormElement[],
  relations: StormRelation[],
): BoardClipboardPayload | null {
  const root = elements.find((e) => e.id === elementId);
  if (!root || !supportsArchDrilldown(root.type)) return null;

  const childIds = new Set<string>();
  for (const rel of relations) {
    if (rel.type !== "contains") continue;
    if (rel.sourceId === elementId) childIds.add(rel.targetId);
    if (rel.targetId === elementId) childIds.add(rel.sourceId);
  }

  const externalIds = new Set<string>();
  for (const rel of relations) {
    if (rel.type === "contains") continue;
    const srcChild = childIds.has(rel.sourceId);
    const tgtChild = childIds.has(rel.targetId);
    if (srcChild && !tgtChild && rel.targetId !== elementId) externalIds.add(rel.targetId);
    if (tgtChild && !srcChild && rel.sourceId !== elementId) externalIds.add(rel.sourceId);
  }

  const allIds = new Set([...childIds, ...externalIds]);
  const selectedElements = elements
    .filter((e) => allIds.has(e.id))
    .map((el) => {
      const next = structuredClone(el);
      next.swimlaneId = undefined;
      next.boundedContextId = undefined;
      delete next.detailViewId;
      return next;
    });

  const selectedRelations = relations.filter(
    (r) =>
      allIds.has(r.sourceId) &&
      allIds.has(r.targetId) &&
      r.sourceId !== elementId &&
      r.targetId !== elementId,
  );

  const { x, y } =
    selectedElements.length > 0
      ? selectionCentroid(selectedElements, [], [])
      : { x: DETAIL_VIEW_PADDING + WHITEBOX_WIDTH / 2, y: DETAIL_VIEW_PADDING + WHITEBOX_HEIGHT / 2 };

  return {
    elements: selectedElements,
    relations: structuredClone(selectedRelations),
    swimlanes: [],
    boundedContexts: [],
    contextRelations: [],
    originX: x,
    originY: y,
  };
}

/**
 * Build a detail view after C4-style zoom-in / Blackbox→Whitebox drill-down.
 * Seeds a Whitebox scope boundary (dashed frame) with the parent label —
 * same role as the system/container boundary on https://c4model.com/diagrams.
 */
export function buildBoardViewFromBuildingBlock(
  parent: StormElement,
  payload: BoardClipboardPayload,
  options: {
    id: string;
    name: string;
    modelingMode: ModelingMode;
    workshopFormat: WorkshopFormat;
  },
): BoardView {
  const remapped =
    payload.elements.length > 0
      ? remapClipboardForPaste(payload, DETAIL_VIEW_PADDING + 40, DETAIL_VIEW_PADDING + 48)
      : {
          elements: [] as StormElement[],
          relations: [] as StormRelation[],
          swimlanes: [],
          boundedContexts: [],
          contextRelations: [],
        };

  const whiteboxId = generateStormId();
  const whitebox: StormElement = {
    id: whiteboxId,
    type: "archWhitebox",
    label: parent.label.trim() || ELEMENT_STYLES.archWhitebox.label,
    description: parent.description,
    x: DETAIL_VIEW_PADDING,
    y: DETAIL_VIEW_PADDING,
    width: WHITEBOX_WIDTH,
    height: WHITEBOX_HEIGHT,
    metadata: parent.metadata ? structuredClone(parent.metadata) : undefined,
  };

  // Keep children inside the whitebox frame when possible.
  const paddedChildren = remapped.elements.map((el) => {
    const w = el.width ?? styleForElementType(el.type).defaultWidth;
    const h = el.height ?? styleForElementType(el.type).defaultHeight;
    const minX = whitebox.x + 24;
    const minY = whitebox.y + 40;
    const maxX = whitebox.x + (whitebox.width ?? WHITEBOX_WIDTH) - w - 24;
    const maxY = whitebox.y + (whitebox.height ?? WHITEBOX_HEIGHT) - h - 24;
    return {
      ...el,
      x: Math.min(Math.max(el.x, minX), Math.max(minX, maxX)),
      y: Math.min(Math.max(el.y, minY), Math.max(minY, maxY)),
    };
  });

  return createEmptyBoardView({
    id: options.id,
    name: options.name,
    modelingMode: options.modelingMode,
    workshopFormat: options.workshopFormat,
    elements: [whitebox, ...paddedChildren],
    relations: remapped.relations,
    boundedContexts: [],
    contextRelations: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  });
}
