"use client";

import { LayoutDashboard } from "lucide-react";

import { resolveBoundedContextDetailView } from "@/lib/bounded-context-view";
import { useStormBoardStore } from "@/store/storm-board-store";
import type { BoundedContext } from "@/types/storm-element";

export interface BoundedContextDetailPanelProps {
  boundedContext: BoundedContext;
  /** Compact layout for bottom sheets (hides geometry fields). */
  compact?: boolean;
  onDetailViewOpened?: () => void;
}

export function BoundedContextDetailPanel({
  boundedContext,
  compact = false,
  onDetailViewOpened,
}: BoundedContextDetailPanelProps) {
  const views = useStormBoardStore((s) => s.views);
  const updateBoundedContext = useStormBoardStore((s) => s.updateBoundedContext);
  const openBoundedContextView = useStormBoardStore((s) => s.openBoundedContextView);

  const detailView = resolveBoundedContextDetailView(boundedContext, views);

  const openDetailView = () => {
    openBoundedContextView(boundedContext.id);
    onDetailViewOpened?.();
  };

  return (
    <div className="space-y-3">
      <div>
        <button
          type="button"
          className="flex w-full items-center justify-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--control)] px-3 py-2.5 text-sm font-medium text-[var(--text)] hover:border-[var(--accent)] max-lg:py-3"
          onClick={openDetailView}
        >
          <LayoutDashboard className="size-4 shrink-0" aria-hidden />
          {detailView ? `Detail-Sicht öffnen (${detailView.name})` : "Detail-Sicht erstellen"}
        </button>
        <p className="mt-1.5 text-[0.72rem] text-[var(--muted)]">
          {detailView
            ? "Inhalte wurden beim Erstellen kopiert; Änderungen in der Detail-Sicht sind unabhängig."
            : "Erstellt eine neue Sicht mit Inhalten dieses Bounded Contexts und direkten Referenzen außerhalb."}
        </p>
      </div>

      <Field label="Label">
        <input
          className="dock-field"
          value={boundedContext.label}
          onChange={(e) => updateBoundedContext(boundedContext.id, { label: e.target.value })}
        />
      </Field>

      <Field label="Zweck">
        <textarea
          className="dock-field min-h-[4rem]"
          rows={2}
          value={boundedContext.purpose ?? ""}
          onChange={(e) => updateBoundedContext(boundedContext.id, { purpose: e.target.value })}
        />
      </Field>

      {!compact && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <NumberField
              label="X"
              value={boundedContext.x}
              onChange={(v) => updateBoundedContext(boundedContext.id, { x: v })}
            />
            <NumberField
              label="Y"
              value={boundedContext.y}
              onChange={(v) => updateBoundedContext(boundedContext.id, { y: v })}
            />
            <NumberField
              label="Breite"
              value={boundedContext.width}
              min={80}
              onChange={(v) =>
                updateBoundedContext(boundedContext.id, { width: Math.max(80, v) })
              }
            />
            <NumberField
              label="Höhe"
              value={boundedContext.height}
              min={80}
              onChange={(v) =>
                updateBoundedContext(boundedContext.id, { height: Math.max(80, v) })
              }
            />
            <NumberField
              label="Ebene (z)"
              value={boundedContext.zIndex ?? 0}
              onChange={(v) => updateBoundedContext(boundedContext.id, { zIndex: v })}
            />
          </div>
          <Field label="Farbe">
            <input
              type="color"
              className="dock-field h-9 cursor-pointer p-1"
              value={boundedContext.color ?? "#2a9d8f"}
              onChange={(e) => updateBoundedContext(boundedContext.id, { color: e.target.value })}
            />
          </Field>
          <p className="text-[0.72rem] text-[var(--muted)]">Löschen: Rechtsklick bzw. langes Drücken.</p>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-[0.72rem] font-medium text-[var(--muted)]">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        min={min}
        className="dock-field"
        value={Math.round(value)}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </Field>
  );
}
