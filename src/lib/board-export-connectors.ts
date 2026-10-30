import { mergeLegacyIntoConnectors } from "@/lib/board-connector-migrate";
import { resolveConnectorAnchors } from "@/lib/board-connector-resolve";
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

export function connectorExportGeometry(
  conn: BoardConnector,
  elements: StormElement[],
  swimlanes: Swimlane[],
  boundedContexts: BoundedContext[],
  ox: number,
  oy: number,
): { start: { x: number; y: number }; end: { x: number; y: number } } | null {
  const { start, end } = resolveConnectorAnchors(conn, elements, swimlanes, boundedContexts);
  return {
    start: { x: start.x + ox, y: start.y + oy },
    end: { x: end.x + ox, y: end.y + oy },
  };
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
  for (const conn of connectorsForExport(state)) {
    const geom = connectorExportGeometry(
      conn,
      state.elements,
      state.swimlanes,
      state.boundedContexts,
      ox,
      oy,
    );
    if (!geom) continue;

    const dimmed = connectorDimmedForExportHighlight(conn, state);
    if (dimmed) {
      ctx.save();
      ctx.globalAlpha = EXPORT_HIGHLIGHT_DIMMED_CONNECTOR_OPACITY;
    }

    const { start, end } = geom;
    const stroke = boardConnectorStrokeColor(conn, false);
    const strokeW = boardConnectorStrokeWidth(conn, false);
    const dash = boardConnectorStrokeDash(conn);
    const arrow = connectorArrowHead(conn);
    const caption = boardConnectorCaption(conn);

    if (boardConnectorDoubleLine(conn)) {
      ctx.save();
      ctx.strokeStyle = stroke;
      ctx.globalAlpha = 0.25;
      ctx.lineWidth = strokeW + 4;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      ctx.restore();
    }

    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeW;
    const dashNums = dash ? parseDashArray(dash) : connectorCanvasLineDash(resolveBoardConnectorStrokeStyle(conn));
    ctx.setLineDash(dashNums);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.setLineDash([]);

    if (arrow === "end" || arrow === "both") {
      drawExportArrowHead(ctx, start.x, start.y, end.x, end.y, stroke);
    }
    if (arrow === "start" || arrow === "both") {
      drawExportArrowHead(ctx, end.x, end.y, start.x, start.y, stroke);
    }

    if (caption) {
      const midX = (start.x + end.x) / 2;
      const midY = (start.y + end.y) / 2;
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
  for (const conn of connectorsForExport(state)) {
    const geom = connectorExportGeometry(
      conn,
      state.elements,
      state.swimlanes,
      state.boundedContexts,
      ox,
      oy,
    );
    if (!geom) continue;

    const dimmed = connectorDimmedForExportHighlight(conn, state);
    if (dimmed) {
      parts.push(`<g opacity="${EXPORT_HIGHLIGHT_DIMMED_CONNECTOR_OPACITY}">`);
    }

    const { start, end } = geom;
    const stroke = boardConnectorStrokeColor(conn, false);
    const strokeW = boardConnectorStrokeWidth(conn, false);
    const dash = boardConnectorStrokeDash(conn);
    const dashAttr = dash ? ` stroke-dasharray="${dash}"` : "";
    const arrow = connectorArrowHead(conn);
    const caption = boardConnectorCaption(conn);
    const strokeEsc = escapeXml(stroke);

    if (boardConnectorDoubleLine(conn)) {
      parts.push(
        `<line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" stroke="${strokeEsc}" stroke-width="${strokeW + 4}" stroke-opacity="0.25"/>`,
      );
    }
    parts.push(
      `<line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" stroke="${strokeEsc}" stroke-width="${strokeW}"${dashAttr}/>`,
    );
    if (arrow === "end" || arrow === "both") {
      parts.push(svgExportArrowHead(start.x, start.y, end.x, end.y, stroke));
    }
    if (arrow === "start" || arrow === "both") {
      parts.push(svgExportArrowHead(end.x, end.y, start.x, start.y, stroke));
    }
    if (caption) {
      const midX = (start.x + end.x) / 2;
      const midY = (start.y + end.y) / 2;
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
