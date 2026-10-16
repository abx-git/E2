import type { LineArrowHead } from "@/types/canvas-annotation";
import type { ProgressMark } from "@/lib/progress-mark";
import type { ContextMapPattern, RelationType } from "@/types/storm-relation";

/** Where a connector end attaches on the board. */
export type ConnectorEndpoint =
  | { attach: "element"; id: string }
  | { attach: "boundedContext"; id: string }
  | { attach: "swimlane"; id: string }
  | { attach: "point"; x: number; y: number };

export interface BoardConnector {
  id: string;
  source: ConnectorEndpoint;
  target: ConnectorEndpoint;
  arrowHead?: LineArrowHead;
  label?: string;
  /** Sticky relations: type caption vs custom label. */
  labelMode?: "type" | "custom";
  relationType?: RelationType;
  contextMapPattern?: ContextMapPattern;
  strokeStyle?: "solid" | "dashed" | "dotted";
  color?: string;
  progressMark?: ProgressMark;
}

export const DEFAULT_CONNECTOR_ARROW: LineArrowHead = "end";
