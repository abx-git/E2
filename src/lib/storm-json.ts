import type {
  BoundedContext,
  ElementType,
  GlossaryEntry,
  ModelingMode,
  StormElement,
  Swimlane,
  Timeline,
  Viewport,
  WorkshopFormat,
} from "@/types/storm-element";
import type { ActionItem } from "@/types/action-item";
import type { ActionsView } from "@/types/actions-view";
import { normalizeActionsView } from "@/lib/architecture-measures";
import { normalizeActionItems } from "@/lib/action-items";
import type { CanvasLine, ViewBookmark } from "@/types/canvas-annotation";
import { normalizeCanvasLines, normalizeViewBookmarks } from "@/lib/canvas-annotations";
import {
  DEFAULT_MODELING_MODE,
  DEFAULT_TIMELINE,
  defaultTimelineForModelingMode,
  modelingModeUsesTimelineByDefault,
  DEFAULT_VIEWPORT,
  normalizeModelingMode,
  normalizeWorkshopFormatForMode,
} from "@/types/storm-element";
import type { BoardConnector } from "@/types/board-connector";
import {
  connectorsToLegacy,
  mergeLegacyIntoConnectors,
  normalizeBoardConnectors,
} from "@/lib/board-connector-migrate";
import type { ContextRelation, StormRelation } from "@/types/storm-relation";
import {
  normalizeAppearance,
  type BoardAppearance,
  DEFAULT_APPEARANCE,
} from "@/lib/board-appearance";
import { generateStormId } from "@/lib/storm-id";
import type { CustomCardType } from "@/lib/custom-card-types";
import {
  createDefaultCustomCardTypes,
  normalizeCustomCardTypes,
} from "@/lib/custom-card-types";
import { isKnownElementType } from "@/lib/element-styles";
import boardSnapshotV2Schema from "../../public/schemas/board-snapshot-v2.schema.json";

function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/** Migrate legacy types and coerce unknown JSON stickies so canvas styles always resolve. */
export function normalizeStormElement(raw: StormElement | Record<string, unknown>): StormElement {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const el = source as unknown as StormElement;
  const meta = { ...(el.metadata ?? {}) } as Record<string, unknown>;

  let type: ElementType = "note";
  if (typeof source.type === "string") {
    if (source.type === "arc42Section") {
      delete meta.arc42SectionNumber;
      type = "archBlackbox";
    } else if (isKnownElementType(source.type)) {
      type = source.type;
    }
  }

  const next: StormElement = {
    ...el,
    id: typeof el.id === "string" && el.id.trim() ? el.id.trim() : generateStormId(),
    type,
    label: typeof el.label === "string" ? el.label : "",
    x: asFiniteNumber(el.x) ?? 0,
    y: asFiniteNumber(el.y) ?? 0,
    metadata: Object.keys(meta).length ? (meta as StormElement["metadata"]) : undefined,
  };

  const rotation = asFiniteNumber(el.rotation);
  if (rotation !== undefined) next.rotation = rotation;
  else delete next.rotation;

  const width = asFiniteNumber(el.width);
  if (width !== undefined && width > 0) next.width = width;
  else delete next.width;

  const height = asFiniteNumber(el.height);
  if (height !== undefined && height > 0) next.height = height;
  else delete next.height;

  return next;
}

export const EXPORT_FORMAT = "event-storming-tool" as const;
export const EXPORT_VERSION = 2 as const;
export const EXPORT_VERSION_V1 = 1 as const;

/** Canonical schema URL (matches $id in board-snapshot-v2.schema.json). */
export const BOARD_SNAPSHOT_SCHEMA_ID =
  "https://abx-git.github.io/E2/schemas/board-snapshot-v2.schema.json" as const;

export const BOARD_SNAPSHOT_SCHEMA_FILENAME = "board-snapshot-v2.schema.json" as const;

/** JSON Schema document for BoardSnapshotV2 (for download / tooling). */
export const boardSnapshotSchema = boardSnapshotV2Schema;

/** One canvas diagram tab inside a board document. */
export interface CanvasBoardView {
  id: string;
  name: string;
  /** Omitted or `canvas` for legacy snapshots. */
  type?: "canvas";
  modelingMode: ModelingMode;
  workshopFormat: WorkshopFormat;
  facilitatorEnabled: boolean;
  facilitatorPhase: number;
  elements: StormElement[];
  connectors: BoardConnector[];
  relations: StormRelation[];
  contextRelations: ContextRelation[];
  swimlanes: Swimlane[];
  boundedContexts: BoundedContext[];
  canvasLines: CanvasLine[];
  timeline: Timeline;
  viewport: Viewport;
  snapToTimeline: boolean;
  snapToGrid: boolean;
  /** Freeform mode: user-defined card types (stereotypes) for this view. */
  customCardTypes: CustomCardType[];
}

/** Canvas tab or architecture-measures (`actions`) tab. */
export type BoardView = CanvasBoardView | ActionsView;

export function isActionsView(view: BoardView): view is ActionsView {
  return (view as ActionsView).type === "actions";
}

export function isCanvasBoardView(view: BoardView): view is CanvasBoardView {
  return !isActionsView(view);
}

/** Runtime / on-disk document body (multi-view). */
export interface BoardImportPayload {
  title: string;
  glossary: GlossaryEntry[];
  actionItems?: ActionItem[];
  bookmarks?: ViewBookmark[];
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
  actionItems: ActionItem[];
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
  canvasLines: CanvasLine[];
  /** Canonical connectors — export uses these for canvas-parity styling and geometry. */
  connectors?: BoardConnector[];
  timeline: Timeline;
  viewport: Viewport;
  snapToTimeline: boolean;
  snapToGrid: boolean;
  customCardTypes: CustomCardType[];
}

export interface BoardSnapshotV2 {
  $schema?: string;
  format: typeof EXPORT_FORMAT;
  version: typeof EXPORT_VERSION;
  exportedAt: string;
  title: string;
  glossary: GlossaryEntry[];
  actionItems?: ActionItem[];
  bookmarks?: ViewBookmark[];
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
  bookmarks?: ViewBookmark[];
  appearance?: BoardAppearance;
  snapToTimeline?: boolean;
  snapToGrid?: boolean;
}

export type BoardSnapshot = BoardSnapshotV2;

export function createEmptyBoardView(
  overrides: Partial<CanvasBoardView> & Pick<CanvasBoardView, "id" | "name">,
): CanvasBoardView {
  const modelingMode = overrides.modelingMode ?? DEFAULT_MODELING_MODE;
  const seededTypes =
    overrides.customCardTypes !== undefined
      ? normalizeCustomCardTypes(overrides.customCardTypes)
      : modelingMode === "freeform"
        ? createDefaultCustomCardTypes()
        : [];
  return {
    workshopFormat: "free",
    facilitatorEnabled: false,
    facilitatorPhase: 0,
    elements: [],
    connectors: [],
    relations: [],
    contextRelations: [],
    swimlanes: [],
    boundedContexts: [],
    canvasLines: [],
    timeline: defaultTimelineForModelingMode(modelingMode),
    viewport: { ...DEFAULT_VIEWPORT },
    snapToTimeline: modelingModeUsesTimelineByDefault(modelingMode),
    snapToGrid: false,
    ...overrides,
    modelingMode,
    customCardTypes: seededTypes,
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
    actionItems: overrides.actionItems ?? [],
    bookmarks: overrides.bookmarks ?? [],
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

export function normalizeTimeline(timeline: Timeline, modelingMode: ModelingMode): Timeline {
  const defaultVisible = modelingModeUsesTimelineByDefault(modelingMode);
  return {
    ...timeline,
    visible:
      timeline.visible === undefined ? defaultVisible : timeline.visible !== false,
  };
}

export function normalizeBoardView(
  raw: Partial<CanvasBoardView> & { id?: string; name?: string },
): CanvasBoardView {
  const id = raw.id?.trim() || generateStormId();
  const modelingMode = normalizeModelingMode(raw.modelingMode, raw.workshopFormat);
  const workshopFormat = normalizeWorkshopFormatForMode(raw.workshopFormat ?? "free", modelingMode);
  const base = createEmptyBoardView({
    id,
    name: raw.name?.trim() || "Board",
    modelingMode,
    workshopFormat,
    facilitatorEnabled: Boolean(raw.facilitatorEnabled),
    facilitatorPhase: Number(raw.facilitatorPhase) || 0,
    elements: Array.isArray(raw.elements)
      ? raw.elements
          .filter((entry): entry is StormElement => Boolean(entry) && typeof entry === "object")
          .map(normalizeStormElement)
      : [],
    relations: Array.isArray(raw.relations) ? raw.relations : [],
    contextRelations: Array.isArray(raw.contextRelations) ? raw.contextRelations : [],
    swimlanes: Array.isArray(raw.swimlanes) ? raw.swimlanes.map(normalizeSwimlane) : [],
    boundedContexts: Array.isArray(raw.boundedContexts) ? raw.boundedContexts : [],
    canvasLines: normalizeCanvasLines(raw.canvasLines),
    timeline: normalizeTimeline(
      { ...defaultTimelineForModelingMode(modelingMode), ...raw.timeline },
      modelingMode,
    ),
    viewport: raw.viewport ? { ...DEFAULT_VIEWPORT, ...raw.viewport } : { ...DEFAULT_VIEWPORT },
    snapToTimeline:
      raw.snapToTimeline ?? modelingModeUsesTimelineByDefault(modelingMode),
    snapToGrid: raw.snapToGrid ?? false,
    customCardTypes: normalizeCustomCardTypes(raw.customCardTypes),
  });
  const connectors = mergeLegacyIntoConnectors(
    normalizeBoardConnectors(raw.connectors),
    base.relations,
    base.contextRelations,
    base.canvasLines,
  );
  const legacy = connectorsToLegacy(connectors);
  return {
    ...base,
    connectors,
    relations: legacy.relations,
    contextRelations: legacy.contextRelations,
    canvasLines: legacy.canvasLines,
  };
}

export function migrateV1ToDocument(snap: BoardSnapshotV1): BoardImportPayload {
  const viewId = generateStormId();
  return {
    title: snap.title,
    glossary: snap.glossary ?? [],
    actionItems: [],
    bookmarks: normalizeViewBookmarks(snap.bookmarks, viewId),
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

export function normalizeDocumentView(
  entry: Record<string, unknown> & { id?: string; name?: string },
): BoardView {
  if (entry.type === "actions") {
    return normalizeActionsView(entry as Partial<ActionsView>);
  }
  return normalizeBoardView(entry as Partial<CanvasBoardView>);
}

export function normalizeBoardDocument(raw: Partial<BoardImportPayload>): BoardImportPayload {
  const rawViews = Array.isArray(raw.views) ? raw.views : [];
  const liftedBookmarks: ViewBookmark[] = [];
  const views: BoardView[] = [];
  for (const entry of rawViews) {
    if (!entry || typeof entry !== "object") continue;
    const legacyBookmarks = (entry as { bookmarks?: unknown }).bookmarks;
    const view = normalizeDocumentView(
      entry as unknown as Parameters<typeof normalizeDocumentView>[0],
    );
    if (Array.isArray(legacyBookmarks) && isCanvasBoardView(view)) {
      liftedBookmarks.push(...normalizeViewBookmarks(legacyBookmarks, view.id));
    }
    views.push(view);
  }
  if (views.length === 0) {
    return createDefaultBoardDocument({
      title: raw.title ?? "Board",
      glossary: Array.isArray(raw.glossary) ? raw.glossary : [],
      actionItems: normalizeActionItems(raw.actionItems),
      bookmarks: normalizeViewBookmarks(raw.bookmarks),
      appearance: normalizeAppearance(raw.appearance),
      workshopMode: Boolean(raw.workshopMode),
    });
  }
  const activeViewId =
    raw.activeViewId && views.some((v) => v.id === raw.activeViewId)
      ? raw.activeViewId
      : views[0]!.id;
  const bookmarksById = new Map<string, ViewBookmark>();
  for (const bookmark of [
    ...normalizeViewBookmarks(raw.bookmarks, activeViewId),
    ...liftedBookmarks,
  ]) {
    bookmarksById.set(bookmark.id, bookmark);
  }
  return {
    title: raw.title ?? "Board",
    glossary: Array.isArray(raw.glossary) ? raw.glossary : [],
    actionItems: normalizeActionItems(raw.actionItems),
    bookmarks: [...bookmarksById.values()],
    appearance: normalizeAppearance(raw.appearance),
    workshopMode: Boolean(raw.workshopMode),
    activeViewId,
    views,
  };
}

export function getActiveView(doc: BoardImportPayload): BoardView {
  return doc.views.find((v) => v.id === doc.activeViewId) ?? doc.views[0]!;
}

export function getActiveCanvasView(doc: BoardImportPayload): CanvasBoardView | null {
  const view = getActiveView(doc);
  return isCanvasBoardView(view) ? view : null;
}

export function activeSliceFromDocument(doc: BoardImportPayload): BoardActiveSlice {
  const view = getActiveCanvasView(doc) ?? createEmptyBoardView({ id: "export", name: "Board" });
  return {
    title: doc.title,
    glossary: doc.glossary,
    actionItems: doc.actionItems ?? [],
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
    canvasLines: view.canvasLines,
    timeline: view.timeline,
    viewport: view.viewport,
    snapToTimeline: view.snapToTimeline,
    snapToGrid: view.snapToGrid,
    customCardTypes: view.customCardTypes ?? [],
  };
}

export function viewHasContent(view: BoardView): boolean {
  if (isActionsView(view)) {
    return view.items.length > 0;
  }
  return (
    view.elements.length > 0 ||
    view.connectors.length > 0 ||
    view.swimlanes.length > 0 ||
    view.boundedContexts.length > 0
  );
}

export function documentHasContent(doc: BoardImportPayload): boolean {
  return (
    doc.glossary.length > 0 ||
    (doc.actionItems?.length ?? 0) > 0 ||
    (doc.bookmarks?.length ?? 0) > 0 ||
    doc.views.some(viewHasContent)
  );
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
    actionItems: doc.actionItems ?? [],
    bookmarks: doc.bookmarks ?? [],
    appearance: normalizeAppearance(doc.appearance),
    workshopMode: doc.workshopMode,
    activeViewId: doc.activeViewId,
    views: doc.views,
  };
}

export function parseExportedDocument(text: string): unknown {
  const trimmed = text.trim();
  const withoutBom =
    trimmed.charCodeAt(0) === 0xfeff ? trimmed.slice(1) : trimmed;
  return JSON.parse(withoutBom) as unknown;
}

/** Accepts 1/2 as number or string (common in hand-edited or older exports). */
export function coerceBoardExportVersion(value: unknown): 1 | 2 | null {
  if (value === 1 || value === 2) return value;
  if (value === "1") return 1;
  if (value === "2") return 2;
  if (typeof value === "number" && Number.isFinite(value)) {
    const n = Math.trunc(value);
    if (n === 1 || n === 2) return n;
  }
  return null;
}

function boardSnapshotFormatOk(doc: Record<string, unknown>): boolean {
  const format = doc.format;
  return format === undefined || format === null || format === EXPORT_FORMAT;
}

function looksLikeV2MultiView(doc: Record<string, unknown>): boolean {
  if (!Array.isArray(doc.views) || doc.views.length === 0) return false;
  return doc.views.every((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const id = (entry as { id?: unknown }).id;
    return typeof id === "string" && id.trim().length > 0;
  });
}

function looksLikeV1FlatBoard(doc: Record<string, unknown>): boolean {
  return Array.isArray(doc.elements) && !Array.isArray(doc.views);
}

export function isBoardSnapshotV1(doc: unknown): doc is BoardSnapshotV1 {
  if (!doc || typeof doc !== "object") return false;
  const d = doc as Record<string, unknown>;
  if (!boardSnapshotFormatOk(d)) return false;
  const version = coerceBoardExportVersion(d.version);
  if (version === 1) return true;
  if (version === null && looksLikeV1FlatBoard(d)) return true;
  return false;
}

export function isBoardSnapshotV2(doc: unknown): doc is BoardSnapshotV2 {
  if (!doc || typeof doc !== "object") return false;
  const d = doc as Record<string, unknown>;
  if (!boardSnapshotFormatOk(d)) return false;
  const version = coerceBoardExportVersion(d.version);
  if (version === 2 && Array.isArray(d.views)) return true;
  if (version === null && looksLikeV2MultiView(d)) return true;
  if (version === 2 && looksLikeV2MultiView(d)) return true;
  return false;
}

/** Accepts v1 or v2 on-disk snapshots. */
export function isBoardSnapshot(doc: unknown): doc is BoardSnapshotV1 | BoardSnapshotV2 {
  return isBoardSnapshotV2(doc) || isBoardSnapshotV1(doc);
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
  } catch (err) {
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      console.warn("E2 board import failed:", err);
    }
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
  if (isActionsView(view)) {
    return {
      type: "actions",
      id: view.id,
      name: view.name,
      config: view.config,
      items: [...view.items].sort((a, b) => a.id.localeCompare(b.id)),
    };
  }
  return {
    type: "canvas",
    id: view.id,
    name: view.name,
    modelingMode: view.modelingMode,
    workshopFormat: view.workshopFormat,
    facilitatorEnabled: view.facilitatorEnabled,
    facilitatorPhase: view.facilitatorPhase,
    elements: [...view.elements].sort((a, b) => a.id.localeCompare(b.id)),
    connectors: [...view.connectors].sort((a, b) => a.id.localeCompare(b.id)),
    relations: [...view.relations].sort((a, b) => a.id.localeCompare(b.id)),
    contextRelations: [...view.contextRelations].sort((a, b) => a.id.localeCompare(b.id)),
    swimlanes: [...view.swimlanes].sort((a, b) => a.id.localeCompare(b.id)),
    boundedContexts: [...view.boundedContexts].sort((a, b) => a.id.localeCompare(b.id)),
    canvasLines: [...view.canvasLines].sort((a, b) => a.id.localeCompare(b.id)),
    timeline: view.timeline,
    snapToTimeline: view.snapToTimeline,
    snapToGrid: view.snapToGrid,
  };
}

/** Document fingerprint ignoring the active Sicht tab (all view blobs are compared). */
export function stableBoardDocumentContentKey(payload: BoardImportPayload): string {
  const doc = normalizeBoardDocument(payload);
  return JSON.stringify({
    title: doc.title,
    glossary: [...doc.glossary].sort((a, b) => a.term.localeCompare(b.term)),
    actionItems: [...(doc.actionItems ?? [])].sort((a, b) => a.id.localeCompare(b.id)),
    bookmarks: [...(doc.bookmarks ?? [])].sort((a, b) => a.id.localeCompare(b.id)),
    appearance: doc.appearance,
    workshopMode: doc.workshopMode,
    views: [...doc.views]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(stableViewKey),
  });
}

export function stableBoardStateKey(payload: BoardImportPayload): string {
  const doc = normalizeBoardDocument(payload);
  return JSON.stringify({
    ...JSON.parse(stableBoardDocumentContentKey(payload)) as Record<string, unknown>,
    activeViewId: doc.activeViewId,
  });
}

export function boardDocumentContentEquivalent(a: string, b: string): boolean {
  const pa = boardImportPayloadFromExportText(a);
  const pb = boardImportPayloadFromExportText(b);
  if (!pa || !pb) return a.trim() === b.trim();
  return stableBoardDocumentContentKey(pa) === stableBoardDocumentContentKey(pb);
}

export function boardExportTextsEquivalent(a: string, b: string): boolean {
  const pa = boardImportPayloadFromExportText(a);
  const pb = boardImportPayloadFromExportText(b);
  if (!pa || !pb) return a.trim() === b.trim();
  return stableBoardStateKey(pa) === stableBoardStateKey(pb);
}
