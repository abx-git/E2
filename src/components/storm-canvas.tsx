"use client";

import { useCallback, useRef, useState } from "react";

import { BoundedContextLayer } from "@/components/bounded-context-layer";
import { StormConnectors } from "@/components/storm-connectors";
import { StormElementCard } from "@/components/storm-element-card";
import { SwimlaneLayer } from "@/components/swimlane-layer";
import { TimelineGuide } from "@/components/timeline-guide";
import { snapToGrid, snapToTimeline, screenToWorld, zoomAtPoint } from "@/lib/canvas-viewport";
import { defaultRelationType } from "@/lib/relation-validation";
import { useStormBoardStore } from "@/store/storm-board-store";

export function StormCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [panning, setPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
  const spaceDown = useRef(false);

  const viewport = useStormBoardStore((s) => s.viewport);
  const setViewport = useStormBoardStore((s) => s.setViewport);
  const elements = useStormBoardStore((s) => s.elements);
  const relations = useStormBoardStore((s) => s.relations);
  const timeline = useStormBoardStore((s) => s.timeline);
  const snapToTimelineEnabled = useStormBoardStore((s) => s.snapToTimeline);
  const snapToGridEnabled = useStormBoardStore((s) => s.snapToGrid);
  const paletteType = useStormBoardStore((s) => s.paletteType);
  const selectedElementIds = useStormBoardStore((s) => s.selectedElementIds);
  const selectedRelationId = useStormBoardStore((s) => s.selectedRelationId);
  const relationDraftSourceId = useStormBoardStore((s) => s.relationDraftSourceId);

  const addElement = useStormBoardStore((s) => s.addElement);
  const moveElement = useStormBoardStore((s) => s.moveElement);
  const selectElement = useStormBoardStore((s) => s.selectElement);
  const selectRelation = useStormBoardStore((s) => s.selectRelation);
  const clearSelection = useStormBoardStore((s) => s.clearSelection);
  const addRelation = useStormBoardStore((s) => s.addRelation);
  const setRelationDraftSource = useStormBoardStore((s) => s.setRelationDraftSource);
  const addBoundedContext = useStormBoardStore((s) => s.addBoundedContext);

  const [bcDraft, setBcDraft] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [bcMode, setBcMode] = useState(false);
  const bcStart = useRef<{ x: number; y: number } | null>(null);

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
    if (!containerRef.current || bcMode) return;
    const rect = containerRef.current.getBoundingClientRect();
    const world = screenToWorld(viewport, e.clientX, e.clientY, rect);
    const snapped = applySnap(world.x, world.y);
    addElement(paletteType, snapped.x, snapped.y);
  };

  const handleStartConnect = (id: string) => setRelationDraftSource(id);

  const handleCompleteConnect = (targetId: string) => {
    if (!relationDraftSourceId || relationDraftSourceId === targetId) {
      setRelationDraftSource(null);
      return;
    }
    const src = elements.find((e) => e.id === relationDraftSourceId);
    const tgt = elements.find((e) => e.id === targetId);
    if (src && tgt) {
      addRelation(relationDraftSourceId, targetId, defaultRelationType(src, tgt));
    }
    setRelationDraftSource(null);
  };

  const handleMoveElement = (id: string, x: number, y: number) => {
    const snapped = applySnap(x, y);
    moveElement(id, snapped.x, snapped.y);
  };

  return (
    <div
      ref={containerRef}
      className="relative min-h-0 flex-1 overflow-hidden bg-canvas"
      onWheel={handleWheel}
      onPointerDown={(e) => {
        if (e.button === 1 || spaceDown.current) {
          setPanning(true);
          panStart.current = { x: e.clientX, y: e.clientY, vx: viewport.x, vy: viewport.y };
          return;
        }
        if (bcMode && containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const world = screenToWorld(viewport, e.clientX, e.clientY, rect);
          bcStart.current = { x: world.x, y: world.y };
          setBcDraft({ x: world.x, y: world.y, w: 0, h: 0 });
          return;
        }
        if (e.target === e.currentTarget) {
          clearSelection();
        }
      }}
      onPointerMove={(e) => {
        if (panning) {
          const dx = e.clientX - panStart.current.x;
          const dy = e.clientY - panStart.current.y;
          setViewport({ ...viewport, x: panStart.current.vx + dx, y: panStart.current.vy + dy });
        }
        if (bcMode && bcStart.current && containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const world = screenToWorld(viewport, e.clientX, e.clientY, rect);
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
      <div
        className="absolute origin-top-left"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          width: 4000,
          height: 3000,
        }}
      >
        <SwimlaneLayer />
        <BoundedContextLayer />
        {bcDraft && (
          <div
            className="pointer-events-none absolute border-2 border-dashed border-blue-500 bg-blue-100/30"
            style={{ left: bcDraft.x, top: bcDraft.y, width: bcDraft.w, height: bcDraft.h }}
          />
        )}
        <TimelineGuide />
        <StormConnectors
          elements={elements}
          relations={relations}
          selectedRelationId={selectedRelationId}
          onSelectRelation={selectRelation}
        />
        {elements.map((el) => (
          <StormElementCard
            key={el.id}
            element={el}
            selected={selectedElementIds.includes(el.id)}
            connecting={relationDraftSourceId === el.id}
            zoom={viewport.zoom}
            onSelect={selectElement}
            onMove={handleMoveElement}
            onStartConnect={handleStartConnect}
            onCompleteConnect={handleCompleteConnect}
            onEdit={selectElement}
          />
        ))}
      </div>

      <div className="absolute bottom-3 left-3 flex gap-2">
        <button
          type="button"
          onClick={() => setBcMode((v) => !v)}
          className={[
            "rounded-lg border px-3 py-1.5 text-xs font-medium shadow-sm",
            bcMode ? "border-blue-500 bg-blue-50 text-blue-900" : "border-slate-200 bg-white text-slate-700",
          ].join(" ")}
        >
          {bcMode ? "Bounded Context zeichnen…" : "Bounded Context"}
        </button>
        <span className="rounded-lg border border-slate-200 bg-white/90 px-2 py-1.5 text-xs text-slate-500">
          Doppelklick: Element · Space+Drag: Pan · Rad: Zoom
        </span>
      </div>
    </div>
  );
}
