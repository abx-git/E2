import type { Viewport } from "@/types/storm-element";

export type LineArrowHead = "none" | "start" | "end" | "both";

export interface CanvasLine {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  arrowHead?: LineArrowHead;
  label?: string;
  color?: string;
  strokeStyle?: "solid" | "dashed" | "dotted";
}

export const LINE_ARROW_HEADS: LineArrowHead[] = ["none", "end", "start", "both"];

/** Arrow styles offered for board connectors (toolbar + inspector). */
export const CONNECTOR_ARROW_HEADS: LineArrowHead[] = ["end", "start", "both"];

export const LINE_ARROW_HEAD_LABELS: Record<LineArrowHead, string> = {
  none: "Ohne Pfeil",
  end: "Pfeil Ende",
  start: "Pfeil Start",
  both: "Pfeil beidseitig",
};

export interface ViewBookmark {
  id: string;
  name: string;
  viewId: string;
  viewport: Viewport;
}
