import type { ClipboardSelection } from "@/lib/board-clipboard";
import type { CanvasBoardView } from "@/lib/storm-json";
import type { BoardConnector, ConnectorEndpoint } from "@/types/board-connector";
import type { CustomCardType } from "@/lib/custom-card-types";

export interface E2vSelectionInput {
  selection: ClipboardSelection;
  /** Explicitly selected board connector (context menu on connector). */
  selectedConnectorId?: string | null;
}

function endpointInSets(
  ep: ConnectorEndpoint,
  elementIds: Set<string>,
  swimlaneIds: Set<string>,
  bcIds: Set<string>,
): boolean {
  switch (ep.attach) {
    case "element":
      return elementIds.has(ep.id);
    case "swimlane":
      return swimlaneIds.has(ep.id);
    case "boundedContext":
      return bcIds.has(ep.id);
    case "point":
      return false;
    default:
      return false;
  }
}

function connectorIncluded(
  c: BoardConnector,
  elementIds: Set<string>,
  swimlaneIds: Set<string>,
  bcIds: Set<string>,
  selectedConnectorId: string | null | undefined,
): boolean {
  if (selectedConnectorId && c.id === selectedConnectorId) return true;
  const srcOk = endpointInSets(c.source, elementIds, swimlaneIds, bcIds);
  const tgtOk = endpointInSets(c.target, elementIds, swimlaneIds, bcIds);
  if (c.source.attach === "point" || c.target.attach === "point") {
    return false;
  }
  return srcOk && tgtOk;
}

function customTypesForElements(
  all: CustomCardType[],
  elements: { type: string; metadata?: { customTypeId?: string } }[],
): CustomCardType[] {
  const used = new Set<string>();
  for (const el of elements) {
    if (el.type !== "customCard") continue;
    const id = el.metadata?.customTypeId;
    if (id) used.add(id);
  }
  if (used.size === 0) return [];
  return all.filter((ct) => used.has(ct.id));
}

/**
 * Build a partial canvas view from the current selection (for E2V AI extract).
 * Preserves view id and metadata from the source view.
 */
export function sliceCanvasViewForSelection(
  view: CanvasBoardView,
  input: E2vSelectionInput,
): CanvasBoardView | null {
  const elementIdSet = new Set(input.selection.elementIds ?? []);
  const swimlaneIdSet = new Set(input.selection.swimlaneIds ?? []);
  const bcIdSet = new Set(input.selection.boundedContextIds ?? []);

  const selectedElements = view.elements.filter((e) => elementIdSet.has(e.id));
  const selectedSwimlanes = view.swimlanes.filter((l) => swimlaneIdSet.has(l.id));
  const selectedBcs = view.boundedContexts.filter((b) => bcIdSet.has(b.id));

  if (
    selectedElements.length === 0 &&
    selectedSwimlanes.length === 0 &&
    selectedBcs.length === 0
  ) {
    return null;
  }

  const selectedRelations = view.relations.filter(
    (r) => elementIdSet.has(r.sourceId) && elementIdSet.has(r.targetId),
  );
  const selectedContextRelations = view.contextRelations.filter(
    (r) => bcIdSet.has(r.sourceContextId) && bcIdSet.has(r.targetContextId),
  );

  const selectedConnectors = view.connectors.filter((c) =>
    connectorIncluded(
      c,
      elementIdSet,
      swimlaneIdSet,
      bcIdSet,
      input.selectedConnectorId,
    ),
  );

  const cleanedElements = selectedElements.map((el) => {
    const next = structuredClone(el);
    if (!next.swimlaneId || !swimlaneIdSet.has(next.swimlaneId)) {
      next.swimlaneId = undefined;
    }
    if (!next.boundedContextId || !bcIdSet.has(next.boundedContextId)) {
      next.boundedContextId = undefined;
    }
    if (!next.aggregateId || !elementIdSet.has(next.aggregateId)) {
      next.aggregateId = undefined;
    }
    if (!next.subdomainId || !elementIdSet.has(next.subdomainId)) {
      next.subdomainId = undefined;
    }
    return next;
  });

  const customCardTypes = customTypesForElements(view.customCardTypes ?? [], cleanedElements);

  return {
    ...structuredClone(view),
    elements: cleanedElements,
    relations: structuredClone(selectedRelations),
    contextRelations: structuredClone(selectedContextRelations),
    connectors: structuredClone(selectedConnectors),
    swimlanes: structuredClone(selectedSwimlanes),
    boundedContexts: structuredClone(selectedBcs),
    canvasLines: [],
    customCardTypes,
  };
}

/** All entity ids in a slice (for apply-time deletion scope). */
export function collectE2vEntityIds(slice: CanvasBoardView): string[] {
  const ids: string[] = [];
  for (const e of slice.elements) ids.push(e.id);
  for (const r of slice.relations) ids.push(r.id);
  for (const cr of slice.contextRelations) ids.push(cr.id);
  for (const c of slice.connectors) ids.push(c.id);
  for (const s of slice.swimlanes) ids.push(s.id);
  for (const b of slice.boundedContexts) ids.push(b.id);
  for (const ln of slice.canvasLines) ids.push(ln.id);
  return ids;
}

/**
 * Ids that may be removed when missing from a selection E2V reply.
 * Connectors are excluded — LLMs often omit `cn` rows; endpoints are reconciled on merge.
 */
export function collectE2vScopeDeleteIds(slice: CanvasBoardView): string[] {
  const connectorIds = new Set(slice.connectors.map((c) => c.id));
  return collectE2vEntityIds(slice).filter((id) => !connectorIds.has(id));
}
