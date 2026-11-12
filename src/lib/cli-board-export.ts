import { boardExportSliceFromDocument } from "@/lib/board-export-from-document";
import { suggestedE2BoardFilename } from "@/lib/e2-board-filename";
import { encodeE2vDocument, encodeE2vSingleView } from "@/lib/e2v/encode";
import { e2vExportFilename } from "@/lib/e2v/package";
import {
  buildBoardSnapshot,
  isCanvasBoardView,
  stringifyExportedDocument,
  type BoardImportPayload,
} from "@/lib/storm-json";
import { buildBoardSvgString } from "@/lib/storm-export";
import { singleViewExportFilename, slugForExportFilename, stringifySingleViewExport } from "@/lib/view-export";

export const HEADLESS_EXPORT_FORMATS = ["e2v", "json", "svg"] as const;
export type HeadlessExportFormat = (typeof HEADLESS_EXPORT_FORMATS)[number];

export function isHeadlessExportFormat(value: string): value is HeadlessExportFormat {
  return (HEADLESS_EXPORT_FORMATS as readonly string[]).includes(value);
}

export type HeadlessBoardExportOk = {
  ok: true;
  filename: string;
  mime: string;
  body: string;
};

export type HeadlessBoardExportFail = {
  ok: false;
  reason: string;
};

export type HeadlessBoardExportResult = HeadlessBoardExportOk | HeadlessBoardExportFail;

export type HeadlessBoardExportOptions = {
  format: HeadlessExportFormat;
  viewId?: string;
};

function viewLabelForFilename(doc: BoardImportPayload, viewId?: string): string | undefined {
  if (!viewId) return undefined;
  const view = doc.views.find((v) => v.id === viewId);
  return view?.name;
}

function defaultSvgFilename(title: string): string {
  return `${slugForExportFilename(title)}.drawio.svg`;
}

export function buildHeadlessBoardExport(
  doc: BoardImportPayload,
  options: HeadlessBoardExportOptions,
): HeadlessBoardExportResult {
  const title = doc.title?.trim() || "board";
  const { format, viewId } = options;

  if (format === "json") {
    const body = viewId ? stringifySingleViewExport(doc, viewId) : stringifyExportedDocument(buildBoardSnapshot(doc));
    if (!body) {
      return {
        ok: false,
        reason: viewId
          ? `View ${viewId} is not a canvas view or does not exist`
          : "Could not serialize board JSON",
      };
    }
    const viewName = viewLabelForFilename(doc, viewId);
    const filename = viewId && viewName
      ? singleViewExportFilename(title, viewName)
      : suggestedE2BoardFilename(title);
    return { ok: true, filename, mime: "application/json;charset=utf-8", body };
  }

  if (format === "e2v") {
    let body: string;
    if (viewId) {
      const encoded = encodeE2vSingleView(doc, viewId);
      if (!encoded) {
        return {
          ok: false,
          reason: `View ${viewId} is not a canvas view or does not exist`,
        };
      }
      body = encoded;
    } else {
      body = encodeE2vDocument(doc, { scope: "document" });
    }
    const viewName = viewLabelForFilename(doc, viewId) ?? "board";
    const filename = e2vExportFilename(title, viewId ? viewName : "document");
    return { ok: true, filename, mime: "text/x-e2v;charset=utf-8", body };
  }

  const slice = boardExportSliceFromDocument(doc, { viewId });
  if (!slice) {
    const view = viewId ? doc.views.find((v) => v.id === viewId) : undefined;
    if (viewId && view && !isCanvasBoardView(view)) {
      return { ok: false, reason: `View ${viewId} is not a canvas view` };
    }
    return {
      ok: false,
      reason: viewId
        ? `View ${viewId} does not exist or is not a canvas view`
        : "No canvas view to export (actions-only document?)",
    };
  }
  const body = buildBoardSvgString(slice);
  const filename = defaultSvgFilename(slice.title || title);
  return { ok: true, filename, mime: "image/svg+xml", body };
}

export type CliRenderFormat = HeadlessExportFormat | "png";

export function inferRenderFormatFromOutPath(outPath: string): CliRenderFormat | undefined {
  const lower = outPath.toLowerCase();
  if (lower.endsWith(".png")) return "png";
  if (lower.endsWith(".e2v.txt") || lower.endsWith(".e2v")) return "e2v";
  if (lower.endsWith(".e2.json") || lower.endsWith(".json")) return "json";
  if (lower.endsWith(".svg") || lower.endsWith(".drawio.svg")) return "svg";
  return undefined;
}

export function defaultOutPathForFormat(inputBasename: string, format: CliRenderFormat): string {
  const stem = inputBasename.replace(/\.(e2|storm)?\.json$/i, "").replace(/\.json$/i, "") || "board";
  switch (format) {
    case "png":
      return `${stem}.png`;
    case "e2v":
      return `${stem}.e2v.txt`;
    case "json":
      return `${stem}.e2.json`;
    case "svg":
    default:
      return `${stem}.drawio.svg`;
  }
}
