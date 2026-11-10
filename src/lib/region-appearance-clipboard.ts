import type { ElementMetadata, StormElement } from "@/types/storm-element";

import {
  clipHasRegionAppearance,
  extractElementAttributeClipboard,
  REGION_APPEARANCE_METADATA_KEYS,
  metadataKeyHasValue,
  type ElementAttributeClipboard,
  type ElementAttributePastePlan,
} from "@/lib/element-attribute-clipboard";
import {
  elementToBoundedContext,
  elementToSwimlane,
  isLayoutRegionElementType,
} from "@/lib/region-elements";
import { resolveRegionPaint, type RegionVisualKind } from "@/lib/region-style";

export { clipHasRegionAppearance, REGION_APPEARANCE_METADATA_KEYS };

/** Effective paint (including type defaults) as element metadata for copy/paste. */
export function extractLayoutRegionAppearanceMetadata(
  el: StormElement,
): ElementMetadata | null {
  if (!isLayoutRegionElementType(el.type)) return null;
  const kind: RegionVisualKind = el.type === "swimlane" ? "swimlane" : "boundedContext";
  const region =
    el.type === "swimlane" ? elementToSwimlane(el)! : elementToBoundedContext(el)!;
  const paint = resolveRegionPaint(kind, region);
  const meta: ElementMetadata = {
    regionColor: paint.fillHex,
    regionFillOpacity: paint.fillOpacity,
    regionBorderColor: paint.borderHex,
    regionBorderOpacity: paint.borderOpacity,
  };
  if (region.labelColor) {
    meta.regionLabelColor = region.labelColor;
    if (region.labelOpacity !== undefined) meta.regionLabelOpacity = region.labelOpacity;
  }
  return meta;
}

/** Clipboard payload for layout regions — always includes resolved paint. */
export function buildLayoutRegionAttributeClipboard(el: StormElement): ElementAttributeClipboard {
  const clip = extractElementAttributeClipboard(el);
  const appearance = extractLayoutRegionAppearanceMetadata(el);
  if (!appearance) return clip;
  return { ...clip, metadata: { ...clip.metadata, ...appearance } };
}

/** Paste only region paint fields; keeps type, label, and geometry. */
export function planLayoutRegionAppearancePaste(
  target: StormElement,
  clip: ElementAttributeClipboard,
): ElementAttributePastePlan | null {
  if (!isLayoutRegionElementType(target.type)) return null;
  if (!clipHasRegionAppearance(clip.metadata)) return null;

  const nextMeta: ElementMetadata = { ...(target.metadata ?? {}) };
  for (const key of REGION_APPEARANCE_METADATA_KEYS) {
    if (metadataKeyHasValue(clip.metadata, key)) {
      (nextMeta as Record<string, unknown>)[key] = clip.metadata[key];
    }
  }

  return { patch: { metadata: nextMeta }, warnings: [] };
}

export function layoutRegionCanPasteAppearance(
  targetType: string,
  targetId: string,
  clip: ElementAttributeClipboard | null,
  sourceElementId: string | null,
): boolean {
  if (!clip || !isLayoutRegionElementType(targetType)) return false;
  if (sourceElementId === targetId) return false;
  return clipHasRegionAppearance(clip.metadata);
}
