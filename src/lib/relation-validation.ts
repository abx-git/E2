import type { StormElement } from "@/types/storm-element";
import type { StormRelation } from "@/types/storm-relation";
import type { RelationType } from "@/types/storm-relation";

export type ValidationSeverity = "info" | "hint" | "warning";

export interface ValidationIssue {
  id: string;
  elementId?: string;
  relationId?: string;
  severity: ValidationSeverity;
  message: string;
}

const PAST_TENSE_HINTS = /\b(created|placed|registered|processed|confirmed|cancelled|shipped|delivered|paid|failed|completed|updated|deleted|received|sent|approved|rejected)\b/i;

export function suggestPastTense(label: string): string | null {
  const trimmed = label.trim();
  if (!trimmed) return null;
  if (PAST_TENSE_HINTS.test(trimmed)) return null;
  if (/\b(ed|ted|ied|en)\b/i.test(trimmed.split(/\s+/).pop() ?? "")) return null;
  const words = trimmed.split(/\s+/);
  const last = words[words.length - 1] ?? "";
  if (/^[A-Z][a-z]+$/.test(last) && !last.endsWith("ed")) {
    return `${words.slice(0, -1).join(" ")} ${last}${last.endsWith("e") ? "d" : "ed"}`.trim();
  }
  return null;
}

export function validateBoard(
  elements: StormElement[],
  relations: StormRelation[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const elementById = new Map(elements.map((e) => [e.id, e]));
  const connectedIds = new Set<string>();
  for (const r of relations) {
    connectedIds.add(r.sourceId);
    connectedIds.add(r.targetId);
  }

  for (const el of elements) {
    if (el.type === "domainEvent") {
      const suggestion = suggestPastTense(el.label);
      if (suggestion && el.label !== suggestion) {
        issues.push({
          id: `past-tense-${el.id}`,
          elementId: el.id,
          severity: "hint",
          message: `Event „${el.label}" — Vorschlag Vergangenheitsform: „${suggestion}"`,
        });
      }
    }

    if (el.type === "hotspot" && !el.description?.trim()) {
      issues.push({
        id: `hotspot-desc-${el.id}`,
        elementId: el.id,
        severity: "warning",
        message: `Hotspot „${el.label}" hat keine Beschreibung`,
      });
    }

    if (elements.length > 1 && !connectedIds.has(el.id)) {
      issues.push({
        id: `isolated-${el.id}`,
        elementId: el.id,
        severity: "info",
        message: `„${el.label}" hat keine Relationen`,
      });
    }
  }

  for (const rel of relations) {
    const source = elementById.get(rel.sourceId);
    const target = elementById.get(rel.targetId);
    if (!source || !target) continue;

    if (rel.type === "executedBy" && source.type !== "actor") {
      issues.push({
        id: `execby-src-${rel.id}`,
        relationId: rel.id,
        severity: "hint",
        message: '"Ausgeführt von" sollte von einem Actor ausgehen',
      });
    }
    if (rel.type === "executedBy" && target.type !== "command") {
      issues.push({
        id: `execby-tgt-${rel.id}`,
        relationId: rel.id,
        severity: "hint",
        message: '"Ausgeführt von" sollte zu einem Command führen',
      });
    }

    if (source.type === "command" && target.type === "domainEvent" && source.x > target.x) {
      issues.push({
        id: `cmd-after-event-${rel.id}`,
        relationId: rel.id,
        severity: "warning",
        message: `Command „${source.label}" liegt zeitlich rechts vom Event „${target.label}"`,
      });
    }
  }

  return issues;
}

export function defaultRelationType(source: StormElement, target: StormElement): RelationType {
  if (source.type === "actor" && target.type === "command") return "executedBy";
  if (source.type === "readModel" && target.type === "command") return "informs";
  if (source.type === "command" && target.type === "domainEvent") return "triggers";
  if (source.type === "command" && target.type === "aggregate") return "triggers";
  if (source.type === "aggregate" && target.type === "domainEvent") return "triggers";
  if (source.type === "domainEvent" && target.type === "policy") return "reactsWith";
  if (source.type === "policy" && target.type === "command") return "reactsWith";
  if (source.type === "externalSystem") return "invokes";
  if (source.type === "domainEvent" && target.type === "domainEvent") return "causal";
  return "triggers";
}
