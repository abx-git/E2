import type {
  BoundedContext,
  GlossaryEntry,
  StormElement,
  Swimlane,
  Timeline,
  Viewport,
  WorkshopFormat,
} from "@/types/storm-element";
import type { StormRelation } from "@/types/storm-relation";
import boardSnapshotV1Schema from "../../public/schemas/board-snapshot-v1.schema.json";

export const EXPORT_FORMAT = "event-storming-tool" as const;
export const EXPORT_VERSION = 1 as const;

/** Canonical schema URL (matches $id in board-snapshot-v1.schema.json). */
export const BOARD_SNAPSHOT_SCHEMA_ID =
  "https://abx-git.github.io/E2/schemas/board-snapshot-v1.schema.json" as const;

export const BOARD_SNAPSHOT_SCHEMA_FILENAME = "board-snapshot-v1.schema.json" as const;

/** JSON Schema document for BoardSnapshotV1 (for download / tooling). */
export const boardSnapshotSchema = boardSnapshotV1Schema;

export interface BoardSnapshotV1 {
  $schema?: string;
  format: typeof EXPORT_FORMAT;
  version: typeof EXPORT_VERSION;
  exportedAt: string;
  title: string;
  workshopFormat: WorkshopFormat;
  facilitatorEnabled: boolean;
  facilitatorPhase: number;
  elements: StormElement[];
  relations: StormRelation[];
  swimlanes: Swimlane[];
  boundedContexts: BoundedContext[];
  timeline: Timeline;
  viewport: Viewport;
  glossary: GlossaryEntry[];
  snapToTimeline: boolean;
  snapToGrid: boolean;
}

export interface BoardImportPayload {
  title: string;
  workshopFormat: WorkshopFormat;
  facilitatorEnabled: boolean;
  facilitatorPhase: number;
  elements: StormElement[];
  relations: StormRelation[];
  swimlanes: Swimlane[];
  boundedContexts: BoundedContext[];
  timeline: Timeline;
  viewport: Viewport;
  glossary: GlossaryEntry[];
  snapToTimeline: boolean;
  snapToGrid: boolean;
}

export function buildBoardSnapshot(state: BoardImportPayload): BoardSnapshotV1 {
  return {
    $schema: BOARD_SNAPSHOT_SCHEMA_ID,
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    ...state,
  };
}

export function parseExportedDocument(text: string): unknown {
  return JSON.parse(text) as unknown;
}

export function isBoardSnapshot(doc: unknown): doc is BoardSnapshotV1 {
  if (!doc || typeof doc !== "object") return false;
  const d = doc as Record<string, unknown>;
  return d.format === EXPORT_FORMAT && d.version === EXPORT_VERSION;
}

export function boardSnapshotToReplacePayload(snap: BoardSnapshotV1): BoardImportPayload {
  return {
    title: snap.title,
    workshopFormat: snap.workshopFormat,
    facilitatorEnabled: snap.facilitatorEnabled,
    facilitatorPhase: snap.facilitatorPhase,
    elements: snap.elements,
    relations: snap.relations,
    swimlanes: snap.swimlanes,
    boundedContexts: snap.boundedContexts,
    timeline: snap.timeline,
    viewport: snap.viewport,
    glossary: snap.glossary ?? [],
    snapToTimeline: snap.snapToTimeline ?? true,
    snapToGrid: snap.snapToGrid ?? false,
  };
}

export function boardImportPayloadFromExportText(text: string): BoardImportPayload | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    const doc = parseExportedDocument(trimmed);
    if (!isBoardSnapshot(doc)) return null;
    return boardSnapshotToReplacePayload(doc);
  } catch {
    return null;
  }
}

export function stringifyExportedDocument(snap: BoardSnapshotV1): string {
  return JSON.stringify(snap, null, 2);
}

/** Pretty-printed JSON Schema for BoardSnapshotV1. */
export function stringifyBoardSnapshotSchema(): string {
  return JSON.stringify(boardSnapshotSchema, null, 2);
}

export function stableBoardStateKey(payload: BoardImportPayload): string {
  return JSON.stringify({
    title: payload.title,
    workshopFormat: payload.workshopFormat,
    facilitatorEnabled: payload.facilitatorEnabled,
    facilitatorPhase: payload.facilitatorPhase,
    elements: [...payload.elements].sort((a, b) => a.id.localeCompare(b.id)),
    relations: [...payload.relations].sort((a, b) => a.id.localeCompare(b.id)),
    swimlanes: [...payload.swimlanes].sort((a, b) => a.id.localeCompare(b.id)),
    boundedContexts: [...payload.boundedContexts].sort((a, b) => a.id.localeCompare(b.id)),
    timeline: payload.timeline,
    glossary: [...payload.glossary].sort((a, b) => a.term.localeCompare(b.term)),
    snapToTimeline: payload.snapToTimeline,
    snapToGrid: payload.snapToGrid,
  });
}

export function boardExportTextsEquivalent(a: string, b: string): boolean {
  const pa = boardImportPayloadFromExportText(a);
  const pb = boardImportPayloadFromExportText(b);
  if (!pa || !pb) return a.trim() === b.trim();
  return stableBoardStateKey(pa) === stableBoardStateKey(pb);
}
