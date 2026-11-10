"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ClipboardCopy, ClipboardPaste, Lock, Unlock } from "lucide-react";

import {
  opacityToPercent,
  parseHexColor,
  percentToOpacity,
  resolveRegionLabelInk,
  resolveRegionPaint,
  type RegionVisualKind,
} from "@/lib/region-style";
import { layoutRegionCanPasteAppearance } from "@/lib/region-appearance-clipboard";
import {
  runRegionAppearanceCopy,
  runRegionAppearancePaste,
} from "@/lib/region-appearance-clipboard-ui";
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

function RegionColorRow({
  label,
  colorHex,
  opacityPercent,
  onColorChange,
  onOpacityChange,
  opacityDisabled,
  opacityDisabledLabel,
  trailing,
}: {
  label: string;
  colorHex: string;
  opacityPercent: number;
  onColorChange: (hex: string) => void;
  onOpacityChange: (percent: number) => void;
  opacityDisabled?: boolean;
  opacityDisabledLabel?: string;
  trailing?: ReactNode;
}) {
  return (
    <section className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[0.72rem] font-medium text-[var(--muted)]">{label}</span>
        <div className="flex items-center gap-2">
          {trailing}
          <input
            type="color"
            className="dock-field h-8 w-11 shrink-0 cursor-pointer p-0.5"
            value={colorHex}
            onChange={(e) => onColorChange(e.target.value)}
            aria-label={`${label} Farbe`}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span
          className="w-10 shrink-0 text-right text-[0.65rem] tabular-nums text-[var(--muted)]"
          aria-hidden
        >
          {opacityDisabled && opacityDisabledLabel ? opacityDisabledLabel : `${opacityPercent}%`}
        </span>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          className="dock-range flex-1"
          disabled={opacityDisabled}
          value={opacityPercent}
          onChange={(e) => onOpacityChange(Number(e.target.value))}
          aria-label={`${label} Transparenz`}
        />
      </div>
    </section>
  );
}

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
  const [copiedFlash, setCopiedFlash] = useState(false);
  const [pastedFlash, setPastedFlash] = useState(false);
  const flashTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (flashTimer.current != null) window.clearTimeout(flashTimer.current);
    },
    [],
  );

  const flash = (which: "copied" | "pasted") => {
    if (flashTimer.current != null) window.clearTimeout(flashTimer.current);
    if (which === "copied") {
      setCopiedFlash(true);
      setPastedFlash(false);
    } else {
      setPastedFlash(true);
      setCopiedFlash(false);
    }
    flashTimer.current = window.setTimeout(() => {
      setCopiedFlash(false);
      setPastedFlash(false);
      flashTimer.current = null;
    }, 1600);
  };

  return (
    <div className="space-y-4">
      <p className="sr-only" aria-live="polite">
        {copiedFlash ? t("alerts.regionAppearanceCopied") : pastedFlash ? t("alerts.regionAppearancePasted") : ""}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          className={[
            "flex flex-1 items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-medium transition",
            copiedFlash
              ? "border-[var(--accent)]/50 bg-[var(--accent)]/15 text-[var(--text)]"
              : "border-[var(--border)] bg-[var(--control)] text-[var(--text)] hover:border-[var(--accent)]",
          ].join(" ")}
          onClick={() => {
            const outcome = runRegionAppearanceCopy(elementId);
            if (outcome.status === "copied") flash("copied");
          }}
        >
          {copiedFlash ? (
            <Check className="h-3.5 w-3.5 text-[var(--accent)]" aria-hidden />
          ) : (
            <ClipboardCopy className="h-3.5 w-3.5" aria-hidden />
          )}
          {copiedFlash ? t("common.copied") : "Darstellung kopieren"}
        </button>
        <button
          type="button"
          className={[
            "flex flex-1 items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-medium transition",
            pastedFlash
              ? "border-[var(--accent)]/50 bg-[var(--accent)]/15 text-[var(--text)]"
              : "border-[var(--border)] bg-[var(--control)] text-[var(--text)] hover:border-[var(--accent)] disabled:opacity-40",
          ].join(" ")}
          disabled={!canPasteAppearance}
          onClick={() => {
            const outcome = runRegionAppearancePaste(t, elementId);
            if (outcome.status === "applied") {
              flash("pasted");
              return;
            }
            if (outcome.status === "error") {
              if (outcome.reason === "no_clipboard") {
                window.alert(t("alerts.regionAppearancePasteNoClipboard"));
              } else if (outcome.reason === "same_element") {
                window.alert(t("alerts.regionAppearancePasteSameElement"));
              }
            }
          }}
        >
          {pastedFlash ? (
            <Check className="h-3.5 w-3.5 text-[var(--accent)]" aria-hidden />
          ) : (
            <ClipboardPaste className="h-3.5 w-3.5" aria-hidden />
          )}
          {pastedFlash ? t("alerts.regionAppearancePasted") : "Darstellung einfügen"}
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

      <div className="space-y-3.5">
        <RegionColorRow
          label="Hintergrund"
          colorHex={paint.fillHex}
          opacityPercent={opacityToPercent(paint.fillOpacity)}
          onColorChange={(hex) => onChange({ color: hex })}
          onOpacityChange={(percent) => onChange({ fillOpacity: percentToOpacity(percent) })}
        />
        <RegionColorRow
          label="Rand"
          colorHex={paint.borderHex}
          opacityPercent={opacityToPercent(paint.borderOpacity)}
          onColorChange={(hex) => onChange({ borderColor: hex })}
          onOpacityChange={(percent) => onChange({ borderOpacity: percentToOpacity(percent) })}
        />
        <RegionColorRow
          label="Text"
          colorHex={useAutoLabelColor ? (parseHexColor(labelInk.ink) ?? "#f1f5f9") : labelHex}
          opacityPercent={opacityToPercent(labelOpacity)}
          opacityDisabled={useAutoLabelColor}
          opacityDisabledLabel="Auto"
          onColorChange={(hex) => onChange({ labelColor: hex, labelOpacity: labelOpacity })}
          onOpacityChange={(percent) =>
            onChange({
              labelColor: labelHex,
              labelOpacity: percentToOpacity(percent),
            })
          }
          trailing={
            !useAutoLabelColor ? (
              <button
                type="button"
                className="text-[0.62rem] text-[var(--muted)] underline hover:text-[var(--text)]"
                onClick={() => onChange({ labelColor: undefined, labelOpacity: undefined })}
              >
                Auto
              </button>
            ) : null
          }
        />
      </div>
    </div>
  );
}
