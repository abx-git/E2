"use client";

import {
  PROGRESS_MARK_LABEL,
  PROGRESS_MARK_STYLE,
  normalizeProgressMark,
  type ProgressMark,
} from "@/lib/progress-mark";

const SIZE = 18;

/** Vector icon paths for a given mark (viewBox 0 0 16 16). */
export function ProgressMarkGlyph({
  mark,
  className = "",
}: {
  mark: ProgressMark;
  className?: string;
}) {
  const common = {
    className,
    width: 12,
    height: 12,
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  switch (mark) {
    case "ok":
      return (
        <svg {...common}>
          <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
        </svg>
      );
    case "attention":
      return (
        <svg {...common}>
          <path d="M8 3.5v6" />
          <circle cx="8" cy="12.2" r="0.9" fill="currentColor" stroke="none" />
        </svg>
      );
    case "question":
      return (
        <svg {...common}>
          <path d="M5.5 5.2a2.5 2.5 0 1 1 3.2 2.3c-.7.4-1.2.9-1.2 1.8" />
          <circle cx="8" cy="12.2" r="0.9" fill="currentColor" stroke="none" />
        </svg>
      );
    case "working":
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="5.2" />
          <path d="M8 5v3.2l2.2 1.4" />
        </svg>
      );
    case "neu":
      return (
        <svg {...common}>
          <path
            d="M8 2.5l1.3 3.2 3.5.3-2.7 2.3.9 3.4L8 10.2 4.999 11.7l.9-3.4-2.7-2.3 3.5-.3z"
            fill="currentColor"
            stroke="none"
          />
        </svg>
      );
  }
}

/** Small corner badge for stickies — filled disc with icon. */
export function ProgressMarkBadge({
  mark: rawMark,
  className = "",
}: {
  mark: ProgressMark | string;
  className?: string;
}) {
  const mark = normalizeProgressMark(rawMark);
  if (!mark) return null;
  const style = PROGRESS_MARK_STYLE[mark];
  return (
    <span
      className={[
        "pointer-events-none absolute left-1 top-1 z-[2] inline-flex items-center justify-center rounded-full shadow-sm",
        className,
      ].join(" ")}
      style={{
        width: SIZE,
        height: SIZE,
        backgroundColor: style.bg,
        color: style.fg,
        boxShadow: `0 0 0 1.5px ${style.border}, 0 1px 2px rgba(0,0,0,0.18)`,
      }}
      title={PROGRESS_MARK_LABEL[mark]}
      aria-label={PROGRESS_MARK_LABEL[mark]}
    >
      <ProgressMarkGlyph mark={mark} />
    </span>
  );
}

/** SVG badge for connector midpoints (world coords, centered at 0,0). */
export function ProgressMarkConnectorBadge({
  mark: rawMark,
}: {
  mark: ProgressMark | string;
}) {
  const mark = normalizeProgressMark(rawMark);
  if (!mark) return null;
  const style = PROGRESS_MARK_STYLE[mark];
  const r = 9;
  return (
    <g className="pointer-events-none">
      <title>{PROGRESS_MARK_LABEL[mark]}</title>
      <circle
        cx={0}
        cy={0}
        r={r}
        fill={style.bg}
        stroke={style.border}
        strokeWidth={1.5}
      />
      <g transform="translate(-6, -6)" color={style.fg}>
        <ProgressMarkSvgPaths mark={mark} />
      </g>
    </g>
  );
}

/** Inline SVG paths in a 12×12 space (for use inside connector <g>). */
function ProgressMarkSvgPaths({ mark }: { mark: ProgressMark }) {
  const stroke = "currentColor";
  switch (mark) {
    case "ok":
      return (
        <path
          d="M2.5 6.5 4.8 8.8 9.5 3.5"
          fill="none"
          stroke={stroke}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    case "attention":
      return (
        <>
          <path d="M6 2.5v5" fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
          <circle cx="6" cy="10" r="0.85" fill={stroke} />
        </>
      );
    case "question":
      return (
        <>
          <path
            d="M4 3.8a2 2 0 1 1 2.6 1.9c-.55.3-.95.75-.95 1.5"
            fill="none"
            stroke={stroke}
            strokeWidth={2}
            strokeLinecap="round"
          />
          <circle cx="6" cy="10" r="0.85" fill={stroke} />
        </>
      );
    case "working":
      return (
        <>
          <circle cx="6" cy="6" r="4.2" fill="none" stroke={stroke} strokeWidth={1.75} />
          <path
            d="M6 3.6v2.6l1.8 1.1"
            fill="none"
            stroke={stroke}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      );
    case "neu":
      return (
        <path
          d="M6 1.6l1 2.5 2.7.25-2.1 1.8.7 2.6L6 7.6 3.7 8.75l.7-2.6-2.1-1.8 2.7-.25z"
          fill={stroke}
        />
      );
  }
}
