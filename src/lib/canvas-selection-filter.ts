/** Ephemeral canvas filter: fade everything except selected element ids. */

export function isSelectionFilterActive(
  enabled: boolean,
  selectedElementIds: readonly string[],
): boolean {
  return enabled && selectedElementIds.length > 0;
}

export function elementDimmedBySelectionFilter(
  elementId: string,
  enabled: boolean,
  selectedElementIds: readonly string[],
): boolean {
  if (!isSelectionFilterActive(enabled, selectedElementIds)) return false;
  return !selectedElementIds.includes(elementId);
}

export function relationEndpointsDimmedBySelectionFilter(
  sourceId: string,
  targetId: string,
  enabled: boolean,
  selectedElementIds: readonly string[],
): boolean {
  if (!isSelectionFilterActive(enabled, selectedElementIds)) return false;
  const selected = new Set(selectedElementIds);
  return !selected.has(sourceId) && !selected.has(targetId);
}

export function connectorDimmedBySelectionFilter(
  elementInvolved: (elementId: string) => boolean,
  enabled: boolean,
  selectedElementIds: readonly string[],
): boolean {
  if (!isSelectionFilterActive(enabled, selectedElementIds)) return false;
  return !selectedElementIds.some((id) => elementInvolved(id));
}
