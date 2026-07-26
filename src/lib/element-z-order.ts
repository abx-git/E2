import type { StormElement } from "@/types/storm-element";

/** Anything with a stable id and optional stacking rank. */
export type ZOrderable = { id: string; zIndex?: number };

/** Stable stacking rank; missing values count as 0. */
export function itemZIndex(item: Pick<ZOrderable, "zIndex">): number {
  return Number.isFinite(item.zIndex) ? Number(item.zIndex) : 0;
}

/** @deprecated Prefer itemZIndex — kept for element call sites. */
export const elementZIndex = itemZIndex;

/** Paint / export order: lower first, then id for stability. */
export function compareByZOrder(a: ZOrderable, b: ZOrderable): number {
  const dz = itemZIndex(a) - itemZIndex(b);
  if (dz !== 0) return dz;
  return a.id.localeCompare(b.id);
}

export function sortByZOrder<T extends ZOrderable>(items: T[]): T[] {
  return [...items].sort(compareByZOrder);
}

export function sortElementsByZOrder(elements: StormElement[]): StormElement[] {
  return sortByZOrder(elements);
}

export function compareElementsByZOrder(a: StormElement, b: StormElement): number {
  return compareByZOrder(a, b);
}

export function maxZIndex(items: ZOrderable[]): number {
  if (items.length === 0) return 0;
  return Math.max(...items.map(itemZIndex));
}

export function minZIndex(items: ZOrderable[]): number {
  if (items.length === 0) return 0;
  return Math.min(...items.map(itemZIndex));
}

export const maxElementZIndex = maxZIndex;
export const minElementZIndex = minZIndex;

/** Next zIndex for a newly created item (above everything in `items`). */
export function nextZIndex(items: ZOrderable[]): number {
  return items.length === 0 ? 0 : maxZIndex(items) + 1;
}

export const nextElementZIndex = nextZIndex;

/**
 * Raise `ids` above all other items (preserving relative order among them).
 * Returns patches for items whose zIndex changes.
 */
export function bringToFront(
  items: ZOrderable[],
  ids: string[],
): Array<{ id: string; zIndex: number }> {
  const idSet = new Set(ids);
  const selected = sortByZOrder(items.filter((e) => idSet.has(e.id)));
  if (selected.length === 0) return [];
  const others = items.filter((e) => !idSet.has(e.id));
  let z = others.length === 0 ? 0 : maxZIndex(others) + 1;
  const patches: Array<{ id: string; zIndex: number }> = [];
  for (const el of selected) {
    if (itemZIndex(el) !== z) patches.push({ id: el.id, zIndex: z });
    z += 1;
  }
  return patches;
}

export const bringElementsToFront = bringToFront;

/** Lower `ids` below all other items (preserving relative order among them). */
export function sendToBack(
  items: ZOrderable[],
  ids: string[],
): Array<{ id: string; zIndex: number }> {
  const idSet = new Set(ids);
  const selected = sortByZOrder(items.filter((e) => idSet.has(e.id)));
  if (selected.length === 0) return [];
  const others = items.filter((e) => !idSet.has(e.id));
  const start = others.length === 0 ? 0 : minZIndex(others) - selected.length;
  let z = start;
  const patches: Array<{ id: string; zIndex: number }> = [];
  for (const el of selected) {
    if (itemZIndex(el) !== z) patches.push({ id: el.id, zIndex: z });
    z += 1;
  }
  return patches;
}

export const sendElementsToBack = sendToBack;

/** Move selection one step forward in the z-order among all items. */
export function bringForward(
  items: ZOrderable[],
  ids: string[],
): Array<{ id: string; zIndex: number }> {
  const idSet = new Set(ids);
  const ordered = sortByZOrder(items);
  const patches: Array<{ id: string; zIndex: number }> = [];
  for (let i = ordered.length - 2; i >= 0; i--) {
    const cur = ordered[i]!;
    const next = ordered[i + 1]!;
    if (idSet.has(cur.id) && !idSet.has(next.id)) {
      const a = itemZIndex(cur);
      const b = itemZIndex(next);
      if (a !== b) {
        patches.push({ id: cur.id, zIndex: b }, { id: next.id, zIndex: a });
      } else {
        patches.push({ id: cur.id, zIndex: a + 1 });
      }
      ordered[i] = next;
      ordered[i + 1] = cur;
    }
  }
  return dedupeZPatches(patches);
}

export const bringElementsForward = bringForward;

/** Move selection one step backward in the z-order among all items. */
export function sendBackward(
  items: ZOrderable[],
  ids: string[],
): Array<{ id: string; zIndex: number }> {
  const idSet = new Set(ids);
  const ordered = sortByZOrder(items);
  const patches: Array<{ id: string; zIndex: number }> = [];
  for (let i = 1; i < ordered.length; i++) {
    const cur = ordered[i]!;
    const prev = ordered[i - 1]!;
    if (idSet.has(cur.id) && !idSet.has(prev.id)) {
      const a = itemZIndex(cur);
      const b = itemZIndex(prev);
      if (a !== b) {
        patches.push({ id: cur.id, zIndex: b }, { id: prev.id, zIndex: a });
      } else {
        patches.push({ id: cur.id, zIndex: a - 1 });
      }
      ordered[i] = prev;
      ordered[i - 1] = cur;
    }
  }
  return dedupeZPatches(patches);
}

export const sendElementsBackward = sendBackward;

function dedupeZPatches(
  patches: Array<{ id: string; zIndex: number }>,
): Array<{ id: string; zIndex: number }> {
  const byId = new Map<string, number>();
  for (const p of patches) byId.set(p.id, p.zIndex);
  return Array.from(byId, ([id, zIndex]) => ({ id, zIndex }));
}

/** CSS stacking for stickies: base from persisted zIndex, boost for interaction. */
export function cssStackingZIndex(
  el: Pick<StormElement, "zIndex">,
  opts: { elevated?: boolean; highlighted?: boolean },
): number {
  const base = 20 + itemZIndex(el);
  if (opts.elevated) return Math.max(base, 10_000);
  if (opts.highlighted) return Math.max(base, 25);
  return base;
}

/**
 * CSS stacking for swimlanes / bounded contexts inside their own stacking context.
 * Selected regions rise above siblings but stay within the region layer.
 */
export function cssRegionStackingZIndex(
  item: Pick<ZOrderable, "zIndex">,
  opts: { elevated?: boolean } = {},
): number {
  const base = 2 + itemZIndex(item);
  if (opts.elevated) return Math.max(base, 10_000);
  return base;
}

/** Combined region list for shared z-order among swimlanes and bounded contexts. */
export function regionZOrderItems(
  swimlanes: ZOrderable[],
  boundedContexts: ZOrderable[],
): ZOrderable[] {
  return [...swimlanes, ...boundedContexts];
}
