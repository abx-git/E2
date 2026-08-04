import { aiBoardContextToImportPayload } from "@/lib/ai-board-context-import";
import { detectDiagramKind } from "@/lib/diagram-text";
import { parseMermaidToAiContext, renderMermaidFromAiContext } from "@/lib/mermaid-diagram";
import { parsePlantUmlToAiContext, renderPlantUmlFromAiContext } from "@/lib/plantuml-diagram";
import { buildAiBoardContext, slugForExportFilename } from "@/lib/view-export";
import type { BoardImportPayload } from "@/lib/storm-json";
import { boardImportPayloadFromStore } from "@/store/storm-board-store";

export function mermaidFromViewId(viewId: string): string | null {
  const ctx = buildAiBoardContext(boardImportPayloadFromStore(), viewId);
  if (!ctx) return null;
  return renderMermaidFromAiContext(ctx);
}

export function plantUmlFromViewId(viewId: string): string | null {
  const ctx = buildAiBoardContext(boardImportPayloadFromStore(), viewId);
  if (!ctx) return null;
  return renderPlantUmlFromAiContext(ctx);
}

export function diagramExportFilename(
  kind: "mermaid" | "plantuml",
  title: string,
  viewName: string,
): string {
  const ext = kind === "mermaid" ? "mmd" : "puml";
  return `${slugForExportFilename(title)}-${slugForExportFilename(viewName)}.${ext}`;
}

export function downloadTextFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Convert Mermaid or PlantUML text into a board document (auto-layout). */
export function boardImportPayloadFromDiagramText(text: string): BoardImportPayload | null {
  const kind = detectDiagramKind(text);
  if (!kind) return null;
  const ctx =
    kind === "mermaid" ? parseMermaidToAiContext(text) : parsePlantUmlToAiContext(text);
  if (!ctx) return null;
  return aiBoardContextToImportPayload(ctx);
}
