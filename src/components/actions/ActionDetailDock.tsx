"use client";

import { Copy, ExternalLink, Trash2 } from "lucide-react";
import { collectBoardLinkTargets } from "@/lib/architecture-measures";
import { boardImportPayloadFromStore } from "@/store/storm-board-store";
import { useT } from "@/i18n";
import { useStormBoardStore } from "@/store/storm-board-store";
import {
  ACTION_TYPES,
  ARCHITECTURE_QUALITIES,
  EFFORT_ESTIMATES,
  MEASURE_STATUSES,
  OBLIGATION_LEVELS,
  type MeasureActionItem,
} from "@/types/actions-view";

export function ActionDetailDock({
  viewId,
  item,
}: {
  viewId: string;
  item: MeasureActionItem;
}) {
  const t = useT();
  const update = useStormBoardStore((s) => s.updateMeasureActionItem);
  const remove = useStormBoardStore((s) => s.removeMeasureActionItem);
  const duplicate = useStormBoardStore((s) => s.duplicateMeasureActionItem);
  const navigate = useStormBoardStore((s) => s.navigateToMeasureTarget);

  const linkTargets = collectBoardLinkTargets(boardImportPayloadFromStore());

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-l border-[var(--border)] bg-[var(--sidebar)]">
      <header className="border-b border-[var(--border)] px-3 py-2">
        <h2 className="text-sm font-semibold text-[var(--text)]">
          {t("actionsView.detail.title")}
        </h2>
      </header>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 text-sm">
        <label className="block space-y-1">
          <span className="text-xs text-[var(--muted)]">{t("actionsView.detail.title")}</span>
          <input
            className="dock-control w-full rounded-md px-2 py-1.5 text-sm"
            value={item.title}
            placeholder={t("actionsView.detail.titlePlaceholder")}
            onChange={(e) => update(viewId, item.id, { title: e.target.value })}
            onBlur={(e) => {
              const trimmed = e.target.value.trim();
              if (trimmed !== e.target.value) {
                update(viewId, item.id, { title: trimmed });
              }
            }}
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs text-[var(--muted)]">
            {t("actionsView.detail.description")}
          </span>
          <textarea
            className="dock-control min-h-[8rem] w-full rounded-md px-2 py-1.5 text-xs font-mono"
            value={item.description ?? ""}
            onChange={(e) =>
              update(viewId, item.id, { description: e.target.value || undefined })
            }
          />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1">
            <span className="text-xs text-[var(--muted)]">
              {t("actionsView.detail.actionType")}
            </span>
            <select
              className="dock-control w-full rounded-md px-2 py-1.5 text-xs"
              value={item.actionType}
              onChange={(e) =>
                update(viewId, item.id, {
                  actionType: e.target.value as MeasureActionItem["actionType"],
                })
              }
            >
              {ACTION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`actionsView.actionType.${type}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs text-[var(--muted)]">
              {t("actionsView.detail.obligation")}
            </span>
            <select
              className="dock-control w-full rounded-md px-2 py-1.5 text-xs"
              value={item.obligation}
              onChange={(e) =>
                update(viewId, item.id, {
                  obligation: e.target.value as MeasureActionItem["obligation"],
                })
              }
            >
              {OBLIGATION_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {t(`actionsView.obligation.${level}`)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <fieldset className="space-y-1">
          <legend className="text-xs text-[var(--muted)]">
            {t("actionsView.detail.qualities")}
          </legend>
          <div className="flex flex-wrap gap-2">
            {ARCHITECTURE_QUALITIES.map((q) => {
              const checked = item.qualities.includes(q);
              return (
                <label key={q} className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const next = checked
                        ? item.qualities.filter((x) => x !== q)
                        : [...item.qualities, q];
                      update(viewId, item.id, { qualities: next });
                    }}
                  />
                  {t(`actionsView.quality.${q}`)}
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1">
            <span className="text-xs text-[var(--muted)]">{t("actionsView.detail.status")}</span>
            <select
              className="dock-control w-full rounded-md px-2 py-1.5 text-xs"
              value={item.status}
              onChange={(e) =>
                update(viewId, item.id, {
                  status: e.target.value as MeasureActionItem["status"],
                })
              }
            >
              {MEASURE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`actionsView.status.${s}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs text-[var(--muted)]">{t("actionsView.detail.effort")}</span>
            <select
              className="dock-control w-full rounded-md px-2 py-1.5 text-xs"
              value={item.effort ?? ""}
              onChange={(e) =>
                update(viewId, item.id, {
                  effort: (e.target.value || undefined) as MeasureActionItem["effort"],
                })
              }
            >
              <option value="">—</option>
              {EFFORT_ESTIMATES.map((eff) => (
                <option key={eff} value={eff}>
                  {t(`actionsView.effort.${eff}`)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block space-y-1">
          <span className="text-xs text-[var(--muted)]">{t("actionsView.detail.owner")}</span>
          <input
            className="dock-control w-full rounded-md px-2 py-1.5 text-xs"
            value={item.owner ?? ""}
            onChange={(e) =>
              update(viewId, item.id, { owner: e.target.value || undefined })
            }
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs text-[var(--muted)]">{t("actionsView.detail.targetRef")}</span>
          <select
            className="dock-control w-full rounded-md px-2 py-1.5 text-xs"
            value={
              item.targetRef
                ? `${item.targetRef.viewId}:${item.targetRef.elementId}`
                : ""
            }
            onChange={(e) => {
              const val = e.target.value;
              if (!val) {
                update(viewId, item.id, { targetRef: undefined });
                return;
              }
              const target = linkTargets.find(
                (lt) => `${lt.viewId}:${lt.elementId}` === val,
              );
              if (!target) return;
              update(viewId, item.id, {
                targetRef: {
                  viewId: target.viewId,
                  elementId: target.elementId,
                  elementLabel: `[${target.viewName}] ${target.elementLabel}`,
                },
              });
            }}
          >
            <option value="">{t("actionsView.detail.targetNone")}</option>
            {linkTargets.map((lt) => (
              <option key={`${lt.viewId}:${lt.elementId}`} value={`${lt.viewId}:${lt.elementId}`}>
                [{lt.viewName}] {lt.elementLabel}
              </option>
            ))}
          </select>
          {item.targetRef ? (
            <button
              type="button"
              className="mt-1 flex items-center gap-1 text-xs text-[var(--accent-2)] hover:underline"
              onClick={() =>
                navigate(item.targetRef!.viewId, item.targetRef!.elementId)
              }
            >
              <ExternalLink className="h-3 w-3" />
              {t("actionsView.detail.navigateTarget")}
            </button>
          ) : null}
        </label>
      </div>
      <footer className="flex gap-2 border-t border-[var(--border)] p-2">
        <button
          type="button"
          className="dock-control flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-xs"
          onClick={() => duplicate(viewId, item.id)}
        >
          <Copy className="h-3.5 w-3.5" />
          {t("actionsView.detail.duplicate")}
        </button>
        <button
          type="button"
          className="flex flex-1 items-center justify-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 py-1.5 text-xs text-red-300"
          onClick={() => remove(viewId, item.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
          {t("actionsView.detail.delete")}
        </button>
      </footer>
    </aside>
  );
}
