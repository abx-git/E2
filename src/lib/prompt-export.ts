import { cardWebLinkHref, cardWebLinkLabel, elementWebLinks } from "@/lib/card-web-links";
import { markdownToPlainText } from "@/lib/description-markdown";
import { cardTypeCaption } from "@/lib/element-styles";
import type { BoardActiveSlice } from "@/lib/storm-json";
import { CONTEXT_MAP_PATTERN_LABELS, RELATION_TYPE_LABELS } from "@/types/storm-relation";

export interface PromptExportOptions {
  contextTitle?: string;
}

function sortLeftToRight<T extends { x: number; y: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.x - b.x || a.y - b.y);
}

function formatRelationLine(src: string, tgt: string, typeLabel: string, extra?: string): string {
  if (extra) return `- ${src} → ${tgt} [${typeLabel}: ${extra}]`;
  return `- ${src} → ${tgt} [${typeLabel}]`;
}

/**
 * Structured text of the active view for pasting into a chat / prompt.
 * Includes stickies, relations, swimlanes, bounded contexts, and context-map links.
 */
export function exportBoardAsPrompt(
  state: BoardActiveSlice,
  options?: PromptExportOptions,
): string {
  const lines: string[] = [];
  const contextTitle = options?.contextTitle?.trim() || state.title.trim();
  if (contextTitle) {
    lines.push(`# ${contextTitle}`);
    lines.push("");
  }

  const elements = sortLeftToRight(state.elements);
  const laneById = new Map(state.swimlanes.map((l) => [l.id, l.label]));
  const bcById = new Map(state.boundedContexts.map((b) => [b.id, b.label]));
  const customTypes = state.customCardTypes ?? [];

  lines.push(`## Elemente (${elements.length})`);
  lines.push("");

  for (const el of elements) {
    const typeLabel = cardTypeCaption(el, customTypes);
    const title = el.label.trim() || "(Ohne Titel)";
    lines.push(`### [${typeLabel}] ${title}`);

    const description = el.description?.trim();
    if (description) {
      const plain = markdownToPlainText(description).trim();
      if (plain) lines.push(`Beschreibung: ${plain}`);
    }

    const webLinks = elementWebLinks(el);
    for (const link of webLinks) {
      const href = cardWebLinkHref(link);
      const label = cardWebLinkLabel(link);
      if (href && label !== href) lines.push(`Link: ${label} — ${href}`);
      else if (href) lines.push(`Link: ${href}`);
      else lines.push(`Link: ${label}`);
    }

    const laneLabel = el.swimlaneId ? laneById.get(el.swimlaneId) : undefined;
    if (laneLabel) lines.push(`Swimlane: ${laneLabel}`);
    const bcLabel = el.boundedContextId ? bcById.get(el.boundedContextId) : undefined;
    if (bcLabel) lines.push(`Bounded Context: ${bcLabel}`);

    lines.push("");
  }

  if (state.relations.length > 0) {
    const byId = new Map(elements.map((e) => [e.id, e]));
    lines.push(`## Verbindungen (${state.relations.length})`);
    lines.push("");
    for (const rel of state.relations) {
      const src = byId.get(rel.sourceId);
      const tgt = byId.get(rel.targetId);
      if (!src || !tgt) continue;
      const extra = rel.label?.trim();
      lines.push(
        formatRelationLine(
          src.label.trim() || "(Ohne Titel)",
          tgt.label.trim() || "(Ohne Titel)",
          RELATION_TYPE_LABELS[rel.type],
          extra,
        ),
      );
    }
    lines.push("");
  }

  if (state.boundedContexts.length > 0) {
    lines.push(`## Bounded Contexts (${state.boundedContexts.length})`);
    lines.push("");
    for (const bc of sortLeftToRight(state.boundedContexts)) {
      lines.push(`- ${bc.label.trim() || "(Ohne Titel)"}`);
    }
    lines.push("");
  }

  if (state.swimlanes.length > 0) {
    lines.push(`## Swimlanes (${state.swimlanes.length})`);
    lines.push("");
    for (const lane of [...state.swimlanes].sort((a, b) => a.y - b.y || a.x - b.x)) {
      lines.push(`- ${lane.label.trim() || "(Ohne Titel)"}`);
    }
    lines.push("");
  }

  if (state.contextRelations.length > 0) {
    lines.push(`## Context Map (${state.contextRelations.length})`);
    lines.push("");
    for (const rel of state.contextRelations) {
      const src = bcById.get(rel.sourceContextId) ?? "?";
      const tgt = bcById.get(rel.targetContextId) ?? "?";
      const extra = rel.label?.trim();
      lines.push(
        formatRelationLine(src, tgt, CONTEXT_MAP_PATTERN_LABELS[rel.type], extra),
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}
