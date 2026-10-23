"use client";

import { Plus } from "lucide-react";
import { useT } from "@/i18n";
import {
  ACTION_TYPES,
  ARCHITECTURE_QUALITIES,
  MEASURE_STATUSES,
  type ActionsViewConfig,
  type ActionType,
  type ArchitectureQuality,
  type ActionStatus,
} from "@/types/actions-view";

export function ActionFilters({
  config,
  visibleCount,
  totalCount,
  onConfigChange,
  onAddMeasure,
}: {
  config: ActionsViewConfig;
  visibleCount: number;
  totalCount: number;
  onConfigChange: (patch: Partial<ActionsViewConfig>) => void;
  onAddMeasure: () => void;
}) {
  const t = useT();

  const toggleQuality = (q: ArchitectureQuality) => {
    const current = config.filterQualities ?? [];
    const next = current.includes(q) ? current.filter((x) => x !== q) : [...current, q];
    onConfigChange({ filterQualities: next.length ? next : undefined });
  };

  const toggleStatus = (s: ActionStatus) => {
    const current = config.filterStatus ?? [];
    const next = current.includes(s) ? current.filter((x) => x !== s) : [...current, s];
    onConfigChange({ filterStatus: next.length ? next : undefined });
  };

  const toggleActionTypeFilter = (type: ActionType) => {
    const current = config.filterActionTypes ?? [];
    const next = current.includes(type) ? current.filter((x) => x !== type) : [...current, type];
    onConfigChange({ filterActionTypes: next.length ? next : undefined });
  };

  const hasFilters =
    (config.filterQualities?.length ?? 0) > 0 ||
    (config.filterStatus?.length ?? 0) > 0 ||
    (config.filterActionTypes?.length ?? 0) > 0 ||
    Boolean(config.searchQuery?.trim());

  return (
    <div className="flex shrink-0 flex-col gap-2 border-b border-[var(--border)] px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onAddMeasure}
          className="flex items-center gap-1 rounded-md bg-[var(--accent)] px-2.5 py-1.5 text-xs font-medium text-white hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" />
          {t("actionsView.newMeasure")}
        </button>
        <span className="text-xs text-[var(--muted)]">
          {visibleCount}/{totalCount}
        </span>
        <div className="ml-auto flex flex-wrap gap-1">
          <button
            type="button"
            className={[
              "rounded-md px-2 py-1 text-xs",
              config.groupBy === "obligation"
                ? "dock-control-active"
                : "dock-control text-[var(--muted)]",
            ].join(" ")}
            onClick={() => onConfigChange({ groupBy: "obligation" })}
          >
            {t("actionsView.groupByObligation")}
          </button>
          <button
            type="button"
            className={[
              "rounded-md px-2 py-1 text-xs",
              config.groupBy === "actionType"
                ? "dock-control-active"
                : "dock-control text-[var(--muted)]",
            ].join(" ")}
            onClick={() => onConfigChange({ groupBy: "actionType" })}
          >
            {t("actionsView.groupByActionType")}
          </button>
        </div>
      </div>
      <input
        type="search"
        className="dock-control w-full rounded-md px-2 py-1.5 text-xs outline-none"
        placeholder={t("actionsView.searchPlaceholder")}
        value={config.searchQuery ?? ""}
        onChange={(e) =>
          onConfigChange({ searchQuery: e.target.value || undefined })
        }
      />
      <div className="flex flex-wrap gap-1">
        {ARCHITECTURE_QUALITIES.map((q) => {
          const active = config.filterQualities?.includes(q);
          return (
            <button
              key={q}
              type="button"
              onClick={() => toggleQuality(q)}
              className={[
                "rounded-full px-2 py-0.5 text-[10px]",
                active ? "bg-[var(--accent)]/25 text-[var(--accent-2)]" : "dock-control text-[var(--muted)]",
              ].join(" ")}
            >
              {t(`actionsView.quality.${q}`)}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-1">
        {ACTION_TYPES.map((type) => {
          const active = config.filterActionTypes?.includes(type);
          return (
            <button
              key={type}
              type="button"
              onClick={() => toggleActionTypeFilter(type)}
              className={[
                "rounded-full px-2 py-0.5 text-[10px]",
                active ? "bg-[var(--accent)]/25 text-[var(--accent-2)]" : "dock-control text-[var(--muted)]",
              ].join(" ")}
            >
              {t(`actionsView.actionType.${type}`)}
            </button>
          );
        })}
        {MEASURE_STATUSES.map((s) => {
          const active = config.filterStatus?.includes(s);
          return (
            <button
              key={s}
              type="button"
              onClick={() => toggleStatus(s)}
              className={[
                "rounded-full px-2 py-0.5 text-[10px]",
                active ? "bg-[var(--accent)]/25 text-[var(--accent-2)]" : "dock-control text-[var(--muted)]",
              ].join(" ")}
            >
              {t(`actionsView.status.${s}`)}
            </button>
          );
        })}
        {hasFilters ? (
          <button
            type="button"
            className="rounded-full px-2 py-0.5 text-[10px] text-[var(--muted)] underline"
            onClick={() =>
              onConfigChange({
                filterQualities: undefined,
                filterStatus: undefined,
                filterActionTypes: undefined,
                searchQuery: undefined,
              })
            }
          >
            {t("actionsView.clearFilters")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
