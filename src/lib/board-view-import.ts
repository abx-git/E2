import { generateStormId } from "@/lib/storm-id";
import {
  normalizeBoardDocument,
  type BoardImportPayload,
  type BoardView,
} from "@/lib/storm-json";
import type { BoundedContext, StormElement, Swimlane } from "@/types/storm-element";
import type { ContextRelation, StormRelation } from "@/types/storm-relation";

/** Pick a name that does not collide with existing view tab names. */
export function uniqueViewName(base: string, existingNames: string[]): string {
  const trimmed = base.trim() || "Import";
  const lower = new Set(existingNames.map((n) => n.trim().toLowerCase()));
  if (!lower.has(trimmed.toLowerCase())) return trimmed;
  let i = 2;
  while (lower.has(`${trimmed} (${i})`.toLowerCase())) i += 1;
  return `${trimmed} (${i})`;
}

function suggestedImportViewName(
  view: BoardView,
  docTitle: string,
  viewCount: number,
): string {
  const title = docTitle.trim();
  const name = view.name.trim() || "Board";
  if (viewCount === 1) {
    if (title && (name === "Board" || name.toLowerCase() === title.toLowerCase())) {
      return title;
    }
    return name;
  }
  if (title && name !== title) return `${title} — ${name}`;
  return name;
}

function remapElement(
  el: StormElement,
  idMap: Map<string, string>,
  viewIdMap: Map<string, string>,
): StormElement {
  const next = structuredClone(el);
  next.id = idMap.get(el.id)!;
  if (el.swimlaneId) {
    next.swimlaneId = idMap.get(el.swimlaneId);
  }
  if (el.boundedContextId) {
    next.boundedContextId = idMap.get(el.boundedContextId);
  }
  const linkViewId = el.metadata?.linkViewId?.trim();
  if (linkViewId) {
    const mapped = viewIdMap.get(linkViewId);
    next.metadata = {
      ...next.metadata,
      linkViewId: mapped,
    };
  }
  return next;
}

function remapSwimlane(lane: Swimlane, idMap: Map<string, string>): Swimlane {
  return { ...structuredClone(lane), id: idMap.get(lane.id)! };
}

function remapBoundedContext(bc: BoundedContext, idMap: Map<string, string>): BoundedContext {
  return { ...structuredClone(bc), id: idMap.get(bc.id)! };
}

function remapRelation(rel: StormRelation, idMap: Map<string, string>): StormRelation | null {
  const sourceId = idMap.get(rel.sourceId);
  const targetId = idMap.get(rel.targetId);
  if (!sourceId || !targetId) return null;
  return {
    ...structuredClone(rel),
    id: generateStormId(),
    sourceId,
    targetId,
  };
}

function remapContextRelation(
  rel: ContextRelation,
  idMap: Map<string, string>,
): ContextRelation | null {
  const sourceContextId = idMap.get(rel.sourceContextId);
  const targetContextId = idMap.get(rel.targetContextId);
  if (!sourceContextId || !targetContextId) return null;
  return {
    ...structuredClone(rel),
    id: generateStormId(),
    sourceContextId,
    targetContextId,
  };
}

/** Deep-clone a view with fresh IDs (elements, relations, regions, view id). */
export function remapBoardViewIds(
  view: BoardView,
  options: {
    newName?: string;
    /** Pre-allocated oldViewId → newViewId (needed for cross-view link stickies). */
    viewIdMap: Map<string, string>;
  },
): BoardView {
  const clone = structuredClone(view);
  const newViewId = options.viewIdMap.get(view.id) ?? generateStormId();
  if (!options.viewIdMap.has(view.id)) {
    options.viewIdMap.set(view.id, newViewId);
  }

  const idMap = new Map<string, string>();
  for (const el of clone.elements) idMap.set(el.id, generateStormId());
  for (const lane of clone.swimlanes) idMap.set(lane.id, generateStormId());
  for (const bc of clone.boundedContexts) idMap.set(bc.id, generateStormId());

  return {
    ...clone,
    id: newViewId,
    name: options.newName ?? clone.name,
    elements: clone.elements.map((el) => remapElement(el, idMap, options.viewIdMap)),
    swimlanes: clone.swimlanes.map((lane) => remapSwimlane(lane, idMap)),
    boundedContexts: clone.boundedContexts.map((bc) => remapBoundedContext(bc, idMap)),
    relations: clone.relations
      .map((r) => remapRelation(r, idMap))
      .filter((r): r is StormRelation => r !== null),
    contextRelations: clone.contextRelations
      .map((r) => remapContextRelation(r, idMap))
      .filter((r): r is ContextRelation => r !== null),
  };
}

export interface PreparedImportViews {
  views: BoardView[];
  /** Prefer the imported document's active view (remapped), else first. */
  activeViewId: string;
}

/**
 * Turn an imported E2 document into new board views with remapped IDs.
 * Callers keep project globals (title, appearance, glossary, workshopMode) from the open file.
 */
export function prepareImportedViewsAsNewPages(
  imported: BoardImportPayload,
  existingViewNames: string[],
): PreparedImportViews {
  const doc = normalizeBoardDocument(imported);
  const viewIdMap = new Map<string, string>();
  for (const v of doc.views) {
    viewIdMap.set(v.id, generateStormId());
  }

  const usedNames = [...existingViewNames];
  const views = doc.views.map((v) => {
    const base = suggestedImportViewName(v, doc.title, doc.views.length);
    const name = uniqueViewName(base, usedNames);
    usedNames.push(name);
    return remapBoardViewIds(v, { newName: name, viewIdMap });
  });

  const preferredNewId = viewIdMap.get(doc.activeViewId);
  const active =
    (preferredNewId && views.find((v) => v.id === preferredNewId)) || views[0]!;

  return { views, activeViewId: active.id };
}
