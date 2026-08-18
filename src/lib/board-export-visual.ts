import { cardShowsDetails } from "@/lib/card-preview";
import { resolveElementStyle } from "@/lib/element-styles";
import { isStackingContainerType } from "@/lib/element-z-order";
import { hexToRgba } from "@/lib/region-style";
import type { CustomCardType } from "@/lib/custom-card-types";
import type { ContextMapPattern } from "@/types/storm-relation";
import {
  isArchBuildingBlockType,
  isC4ElementType,
  isCloudElementType,
  isNoteLike,
  type StormElement,
} from "@/types/storm-element";

/** Board UI uses IBM Plex Sans — keep a stable name (not next/font hashes). */
export const EXPORT_FONT_FAMILY = "IBM Plex Sans";
export const EXPORT_FONT_STACK = `"IBM Plex Sans", "Segoe UI", system-ui, sans-serif`;

/** Matches Tailwind `text-xs font-semibold` on stickies. */
export const LABEL_FONT_PX = 12;
export const LABEL_FONT_WEIGHT = 600;
/** Matches ~0.62rem meta lines on cards. */
export const META_FONT_PX = 10;
export const REGION_LABEL_FONT_PX = 12;
export const PAD = 80;
export const CARD_PAD_X = 8;
export const CARD_PAD_Y = 4;
export const BOUNDARY_FILL_OPACITY = 0.38;

export const BOARD_BACKGROUND = "#f4f5f7";
export const CONNECTOR_STROKE = "#8b9aab";
export const TIMELINE_STROKE = "#e9c46a";
export const SWIMLANE_LABEL_FILL = "#475569";
export const BC_LABEL_FILL = "#1e3a8a";

const SUBDOMAIN_KIND_LABEL: Record<string, string> = {
  core: "Core",
  supporting: "Supporting",
  generic: "Generic",
};

export const CONTEXT_MAP_EXPORT_STYLE: Record<
  ContextMapPattern,
  { stroke: string; dash?: string; width: number }
> = {
  partnership: { stroke: "#2a9d8f", width: 3 },
  sharedKernel: { stroke: "#c9a227", width: 2.5 },
  customerSupplier: { stroke: "#457b9d", width: 2.5 },
  conformist: { stroke: "#6c757d", width: 2, dash: "8 4" },
  antiCorruptionLayer: { stroke: "#e76f51", width: 2.5, dash: "4 3" },
  openHostService: { stroke: "#2a9d8f", width: 2.5 },
  publishedLanguage: { stroke: "#264653", width: 2, dash: "2 2" },
  separateWays: { stroke: "#adb5bd", width: 2, dash: "10 6" },
};

export function cssExportFont(weight: number, sizePx: number): string {
  return `${weight} ${sizePx}px ${EXPORT_FONT_STACK}`;
}

export function isBoundaryElement(el: Pick<StormElement, "type">): boolean {
  return isStackingContainerType(el.type);
}

export function elementFillWithOpacity(
  fill: string,
  el: Pick<StormElement, "type">,
): string {
  if (!isBoundaryElement(el)) return fill;
  return hexToRgba(fill, BOUNDARY_FILL_OPACITY);
}

export function elementStrokeWidth(el: Pick<StormElement, "type">): number {
  return isBoundaryElement(el) ? 2 : 1;
}

export function elementIsDashed(el: StormElement): boolean {
  if (el.type === "note" || el.type === "archWhitebox") return true;
  if (el.type === "link" && !el.metadata?.linkUrl && !el.metadata?.linkViewId) return true;
  return false;
}

export function elementHasTypeBadge(el: StormElement): boolean {
  return (
    el.type === "instruction" ||
    el.type === "customCard" ||
    isBoundaryElement(el) ||
    isC4ElementType(el.type) ||
    isArchBuildingBlockType(el.type) ||
    isCloudElementType(el.type)
  );
}

export function elementTypeBadgeLabel(
  el: StormElement,
  customCardTypes: CustomCardType[] = [],
): string | null {
  if (!elementHasTypeBadge(el)) return null;
  if (el.type === "aggregate") return "Aggregate Root";
  if (el.type === "subdomain") {
    const kind = SUBDOMAIN_KIND_LABEL[el.metadata?.subdomainKind ?? "core"] ?? "Core";
    return `Subdomain · ${kind}`;
  }
  if (el.type === "instruction") return "Instruction";
  return resolveElementStyle(el, customCardTypes).shortLabel;
}

/** Left/top like E2 cards with notes, details, badges, or boundary chrome. */
export function elementLabelIsCentered(el: StormElement): boolean {
  if (isNoteLike(el.type) || isBoundaryElement(el) || el.type === "link") return false;
  if (elementHasTypeBadge(el) || cardShowsDetails(el)) return false;
  return true;
}

export function elementLabelAlign(el: StormElement): "center" | "left" {
  return elementLabelIsCentered(el) ? "center" : "left";
}

export function elementVerticalAlign(el: StormElement): "middle" | "top" {
  if (isNoteLike(el.type) || isBoundaryElement(el) || cardShowsDetails(el) || elementHasTypeBadge(el)) {
    return "top";
  }
  return "middle";
}
