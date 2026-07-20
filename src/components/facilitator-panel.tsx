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
    <section className="border-t border-[var(--border)] p-3">
      <div className="flex items-start justify-between gap-3">
        <h3 className="group-label">Facilitator — {formatDef.label}</h3>
        <button
          type="button"
          onClick={() => onRequestHelpPhase?.(phase, workshopFormat)}
          className="dock-control rounded-md p-1.5 text-[var(--muted)] hover:text-[var(--text)]"
          title="Hilfe zur aktuellen Phase"
          aria-label="Hilfe zur aktuellen Phase"
        >
          <HelpCircle className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-1 text-xs font-medium text-[var(--text)]">
        Phase {facilitatorPhase + 1}/{totalPhases}: {phase.title}
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted)]">{phase.description}</p>

      <div className="mt-2 flex gap-1">
        <button
          type="button"
          disabled={facilitatorPhase <= 0}
          onClick={prevFacilitatorPhase}
          className="dock-control rounded-md p-1 disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <select
          className="dock-field flex-1"
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
          className="dock-control rounded-md p-1 disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {phase.durationMinutes && (
        <p className="mt-2 text-[10px] text-[var(--muted)]">Empfohlen: {phase.durationMinutes} Min.</p>
      )}

      <ul className="mt-2 space-y-1">
        {phase.checklist.map((item) => (
          <li key={item} className="flex gap-1.5 text-[11px] text-[var(--muted)]">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
