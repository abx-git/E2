import {
  connectorStrokeDasharray,
  isConnectorStrokeStyle,
  relationCanvasCaption,
  resolveRelationStrokeStyle,
  type ConnectorStrokeStyle,
} from "@/lib/connector-style";
import { CONTEXT_MAP_PATTERN_LABELS } from "@/types/storm-relation";
import type { BoardConnector } from "@/types/board-connector";
import type { LineArrowHead } from "@/types/canvas-annotation";

const CONTEXT_PATTERN_STYLE: Record<
  string,
  { stroke: string; dash?: string; width: number; double?: boolean }
> = {
  partnership: { stroke: "#2a9d8f", width: 3 },
  sharedKernel: { stroke: "#c9a227", width: 2.5, double: true },
  customerSupplier: { stroke: "#457b9d", width: 2.5 },
  conformist: { stroke: "#6c757d", width: 2, dash: "8 4" },
  antiCorruptionLayer: { stroke: "#e76f51", width: 2.5, dash: "4 3" },
  openHostService: { stroke: "#2a9d8f", width: 2.5 },
  publishedLanguage: { stroke: "#264653", width: 2, dash: "2 2" },
  separateWays: { stroke: "#adb5bd", width: 2, dash: "10 6" },
};

export function connectorArrowHead(c: BoardConnector): LineArrowHead {
  return c.arrowHead ?? "end";
}

export function boardConnectorCaption(c: BoardConnector): string {
  if (c.relationType) {
    return relationCanvasCaption({
      type: c.relationType,
      label: c.label,
      labelMode: c.labelMode,
    });
  }
  if (c.contextMapPattern) {
    return c.label ?? CONTEXT_MAP_PATTERN_LABELS[c.contextMapPattern];
  }
  return c.label?.trim() ?? "";
}

export function resolveBoardConnectorStrokeStyle(c: BoardConnector): ConnectorStrokeStyle {
  if (isConnectorStrokeStyle(c.strokeStyle)) return c.strokeStyle;
  if (c.relationType) {
    return resolveRelationStrokeStyle({ type: c.relationType, strokeStyle: c.strokeStyle });
  }
  return "solid";
}

export function boardConnectorStrokeDash(c: BoardConnector): string | undefined {
  if (c.contextMapPattern) {
    const preset = CONTEXT_PATTERN_STYLE[c.contextMapPattern];
    return preset?.dash;
  }
  return connectorStrokeDasharray(resolveBoardConnectorStrokeStyle(c));
}

export function boardConnectorStrokeColor(
  c: BoardConnector,
  selected: boolean,
): string {
  if (selected) return "#2a9d8f";
  if (c.color) return c.color;
  if (c.contextMapPattern) {
    return CONTEXT_PATTERN_STYLE[c.contextMapPattern]?.stroke ?? "#457b9d";
  }
  return "#8b9aab";
}

export function boardConnectorStrokeWidth(c: BoardConnector, selected: boolean): number {
  if (c.contextMapPattern) {
    const w = CONTEXT_PATTERN_STYLE[c.contextMapPattern]?.width ?? 2.5;
    return selected ? w + 1 : w;
  }
  return selected ? 3 : 2;
}

export function boardConnectorDoubleLine(c: BoardConnector): boolean {
  return c.contextMapPattern === "sharedKernel";
}
