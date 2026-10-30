/** True when the event target is part of the connector SVG (hit area or endpoint handle). */
export function isBoardConnectorTarget(target: EventTarget | null): boolean {
  const el = target as Element | null;
  return Boolean(
    el?.closest?.("[data-board-connector]") || el?.closest?.("[data-board-connector-handles]"),
  );
}

export function isStormElementTarget(target: EventTarget | null): boolean {
  return Boolean((target as Element | null)?.closest?.("[data-storm-element]"));
}

export function isBoundedContextTarget(target: EventTarget | null): boolean {
  return Boolean((target as Element | null)?.closest?.("[data-bounded-context]"));
}

export function isSwimlaneTarget(target: EventTarget | null): boolean {
  return Boolean((target as Element | null)?.closest?.("[data-swimlane]"));
}

/**
 * Shift+drag on empty canvas starts a free connector line.
 * Never steal pointer from connectors, stickies, or region click-connect.
 */
export function shouldStartConnectorLineDraw(
  target: EventTarget | null,
  opts: { relationMode: boolean; shiftKey: boolean },
): boolean {
  if (!opts.relationMode || !opts.shiftKey) return false;
  if (isBoardConnectorTarget(target)) return false;
  if (isStormElementTarget(target)) return false;
  if (isBoundedContextTarget(target)) return false;
  if (isSwimlaneTarget(target)) return false;
  return true;
}
