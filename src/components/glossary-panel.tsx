"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { useStormBoardStore } from "@/store/storm-board-store";

export function GlossaryPanel() {
  const glossary = useStormBoardStore((s) => s.glossary);
  const addGlossaryEntry = useStormBoardStore((s) => s.addGlossaryEntry);
  const deleteGlossaryEntry = useStormBoardStore((s) => s.deleteGlossaryEntry);
  const [term, setTerm] = useState("");
  const [definition, setDefinition] = useState("");

  return (
    <section className="border-t border-slate-200 p-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Glossary</h3>
      <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto">
        {glossary.map((g) => (
          <li key={g.term} className="flex items-start gap-1 text-xs">
            <span className="font-medium text-slate-800">{g.term}:</span>
            <span className="flex-1 text-slate-600">{g.definition}</span>
            <button type="button" onClick={() => deleteGlossaryEntry(g.term)} className="text-slate-400 hover:text-red-600">
              <Trash2 className="h-3 w-3" />
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex flex-col gap-1">
        <input
          className="rounded border border-slate-200 px-2 py-1 text-xs"
          placeholder="Begriff"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
        <input
          className="rounded border border-slate-200 px-2 py-1 text-xs"
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
          className="flex items-center justify-center gap-1 rounded bg-slate-100 py-1 text-xs hover:bg-slate-200 disabled:opacity-50"
        >
          <Plus className="h-3 w-3" /> Hinzufügen
        </button>
      </div>
    </section>
  );
}
