"use client";

import { useRef, useState } from "react";
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

  return (
    <div className="relative flex min-h-0 items-center gap-1 overflow-x-auto px-1 py-1">
      {views.map((view) => {
        const active = view.id === activeViewId;
        return (
          <div key={view.id} className="relative shrink-0">
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
              <button
                type="button"
                onClick={() => setActiveView(view.id)}
                onDoubleClick={() => beginRename(view.id, view.name)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setMenu({ id: view.id, x: e.clientX, y: e.clientY });
                }}
                className={[
                  "flex h-7 max-w-[10rem] items-center rounded-md px-2.5 text-xs font-medium",
                  active ? "dock-control-active" : "dock-control text-[var(--muted)]",
                ].join(" ")}
                title={`${view.name} — Doppelklick: umbenennen`}
              >
                <span className="truncate">{view.name}</span>
              </button>
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
              disabled={views.length <= 1}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-red-600 hover:bg-[var(--control)] disabled:opacity-40"
              onClick={() => {
                deleteView(menu.id);
                setMenu(null);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" /> Löschen
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
    </div>
  );
}
