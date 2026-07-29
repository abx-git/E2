"use client";

import { Lock, Unlock } from "lucide-react";

import {
  opacityToPercent,
  percentToOpacity,
  resolveRegionPaint,
  type RegionVisualKind,
} from "@/lib/region-style";
import type { BoundedContext, Swimlane } from "@/types/storm-element";

type RegionPatch = Partial<
  Pick<Swimlane & BoundedContext, "color" | "fillOpacity" | "borderColor" | "borderOpacity" | "locked">
>;

export interface RegionAppearanceControlsProps {
  kind: RegionVisualKind;
  region: RegionStyleSourceLike;
  onChange: (patch: RegionPatch) => void;
}

type RegionStyleSourceLike = Pick<
  Swimlane | BoundedContext,
  "color" | "fillOpacity" | "borderColor" | "borderOpacity" | "locked"
>;

export function RegionAppearanceControls({
  kind,
  region,
  onChange,
}: RegionAppearanceControlsProps) {
  const paint = resolveRegionPaint(kind, region);

  return (
    <div className="space-y-3">
      <button
        type="button"
        className={[
          "flex w-full items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-medium transition",
          paint.locked
            ? "border-[var(--accent)]/50 bg-[var(--accent)]/10 text-[var(--text)]"
            : "border-[var(--border)] bg-[var(--control)] text-[var(--text)] hover:border-[var(--accent)]",
        ].join(" ")}
        onClick={() => onChange({ locked: !paint.locked })}
        aria-pressed={paint.locked}
      >
        {paint.locked ? (
          <>
            <Lock className="h-3.5 w-3.5" aria-hidden /> Gesperrt — entsperren
          </>
        ) : (
          <>
            <Unlock className="h-3.5 w-3.5" aria-hidden /> Position sperren
          </>
        )}
      </button>

      <div className="grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-2">
        <span className="text-[0.72rem] font-medium text-[var(--muted)]">Hintergrund</span>
        <div className="flex items-center gap-2">
          <input
            type="color"
            className="dock-field h-8 w-10 cursor-pointer p-0.5"
            value={paint.fillHex}
            onChange={(e) => onChange({ color: e.target.value })}
            aria-label="Hintergrundfarbe"
          />
          <label className="flex min-w-0 flex-1 items-center gap-1.5 text-[0.65rem] text-[var(--muted)]">
            <span className="shrink-0 w-8 tabular-nums">{opacityToPercent(paint.fillOpacity)}%</span>
            <input
              type="range"
              min={0}
              max={100}
              className="min-w-0 flex-1"
              value={opacityToPercent(paint.fillOpacity)}
              onChange={(e) => onChange({ fillOpacity: percentToOpacity(Number(e.target.value)) })}
              aria-label="Hintergrund-Transparenz"
            />
          </label>
        </div>

        <span className="text-[0.72rem] font-medium text-[var(--muted)]">Rand</span>
        <div className="flex items-center gap-2">
          <input
            type="color"
            className="dock-field h-8 w-10 cursor-pointer p-0.5"
            value={paint.borderHex}
            onChange={(e) => onChange({ borderColor: e.target.value })}
            aria-label="Randfarbe"
          />
          <label className="flex min-w-0 flex-1 items-center gap-1.5 text-[0.65rem] text-[var(--muted)]">
            <span className="shrink-0 w-8 tabular-nums">{opacityToPercent(paint.borderOpacity)}%</span>
            <input
              type="range"
              min={0}
              max={100}
              className="min-w-0 flex-1"
              value={opacityToPercent(paint.borderOpacity)}
              onChange={(e) =>
                onChange({ borderOpacity: percentToOpacity(Number(e.target.value)) })
              }
              aria-label="Rand-Transparenz"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
