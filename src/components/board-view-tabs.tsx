"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Copy, Plus, Trash2, X } from "lucide-react";
import { useStormBoardStore } from "@/store/storm-board-store";

export function BoardViewTabs() {
  const views = useStormBoardStore((s) => s.views);
  const activeViewId = useStormBoardStore((s) => s.activeViewId);
  const setActiveView = useStormBoardStore((s) => s.setActiveView);
  const addView = useStormBoardStore((s) => s.addView);
  const renameView = useStormBoardStore((s) => s.renameView);
  const duplicateView = useStormBoardStore((s) => s.duplicateView);
  const deleteView = useStormBoardStore((s) => s.deleteView);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(
    null,
  );
  const inputRef = useRef<HTMLInputElement>(null);

  const beginRename = (id: string, name: string) => {
    setEditingId(id);
    setDraft(name);
    setMenu(null);
    requestAnimationFrame(() => inputRef.current?.select());
  };

  const commitRename = () => {
    if (!editingId) return;
    renameView(editingId, draft);
    setEditingId(null);
  };

  const requestDelete = (id: string) => {
    if (views.length <= 1) return;
    const view = views.find((v) => v.id === id);
    if (!view) return;
    setMenu(null);
    setPendingDelete({ id: view.id, name: view.name });
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteView(pendingDelete.id);
    setPendingDelete(null);
  };

  const canDelete = views.length > 1;

  return (
    <div className="relative flex min-h-0 items-center gap-1 overflow-x-auto px-1 py-1">
      {views.map((view) => {
        const active = view.id === activeViewId;
        return (
          <div key={view.id} className="group relative shrink-0">
            {editingId === view.id ? (
              <input
                ref={inputRef}
                className="dock-control h-7 w-36 rounded-md px-2 text-xs outline-none ring-1 ring-[var(--accent)]"
                value={draft}
                aria-label="Sicht umbenennen"
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitRename();
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    setEditingId(null);
                  }
                }}
              />
            ) : (
              <div
                className={[
                  "flex h-7 max-w-[11rem] items-center rounded-md",
                  active ? "dock-control-active" : "dock-control text-[var(--muted)]",
                ].join(" ")}
              >
                <button
                  type="button"
                  onClick={() => setActiveView(view.id)}
                  onDoubleClick={() => beginRename(view.id, view.name)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setMenu({ id: view.id, x: e.clientX, y: e.clientY });
                  }}
                  className={[
                    "min-w-0 flex-1 truncate px-2.5 text-left text-xs font-medium",
                    canDelete ? "pr-1" : "",
                  ].join(" ")}
                  title={`${view.name} — Doppelklick: umbenennen, Rechtsklick: Menü`}
                >
                  {view.name}
                </button>
                {canDelete && (
                  <button
                    type="button"
                    className={[
                      "mr-0.5 rounded p-0.5 text-[var(--muted)] hover:bg-[var(--control-hover)] hover:text-[var(--text)]",
                      active ? "opacity-80" : "opacity-0 group-hover:opacity-70 focus:opacity-70",
                    ].join(" ")}
                    title={`Sicht „${view.name}“ löschen`}
                    aria-label={`Sicht „${view.name}“ löschen`}
                    onClick={(e) => {
                      e.stopPropagation();
                      requestDelete(view.id);
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => addView()}
        className="dock-control flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-xs text-[var(--muted)]"
        title="Neue Sicht"
      >
        <Plus className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Sicht</span>
      </button>

      {menu && (
        <div
          className="fixed inset-0 z-[1200]"
          role="presentation"
          onPointerDown={() => setMenu(null)}
        >
          <div
            className="dock-surface absolute min-w-[10rem] rounded-lg py-1 text-sm shadow-lg"
            style={{ left: menu.x, top: menu.y }}
            role="menu"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-[var(--control)]"
              onClick={() => {
                const v = views.find((x) => x.id === menu.id);
                if (v) beginRename(v.id, v.name);
              }}
            >
              Umbenennen
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-[var(--control)]"
              onClick={() => {
                duplicateView(menu.id);
                setMenu(null);
              }}
            >
              <Copy className="h-3.5 w-3.5" /> Duplizieren
            </button>
            <button
              type="button"
              disabled={!canDelete}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-red-400 hover:bg-[var(--control)] disabled:opacity-40"
              onClick={() => requestDelete(menu.id)}
            >
              <Trash2 className="h-3.5 w-3.5" /> Löschen…
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[var(--muted)] hover:bg-[var(--control)]"
              onClick={() => setMenu(null)}
            >
              <X className="h-3.5 w-3.5" /> Schließen
            </button>
          </div>
        </div>
      )}

      <DeleteViewDialog
        pending={pendingDelete}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function DeleteViewDialog({
  pending,
  onCancel,
  onConfirm,
}: {
  pending: { id: string; name: string } | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!pending) return;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending, onCancel]);

  if (!pending) return null;

  const layer = (
    <div
      className="fixed inset-0 z-[1250] flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="presentation"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="dock-surface w-full max-w-md rounded-t-xl p-5 shadow-dock sm:rounded-xl"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="text-base font-semibold text-[var(--text)]">
          Sicht löschen?
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
          „{pending.name}“ und der gesamte Inhalt dieser Sicht werden entfernt.
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="dock-control rounded-lg px-4 py-2.5 text-sm font-medium"
          >
            Abbrechen
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className="rounded-lg border border-red-500/40 bg-red-500/15 px-4 py-2.5 text-sm font-medium text-red-300 hover:bg-red-500/25"
          >
            Sicht löschen
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(layer, document.body) : layer;
}
