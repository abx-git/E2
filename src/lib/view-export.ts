import type { ActionItem } from "@/types/action-item";
import type {
  BoundedContext,
  ElementMetadata,
  GlossaryEntry,
  ModelingMode,
  StormElement,
  Swimlane,
  WorkshopFormat,
} from "@/types/storm-element";
import type { ContextRelation, StormRelation } from "@/types/storm-relation";
import {
  buildBoardSnapshot,
  stringifyExportedDocument,
  type BoardImportPayload,
  type BoardSnapshotV2,
  type BoardView,
} from "@/lib/storm-json";

export const AI_CONTEXT_FORMAT = "event-storming-tool-ai-context" as const;
export const AI_CONTEXT_VERSION = 1 as const;

export const AI_BOARD_CONTEXT_SCHEMA_ID =
  "https://abx-git.github.io/E2/schemas/ai-board-context-v1.schema.json" as const;

export const AI_BOARD_CONTEXT_SCHEMA_FILENAME = "ai-board-context-v1.schema.json" as const;

/** UI / layout-only metadata keys omitted from AI context. */
const AI_OMIT_METADATA_KEYS = new Set<keyof ElementMetadata>([
  "noteColor",
  "showDescriptionOnCard",
  "showAttributesOnCard",
  "showMethodsOnCard",
  "arc42SectionNumber",
]);

export interface AiContextElement {
  id: string;
  type: StormElement["type"];
  label: string;
  description?: string;
  swimlane?: string;
  boundedContext?: string;
  detailView?: string;
  /** Left-to-right order on the canvas (1-based); useful for timelines / process flow. */
  order: number;
  metadata?: Partial<ElementMetadata>;
}

export interface AiContextRelation {
  type: StormRelation["type"];
  fromId: string;
  toId: string;
  from: string;
  to: string;
  label?: string;
}

export interface AiContextContextRelation {
  type: ContextRelation["type"];
  fromId: string;
  toId: string;
  from: string;
  to: string;
  label?: string;
}

export interface AiContextView {
  id: string;
  name: string;
  modelingMode: ModelingMode;
  workshopFormat: WorkshopFormat;
  elements: AiContextElement[];
  relations: AiContextRelation[];
  contextRelations: AiContextContextRelation[];
  swimlanes: Array<{ id: string; label: string }>;
  boundedContexts: Array<{
    id: string;
    label: string;
    purpose?: string;
    detailView?: string;
  }>;
  timeline?: { startLabel?: string; endLabel?: string };
}

export interface AiBoardContext {
  $schema?: string;
  format: typeof AI_CONTEXT_FORMAT;
  version: typeof AI_CONTEXT_VERSION;
  exportedAt: string;
  title: string;
  view: AiContextView;
  glossary: GlossaryEntry[];
  actionItems: Array<{
    title: string;
    notes?: string;
    status: ActionItem["status"];
    area: ActionItem["area"];
    element?: string;
    boundedContext?: string;
  }>;
}

function resolveView(doc: BoardImportPayload, viewId: string): BoardView | null {
  return doc.views.find((v) => v.id === viewId) ?? null;
}

function viewNameMap(doc: BoardImportPayload): Map<string, string> {
  return new Map(doc.views.map((v) => [v.id, v.name]));
}

function labelOf(items: Array<{ id: string; label: string }>, id: string | undefined): string | undefined {
  if (!id) return undefined;
  return items.find((i) => i.id === id)?.label;
}

function slimMetadata(meta: ElementMetadata | undefined): Partial<ElementMetadata> | undefined {
  if (!meta) return undefined;
  const out: Partial<ElementMetadata> = {};
  for (const [key, value] of Object.entries(meta) as Array<[keyof ElementMetadata, unknown]>) {
    if (AI_OMIT_METADATA_KEYS.has(key)) continue;
    if (value === undefined || value === null) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (typeof value === "string" && !value.trim()) continue;
    (out as Record<string, unknown>)[key] = value;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function sortElementsLeftToRight(elements: StormElement[]): StormElement[] {
  return [...elements].sort((a, b) => a.x - b.x || a.y - b.y || a.id.localeCompare(b.id));
}

/** Build a valid BoardSnapshotV2 containing only the given view (re-importable). */
export function buildSingleViewSnapshot(
  doc: BoardImportPayload,
  viewId: string,
): BoardSnapshotV2 | null {
  const view = resolveView(doc, viewId);
  if (!view) return null;
  const bookmarks = (doc.bookmarks ?? []).filter((b) => b.viewId === view.id);
  return buildBoardSnapshot({
    title: doc.title,
    glossary: doc.glossary,
    actionItems: doc.actionItems ?? [],
    bookmarks,
    appearance: doc.appearance,
    workshopMode: false,
    activeViewId: view.id,
    views: [view],
  });
}

export function stringifySingleViewExport(doc: BoardImportPayload, viewId: string): string | null {
  const snap = buildSingleViewSnapshot(doc, viewId);
  if (!snap) return null;
  return stringifyExportedDocument(snap);
}

/** Reduced semantic extract for AI conversation context (one Sicht). */
export function buildAiBoardContext(
  doc: BoardImportPayload,
  viewId: string,
): AiBoardContext | null {
  const view = resolveView(doc, viewId);
  if (!view) return null;

  const names = viewNameMap(doc);
  const sorted = sortElementsLeftToRight(view.elements);
  const elementById = new Map(view.elements.map((el) => [el.id, el]));
  const swimlanes = view.swimlanes.map((s: Swimlane) => ({ id: s.id, label: s.label }));
  const boundedContexts = view.boundedContexts.map((bc: BoundedContext) => ({
    id: bc.id,
    label: bc.label,
    ...(bc.purpose?.trim() ? { purpose: bc.purpose.trim() } : {}),
    ...(bc.detailViewId && names.has(bc.detailViewId)
      ? { detailView: names.get(bc.detailViewId)! }
      : {}),
  }));

  const elements: AiContextElement[] = sorted.map((el, index) => {
    const entry: AiContextElement = {
      id: el.id,
      type: el.type,
      label: el.label,
      order: index + 1,
    };
    if (el.description?.trim()) entry.description = el.description.trim();
    const swimlane = labelOf(swimlanes, el.swimlaneId);
    if (swimlane) entry.swimlane = swimlane;
    const bc = labelOf(boundedContexts, el.boundedContextId);
    if (bc) entry.boundedContext = bc;
    if (el.detailViewId && names.has(el.detailViewId)) {
      entry.detailView = names.get(el.detailViewId)!;
    }
    const metadata = slimMetadata(el.metadata);
    if (metadata) entry.metadata = metadata;
    return entry;
  });

  const relations: AiContextRelation[] = view.relations.map((r) => {
    const fromEl = elementById.get(r.sourceId);
    const toEl = elementById.get(r.targetId);
    return {
      type: r.type,
      fromId: r.sourceId,
      toId: r.targetId,
      from: fromEl?.label ?? r.sourceId,
      to: toEl?.label ?? r.targetId,
      ...(r.label?.trim() ? { label: r.label.trim() } : {}),
    };
  });

  const contextRelations: AiContextContextRelation[] = view.contextRelations.map((r) => {
    const fromBc = view.boundedContexts.find((b) => b.id === r.sourceContextId);
    const toBc = view.boundedContexts.find((b) => b.id === r.targetContextId);
    return {
      type: r.type,
      fromId: r.sourceContextId,
      toId: r.targetContextId,
      from: fromBc?.label ?? r.sourceContextId,
      to: toBc?.label ?? r.targetContextId,
      ...(r.label?.trim() ? { label: r.label.trim() } : {}),
    };
  });

  const timelineStart = view.timeline.startLabel?.trim();
  const timelineEnd = view.timeline.endLabel?.trim();
  const timeline =
    timelineStart || timelineEnd
      ? {
          ...(timelineStart ? { startLabel: timelineStart } : {}),
          ...(timelineEnd ? { endLabel: timelineEnd } : {}),
        }
      : undefined;

  const actionItems = (doc.actionItems ?? []).map((item) => {
    const out: AiBoardContext["actionItems"][number] = {
      title: item.title,
      status: item.status,
      area: item.area,
    };
    if (item.notes?.trim()) out.notes = item.notes.trim();
    const elLabel = item.elementId ? elementById.get(item.elementId)?.label : undefined;
    if (elLabel) out.element = elLabel;
    const bcLabel = item.boundedContextId
      ? labelOf(boundedContexts, item.boundedContextId)
      : undefined;
    if (bcLabel) out.boundedContext = bcLabel;
    return out;
  });

  return {
    $schema: AI_BOARD_CONTEXT_SCHEMA_ID,
    format: AI_CONTEXT_FORMAT,
    version: AI_CONTEXT_VERSION,
    exportedAt: new Date().toISOString(),
    title: doc.title,
    view: {
      id: view.id,
      name: view.name,
      modelingMode: view.modelingMode,
      workshopFormat: view.workshopFormat,
      elements,
      relations,
      contextRelations,
      swimlanes,
      boundedContexts,
      ...(timeline ? { timeline } : {}),
    },
    glossary: doc.glossary,
    actionItems,
  };
}

export function stringifyAiBoardContext(doc: BoardImportPayload, viewId: string): string | null {
  const ctx = buildAiBoardContext(doc, viewId);
  if (!ctx) return null;
  return JSON.stringify(ctx, null, 2);
}

export function slugForExportFilename(text: string): string {
  const slug = text.trim().replace(/\s+/g, "-").toLowerCase() || "board";
  return slug.replace(/[^a-z0-9._-]+/gi, "-").replace(/-+/g, "-");
}

export function singleViewExportFilename(title: string, viewName: string): string {
  return `${slugForExportFilename(title)}-${slugForExportFilename(viewName)}.storm.json`;
}

export function aiContextExportFilename(title: string, viewName: string): string {
  return `${slugForExportFilename(title)}-${slugForExportFilename(viewName)}.ai-context.json`;
}
