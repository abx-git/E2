import type { CanvasBoardView } from "@/lib/storm-json";
import type { CustomCardType } from "@/lib/custom-card-types";
import type { BoardConnector, ConnectorEndpoint } from "@/types/board-connector";

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

function connectorEndpointKey(ep: ConnectorEndpoint): string {
  if (ep.attach === "point") return `point:${ep.x},${ep.y}`;
  return `${ep.attach}:${ep.id}`;
}

function connectorTopologyKey(c: BoardConnector): string {
  return `${connectorEndpointKey(c.source)}→${connectorEndpointKey(c.target)}`;
}

/**
 * When the LLM uses shorthand `cn element:e1 element:e2`, decode assigns a new id.
 * Reuse the existing board connector id when endpoints match.
 */
export function reconcilePatchConnectorsWithBase(
  base: BoardConnector[],
  patch: BoardConnector[],
): BoardConnector[] {
  const byTopology = new Map<string, BoardConnector>();
  for (const c of base) byTopology.set(connectorTopologyKey(c), c);
  return patch.map((p) => {
    const existing = byTopology.get(connectorTopologyKey(p));
    if (existing && existing.id !== p.id) {
      return { ...structuredClone(p), id: existing.id };
    }
    return structuredClone(p);
  });
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
  const patchConnectors = reconcilePatchConnectorsWithBase(base.connectors, patch.connectors);
  return {
    ...base,
    elements: mergeById(base.elements, patch.elements, removeIds),
    relations: mergeById(base.relations, patch.relations, removeIds),
    contextRelations: mergeById(base.contextRelations, patch.contextRelations, removeIds),
    connectors: mergeById(base.connectors, patchConnectors, removeIds),
    swimlanes: mergeById(base.swimlanes, patch.swimlanes, removeIds),
    boundedContexts: mergeById(base.boundedContexts, patch.boundedContexts, removeIds),
    canvasLines: mergeById(base.canvasLines, patch.canvasLines, removeIds),
    customCardTypes: mergeCustomCardTypes(base.customCardTypes ?? [], patch.customCardTypes ?? []),
  };
}
