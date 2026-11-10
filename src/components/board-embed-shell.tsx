"use client";

import { useCallback, useEffect, useId, useState, type ReactNode } from "react";

import { ActionsBoardView } from "@/components/actions/ActionsBoardView";
import { BoardDockReopenButton } from "@/components/board-dock-toggle";
import { BoardEmbedAppBar } from "@/components/board-embed-app-bar";
import { BoardSideRail } from "@/components/board-side-rail";
import { BoundedContextMobileActions } from "@/components/bounded-context-mobile-sheet";
import { MobileBoardBar } from "@/components/mobile-board-bar";
import { StormCanvas } from "@/components/storm-canvas";
import {
  loadEmbedBoardFromPayload,
  loadEmbedBoardFromText,
  loadEmbedBoardFromUrl,
} from "@/lib/embed-board-load";
import type { BoardImportPayload } from "@/lib/storm-json";
import { isActionsView } from "@/lib/storm-json";
import { useStormBoardStore } from "@/store/storm-board-store";

export type BoardEmbedShellProps = {
  /** Raw `.e2.json` text */
  document?: string;
  /** Parsed board payload */
  payload?: BoardImportPayload;
  /** Remote board URL (HTTPS / localhost) */
  src?: string;
  /** Allow sticky drag, palette, and structural edits */
  editable?: boolean;
  /** Allow create/rename/delete view tabs */
  allowViewManagement?: boolean;
  /** Default true — expand to viewport with app bar control */
  allowFullscreen?: boolean;
  /** Click/double-click on canvas opens fullscreen when allowed */
  fullscreenOnClick?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: ReactNode;
  onLoadError?: (reason: string) => void;
  onLoaded?: () => void;
};

export function BoardEmbedShell({
  document: documentText,
  payload,
  src,
  editable = false,
  allowViewManagement = false,
  allowFullscreen = true,
  fullscreenOnClick = true,
  className,
  style,
  children,
  onLoadError,
  onLoaded,
}: BoardEmbedShellProps) {
  const regionId = useId();
  const activeViewId = useStormBoardStore((s) => s.activeViewId);
  const views = useStormBoardStore((s) => s.views);
  const activeView = views.find((v) => v.id === activeViewId);
  const isActionsActive = activeView ? isActionsView(activeView) : false;
  const propertiesPanelOpen = useStormBoardStore((s) => s.propertiesPanelOpen);
  const setPropertiesPanelOpen = useStormBoardStore((s) => s.setPropertiesPanelOpen);
  const [fullscreen, setFullscreen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(Boolean(src));

  const loadFromProps = useCallback(async () => {
    setLoadError(null);
    setBusy(true);
    try {
      if (payload) {
        loadEmbedBoardFromPayload(payload, { editable });
        onLoaded?.();
        return;
      }
      if (documentText?.trim()) {
        const ok = loadEmbedBoardFromText(documentText, { editable });
        if (!ok) {
          const reason = "Invalid E2 board JSON";
          setLoadError(reason);
          onLoadError?.(reason);
          return;
        }
        onLoaded?.();
        return;
      }
      if (src?.trim()) {
        const outcome = await loadEmbedBoardFromUrl(src.trim(), { editable });
        if (!outcome.ok) {
          setLoadError(outcome.reason);
          onLoadError?.(outcome.reason);
          return;
        }
        onLoaded?.();
      }
    } finally {
      setBusy(false);
    }
  }, [documentText, editable, onLoadError, onLoaded, payload, src]);

  useEffect(() => {
    if (!payload && !documentText?.trim() && !src?.trim()) return;
    void loadFromProps();
  }, [documentText, loadFromProps, payload, src]);

  useEffect(() => {
    if (!fullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [fullscreen]);

  const toggleFullscreen = useCallback(() => {
    setFullscreen((v) => !v);
  }, []);

  const shell = (
    <div
      role="region"
      aria-labelledby={regionId}
      className={[
        "flex min-h-0 flex-col overflow-hidden bg-[var(--bg)] text-[var(--text)]",
        fullscreen ? "fixed inset-0 z-[2000]" : "relative h-full w-full",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={style}
      onDoubleClick={(e) => {
        if (!allowFullscreen || !fullscreenOnClick) return;
        const target = e.target as HTMLElement | null;
        if (target?.closest("button,input,textarea,a,[role='dialog']")) return;
        setFullscreen(true);
      }}
    >
      <span id={regionId} className="sr-only">
        E2 board
      </span>
      <BoardEmbedAppBar
        fullscreen={fullscreen}
        onToggleFullscreen={allowFullscreen ? toggleFullscreen : undefined}
        allowViewManagement={allowViewManagement && editable}
      />
      {loadError ? (
        <p className="mx-3 my-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {loadError}
        </p>
      ) : busy ? (
        <p className="mx-3 my-2 text-sm text-[var(--muted)]">Loading board…</p>
      ) : null}
      <div className="flex min-h-0 flex-1 gap-2 p-2 lg:p-3">
        <div className="dock-surface relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-dock">
          {!propertiesPanelOpen ? (
            <BoardDockReopenButton side="right" onOpen={() => setPropertiesPanelOpen(true)} />
          ) : null}
          {isActionsActive && activeViewId ? (
            <ActionsBoardView viewId={activeViewId} />
          ) : (
            <>
              <StormCanvas />
              <BoundedContextMobileActions onOpenDetails={() => setPropertiesPanelOpen(true)} />
              <MobileBoardBar />
            </>
          )}
        </div>
        {propertiesPanelOpen ? (
          <BoardSideRail onHide={() => setPropertiesPanelOpen(false)} />
        ) : null}
      </div>
      {children}
    </div>
  );

  return shell;
}
