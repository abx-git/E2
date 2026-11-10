"use client";

import { ClipboardCopy, ClipboardPaste, Lock, Unlock } from "lucide-react";

import {
  opacityToPercent,
  parseHexColor,
  percentToOpacity,
  resolveRegionLabelInk,
  resolveRegionPaint,
  type RegionVisualKind,
} from "@/lib/region-style";
import { layoutRegionCanPasteAppearance } from "@/lib/region-appearance-clipboard";
import { runElementAttributeCopy, runElementAttributePaste } from "@/lib/element-attribute-clipboard-ui";
import type { BoundedContext, Swimlane } from "@/types/storm-element";
import { useT } from "@/i18n";
import { useStormBoardStore } from "@/store/storm-board-store";

type RegionPatch = Partial<
  Pick<
    Swimlane & BoundedContext,
    "color" | "fillOpacity" | "borderColor" | "borderOpacity" | "labelColor" | "labelOpacity" | "locked"
  >
>;

export interface RegionAppearanceControlsProps {
  kind: RegionVisualKind;
  elementId: string;
  region: RegionStyleSourceLike;
  onChange: (patch: RegionPatch) => void;
}

type RegionStyleSourceLike = Pick<
  Swimlane | BoundedContext,
  "color" | "fillOpacity" | "borderColor" | "borderOpacity" | "labelColor" | "labelOpacity" | "locked"
>;

export function RegionAppearanceControls({
  kind,
  elementId,
  region,
  onChange,
}: RegionAppearanceControlsProps) {
  const t = useT();
  const paint = resolveRegionPaint(kind, region);
  const labelInk = resolveRegionLabelInk(kind, region);
  const labelHex = parseHexColor(region.labelColor) ?? labelInk.ink;
  const labelOpacity =
    region.labelColor != null && region.labelOpacity != null
      ? region.labelOpacity
      : region.labelColor != null
        ? 1
        : 1;
  const useAutoLabelColor = region.labelColor == null;

  const attributeClipboard = useStormBoardStore((s) => s.elementAttributeClipboard);
  const attributeClipboardSourceId = useStormBoardStore((s) => s.elementAttributeClipboardSourceId);
  const canPasteAppearance = layoutRegionCanPasteAppearance(
    kind,
    elementId,
    attributeClipboard,
    attributeClipboardSourceId,
  );

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--control)] px-2 py-1.5 text-xs font-medium text-[var(--text)] transition hover:border-[var(--accent)]"
          onClick={() => runElementAttributeCopy(elementId)}
        >
          <ClipboardCopy className="h-3.5 w-3.5" aria-hidden />
          Darstellung kopieren
        </button>
        <button
          type="button"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--control)] px-2 py-1.5 text-xs font-medium text-[var(--text)] transition hover:border-[var(--accent)] disabled:opacity-40"
          disabled={!canPasteAppearance}
          onClick={() => {
            const outcome = runElementAttributePaste(t, elementId);
            if (outcome.status === "error" && outcome.reason === "no_clipboard") {
              window.alert(t("alerts.elementAttributesPasteNoClipboard"));
            }
          }}
        >
          <ClipboardPaste className="h-3.5 w-3.5" aria-hidden />
          Darstellung einfügen
        </button>
      </div>

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

        <span className="text-[0.72rem] font-medium text-[var(--muted)]">Text</span>
        <div className="flex items-center gap-2">
          <input
            type="color"
            className="dock-field h-8 w-10 cursor-pointer p-0.5"
            value={useAutoLabelColor ? (parseHexColor(labelInk.ink) ?? "#f1f5f9") : labelHex}
            onChange={(e) => onChange({ labelColor: e.target.value, labelOpacity: labelOpacity })}
            aria-label="Textfarbe"
          />
          <label className="flex min-w-0 flex-1 items-center gap-1.5 text-[0.65rem] text-[var(--muted)]">
            <span className="shrink-0 w-8 tabular-nums">
              {useAutoLabelColor ? "Auto" : `${opacityToPercent(labelOpacity)}%`}
            </span>
            <input
              type="range"
              min={0}
              max={100}
              className="min-w-0 flex-1"
              disabled={useAutoLabelColor}
              value={opacityToPercent(labelOpacity)}
              onChange={(e) =>
                onChange({
                  labelColor: labelHex,
                  labelOpacity: percentToOpacity(Number(e.target.value)),
                })
              }
              aria-label="Text-Transparenz"
            />
          </label>
          {!useAutoLabelColor ? (
            <button
              type="button"
              className="shrink-0 text-[0.62rem] text-[var(--muted)] underline hover:text-[var(--text)]"
              onClick={() => onChange({ labelColor: undefined, labelOpacity: undefined })}
            >
              Auto
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
