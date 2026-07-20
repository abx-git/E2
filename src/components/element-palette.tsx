"use client";

import { HelpCircle } from "lucide-react";

import type { ElementType } from "@/types/storm-element";
import { ELEMENT_STYLES } from "@/lib/element-styles";
import { getAllowedTypesForPhase } from "@/lib/facilitator-phases";
import { useStormBoardStore } from "@/store/storm-board-store";

export interface ElementPaletteProps {
  onSelectType: (type: ElementType) => void;
  onRequestHelp?: (type: ElementType) => void;
}

export function ElementPalette({ onSelectType, onRequestHelp }: ElementPaletteProps) {
  const paletteType = useStormBoardStore((s) => s.paletteType);
  const setPaletteType = useStormBoardStore((s) => s.setPaletteType);
  const workshopFormat = useStormBoardStore((s) => s.workshopFormat);
  const facilitatorEnabled = useStormBoardStore((s) => s.facilitatorEnabled);
  const facilitatorPhase = useStormBoardStore((s) => s.facilitatorPhase);

  const allowed = getAllowedTypesForPhase(workshopFormat, facilitatorPhase, facilitatorEnabled);

  return (
    <aside className="flex w-48 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--panel-solid)]">
      <div className="border-b border-[var(--border)] px-3 py-3">
        <h2 className="group-label">Elemente</h2>
      </div>
      <div className="flex flex-col gap-1.5 overflow-y-auto p-2">
        {allowed.map((type) => {
          const style = ELEMENT_STYLES[type];
          const active = paletteType === type;
          return (
            <div key={type} className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setPaletteType(type);
                  onSelectType(type);
                }}
                className={[
                  "flex-1 rounded-lg border px-2 py-2 text-left text-xs font-medium transition",
                  style.bg,
                  style.border,
                  style.text,
                  active ? "ring-2 ring-[var(--accent)] ring-offset-1 ring-offset-[var(--panel-solid)]" : "opacity-90 hover:opacity-100",
                ].join(" ")}
              >
                {style.label}
              </button>
              <button
                type="button"
                className="dock-control rounded-md p-1.5 text-[var(--muted)] hover:text-[var(--text)]"
                title="Hilfe zu diesem Element"
                aria-label={`Hilfe für ${type}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onRequestHelp?.(type);
                }}
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
