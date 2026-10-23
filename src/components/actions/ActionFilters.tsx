"use client";

import { Plus } from "lucide-react";
import { useT } from "@/i18n";
import { cycleTagFilterMode, tagFiltersActive } from "@/lib/measure-tag-filters";
import {
  ACTION_TYPES,
  ARCHITECTURE_QUALITIES,
  MEASURE_STATUSES,
  type ActionsViewConfig,
  type ActionType,
  type ArchitectureQuality,
  type ActionStatus,
  type TagFilterMode,
} from "@/types/actions-view";

function TagFilterButton<T extends string>({
  label,
  mode,
  titleOff,
  titleInclude,
  titleExclude,
  onCycle,
}: {
  label: string;
  mode: TagFilterMode | undefined;
  titleOff: string;
  titleInclude: string;
  titleExclude: string;
  onCycle: () => void;
}) {
  const title =
    mode === "include" ? titleInclude : mode === "exclude" ? titleExclude : titleOff;
  return (
    <button
      type="button"
      onClick={onCycle}
      title={title}
      aria-pressed={mode === "include" ? true : mode === "exclude" ? "mixed" : false}
      className={[
        "rounded-full px-2 py-0.5 text-[10px] transition",
        mode === "include"
          ? "bg-[var(--accent)]/25 text-[var(--accent-2)]"
          : mode === "exclude"
            ? "dock-control text-[var(--muted)] line-through decoration-[var(--muted)]"
            : "dock-control text-[var(--muted)]",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

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

  const cycleMapFilter = (
    key: string,
    mapKey: "qualityFilters" | "actionTypeFilters" | "statusFilters",
  ) => {
    const current = config[mapKey] as Partial<Record<string, TagFilterMode>> | undefined;
    const next: Partial<Record<string, TagFilterMode>> = { ...current };
    const cycled = cycleTagFilterMode(next[key]);
    if (cycled) next[key] = cycled;
    else delete next[key];
    const patch: Partial<ActionsViewConfig> = {
      [mapKey]: Object.keys(next).length ? next : undefined,
    };
    onConfigChange(patch);
  };

  const hasFilters = tagFiltersActive(config);

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
        <div className="ml-auto flex flex-wrap items-center gap-1">
          <button
            type="button"
            className={[
              "rounded-md px-2 py-1 text-xs",
              config.showDescriptionsOnCards
                ? "dock-control-active"
                : "dock-control text-[var(--muted)]",
            ].join(" ")}
            onClick={() =>
              onConfigChange({
                showDescriptionsOnCards: config.showDescriptionsOnCards ? undefined : true,
              })
            }
            title={t("actionsView.showDescriptionsOnCardsHint")}
          >
            {t("actionsView.showDescriptionsOnCards")}
          </button>
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
        {ARCHITECTURE_QUALITIES.map((q) => (
          <TagFilterButton
            key={q}
            label={t(`actionsView.quality.${q}`)}
            mode={config.qualityFilters?.[q]}
            titleOff={t("actionsView.tagFilter.off")}
            titleInclude={t("actionsView.tagFilter.include")}
            titleExclude={t("actionsView.tagFilter.exclude")}
            onCycle={() => cycleMapFilter(q, "qualityFilters")}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-1">
        {ACTION_TYPES.map((type) => (
          <TagFilterButton
            key={type}
            label={t(`actionsView.actionType.${type}`)}
            mode={config.actionTypeFilters?.[type]}
            titleOff={t("actionsView.tagFilter.off")}
            titleInclude={t("actionsView.tagFilter.include")}
            titleExclude={t("actionsView.tagFilter.exclude")}
            onCycle={() => cycleMapFilter(type, "actionTypeFilters")}
          />
        ))}
        {MEASURE_STATUSES.map((s) => (
          <TagFilterButton
            key={s}
            label={t(`actionsView.status.${s}`)}
            mode={config.statusFilters?.[s]}
            titleOff={t("actionsView.tagFilter.off")}
            titleInclude={t("actionsView.tagFilter.include")}
            titleExclude={t("actionsView.tagFilter.exclude")}
            onCycle={() => cycleMapFilter(s, "statusFilters")}
          />
        ))}
        {hasFilters ? (
          <button
            type="button"
            className="rounded-full px-2 py-0.5 text-[10px] text-[var(--muted)] underline"
            onClick={() =>
              onConfigChange({
                qualityFilters: undefined,
                actionTypeFilters: undefined,
                statusFilters: undefined,
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
