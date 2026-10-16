import type { ConnectorEndpoint } from "@/types/board-connector";

/** Single canvas tool for all connector interactions (click, drag line, regions). */
export function isConnectorToolActive(state: { relationMode: boolean }): boolean {
  return state.relationMode;
}

export function connectorDraftSourceLabel(
  source: ConnectorEndpoint | null | undefined,
  lookup: {
    elements: Array<{ id: string; label: string }>;
    boundedContexts: Array<{ id: string; label: string }>;
    swimlanes: Array<{ id: string; label: string }>;
  },
): string | null {
  if (!source) return null;
  switch (source.attach) {
    case "element":
      return lookup.elements.find((e) => e.id === source.id)?.label ?? null;
    case "boundedContext":
      return lookup.boundedContexts.find((b) => b.id === source.id)?.label ?? null;
    case "swimlane":
      return lookup.swimlanes.find((s) => s.id === source.id)?.label ?? null;
    case "point":
      return "Freier Punkt";
  }
}

export function isConnectorDraftSource(
  id: string,
  attach: Exclude<ConnectorEndpoint["attach"], "point">,
  source: ConnectorEndpoint | null | undefined,
): boolean {
  return source != null && source.attach === attach && "id" in source && source.id === id;
}
