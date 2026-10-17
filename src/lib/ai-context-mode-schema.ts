import {
  AI_BOARD_CONTEXT_SCHEMA_ID,
  AI_CONTEXT_FORMAT,
  AI_CONTEXT_VERSION,
  buildAiBoardContext,
} from "@/lib/view-export";
import type { BoardImportPayload } from "@/lib/storm-json";
import type { ModelingMode } from "@/types/storm-element";
import {
  MODELING_MODE_SHORT_LABELS,
  elementTypesForMode,
  workshopFormatsForMode,
} from "@/types/storm-element";
import aiBoardContextSchemaDocument from "../../public/schemas/ai-board-context-v1.schema.json";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function setStringEnum(def: Record<string, unknown>, values: string[]): void {
  def.type = "string";
  def.enum = values;
  delete def.const;
}

/** Published $id for a mode-scoped AI-context prompt schema. */
export function aiContextModeSchemaId(mode: ModelingMode): string {
  return `https://abx-git.github.io/E2/schemas/ai-board-context-${mode}-v1.schema.json`;
}

export function aiContextModeSchemaFilename(mode: ModelingMode): string {
  return `ai-board-context-${mode}-v1.schema.json`;
}

/**
 * Build a reduced JSON Schema for prompting an LLM in one modeling mode.
 * Same wire format (`event-storming-tool-ai-context` v1) — paste recognition is unchanged.
 */
export function buildAiContextModeSchema(mode: ModelingMode): Record<string, unknown> {
  const schema = structuredClone(aiBoardContextSchemaDocument) as Record<string, unknown>;
  const elementTypes = [...elementTypesForMode(mode)];
  const workshopFormats = [...workshopFormatsForMode(mode)];
  const short = MODELING_MODE_SHORT_LABELS[mode];

  schema.$id = aiContextModeSchemaId(mode);
  schema.title = `E2 AI Board Context (${short})`;
  schema.description =
    `Mode-scoped prompt schema for modelingMode "${mode}". ` +
    `Wire format stays ${AI_CONTEXT_FORMAT} v${AI_CONTEXT_VERSION} ` +
    `(paste-compatible with the full AI context). ` +
    `Superset schema: ${AI_BOARD_CONTEXT_SCHEMA_ID}`;

  const defs = schema.$defs;
  if (!isRecord(defs)) return schema;

  if (isRecord(defs.modelingMode)) {
    setStringEnum(defs.modelingMode, [mode]);
  }
  if (isRecord(defs.workshopFormat)) {
    setStringEnum(defs.workshopFormat, workshopFormats);
  }
  if (isRecord(defs.elementType)) {
    setStringEnum(defs.elementType, elementTypes);
  }

  return schema;
}

export function stringifyAiContextModeSchema(mode: ModelingMode): string {
  return JSON.stringify(buildAiContextModeSchema(mode), null, 2);
}

/**
 * One clipboard payload for AI roundtrips: mode-scoped schema + board data
 * (with layout). The data block alone is pasteable via KI einfügen;
 * the full package is also accepted (data fence is extracted).
 */
export function buildAiClipboardPackage(
  doc: BoardImportPayload,
  viewId: string,
): string | null {
  const ctx = buildAiBoardContext(doc, viewId, { includeLayout: true });
  if (!ctx) return null;
  const schema = buildAiContextModeSchema(ctx.view.modelingMode);
  const mode = ctx.view.modelingMode;
  const short = MODELING_MODE_SHORT_LABELS[mode];

  return [
    "E2 AI roundtrip package",
    `Mode: ${short} (${mode})`,
    "Paste this package or only the data JSON back into E2 (Daten → KI einfügen).",
    `Wire format: ${AI_CONTEXT_FORMAT} v${AI_CONTEXT_VERSION}.`,
    "",
    "## schema",
    "```json",
    JSON.stringify(schema, null, 2),
    "```",
    "",
    "## data",
    "```json",
    JSON.stringify(ctx, null, 2),
    "```",
    "",
  ].join("\n");
}

/** Extract AI-context JSON from a clipboard package or return raw JSON text. */
export function extractAiContextJsonFromClipboardText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;

  const dataFence = trimmed.match(/##\s*data\s*\n```(?:json)?\s*\n([\s\S]*?)\n```/i);
  if (dataFence?.[1]?.trim()) return dataFence[1].trim();

  if (trimmed.includes(AI_CONTEXT_FORMAT)) {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const candidate = trimmed.slice(start, end + 1);
      try {
        const parsed = JSON.parse(candidate) as { format?: string };
        if (parsed?.format === AI_CONTEXT_FORMAT) return candidate;
      } catch {
        /* fall through */
      }
    }
  }

  return trimmed;
}
