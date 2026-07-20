"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

import { BoundedContextLayer } from "@/components/bounded-context-layer";
import { StormConnectors } from "@/components/storm-connectors";
import { StormElementCard } from "@/components/storm-element-card";
import { SwimlaneLayer } from "@/components/swimlane-layer";
import { TimelineGuide } from "@/components/timeline-guide";
import { snapToGrid, snapToTimeline, screenToWorld, zoomAtPoint } from "@/lib/canvas-viewport";
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
  const relationMode = useStormBoardStore((s) => s.relationMode);
  const relationDraftSourceId = useStormBoardStore((s) => s.relationDraftSourceId);

  const addElement = useStormBoardStore((s) => s.addElement);
  const moveElement = useStormBoardStore((s) => s.moveElement);
  const selectElement = useStormBoardStore((s) => s.selectElement);
  const selectRelation = useStormBoardStore((s) => s.selectRelation);
  const clearSelection = useStormBoardStore((s) => s.clearSelection);
  const setRelationDraftSource = useStormBoardStore((s) => s.setRelationDraftSource);
  const connectElements = useStormBoardStore((s) => s.connectElements);
  const addBoundedContext = useStormBoardStore((s) => s.addBoundedContext);

  const [bcDraft, setBcDraft] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [bcMode, setBcMode] = useState(false);
  const bcStart = useRef<{ x: number; y: number } | null>(null);

  const sourceElement = elements.find((e) => e.id === relationDraftSourceId);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && relationDraftSourceId) {
        setRelationDraftSource(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [relationDraftSourceId, setRelationDraftSource]);

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
    if (!containerRef.current || bcMode || relationMode) return;
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
          if (relationMode) setRelationDraftSource(null);
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
      {relationMode && (
        <div className="absolute left-1/2 top-3 z-40 flex -translate-x-1/2 items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-xs text-purple-950 shadow-sm">
          {relationDraftSourceId && sourceElement ? (
            <>
              <span>
                Von <strong>{sourceElement.label}</strong> — jetzt Ziel-Element anklicken
              </span>
              <button
                type="button"
                onClick={() => setRelationDraftSource(null)}
                className="rounded p-0.5 hover:bg-purple-100"
                title="Abbrechen"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <span>Verbinden-Modus: Pfeil → Pfeil, oder Element → Element</span>
          )}
        </div>
      )}

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
          relationDraftSourceId={relationDraftSourceId}
          onSelectRelation={selectRelation}
        />
        {elements.map((el) => (
          <StormElementCard
            key={el.id}
            element={el}
            selected={selectedElementIds.includes(el.id)}
            connecting={relationDraftSourceId === el.id}
            isRelationTargetHint={Boolean(relationDraftSourceId && relationDraftSourceId !== el.id)}
            relationMode={relationMode}
            zoom={viewport.zoom}
            onSelect={selectElement}
            onMove={handleMoveElement}
            onStartConnect={handleStartConnect}
            onCompleteConnect={handleCompleteConnect}
            onEdit={selectElement}
          />
        ))}
      </div>

      <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
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
          {relationMode
            ? "Verbinden: Pfeil → Pfeil · Esc: Abbrechen"
            : "Pfeil → Pfeil: Relation · Doppelklick: Element"}
        </span>
      </div>
    </div>
  );
}
