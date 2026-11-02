import type { BoundedContext, Swimlane } from "@/types/storm-element";

/** Matches `--canvas` in globals.css — used for contrast on semi-transparent regions. */
export const BOARD_CANVAS_BACKDROP_HEX = "#1a2330";

export type RegionVisualKind = "swimlane" | "boundedContext";

export type RegionStyleSource = Pick<
  Swimlane | BoundedContext,
  "color" | "fillOpacity" | "borderColor" | "borderOpacity" | "locked"
>;

const DEFAULTS: Record<
  RegionVisualKind,
  { fillHex: string; fillOpacity: number; borderHex: string; borderOpacity: number }
> = {
  swimlane: {
    fillHex: "#94a3b8",
    fillOpacity: 0.12,
    borderHex: "#cbd5e1",
    borderOpacity: 0.7,
  },
  boundedContext: {
    fillHex: "#dbeafe",
    fillOpacity: 0.4,
    borderHex: "#60a5fa",
    borderOpacity: 0.7,
  },
};

/** Clamp opacity to 0–1. */
export function clampOpacity(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.min(1, Math.max(0, value));
}

export function parseHexColor(input: string | undefined): string | null {
  if (!input?.trim()) return null;
  const raw = input.trim();
  const m = raw.match(/^#?([0-9a-fA-F]{6})$/);
  if (m) return `#${m[1].toLowerCase()}`;
  const short = raw.match(/^#?([0-9a-fA-F]{3})$/);
  if (short) {
    const [a, b, c] = short[1].toLowerCase().split("");
    return `#${a}${a}${b}${b}${c}${c}`;
  }
  return null;
}

/** Parse #rgb/#rrggbb or rgba()/rgb() into hex + opacity. */
export function parseCssColorParts(
  color: string | undefined,
): { hex: string; opacity: number } | null {
  if (!color?.trim()) return null;
  const hex = parseHexColor(color);
  if (hex) return { hex, opacity: 1 };
  const rgba = color.match(
    /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/i,
  );
  if (!rgba) return null;
  const r = Number(rgba[1]);
  const g = Number(rgba[2]);
  const b = Number(rgba[3]);
  const a = rgba[4] !== undefined ? Number(rgba[4]) : 1;
  const toHex = (n: number) => Math.min(255, Math.max(0, n)).toString(16).padStart(2, "0");
  return { hex: `#${toHex(r)}${toHex(g)}${toHex(b)}`, opacity: clampOpacity(a, 1) };
}

export function hexToRgba(hex: string, opacity: number): string {
  const parsed = parseHexColor(hex) ?? "#000000";
  const r = Number.parseInt(parsed.slice(1, 3), 16);
  const g = Number.parseInt(parsed.slice(3, 5), 16);
  const b = Number.parseInt(parsed.slice(5, 7), 16);
  const a = clampOpacity(opacity, 1);
  return `rgba(${r},${g},${b},${a})`;
}

function hexRgb(hex: string): { r: number; g: number; b: number } {
  const parsed = parseHexColor(hex) ?? "#808080";
  return {
    r: Number.parseInt(parsed.slice(1, 3), 16),
    g: Number.parseInt(parsed.slice(3, 5), 16),
    b: Number.parseInt(parsed.slice(5, 7), 16),
  };
}

/** sRGB relative luminance (WCAG). */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexRgb(hex);
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const R = toLinear(r);
  const G = toLinear(g);
  const B = toLinear(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/** Opaque fill as seen over the board canvas (semi-transparent region fill). */
export function blendFillOnCanvas(
  fillHex: string,
  fillOpacity: number,
  backdropHex: string = BOARD_CANVAS_BACKDROP_HEX,
): string {
  const a = clampOpacity(fillOpacity, 1);
  const fg = hexRgb(fillHex);
  const bg = hexRgb(backdropHex);
  const mix = (f: number, b: number) => Math.round(f * a + b * (1 - a));
  const r = mix(fg.r, bg.r);
  const g = mix(fg.g, bg.g);
  const b = mix(fg.b, bg.b);
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export interface RegionLabelInk {
  ink: string;
  captionInk: string;
}

/** Readable label colors for region / boundary fills on the dark canvas. */
export function regionLabelInk(
  fillHex: string,
  fillOpacity: number,
  backdropHex: string = BOARD_CANVAS_BACKDROP_HEX,
): RegionLabelInk {
  const effective = blendFillOnCanvas(fillHex, fillOpacity, backdropHex);
  const lum = relativeLuminance(effective);
  if (lum > 0.42) {
    return { ink: "#0f172a", captionInk: "#334155" };
  }
  return { ink: "#f1f5f9", captionInk: "#cbd5e1" };
}

export interface ResolvedRegionPaint {
  fillHex: string;
  fillOpacity: number;
  borderHex: string;
  borderOpacity: number;
  backgroundColor: string;
  borderColor: string;
  locked: boolean;
}

export function resolveRegionPaint(
  kind: RegionVisualKind,
  region: RegionStyleSource,
): ResolvedRegionPaint {
  const defaults = DEFAULTS[kind];
  const fromColor = parseCssColorParts(region.color);
  const fillHex = parseHexColor(region.color) ?? fromColor?.hex ?? defaults.fillHex;
  // Legacy: swimlane often stored full rgba in `color` — use that alpha unless fillOpacity set.
  const fillOpacity = clampOpacity(
    region.fillOpacity,
    fromColor && region.fillOpacity === undefined && region.color?.includes("rgba")
      ? fromColor.opacity
      : defaults.fillOpacity,
  );
  const borderHex = parseHexColor(region.borderColor) ?? defaults.borderHex;
  const borderOpacity = clampOpacity(region.borderOpacity, defaults.borderOpacity);

  return {
    fillHex,
    fillOpacity,
    borderHex,
    borderOpacity,
    backgroundColor: hexToRgba(fillHex, fillOpacity),
    borderColor: hexToRgba(borderHex, borderOpacity),
    locked: Boolean(region.locked),
  };
}

/** Opacity as 0–100 for range inputs. */
export function opacityToPercent(opacity: number): number {
  return Math.round(clampOpacity(opacity, 0) * 100);
}

export function percentToOpacity(percent: number): number {
  return clampOpacity(percent / 100, 0);
}

/** Strip geometry from a patch when the region is locked (style/label/unlock still apply). */
export function sanitizeRegionGeometryPatch<T extends Record<string, unknown>>(
  locked: boolean,
  patch: T,
): T {
  if (!locked) return patch;
  if (patch.locked === false) return patch;
  const next = { ...patch };
  delete next.x;
  delete next.y;
  delete next.width;
  delete next.height;
  return next;
}
