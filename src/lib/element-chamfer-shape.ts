/** Cut size (px) for process-gateway “chamfered rectangle” corners. */
export function gatewayChamferCutPx(width: number, height: number): number {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const byShortSide = Math.min(w, h) * 0.22;
  const maxCut = Math.min(w, h) * 0.45;
  return Math.max(6, Math.min(byShortSide, maxCut, w / 2 - 1, h / 2 - 1));
}

/** Eight corner points for a chamfered rectangle (origin top-left, y down). */
export function chamferPolygonPoints(
  width: number,
  height: number,
  cutPx?: number,
): Array<{ x: number; y: number }> {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const c = cutPx ?? gatewayChamferCutPx(w, h);
  return [
    { x: c, y: 0 },
    { x: w - c, y: 0 },
    { x: w, y: c },
    { x: w, y: h - c },
    { x: w - c, y: h },
    { x: c, y: h },
    { x: 0, y: h - c },
    { x: 0, y: c },
  ];
}

export function chamferClipPathCss(width: number, height: number, cutPx?: number): string {
  const pts = chamferPolygonPoints(width, height, cutPx);
  return `polygon(${pts.map((p) => `${p.x}px ${p.y}px`).join(", ")})`;
}

export function chamferPolygonPointsAttr(
  x: number,
  y: number,
  width: number,
  height: number,
  cutPx?: number,
): string {
  return chamferPolygonPoints(width, height, cutPx)
    .map((p) => `${x + p.x},${y + p.y}`)
    .join(" ");
}

export function strokeChamferPolygon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  cutPx?: number,
): void {
  const pts = chamferPolygonPoints(width, height, cutPx);
  ctx.beginPath();
  ctx.moveTo(x + pts[0]!.x, y + pts[0]!.y);
  for (let i = 1; i < pts.length; i += 1) {
    ctx.lineTo(x + pts[i]!.x, y + pts[i]!.y);
  }
  ctx.closePath();
}
