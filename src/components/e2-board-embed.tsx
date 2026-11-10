"use client";

import { BoardEmbedShell, type BoardEmbedShellProps } from "@/components/board-embed-shell";
import { I18nProvider } from "@/i18n";

export type E2BoardEmbedProps = Omit<BoardEmbedShellProps, "children"> & {
  locale?: "de" | "en";
  /** Fixed inline height when not fullscreen (default 28rem) */
  height?: string | number;
};

/**
 * Drop-in E2 board for React / MDX hosts (markdown apps, Next.js, etc.).
 * Pan/zoom, selection highlighting, glossary, hotspots, and multi-tab views.
 *
 * For multiple boards on one static HTML page, prefer iframe + `embed-host.js`
 * (see `docs/EMBED.md`) — the Zustand store is a single document instance.
 */
export function E2BoardEmbed({
  locale,
  height = "28rem",
  className,
  style,
  ...shell
}: E2BoardEmbedProps) {
  const mergedStyle: React.CSSProperties = {
    minHeight: typeof height === "number" ? `${height}px` : height,
    ...style,
  };

  return (
    <I18nProvider initialLocale={locale}>
      <BoardEmbedShell {...shell} className={className} style={mergedStyle} />
    </I18nProvider>
  );
}
