import type { BoardActiveSlice } from "@/lib/storm-json";

/** Stable string for draw.io graph reload — avoids useEffect loops on new object references. */
export function drawioModelSyncKey(slice: BoardActiveSlice): string {
  return JSON.stringify({
    title: slice.title,
    elements: slice.elements,
    connectors: slice.connectors,
    relations: slice.relations,
    swimlanes: slice.swimlanes,
    boundedContexts: slice.boundedContexts,
    canvasLines: slice.canvasLines,
    timeline: slice.timeline,
    appearance: slice.appearance,
    customCardTypes: slice.customCardTypes,
    notesCompact: slice.notesCompact,
  });
}