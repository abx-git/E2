"use client";

import {
  PROGRESS_MARK_GLYPH,
  PROGRESS_MARK_LABEL,
  PROGRESS_MARK_STYLE,
  type ProgressMark,
} from "@/lib/progress-mark";

/** Small corner badge for stickies. */
export function ProgressMarkBadge({
  mark,
  className = "",
}: {
  mark: ProgressMark;
  className?: string;
}) {
  const style = PROGRESS_MARK_STYLE[mark];
  return (
    <span
      className={[
        "pointer-events-none absolute right-1 top-1 z-[2] rounded px-1 py-px text-[0.58rem] font-bold leading-none shadow-sm",
        className,
      ].join(" ")}
      style={{
        backgroundColor: style.bg,
        color: style.fg,
        boxShadow: `inset 0 0 0 1px ${style.border}`,
      }}
      title={PROGRESS_MARK_LABEL[mark]}
      aria-label={PROGRESS_MARK_LABEL[mark]}
    >
      {PROGRESS_MARK_GLYPH[mark]}
    </span>
  );
}
