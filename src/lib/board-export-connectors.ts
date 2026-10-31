import { mergeLegacyIntoConnectors } from "@/lib/board-connector-migrate";
import { resolveConnectorAnchors } from "@/lib/board-connector-resolve";
import {
  polylineCaptionAnchor,
  polylinePointsAttr,
  resolveConnectorPolylinePoints,
} from "@/lib/connector-polyline";
import {
  boardConnectorCaption,
  boardConnectorDoubleLine,
  boardConnectorStrokeColor,
  boardConnectorStrokeDash,
  boardConnectorStrokeWidth,
  connectorArrowHead,
  resolveBoardConnectorStrokeStyle,
} from "@/lib/board-connector-style";
import { CONNECTOR_STROKE, META_FONT_PX, EXPORT_HIGHLIGHT_DIMMED_CONNECTOR_OPACITY } from "@/lib/board-export-visual";
import { connectorCanvasLineDash, connectorMxDash } from "@/lib/connector-style";
import { connectorDimmedBySelectionFilter } from "@/lib/canvas-selection-filter";
import type { BoardActiveSlice } from "@/lib/storm-json";
import type { BoardConnector, ConnectorEndpoint } from "@/types/board-connector";
import type { BoundedContext, StormElement, Swimlane } from "@/types/storm-element";

export type BoardExportHighlight = {
  enabled: boolean;
  selectedElementIds: readonly string[];
};

export type BoardExportSlice = BoardActiveSlice & {
  connectors?: BoardConnector[];
  /** Ephemeral UI: „Auswahl hervorheben“ for PNG/SVG/PDF export. */
  selectionHighlight?: BoardExportHighlight;
};

export function connectorExportInvolvesElement(conn: BoardConnector, elementId: string): boolean {
  return (
    (conn.source.attach === "element" && conn.source.id === elementId) ||
    (conn.target.attach === "element" && conn.target.id === elementId)
  );
}

function connectorDimmedForExportHighlight(conn: BoardConnector, state: BoardExportSlice): boolean {
  const highlight = state.selectionHighlight;
  if (!highlight) return false;
  return connectorDimmedBySelectionFilter(
    (elementId) => connectorExportInvolvesElement(conn, elementId),
    highlight.enabled,
    highlight.selectedElementIds,
  );
}

export function connectorsForExport(state: BoardExportSlice): BoardConnector[] {
  return mergeLegacyIntoConnectors(
    state.connectors ?? [],
    state.relations,
    state.contextRelations,
    state.canvasLines,
  );
}

export function connectorExportPolyline(
  conn: BoardConnector,
  elements: StormElement[],
  swimlanes: Swimlane[],
  boundedContexts: BoundedContext[],
  ox: number,
  oy: number,
  notesCompact = false,
): { x: number; y: number }[] | null {
  const points = resolveConnectorPolylinePoints(
    conn,
    elements,
    swimlanes,
    boundedContexts,
    notesCompact,
  );
  if (points.length < 2) return null;
  return points.map((p) => ({ x: p.x + ox, y: p.y + oy }));
}

/** @deprecated Prefer connectorExportPolyline */
export function connectorExportGeometry(
  conn: BoardConnector,
  elements: StormElement[],
  swimlanes: Swimlane[],
  boundedContexts: BoundedContext[],
  ox: number,
  oy: number,
): { start: { x: number; y: number }; end: { x: number; y: number } } | null {
  const points = connectorExportPolyline(conn, elements, swimlanes, boundedContexts, ox, oy);
  if (!points || points.length < 2) return null;
  return { start: points[0]!, end: points[points.length - 1]! };
}

export function connectorExportCaptionStyle(sidebarHex: string): {
  fill: string;
  label: string;
} {
  return { fill: sidebarHex, label: CONNECTOR_STROKE };
}

function parseDashArray(dash: string | undefined): number[] {
  if (!dash) return [];
  return dash.split(/\s+/).map(Number).filter((n) => !Number.isNaN(n));
}

export function drawExportArrowHead(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
): void {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const size = 8;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - size * Math.cos(angle - 0.4), y2 - size * Math.sin(angle - 0.4));
  ctx.lineTo(x2 - size * Math.cos(angle + 0.4), y2 - size * Math.sin(angle + 0.4));
  ctx.closePath();
  ctx.fill();
}

export function svgExportArrowHead(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
): string {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const size = 8;
  const px = x2;
  const py = y2;
  const xA = px - size * Math.cos(angle - 0.4);
  const yA = py - size * Math.sin(angle - 0.4);
  const xB = px - size * Math.cos(angle + 0.4);
  const yB = py - size * Math.sin(angle + 0.4);
  return `<polygon points="${px},${py} ${xA},${yA} ${xB},${yB}" fill="${color.replace(/"/g, "&quot;")}"/>`;
}

export function drawExportConnectorsOnCanvas(
  ctx: CanvasRenderingContext2D,
  state: BoardExportSlice,
  ox: number,
  oy: number,
  cssFont: (weight: number, sizePx: number) => string,
): void {
  const captionBg = state.appearance.sidebar;
  const notesCompact = state.notesCompact ?? false;
  for (const conn of connectorsForExport(state)) {
    const points = connectorExportPolyline(
      conn,
      state.elements,
      state.swimlanes,
      state.boundedContexts,
      ox,
      oy,
      notesCompact,
    );
    if (!points || points.length < 2) continue;

    const dimmed = connectorDimmedForExportHighlight(conn, state);
    if (dimmed) {
      ctx.save();
      ctx.globalAlpha = EXPORT_HIGHLIGHT_DIMMED_CONNECTOR_OPACITY;
    }

    const start = points[0]!;
    const end = points[points.length - 1]!;
    const stroke = boardConnectorStrokeColor(conn, false);
    const strokeW = boardConnectorStrokeWidth(conn, false);
    const dash = boardConnectorStrokeDash(conn);
    const arrow = connectorArrowHead(conn);
    const caption = boardConnectorCaption(conn);

    const strokePath = () => {
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      for (let i = 1; i < points.length; i += 1) {
        ctx.lineTo(points[i]!.x, points[i]!.y);
      }
      ctx.stroke();
    };

    if (boardConnectorDoubleLine(conn)) {
      ctx.save();
      ctx.strokeStyle = stroke;
      ctx.globalAlpha = 0.25;
      ctx.lineWidth = strokeW + 4;
      strokePath();
      ctx.restore();
    }

    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeW;
    const dashNums = dash ? parseDashArray(dash) : connectorCanvasLineDash(resolveBoardConnectorStrokeStyle(conn));
    ctx.setLineDash(dashNums);
    strokePath();
    ctx.setLineDash([]);

    if (arrow === "end" || arrow === "both") {
      const prev = points[points.length - 2]!;
      drawExportArrowHead(ctx, prev.x, prev.y, end.x, end.y, stroke);
    }
    if (arrow === "start" || arrow === "both") {
      drawExportArrowHead(ctx, points[1]!.x, points[1]!.y, start.x, start.y, stroke);
    }

    if (caption) {
      const { mid, badgeX, badgeY } = polylineCaptionAnchor(
        points.map((p) => ({ x: p.x - ox, y: p.y - oy })),
      );
      const midX = mid.x + ox;
      const midY = mid.y + oy;
      const padX = caption.length * 2.6 + 4;
      ctx.fillStyle = captionBg;
      ctx.globalAlpha = dimmed
        ? EXPORT_HIGHLIGHT_DIMMED_CONNECTOR_OPACITY * 0.85
        : 0.85;
      ctx.fillRect(midX - padX, midY - 18, padX * 2, 14);
      ctx.globalAlpha = dimmed ? EXPORT_HIGHLIGHT_DIMMED_CONNECTOR_OPACITY : 1;
      ctx.fillStyle = CONNECTOR_STROKE;
      ctx.font = cssFont(500, META_FONT_PX);
      ctx.textAlign = "center";
      ctx.fillText(caption, midX, midY - 8);
      void badgeX;
      void badgeY;
    }
    if (dimmed) ctx.restore();
  }
}

export function svgExportConnectors(
  state: BoardExportSlice,
  ox: number,
  oy: number,
  escapeXml: (s: string) => string,
): string[] {
  const parts: string[] = [];
  const captionBg = escapeXml(state.appearance.sidebar);
  const notesCompact = state.notesCompact ?? false;
  for (const conn of connectorsForExport(state)) {
    const points = connectorExportPolyline(
      conn,
      state.elements,
      state.swimlanes,
      state.boundedContexts,
      ox,
      oy,
      notesCompact,
    );
    if (!points || points.length < 2) continue;

    const dimmed = connectorDimmedForExportHighlight(conn, state);
    if (dimmed) {
      parts.push(`<g opacity="${EXPORT_HIGHLIGHT_DIMMED_CONNECTOR_OPACITY}">`);
    }

    const start = points[0]!;
    const end = points[points.length - 1]!;
    const stroke = boardConnectorStrokeColor(conn, false);
    const strokeW = boardConnectorStrokeWidth(conn, false);
    const dash = boardConnectorStrokeDash(conn);
    const dashAttr = dash ? ` stroke-dasharray="${dash}"` : "";
    const arrow = connectorArrowHead(conn);
    const caption = boardConnectorCaption(conn);
    const strokeEsc = escapeXml(stroke);
    const pointsAttr = polylinePointsAttr(points);

    if (boardConnectorDoubleLine(conn)) {
      parts.push(
        `<polyline points="${pointsAttr}" fill="none" stroke="${strokeEsc}" stroke-width="${strokeW + 4}" stroke-opacity="0.25"/>`,
      );
    }
    parts.push(
      `<polyline points="${pointsAttr}" fill="none" stroke="${strokeEsc}" stroke-width="${strokeW}"${dashAttr}/>`,
    );
    if (arrow === "end" || arrow === "both") {
      const prev = points[points.length - 2]!;
      parts.push(svgExportArrowHead(prev.x, prev.y, end.x, end.y, stroke));
    }
    if (arrow === "start" || arrow === "both") {
      parts.push(svgExportArrowHead(points[1]!.x, points[1]!.y, start.x, start.y, stroke));
    }
    if (caption) {
      const { mid } = polylineCaptionAnchor(
        points.map((p) => ({ x: p.x - ox, y: p.y - oy })),
      );
      const midX = mid.x + ox;
      const midY = mid.y + oy;
      const padX = caption.length * 2.6 + 4;
      parts.push(
        `<rect x="${midX - padX}" y="${midY - 18}" width="${padX * 2}" height="14" rx="3" fill="${captionBg}" fill-opacity="0.85"/>`,
        `<text class="meta" x="${midX}" y="${midY - 8}" text-anchor="middle" fill="${escapeXml(CONNECTOR_STROKE)}">${escapeXml(caption)}</text>`,
      );
    }
    if (dimmed) parts.push(`</g>`);
  }
  return parts;
}

function mxEndpointCellId(
  endpoint: ConnectorEndpoint,
  mxCellId: (kind: string, id: string) => string,
): string | null {
  if (endpoint.attach === "element") return mxCellId("el", endpoint.id);
  if (endpoint.attach === "boundedContext") return mxCellId("bc", endpoint.id);
  if (endpoint.attach === "swimlane") return mxCellId("lane", endpoint.id);
  return null;
}

export function drawioExportConnectorCells(
  state: BoardExportSlice,
  bounds: { ox: number; oy: number },
  mxCellId: (kind: string, id: string) => string,
  mxStyle: (parts: Record<string, string | number | undefined>) => string,
  mxHtmlValue: (html: string) => string,
  mxHtmlText: (text: string) => string,
  MX_FONT: Record<string, string>,
): string[] {
  const cells: string[] = [];
  for (const conn of connectorsForExport(state)) {
    const stroke = boardConnectorStrokeColor(conn, false);
    const strokeW = boardConnectorStrokeWidth(conn, false);
    const lineStroke = resolveBoardConnectorStrokeStyle(conn);
    const dash = boardConnectorStrokeDash(conn);
    const arrow = connectorArrowHead(conn);
    const caption = boardConnectorCaption(conn);
    const style = mxStyle({
      startArrow: arrow === "start" || arrow === "both" ? "block" : "none",
      endArrow: arrow === "end" || arrow === "both" ? "block" : "none",
      startFill: 1,
      endFill: 1,
      startSize: 6,
      endSize: 6,
      html: 1,
      rounded: 0,
      strokeColor: stroke,
      strokeWidth: strokeW,
      ...(dash
        ? { dashed: 1, dashPattern: dash.replace(/\s+/g, " ") }
        : connectorMxDash(lineStroke)),
      fontColor: CONNECTOR_STROKE,
      fontSize: META_FONT_PX,
      fontStyle: 0,
      ...MX_FONT,
    });

    const sourceCell = mxEndpointCellId(conn.source, mxCellId);
    const targetCell = mxEndpointCellId(conn.target, mxCellId);
    const id = mxCellId("conn", conn.id);

    if (sourceCell && targetCell) {
      cells.push(
        `<mxCell id="${id}" value="${mxHtmlValue(mxHtmlText(caption))}" style="${style}" edge="1" parent="1" source="${sourceCell}" target="${targetCell}">`,
        `<mxGeometry relative="1" as="geometry"/>`,
        `</mxCell>`,
      );
      continue;
    }

    const geom = connectorExportGeometry(
      conn,
      state.elements,
      state.swimlanes,
      state.boundedContexts,
      bounds.ox,
      bounds.oy,
    );
    if (!geom) continue;
    cells.push(
      `<mxCell id="${id}" value="${mxHtmlValue(mxHtmlText(caption))}" style="${style}" edge="1" parent="1">`,
      `<mxGeometry relative="1" as="geometry">`,
      `<mxPoint x="${geom.start.x}" y="${geom.start.y}" as="sourcePoint"/>`,
      `<mxPoint x="${geom.end.x}" y="${geom.end.y}" as="targetPoint"/>`,
      `</mxGeometry>`,
      `</mxCell>`,
    );
  }
  return cells;
}
