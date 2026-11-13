import type { BoardAppearance } from "@/lib/board-appearance";

export type DiagramStyle = "clean" | "scribble";

export const DIAGRAM_STYLES: DiagramStyle[] = ["clean", "scribble"];

export const SCRIBBLE_STROKE_FILTER = "url(#e2-scribble-stroke)";

export function normalizeDiagramStyle(raw: unknown): DiagramStyle {
  return raw === "scribble" ? "scribble" : "clean";
}

export function isScribbleDiagram(appearance: BoardAppearance): boolean {
  return appearance.diagramStyle === "scribble";
}

export function scribbleStrokeFilter(appearance: BoardAppearance): string | undefined {
  return isScribbleDiagram(appearance) ? SCRIBBLE_STROKE_FILTER : undefined;
}
