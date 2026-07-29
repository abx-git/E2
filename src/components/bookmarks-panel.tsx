"use client";

import { useState } from "react";
import { Bookmark, Plus, Trash2 } from "lucide-react";

import { useStormBoardStore } from "@/store/storm-board-store";

export function BookmarksPanel({ embedded = false }: { embedded?: boolean }) {
  const bookmarks = useStormBoardStore((s) => s.bookmarks);
  const views = useStormBoardStore((s) => s.views);
  const addBookmark = useStormBoardStore((s) => s.addBookmark);
  const updateBookmark = useStormBoardStore((s) => s.updateBookmark);
  const deleteBookmark = useStormBoardStore((s) => s.deleteBookmark);
  const jumpToBookmark = useStormBoardStore((s) => s.jumpToBookmark);

  const [draftName, setDraftName] = useState("");
  const viewNameById = Object.fromEntries(views.map((view) => [view.id, view.name]));

  const saveBookmark = () => {
    const name = draftName.trim() || `Lesezeichen ${bookmarks.length + 1}`;
    addBookmark(name);
    setDraftName("");
  };

  const body = (
    <>
      {!embedded && (
        <p className="mt-1 text-[0.65rem] leading-snug text-[var(--muted)]">
          Sichtübergreifend: Sicht, Ansicht und Zoom speichern und später direkt anspringen.
        </p>
      )}

      <ul
        className={[
          "space-y-1 overflow-y-auto",
          embedded ? "min-h-0 flex-1" : "mt-2 max-h-36",
        ].join(" ")}
      >
        {bookmarks.length === 0 ? (
          <li className="text-xs text-[var(--muted)]">Noch keine Lesezeichen gesetzt.</li>
        ) : (
          bookmarks.map((bookmark) => (
            <li key={bookmark.id} className="flex items-center gap-1">
              <button
                type="button"
                className="shrink-0 rounded p-1 text-[var(--accent)] hover:bg-[var(--control-hover)]"
                onClick={() => jumpToBookmark(bookmark.id)}
                title="Zu Lesezeichen springen"
                aria-label={`Zu „${bookmark.name}“ springen`}
              >
                <Bookmark className="size-3.5" aria-hidden />
              </button>
              <div className="min-w-0 flex-1">
                <input
                  className="dock-field w-full text-xs"
                  value={bookmark.name}
                  aria-label="Lesezeichen umbenennen"
                  onChange={(e) => updateBookmark(bookmark.id, { name: e.target.value })}
                  onKeyDown={(e) => e.stopPropagation()}
                />
                <p className="mt-0.5 truncate text-[0.6rem] text-[var(--muted)]">
                  {viewNameById[bookmark.viewId] ?? "Unbekannte Sicht"}
                </p>
              </div>
              <button
                type="button"
                className="shrink-0 rounded p-1 text-[var(--muted)] hover:text-[#f0a8a0]"
                aria-label={`Lesezeichen „${bookmark.name}“ löschen`}
                onClick={() => deleteBookmark(bookmark.id)}
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))
        )}
      </ul>

      <div className="mt-2 flex flex-col gap-1.5">
        <input
          className="dock-field text-xs"
          placeholder="Name (optional)"
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              saveBookmark();
            }
          }}
        />
        <button
          type="button"
          onClick={saveBookmark}
          className="dock-control flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs"
        >
          <Plus className="size-3.5" />
          Aktuelle Ansicht speichern
        </button>
      </div>
    </>
  );

  if (embedded) {
    return <div className="flex h-full min-h-0 flex-col">{body}</div>;
  }

  return (
    <section className="border-t border-[var(--border)] p-3">
      <h3 className="group-label">Lesezeichen</h3>
      {body}
    </section>
  );
}
