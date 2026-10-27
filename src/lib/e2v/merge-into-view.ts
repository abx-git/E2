import type { CanvasBoardView } from "@/lib/storm-json";
import type { CustomCardType } from "@/lib/custom-card-types";

interface Identified {
  id: string;
}

function mergeById<T extends Identified>(base: T[], patch: T[], removeIds?: Set<string>): T[] {
  const map = new Map<string, T>();
  for (const item of base) {
    if (!removeIds?.has(item.id)) map.set(item.id, item);
  }
  for (const item of patch) {
    map.set(item.id, structuredClone(item));
  }
  if (removeIds) {
    for (const id of removeIds) map.delete(id);
  }
  return Array.from(map.values());
}

function mergeCustomCardTypes(base: CustomCardType[], patch: CustomCardType[]): CustomCardType[] {
  const map = new Map<string, CustomCardType>();
  for (const ct of base) map.set(ct.id, ct);
  for (const ct of patch) map.set(ct.id, structuredClone(ct));
  return Array.from(map.values());
}

/**
 * Merge decoded E2V view content into the active canvas view.
 * View id, name, viewport, and timeline come from `base`.
 */
export function mergeImportedViewIntoCanvas(
  base: CanvasBoardView,
  patch: CanvasBoardView,
  removeIds?: Set<string>,
): CanvasBoardView {
  return {
    ...base,
    elements: mergeById(base.elements, patch.elements, removeIds),
    relations: mergeById(base.relations, patch.relations, removeIds),
    contextRelations: mergeById(base.contextRelations, patch.contextRelations, removeIds),
    connectors: mergeById(base.connectors, patch.connectors, removeIds),
    swimlanes: mergeById(base.swimlanes, patch.swimlanes, removeIds),
    boundedContexts: mergeById(base.boundedContexts, patch.boundedContexts, removeIds),
    canvasLines: mergeById(base.canvasLines, patch.canvasLines, removeIds),
    customCardTypes: mergeCustomCardTypes(base.customCardTypes ?? [], patch.customCardTypes ?? []),
  };
}
