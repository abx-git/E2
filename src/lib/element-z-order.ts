import type { StormElement } from "@/types/storm-element";

/** Stable stacking rank; missing values count as 0. */
export function elementZIndex(el: Pick<StormElement, "zIndex">): number {
  return Number.isFinite(el.zIndex) ? Number(el.zIndex) : 0;
}

/** Paint / export order: lower first, then id for stability. */
export function compareElementsByZOrder(a: StormElement, b: StormElement): number {
  const dz = elementZIndex(a) - elementZIndex(b);
  if (dz !== 0) return dz;
  return a.id.localeCompare(b.id);
}

export function sortElementsByZOrder(elements: StormElement[]): StormElement[] {
  return [...elements].sort(compareElementsByZOrder);
}

export function maxElementZIndex(elements: StormElement[]): number {
  if (elements.length === 0) return 0;
  return Math.max(...elements.map(elementZIndex));
}

export function minElementZIndex(elements: StormElement[]): number {
  if (elements.length === 0) return 0;
  return Math.min(...elements.map(elementZIndex));
}

/** Next zIndex for a newly created element (above everything). */
export function nextElementZIndex(elements: StormElement[]): number {
  return elements.length === 0 ? 0 : maxElementZIndex(elements) + 1;
}

/**
 * Raise `ids` above all other elements (preserving relative order among them).
 * Returns patches for elements whose zIndex changes.
 */
export function bringElementsToFront(
  elements: StormElement[],
  ids: string[],
): Array<{ id: string; zIndex: number }> {
  const idSet = new Set(ids);
  const selected = sortElementsByZOrder(elements.filter((e) => idSet.has(e.id)));
  if (selected.length === 0) return [];
  const others = elements.filter((e) => !idSet.has(e.id));
  let z = others.length === 0 ? 0 : maxElementZIndex(others) + 1;
  const patches: Array<{ id: string; zIndex: number }> = [];
  for (const el of selected) {
    if (elementZIndex(el) !== z) patches.push({ id: el.id, zIndex: z });
    z += 1;
  }
  return patches;
}

/** Lower `ids` below all other elements (preserving relative order among them). */
export function sendElementsToBack(
  elements: StormElement[],
  ids: string[],
): Array<{ id: string; zIndex: number }> {
  const idSet = new Set(ids);
  const selected = sortElementsByZOrder(elements.filter((e) => idSet.has(e.id)));
  if (selected.length === 0) return [];
  const others = elements.filter((e) => !idSet.has(e.id));
  const start =
    others.length === 0 ? 0 : minElementZIndex(others) - selected.length;
  let z = start;
  const patches: Array<{ id: string; zIndex: number }> = [];
  for (const el of selected) {
    if (elementZIndex(el) !== z) patches.push({ id: el.id, zIndex: z });
    z += 1;
  }
  return patches;
}

/** Move selection one step forward in the z-order among all elements. */
export function bringElementsForward(
  elements: StormElement[],
  ids: string[],
): Array<{ id: string; zIndex: number }> {
  const idSet = new Set(ids);
  const ordered = sortElementsByZOrder(elements);
  const patches: Array<{ id: string; zIndex: number }> = [];
  for (let i = ordered.length - 2; i >= 0; i--) {
    const cur = ordered[i]!;
    const next = ordered[i + 1]!;
    if (idSet.has(cur.id) && !idSet.has(next.id)) {
      const a = elementZIndex(cur);
      const b = elementZIndex(next);
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

/** Move selection one step backward in the z-order among all elements. */
export function sendElementsBackward(
  elements: StormElement[],
  ids: string[],
): Array<{ id: string; zIndex: number }> {
  const idSet = new Set(ids);
  const ordered = sortElementsByZOrder(elements);
  const patches: Array<{ id: string; zIndex: number }> = [];
  for (let i = 1; i < ordered.length; i++) {
    const cur = ordered[i]!;
    const prev = ordered[i - 1]!;
    if (idSet.has(cur.id) && !idSet.has(prev.id)) {
      const a = elementZIndex(cur);
      const b = elementZIndex(prev);
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

function dedupeZPatches(
  patches: Array<{ id: string; zIndex: number }>,
): Array<{ id: string; zIndex: number }> {
  const byId = new Map<string, number>();
  for (const p of patches) byId.set(p.id, p.zIndex);
  return Array.from(byId, ([id, zIndex]) => ({ id, zIndex }));
}

/** CSS stacking: base from persisted zIndex, boost for interaction. */
export function cssStackingZIndex(
  el: Pick<StormElement, "zIndex">,
  opts: { elevated?: boolean; highlighted?: boolean },
): number {
  const base = 20 + elementZIndex(el);
  if (opts.elevated) return Math.max(base, 10_000);
  if (opts.highlighted) return Math.max(base, 25);
  return base;
}
