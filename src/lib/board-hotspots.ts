import type { BoardImportPayload, BoardView, CanvasBoardView } from "@/lib/storm-json";
import { isActionsView } from "@/lib/storm-json";
import type { HotspotPriority, HotspotStatus } from "@/types/storm-element";
import type { MeasureActionItem } from "@/types/actions-view";

export type BoardHotspotRef = {
  viewId: string;
  viewName: string;
  elementId: string;
  label: string;
  description?: string;
  status: HotspotStatus;
  priority: HotspotPriority;
};

export function hotspotRefKey(viewId: string, elementId: string): string {
  return `${viewId}:${elementId}`;
}

export function parseHotspotRefKey(key: string): { viewId: string; elementId: string } | null {
  const i = key.indexOf(":");
  if (i <= 0) return null;
  const viewId = key.slice(0, i);
  const elementId = key.slice(i + 1);
  if (!viewId || !elementId) return null;
  return { viewId, elementId };
}

function isCanvasView(view: BoardView): view is CanvasBoardView {
  return !isActionsView(view);
}

export function collectBoardHotspots(doc: BoardImportPayload): BoardHotspotRef[] {
  const out: BoardHotspotRef[] = [];
  for (const view of doc.views) {
    if (!isCanvasView(view)) continue;
    for (const el of view.elements) {
      if (el.type !== "hotspot") continue;
      out.push({
        viewId: view.id,
        viewName: view.name,
        elementId: el.id,
        label: el.label?.trim() || el.id,
        description: el.description?.trim() || undefined,
        status: el.metadata?.hotspotStatus ?? "open",
        priority: el.metadata?.hotspotPriority ?? "medium",
      });
    }
  }
  return out.sort((a, b) =>
    `${a.viewName}:${a.label}`.localeCompare(`${b.viewName}:${b.label}`, undefined, {
      sensitivity: "base",
    }),
  );
}

export function normalizeExcludedHotspotRefs(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const keys = raw
    .filter((k): k is string => typeof k === "string")
    .map((k) => k.trim())
    .filter((k) => parseHotspotRefKey(k));
  return keys.length ? Array.from(new Set(keys)) : undefined;
}

export function partitionHotspotsForMeasuresView(
  hotspots: BoardHotspotRef[],
  excludedKeys: string[] | undefined,
): { active: BoardHotspotRef[]; excluded: BoardHotspotRef[] } {
  const excludedSet = new Set(excludedKeys ?? []);
  const active: BoardHotspotRef[] = [];
  const excluded: BoardHotspotRef[] = [];
  for (const h of hotspots) {
    const key = hotspotRefKey(h.viewId, h.elementId);
    if (excludedSet.has(key)) excluded.push(h);
    else active.push(h);
  }
  return { active, excluded };
}

export function measureTargetsHotspot(
  item: MeasureActionItem,
  viewId: string,
  elementId: string,
): boolean {
  return (
    item.targetRef?.viewId === viewId && item.targetRef?.elementId === elementId
  );
}

export function findMeasureForHotspot(
  items: MeasureActionItem[],
  viewId: string,
  elementId: string,
): MeasureActionItem | undefined {
  return items.find((item) => measureTargetsHotspot(item, viewId, elementId));
}

export type HotspotLinkedMeasure = {
  item: MeasureActionItem;
  actionsViewId: string;
};

/** First actions view on the board that links this canvas hotspot. */
export function findMeasureForHotspotInBoard(
  views: BoardView[],
  hotspotViewId: string,
  elementId: string,
): HotspotLinkedMeasure | undefined {
  for (const view of views) {
    if (!isActionsView(view)) continue;
    const item = findMeasureForHotspot(view.items, hotspotViewId, elementId);
    if (item) return { item, actionsViewId: view.id };
  }
  return undefined;
}

export function isHotspotExcludedFromMeasures(
  config: { excludedHotspotRefs?: string[] },
  viewId: string,
  elementId: string,
): boolean {
  const key = hotspotRefKey(viewId, elementId);
  return (config.excludedHotspotRefs ?? []).includes(key);
}

export function patchHotspotMeasuresBacklog(
  config: { excludedHotspotRefs?: string[] },
  viewId: string,
  elementId: string,
  excludedFromBacklog: boolean,
): { excludedHotspotRefs: string[] | undefined } {
  const key = hotspotRefKey(viewId, elementId);
  const current = config.excludedHotspotRefs ?? [];
  const next = excludedFromBacklog
    ? Array.from(new Set([...current, key]))
    : current.filter((k) => k !== key);
  return { excludedHotspotRefs: next.length ? next : undefined };
}

export function boardHotspotRefFromElement(
  viewId: string,
  viewName: string,
  el: { id: string; label?: string; description?: string; metadata?: { hotspotStatus?: HotspotStatus; hotspotPriority?: HotspotPriority } },
): BoardHotspotRef {
  return {
    viewId,
    viewName,
    elementId: el.id,
    label: el.label?.trim() || el.id,
    description: el.description?.trim() || undefined,
    status: el.metadata?.hotspotStatus ?? "open",
    priority: el.metadata?.hotspotPriority ?? "medium",
  };
}
