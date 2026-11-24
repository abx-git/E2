"use client";

import dynamic from "next/dynamic";

import { ContextMapDrawioOverlay } from "@/components/context-map-drawio-overlay";
import { CanvasBoardChrome } from "@/components/canvas-board-chrome";
import { useStormBoardStore } from "@/store/storm-board-store";

const DrawioCanvasInner = dynamic(() => import("@/components/drawio-canvas-inner"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center text-sm text-[var(--muted)]">
      Draw.io …
    </div>
  ),
});

export function DrawioCanvas() {
  const contextRelations = useStormBoardStore((s) => s.contextRelations);
  const boundedContexts = useStormBoardStore((s) => s.boundedContexts);
  const contextMapMode = useStormBoardStore((s) => s.contextMapMode);
  const selectedContextRelationId = useStormBoardStore((s) => s.selectedContextRelationId);
  const contextMapDraftSourceId = useStormBoardStore((s) => s.contextMapDraftSourceId);
  const selectContextRelation = useStormBoardStore((s) => s.selectContextRelation);

  return (
    <div className="relative h-full min-h-0 flex-1 overflow-hidden" data-diagram-surface>
      <DrawioCanvasInner />
      {contextRelations.length > 0 || contextMapMode ? (
        <ContextMapDrawioOverlay
          boundedContexts={boundedContexts}
          contextRelations={contextRelations}
          selectedContextRelationId={selectedContextRelationId}
          contextMapDraftSourceId={contextMapDraftSourceId}
          onSelectContextRelation={selectContextRelation}
        />
      ) : null}
      <CanvasBoardChrome />
    </div>
  );
}