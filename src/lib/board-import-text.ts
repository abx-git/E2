import { boardImportPayloadFromAiContextText } from "@/lib/ai-board-context-import";
import { boardImportPayloadFromDiagramText } from "@/lib/diagram-io";
import {
  boardImportPayloadFromE2vText,
  extractE2vFromClipboardText,
  isE2vText,
} from "@/lib/e2v";
import { boardImportPayloadFromExportText, type BoardImportPayload } from "@/lib/storm-json";

/** True for text that looks like a JSON object or array (not Mermaid/PlantUML). */
export function looksLikeJsonText(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}

/** True when pasted text is likely E2/AI JSON, E2V, or an E2V LLM package (not Mermaid/PlantUML). */
export function looksLikePasteImportText(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (looksLikeJsonText(trimmed)) return true;
  if (isE2vText(trimmed)) return true;
  if (/##\s*data\s*\n```(?:e2v)?/i.test(trimmed)) return true;
  return false;
}

/**
 * Accepts a full `.storm.json` snapshot (v1/v2), reduced AI-context JSON,
 * E2V compact text / E2V LLM package, or an E2 AI clipboard package (schema + data markdown).
 * Diagram text is intentionally excluded — use `boardImportPayloadFromAnyExportText`.
 */
export function boardImportPayloadFromE2vPackageText(text: string): BoardImportPayload | null {
  return boardImportPayloadFromE2vText(extractE2vFromClipboardText(text));
}

export function boardImportPayloadFromJsonText(text: string): BoardImportPayload | null {
  if (isE2vText(text)) {
    return boardImportPayloadFromE2vText(text);
  }
  const e2vFromPackage = boardImportPayloadFromE2vPackageText(text);
  if (e2vFromPackage) return e2vFromPackage;
  if (looksLikeJsonText(text)) {
    return boardImportPayloadFromExportText(text) ?? boardImportPayloadFromAiContextText(text);
  }
  // AI clipboard packages start with prose / markdown, not `{`.
  return boardImportPayloadFromAiContextText(text);
}

/**
 * Accepts a full `.storm.json` snapshot (v1/v2), reduced AI-context JSON,
 * AI clipboard package, Mermaid, or PlantUML. Diagram text uses auto-layout.
 */
export function boardImportPayloadFromAnyExportText(text: string): BoardImportPayload | null {
  return (
    boardImportPayloadFromE2vPackageText(text) ??
    boardImportPayloadFromJsonText(text) ??
    boardImportPayloadFromDiagramText(text)
  );
}
