"use client";

import { useEffect } from "react";
import { Flame, GripVertical } from "lucide-react";
import { DescriptionMarkdownContent } from "@/components/description-markdown-content";
import { useT } from "@/i18n";
import { selectMeasureItem } from "@/lib/select-measure-item";
import { useStormBoardStore } from "@/store/storm-board-store";
import { ACTION_TYPE_COLORS } from "@/types/actions-view";

export function ActionCard({
  viewId,
  itemId,
  showDescriptionsOnCards,
  selected,
  dragging = false,
  onSelect,
  dragProps,
}: {
  viewId: string;
  itemId: string;
  showDescriptionsOnCards: boolean;
  selected: boolean;
  dragging?: boolean;
  onSelect: () => void;
  dragProps?: {
    onPointerDown: (e: React.PointerEvent) => void;
  };
}) {
  const t = useT();
  const item = useStormBoardStore((s) => selectMeasureItem(s.views, viewId, itemId));
  const updateMeasure = useStormBoardStore((s) => s.updateMeasureActionItem);
  const navigateTarget = useStormBoardStore((s) => s.navigateToMeasureTarget);
  const linkHighlight = useStormBoardStore((s) => s.measureHotspotLinkHighlight);
  const clearLinkHighlight = useStormBoardStore((s) => s.clearMeasureHotspotLinkHighlight);
  const originViewName = useStormBoardStore((s) => {
    const measure = selectMeasureItem(s.views, viewId, itemId);
    const ref = measure?.targetRef;
    if (!ref) return undefined;
    return s.views.find((v) => v.id === ref.viewId)?.name;
  });

  useEffect(() => {
    if (linkHighlight?.measureId !== itemId) return;
    const timer = window.setTimeout(() => clearLinkHighlight(), 1600);
    return () => window.clearTimeout(timer);
  }, [linkHighlight?.measureId, itemId, clearLinkHighlight]);

  if (!item) return null;

  const linkFlash = linkHighlight?.measureId === itemId;

  const accent = ACTION_TYPE_COLORS[item.actionType];
  const ownerInitials = item.owner
    ? item.owner
        .trim()
        .split(/\s+/)
        .map((p) => p[0]?.toUpperCase() ?? "")
        .slice(0, 2)
        .join("")
    : null;

  const showDescription =
    showDescriptionsOnCards &&
    item.showDescriptionOnCard !== false &&
    Boolean(item.description?.trim());

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={[
        "group relative flex cursor-pointer flex-col gap-2 rounded-lg border p-2.5 text-left shadow-sm transition",
        dragging ? "opacity-60 ring-1 ring-[var(--accent-2)]" : "",
        selected
          ? "border-[var(--accent)] bg-[var(--control)] ring-1 ring-[var(--accent)]"
          : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent-2)]",
        linkFlash ? "ring-2 ring-[var(--accent-2)]" : "",
      ].join(" ")}
    >
      <div
        className={["absolute bottom-2 left-0 top-2 w-1 rounded-full opacity-80", accent.bg].join(" ")}
        aria-hidden
      />
      <div className="flex items-start gap-1 pl-1">
        <span
          className="mt-0.5 cursor-grab touch-none text-[var(--muted)] active:cursor-grabbing"
          title="Drag"
          onPointerDown={(e) => {
            e.stopPropagation();
            dragProps?.onPointerDown(e);
          }}
        >
          <GripVertical className="h-4 w-4" aria-hidden />
        </span>
        <div
          className="min-w-0 flex-1 text-sm font-medium text-[var(--text)]"
          onDoubleClick={(e) => e.stopPropagation()}
        >
          <input
            className="w-full bg-transparent outline-none placeholder:text-[var(--muted)]"
            value={item.title}
            placeholder={t("actionsView.detail.titlePlaceholder")}
            aria-label={item.title || t("actionsView.detail.titlePlaceholder")}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              e.stopPropagation();
              updateMeasure(viewId, itemId, { title: e.target.value });
            }}
            onBlur={(e) => {
              const trimmed = e.target.value.trim();
              if (trimmed !== e.target.value) {
                updateMeasure(viewId, itemId, { title: trimmed });
              }
            }}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
          />
        </div>
      </div>
      {showDescription ? (
        <div
          className="line-clamp-4 pl-6 text-[11px] leading-snug text-[var(--muted)]"
          onClick={(e) => e.stopPropagation()}
        >
          <DescriptionMarkdownContent markdown={item.description!} compact />
        </div>
      ) : null}
      <div className="flex flex-wrap gap-1 pl-6">
        {item.effort ? (
          <span className="rounded bg-[var(--control)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--muted)]">
            {t(`actionsView.effort.${item.effort}`)}
          </span>
        ) : null}
        {ownerInitials ? (
          <span
            className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)]/20 text-[10px] font-semibold text-[var(--accent-2)]"
            title={item.owner}
          >
            {ownerInitials}
          </span>
        ) : null}
        {item.status !== "open" ? (
          <span className="rounded-full bg-[var(--control)] px-2 py-0.5 text-[10px] text-[var(--muted)]">
            {t(`actionsView.status.${item.status}`)}
          </span>
        ) : null}
      </div>
      {item.qualities.length > 0 ? (
        <div className="flex flex-wrap gap-1 pl-6">
          {item.qualities.map((q) => (
            <span
              key={q}
              title={t(`actionsView.quality.${q}`)}
              className="rounded-full bg-[var(--control)] px-2 py-0.5 text-[10px] text-[var(--muted)]"
            >
              {t(`actionsView.quality.${q}`)}
            </span>
          ))}
        </div>
      ) : null}
      {item.targetRef ? (
        <button
          type="button"
          className="ml-6 flex max-w-[calc(100%-1.5rem)] items-center gap-1 truncate rounded-md border border-[var(--border)] bg-[var(--control)]/50 px-1.5 py-0.5 text-left text-[10px] text-[var(--accent-2)] hover:border-[var(--accent-2)] hover:bg-[var(--control)]"
          title={t("actionsView.hotspots.originChipTitle", {
            view: originViewName ?? item.targetRef.viewId,
            label: item.targetRef.elementLabel.replace(/^\[[^\]]+\]\s*/, ""),
          })}
          onClick={(e) => {
            e.stopPropagation();
            navigateTarget(item.targetRef!.viewId, item.targetRef!.elementId);
          }}
        >
          <Flame className="h-3 w-3 shrink-0 text-[#f0a8a0]" aria-hidden />
          <span className="truncate">
            {originViewName ? (
              <>
                <span className="text-[var(--muted)]">[{originViewName}]</span>{" "}
                {item.targetRef.elementLabel.replace(/^\[[^\]]+\]\s*/, "")}
              </>
            ) : (
              item.targetRef.elementLabel
            )}
          </span>
        </button>
      ) : null}
    </article>
  );
}
