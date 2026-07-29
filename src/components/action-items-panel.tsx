"use client";

import { useMemo, useState } from "react";
import { Link2, Plus, Trash2 } from "lucide-react";

import { useStormBoardStore } from "@/store/storm-board-store";
import {
  ACTION_ITEM_AREA_LABELS,
  ACTION_ITEM_AREAS,
  ACTION_ITEM_STATUS_COLORS,
  ACTION_ITEM_STATUS_LABELS,
  ACTION_ITEM_STATUSES,
  type ActionItemArea,
  type ActionItemStatus,
} from "@/types/action-item";

type StatusFilter = "all" | ActionItemStatus;

export function ActionItemsPanel({ embedded = false }: { embedded?: boolean }) {
  const actionItems = useStormBoardStore((s) => s.actionItems);
  const elements = useStormBoardStore((s) => s.elements);
  const boundedContexts = useStormBoardStore((s) => s.boundedContexts);
  const selectedElementIds = useStormBoardStore((s) => s.selectedElementIds);
  const selectedBoundedContextIds = useStormBoardStore((s) => s.selectedBoundedContextIds);
  const addActionItem = useStormBoardStore((s) => s.addActionItem);
  const updateActionItem = useStormBoardStore((s) => s.updateActionItem);
  const deleteActionItem = useStormBoardStore((s) => s.deleteActionItem);
  const selectElement = useStormBoardStore((s) => s.selectElement);
  const selectBoundedContext = useStormBoardStore((s) => s.selectBoundedContext);

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<ActionItemStatus>("open");
  const [area, setArea] = useState<ActionItemArea>("followUp");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const list = [...actionItems].sort((a, b) => a.title.localeCompare(b.title, "de"));
    if (statusFilter === "all") return list;
    return list.filter((item) => item.status === statusFilter);
  }, [actionItems, statusFilter]);

  const openCount = actionItems.filter((i) => i.status !== "done").length;

  const addItem = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    addActionItem({
      title: trimmed,
      notes: notes.trim() || undefined,
      status,
      area,
      elementId: selectedElementIds[0],
      boundedContextId: selectedBoundedContextIds[0],
    });
    setTitle("");
    setNotes("");
    setStatus("open");
  };

  const jumpToLink = (item: (typeof actionItems)[number]) => {
    if (item.elementId && elements.some((e) => e.id === item.elementId)) {
      selectElement(item.elementId);
      return;
    }
    if (item.boundedContextId && boundedContexts.some((b) => b.id === item.boundedContextId)) {
      selectBoundedContext(item.boundedContextId);
    }
  };

  const body = (
    <>
      {!embedded && (
        <>
          <div className="flex items-center justify-between gap-2">
            <h3 className="group-label">To-dos & Problemfelder</h3>
            {openCount > 0 && (
              <span className="rounded-full bg-[var(--control)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--muted)]">
                {openCount} offen
              </span>
            )}
          </div>
          <p className="mt-1 text-[0.65rem] leading-snug text-[var(--muted)]">
            Action-Item-Register: Status, Notizen und Problemfelder (Workshop & Architektur).
          </p>
        </>
      )}

      <div className={[embedded ? "" : "mt-2", "flex flex-wrap gap-1"].join(" ")}>
        {(["all", ...ACTION_ITEM_STATUSES] as StatusFilter[]).map((key) => (
          <button
            key={key}
            type="button"
            className={[
              "rounded-md px-2 py-0.5 text-[10px] font-medium",
              statusFilter === key
                ? "dock-control-active"
                : "text-[var(--muted)] hover:bg-[var(--control-hover)]",
            ].join(" ")}
            onClick={() => setStatusFilter(key)}
          >
            {key === "all" ? "Alle" : ACTION_ITEM_STATUS_LABELS[key]}
          </button>
        ))}
      </div>

      <ul
        className={[
          "mt-2 space-y-1 overflow-y-auto",
          embedded ? "min-h-0 flex-1" : "max-h-44",
        ].join(" ")}
      >
        {filtered.length === 0 ? (
          <li className="text-xs text-[var(--muted)]">Noch keine Einträge.</li>
        ) : (
          filtered.map((item) => {
            const expanded = expandedId === item.id;
            const hasLink = Boolean(
              (item.elementId && elements.some((e) => e.id === item.elementId)) ||
                (item.boundedContextId &&
                  boundedContexts.some((b) => b.id === item.boundedContextId)),
            );
            return (
              <li
                key={item.id}
                className="rounded-md border border-[var(--border)] bg-[var(--control)]/40"
              >
                <div className="flex items-start gap-2 px-2 py-1.5">
                  <span
                    className="mt-1.5 size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: ACTION_ITEM_STATUS_COLORS[item.status] }}
                    title={ACTION_ITEM_STATUS_LABELS[item.status]}
                    aria-hidden
                  />
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setExpandedId(expanded ? null : item.id)}
                  >
                    <span
                      className={[
                        "block text-xs font-medium",
                        item.status === "done"
                          ? "text-[var(--muted)] line-through"
                          : "text-[var(--text)]",
                      ].join(" ")}
                    >
                      {item.title}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-[var(--muted)]">
                      {ACTION_ITEM_AREA_LABELS[item.area]}
                    </span>
                  </button>
                  {hasLink && (
                    <button
                      type="button"
                      className="shrink-0 rounded p-1 text-[var(--muted)] hover:text-[var(--accent)]"
                      title="Verknüpfung auf dem Board anzeigen"
                      aria-label="Verknüpfung auf dem Board anzeigen"
                      onClick={() => jumpToLink(item)}
                    >
                      <Link2 className="size-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    className="shrink-0 rounded p-1 text-[var(--muted)] hover:text-[#f0a8a0]"
                    aria-label="Eintrag löschen"
                    onClick={() => deleteActionItem(item.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>

                {expanded && (
                  <div className="space-y-2 border-t border-[var(--border)] px-2 py-2">
                    <label className="block text-[10px] font-medium text-[var(--muted)]">
                      Status
                      <select
                        className="dock-field mt-0.5 text-xs"
                        value={item.status}
                        onChange={(e) =>
                          updateActionItem(item.id, {
                            status: e.target.value as ActionItemStatus,
                          })
                        }
                      >
                        {ACTION_ITEM_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {ACTION_ITEM_STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-[10px] font-medium text-[var(--muted)]">
                      Bereich
                      <select
                        className="dock-field mt-0.5 text-xs"
                        value={item.area}
                        onChange={(e) =>
                          updateActionItem(item.id, { area: e.target.value as ActionItemArea })
                        }
                      >
                        {ACTION_ITEM_AREAS.map((a) => (
                          <option key={a} value={a}>
                            {ACTION_ITEM_AREA_LABELS[a]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-[10px] font-medium text-[var(--muted)]">
                      Notizen
                      <textarea
                        className="dock-field mt-0.5 min-h-[3rem] text-xs"
                        rows={2}
                        value={item.notes ?? ""}
                        onChange={(e) =>
                          updateActionItem(item.id, { notes: e.target.value || undefined })
                        }
                      />
                    </label>
                  </div>
                )}
              </li>
            );
          })
        )}
      </ul>

      <div className="mt-2 flex flex-col gap-1.5">
        <input
          className="dock-field text-xs"
          placeholder="Titel / Aufgabe"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addItem();
            }
          }}
        />
        <textarea
          className="dock-field min-h-[2.5rem] text-xs"
          rows={2}
          placeholder="Notizen (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-1.5">
          <select
            className="dock-field text-xs"
            value={status}
            onChange={(e) => setStatus(e.target.value as ActionItemStatus)}
            aria-label="Status"
          >
            {ACTION_ITEM_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ACTION_ITEM_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <select
            className="dock-field text-xs"
            value={area}
            onChange={(e) => setArea(e.target.value as ActionItemArea)}
            aria-label="Bereich"
          >
            {ACTION_ITEM_AREAS.map((a) => (
              <option key={a} value={a}>
                {ACTION_ITEM_AREA_LABELS[a]}
              </option>
            ))}
          </select>
        </div>
        {(selectedElementIds[0] || selectedBoundedContextIds[0]) && (
          <p className="text-[10px] text-[var(--muted)]">Verknüpft mit aktueller Auswahl.</p>
        )}
        <button
          type="button"
          disabled={!title.trim()}
          onClick={addItem}
          className="dock-control flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs disabled:opacity-50"
        >
          <Plus className="size-3.5" /> Hinzufügen
        </button>
      </div>
    </>
  );

  if (embedded) {
    return <div className="flex h-full min-h-0 flex-col">{body}</div>;
  }

  return <section className="border-t border-[var(--border)] p-3">{body}</section>;
}
