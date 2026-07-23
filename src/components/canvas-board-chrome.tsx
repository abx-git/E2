"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Layers,
  Link2,
  Map,
  MoreHorizontal,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { clampZoom } from "@/lib/canvas-viewport";
import { useStormBoardStore } from "@/store/storm-board-store";

function ToolButton({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={[
        "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium shadow-dock transition",
        active ? "dock-control-active" : "dock-surface text-[var(--text)] hover:bg-[var(--control)]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function ViewMenu({
  open,
  onClose,
  anchorRef,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const timeline = useStormBoardStore((s) => s.timeline);
  const setTimeline = useStormBoardStore((s) => s.setTimeline);
  const snapToTimeline = useStormBoardStore((s) => s.snapToTimeline);
  const setSnapToTimeline = useStormBoardStore((s) => s.setSnapToTimeline);
  const snapToGrid = useStormBoardStore((s) => s.snapToGrid);
  const setSnapToGrid = useStormBoardStore((s) => s.setSnapToGrid);
  const focusMode = useStormBoardStore((s) => s.focusMode);
  const setFocusMode = useStormBoardStore((s) => s.setFocusMode);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || anchorRef.current?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className="dock-surface absolute bottom-[calc(100%+0.4rem)] left-0 z-50 min-w-[14rem] rounded-xl p-2 shadow-dock"
      role="menu"
    >
      <p className="group-label px-2 pb-1.5 pt-1">Ansicht</p>
      <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-[var(--control)]">
        <input
          type="checkbox"
          checked={timeline.visible !== false}
          onChange={(e) => setTimeline({ visible: e.target.checked })}
        />
        Timeline anzeigen
      </label>
      <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-[var(--control)]">
        <input
          type="checkbox"
          checked={snapToTimeline}
          onChange={(e) => setSnapToTimeline(e.target.checked)}
        />
        An Timeline einrasten
      </label>
      <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-[var(--control)]">
        <input
          type="checkbox"
          checked={snapToGrid}
          onChange={(e) => setSnapToGrid(e.target.checked)}
        />
        Raster
      </label>
      <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-[var(--control)]">
        <input
          type="checkbox"
          checked={focusMode}
          onChange={(e) => setFocusMode(e.target.checked)}
        />
        Fokus (nur Palette-Typ)
      </label>
    </div>
  );
}

export interface CanvasBoardChromeProps {
  bcMode: boolean;
  onToggleBcMode: () => void;
  hint: string;
}

/** Floating tool + zoom chrome for the canvas. */
export function CanvasBoardChrome({ bcMode, onToggleBcMode, hint }: CanvasBoardChromeProps) {
  const relationMode = useStormBoardStore((s) => s.relationMode);
  const setRelationMode = useStormBoardStore((s) => s.setRelationMode);
  const setRelationDraftSource = useStormBoardStore((s) => s.setRelationDraftSource);
  const contextMapMode = useStormBoardStore((s) => s.contextMapMode);
  const setContextMapMode = useStormBoardStore((s) => s.setContextMapMode);
  const setContextMapDraftSource = useStormBoardStore((s) => s.setContextMapDraftSource);
  const addSwimlane = useStormBoardStore((s) => s.addSwimlane);
  const viewport = useStormBoardStore((s) => s.viewport);
  const setViewport = useStormBoardStore((s) => s.setViewport);
  const snapToGrid = useStormBoardStore((s) => s.snapToGrid);
  const focusMode = useStormBoardStore((s) => s.focusMode);

  const [viewOpen, setViewOpen] = useState(false);
  const viewBtnRef = useRef<HTMLButtonElement>(null);

  const viewHighlighted = viewOpen || snapToGrid || focusMode;

  return (
    <>
      <div
        className="absolute bottom-3 left-3 z-30 flex max-w-[min(100%-6rem,40rem)] flex-wrap items-center gap-1.5"
        data-canvas-chrome
      >
        <ToolButton
          active={relationMode}
          title="Elemente verbinden"
          onClick={() => {
            const next = !relationMode;
            setRelationMode(next);
            if (!next) setRelationDraftSource(null);
            if (next) {
              setContextMapMode(false);
              setContextMapDraftSource(null);
            }
          }}
        >
          <Link2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Verbinden</span>
        </ToolButton>
        <ToolButton
          active={contextMapMode}
          title="Context Map: Bounded Contexts verbinden"
          onClick={() => {
            const next = !contextMapMode;
            setContextMapMode(next);
            if (!next) setContextMapDraftSource(null);
            if (next) {
              setRelationMode(false);
              setRelationDraftSource(null);
            }
          }}
        >
          <Map className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Context Map</span>
        </ToolButton>
        <ToolButton title="Swimlane hinzufügen" onClick={() => addSwimlane()}>
          <Layers className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Swimlane</span>
        </ToolButton>
        <ToolButton
          active={bcMode}
          title="Bounded Context zeichnen"
          onClick={() => {
            if (!bcMode) {
              setRelationMode(false);
              setRelationDraftSource(null);
              setContextMapMode(false);
              setContextMapDraftSource(null);
            }
            onToggleBcMode();
          }}
        >
          <span className="sm:hidden">BC</span>
          <span className="hidden sm:inline">
            {bcMode ? "BC zeichnen…" : "Bounded Context"}
          </span>
        </ToolButton>

        <div className="relative">
          <button
            ref={viewBtnRef}
            type="button"
            onClick={() => setViewOpen((v) => !v)}
            title="Ansichtsoptionen"
            aria-expanded={viewOpen}
            className={[
              "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium shadow-dock",
              viewHighlighted ? "dock-control-active" : "dock-surface text-[var(--text)]",
            ].join(" ")}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Ansicht</span>
          </button>
          <ViewMenu open={viewOpen} onClose={() => setViewOpen(false)} anchorRef={viewBtnRef} />
        </div>

        <span className="dock-surface hidden max-w-[16rem] truncate rounded-lg px-2.5 py-1.5 text-[0.7rem] text-[var(--muted)] shadow-dock lg:inline">
          {hint}
        </span>
      </div>

      <div
        className="dock-surface absolute bottom-3 right-3 z-30 flex items-center gap-0.5 rounded-xl p-0.5 shadow-dock"
        data-canvas-chrome
      >
        <button
          type="button"
          className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--control)] hover:text-[var(--text)]"
          title="Verkleinern"
          onClick={() => setViewport({ ...viewport, zoom: clampZoom(viewport.zoom - 0.1) })}
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="min-w-[2.75rem] text-center text-xs tabular-nums text-[var(--muted)]">
          {Math.round(viewport.zoom * 100)}%
        </span>
        <button
          type="button"
          className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--control)] hover:text-[var(--text)]"
          title="Vergrößern"
          onClick={() => setViewport({ ...viewport, zoom: clampZoom(viewport.zoom + 0.1) })}
        >
          <ZoomIn className="h-4 w-4" />
        </button>
      </div>
    </>
  );
}
