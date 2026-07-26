/** Normalize degrees into (-180, 180]. */
export function normalizeRotationDegrees(degrees: number): number {
  if (!Number.isFinite(degrees)) return 0;
  let d = degrees % 360;
  if (d > 180) d -= 360;
  if (d <= -180) d += 360;
  return d;
}

/** Snap to nearest step (e.g. 15°), then normalize. */
export function snapRotationDegrees(degrees: number, step = 15): number {
  if (step <= 0) return normalizeRotationDegrees(degrees);
  return normalizeRotationDegrees(Math.round(degrees / step) * step);
}

/** Effective rotation for an element (instance override, else style default). */
export function effectiveElementRotation(
  elementRotation: number | undefined,
  styleRotation: number | undefined = 0,
): number {
  return normalizeRotationDegrees(elementRotation ?? styleRotation ?? 0);
}
