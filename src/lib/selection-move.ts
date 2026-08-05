import {
  elementIdsInAggregate,
  elementIdsInBoundedContext,
  elementIdsInSubdomain,
  elementIdsInSwimlane,
} from "@/lib/region-containment";
import type { BoundedContext, StormElement, Swimlane } from "@/types/storm-element";

export interface CanvasSelectionIds {
  elementIds: string[];
  swimlaneIds: string[];
  boundedContextIds: string[];
}

export function selectionItemCount(selection: CanvasSelectionIds): number {
  return (
    selection.elementIds.length +
    selection.swimlaneIds.length +
    selection.boundedContextIds.length
  );
}

/**
 * Expand a canvas selection into the full move set: selected regions plus
 * Mitziehen-members (assigned or fully contained) for swimlanes, bounded
 * contexts, aggregates, and subdomains.
 */
export function expandCanvasMoveSet(
  elements: StormElement[],
  swimlanes: Swimlane[],
  boundedContexts: BoundedContext[],
  selection: CanvasSelectionIds,
): CanvasSelectionIds {
  const elementIds = new Set(selection.elementIds);
  const swimlaneIds = new Set(selection.swimlaneIds);
  const boundedContextIds = new Set(selection.boundedContextIds);

  for (const id of selection.swimlaneIds) {
    const lane = swimlanes.find((l) => l.id === id);
    if (!lane) continue;
    for (const eid of elementIdsInSwimlane(elements, lane)) {
      elementIds.add(eid);
    }
  }

  for (const id of selection.boundedContextIds) {
    const ctx = boundedContexts.find((b) => b.id === id);
    if (!ctx) continue;
    for (const eid of elementIdsInBoundedContext(elements, ctx)) {
      elementIds.add(eid);
    }
  }

  // Expand aggregates / subdomains that are selected or pulled in via regions.
  let grew = true;
  while (grew) {
    grew = false;
    for (const id of Array.from(elementIds)) {
      const el = elements.find((e) => e.id === id);
      if (!el) continue;
      const members =
        el.type === "aggregate"
          ? elementIdsInAggregate(elements, el)
          : el.type === "subdomain"
            ? elementIdsInSubdomain(elements, el)
            : [];
      for (const childId of members) {
        if (!elementIds.has(childId)) {
          elementIds.add(childId);
          grew = true;
        }
      }
    }
  }

  return {
    elementIds: Array.from(elementIds),
    swimlaneIds: Array.from(swimlaneIds),
    boundedContextIds: Array.from(boundedContextIds),
  };
}
