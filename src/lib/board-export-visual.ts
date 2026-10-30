import { cardShowsDetails } from "@/lib/card-preview";
import { cardTypeCaption } from "@/lib/element-styles";
import { isStackingContainerType } from "@/lib/element-z-order";
import { hexToRgba } from "@/lib/region-style";
import type { CustomCardType } from "@/lib/custom-card-types";
import { CONTEXT_MAP_CONNECTOR_STYLE } from "@/lib/board-connector-style";
import { normalizeAppearance, type BoardAppearance } from "@/lib/board-appearance";
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

/** Matches `StormElementCard` when selection highlight filter dims a card. */
export const EXPORT_HIGHLIGHT_DIMMED_ELEMENT_OPACITY = 0.28;
/** Matches `BoardConnectors` when selection highlight filter dims a connector. */
export const EXPORT_HIGHLIGHT_DIMMED_CONNECTOR_OPACITY = 0.22;
export const EXPORT_HIGHLIGHT_DIMMED_ELEMENT_FILTER = "saturate(0.55) brightness(0.72)";

/** @deprecated Use exportCanvasBackground(slice) — canvas color comes from board appearance. */
export const BOARD_BACKGROUND = "#f4f5f7";
export const CONNECTOR_STROKE = "#8b9aab";
export const TIMELINE_STROKE = "#e9c46a";
export const SWIMLANE_LABEL_FILL = "#475569";
export const BC_LABEL_FILL = "#1e3a8a";

/** Same stroke/dash/width/double flags as live context-map connectors. */
export const CONTEXT_MAP_EXPORT_STYLE = CONTEXT_MAP_CONNECTOR_STYLE;

export function exportCanvasBackground(appearance: BoardAppearance): string {
  return normalizeAppearance(appearance).canvas;
}

/** Swimlanes on canvas use horizontal borders only (`border-y-2`). */
export function strokeSwimlaneExportBorder(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  borderColor: string,
): void {
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.moveTo(x, y + h);
  ctx.lineTo(x + w, y + h);
  ctx.stroke();
}

export function svgSwimlaneExportBorder(
  x: number,
  y: number,
  w: number,
  h: number,
  borderColor: string,
): string {
  const stroke = borderColor.replace(/"/g, "&quot;");
  return [
    `<line x1="${x}" y1="${y}" x2="${x + w}" y2="${y}" stroke="${stroke}" stroke-width="2"/>`,
    `<line x1="${x}" y1="${y + h}" x2="${x + w}" y2="${y + h}" stroke="${stroke}" stroke-width="2"/>`,
  ].join("\n");
}

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

/** Type line at the top of a sticky — same text as the canvas caption. */
export function elementTypeBadgeLabel(
  el: StormElement,
  customCardTypes: CustomCardType[] = [],
): string {
  return cardTypeCaption(el, customCardTypes);
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
