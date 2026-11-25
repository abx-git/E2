import {
  CARD_APPEARANCE_METADATA_KEYS,
  pickCardAppearanceMetadata,
} from "@/lib/card-appearance";
import {
  clipHasRegionAppearance,
  metadataKeyHasValue,
  type ElementAttributePastePlan,
} from "@/lib/element-attribute-clipboard";
import {
  extractLayoutRegionAppearanceMetadata,
  planLayoutRegionAppearancePaste,
} from "@/lib/region-appearance-clipboard";
import { isLayoutRegionElementType } from "@/lib/region-elements";
import type { ElementMetadata, ElementType, StormElement } from "@/types/storm-element";

export interface ElementStyleClipboard {
  sourceType: ElementType;
  metadata: ElementMetadata;
}

const NOTE_STYLE_KEYS: (keyof ElementMetadata)[] = ["noteColor"];

export function styleMetadataHasContent(meta: ElementMetadata | undefined): boolean {
  if (!meta) return false;
  return (
    CARD_APPEARANCE_METADATA_KEYS.some((key) => metadataKeyHasValue(meta, key)) ||
    NOTE_STYLE_KEYS.some((key) => metadataKeyHasValue(meta, key)) ||
    clipHasRegionAppearance(meta)
  );
}

export function buildElementStyleClipboard(element: StormElement): ElementStyleClipboard | null {
  const metadata: ElementMetadata = {};

  const card = pickCardAppearanceMetadata(element.metadata);
  if (card) Object.assign(metadata, card);

  if (element.type === "note" && metadataKeyHasValue(element.metadata, "noteColor")) {
    metadata.noteColor = element.metadata!.noteColor;
  }

  if (isLayoutRegionElementType(element.type)) {
    const appearance = extractLayoutRegionAppearanceMetadata(element);
    if (appearance) Object.assign(metadata, appearance);
  }

  if (!styleMetadataHasContent(metadata)) return null;
  return { sourceType: element.type, metadata };
}

export function planElementStylePaste(
  target: StormElement,
  clip: ElementStyleClipboard,
): ElementAttributePastePlan | null {
  if (!styleMetadataHasContent(clip.metadata)) return null;

  if (isLayoutRegionElementType(target.type)) {
    if (!clipHasRegionAppearance(clip.metadata)) return null;
    return planLayoutRegionAppearancePaste(target, {
      sourceType: clip.sourceType,
      label: target.label,
      metadata: clip.metadata,
    });
  }

  if (
    isLayoutRegionElementType(clip.sourceType) &&
    clipHasRegionAppearance(clip.metadata) &&
    !CARD_APPEARANCE_METADATA_KEYS.some((key) => metadataKeyHasValue(clip.metadata, key))
  ) {
    return null;
  }

  const nextMeta: ElementMetadata = { ...(target.metadata ?? {}) };

  for (const key of CARD_APPEARANCE_METADATA_KEYS) {
    if (metadataKeyHasValue(clip.metadata, key)) {
      (nextMeta as Record<string, unknown>)[key] = clip.metadata[key];
    }
  }

  if (target.type === "note" && metadataKeyHasValue(clip.metadata, "noteColor")) {
    nextMeta.noteColor = clip.metadata.noteColor;
  }

  const touched =
    CARD_APPEARANCE_METADATA_KEYS.some((key) => metadataKeyHasValue(clip.metadata, key)) ||
    (target.type === "note" && metadataKeyHasValue(clip.metadata, "noteColor"));

  if (!touched) return null;

  return { patch: { metadata: nextMeta }, warnings: [] };
}

export function elementStyleCanPaste(
  targetType: ElementType,
  targetId: string,
  clip: ElementStyleClipboard | null,
  sourceElementId: string | null,
): boolean {
  if (!clip || !styleMetadataHasContent(clip.metadata)) return false;
  if (sourceElementId === targetId) return false;
  if (isLayoutRegionElementType(targetType)) {
    return clipHasRegionAppearance(clip.metadata);
  }
  return planElementStylePaste(
    { id: targetId, type: targetType, label: "", x: 0, y: 0 },
    clip,
  ) !== null;
}