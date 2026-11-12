import {
  buildHeadlessBoardExport,
  type HeadlessExportFormat,
} from "@/lib/cli-board-export";
import {
  BOARD_EXPORT_PARAM,
  BOARD_EXPORT_VIEW_PARAM,
  readExportFormatFromSearch,
  readExportViewIdFromSearch,
  stripBoardUrlParamFromLocation,
} from "@/lib/board-remote-url";
import { downloadTextFile } from "@/lib/diagram-io";
import type { BoardImportPayload } from "@/lib/storm-json";

export type UrlDrivenBoardExportOutcome =
  | { kind: "none" }
  | { kind: "ok" }
  | { kind: "fail"; reason: string };

export function runUrlDrivenBoardExport(
  doc: BoardImportPayload,
  search: string,
): UrlDrivenBoardExportOutcome {
  const format = readExportFormatFromSearch(search);
  if (!format) return { kind: "none" };

  const viewId = readExportViewIdFromSearch(search) ?? undefined;
  const result = buildHeadlessBoardExport(doc, { format, viewId });
  if (!result.ok) {
    return { kind: "fail", reason: result.reason };
  }
  downloadTextFile(result.filename, result.body, result.mime);
  return { kind: "ok" };
}

export function hasUrlDrivenExport(search: string): boolean {
  return readExportFormatFromSearch(search) !== null;
}

export { BOARD_EXPORT_PARAM, BOARD_EXPORT_VIEW_PARAM, type HeadlessExportFormat };
