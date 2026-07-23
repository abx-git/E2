"use client";

import type { ReactNode } from "react";

import { splitHighlight } from "@/lib/element-search";

const MARK_CLASS =
  "rounded-[2px] bg-[var(--accent-2)]/70 px-0.5 text-inherit [box-decoration-break:clone]";

/** Renders `text` with case-insensitive highlights for `query`. */
export function HighlightedText({
  text,
  query,
  className,
}: {
  text: string;
  query: string;
  className?: string;
}): ReactNode {
  const parts = splitHighlight(text, query);
  const hasHit = parts.some((p) => p.hit);
  if (!hasHit) {
    return className ? <span className={className}>{text}</span> : text;
  }
  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.hit ? (
          <mark key={i} className={MARK_CLASS}>
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </span>
  );
}
