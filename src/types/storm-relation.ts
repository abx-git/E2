export type RelationType =
  | "triggers"
  | "reactsWith"
  | "informs"
  | "executedBy"
  | "invokes"
  | "causal"
  | "contains";

export interface StormRelation {
  id: string;
  type: RelationType;
  sourceId: string;
  targetId: string;
  label?: string;
}

export const RELATION_TYPE_LABELS: Record<RelationType, string> = {
  triggers: "löst aus",
  reactsWith: "reagiert mit",
  informs: "informiert",
  executedBy: "ausgeführt von",
  invokes: "ruft auf",
  causal: "verursacht",
  contains: "enthält",
};

/** DDD Context Map patterns between Bounded Contexts. */
export type ContextMapPattern =
  | "partnership"
  | "sharedKernel"
  | "customerSupplier"
  | "conformist"
  | "antiCorruptionLayer"
  | "openHostService"
  | "publishedLanguage"
  | "separateWays";

export interface ContextRelation {
  id: string;
  type: ContextMapPattern;
  /** Upstream / supplier context */
  sourceContextId: string;
  /** Downstream / customer context */
  targetContextId: string;
  label?: string;
}

export const CONTEXT_MAP_PATTERN_LABELS: Record<ContextMapPattern, string> = {
  partnership: "Partnership",
  sharedKernel: "Shared Kernel",
  customerSupplier: "Customer/Supplier",
  conformist: "Conformist",
  antiCorruptionLayer: "Anti-Corruption Layer",
  openHostService: "Open-Host Service",
  publishedLanguage: "Published Language",
  separateWays: "Separate Ways",
};

export const CONTEXT_MAP_PATTERNS: ContextMapPattern[] = [
  "partnership",
  "sharedKernel",
  "customerSupplier",
  "conformist",
  "antiCorruptionLayer",
  "openHostService",
  "publishedLanguage",
  "separateWays",
];
