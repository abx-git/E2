"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

import { BoundedContextLayer } from "@/components/bounded-context-layer";
import { ContextMapConnectors } from "@/components/context-map-connectors";
import { StormConnectors } from "@/components/storm-connectors";
import { StormElementCard } from "@/components/storm-element-card";
import { SwimlaneLayer } from "@/components/swimlane-layer";
import { TimelineGuide } from "@/components/timeline-guide";
import { snapToGrid, snapToTimeline, screenToWorld, zoomAtPoint } from "@/lib/canvas-viewport";
import { getAllowedTypesForPhase } from "@/lib/facilitator-phases";
import { elementsInMarquee, type WorldRect } from "@/lib/selection-geometry";
import { useStormBoardStore } from "@/store/storm-board-store";

const MARQUEE_THRESHOLD_PX = 4;

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  const tag = el?.tagName?.toLowerCase();
  return tag === "input" || tag === "textarea" || Boolean(el?.isContentEditable);
}

export function StormCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [panning, setPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
  const spaceDown = useRef(false);

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

  const addElement = useStormBoardStore((s) => s.addElement);
  const moveElement = useStormBoardStore((s) => s.moveElement);
  const moveElements = useStormBoardStore((s) => s.moveElements);
  const selectElement = useStormBoardStore((s) => s.selectElement);
  const setSelectedElementIds = useStormBoardStore((s) => s.setSelectedElementIds);
  const selectRelation = useStormBoardStore((s) => s.selectRelation);
  const selectContextRelation = useStormBoardStore((s) => s.selectContextRelation);
  const clearSelection = useStormBoardStore((s) => s.clearSelection);
  const setRelationDraftSource = useStormBoardStore((s) => s.setRelationDraftSource);
  const setContextMapDraftSource = useStormBoardStore((s) => s.setContextMapDraftSource);
  const connectElements = useStormBoardStore((s) => s.connectElements);
  const addBoundedContext = useStormBoardStore((s) => s.addBoundedContext);

  const [bcDraft, setBcDraft] = useState<WorldRect | null>(null);
  const [bcMode, setBcMode] = useState(false);
  const bcStart = useRef<{ x: number; y: number } | null>(null);

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
        return;
      }

      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const digitMatch = e.key.match(/^([0-9])$/);
      if (digitMatch) {
        const digit = Number(digitMatch[1]);
        const index = digit === 0 ? 9 : digit - 1;
        const allowed = getAllowedTypesForPhase(
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
        if (bcMode || relationMode || contextMapMode) return;
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
    facilitatorPhase,
    facilitatorEnabled,
    setPaletteType,
    addAtViewportCenter,
    bcMode,
    relationMode,
    contextMapMode,
  ]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!containerRef.current) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.08 : 0.08;
      const rect = containerRef.current.getBoundingClientRect();
      setViewport(zoomAtPoint(viewport, delta, e.clientX, e.clientY, rect));
    },
    [viewport, setViewport],
  );

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!containerRef.current || bcMode || relationMode || contextMapMode) return;
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
    setRelationDraftSource(id);
    selectElement(id);
  };

  const handleCompleteConnect = (targetId: string) => {
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

  const handleMoveElement = (id: string, x: number, y: number) => {
    const snapped = applySnap(x, y);
    moveElement(id, snapped.x, snapped.y);
  };

  const handleMoveElements = (updates: Array<{ id: string; x: number; y: number }>) => {
    if (updates.length === 0) return;
    if (updates.length === 1) {
      handleMoveElement(updates[0].id, updates[0].x, updates[0].y);
      return;
    }
    // Snap relative to the first (dragged) element so the group keeps spacing.
    const primary = updates[0];
    const snapped = applySnap(primary.x, primary.y);
    const dx = snapped.x - primary.x;
    const dy = snapped.y - primary.y;
    moveElements(updates.map((u) => ({ id: u.id, x: u.x + dx, y: u.y + dy })));
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

    const zoom = useStormBoardStore.getState().viewport.zoom;
    const largeEnough =
      draft.w * zoom >= MARQUEE_THRESHOLD_PX || draft.h * zoom >= MARQUEE_THRESHOLD_PX;
    if (!largeEnough) {
      if (!start.additive) clearSelection();
      return;
    }
    const ids = elementsInMarquee(useStormBoardStore.getState().elements, draft);
    if (ids.length > 0 || !start.additive) {
      setSelectedElementIds(ids, start.additive);
    }
  }, [clearSelection, setSelectedElementIds]);

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
      className="absolute inset-0 overflow-hidden bg-canvas"
      onWheel={handleWheel}
      onPointerDown={(e) => {
        useStormBoardStore.getState().closeContextMenu();
        if (e.button === 1 || spaceDown.current) {
          setPanning(true);
          panStart.current = { x: e.clientX, y: e.clientY, vx: viewport.x, vy: viewport.y };
          return;
        }
        if (e.button !== 0) return;
        if (bcMode) {
          const world = worldFromClient(e.clientX, e.clientY);
          if (!world) return;
          bcStart.current = { x: world.x, y: world.y };
          setBcDraft({ x: world.x, y: world.y, w: 0, h: 0 });
          return;
        }
        // Empty surface (interactive children stopPropagation): start marquee select.
        if (relationMode) setRelationDraftSource(null);
        if (contextMapMode) setContextMapDraftSource(null);
        startMarquee(e.clientX, e.clientY, e.shiftKey);
      }}
      onPointerMove={(e) => {
        if (panning) {
          const dx = e.clientX - panStart.current.x;
          const dy = e.clientY - panStart.current.y;
          setViewport({ ...viewport, x: panStart.current.vx + dx, y: panStart.current.vy + dy });
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
      }}
      onPointerUp={() => {
        setPanning(false);
        if (bcMode && bcDraft && bcDraft.w > 40 && bcDraft.h > 40) {
          addBoundedContext(bcDraft.x, bcDraft.y, bcDraft.w, bcDraft.h);
        }
        bcStart.current = null;
        setBcDraft(null);
      }}
      onDoubleClick={handleDoubleClick}
      onKeyDown={(e) => {
        if (e.code === "Space") spaceDown.current = true;
      }}
      onKeyUp={(e) => {
        if (e.code === "Space") spaceDown.current = false;
      }}
      tabIndex={0}
    >
      {relationMode && (
        <div className="dock-surface absolute left-1/2 top-3 z-40 flex -translate-x-1/2 items-center gap-2 px-3 py-2 text-xs text-[var(--text)]">
          {relationDraftSourceId && sourceElement ? (
            <>
              <span>
                Von <strong className="text-[var(--accent-2)]">{sourceElement.label}</strong> — Ziel anklicken
              </span>
              <button
                type="button"
                onClick={() => setRelationDraftSource(null)}
                className="rounded p-0.5 hover:bg-[var(--control-hover)]"
                title="Abbrechen"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <span>Verbinden: Pfeil → Pfeil, oder Element → Element</span>
          )}
        </div>
      )}

      {contextMapMode && (
        <div className="dock-surface absolute left-1/2 top-3 z-40 flex -translate-x-1/2 items-center gap-2 px-3 py-2 text-xs text-[var(--text)]">
          {contextMapDraftSourceId && contextMapSource ? (
            <>
              <span>
                Von <strong className="text-[var(--accent-2)]">{contextMapSource.label}</strong> — Ziel-BC anklicken
              </span>
              <button
                type="button"
                onClick={() => setContextMapDraftSource(null)}
                className="rounded p-0.5 hover:bg-[var(--control-hover)]"
                title="Abbrechen"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <span>Context Map: zwei Bounded Contexts anklicken</span>
          )}
        </div>
      )}

      <div
        data-canvas-world
        className="absolute origin-top-left"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          width: 4000,
          height: 3000,
        }}
        onContextMenu={(e) => {
          if (e.target !== e.currentTarget) return;
          e.preventDefault();
          const world = worldFromClient(e.clientX, e.clientY);
          if (!world) return;
          useStormBoardStore.getState().openContextMenu(e.clientX, e.clientY, {
            kind: "canvas",
            worldX: world.x,
            worldY: world.y,
          });
        }}
      >
        <SwimlaneLayer />
        <BoundedContextLayer />
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
        {elements.map((el) => (
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
            onMoveMany={handleMoveElements}
            onResize={handleResizeElement}
            onStartConnect={handleStartConnect}
            onCompleteConnect={handleCompleteConnect}
          />
        ))}
      </div>

      <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setBcMode((v) => !v)}
          className={[
            "rounded-lg px-3 py-1.5 text-xs font-medium shadow-dock",
            bcMode ? "dock-control-active" : "dock-surface text-[var(--text)]",
          ].join(" ")}
        >
          {bcMode ? "Bounded Context zeichnen…" : "Bounded Context"}
        </button>
        <span className="dock-surface rounded-lg px-2 py-1.5 text-xs text-[var(--muted)]">
          {relationMode
            ? "Verbinden · Esc: Abbrechen"
            : contextMapMode
              ? "Context Map · Esc: Abbrechen"
              : "1–9/0 Typ · Enter/A anlegen · Rechtsklick · Rahmen · Doppelklick: Titel"}
        </span>
      </div>
    </div>
  );
}
