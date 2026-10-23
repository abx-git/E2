import type {
  ActionStatus,
  ActionType,
  ActionsViewConfig,
  ArchitectureQuality,
  TagFilterMode,
} from "@/types/actions-view";
import {
  ACTION_TYPES,
  ARCHITECTURE_QUALITIES,
  MEASURE_STATUSES,
} from "@/types/actions-view";

const MODE_SET = new Set<TagFilterMode>(["include", "exclude"]);

export function cycleTagFilterMode(
  current: TagFilterMode | undefined,
): TagFilterMode | undefined {
  if (!current) return "include";
  if (current === "include") return "exclude";
  return undefined;
}

function parseTagFilterMap<T extends string>(
  raw: unknown,
  allowed: readonly T[],
): Partial<Record<T, TagFilterMode>> | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const allowedSet = new Set<string>(allowed);
  const out: Partial<Record<T, TagFilterMode>> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!allowedSet.has(key)) continue;
    if (value === "include" || value === "exclude") {
      out[key as T] = value;
    }
  }
  return Object.keys(out).length ? out : undefined;
}

function legacyIncludesToMap<T extends string>(
  values: T[] | undefined,
): Partial<Record<T, TagFilterMode>> | undefined {
  if (!values?.length) return undefined;
  const out: Partial<Record<T, TagFilterMode>> = {};
  for (const v of values) out[v] = "include";
  return out;
}

function mergeTagMaps<T extends string>(
  primary: Partial<Record<T, TagFilterMode>> | undefined,
  legacy: Partial<Record<T, TagFilterMode>> | undefined,
): Partial<Record<T, TagFilterMode>> | undefined {
  const out = { ...legacy, ...primary };
  return Object.keys(out).length ? out : undefined;
}

export function normalizeQualityFilters(
  r: Record<string, unknown>,
): Partial<Record<ArchitectureQuality, TagFilterMode>> | undefined {
  const fromMap = parseTagFilterMap<ArchitectureQuality>(r.qualityFilters, ARCHITECTURE_QUALITIES);
  const legacy = legacyIncludesToMap(
    Array.isArray(r.filterQualities)
      ? r.filterQualities.filter(
          (q): q is ArchitectureQuality =>
            typeof q === "string" && ARCHITECTURE_QUALITIES.includes(q as ArchitectureQuality),
        )
      : undefined,
  );
  return mergeTagMaps(fromMap, legacy);
}

export function normalizeActionTypeFilters(
  r: Record<string, unknown>,
): Partial<Record<ActionType, TagFilterMode>> | undefined {
  const fromMap = parseTagFilterMap<ActionType>(r.actionTypeFilters, ACTION_TYPES);
  const legacy = legacyIncludesToMap(
    Array.isArray(r.filterActionTypes)
      ? r.filterActionTypes.filter(
          (t): t is ActionType =>
            typeof t === "string" && ACTION_TYPES.includes(t as ActionType),
        )
      : undefined,
  );
  return mergeTagMaps(fromMap, legacy);
}

export function normalizeStatusFilters(
  r: Record<string, unknown>,
): Partial<Record<ActionStatus, TagFilterMode>> | undefined {
  const fromMap = parseTagFilterMap<ActionStatus>(r.statusFilters, MEASURE_STATUSES);
  const legacy = legacyIncludesToMap(
    Array.isArray(r.filterStatus)
      ? r.filterStatus.filter(
          (s): s is ActionStatus =>
            typeof s === "string" && MEASURE_STATUSES.includes(s as ActionStatus),
        )
      : undefined,
  );
  return mergeTagMaps(fromMap, legacy);
}

export function tagFiltersActive(config: ActionsViewConfig): boolean {
  return (
    Object.keys(config.qualityFilters ?? {}).length > 0 ||
    Object.keys(config.actionTypeFilters ?? {}).length > 0 ||
    Object.keys(config.statusFilters ?? {}).length > 0 ||
    Boolean(config.searchQuery?.trim())
  );
}

export function matchesTagFilters(
  config: ActionsViewConfig,
  item: {
    qualities: ArchitectureQuality[];
    actionType: ActionType;
    status: ActionStatus;
  },
): boolean {
  if (config.qualityFilters) {
    for (const q of ARCHITECTURE_QUALITIES) {
      const mode = config.qualityFilters[q];
      if (!mode) continue;
      const has = item.qualities.includes(q);
      if (mode === "include" && !has) return false;
      if (mode === "exclude" && has) return false;
    }
  }
  if (config.actionTypeFilters) {
    for (const type of ACTION_TYPES) {
      const mode = config.actionTypeFilters[type];
      if (!mode) continue;
      const matches = item.actionType === type;
      if (mode === "include" && !matches) return false;
      if (mode === "exclude" && matches) return false;
    }
  }
  if (config.statusFilters) {
    for (const status of MEASURE_STATUSES) {
      const mode = config.statusFilters[status];
      if (!mode) continue;
      const matches = item.status === status;
      if (mode === "include" && !matches) return false;
      if (mode === "exclude" && matches) return false;
    }
  }
  return true;
}

type E2vRowFn = (
  cols: Array<string | number | boolean | null | undefined>,
) => string;

export function pushTagFilterE2vLines(
  prefix: "avq" | "at" | "st",
  filters: Partial<Record<string, TagFilterMode>> | undefined,
  out: string[],
  row: E2vRowFn,
): void {
  if (!filters) return;
  const inc: string[] = [];
  const exc: string[] = [];
  for (const [key, mode] of Object.entries(filters)) {
    if (mode === "include") inc.push(key);
    if (mode === "exclude") exc.push(key);
  }
  if (inc.length) out.push(row([`@${prefix}inc`, ...inc]));
  if (exc.length) out.push(row([`@${prefix}exc`, ...exc]));
}

export function applyE2vTagFilterLine(
  prefix: "avq" | "at" | "st",
  kind: "inc" | "exc",
  cols: string[],
  config: ActionsViewConfig,
): ActionsViewConfig {
  const mode: TagFilterMode = kind === "inc" ? "include" : "exclude";
  const keys = cols.slice(1).filter(Boolean);
  if (prefix === "avq") {
    const qualityFilters = { ...config.qualityFilters };
    for (const k of keys) {
      if (ARCHITECTURE_QUALITIES.includes(k as ArchitectureQuality)) {
        qualityFilters[k as ArchitectureQuality] = mode;
      }
    }
    return { ...config, qualityFilters };
  }
  if (prefix === "at") {
    const actionTypeFilters = { ...config.actionTypeFilters };
    for (const k of keys) {
      if (ACTION_TYPES.includes(k as ActionType)) {
        actionTypeFilters[k as ActionType] = mode;
      }
    }
    return { ...config, actionTypeFilters };
  }
  const statusFilters = { ...config.statusFilters };
  for (const k of keys) {
    if (MEASURE_STATUSES.includes(k as ActionStatus)) {
      statusFilters[k as ActionStatus] = mode;
    }
  }
  return { ...config, statusFilters };
}

export function isTagFilterMode(value: unknown): value is TagFilterMode {
  return typeof value === "string" && MODE_SET.has(value as TagFilterMode);
}
