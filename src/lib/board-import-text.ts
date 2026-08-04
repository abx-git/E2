import { boardImportPayloadFromAiContextText } from "@/lib/ai-board-context-import";
import { boardImportPayloadFromDiagramText } from "@/lib/diagram-io";
import { boardImportPayloadFromExportText, type BoardImportPayload } from "@/lib/storm-json";

/**
 * Accepts a full `.storm.json` snapshot (v1/v2), reduced AI-context JSON,
 * Mermaid, or PlantUML. Diagram text is converted with auto-layout.
 */
export function boardImportPayloadFromAnyExportText(text: string): BoardImportPayload | null {
  return (
    boardImportPayloadFromExportText(text) ??
    boardImportPayloadFromAiContextText(text) ??
    boardImportPayloadFromDiagramText(text)
  );
}
