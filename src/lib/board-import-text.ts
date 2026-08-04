import { boardImportPayloadFromAiContextText } from "@/lib/ai-board-context-import";
import { boardImportPayloadFromExportText, type BoardImportPayload } from "@/lib/storm-json";

/**
 * Accepts a full `.storm.json` snapshot (v1/v2) or a reduced AI-context JSON.
 * AI context is converted to a single-view board document with auto-layout.
 */
export function boardImportPayloadFromAnyExportText(text: string): BoardImportPayload | null {
  return boardImportPayloadFromExportText(text) ?? boardImportPayloadFromAiContextText(text);
}
