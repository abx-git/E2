"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { useStormBoardStore } from "@/store/storm-board-store";

export function GlossaryPanel({ embedded = false }: { embedded?: boolean }) {
  const glossary = useStormBoardStore((s) => s.glossary);
  const addGlossaryEntry = useStormBoardStore((s) => s.addGlossaryEntry);
  const deleteGlossaryEntry = useStormBoardStore((s) => s.deleteGlossaryEntry);
  const [term, setTerm] = useState("");
  const [definition, setDefinition] = useState("");

  const body = (
    <>
      <ul
        className={[
          "space-y-1 overflow-y-auto",
          embedded ? "min-h-0 flex-1" : "mt-2 max-h-32",
        ].join(" ")}
      >
        {glossary.length === 0 ? (
          <li className="text-xs text-[var(--muted)]">Noch keine Begriffe.</li>
        ) : (
          glossary.map((g) => (
            <li key={g.term} className="flex items-start gap-1 text-xs">
              <span className="font-medium text-[var(--text)]">{g.term}:</span>
              <span className="flex-1 text-[var(--muted)]">{g.definition}</span>
              <button
                type="button"
                onClick={() => deleteGlossaryEntry(g.term)}
                className="text-[var(--muted)] hover:text-[#f0a8a0]"
                aria-label={`„${g.term}“ löschen`}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </li>
          ))
        )}
      </ul>
      <div className="mt-2 flex flex-col gap-1">
        <input
          className="dock-field"
          placeholder="Begriff"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
        <input
          className="dock-field"
          placeholder="Definition"
          value={definition}
          onChange={(e) => setDefinition(e.target.value)}
        />
        <button
          type="button"
          disabled={!term.trim() || !definition.trim()}
          onClick={() => {
            addGlossaryEntry(term.trim(), definition.trim());
            setTerm("");
            setDefinition("");
          }}
          className="dock-control flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs disabled:opacity-50"
        >
          <Plus className="h-3 w-3" /> Hinzufügen
        </button>
      </div>
    </>
  );

  if (embedded) {
    return <div className="flex h-full min-h-0 flex-col">{body}</div>;
  }

  return (
    <section className="border-t border-[var(--border)] p-3">
      <h3 className="group-label">Glossary</h3>
      {body}
    </section>
  );
}
