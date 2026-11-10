"use client";

import { Maximize2, Minimize2 } from "lucide-react";

import { BoardViewTabs } from "@/components/board-view-tabs";
import { useStormBoardStore } from "@/store/storm-board-store";
import { useT } from "@/i18n";

export interface BoardEmbedAppBarProps {
  fullscreen?: boolean;
  onToggleFullscreen?: () => void;
  allowViewManagement?: boolean;
}

export function BoardEmbedAppBar({
  fullscreen,
  onToggleFullscreen,
  allowViewManagement = false,
}: BoardEmbedAppBarProps) {
  const t = useT();
  const title = useStormBoardStore((s) => s.title);

  return (
    <header className="dock-surface relative z-40 shrink-0 rounded-dock">
      <div className="flex items-center gap-2 px-3 py-2">
        <h1
          className="min-w-0 flex-1 truncate px-1 text-[0.95rem] font-semibold tracking-tight text-[var(--text)]"
          title={title}
        >
          {title || t("common.unnamedBoard")}
        </h1>
        {onToggleFullscreen ? (
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="dock-control rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--control)] hover:text-[var(--text)]"
            title={fullscreen ? t("embed.exitFullscreen") : t("embed.enterFullscreen")}
            aria-label={fullscreen ? t("embed.exitFullscreen") : t("embed.enterFullscreen")}
          >
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        ) : null}
      </div>
      <div className="border-t border-[var(--border)] px-1">
        <BoardViewTabs allowViewManagement={allowViewManagement} />
      </div>
    </header>
  );
}
