/** Workshop / architecture action-item register (RAID-lite). */

export type ActionItemStatus = "open" | "inProgress" | "blocked" | "done";

/** Problem area or kind of follow-up. */
export type ActionItemArea =
  | "followUp"
  | "problem"
  | "risk"
  | "decision"
  | "debt"
  | "question";

export interface ActionItem {
  id: string;
  title: string;
  notes?: string;
  status: ActionItemStatus;
  area: ActionItemArea;
  /** Optional link to a canvas sticky in the active view. */
  elementId?: string;
  /** Optional link to a bounded context in the active view. */
  boundedContextId?: string;
}

export const ACTION_ITEM_STATUSES: ActionItemStatus[] = [
  "open",
  "inProgress",
  "blocked",
  "done",
];

export const ACTION_ITEM_AREAS: ActionItemArea[] = [
  "followUp",
  "problem",
  "risk",
  "decision",
  "debt",
  "question",
];

export const ACTION_ITEM_STATUS_LABELS: Record<ActionItemStatus, string> = {
  open: "Offen",
  inProgress: "In Arbeit",
  blocked: "Blockiert",
  done: "Erledigt",
};

export const ACTION_ITEM_AREA_LABELS: Record<ActionItemArea, string> = {
  followUp: "Follow-up",
  problem: "Problemfeld",
  risk: "Risiko",
  decision: "Entscheidung",
  debt: "Technische Schuld",
  question: "Frage",
};

/** Status dot / accent colors for the action-item layer. */
export const ACTION_ITEM_STATUS_COLORS: Record<ActionItemStatus, string> = {
  open: "#ef4444",
  inProgress: "#f59e0b",
  blocked: "#a855f7",
  done: "#22c55e",
};
