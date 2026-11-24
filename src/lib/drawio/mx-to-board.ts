import type { BoardBounds } from "@/lib/drawio/board-to-mx";
import { e2RefFromMxCell } from "@/lib/drawio/cell-ids";

export interface DrawioElementLayoutPatch {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DrawioSwimlaneLayoutPatch {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DrawioBoundedContextLayoutPatch {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DrawioLayoutPatches {
  elements: DrawioElementLayoutPatch[];
  swimlanes: DrawioSwimlaneLayoutPatch[];
  boundedContexts: DrawioBoundedContextLayoutPatch[];
  removedElementIds: string[];
  removedSwimlaneIds: string[];
  removedBoundedContextIds: string[];
  removedConnectorIds: string[];
}

export interface MxCellLike {
  id: string;
  style?: string;
  vertex?: boolean;
  edge?: boolean;
  geometry?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };
}

function toWorldX(mxX: number, bounds: BoardBounds): number {
  return mxX - bounds.ox;
}

function toWorldY(mxY: number, bounds: BoardBounds): number {
  return mxY - bounds.oy;
}

export function layoutPatchesFromMxCells(
  cells: MxCellLike[],
  bounds: BoardBounds,
  previousDomainIds?: {
    elementIds: Set<string>;
    swimlaneIds: Set<string>;
    boundedContextIds: Set<string>;
    connectorIds: Set<string>;
  },
): DrawioLayoutPatches {
  const elements: DrawioElementLayoutPatch[] = [];
  const swimlanes: DrawioSwimlaneLayoutPatch[] = [];
  const boundedContexts: DrawioBoundedContextLayoutPatch[] = [];
  const seenElement = new Set<string>();
  const seenLane = new Set<string>();
  const seenBc = new Set<string>();
  const seenConn = new Set<string>();

  for (const cell of cells) {
    if (!cell.vertex && !cell.edge) continue;
    if (cell.id === "0" || cell.id === "1") continue;
    const ref = e2RefFromMxCell(cell.id, cell.style);
    if (ref.kind === "timeline" || ref.kind === "unknown") continue;

    if (ref.kind === "connector" && ref.e2Id) {
      seenConn.add(ref.e2Id);
      continue;
    }

    if (!cell.vertex || !cell.geometry) continue;
    const { x = 0, y = 0, width = 0, height = 0 } = cell.geometry;
    if (!ref.e2Id) continue;

    if (ref.kind === "element") {
      seenElement.add(ref.e2Id);
      elements.push({
        id: ref.e2Id,
        x: toWorldX(x, bounds),
        y: toWorldY(y, bounds),
        width,
        height,
      });
    } else if (ref.kind === "swimlane") {
      seenLane.add(ref.e2Id);
      swimlanes.push({
        id: ref.e2Id,
        x: toWorldX(x, bounds),
        y: toWorldY(y, bounds),
        width,
        height,
      });
    } else if (ref.kind === "boundedContext") {
      seenBc.add(ref.e2Id);
      boundedContexts.push({
        id: ref.e2Id,
        x: toWorldX(x, bounds),
        y: toWorldY(y, bounds),
        width,
        height,
      });
    }
  }

  const removedElementIds = previousDomainIds
    ? [...previousDomainIds.elementIds].filter((id) => !seenElement.has(id))
    : [];
  const removedSwimlaneIds = previousDomainIds
    ? [...previousDomainIds.swimlaneIds].filter((id) => !seenLane.has(id))
    : [];
  const removedBoundedContextIds = previousDomainIds
    ? [...previousDomainIds.boundedContextIds].filter((id) => !seenBc.has(id))
    : [];
  const removedConnectorIds = previousDomainIds
    ? [...previousDomainIds.connectorIds].filter((id) => !seenConn.has(id))
    : [];

  return {
    elements,
    swimlanes,
    boundedContexts,
    removedElementIds,
    removedSwimlaneIds,
    removedBoundedContextIds,
    removedConnectorIds,
  };
}

/** Selection ids derived from mxGraph cell ids / styles. */
export function selectionFromMxCells(
  selectedCells: Array<{ id: string; style?: string }>,
): {
  elementIds: string[];
  swimlaneIds: string[];
  boundedContextIds: string[];
  connectorIds: string[];
} {
  const elementIds: string[] = [];
  const swimlaneIds: string[] = [];
  const boundedContextIds: string[] = [];
  const connectorIds: string[] = [];
  for (const cell of selectedCells) {
    const ref = e2RefFromMxCell(cell.id, cell.style);
    if (!ref.e2Id) continue;
    switch (ref.kind) {
      case "element":
        elementIds.push(ref.e2Id);
        break;
      case "swimlane":
        swimlaneIds.push(ref.e2Id);
        break;
      case "boundedContext":
        boundedContextIds.push(ref.e2Id);
        break;
      case "connector":
        connectorIds.push(ref.e2Id);
        break;
      default:
        break;
    }
  }
  return { elementIds, swimlaneIds, boundedContextIds, connectorIds };
}