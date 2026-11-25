import {
  BC_LABEL_FILL,
  CARD_PAD_X,
  CARD_PAD_Y,
  EXPORT_FONT_FAMILY,
  exportCanvasBackground,
  EXPORT_FONT_STACK,
  LABEL_FONT_PX,
  LABEL_FONT_WEIGHT,
  META_FONT_PX,
  PAD,
  REGION_LABEL_FONT_PX,
  SWIMLANE_LABEL_FILL,
  TIMELINE_STROKE,
  elementIsDashed,
  elementLabelAlign,
  elementLabelIsCentered,
  elementStrokeWidth,
  elementTypeBadgeLabel,
  elementVerticalAlign,
  exportStickyElements,
} from "@/lib/board-export-visual";
import { drawioExportConnectorCells } from "@/lib/board-export-connectors";
import {
  cardAttributeLines,
  cardMethodLines,
  cardShowsDescription,
} from "@/lib/card-preview";
import { markdownToPlainText } from "@/lib/description-markdown";
import { cardWebLinkLines } from "@/lib/card-web-links";
import { effectiveElementRotation } from "@/lib/element-rotation";
import {
  regionZOrderItems,
  sortByZOrder,
  sortElementsByZOrder,
} from "@/lib/element-z-order";
import {
  elementPillCornerRadiusPx,
  isCircularPillShape,
  styleForElementType,
} from "@/lib/element-styles";
import { resolveCardPaint } from "@/lib/card-appearance";
import { resolveNoteColor } from "@/lib/note-colors";
import { resolveRegionPaint } from "@/lib/region-style";
import { elementCanvasBounds, resolveNoteCompactLayout } from "@/lib/note-compact";
import type { BoardActiveSlice } from "@/lib/storm-json";
import type { BoardExportSlice } from "@/lib/board-export-connectors";
import type { BoundedContext, StormElement, Swimlane } from "@/types/storm-element";
import type { CustomCardType } from "@/lib/custom-card-types";
import { mxCellId, mxStyleE2Meta, type E2MxCellKind } from "@/lib/drawio/cell-ids";

export interface BoardBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  ox: number;
  oy: number;
}

export function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export { mxCellId };

function elementExportRotation(el: StormElement): number {
  return effectiveElementRotation(el.rotation, styleForElementType(el.type).rotation);
}

function sortedRegions(state: Pick<BoardActiveSlice, "swimlanes" | "boundedContexts">): Array<
  | { kind: "swimlane"; region: Swimlane }
  | { kind: "boundedContext"; region: BoundedContext }
> {
  const laneById = new Map(state.swimlanes.map((l) => [l.id, l]));
  const bcById = new Map(state.boundedContexts.map((b) => [b.id, b]));
  const result: Array<
    | { kind: "swimlane"; region: Swimlane }
    | { kind: "boundedContext"; region: BoundedContext }
  > = [];
  for (const item of sortByZOrder(regionZOrderItems(state.swimlanes, state.boundedContexts))) {
    const lane = laneById.get(item.id);
    if (lane) {
      result.push({ kind: "swimlane", region: lane });
      continue;
    }
    const bc = bcById.get(item.id);
    if (bc) result.push({ kind: "boundedContext", region: bc });
  }
  return result;
}

function cornerRadius(el: StormElement, w: number, h: number): number {
  const shape = styleForElementType(el.type).shape;
  if (shape === "pill") return elementPillCornerRadiusPx(w, h);
  if (shape === "rectangle") return 2;
  if (shape === "wide") return 6;
  return 8;
}

function elementFillStrokeInk(
  el: StormElement,
  customCardTypes: CustomCardType[] = [],
): {
  fillHex: string;
  fillOpacityPercent: number;
  strokeHex: string;
  strokeOpacityPercent: number;
  ink: string;
} {
  const noteColors = el.type === "note" ? resolveNoteColor(el.metadata?.noteColor) : null;
  const s = styleForElementType(el.type);
  const paint = resolveCardPaint(el, s, noteColors);
  return {
    ink: paint.ink,
    fillHex: paint.fillHex,
    fillOpacityPercent: Math.round(paint.fillOpacity * 100),
    strokeHex: paint.borderHex,
    strokeOpacityPercent: Math.round(paint.borderOpacity * 100),
  };
}

export function computeBoardBounds(state: BoardActiveSlice | BoardExportSlice): BoardBounds {
  const notesCompact = state.notesCompact ?? false;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const expand = (x: number, y: number, w: number, h: number) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);
  };

  for (const el of state.elements) {
    const r = elementCanvasBounds(el, notesCompact);
    expand(r.x, r.y, r.w, r.h);
  }
  for (const bc of state.boundedContexts) {
    expand(bc.x, bc.y, bc.width, bc.height);
  }
  for (const lane of state.swimlanes) {
    expand(lane.x ?? 0, lane.y, lane.width ?? 4000, lane.height);
  }
  for (const line of state.canvasLines) {
    expand(Math.min(line.x1, line.x2), Math.min(line.y1, line.y2), Math.abs(line.x2 - line.x1), Math.abs(line.y2 - line.y1));
  }
  if (state.timeline.visible !== false) {
    expand(minX === Infinity ? 0 : minX, state.timeline.y - 1, 1, 2);
  }

  if (!Number.isFinite(minX)) {
    minX = 0;
    minY = 0;
    maxX = 800;
    maxY = 600;
  }

  const width = maxX - minX + PAD * 2;
  const height = maxY - minY + PAD * 2;
  return {
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
    ox: -minX + PAD,
    oy: -minY + PAD,
  };
}

function cardPreviewLines(el: StormElement): {
  description?: string;
  attrs: string[];
  methods: string[];
  links: string[];
} {
  return {
    description: cardShowsDescription(el)
      ? markdownToPlainText(el.description ?? "") || undefined
      : undefined,
    attrs: el.metadata?.showAttributesOnCard ? cardAttributeLines(el).slice(0, 8) : [],
    methods: el.metadata?.showMethodsOnCard ? cardMethodLines(el).slice(0, 8) : [],
    links: el.metadata?.showWebLinksOnCard ? cardWebLinkLines(el).slice(0, 8) : [],
  };
}

export function mxStyle(parts: Record<string, string | number | boolean | undefined>): string {
  return Object.entries(parts)
    .filter(([, v]) => v !== undefined && v !== false)
    .map(([k, v]) => (v === true ? `${k}=1` : `${k}=${v}`))
    .join(";");
}

function mxStyleWithE2(
  kind: E2MxCellKind,
  e2Id: string,
  parts: Record<string, string | number | boolean | undefined>,
): string {
  return mxStyle({ ...parts, ...mxStyleE2Meta(kind, e2Id) });
}

function mxHtmlText(text: string): string {
  return escapeXml(text).replace(/\r\n|\n|\r/g, "<br/>");
}

function mxHtmlValue(html: string): string {
  return escapeXml(html);
}

const MX_FONT = {
  fontFamily: EXPORT_FONT_FAMILY,
};

/** draw.io `absoluteArcSize`: arcSize is divided by 2, so store diameter in px. */
function mxAbsoluteArcSize(radiusPx: number): number {
  return Math.max(0, Math.round(radiusPx * 2));
}

function mxElementHtml(el: StormElement, customCardTypes: CustomCardType[]): string {
  const caption = elementTypeBadgeLabel(el, customCardTypes);
  const preview = cardPreviewLines(el);
  const parts: string[] = [
    `<div style="font-size:${META_FONT_PX}px;font-weight:500;letter-spacing:0.04em;opacity:0.7">${mxHtmlText(caption)}</div>`,
    `<div style="font-size:${LABEL_FONT_PX}px;font-weight:${LABEL_FONT_WEIGHT}">${mxHtmlText(el.label)}</div>`,
  ];
  if (preview.description) {
    parts.push(
      `<div style="font-size:${META_FONT_PX}px;font-weight:500">${mxHtmlText(preview.description)}</div>`,
    );
  }
  for (const line of preview.attrs) {
    parts.push(`<div style="font-size:${META_FONT_PX}px;font-weight:500">${mxHtmlText(line)}</div>`);
  }
  for (const line of preview.methods) {
    parts.push(`<div style="font-size:${META_FONT_PX}px;font-weight:500">${mxHtmlText(line)}</div>`);
  }
  for (const line of preview.links) {
    parts.push(`<div style="font-size:${META_FONT_PX}px;font-weight:500">${mxHtmlText(line)}</div>`);
  }
  return parts.join("");
}

function mxPushVertex(
  cells: string[],
  id: string,
  valueHtml: string,
  style: string,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  cells.push(
    `<mxCell id="${id}" value="${mxHtmlValue(valueHtml)}" style="${style}" vertex="1" parent="1">`,
    `<mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/>`,
    `</mxCell>`,
  );
}

/**
 * Builds an uncompressed draw.io mxfile for the board.
 * Embedded in SVG `content` so diagrams.net / draw.io can reopen the file for editing.
 */
export function buildDrawioMxFile(state: BoardActiveSlice | BoardExportSlice, bounds: BoardBounds): string {
  const { width, height, ox, oy } = bounds;
  const notesCompact = state.notesCompact ?? false;
  const canvasBg = exportCanvasBackground(state.appearance);
  const pageW = Math.max(1, Math.ceil(width));
  const pageH = Math.max(1, Math.ceil(height));
  const cells: string[] = [`<mxCell id="0"/>`, `<mxCell id="1" parent="0"/>`];

  for (const entry of sortedRegions(state)) {
    if (entry.kind === "swimlane") {
      const lane = entry.region;
      const x = (lane.x ?? 0) + ox;
      const y = lane.y + oy;
      const w = lane.width ?? 4000;
      const h = lane.height;
      const paint = resolveRegionPaint("swimlane", lane);
      const style = mxStyleWithE2("swimlane", lane.id, {
        shape: "partialRectangle",
        top: 1,
        bottom: 1,
        left: 0,
        right: 0,
        whiteSpace: "wrap",
        html: 1,
        align: "left",
        verticalAlign: "top",
        spacingLeft: 12,
        spacingTop: 8,
        fillColor: paint.fillHex,
        fillOpacity: Math.round(paint.fillOpacity * 100),
        strokeColor: paint.borderHex,
        strokeOpacity: Math.round(paint.borderOpacity * 100),
        strokeWidth: 2,
        fontColor: SWIMLANE_LABEL_FILL,
        fontSize: REGION_LABEL_FONT_PX,
        fontStyle: 1,
        ...MX_FONT,
      });
      mxPushVertex(cells, mxCellId("lane", lane.id), mxHtmlText(lane.label), style, x, y, w, h);
    } else {
      const bc = entry.region;
      const paint = resolveRegionPaint("boundedContext", bc);
      const style = mxStyleWithE2("boundedContext", bc.id, {
        rounded: 1,
        absoluteArcSize: 1,
        arcSize: mxAbsoluteArcSize(8),
        whiteSpace: "wrap",
        html: 1,
        align: "left",
        verticalAlign: "top",
        spacingLeft: 8,
        spacingTop: 4,
        fillColor: paint.fillHex,
        fillOpacity: Math.round(paint.fillOpacity * 100),
        strokeColor: paint.borderHex,
        strokeOpacity: Math.round(paint.borderOpacity * 100),
        strokeWidth: 2,
        fontColor: BC_LABEL_FILL,
        fontSize: REGION_LABEL_FONT_PX,
        fontStyle: 1,
        ...MX_FONT,
      });
      mxPushVertex(
        cells,
        mxCellId("bc", bc.id),
        mxHtmlText(bc.label),
        style,
        bc.x + ox,
        bc.y + oy,
        bc.width,
        bc.height,
      );
    }
  }

  if (state.timeline.visible !== false) {
    const ty = state.timeline.y + oy;
    const x1 = PAD / 2;
    const x2 = width - PAD / 2;
    const style = mxStyle({
      e2Kind: "timeline",
      endArrow: "none",
      html: 1,
      dashed: 1,
      dashPattern: "8 4",
      strokeColor: TIMELINE_STROKE,
      strokeWidth: 2,
      fontColor: TIMELINE_STROKE,
      fontSize: 10,
      fontStyle: 0,
      ...MX_FONT,
    });
    const timelineLabel = state.timeline.startLabel
      ? `Timeline · ${state.timeline.startLabel} → ${state.timeline.endLabel ?? "Ende"}`
      : "Timeline";
    cells.push(
      `<mxCell id="timeline" value="${mxHtmlValue(mxHtmlText(timelineLabel))}" style="${style}" edge="1" parent="1">`,
      `<mxGeometry relative="1" as="geometry">`,
      `<mxPoint x="${x1}" y="${ty}" as="sourcePoint"/>`,
      `<mxPoint x="${x2}" y="${ty}" as="targetPoint"/>`,
      `</mxGeometry>`,
      `</mxCell>`,
    );
  }

  cells.push(
    ...drawioExportConnectorCells(state, bounds, mxCellId, mxStyle, mxHtmlValue, mxHtmlText, MX_FONT),
  );

  for (const el of sortElementsByZOrder(exportStickyElements(state.elements))) {
    const r = elementCanvasBounds(el, notesCompact);
    const { fillHex, strokeHex, ink, fillOpacityPercent, strokeOpacityPercent } =
      elementFillStrokeInk(el, state.customCardTypes);
    const compactNote = resolveNoteCompactLayout(el, notesCompact);
    const shape = styleForElementType(el.type).shape;
    const radius = cornerRadius(el, r.w, r.h);
    const circularPill = shape === "pill" && isCircularPillShape(r.w, r.h);
    const align = elementLabelAlign(el);
    const vAlign = elementVerticalAlign(el);
    const style = mxStyleWithE2("element", el.id, {
      rounded: circularPill || (shape === "rectangle" && radius <= 0) ? 0 : 1,
      absoluteArcSize: circularPill ? undefined : 1,
      arcSize: circularPill ? undefined : mxAbsoluteArcSize(radius),
      ellipse: circularPill ? 1 : undefined,
      shape: el.type === "instruction" ? "process" : undefined,
      whiteSpace: "wrap",
      html: 1,
      align: compactNote ? "center" : align,
      verticalAlign: compactNote ? "middle" : vAlign,
      spacingLeft: align === "left" ? CARD_PAD_X : 4,
      spacingRight: align === "left" ? CARD_PAD_X : 4,
      spacingTop: vAlign === "top" ? CARD_PAD_Y : 2,
      spacingBottom: 2,
      fillColor: fillHex,
      fillOpacity: fillOpacityPercent < 100 ? fillOpacityPercent : undefined,
      strokeColor: strokeHex,
      strokeOpacity: strokeOpacityPercent < 100 ? strokeOpacityPercent : undefined,
      strokeWidth: elementStrokeWidth(el),
      fontColor: ink,
      fontSize: LABEL_FONT_PX,
      fontStyle: 0,
      dashed: elementIsDashed(el) ? 1 : undefined,
      dashPattern: elementIsDashed(el) ? "4 3" : undefined,
      rotation: elementExportRotation(el) || undefined,
      ...MX_FONT,
    });
    mxPushVertex(
      cells,
      mxCellId("el", el.id),
      compactNote ? mxHtmlValue("i") : mxElementHtml(el, state.customCardTypes),
      style,
      r.x + ox,
      r.y + oy,
      r.w,
      r.h,
    );
  }

  const modified = new Date().toISOString();
  const diagramName = escapeXml(state.title || "Board");
  return [
    `<mxfile host="app.diagrams.net" modified="${modified}" agent="E2" version="22.0.0" type="device">`,
    `<diagram id="board" name="${diagramName}">`,
    `<mxGraphModel dx="${pageW}" dy="${pageH}" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${pageW}" pageHeight="${pageH}" math="0" shadow="0" background="${canvasBg}">`,
    `<root>`,
    ...cells,
    `</root>`,
    `</mxGraphModel>`,
    `</diagram>`,
    `</mxfile>`,
  ].join("");
}

export { EXPORT_FONT_STACK };