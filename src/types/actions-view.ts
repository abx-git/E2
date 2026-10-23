/** Architecture measures / review board (view type `actions`). */

export type ActionType = "INTRODUCE" | "SCALE" | "IMPROVE" | "HOLD" | "CUT";

export type ObligationLevel = "Required" | "Recommended" | "Optional";

export type ArchitectureQuality =
  | "Security"
  | "Maintainability"
  | "Resilience"
  | "Performance"
  | "Observability"
  | "Interoperability";

export type ActionStatus = "open" | "in_progress" | "done" | "discarded";

export type EffortEstimate = "XS" | "S" | "M" | "L" | "XL";

/** One architecture measure row inside an actions view (distinct from workshop `ActionItem`). */
export interface MeasureActionItem {
  id: string;
  title: string;
  description?: string;
  actionType: ActionType;
  obligation: ObligationLevel;
  qualities: ArchitectureQuality[];
  status: ActionStatus;
  effort?: EffortEstimate;
  owner?: string;
  targetRef?: {
    viewId: string;
    elementId: string;
    elementLabel: string;
  };
  createdAt: string;
  updatedAt: string;
}

/** Tri-state tag filter: include = must match, exclude = must not match. */
export type TagFilterMode = "include" | "exclude";

export interface ActionsViewConfig {
  groupBy: "obligation" | "actionType";
  /** @deprecated Legacy include-only; migrated to `qualityFilters`. */
  filterQualities?: ArchitectureQuality[];
  /** @deprecated Legacy include-only; migrated to `statusFilters`. */
  filterStatus?: ActionStatus[];
  /** @deprecated Legacy include-only; migrated to `actionTypeFilters`. */
  filterActionTypes?: ActionType[];
  qualityFilters?: Partial<Record<ArchitectureQuality, TagFilterMode>>;
  actionTypeFilters?: Partial<Record<ActionType, TagFilterMode>>;
  statusFilters?: Partial<Record<ActionStatus, TagFilterMode>>;
  searchQuery?: string;
}

export interface ActionsView {
  id: string;
  name: string;
  type: "actions";
  config: ActionsViewConfig;
  items: MeasureActionItem[];
}

export const ACTION_TYPES: ActionType[] = [
  "INTRODUCE",
  "SCALE",
  "IMPROVE",
  "HOLD",
  "CUT",
];

export const OBLIGATION_LEVELS: ObligationLevel[] = [
  "Required",
  "Recommended",
  "Optional",
];

export const ARCHITECTURE_QUALITIES: ArchitectureQuality[] = [
  "Security",
  "Maintainability",
  "Resilience",
  "Performance",
  "Observability",
  "Interoperability",
];

export const MEASURE_STATUSES: ActionStatus[] = [
  "open",
  "in_progress",
  "done",
  "discarded",
];

export const EFFORT_ESTIMATES: EffortEstimate[] = ["XS", "S", "M", "L", "XL"];

export const ACTION_TYPE_COLORS: Record<
  ActionType,
  { bg: string; text: string; border: string }
> = {
  CUT: { bg: "bg-red-500/15", text: "text-red-300", border: "border-red-500/40" },
  SCALE: { bg: "bg-sky-500/15", text: "text-sky-300", border: "border-sky-500/40" },
  IMPROVE: { bg: "bg-amber-500/15", text: "text-amber-300", border: "border-amber-500/40" },
  INTRODUCE: { bg: "bg-emerald-500/15", text: "text-emerald-300", border: "border-emerald-500/40" },
  HOLD: { bg: "bg-slate-500/15", text: "text-slate-300", border: "border-slate-500/40" },
};
