import type { RelationType } from "@/types/storm-relation";
import { RELATION_TYPES } from "@/types/storm-relation";
import { isKnownElementType } from "@/lib/element-styles";
import type { ElementType } from "@/types/storm-element";

const RELATION_TYPE_SET = new Set<string>(RELATION_TYPES);

/** Common LLM aliases for sticky types (Event Storming shorthand). */
const ELEMENT_TYPE_ALIASES: Record<string, ElementType> = {
  role: "actor",
  actor: "actor",
  event: "domainEvent",
  domainevent: "domainEvent",
  command: "command",
  policy: "policy",
  aggregate: "aggregate",
  readmodel: "readModel",
  external: "externalSystem",
  externalsystem: "externalSystem",
  note: "note",
  hotspot: "hotspot",
};

export function normalizeE2vElementType(raw: string): ElementType {
  const t = raw.trim();
  if (!t) return "note";
  if (isKnownElementType(t)) return t;
  const key = t.replace(/[\s_-]+/g, "").toLowerCase();
  const aliased = ELEMENT_TYPE_ALIASES[key] ?? ELEMENT_TYPE_ALIASES[t.toLowerCase()];
  if (aliased) return aliased;
  return "note";
}

export function isE2vRelationType(raw: string): raw is RelationType {
  return RELATION_TYPE_SET.has(raw);
}
