"use client";

import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";

import { getFacilitatorFormat, getCurrentPhase, type FacilitatorPhase } from "@/lib/facilitator-phases";
import { useStormBoardStore } from "@/store/storm-board-store";
import type { WorkshopFormat } from "@/types/storm-element";

const DEFAULT_DURATION_MINUTES = 15;

export interface FacilitatorPanelProps {
  onRequestHelpPhase?: (phase: FacilitatorPhase, format: WorkshopFormat) => void;
}

function formatMmSs(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export function FacilitatorPanel({ onRequestHelpPhase }: FacilitatorPanelProps) {
  const workshopFormat = useStormBoardStore((s) => s.workshopFormat);
  const facilitatorEnabled = useStormBoardStore((s) => s.facilitatorEnabled);
  const facilitatorPhase = useStormBoardStore((s) => s.facilitatorPhase);
  const setFacilitatorPhase = useStormBoardStore((s) => s.setFacilitatorPhase);
  const nextFacilitatorPhase = useStormBoardStore((s) => s.nextFacilitatorPhase);
  const prevFacilitatorPhase = useStormBoardStore((s) => s.prevFacilitatorPhase);

  const phase = getCurrentPhase(workshopFormat, facilitatorPhase);
  const durationMinutes = phase?.durationMinutes ?? DEFAULT_DURATION_MINUTES;
  const initialSeconds = durationMinutes * 60;

  const [remainingSeconds, setRemainingSeconds] = useState(initialSeconds);
  const [running, setRunning] = useState(false);
  const phaseKeyRef = useRef(`${workshopFormat}:${facilitatorPhase}`);

  useEffect(() => {
    const key = `${workshopFormat}:${facilitatorPhase}`;
    if (phaseKeyRef.current !== key) {
      phaseKeyRef.current = key;
      setRunning(false);
      setRemainingSeconds((phase?.durationMinutes ?? DEFAULT_DURATION_MINUTES) * 60);
    }
  }, [workshopFormat, facilitatorPhase, phase?.durationMinutes]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (running && remainingSeconds === 0) setRunning(false);
  }, [running, remainingSeconds]);

  if (!facilitatorEnabled || workshopFormat === "free") return null;

  const formatDef = getFacilitatorFormat(workshopFormat);
  const totalPhases = formatDef?.phases.length ?? 0;

  if (!formatDef || !phase) return null;

  const expired = remainingSeconds === 0;

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

      <div
        className={[
          "mt-2 flex items-center gap-2 rounded-lg border px-2 py-1.5",
          expired
            ? "border-[var(--accent-2)] bg-[rgba(233,196,106,0.12)]"
            : "border-[var(--border)] bg-[var(--control)]",
        ].join(" ")}
      >
        <span
          className={[
            "min-w-[3.25rem] font-mono text-sm tabular-nums",
            expired ? "font-semibold text-[var(--accent-2)]" : "text-[var(--text)]",
          ].join(" ")}
          aria-live="polite"
        >
          {formatMmSs(remainingSeconds)}
        </span>
        <span className="flex-1 text-[10px] text-[var(--muted)]">
          {expired ? "Zeit abgelaufen" : `Empfohlen: ${durationMinutes} Min.`}
        </span>
        <button
          type="button"
          className="dock-control rounded-md p-1"
          title={running ? "Pause" : "Start"}
          aria-label={running ? "Timer pausieren" : "Timer starten"}
          onClick={() => {
            if (remainingSeconds === 0) {
              setRemainingSeconds(initialSeconds);
            }
            setRunning((v) => !v);
          }}
        >
          {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </button>
        <button
          type="button"
          className="dock-control rounded-md p-1"
          title="Zurücksetzen"
          aria-label="Timer zurücksetzen"
          onClick={() => {
            setRunning(false);
            setRemainingSeconds(initialSeconds);
          }}
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>

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
