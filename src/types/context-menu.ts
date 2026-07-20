export type ContextMenuTarget =
  | { kind: "element"; id: string }
  | { kind: "elements"; ids: string[] }
  | { kind: "relation"; id: string }
  | { kind: "swimlane"; id: string }
  | { kind: "boundedContext"; id: string }
  | { kind: "canvas"; worldX: number; worldY: number };

export interface ContextMenuState {
  x: number;
  y: number;
  target: ContextMenuTarget;
}
