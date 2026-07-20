"use client";

import { CheckCircle2, ChevronLeft, ChevronRight, HelpCircle } from "lucide-react";

import { FACILITATOR_FORMATS, getCurrentPhase, type FacilitatorPhase } from "@/lib/facilitator-phases";
import { useStormBoardStore } from "@/store/storm-board-store";
import type { WorkshopFormat } from "@/types/storm-element";

export interface FacilitatorPanelProps {
  onRequestHelpPhase?: (phase: FacilitatorPhase, format: WorkshopFormat) => void;
}

export function FacilitatorPanel({ onRequestHelpPhase }: FacilitatorPanelProps) {
  const workshopFormat = useStormBoardStore((s) => s.workshopFormat);
  const facilitatorEnabled = useStormBoardStore((s) => s.facilitatorEnabled);
  const facilitatorPhase = useStormBoardStore((s) => s.facilitatorPhase);
  const setFacilitatorPhase = useStormBoardStore((s) => s.setFacilitatorPhase);
  const nextFacilitatorPhase = useStormBoardStore((s) => s.nextFacilitatorPhase);
  const prevFacilitatorPhase = useStormBoardStore((s) => s.prevFacilitatorPhase);

  if (!facilitatorEnabled || workshopFormat === "free") return null;

  const formatDef = FACILITATOR_FORMATS.find((f) => f.format === workshopFormat);
  const phase = getCurrentPhase(workshopFormat, facilitatorPhase);
  const totalPhases = formatDef?.phases.length ?? 0;

  if (!formatDef || !phase) return null;

  return (
    <section className="border-t border-slate-200 p-3">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Facilitator — {formatDef.label}
        </h3>
        <button
          type="button"
          onClick={() => onRequestHelpPhase?.(phase, workshopFormat)}
          className="rounded-lg border border-slate-200 bg-white/80 p-1.5 text-slate-600 hover:bg-white"
          title="Hilfe zur aktuellen Phase"
          aria-label="Hilfe zur aktuellen Phase"
        >
          <HelpCircle className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-1 text-xs font-medium text-slate-800">
        Phase {facilitatorPhase + 1}/{totalPhases}: {phase.title}
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{phase.description}</p>

      <div className="mt-2 flex gap-1">
        <button
          type="button"
          disabled={facilitatorPhase <= 0}
          onClick={prevFacilitatorPhase}
          className="rounded border border-slate-200 p-1 disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <select
          className="flex-1 rounded border border-slate-200 px-1 text-xs"
          value={facilitatorPhase}
          onChange={(e) => setFacilitatorPhase(Number(e.target.value))}
        >
          {formatDef.phases.map((p, i) => (
            <option key={p.id} value={i}>{i + 1}. {p.title}</option>
          ))}
        </select>
        <button
          type="button"
          disabled={facilitatorPhase >= totalPhases - 1}
          onClick={nextFacilitatorPhase}
          className="rounded border border-slate-200 p-1 disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {phase.durationMinutes && (
        <p className="mt-2 text-[10px] text-slate-500">Empfohlen: {phase.durationMinutes} Min.</p>
      )}

      <ul className="mt-2 space-y-1">
        {phase.checklist.map((item) => (
          <li key={item} className="flex gap-1.5 text-[11px] text-slate-600">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-600" />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
