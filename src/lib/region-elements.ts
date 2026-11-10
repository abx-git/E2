import type { BoundedContext, ElementMetadata, StormElement, Swimlane } from "@/types/storm-element";
import type { CanvasBoardView } from "@/lib/storm-json";

export const LAYOUT_REGION_ELEMENT_TYPES = ["swimlane", "boundedContext"] as const;
export type LayoutRegionElementType = (typeof LAYOUT_REGION_ELEMENT_TYPES)[number];

export function isLayoutRegionElementType(type: string): type is LayoutRegionElementType {
  return type === "swimlane" || type === "boundedContext";
}

type RegionMeta = Pick<
  ElementMetadata,
  | "regionColor"
  | "regionFillOpacity"
  | "regionBorderColor"
  | "regionBorderOpacity"
  | "regionLabelColor"
  | "regionLabelOpacity"
  | "regionLocked"
>;

function regionMetaFromSource(source: {
  color?: string;
  fillOpacity?: number;
  borderColor?: string;
  borderOpacity?: number;
  labelColor?: string;
  labelOpacity?: number;
  locked?: boolean;
}): RegionMeta | undefined {
  const meta: RegionMeta = {
    regionColor: source.color,
    regionFillOpacity: source.fillOpacity,
    regionBorderColor: source.borderColor,
    regionBorderOpacity: source.borderOpacity,
    regionLabelColor: source.labelColor,
    regionLabelOpacity: source.labelOpacity,
    regionLocked: source.locked,
  };
  const hasValue = Object.values(meta).some((v) => v !== undefined);
  return hasValue ? meta : undefined;
}

export function swimlaneToElement(lane: Swimlane): StormElement {
  const meta = regionMetaFromSource(lane);
  return {
    id: lane.id,
    type: "swimlane",
    label: lane.label,
    x: lane.x ?? 0,
    y: lane.y,
    width: lane.width,
    height: lane.height,
    zIndex: lane.zIndex,
    metadata: meta,
  };
}

export function boundedContextToElement(bc: BoundedContext): StormElement {
  const meta = regionMetaFromSource(bc);
  return {
    id: bc.id,
    type: "boundedContext",
    label: bc.label,
    description: bc.purpose,
    x: bc.x,
    y: bc.y,
    width: bc.width,
    height: bc.height,
    zIndex: bc.zIndex,
    detailViewId: bc.detailViewId,
    metadata: meta,
  };
}

export function elementToSwimlane(el: StormElement): Swimlane | null {
  if (el.type !== "swimlane") return null;
  const m = el.metadata ?? {};
  return {
    id: el.id,
    label: el.label,
    x: el.x,
    y: el.y,
    width: el.width ?? 4000,
    height: el.height ?? 160,
    zIndex: el.zIndex,
    color: m.regionColor,
    fillOpacity: m.regionFillOpacity,
    borderColor: m.regionBorderColor,
    borderOpacity: m.regionBorderOpacity,
    labelColor: m.regionLabelColor,
    labelOpacity: m.regionLabelOpacity,
    locked: m.regionLocked,
  };
}

export function elementToBoundedContext(el: StormElement): BoundedContext | null {
  if (el.type !== "boundedContext") return null;
  const m = el.metadata ?? {};
  return {
    id: el.id,
    label: el.label,
    purpose: el.description,
    x: el.x,
    y: el.y,
    width: el.width ?? 280,
    height: el.height ?? 200,
    zIndex: el.zIndex,
    detailViewId: el.detailViewId,
    color: m.regionColor,
    fillOpacity: m.regionFillOpacity,
    borderColor: m.regionBorderColor,
    borderOpacity: m.regionBorderOpacity,
    labelColor: m.regionLabelColor,
    labelOpacity: m.regionLabelOpacity,
    locked: m.regionLocked,
  };
}

export function deriveSwimlanesFromElements(elements: StormElement[]): Swimlane[] {
  return elements
    .filter((e) => e.type === "swimlane")
    .map((e) => elementToSwimlane(e)!);
}

export function deriveBoundedContextsFromElements(elements: StormElement[]): BoundedContext[] {
  return elements
    .filter((e) => e.type === "boundedContext")
    .map((e) => elementToBoundedContext(e)!);
}

/** Merge legacy region arrays into `elements` (id-stable). Clears region arrays. */
export function migrateLegacyRegionsIntoElements(view: CanvasBoardView): CanvasBoardView {
  const existingIds = new Set(view.elements.map((e) => e.id));
  const toAdd: StormElement[] = [];

  for (const lane of view.swimlanes) {
    if (existingIds.has(lane.id)) continue;
    toAdd.push(swimlaneToElement(lane));
    existingIds.add(lane.id);
  }
  for (const bc of view.boundedContexts) {
    if (existingIds.has(bc.id)) continue;
    toAdd.push(boundedContextToElement(bc));
    existingIds.add(bc.id);
  }

  if (toAdd.length === 0 && view.swimlanes.length === 0 && view.boundedContexts.length === 0) {
    return view;
  }

  return {
    ...view,
    elements: [...view.elements, ...toAdd],
    swimlanes: [],
    boundedContexts: [],
  };
}

export function patchRegionElementFromSwimlane(
  el: StormElement,
  patch: Partial<Swimlane>,
): StormElement {
  if (el.type !== "swimlane") return el;
  const meta = { ...(el.metadata ?? {}) };
  if ("color" in patch) meta.regionColor = patch.color;
  if ("fillOpacity" in patch) meta.regionFillOpacity = patch.fillOpacity;
  if ("borderColor" in patch) meta.regionBorderColor = patch.borderColor;
  if ("borderOpacity" in patch) meta.regionBorderOpacity = patch.borderOpacity;
  if ("labelColor" in patch) {
    if (patch.labelColor === undefined) delete meta.regionLabelColor;
    else meta.regionLabelColor = patch.labelColor;
  }
  if ("labelOpacity" in patch) {
    if (patch.labelOpacity === undefined) delete meta.regionLabelOpacity;
    else meta.regionLabelOpacity = patch.labelOpacity;
  }
  if ("locked" in patch) meta.regionLocked = patch.locked;

  return {
    ...el,
    label: patch.label ?? el.label,
    x: patch.x ?? el.x,
    y: patch.y ?? el.y,
    width: patch.width ?? el.width,
    height: patch.height ?? el.height,
    zIndex: patch.zIndex ?? el.zIndex,
    metadata: Object.keys(meta).length ? meta : undefined,
  };
}

export function patchRegionElementFromBoundedContext(
  el: StormElement,
  patch: Partial<BoundedContext>,
): StormElement {
  if (el.type !== "boundedContext") return el;
  const meta = { ...(el.metadata ?? {}) };
  if ("color" in patch) meta.regionColor = patch.color;
  if ("fillOpacity" in patch) meta.regionFillOpacity = patch.fillOpacity;
  if ("borderColor" in patch) meta.regionBorderColor = patch.borderColor;
  if ("borderOpacity" in patch) meta.regionBorderOpacity = patch.borderOpacity;
  if ("labelColor" in patch) {
    if (patch.labelColor === undefined) delete meta.regionLabelColor;
    else meta.regionLabelColor = patch.labelColor;
  }
  if ("labelOpacity" in patch) {
    if (patch.labelOpacity === undefined) delete meta.regionLabelOpacity;
    else meta.regionLabelOpacity = patch.labelOpacity;
  }
  if ("locked" in patch) meta.regionLocked = patch.locked;

  return {
    ...el,
    label: patch.label ?? el.label,
    description: patch.purpose !== undefined ? patch.purpose : el.description,
    x: patch.x ?? el.x,
    y: patch.y ?? el.y,
    width: patch.width ?? el.width,
    height: patch.height ?? el.height,
    zIndex: patch.zIndex ?? el.zIndex,
    detailViewId: patch.detailViewId !== undefined ? patch.detailViewId : el.detailViewId,
    metadata: Object.keys(meta).length ? meta : undefined,
  };
}

export function regionElementLocked(el: StormElement): boolean {
  return Boolean(el.metadata?.regionLocked);
}
