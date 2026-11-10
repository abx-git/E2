import type { BoardExportSlice } from "@/lib/board-export-connectors";
import {
  activeSliceFromDocument,
  boardImportPayloadFromExportText,
  getActiveCanvasView,
  isActionsView,
  isCanvasBoardView,
  type BoardImportPayload,
} from "@/lib/storm-json";

export function boardExportSliceFromDocument(
  doc: BoardImportPayload,
  opts?: { viewId?: string; selectionHighlight?: BoardExportSlice["selectionHighlight"] },
): BoardExportSlice | null {
  const view = opts?.viewId
    ? doc.views.find((v) => v.id === opts.viewId)
    : getActiveCanvasView(doc) ?? doc.views.find((v) => isCanvasBoardView(v));

  if (!view || isActionsView(view) || !isCanvasBoardView(view)) {
    return null;
  }

  const base = activeSliceFromDocument({
    ...doc,
    activeViewId: view.id,
  });

  return {
    ...base,
    connectors: view.connectors,
    notesCompact: view.notesCompact ?? false,
    selectionHighlight: opts?.selectionHighlight,
  };
}

export function boardExportSliceFromJson(
  json: string,
  opts?: { viewId?: string },
): BoardExportSlice | null {
  const doc = boardImportPayloadFromExportText(json);
  if (!doc) return null;
  return boardExportSliceFromDocument(doc, opts);
}
