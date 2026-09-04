import { RELATION_TYPE_LABELS, type RelationType } from "@/types/storm-relation";

export type ConnectorStrokeStyle = "solid" | "dashed" | "dotted";

export type RelationLabelMode = "type" | "custom";

export const CONNECTOR_STROKE_STYLES: ConnectorStrokeStyle[] = ["solid", "dashed", "dotted"];

export const CONNECTOR_STROKE_STYLE_LABELS: Record<ConnectorStrokeStyle, string> = {
  solid: "Durchgezogen",
  dashed: "Gestrichelt",
  dotted: "Gepunktet",
};

const SVG_DASH: Record<ConnectorStrokeStyle, string | undefined> = {
  solid: undefined,
  dashed: "8 5",
  dotted: "2 3.5",
};

const CANVAS_DASH: Record<ConnectorStrokeStyle, number[]> = {
  solid: [],
  dashed: [8, 5],
  dotted: [2, 3.5],
};

export function isConnectorStrokeStyle(value: unknown): value is ConnectorStrokeStyle {
  return value === "solid" || value === "dashed" || value === "dotted";
}

export function isRelationLabelMode(value: unknown): value is RelationLabelMode {
  return value === "type" || value === "custom";
}

export function connectorStrokeDasharray(style: ConnectorStrokeStyle): string | undefined {
  return SVG_DASH[style];
}

export function connectorCanvasLineDash(style: ConnectorStrokeStyle): number[] {
  return CANVAS_DASH[style];
}

export function connectorMxDash(style: ConnectorStrokeStyle): {
  dashed?: 1;
  dashPattern?: string;
} {
  if (style === "dashed") return { dashed: 1, dashPattern: "8 5" };
  if (style === "dotted") return { dashed: 1, dashPattern: "1 3" };
  return {};
}

/** Hit-test width in world units so the line stays easy to click when zoomed out. */
export function connectorHitStrokeWidth(zoom: number): number {
  const z = zoom > 0 ? zoom : 1;
  return Math.max(16, 18 / z);
}

export function defaultRelationStrokeStyle(type: RelationType): ConnectorStrokeStyle {
  return type === "informs" || type === "annotates" ? "dashed" : "solid";
}

export function resolveRelationStrokeStyle(rel: {
  type: RelationType;
  strokeStyle?: ConnectorStrokeStyle;
}): ConnectorStrokeStyle {
  if (isConnectorStrokeStyle(rel.strokeStyle)) return rel.strokeStyle;
  return defaultRelationStrokeStyle(rel.type);
}

/** Caption drawn on the canvas. Empty string hides the text. */
export function relationCanvasCaption(rel: {
  type: RelationType;
  label?: string;
  labelMode?: RelationLabelMode;
}): string {
  if (rel.labelMode === "type") return RELATION_TYPE_LABELS[rel.type] ?? rel.type;
  if (rel.labelMode === "custom") return rel.label?.trim() ?? "";
  return rel.label?.trim() ?? "";
}
