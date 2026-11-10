import type { ElementMetadata, StormElement } from "@/types/storm-element";

import {
  clipHasRegionAppearance,
  REGION_APPEARANCE_METADATA_KEYS,
  metadataKeyHasValue,
  type ElementAttributeClipboard,
  type ElementAttributePastePlan,
} from "@/lib/element-attribute-clipboard";
import { isLayoutRegionElementType } from "@/lib/region-elements";

export { clipHasRegionAppearance, REGION_APPEARANCE_METADATA_KEYS };

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
