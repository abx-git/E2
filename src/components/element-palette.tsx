"use client";

import type { ElementType } from "@/types/storm-element";
import { ELEMENT_STYLES } from "@/lib/element-styles";
import { getAllowedTypesForPhase } from "@/lib/facilitator-phases";
import { useStormBoardStore } from "@/store/storm-board-store";

export interface ElementPaletteProps {
  onSelectType: (type: ElementType) => void;
}

export function ElementPalette({ onSelectType }: ElementPaletteProps) {
  const paletteType = useStormBoardStore((s) => s.paletteType);
  const setPaletteType = useStormBoardStore((s) => s.setPaletteType);
  const workshopFormat = useStormBoardStore((s) => s.workshopFormat);
  const facilitatorEnabled = useStormBoardStore((s) => s.facilitatorEnabled);
  const facilitatorPhase = useStormBoardStore((s) => s.facilitatorPhase);

  const allowed = getAllowedTypesForPhase(workshopFormat, facilitatorPhase, facilitatorEnabled);

  return (
    <aside className="flex w-44 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-3 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Elemente</h2>
      </div>
      <div className="flex flex-col gap-1 overflow-y-auto p-2">
        {allowed.map((type) => {
          const style = ELEMENT_STYLES[type];
          const active = paletteType === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => {
                setPaletteType(type);
                onSelectType(type);
              }}
              className={[
                "rounded-lg border px-2 py-2 text-left text-xs font-medium transition",
                style.bg,
                style.border,
                style.text,
                active ? "ring-2 ring-sky-500 ring-offset-1" : "opacity-90 hover:opacity-100",
              ].join(" ")}
            >
              {style.label}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
