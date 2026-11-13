"use client";

import type { ReactNode } from "react";

export function ColorOpacityRow({
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
            aria-label={`${label}`}
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
          aria-label={`${label}`}
        />
      </div>
    </section>
  );
}
