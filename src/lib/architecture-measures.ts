import {
  matchesTagFilters,
  normalizeActionTypeFilters,
  normalizeQualityFilters,
  normalizeStatusFilters,
} from "@/lib/measure-tag-filters";
import type { BoardImportPayload, BoardView, CanvasBoardView } from "@/lib/storm-json";
import { generateStormId } from "@/lib/storm-id";
import type { StormElement } from "@/types/storm-element";
import {
  ACTION_TYPES,
  ARCHITECTURE_QUALITIES,
  EFFORT_ESTIMATES,
  MEASURE_STATUSES,
  OBLIGATION_LEVELS,
  type ActionStatus,
  type ActionType,
  type ActionsView,
  type ActionsViewConfig,
  type ArchitectureQuality,
  type EffortEstimate,
  type MeasureActionItem,
  type ObligationLevel,
} from "@/types/actions-view";

const ACTION_TYPE_SET = new Set<string>(ACTION_TYPES);
const OBLIGATION_SET = new Set<string>(OBLIGATION_LEVELS);
const QUALITY_SET = new Set<string>(ARCHITECTURE_QUALITIES);
const STATUS_SET = new Set<string>(MEASURE_STATUSES);
const EFFORT_SET = new Set<string>(EFFORT_ESTIMATES);

function isoNow(): string {
  return new Date().toISOString();
}

function asActionType(value: unknown): ActionType {
  return typeof value === "string" && ACTION_TYPE_SET.has(value)
    ? (value as ActionType)
    : "IMPROVE";
}

function asObligation(value: unknown): ObligationLevel {
  return typeof value === "string" && OBLIGATION_SET.has(value)
    ? (value as ObligationLevel)
    : "Recommended";
}

function asStatus(value: unknown): ActionStatus {
  return typeof value === "string" && STATUS_SET.has(value)
    ? (value as ActionStatus)
    : "open";
}

function asEffort(value: unknown): EffortEstimate | undefined {
  return typeof value === "string" && EFFORT_SET.has(value)
    ? (value as EffortEstimate)
    : undefined;
}

function asQualities(raw: unknown): ArchitectureQuality[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (q): q is ArchitectureQuality => typeof q === "string" && QUALITY_SET.has(q),
  );
}

export function defaultActionsViewConfig(): ActionsViewConfig {
  return { groupBy: "obligation" };
}

export function createEmptyActionsView(
  overrides: Partial<ActionsView> & Pick<ActionsView, "id" | "name">,
): ActionsView {
  const config = { ...defaultActionsViewConfig(), ...overrides.config };
  return {
    type: "actions",
    items: [],
    ...overrides,
    config,
  };
}

export function normalizeMeasureActionItem(
  raw: Partial<MeasureActionItem> & { id?: string; title?: string },
): MeasureActionItem {
  const now = isoNow();
  const id = raw.id?.trim() || generateStormId();
  const createdAt =
    typeof raw.createdAt === "string" && raw.createdAt.trim() ? raw.createdAt : now;
  const updatedAt =
    typeof raw.updatedAt === "string" && raw.updatedAt.trim() ? raw.updatedAt : createdAt;

  let targetRef: MeasureActionItem["targetRef"];
  const tr = raw.targetRef;
  if (tr && typeof tr === "object") {
    const viewId = typeof tr.viewId === "string" ? tr.viewId.trim() : "";
    const elementId = typeof tr.elementId === "string" ? tr.elementId.trim() : "";
    const elementLabel =
      typeof tr.elementLabel === "string" ? tr.elementLabel.trim() : "";
    if (viewId && elementId) {
      targetRef = { viewId, elementId, elementLabel: elementLabel || elementId };
    }
  }

  return {
    id,
    title: typeof raw.title === "string" ? raw.title : "",
    description: typeof raw.description === "string" ? raw.description : undefined,
    actionType: asActionType(raw.actionType),
    obligation: asObligation(raw.obligation),
    qualities: asQualities(raw.qualities),
    status: asStatus(raw.status),
    effort: asEffort(raw.effort),
    owner:
      typeof raw.owner === "string" && raw.owner.trim() ? raw.owner.trim() : undefined,
    targetRef,
    showDescriptionOnCard:
      typeof raw.showDescriptionOnCard === "boolean"
        ? raw.showDescriptionOnCard
        : undefined,
    createdAt,
    updatedAt,
  };
}

export function normalizeActionsViewConfig(raw: unknown): ActionsViewConfig {
  const base = defaultActionsViewConfig();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Record<string, unknown>;
  const groupBy = r.groupBy === "actionType" ? "actionType" : "obligation";
  return {
    groupBy,
    qualityFilters: normalizeQualityFilters(r),
    actionTypeFilters: normalizeActionTypeFilters(r),
    statusFilters: normalizeStatusFilters(r),
    showDescriptionsOnCards:
      r.showDescriptionsOnCards === true ? true : undefined,
    searchQuery:
      typeof r.searchQuery === "string" && r.searchQuery.trim()
        ? r.searchQuery
        : undefined,
  };
}

export function normalizeActionsView(
  raw: Partial<ActionsView> & { id?: string; name?: string },
): ActionsView {
  const id = raw.id?.trim() || generateStormId();
  const items = Array.isArray(raw.items)
    ? raw.items.map((item) =>
        normalizeMeasureActionItem(item as Partial<MeasureActionItem>),
      )
    : [];
  return createEmptyActionsView({
    id,
    name: raw.name?.trim() || "Maßnahmen",
    config: normalizeActionsViewConfig(raw.config),
    items,
  });
}

export interface BoardLinkTarget {
  viewId: string;
  viewName: string;
  elementId: string;
  elementLabel: string;
  elementType: StormElement["type"];
}

function isActionsViewLocal(view: BoardView): view is ActionsView {
  return (view as ActionsView).type === "actions";
}

function isCanvasBoardViewLocal(view: BoardView): view is CanvasBoardView {
  return !isActionsViewLocal(view);
}

export function collectBoardLinkTargets(doc: BoardImportPayload): BoardLinkTarget[] {
  const out: BoardLinkTarget[] = [];
  for (const view of doc.views) {
    if (!isCanvasBoardViewLocal(view)) continue;
    for (const el of view.elements) {
      out.push({
        viewId: view.id,
        viewName: view.name,
        elementId: el.id,
        elementLabel: el.label?.trim() || el.id,
        elementType: el.type,
      });
    }
    for (const bc of view.boundedContexts) {
      out.push({
        viewId: view.id,
        viewName: view.name,
        elementId: bc.id,
        elementLabel: bc.label?.trim() || bc.id,
        elementType: "note",
      });
    }
  }
  return out.sort((a, b) =>
    `${a.viewName}:${a.elementLabel}`.localeCompare(
      `${b.viewName}:${b.elementLabel}`,
      undefined,
      { sensitivity: "base" },
    ),
  );
}

export function filterMeasureItems(
  items: MeasureActionItem[],
  config: ActionsViewConfig,
): MeasureActionItem[] {
  const q = config.searchQuery?.trim().toLowerCase();
  return items.filter((item) => {
    if (!matchesTagFilters(config, item)) return false;
    if (!q) return true;
    const hay = [
      item.title,
      item.description ?? "",
      item.owner ?? "",
      item.targetRef?.elementLabel ?? "",
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

export interface ActionsMarkdownLabels {
  title: string;
  created: string;
  overview: string;
  total: string;
  byObligation: string;
  byActionType: string;
  tableHeaders: {
    type: string;
    measure: string;
    obligation: string;
    qualities: string;
    effort: string;
    owner: string;
    reference: string;
  };
  details: string;
  none: string;
  actionType: Record<ActionType, string>;
  obligation: Record<ObligationLevel, string>;
  quality: Record<ArchitectureQuality, string>;
  status: Record<ActionStatus, string>;
  effort: Record<EffortEstimate, string>;
}

export function generateActionsMarkdownReport(
  view: ActionsView,
  boardTitle: string,
  labels: ActionsMarkdownLabels,
): string {
  const items = [...view.items].sort((a, b) => a.title.localeCompare(b.title));
  const lines: string[] = [
    `# ${labels.title} — ${boardTitle}`,
    "",
    `**${view.name}**`,
    "",
    `${labels.created}: ${new Date().toLocaleString()}`,
    "",
    `## ${labels.overview}`,
    "",
    `- ${labels.total}: **${items.length}**`,
  ];

  for (const level of OBLIGATION_LEVELS) {
    const n = items.filter((i) => i.obligation === level).length;
    lines.push(`- ${labels.byObligation} ${labels.obligation[level]}: **${n}**`);
  }
  for (const type of ACTION_TYPES) {
    const n = items.filter((i) => i.actionType === type).length;
    lines.push(`- ${labels.byActionType} ${labels.actionType[type]}: **${n}**`);
  }

  lines.push(
    "",
    `## ${labels.tableHeaders.measure}`,
    "",
    `| ${labels.tableHeaders.type} | ${labels.tableHeaders.measure} | ${labels.tableHeaders.obligation} | ${labels.tableHeaders.qualities} | ${labels.tableHeaders.effort} | ${labels.tableHeaders.owner} | ${labels.tableHeaders.reference} |`,
    "| --- | --- | --- | --- | --- | --- | --- |",
  );

  if (items.length === 0) {
    lines.push(`| — | _${labels.none}_ | — | — | — | — | — |`);
  } else {
    for (const item of items) {
      const qualities = item.qualities.map((q) => labels.quality[q]).join(", ");
      const ref = item.targetRef?.elementLabel ?? "—";
      lines.push(
        `| ${labels.actionType[item.actionType]} | ${escapeMdCell(item.title)} | ${labels.obligation[item.obligation]} | ${escapeMdCell(qualities)} | ${item.effort ? labels.effort[item.effort] : "—"} | ${escapeMdCell(item.owner ?? "—")} | ${escapeMdCell(ref)} |`,
      );
    }
  }

  lines.push("", `## ${labels.details}`, "");

  for (const level of OBLIGATION_LEVELS) {
    const group = items.filter((i) => i.obligation === level);
    if (group.length === 0) continue;
    lines.push(`### ${labels.obligation[level]}`, "");
    for (const item of group) {
      lines.push(
        `#### ${item.title}`,
        "",
        `- **${labels.tableHeaders.type}:** ${labels.actionType[item.actionType]}`,
        `- **${labels.tableHeaders.obligation}:** ${labels.obligation[item.obligation]}`,
        `- **Status:** ${labels.status[item.status]}`,
      );
      if (item.qualities.length) {
        lines.push(
          `- **${labels.tableHeaders.qualities}:** ${item.qualities.map((q) => labels.quality[q]).join(", ")}`,
        );
      }
      if (item.effort) {
        lines.push(`- **${labels.tableHeaders.effort}:** ${labels.effort[item.effort]}`);
      }
      if (item.owner) {
        lines.push(`- **${labels.tableHeaders.owner}:** ${item.owner}`);
      }
      if (item.targetRef) {
        lines.push(`- **${labels.tableHeaders.reference}:** ${item.targetRef.elementLabel}`);
      }
      if (item.description?.trim()) {
        lines.push("", item.description.trim(), "");
      } else {
        lines.push("");
      }
    }
  }

  return `${lines.join("\n")}\n`;
}

function escapeMdCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

export function getActiveActionsView(
  views: BoardView[],
  activeViewId: string,
): ActionsView | null {
  const view = views.find((v) => v.id === activeViewId);
  return view && isActionsViewLocal(view) ? view : null;
}

export function patchActionsViewInList(
  views: BoardView[],
  viewId: string,
  patch: Partial<Pick<ActionsView, "config" | "items" | "name">>,
): BoardView[] {
  return views.map((v) => {
    if (v.id !== viewId || !isActionsViewLocal(v)) return v;
    return normalizeActionsView({
      ...v,
      ...patch,
      config: patch.config ? { ...v.config, ...patch.config } : v.config,
      items: patch.items ?? v.items,
    });
  });
}
