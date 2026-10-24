import type { BoardImportPayload } from "@/lib/storm-json";

import { encodeE2vSingleView } from "@/lib/e2v/encode";
import { E2V_ENGLISH_LLM_PROMPT, stringifyE2vSchema } from "@/lib/e2v/schema";
import { isE2vText } from "@/lib/e2v/decode";
import { E2V_FORMAT, E2V_VERSION } from "@/lib/e2v/constants";

/**
 * Clipboard / LLM roundtrip: English prompt + compact schema + E2V data (full layout).
 */
/**
 * Prompt + compact E2V schema only (no view data). Reuse in LLM system prompts.
 */
export function buildE2vSchemaPromptPackage(modelingMode?: string): string {
  const modeLine = modelingMode ? `Typical modelingMode for this chat: ${modelingMode}.` : "";
  return [
    "E2V schema prompt package",
    "No board data — generate E2V text that conforms to the schema below.",
    `Wire format: ${E2V_FORMAT} v${E2V_VERSION}. Layout is explicit — do not auto-layout.`,
    modeLine,
    "Paste generated data into E2 (Daten → E2V einfügen).",
    "",
    "## prompt",
    E2V_ENGLISH_LLM_PROMPT.trim(),
    "",
    "## schema",
    "```json",
    stringifyE2vSchema(),
    "```",
    "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildE2vSchemaPromptPackageForView(
  doc: BoardImportPayload,
  viewId: string,
): string | null {
  const view = doc.views.find((v) => v.id === viewId);
  if (!view) return null;
  const mode = view.type !== "actions" ? view.modelingMode : "actions";
  return buildE2vSchemaPromptPackage(mode);
}

export function e2vSchemaPromptExportFilename(title: string, viewName: string): string {
  const slug = (s: string) =>
    s
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "board";
  return `${slug(title)}-${slug(viewName)}-e2v-schema-prompt.md`;
}

export function buildE2vClipboardPackage(
  doc: BoardImportPayload,
  viewId: string,
): string | null {
  const data = encodeE2vSingleView(doc, viewId);
  if (!data) return null;
  const view = doc.views.find((v) => v.id === viewId);
  const mode = view && view.type !== "actions" ? view.modelingMode : "actions";

  return [
    "E2 compact view package (E2V)",
    `Mode: ${mode}`,
    `Wire format: ${E2V_FORMAT} v${E2V_VERSION}. Layout is explicit — do not auto-layout.`,
    "Paste this package or only the ## data block into E2 (Daten → E2V einfügen).",
    "",
    "## prompt",
    E2V_ENGLISH_LLM_PROMPT.trim(),
    "",
    "## schema",
    "```json",
    stringifyE2vSchema(),
    "```",
    "",
    "## data",
    "```e2v",
    data.trimEnd(),
    "```",
    "",
  ].join("\n");
}

/** Extract E2V source from a package or raw text. */
export function extractE2vFromClipboardText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;

  const dataFence = trimmed.match(/##\s*data\s*\n```(?:e2v)?\s*\n([\s\S]*?)\n```/i);
  if (dataFence?.[1]?.trim()) return dataFence[1].trim();

  if (isE2vText(trimmed)) return trimmed;

  return trimmed;
}

export function e2vExportFilename(title: string, viewName: string): string {
  const slug = (s: string) =>
    s
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "board";
  return `${slug(title)}-${slug(viewName)}.e2v.txt`;
}
