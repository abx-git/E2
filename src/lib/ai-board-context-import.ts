import { DEFAULT_APPEARANCE } from "@/lib/board-appearance";
import { ELEMENT_STYLES } from "@/lib/element-styles";
import { generateStormId } from "@/lib/storm-id";
import {
  createEmptyBoardView,
  type BoardImportPayload,
} from "@/lib/storm-json";
import {
  AI_BOARD_CONTEXT_SCHEMA_FILENAME,
  AI_BOARD_CONTEXT_SCHEMA_ID,
  AI_CONTEXT_FORMAT,
  AI_CONTEXT_VERSION,
  type AiBoardContext,
  type AiContextElement,
  type AiContextView,
} from "@/lib/view-export";
import aiBoardContextSchemaJson from "../../public/schemas/ai-board-context-v1.schema.json";

export { AI_BOARD_CONTEXT_SCHEMA_FILENAME, AI_BOARD_CONTEXT_SCHEMA_ID };

export const aiBoardContextSchemaDocument = aiBoardContextSchemaJson;

export function stringifyAiBoardContextSchema(): string {
  return JSON.stringify(aiBoardContextSchemaDocument, null, 2);
}
import type { ActionItem } from "@/types/action-item";
import {
  ACTION_ITEM_AREAS,
  ACTION_ITEM_STATUSES,
} from "@/types/action-item";
import type {
  BoundedContext,
  ElementType,
  ModelingMode,
  StormElement,
  Swimlane,
  WorkshopFormat,
} from "@/types/storm-element";
import {
  ALL_ELEMENT_TYPES,
  DEFAULT_MODELING_MODE,
  DEFAULT_TIMELINE,
  MODELING_MODES,
  normalizeModelingMode,
} from "@/types/storm-element";
import type { ContextMapPattern, RelationType, StormRelation, ContextRelation } from "@/types/storm-relation";
import { CONTEXT_MAP_PATTERNS } from "@/types/storm-relation";

const RELATION_TYPES: RelationType[] = [
  "triggers",
  "reactsWith",
  "informs",
  "executedBy",
  "invokes",
  "causal",
  "contains",
  "annotates",
];

const WORKSHOP_FORMATS: WorkshopFormat[] = [
  "free",
  "bigPicture",
  "processModeling",
  "softwareDesign",
  "strategicDesign",
  "tacticalDesign",
  "exampleMapping",
  "storyMapping",
  "eventModelingWorkshop",
  "processWorkshop",
  "dataModelWorkshop",
  "arc42Workshop",
  "c4Modeling",
  "ermDocumentation",
];

const COL_STRIDE = 190;
const PAD_X = 80;
const REGION_PAD = 40;
const LANE_GAP = 56;
const LANE_INNER_PAD = 56;
const BASE_TIMELINE_Y = 280;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asTrimmed(value: unknown): string | undefined {
  const s = asString(value)?.trim();
  return s || undefined;
}

function isElementType(value: unknown): value is ElementType {
  return (
    typeof value === "string" &&
    ((ALL_ELEMENT_TYPES as string[]).includes(value) || value === "link")
  );
}

function isRelationType(value: unknown): value is RelationType {
  return typeof value === "string" && (RELATION_TYPES as string[]).includes(value);
}

function isContextMapPattern(value: unknown): value is ContextMapPattern {
  return typeof value === "string" && (CONTEXT_MAP_PATTERNS as string[]).includes(value);
}

function isModelingMode(value: unknown): value is ModelingMode {
  return typeof value === "string" && (MODELING_MODES as string[]).includes(value);
}

function isWorkshopFormat(value: unknown): value is WorkshopFormat {
  return typeof value === "string" && (WORKSHOP_FORMATS as string[]).includes(value);
}

/** Y offset relative to the band / timeline center by sticky kind. */
export function layoutYOffsetForType(type: ElementType): number {
  switch (type) {
    case "actor":
    case "c4Person":
    case "externalSystem":
      return -110;
    case "command":
    case "ui":
    case "userTask":
    case "processActivity":
    case "activity":
      return -55;
    case "domainEvent":
    case "pivotalEvent":
    case "processStart":
    case "processEnd":
    case "release":
    case "slice":
      return 0;
    case "readModel":
    case "valueObject":
    case "rule":
      return -80;
    case "aggregate":
    case "entity":
    case "dataEntity":
    case "archBlackbox":
    case "archWhitebox":
    case "c4SoftwareSystem":
    case "c4Container":
      return 75;
    case "policy":
    case "processGateway":
    case "domainService":
    case "repository":
    case "factory":
    case "archComponent":
    case "c4Component":
      return 140;
    case "note":
    case "hotspot":
    case "question":
    case "example":
    case "link":
    case "subdomain":
    case "dataAssociation":
    case "userStory":
      return 175;
    default:
      return 20;
  }
}

function elementSize(type: ElementType): { width: number; height: number } {
  const style = ELEMENT_STYLES[type];
  return { width: style.defaultWidth, height: style.defaultHeight };
}

function uniqueId(preferred: string | undefined, used: Set<string>): string {
  const base = preferred?.trim();
  if (base && !used.has(base)) {
    used.add(base);
    return base;
  }
  let id = generateStormId();
  while (used.has(id)) id = generateStormId();
  used.add(id);
  return id;
}

function findByLabel<T extends { id: string; label: string }>(
  items: T[],
  label: string | undefined,
): T | undefined {
  const needle = label?.trim().toLowerCase();
  if (!needle) return undefined;
  return items.find((i) => i.label.trim().toLowerCase() === needle);
}

function resolveRefId(
  byId: Map<string, string>,
  byLabel: Map<string, string>,
  id: string | undefined,
  label: string | undefined,
): string | null {
  if (id && byId.has(id)) return byId.get(id)!;
  const key = label?.trim().toLowerCase();
  if (key && byLabel.has(key)) return byLabel.get(key)!;
  return null;
}

function bboxOf(elements: StormElement[]): {
  x: number;
  y: number;
  width: number;
  height: number;
} | null {
  if (elements.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const el of elements) {
    const w = el.width ?? elementSize(el.type).width;
    const h = el.height ?? elementSize(el.type).height;
    minX = Math.min(minX, el.x);
    minY = Math.min(minY, el.y);
    maxX = Math.max(maxX, el.x + w);
    maxY = Math.max(maxY, el.y + h);
  }
  return {
    x: minX - REGION_PAD,
    y: minY - REGION_PAD,
    width: Math.max(120, maxX - minX + REGION_PAD * 2),
    height: Math.max(80, maxY - minY + REGION_PAD * 2),
  };
}

/**
 * Place stickies left-to-right (by order), stacked in swimlane bands when present.
 * Region boxes are derived from member bounds.
 */
export function layoutAiContextView(view: AiContextView): {
  elements: StormElement[];
  swimlanes: Swimlane[];
  boundedContexts: BoundedContext[];
  relations: StormRelation[];
  contextRelations: ContextRelation[];
  timelineY: number;
} {
  const usedIds = new Set<string>();

  const laneDefs = (view.swimlanes ?? []).map((lane) => ({
    id: uniqueId(lane.id, usedIds),
    label: lane.label.trim() || "Lane",
  }));
  const laneByLabel = new Map(laneDefs.map((l) => [l.label.toLowerCase(), l]));

  const bcDefs = (view.boundedContexts ?? []).map((bc) => ({
    id: uniqueId(bc.id, usedIds),
    label: bc.label.trim() || "Context",
    purpose: bc.purpose?.trim() || undefined,
  }));
  const bcByLabel = new Map(bcDefs.map((b) => [b.label.toLowerCase(), b]));

  const rawElements = [...(view.elements ?? [])].sort(
    (a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER),
  );

  type Placed = {
    source: AiContextElement;
    el: StormElement;
    laneKey: string;
    bcKey: string | null;
  };

  const laneKeysInOrder: string[] = [];
  const seenLaneKeys = new Set<string>();
  for (const lane of laneDefs) {
    const key = lane.label.toLowerCase();
    if (!seenLaneKeys.has(key)) {
      seenLaneKeys.add(key);
      laneKeysInOrder.push(key);
    }
  }
  const UNGROUPED = "";
  for (const source of rawElements) {
    const key = source.swimlane?.trim().toLowerCase() || UNGROUPED;
    if (!seenLaneKeys.has(key)) {
      seenLaneKeys.add(key);
      laneKeysInOrder.push(key);
      if (key && !laneByLabel.has(key) && source.swimlane?.trim()) {
        const created = { id: uniqueId(undefined, usedIds), label: source.swimlane.trim() };
        laneDefs.push(created);
        laneByLabel.set(key, created);
      }
    }
  }
  if (laneKeysInOrder.length === 0) laneKeysInOrder.push(UNGROUPED);

  // Ensure BC labels from elements exist
  for (const source of rawElements) {
    const label = source.boundedContext?.trim();
    if (!label) continue;
    const key = label.toLowerCase();
    if (!bcByLabel.has(key)) {
      const created = { id: uniqueId(undefined, usedIds), label, purpose: undefined as string | undefined };
      bcDefs.push(created);
      bcByLabel.set(key, created);
    }
  }

  const placed: Placed[] = [];
  let bandTop = PAD_X;
  let timelineSamples: number[] = [];

  for (const laneKey of laneKeysInOrder) {
    const members = rawElements.filter(
      (e) => (e.swimlane?.trim().toLowerCase() || UNGROUPED) === laneKey,
    );
    if (members.length === 0 && laneKey === UNGROUPED && laneKeysInOrder.length > 1) {
      continue;
    }

    const bandCenterY = bandTop + LANE_INNER_PAD + 90;
    let col = 0;
    let bandMaxBottom = bandCenterY;

    for (const source of members) {
      if (!isElementType(source.type)) continue;
      const size = elementSize(source.type);
      const x = PAD_X + col * COL_STRIDE;
      const y = bandCenterY + layoutYOffsetForType(source.type) - size.height / 2;
      const id = uniqueId(source.id, usedIds);
      const lane = laneKey ? laneByLabel.get(laneKey) : undefined;
      const bcLabel = source.boundedContext?.trim().toLowerCase();
      const bc = bcLabel ? bcByLabel.get(bcLabel) : undefined;

      const el: StormElement = {
        id,
        type: source.type,
        label: source.label?.trim() || source.type,
        x,
        y,
        width: size.width,
        height: size.height,
        zIndex: placed.length,
        ...(source.description?.trim() ? { description: source.description.trim() } : {}),
        ...(lane ? { swimlaneId: lane.id } : {}),
        ...(bc ? { boundedContextId: bc.id } : {}),
        ...(source.metadata && Object.keys(source.metadata).length > 0
          ? { metadata: { ...source.metadata } as StormElement["metadata"] }
          : {}),
      };

      if (
        source.type === "domainEvent" ||
        source.type === "pivotalEvent" ||
        source.type === "processActivity"
      ) {
        timelineSamples.push(y + size.height / 2);
      }

      placed.push({
        source,
        el,
        laneKey,
        bcKey: bc ? bc.label.toLowerCase() : null,
      });
      bandMaxBottom = Math.max(bandMaxBottom, y + size.height);
      col += 1;
    }

    if (members.length === 0) {
      bandTop += 120 + LANE_GAP;
    } else {
      bandTop = bandMaxBottom + REGION_PAD + LANE_GAP;
    }
  }

  const elements = placed.map((p) => p.el);

  const swimlanes: Swimlane[] = laneDefs
    .map((lane, index) => {
      const members = placed.filter((p) => p.laneKey === lane.label.toLowerCase()).map((p) => p.el);
      const box = bboxOf(members);
      if (!box) {
        return {
          id: lane.id,
          label: lane.label,
          x: PAD_X,
          y: PAD_X + index * 140,
          width: 480,
          height: 120,
          zIndex: index,
        } satisfies Swimlane;
      }
      return {
        id: lane.id,
        label: lane.label,
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        zIndex: index,
      } satisfies Swimlane;
    })
    .filter((lane) => placed.some((p) => p.el.swimlaneId === lane.id) || laneDefs.length > 0);

  // Drop empty auto-lanes that no element references
  const usedLaneIds = new Set(elements.map((e) => e.swimlaneId).filter(Boolean));
  const finalSwimlanes = swimlanes.filter((l) => usedLaneIds.has(l.id));

  const boundedContexts: BoundedContext[] = bcDefs.map((bc, index) => {
    const members = placed.filter((p) => p.bcKey === bc.label.toLowerCase()).map((p) => p.el);
    const box = bboxOf(members);
    return {
      id: bc.id,
      label: bc.label,
      ...(bc.purpose ? { purpose: bc.purpose } : {}),
      x: box?.x ?? PAD_X + index * 40,
      y: box?.y ?? PAD_X + index * 40,
      width: box?.width ?? 280,
      height: box?.height ?? 160,
      zIndex: index,
    } satisfies BoundedContext;
  }).filter((bc) => elements.some((e) => e.boundedContextId === bc.id) || (view.boundedContexts ?? []).some((b) => b.label.trim() === bc.label));

  const elementIdBySourceId = new Map<string, string>();
  const elementIdByLabel = new Map<string, string>();
  for (const p of placed) {
    if (p.source.id) elementIdBySourceId.set(p.source.id, p.el.id);
    const key = p.el.label.trim().toLowerCase();
    if (key && !elementIdByLabel.has(key)) elementIdByLabel.set(key, p.el.id);
  }

  const relations: StormRelation[] = [];
  for (const rel of view.relations ?? []) {
    if (!isRelationType(rel.type)) continue;
    const sourceId = resolveRefId(elementIdBySourceId, elementIdByLabel, rel.fromId, rel.from);
    const targetId = resolveRefId(elementIdBySourceId, elementIdByLabel, rel.toId, rel.to);
    if (!sourceId || !targetId || sourceId === targetId) continue;
    relations.push({
      id: generateStormId(),
      type: rel.type,
      sourceId,
      targetId,
      ...(rel.label?.trim() ? { label: rel.label.trim() } : {}),
    });
  }

  const bcIdBySourceId = new Map(bcDefs.map((b) => [b.id, b.id]));
  // Also map original AI ids if they differed — uniqueId may keep them
  for (const raw of view.boundedContexts ?? []) {
    if (!raw.id) continue;
    const match = bcDefs.find((b) => b.label === raw.label.trim() || b.id === raw.id);
    if (match) bcIdBySourceId.set(raw.id, match.id);
  }
  const bcIdByLabel = new Map(bcDefs.map((b) => [b.label.toLowerCase(), b.id]));

  const contextRelations: ContextRelation[] = [];
  for (const rel of view.contextRelations ?? []) {
    if (!isContextMapPattern(rel.type)) continue;
    const sourceContextId = resolveRefId(bcIdBySourceId, bcIdByLabel, rel.fromId, rel.from);
    const targetContextId = resolveRefId(bcIdBySourceId, bcIdByLabel, rel.toId, rel.to);
    if (!sourceContextId || !targetContextId || sourceContextId === targetContextId) continue;
    contextRelations.push({
      id: generateStormId(),
      type: rel.type,
      sourceContextId,
      targetContextId,
      ...(rel.label?.trim() ? { label: rel.label.trim() } : {}),
    });
  }

  const timelineY =
    timelineSamples.length > 0
      ? Math.round(timelineSamples.reduce((a, b) => a + b, 0) / timelineSamples.length)
      : BASE_TIMELINE_Y;

  return {
    elements,
    swimlanes: finalSwimlanes,
    boundedContexts,
    relations,
    contextRelations,
    timelineY,
  };
}

export function isAiBoardContext(doc: unknown): doc is AiBoardContext {
  if (!isRecord(doc)) return false;
  return doc.format === AI_CONTEXT_FORMAT && doc.version === AI_CONTEXT_VERSION;
}

function parseAiElement(raw: unknown, index: number): AiContextElement | null {
  if (!isRecord(raw)) return null;
  if (!isElementType(raw.type)) return null;
  const label = asString(raw.label) ?? String(raw.type);
  const order =
    typeof raw.order === "number" && Number.isFinite(raw.order) && raw.order > 0
      ? Math.floor(raw.order)
      : index + 1;
  const entry: AiContextElement = {
    id: asTrimmed(raw.id) ?? `el-${index + 1}`,
    type: raw.type,
    label,
    order,
  };
  const description = asTrimmed(raw.description);
  if (description) entry.description = description;
  const swimlane = asTrimmed(raw.swimlane);
  if (swimlane) entry.swimlane = swimlane;
  const boundedContext = asTrimmed(raw.boundedContext);
  if (boundedContext) entry.boundedContext = boundedContext;
  const detailView = asTrimmed(raw.detailView);
  if (detailView) entry.detailView = detailView;
  if (isRecord(raw.metadata)) {
    entry.metadata = { ...raw.metadata } as AiContextElement["metadata"];
  }
  return entry;
}

function parseAiView(raw: unknown): AiContextView | null {
  if (!isRecord(raw)) return null;
  const name = asTrimmed(raw.name);
  if (!name) return null;
  const modelingMode = isModelingMode(raw.modelingMode)
    ? raw.modelingMode
    : normalizeModelingMode(asString(raw.modelingMode) ?? DEFAULT_MODELING_MODE);
  const workshopFormat = isWorkshopFormat(raw.workshopFormat) ? raw.workshopFormat : "free";
  const elementsRaw = Array.isArray(raw.elements) ? raw.elements : [];
  const elements = elementsRaw
    .map((el, i) => parseAiElement(el, i))
    .filter((el): el is AiContextElement => el !== null);

  const view: AiContextView = {
    id: asTrimmed(raw.id) || generateStormId(),
    name,
    modelingMode,
    workshopFormat,
    elements,
    relations: [],
    contextRelations: [],
    swimlanes: [],
    boundedContexts: [],
  };

  if (Array.isArray(raw.relations)) {
    view.relations = raw.relations
      .filter(isRecord)
      .map((r) => ({
        type: r.type as RelationType,
        fromId: asTrimmed(r.fromId) ?? "",
        toId: asTrimmed(r.toId) ?? "",
        from: asTrimmed(r.from) ?? asTrimmed(r.fromId) ?? "",
        to: asTrimmed(r.to) ?? asTrimmed(r.toId) ?? "",
        ...(asTrimmed(r.label) ? { label: asTrimmed(r.label) } : {}),
      }))
      .filter((r) => isRelationType(r.type));
  }

  if (Array.isArray(raw.contextRelations)) {
    view.contextRelations = raw.contextRelations
      .filter(isRecord)
      .map((r) => ({
        type: r.type as ContextMapPattern,
        fromId: asTrimmed(r.fromId) ?? "",
        toId: asTrimmed(r.toId) ?? "",
        from: asTrimmed(r.from) ?? asTrimmed(r.fromId) ?? "",
        to: asTrimmed(r.to) ?? asTrimmed(r.toId) ?? "",
        ...(asTrimmed(r.label) ? { label: asTrimmed(r.label) } : {}),
      }))
      .filter((r) => isContextMapPattern(r.type));
  }

  if (Array.isArray(raw.swimlanes)) {
    view.swimlanes = raw.swimlanes
      .filter(isRecord)
      .map((s) => ({
        id: asTrimmed(s.id) || generateStormId(),
        label: asTrimmed(s.label) || "Lane",
      }));
  }

  if (Array.isArray(raw.boundedContexts)) {
    view.boundedContexts = raw.boundedContexts
      .filter(isRecord)
      .map((b) => ({
        id: asTrimmed(b.id) || generateStormId(),
        label: asTrimmed(b.label) || "Context",
        ...(asTrimmed(b.purpose) ? { purpose: asTrimmed(b.purpose) } : {}),
        ...(asTrimmed(b.detailView) ? { detailView: asTrimmed(b.detailView) } : {}),
      }));
  }

  if (isRecord(raw.timeline)) {
    const startLabel = asTrimmed(raw.timeline.startLabel);
    const endLabel = asTrimmed(raw.timeline.endLabel);
    if (startLabel || endLabel) {
      view.timeline = {
        ...(startLabel ? { startLabel } : {}),
        ...(endLabel ? { endLabel } : {}),
      };
    }
  }

  return view;
}

/** Lenient parse: accepts AI-produced JSON that mostly matches the schema. */
export function parseAiBoardContext(doc: unknown): AiBoardContext | null {
  if (!isRecord(doc)) return null;
  if (doc.format !== AI_CONTEXT_FORMAT) return null;
  if (doc.version !== AI_CONTEXT_VERSION) return null;
  const title = asTrimmed(doc.title) || "KI-Import";
  const view = parseAiView(doc.view);
  if (!view) return null;

  const glossary = Array.isArray(doc.glossary)
    ? doc.glossary
        .filter(isRecord)
        .map((g) => ({
          term: asString(g.term) ?? "",
          definition: asString(g.definition) ?? "",
        }))
        .filter((g) => g.term.trim())
    : [];

  const actionItems: AiBoardContext["actionItems"] = [];
  if (Array.isArray(doc.actionItems)) {
    for (const raw of doc.actionItems) {
      if (!isRecord(raw)) continue;
      const titleText = asTrimmed(raw.title);
      if (!titleText) continue;
      const status = asString(raw.status);
      const area = asString(raw.area);
      if (!status || !(ACTION_ITEM_STATUSES as string[]).includes(status)) continue;
      if (!area || !(ACTION_ITEM_AREAS as string[]).includes(area)) continue;
      actionItems.push({
        title: titleText,
        status: status as ActionItem["status"],
        area: area as ActionItem["area"],
        ...(asTrimmed(raw.notes) ? { notes: asTrimmed(raw.notes) } : {}),
        ...(asTrimmed(raw.element) ? { element: asTrimmed(raw.element) } : {}),
        ...(asTrimmed(raw.boundedContext) ? { boundedContext: asTrimmed(raw.boundedContext) } : {}),
      });
    }
  }

  return {
    format: AI_CONTEXT_FORMAT,
    version: AI_CONTEXT_VERSION,
    exportedAt: asString(doc.exportedAt) || new Date().toISOString(),
    title,
    view,
    glossary,
    actionItems,
  };
}

/** Convert AI context into a full board document with auto-layout. */
export function aiBoardContextToImportPayload(ctx: AiBoardContext): BoardImportPayload {
  const laidOut = layoutAiContextView(ctx.view);
  const viewId = ctx.view.id?.trim() || generateStormId();

  const actionItems: ActionItem[] = ctx.actionItems.map((item) => {
    const element = item.element
      ? findByLabel(
          laidOut.elements.map((e) => ({ id: e.id, label: e.label })),
          item.element,
        )
      : undefined;
    const bc = item.boundedContext
      ? findByLabel(
          laidOut.boundedContexts.map((b) => ({ id: b.id, label: b.label })),
          item.boundedContext,
        )
      : undefined;
    return {
      id: generateStormId(),
      title: item.title,
      status: item.status,
      area: item.area,
      ...(item.notes ? { notes: item.notes } : {}),
      ...(element ? { elementId: element.id } : {}),
      ...(bc ? { boundedContextId: bc.id } : {}),
    };
  });

  const view = createEmptyBoardView({
    id: viewId,
    name: ctx.view.name,
    modelingMode: ctx.view.modelingMode,
    workshopFormat: ctx.view.workshopFormat,
    elements: laidOut.elements,
    relations: laidOut.relations,
    contextRelations: laidOut.contextRelations,
    swimlanes: laidOut.swimlanes,
    boundedContexts: laidOut.boundedContexts,
    timeline: {
      ...DEFAULT_TIMELINE,
      y: laidOut.timelineY,
      ...(ctx.view.timeline?.startLabel
        ? { startLabel: ctx.view.timeline.startLabel }
        : {}),
      ...(ctx.view.timeline?.endLabel ? { endLabel: ctx.view.timeline.endLabel } : {}),
    },
    snapToTimeline: true,
    snapToGrid: false,
  });

  return {
    title: ctx.title,
    glossary: ctx.glossary,
    actionItems,
    bookmarks: [],
    appearance: { ...DEFAULT_APPEARANCE },
    workshopMode: false,
    activeViewId: viewId,
    views: [view],
  };
}

export function boardImportPayloadFromAiContextText(text: string): BoardImportPayload | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    const doc = JSON.parse(trimmed) as unknown;
    const ctx = parseAiBoardContext(doc);
    if (!ctx) return null;
    return aiBoardContextToImportPayload(ctx);
  } catch {
    return null;
  }
}
