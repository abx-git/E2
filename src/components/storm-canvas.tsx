"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { CanvasBoardChrome } from "@/components/canvas-board-chrome";
import { CanvasLines } from "@/components/canvas-lines";
import { BoundedContextLayer } from "@/components/bounded-context-layer";
import { ContextMapConnectors } from "@/components/context-map-connectors";
import { StormConnectors } from "@/components/storm-connectors";
import { StormElementCard } from "@/components/storm-element-card";
import { SwimlaneLayer } from "@/components/swimlane-layer";
import { TimelineGuide } from "@/components/timeline-guide";
import { snapToGrid, snapToTimeline, screenToWorld, zoomAtPoint, ZOOM_STEP } from "@/lib/canvas-viewport";
import { getAllowedTypesForPhase } from "@/lib/facilitator-phases";
import { elementsInMarquee, swimlanesInMarquee, boundedContextsInMarquee, type WorldRect } from "@/lib/selection-geometry";
import { lineLength } from "@/lib/canvas-annotations";
import { sortElementsByZOrder } from "@/lib/element-z-order";
import { useIsCoarsePointer } from "@/lib/use-media-query";
import { useStormBoardStore } from "@/store/storm-board-store";

const MARQUEE_THRESHOLD_PX = 4;
const PAN_MOVE_THRESHOLD_PX = 3;
const MIN_LINE_LENGTH_WORLD = 8;

function isCanvasChromeTarget(target: EventTarget | null): boolean {
  return Boolean((target as Element | null)?.closest?.("[data-canvas-chrome]"));
}

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  const tag = el?.tagName?.toLowerCase();
  return tag === "input" || tag === "textarea" || Boolean(el?.isContentEditable);
}

function shouldIgnoreSpaceForPan(target: EventTarget | null): boolean {
  if (isTypingTarget(target)) return true;
  const el = target as HTMLElement | null;
  if (!el?.closest) return false;
  return Boolean(
    el.closest("button, a, input, textarea, select, [role='dialog'], [data-canvas-chrome]"),
  );
}

function wheelDeltaPixels(e: WheelEvent, fallbackLine = 16): { dx: number; dy: number } {
  let dx = e.deltaX;
  let dy = e.deltaY;
  if (e.deltaMode === 1) {
    dx *= fallbackLine;
    dy *= fallbackLine;
  } else if (e.deltaMode === 2) {
    dx *= window.innerWidth;
    dy *= window.innerHeight;
  }
  return { dx, dy };
}

export function StormCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [panning, setPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
  const spaceDown = useRef(false);
  const panningRef = useRef(false);
  const panMoved = useRef(false);
  /** Empty-canvas left-drag vs Space/middle-mouse — only the former clears selection on click. */
  const panFromEmptyClick = useRef(false);
  /** Touch on empty canvas: defer pan until move threshold; tap clears selection. */
  const touchPanPending = useRef<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    pointerId: number;
  } | null>(null);
  const isCoarsePointer = useIsCoarsePointer();

  const viewport = useStormBoardStore((s) => s.viewport);
  const setViewport = useStormBoardStore((s) => s.setViewport);
  const elements = useStormBoardStore((s) => s.elements);
  const relations = useStormBoardStore((s) => s.relations);
  const contextRelations = useStormBoardStore((s) => s.contextRelations);
  const boundedContexts = useStormBoardStore((s) => s.boundedContexts);
  const timeline = useStormBoardStore((s) => s.timeline);
  const snapToTimelineEnabled = useStormBoardStore((s) => s.snapToTimeline);
  const snapToGridEnabled = useStormBoardStore((s) => s.snapToGrid);
  const paletteType = useStormBoardStore((s) => s.paletteType);
  const setPaletteType = useStormBoardStore((s) => s.setPaletteType);
  const modelingMode = useStormBoardStore((s) => s.modelingMode);
  const workshopFormat = useStormBoardStore((s) => s.workshopFormat);
  const facilitatorEnabled = useStormBoardStore((s) => s.facilitatorEnabled);
  const facilitatorPhase = useStormBoardStore((s) => s.facilitatorPhase);
  const selectedElementIds = useStormBoardStore((s) => s.selectedElementIds);
  const selectedRelationId = useStormBoardStore((s) => s.selectedRelationId);
  const selectedContextRelationId = useStormBoardStore((s) => s.selectedContextRelationId);
  const relationMode = useStormBoardStore((s) => s.relationMode);
  const relationDraftSourceId = useStormBoardStore((s) => s.relationDraftSourceId);
  const contextMapMode = useStormBoardStore((s) => s.contextMapMode);
  const contextMapDraftSourceId = useStormBoardStore((s) => s.contextMapDraftSourceId);
  const lineDrawMode = useStormBoardStore((s) => s.lineDrawMode);
  const lineArrowHead = useStormBoardStore((s) => s.lineArrowHead);
  const selectedCanvasLineId = useStormBoardStore((s) => s.selectedCanvasLineId);

  const addElement = useStormBoardStore((s) => s.addElement);
  const selectElement = useStormBoardStore((s) => s.selectElement);
  const setCanvasSelection = useStormBoardStore((s) => s.setCanvasSelection);
  const selectRelation = useStormBoardStore((s) => s.selectRelation);
  const selectContextRelation = useStormBoardStore((s) => s.selectContextRelation);
  const clearSelection = useStormBoardStore((s) => s.clearSelection);
  const setRelationDraftSource = useStormBoardStore((s) => s.setRelationDraftSource);
  const setContextMapDraftSource = useStormBoardStore((s) => s.setContextMapDraftSource);
  const connectElements = useStormBoardStore((s) => s.connectElements);
  const addBoundedContext = useStormBoardStore((s) => s.addBoundedContext);
  const addCanvasLine = useStormBoardStore((s) => s.addCanvasLine);
  const selectCanvasLine = useStormBoardStore((s) => s.selectCanvasLine);
  const deleteCanvasLine = useStormBoardStore((s) => s.deleteCanvasLine);
  const setLineDrawMode = useStormBoardStore((s) => s.setLineDrawMode);

  const [bcDraft, setBcDraft] = useState<WorldRect | null>(null);
  const [bcMode, setBcMode] = useState(false);
  const bcStart = useRef<{ x: number; y: number } | null>(null);

  const [lineDraft, setLineDraft] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(
    null,
  );
  const lineStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (relationMode || contextMapMode || lineDrawMode) setBcMode(false);
  }, [relationMode, contextMapMode, lineDrawMode]);

  const [marqueeDraft, setMarqueeDraft] = useState<WorldRect | null>(null);
  const marqueeStart = useRef<{ x: number; y: number; additive: boolean } | null>(null);
  const marqueeDraftRef = useRef<WorldRect | null>(null);

  const sourceElement = elements.find((e) => e.id === relationDraftSourceId);
  const contextMapSource = boundedContexts.find((b) => b.id === contextMapDraftSourceId);

  const applySnap = useCallback(
    (x: number, y: number) => {
      let nx = x;
      let ny = y;
      if (snapToGridEnabled) {
        nx = snapToGrid(nx);
        ny = snapToGrid(ny);
      }
      if (snapToTimelineEnabled) {
        ny = snapToTimeline(ny, timeline.y);
      }
      return { x: nx, y: ny };
    },
    [snapToGridEnabled, snapToTimelineEnabled, timeline.y],
  );

  const addAtViewportCenter = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = rect.left + rect.width / 2;
    const clientY = rect.top + rect.height / 2;
    const world = screenToWorld(viewport, clientX, clientY, rect);
    const snapped = applySnap(world.x, world.y);
    const type = useStormBoardStore.getState().paletteType;
    addElement(type, snapped.x, snapped.y);
  }, [viewport, applySnap, addElement]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;

      if (e.key === "Escape") {
        if (relationDraftSourceId) setRelationDraftSource(null);
        if (contextMapDraftSourceId) setContextMapDraftSource(null);
        if (lineDrawMode) setLineDrawMode(false);
        if (relationMode) {
          useStormBoardStore.getState().setRelationMode(false);
          useStormBoardStore.getState().setContextMapMode(false);
        }
        if (bcMode) setBcMode(false);
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        const lineId = useStormBoardStore.getState().selectedCanvasLineId;
        if (lineId) {
          e.preventDefault();
          deleteCanvasLine(lineId);
        }
        return;
      }

      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const digitMatch = e.key.match(/^([0-9])$/);
      if (digitMatch) {
        const digit = Number(digitMatch[1]);
        const index = digit === 0 ? 9 : digit - 1;
        const allowed = getAllowedTypesForPhase(
          modelingMode,
          workshopFormat,
          facilitatorPhase,
          facilitatorEnabled,
        );
        const type = allowed[index];
        if (type) {
          e.preventDefault();
          setPaletteType(type);
        }
        return;
      }

      if (e.key === "Enter" || e.key === "a" || e.key === "A") {
        if (bcMode || relationMode || contextMapMode || lineDrawMode) return;
        e.preventDefault();
        addAtViewportCenter();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    relationDraftSourceId,
    setRelationDraftSource,
    contextMapDraftSourceId,
    setContextMapDraftSource,
    workshopFormat,
    modelingMode,
    facilitatorPhase,
    facilitatorEnabled,
    setPaletteType,
    addAtViewportCenter,
    bcMode,
    relationMode,
    bcMode,
    lineDrawMode,
    setLineDrawMode,
    deleteCanvasLine,
  ]);

  // Space for pan: window-level so it works without canvas focus and over stickies.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" || shouldIgnoreSpaceForPan(e.target)) return;
      if (e.repeat) {
        e.preventDefault();
        return;
      }
      e.preventDefault();
      spaceDown.current = true;
    };
    const clearSpace = () => {
      spaceDown.current = false;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") clearSpace();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", clearSpace);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clearSpace);
    };
  }, []);

  // Trackpad: two-finger scroll pans. Mouse wheel pans; Ctrl/Cmd+wheel zooms
  // (pinch = pixel deltas, mouse wheel = discrete steps like ET2).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const vp = useStormBoardStore.getState().viewport;
      const setVp = useStormBoardStore.getState().setViewport;
      if (e.ctrlKey || e.metaKey) {
        const { dy } = wheelDeltaPixels(e);
        const zoomDelta =
          e.deltaMode === 0 ? -dy * 0.01 : dy > 0 ? -ZOOM_STEP : ZOOM_STEP;
        const rect = el.getBoundingClientRect();
        setVp(zoomAtPoint(vp, zoomDelta, e.clientX, e.clientY, rect));
        return;
      }
      const { dx, dy } = wheelDeltaPixels(e);
      setVp({ ...vp, x: vp.x - dx, y: vp.y - dy });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const beginPan = useCallback(
    (e: React.PointerEvent, fromEmptyClick = false) => {
      e.preventDefault();
      e.stopPropagation();
      const vp = useStormBoardStore.getState().viewport;
      panningRef.current = true;
      panMoved.current = false;
      panFromEmptyClick.current = fromEmptyClick;
      setPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY, vx: vp.x, vy: vp.y };
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    },
    [],
  );

  const endPan = useCallback((e?: React.PointerEvent) => {
    panningRef.current = false;
    setPanning(false);
    if (e && e.currentTarget instanceof HTMLElement && e.currentTarget.hasPointerCapture(e.pointerId)) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const promoteTouchPan = useCallback((clientX: number, clientY: number, currentTarget: EventTarget) => {
    const pending = touchPanPending.current;
    if (!pending) return false;
    const dx = clientX - pending.x;
    const dy = clientY - pending.y;
    if (Math.hypot(dx, dy) < MARQUEE_THRESHOLD_PX) return false;
    touchPanPending.current = null;
    panningRef.current = true;
    panMoved.current = true;
    panFromEmptyClick.current = false;
    setPanning(true);
    panStart.current = { x: pending.x, y: pending.y, vx: pending.vx, vy: pending.vy };
    try {
      (currentTarget as HTMLElement).setPointerCapture(pending.pointerId);
    } catch {
      /* ignore */
    }
    return true;
  }, []);

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (isCanvasChromeTarget(e.target)) return;
    if (!containerRef.current || bcMode || relationMode || contextMapMode || lineDrawMode) return;
    const rect = containerRef.current.getBoundingClientRect();
    const world = screenToWorld(viewport, e.clientX, e.clientY, rect);
    const snapped = applySnap(world.x, world.y);
    addElement(paletteType, snapped.x, snapped.y);
  };

  const handleStartConnect = (id: string) => {
    if (relationDraftSourceId === id) {
      setRelationDraftSource(null);
      return;
    }
    setContextMapDraftSource(null);
    setRelationDraftSource(id);
    selectElement(id);
  };

  const handleCompleteConnect = (targetId: string) => {
    setContextMapDraftSource(null);
    if (!relationDraftSourceId) {
      setRelationDraftSource(targetId);
      selectElement(targetId);
      return;
    }
    if (relationDraftSourceId === targetId) {
      setRelationDraftSource(null);
      return;
    }
    connectElements(relationDraftSourceId, targetId);
    setRelationDraftSource(null);
  };

  const handleMoveCanvasSelection = (updates: {
    elements?: Array<{ id: string; x: number; y: number }>;
    swimlanes?: Array<{ id: string; x: number; y: number }>;
    boundedContexts?: Array<{ id: string; x: number; y: number }>;
  }) => {
    const elementUpdates = updates.elements ?? [];
    const swimlaneUpdates = updates.swimlanes ?? [];
    const bcUpdates = updates.boundedContexts ?? [];
    const primary = elementUpdates[0] ?? swimlaneUpdates[0] ?? bcUpdates[0];
    if (!primary) return;

    const snapped = applySnap(primary.x, primary.y);
    const dx = snapped.x - primary.x;
    const dy = snapped.y - primary.y;
    const shift = <T extends { x: number; y: number }>(items: T[]) =>
      items.map((u) => ({ ...u, x: u.x + dx, y: u.y + dy }));

    useStormBoardStore.getState().moveCanvasSelection({
      elements: shift(elementUpdates),
      swimlanes: shift(swimlaneUpdates),
      boundedContexts: shift(bcUpdates),
    });
  };

  const handleResizeElement = (
    id: string,
    patch: { x: number; y: number; width: number; height: number },
  ) => {
    useStormBoardStore.getState().updateElement(id, patch);
  };

  const worldFromClient = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return null;
      const rect = containerRef.current.getBoundingClientRect();
      return screenToWorld(viewport, clientX, clientY, rect);
    },
    [viewport],
  );

  const finishMarquee = useCallback(() => {
    const start = marqueeStart.current;
    const draft = marqueeDraftRef.current;
    marqueeStart.current = null;
    marqueeDraftRef.current = null;
    setMarqueeDraft(null);
    if (!start || !draft) return;

    const store = useStormBoardStore.getState();
    const zoom = store.viewport.zoom;
    const largeEnough =
      draft.w * zoom >= MARQUEE_THRESHOLD_PX || draft.h * zoom >= MARQUEE_THRESHOLD_PX;
    if (!largeEnough) {
      if (!start.additive) clearSelection();
      return;
    }

    const elementIds = elementsInMarquee(store.elements, draft);
    const swimlaneIds = swimlanesInMarquee(store.swimlanes, draft);
    const boundedContextIds = boundedContextsInMarquee(store.boundedContexts, draft);
    if (elementIds.length > 0 || swimlaneIds.length > 0 || boundedContextIds.length > 0) {
      setCanvasSelection({ elementIds, swimlaneIds, boundedContextIds }, start.additive);
      return;
    }

    if (!start.additive) clearSelection();
  }, [clearSelection, setCanvasSelection]);

  const startMarquee = useCallback(
    (clientX: number, clientY: number, additive: boolean) => {
      const world = worldFromClient(clientX, clientY);
      if (!world) return;
      marqueeStart.current = { x: world.x, y: world.y, additive };
      const draft = { x: world.x, y: world.y, w: 0, h: 0 };
      marqueeDraftRef.current = draft;
      setMarqueeDraft(draft);

      const onMove = (ev: PointerEvent) => {
        if (!marqueeStart.current) return;
        const w = worldFromClient(ev.clientX, ev.clientY);
        if (!w) return;
        const sx = marqueeStart.current.x;
        const sy = marqueeStart.current.y;
        const next = {
          x: Math.min(sx, w.x),
          y: Math.min(sy, w.y),
          w: Math.abs(w.x - sx),
          h: Math.abs(w.y - sy),
        };
        marqueeDraftRef.current = next;
        setMarqueeDraft(next);
      };

      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        finishMarquee();
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [finishMarquee, worldFromClient],
  );

  return (
    <div
      ref={containerRef}
      data-storm-canvas
      className={[
        "absolute inset-0 overflow-hidden bg-canvas outline-none touch-none",
        bcMode || lineDrawMode
          ? "cursor-crosshair"
          : panning
            ? "cursor-grabbing"
            : "cursor-grab",
      ].join(" ")}
      onContextMenu={(e) => {
        if (isCanvasChromeTarget(e.target)) return;
        e.preventDefault();
        const world = worldFromClient(e.clientX, e.clientY);
        if (!world) return;
        useStormBoardStore.getState().openContextMenu(e.clientX, e.clientY, {
          kind: "canvas",
          worldX: world.x,
          worldY: world.y,
        });
      }}
      onPointerDownCapture={(e) => {
        if (isCanvasChromeTarget(e.target)) return;
        // Middle-mouse or Space+left = pan, including over stickies.
        if (e.button === 1 || (e.button === 0 && spaceDown.current)) {
          beginPan(e);
        }
      }}
      onPointerDown={(e) => {
        useStormBoardStore.getState().closeContextMenu();
        if (isCanvasChromeTarget(e.target)) return;
        if (
          panningRef.current ||
          touchPanPending.current ||
          e.button === 1 ||
          e.button === 2 ||
          (e.button === 0 && spaceDown.current)
        ) {
          return;
        }
        if (e.button !== 0) return;
        if (lineDrawMode) {
          const world = worldFromClient(e.clientX, e.clientY);
          if (!world) return;
          lineStart.current = { x: world.x, y: world.y };
          setLineDraft({ x1: world.x, y1: world.y, x2: world.x, y2: world.y });
          return;
        }
        if (bcMode) {
          const world = worldFromClient(e.clientX, e.clientY);
          if (!world) return;
          bcStart.current = { x: world.x, y: world.y };
          setBcDraft({ x: world.x, y: world.y, w: 0, h: 0 });
          return;
        }
        if (relationMode) setRelationDraftSource(null);
        if (contextMapMode) setContextMapDraftSource(null);
        if (e.pointerType === "touch" || isCoarsePointer) {
          const vp = useStormBoardStore.getState().viewport;
          touchPanPending.current = {
            x: e.clientX,
            y: e.clientY,
            vx: vp.x,
            vy: vp.y,
            pointerId: e.pointerId,
          };
          try {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          } catch {
            /* ignore */
          }
          return;
        }
        // Shift+drag on empty area = lasso (like ET2). Otherwise pan the workspace.
        if (e.shiftKey) {
          startMarquee(e.clientX, e.clientY, false);
          return;
        }
        beginPan(e, true);
      }}
      onPointerMove={(e) => {
        if (touchPanPending.current) {
          promoteTouchPan(e.clientX, e.clientY, e.currentTarget);
        }
        if (panningRef.current) {
          const dx = e.clientX - panStart.current.x;
          const dy = e.clientY - panStart.current.y;
          if (Math.abs(dx) + Math.abs(dy) > PAN_MOVE_THRESHOLD_PX) panMoved.current = true;
          setViewport({
            ...useStormBoardStore.getState().viewport,
            x: panStart.current.vx + dx,
            y: panStart.current.vy + dy,
          });
        }
        if (bcMode && bcStart.current) {
          const world = worldFromClient(e.clientX, e.clientY);
          if (!world) return;
          const sx = bcStart.current.x;
          const sy = bcStart.current.y;
          setBcDraft({
            x: Math.min(sx, world.x),
            y: Math.min(sy, world.y),
            w: Math.abs(world.x - sx),
            h: Math.abs(world.y - sy),
          });
        }
        if (lineDrawMode && lineStart.current) {
          const world = worldFromClient(e.clientX, e.clientY);
          if (!world) return;
          const sx = lineStart.current.x;
          const sy = lineStart.current.y;
          setLineDraft({ x1: sx, y1: sy, x2: world.x, y2: world.y });
        }
      }}
      onPointerUp={(e) => {
        if (touchPanPending.current) {
          touchPanPending.current = null;
          if (!panningRef.current) clearSelection();
        }
        const emptyClick = panningRef.current && !panMoved.current && panFromEmptyClick.current;
        if (panningRef.current) endPan(e);
        else if (e.currentTarget instanceof HTMLElement && e.currentTarget.hasPointerCapture(e.pointerId)) {
          try {
            e.currentTarget.releasePointerCapture(e.pointerId);
          } catch {
            /* ignore */
          }
        }
        if (emptyClick) clearSelection();
        if (bcMode && bcDraft && bcDraft.w > 40 && bcDraft.h > 40) {
          addBoundedContext(bcDraft.x, bcDraft.y, bcDraft.w, bcDraft.h);
        }
        if (lineDrawMode && lineDraft && lineLength(lineDraft) >= MIN_LINE_LENGTH_WORLD) {
          addCanvasLine({
            x1: lineDraft.x1,
            y1: lineDraft.y1,
            x2: lineDraft.x2,
            y2: lineDraft.y2,
            arrowHead: lineArrowHead,
          });
        }
        bcStart.current = null;
        setBcDraft(null);
        lineStart.current = null;
        setLineDraft(null);
      }}
      onPointerCancel={(e) => {
        touchPanPending.current = null;
        if (panningRef.current) endPan(e);
        else if (e.currentTarget instanceof HTMLElement && e.currentTarget.hasPointerCapture(e.pointerId)) {
          try {
            e.currentTarget.releasePointerCapture(e.pointerId);
          } catch {
            /* ignore */
          }
        }
        bcStart.current = null;
        setBcDraft(null);
        lineStart.current = null;
        setLineDraft(null);
      }}
      onDoubleClick={handleDoubleClick}
      tabIndex={0}
    >
      <div
        data-canvas-world
        className="absolute origin-top-left"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          width: 4000,
          height: 3000,
        }}
      >
        <div
          className="absolute left-0 top-0"
          style={{ zIndex: 1, width: 4000, height: 3000 }}
        >
          <SwimlaneLayer />
          <BoundedContextLayer />
        </div>
        <ContextMapConnectors
          boundedContexts={boundedContexts}
          contextRelations={contextRelations}
          selectedContextRelationId={selectedContextRelationId}
          contextMapDraftSourceId={contextMapDraftSourceId}
          onSelectContextRelation={selectContextRelation}
        />
        {bcDraft && (
          <div
            className="pointer-events-none absolute border-2 border-dashed border-blue-500 bg-blue-100/30"
            style={{ left: bcDraft.x, top: bcDraft.y, width: bcDraft.w, height: bcDraft.h }}
          />
        )}
        {marqueeDraft && (
          <div
            className="pointer-events-none absolute border border-sky-500 bg-sky-400/15"
            style={{
              left: marqueeDraft.x,
              top: marqueeDraft.y,
              width: marqueeDraft.w,
              height: marqueeDraft.h,
              zIndex: 50,
            }}
          />
        )}
        <TimelineGuide />
        <StormConnectors
          elements={elements}
          relations={relations}
          selectedRelationId={selectedRelationId}
          relationDraftSourceId={relationDraftSourceId}
          onSelectRelation={selectRelation}
        />
        <CanvasLines
          selectedLineId={selectedCanvasLineId}
          onSelectLine={selectCanvasLine}
          draftLine={lineDraft}
        />
        {sortElementsByZOrder(elements).map((el) => (
          <StormElementCard
            key={el.id}
            element={el}
            selected={selectedElementIds.includes(el.id)}
            selectedIds={selectedElementIds}
            connecting={relationDraftSourceId === el.id}
            isRelationTargetHint={Boolean(relationDraftSourceId && relationDraftSourceId !== el.id)}
            relationMode={relationMode}
            zoom={viewport.zoom}
            onSelect={selectElement}
            onMoveMany={handleMoveCanvasSelection}
            onResize={handleResizeElement}
            onStartConnect={handleStartConnect}
            onCompleteConnect={handleCompleteConnect}
          />
        ))}
      </div>

      <CanvasBoardChrome
        bcMode={bcMode}
        onToggleBcMode={() => setBcMode((v) => !v)}
        status={
          relationDraftSourceId && sourceElement
            ? {
                message: (
                  <>
                    Von <strong className="text-[var(--accent-2)]">{sourceElement.label}</strong> — Ziel
                    anklicken
                  </>
                ),
                onCancel: () => setRelationDraftSource(null),
              }
            : contextMapDraftSourceId && contextMapSource
              ? {
                  message: (
                    <>
                      Von{" "}
                      <strong className="text-[var(--accent-2)]">{contextMapSource.label}</strong> —
                      Ziel-BC anklicken
                    </>
                  ),
                  onCancel: () => setContextMapDraftSource(null),
                }
              : relationMode
                ? {
                    message: "Verbinden: Element oder Bounded Context wählen",
                    onCancel: () => {
                      useStormBoardStore.getState().setRelationMode(false);
                      useStormBoardStore.getState().setContextMapMode(false);
                      setRelationDraftSource(null);
                      setContextMapDraftSource(null);
                    },
                  }
                : lineDrawMode
                  ? {
                      message: "Linie ziehen · Esc beendet",
                      onCancel: () => setLineDrawMode(false),
                    }
                  : bcMode
                    ? {
                        message: "Rechteck ziehen · Esc beendet",
                        onCancel: () => setBcMode(false),
                      }
                    : null
        }
      />
    </div>
  );
}
