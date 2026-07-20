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
