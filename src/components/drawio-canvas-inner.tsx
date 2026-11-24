"use client";

import { useEffect, useRef } from "react";
import {
  Graph,
  InternalEvent,
  ModelXmlSerializer,
  type Cell,
} from "@maxgraph/core";
import "@maxgraph/core/css/common.css";

import { boardActiveSliceFromStore, useStormBoardStore } from "@/store/storm-board-store";
import { buildDrawioMxFile, computeBoardBounds, type BoardBounds } from "@/lib/drawio/board-to-mx";
import { extractMxGraphModelXml } from "@/lib/drawio/mx-xml";
import {
  layoutPatchesFromMxCells,
  selectionFromMxCells,
  type MxCellLike,
} from "@/lib/drawio/mx-to-board";
import { createDrawioStoreSyncCoalescer } from "@/lib/drawio/sync-coalesce";
import { exportCanvasBackground } from "@/lib/board-export-visual";

function cellStyleString(cell: Cell): string | undefined {
  const raw = cell.getStyle();
  return typeof raw === "string" ? raw : undefined;
}

function cellToLike(cell: Cell): MxCellLike {
  const geo = cell.getGeometry();
  return {
    id: cell.getId() ?? "",
    style: cellStyleString(cell),
    vertex: cell.isVertex(),
    edge: cell.isEdge(),
    geometry: geo
      ? {
          x: geo.x ?? 0,
          y: geo.y ?? 0,
          width: geo.width ?? 0,
          height: geo.height ?? 0,
        }
      : undefined,
  };
}

function collectGraphCells(graph: Graph): MxCellLike[] {
  const parent = graph.getDefaultParent();
  return graph.getChildCells(parent, true, true).map(cellToLike);
}

function domainIdSets() {
  const s = useStormBoardStore.getState();
  return {
    elementIds: new Set(s.elements.map((e) => e.id)),
    swimlaneIds: new Set(s.swimlanes.map((l) => l.id)),
    boundedContextIds: new Set(s.boundedContexts.map((b) => b.id)),
    connectorIds: new Set(s.connectors.map((c) => c.id)),
  };
}

function applyLayoutPatches(graph: Graph, bounds: BoardBounds, includeRemovals: boolean): void {
  const patches = layoutPatchesFromMxCells(
    collectGraphCells(graph),
    bounds,
    includeRemovals ? domainIdSets() : undefined,
  );
  const store = useStormBoardStore.getState();
  store.beginGesture();
  for (const p of patches.elements) {
    store.updateElement(p.id, {
      x: Math.round(p.x),
      y: Math.round(p.y),
      width: Math.round(p.width),
      height: Math.round(p.height),
    });
  }
  for (const p of patches.swimlanes) {
    store.updateSwimlane(p.id, {
      x: Math.round(p.x),
      y: Math.round(p.y),
      width: Math.round(p.width),
      height: Math.round(p.height),
    });
  }
  for (const p of patches.boundedContexts) {
    store.updateBoundedContext(p.id, {
      x: Math.round(p.x),
      y: Math.round(p.y),
      width: Math.round(p.width),
      height: Math.round(p.height),
    });
  }
  if (includeRemovals) {
    for (const id of patches.removedElementIds) store.deleteElement(id);
    for (const id of patches.removedSwimlaneIds) store.deleteSwimlane(id);
    for (const id of patches.removedBoundedContextIds) store.deleteBoundedContext(id);
    for (const id of patches.removedConnectorIds) store.deleteConnector(id);
  }
  store.endGesture();
}

export default function DrawioCanvasInner() {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);
  const boundsRef = useRef<BoardBounds | null>(null);
  const loadingFromStoreRef = useRef(false);
  const coalescerRef = useRef(
    createDrawioStoreSyncCoalescer(() => {
      const graph = graphRef.current;
      const bounds = boundsRef.current;
      if (!graph || !bounds || loadingFromStoreRef.current) return;
      applyLayoutPatches(graph, bounds, true);
    }),
  );

  const modelingDeps = useStormBoardStore((s) => ({
    activeViewId: s.activeViewId,
    elements: s.elements,
    connectors: s.connectors,
    relations: s.relations,
    swimlanes: s.swimlanes,
    boundedContexts: s.boundedContexts,
    canvasLines: s.canvasLines,
    timeline: s.timeline,
    appearance: s.appearance,
    customCardTypes: s.customCardTypes,
    notesCompact: s.notesCompact,
    title: s.title,
  }));

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const graph = new Graph(container);
    graph.htmlLabels = true;
    graph.setCellsEditable(true);
    graph.setConnectable(true);
    graphRef.current = graph;

    const model = graph.getDataModel();
    const onModelChange = () => {
      if (loadingFromStoreRef.current) return;
      coalescerRef.current.schedule();
    };
    model.addListener(InternalEvent.CHANGE, onModelChange);

    const selectionModel = graph.getSelectionModel();
    const onSelectionChange = () => {
      const selected = graph.getSelectionCells().map((c) => ({
        id: c.getId() ?? "",
        style: cellStyleString(c),
      }));
      const sel = selectionFromMxCells(selected);
      const store = useStormBoardStore.getState();
      store.setCanvasSelection({
        elementIds: sel.elementIds,
        swimlaneIds: sel.swimlaneIds,
        boundedContextIds: sel.boundedContextIds,
      });
      if (sel.connectorIds.length === 1) {
        store.selectConnector(sel.connectorIds[0]!);
      } else if (sel.connectorIds.length === 0 && store.selectedConnectorId) {
        store.selectConnector(null);
      }
    };
    selectionModel.addListener(InternalEvent.CHANGE, onSelectionChange);

    return () => {
      coalescerRef.current.cancel();
      selectionModel.removeListener(onSelectionChange);
      model.removeListener(onModelChange);
      graph.destroy();
      graphRef.current = null;
    };
  }, []);

  useEffect(() => {
    const graph = graphRef.current;
    const container = containerRef.current;
    if (!graph || !container) return;

    const slice = boardActiveSliceFromStore();
    const bounds = computeBoardBounds(slice);
    boundsRef.current = bounds;
    const mxfile = buildDrawioMxFile(slice, bounds);
    const modelXml = extractMxGraphModelXml(mxfile);
    container.style.background = exportCanvasBackground(slice.appearance);

    loadingFromStoreRef.current = true;
    coalescerRef.current.cancel();
    try {
      const dataModel = graph.getDataModel();
      dataModel.clear();
      const serializer = new ModelXmlSerializer(dataModel);
      serializer.import(modelXml);
      graph.refresh();
    } finally {
      window.setTimeout(() => {
        loadingFromStoreRef.current = false;
      }, 0);
    }
  }, [modelingDeps]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 min-h-[320px] touch-none"
      data-drawio-canvas
      data-storm-canvas
      role="application"
      aria-label="Draw.io canvas"
    />
  );
}