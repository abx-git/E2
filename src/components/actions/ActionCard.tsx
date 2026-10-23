"use client";

import { GripVertical } from "lucide-react";
import { useT } from "@/i18n";
import {
  ACTION_TYPE_COLORS,
  type MeasureActionItem,
} from "@/types/actions-view";

export function ActionCard({
  item,
  selected,
  dragging = false,
  onSelect,
  onTitleChange,
  dragProps,
}: {
  item: MeasureActionItem;
  selected: boolean;
  dragging?: boolean;
  onSelect: () => void;
  onTitleChange: (title: string) => void;
  dragProps?: {
    onPointerDown: (e: React.PointerEvent) => void;
  };
}) {
  const t = useT();
  const colors = ACTION_TYPE_COLORS[item.actionType];

  const ownerInitials = item.owner
    ? item.owner
        .trim()
        .split(/\s+/)
        .map((p) => p[0]?.toUpperCase() ?? "")
        .slice(0, 2)
        .join("")
    : null;

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
      ].join(" ")}
    >
      <div className="flex items-start gap-1">
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
              onTitleChange(e.target.value);
            }}
            onBlur={(e) => {
              const trimmed = e.target.value.trim();
              if (trimmed !== e.target.value) onTitleChange(trimmed);
            }}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        <span
          className={[
            "rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            colors.bg,
            colors.text,
            colors.border,
          ].join(" ")}
        >
          {t(`actionsView.actionType.${item.actionType}`)}
        </span>
        <span className="rounded border border-[var(--border)] bg-[var(--control)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--muted)]">
          {t(`actionsView.obligation.${item.obligation}`)}
        </span>
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
      </div>
      {item.qualities.length > 0 ? (
        <div className="flex flex-wrap gap-1">
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
        <span className="truncate text-[10px] text-[var(--accent-2)]">
          ↗ {item.targetRef.elementLabel}
        </span>
      ) : null}
    </article>
  );
}
