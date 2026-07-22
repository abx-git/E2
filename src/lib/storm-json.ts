import type {
  BoundedContext,
  GlossaryEntry,
  ModelingMode,
  StormElement,
  Swimlane,
  Timeline,
  Viewport,
  WorkshopFormat,
} from "@/types/storm-element";
import {
  DEFAULT_MODELING_MODE,
  DEFAULT_TIMELINE,
  DEFAULT_VIEWPORT,
  normalizeModelingMode,
} from "@/types/storm-element";
import type { ContextRelation, StormRelation } from "@/types/storm-relation";
import {
  normalizeAppearance,
  type BoardAppearance,
  DEFAULT_APPEARANCE,
} from "@/lib/board-appearance";
import { generateStormId } from "@/lib/storm-id";
import boardSnapshotV2Schema from "../../public/schemas/board-snapshot-v2.schema.json";

export const EXPORT_FORMAT = "event-storming-tool" as const;
export const EXPORT_VERSION = 2 as const;
export const EXPORT_VERSION_V1 = 1 as const;

/** Canonical schema URL (matches $id in board-snapshot-v2.schema.json). */
export const BOARD_SNAPSHOT_SCHEMA_ID =
  "https://abx-git.github.io/E2/schemas/board-snapshot-v2.schema.json" as const;

export const BOARD_SNAPSHOT_SCHEMA_FILENAME = "board-snapshot-v2.schema.json" as const;

/** JSON Schema document for BoardSnapshotV2 (for download / tooling). */
export const boardSnapshotSchema = boardSnapshotV2Schema;

/** One diagram tab / view inside a board document. */
export interface BoardView {
  id: string;
  name: string;
  modelingMode: ModelingMode;
  workshopFormat: WorkshopFormat;
  facilitatorEnabled: boolean;
  facilitatorPhase: number;
  elements: StormElement[];
  relations: StormRelation[];
  contextRelations: ContextRelation[];
  swimlanes: Swimlane[];
  boundedContexts: BoundedContext[];
  timeline: Timeline;
  viewport: Viewport;
  snapToTimeline: boolean;
  snapToGrid: boolean;
}

/** Runtime / on-disk document body (multi-view). */
export interface BoardImportPayload {
  title: string;
  glossary: GlossaryEntry[];
  appearance: BoardAppearance;
  /** When true in collab, activeViewId is shared; when false, each client keeps local tab. */
  workshopMode: boolean;
  activeViewId: string;
  views: BoardView[];
}

/** Flat slice of project globals + one view — used by canvas exports (SVG/PNG/MD). */
export interface BoardActiveSlice {
  title: string;
  glossary: GlossaryEntry[];
  appearance: BoardAppearance;
  modelingMode: ModelingMode;
  workshopFormat: WorkshopFormat;
  facilitatorEnabled: boolean;
  facilitatorPhase: number;
  elements: StormElement[];
  relations: StormRelation[];
  contextRelations: ContextRelation[];
  swimlanes: Swimlane[];
  boundedContexts: BoundedContext[];
  timeline: Timeline;
  viewport: Viewport;
  snapToTimeline: boolean;
  snapToGrid: boolean;
}

export interface BoardSnapshotV2 {
  $schema?: string;
  format: typeof EXPORT_FORMAT;
  version: typeof EXPORT_VERSION;
  exportedAt: string;
  title: string;
  glossary: GlossaryEntry[];
  appearance: BoardAppearance;
  workshopMode: boolean;
  activeViewId: string;
  views: BoardView[];
}

/** Legacy flat v1 snapshot (read-only migration). */
export interface BoardSnapshotV1 {
  $schema?: string;
  format: typeof EXPORT_FORMAT;
  version: typeof EXPORT_VERSION_V1;
  exportedAt: string;
  title: string;
  modelingMode?: ModelingMode;
  workshopFormat: WorkshopFormat;
  facilitatorEnabled: boolean;
  facilitatorPhase: number;
  elements: StormElement[];
  relations: StormRelation[];
  contextRelations?: ContextRelation[];
  swimlanes: Swimlane[];
  boundedContexts: BoundedContext[];
  timeline: Timeline;
  viewport: Viewport;
  glossary: GlossaryEntry[];
  appearance?: BoardAppearance;
  snapToTimeline?: boolean;
  snapToGrid?: boolean;
}

export type BoardSnapshot = BoardSnapshotV2;

export function createEmptyBoardView(
  overrides: Partial<BoardView> & Pick<BoardView, "id" | "name">,
): BoardView {
  return {
    modelingMode: DEFAULT_MODELING_MODE,
    workshopFormat: "free",
    facilitatorEnabled: false,
    facilitatorPhase: 0,
    elements: [],
    relations: [],
    contextRelations: [],
    swimlanes: [],
    boundedContexts: [],
    timeline: { ...DEFAULT_TIMELINE },
    viewport: { ...DEFAULT_VIEWPORT },
    snapToTimeline: true,
    snapToGrid: false,
    ...overrides,
  };
}

export function createDefaultBoardDocument(
  overrides: Partial<BoardImportPayload> = {},
): BoardImportPayload {
  const viewId = overrides.activeViewId ?? generateStormId();
  const defaultView = createEmptyBoardView({ id: viewId, name: "Board" });
  const views = overrides.views?.length ? overrides.views : [defaultView];
  const activeViewId =
    overrides.activeViewId && views.some((v) => v.id === overrides.activeViewId)
      ? overrides.activeViewId
      : views[0]!.id;
  return {
    title: overrides.title ?? "Neues Event Storming Board",
    glossary: overrides.glossary ?? [],
    appearance: overrides.appearance
      ? normalizeAppearance(overrides.appearance)
      : { ...DEFAULT_APPEARANCE },
    workshopMode: overrides.workshopMode ?? false,
    activeViewId,
    views,
  };
}

/** Older boards may lack x/width; default to a full-width band. */
export function normalizeSwimlane(lane: Swimlane): Swimlane {
  const raw = lane as Swimlane & { x?: number; width?: number };
  return {
    ...lane,
    x: typeof raw.x === "number" ? raw.x : 0,
    width: typeof raw.width === "number" && raw.width > 0 ? raw.width : 4000,
  };
}

export function normalizeTimeline(timeline: Timeline): Timeline {
  return {
    ...timeline,
    visible: timeline.visible !== false,
  };
}

export function normalizeBoardView(raw: Partial<BoardView> & { id?: string; name?: string }): BoardView {
  const id = raw.id?.trim() || generateStormId();
  return createEmptyBoardView({
    id,
    name: raw.name?.trim() || "Board",
    modelingMode: normalizeModelingMode(raw.modelingMode),
    workshopFormat: raw.workshopFormat ?? "free",
    facilitatorEnabled: Boolean(raw.facilitatorEnabled),
    facilitatorPhase: Number(raw.facilitatorPhase) || 0,
    elements: Array.isArray(raw.elements) ? raw.elements : [],
    relations: Array.isArray(raw.relations) ? raw.relations : [],
    contextRelations: Array.isArray(raw.contextRelations) ? raw.contextRelations : [],
    swimlanes: Array.isArray(raw.swimlanes) ? raw.swimlanes.map(normalizeSwimlane) : [],
    boundedContexts: Array.isArray(raw.boundedContexts) ? raw.boundedContexts : [],
    timeline: raw.timeline ? normalizeTimeline({ ...DEFAULT_TIMELINE, ...raw.timeline }) : { ...DEFAULT_TIMELINE },
    viewport: raw.viewport ? { ...DEFAULT_VIEWPORT, ...raw.viewport } : { ...DEFAULT_VIEWPORT },
    snapToTimeline: raw.snapToTimeline ?? true,
    snapToGrid: raw.snapToGrid ?? false,
  });
}

export function migrateV1ToDocument(snap: BoardSnapshotV1): BoardImportPayload {
  const viewId = generateStormId();
  return {
    title: snap.title,
    glossary: snap.glossary ?? [],
    appearance: normalizeAppearance(snap.appearance),
    workshopMode: false,
    activeViewId: viewId,
    views: [
      normalizeBoardView({
        id: viewId,
        name: "Board",
        modelingMode: snap.modelingMode,
        workshopFormat: snap.workshopFormat,
        facilitatorEnabled: snap.facilitatorEnabled,
        facilitatorPhase: snap.facilitatorPhase,
        elements: snap.elements,
        relations: snap.relations,
        contextRelations: snap.contextRelations,
        swimlanes: snap.swimlanes,
        boundedContexts: snap.boundedContexts,
        timeline: snap.timeline,
        viewport: snap.viewport,
        snapToTimeline: snap.snapToTimeline,
        snapToGrid: snap.snapToGrid,
      }),
    ],
  };
}

export function normalizeBoardDocument(raw: Partial<BoardImportPayload>): BoardImportPayload {
  const views = (Array.isArray(raw.views) ? raw.views : []).map((v) => normalizeBoardView(v));
  if (views.length === 0) {
    return createDefaultBoardDocument({
      title: raw.title ?? "Board",
      glossary: Array.isArray(raw.glossary) ? raw.glossary : [],
      appearance: normalizeAppearance(raw.appearance),
      workshopMode: Boolean(raw.workshopMode),
    });
  }
  const activeViewId =
    raw.activeViewId && views.some((v) => v.id === raw.activeViewId)
      ? raw.activeViewId
      : views[0]!.id;
  return {
    title: raw.title ?? "Board",
    glossary: Array.isArray(raw.glossary) ? raw.glossary : [],
    appearance: normalizeAppearance(raw.appearance),
    workshopMode: Boolean(raw.workshopMode),
    activeViewId,
    views,
  };
}

export function getActiveView(doc: BoardImportPayload): BoardView {
  return doc.views.find((v) => v.id === doc.activeViewId) ?? doc.views[0]!;
}

export function activeSliceFromDocument(doc: BoardImportPayload): BoardActiveSlice {
  const view = getActiveView(doc);
  return {
    title: doc.title,
    glossary: doc.glossary,
    appearance: doc.appearance,
    modelingMode: view.modelingMode,
    workshopFormat: view.workshopFormat,
    facilitatorEnabled: view.facilitatorEnabled,
    facilitatorPhase: view.facilitatorPhase,
    elements: view.elements,
    relations: view.relations,
    contextRelations: view.contextRelations,
    swimlanes: view.swimlanes,
    boundedContexts: view.boundedContexts,
    timeline: view.timeline,
    viewport: view.viewport,
    snapToTimeline: view.snapToTimeline,
    snapToGrid: view.snapToGrid,
  };
}

export function viewHasContent(view: BoardView): boolean {
  return (
    view.elements.length > 0 ||
    view.relations.length > 0 ||
    view.contextRelations.length > 0 ||
    view.swimlanes.length > 0 ||
    view.boundedContexts.length > 0
  );
}

export function documentHasContent(doc: BoardImportPayload): boolean {
  return doc.glossary.length > 0 || doc.views.some(viewHasContent);
}

export function buildBoardSnapshot(state: BoardImportPayload): BoardSnapshotV2 {
  const doc = normalizeBoardDocument(state);
  return {
    $schema: BOARD_SNAPSHOT_SCHEMA_ID,
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    title: doc.title,
    glossary: doc.glossary,
    appearance: normalizeAppearance(doc.appearance),
    workshopMode: doc.workshopMode,
    activeViewId: doc.activeViewId,
    views: doc.views,
  };
}

export function parseExportedDocument(text: string): unknown {
  return JSON.parse(text) as unknown;
}

export function isBoardSnapshotV1(doc: unknown): doc is BoardSnapshotV1 {
  if (!doc || typeof doc !== "object") return false;
  const d = doc as Record<string, unknown>;
  return d.format === EXPORT_FORMAT && d.version === EXPORT_VERSION_V1;
}

export function isBoardSnapshotV2(doc: unknown): doc is BoardSnapshotV2 {
  if (!doc || typeof doc !== "object") return false;
  const d = doc as Record<string, unknown>;
  return d.format === EXPORT_FORMAT && d.version === EXPORT_VERSION;
}

/** Accepts v1 or v2 on-disk snapshots. */
export function isBoardSnapshot(doc: unknown): doc is BoardSnapshotV1 | BoardSnapshotV2 {
  return isBoardSnapshotV1(doc) || isBoardSnapshotV2(doc);
}

export function boardSnapshotToReplacePayload(
  snap: BoardSnapshotV1 | BoardSnapshotV2,
): BoardImportPayload {
  if (isBoardSnapshotV1(snap)) {
    return migrateV1ToDocument(snap);
  }
  return normalizeBoardDocument(snap);
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

export function stringifyExportedDocument(snap: BoardSnapshotV2): string {
  return JSON.stringify(snap, null, 2);
}

/** Pretty-printed JSON Schema for BoardSnapshotV2. */
export function stringifyBoardSnapshotSchema(): string {
  return JSON.stringify(boardSnapshotSchema, null, 2);
}

function stableViewKey(view: BoardView): unknown {
  return {
    id: view.id,
    name: view.name,
    modelingMode: view.modelingMode,
    workshopFormat: view.workshopFormat,
    facilitatorEnabled: view.facilitatorEnabled,
    facilitatorPhase: view.facilitatorPhase,
    elements: [...view.elements].sort((a, b) => a.id.localeCompare(b.id)),
    relations: [...view.relations].sort((a, b) => a.id.localeCompare(b.id)),
    contextRelations: [...view.contextRelations].sort((a, b) => a.id.localeCompare(b.id)),
    swimlanes: [...view.swimlanes].sort((a, b) => a.id.localeCompare(b.id)),
    boundedContexts: [...view.boundedContexts].sort((a, b) => a.id.localeCompare(b.id)),
    timeline: view.timeline,
    snapToTimeline: view.snapToTimeline,
    snapToGrid: view.snapToGrid,
  };
}

export function stableBoardStateKey(payload: BoardImportPayload): string {
  const doc = normalizeBoardDocument(payload);
  return JSON.stringify({
    title: doc.title,
    glossary: [...doc.glossary].sort((a, b) => a.term.localeCompare(b.term)),
    appearance: doc.appearance,
    workshopMode: doc.workshopMode,
    activeViewId: doc.activeViewId,
    views: [...doc.views]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(stableViewKey),
  });
}

export function boardExportTextsEquivalent(a: string, b: string): boolean {
  const pa = boardImportPayloadFromExportText(a);
  const pb = boardImportPayloadFromExportText(b);
  if (!pa || !pb) return a.trim() === b.trim();
  return stableBoardStateKey(pa) === stableBoardStateKey(pb);
}
