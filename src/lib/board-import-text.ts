import { boardImportPayloadFromAiContextText } from "@/lib/ai-board-context-import";
import { boardImportPayloadFromDiagramText } from "@/lib/diagram-io";
import { boardImportPayloadFromExportText, type BoardImportPayload } from "@/lib/storm-json";

/** True for text that looks like a JSON object or array (not Mermaid/PlantUML). */
export function looksLikeJsonText(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}

/**
 * Accepts a full `.storm.json` snapshot (v1/v2) or reduced AI-context JSON.
 * Diagram text is intentionally excluded — use `boardImportPayloadFromAnyExportText`.
 */
export function boardImportPayloadFromJsonText(text: string): BoardImportPayload | null {
  if (!looksLikeJsonText(text)) return null;
  return boardImportPayloadFromExportText(text) ?? boardImportPayloadFromAiContextText(text);
}

/**
 * Accepts a full `.storm.json` snapshot (v1/v2), reduced AI-context JSON,
 * Mermaid, or PlantUML. Diagram text is converted with auto-layout.
 */
export function boardImportPayloadFromAnyExportText(text: string): BoardImportPayload | null {
  return (
    boardImportPayloadFromJsonText(text) ?? boardImportPayloadFromDiagramText(text)
  );
}
