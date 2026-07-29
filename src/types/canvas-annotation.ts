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
}

export const LINE_ARROW_HEADS: LineArrowHead[] = ["none", "end", "start", "both"];

export const LINE_ARROW_HEAD_LABELS: Record<LineArrowHead, string> = {
  none: "Ohne Pfeil",
  end: "Pfeil Ende",
  start: "Pfeil Start",
  both: "Pfeil beidseitig",
};

export interface ViewBookmark {
  id: string;
  name: string;
  viewport: Viewport;
}
