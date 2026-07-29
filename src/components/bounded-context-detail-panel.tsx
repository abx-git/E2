"use client";

import { useState } from "react";
import { ChevronDown, LayoutDashboard } from "lucide-react";

import { resolveBoundedContextDetailView } from "@/lib/bounded-context-view";
import { RegionAppearanceControls } from "@/components/region-appearance-controls";
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

      <RegionAppearanceControls
        kind="boundedContext"
        region={boundedContext}
        onChange={(patch) => updateBoundedContext(boundedContext.id, patch)}
      />

      {!compact && (
          <CollapsibleSection title="Position & Größe" defaultOpen={false}>
            {boundedContext.locked && (
              <p className="mb-2 text-[0.65rem] text-[var(--muted)]">
                Gesperrt — Position und Größe sind geschützt.
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label="X"
                value={boundedContext.x}
                disabled={boundedContext.locked}
                onChange={(v) => updateBoundedContext(boundedContext.id, { x: v })}
              />
              <NumberField
                label="Y"
                value={boundedContext.y}
                disabled={boundedContext.locked}
                onChange={(v) => updateBoundedContext(boundedContext.id, { y: v })}
              />
              <NumberField
                label="Breite"
                value={boundedContext.width}
                min={80}
                disabled={boundedContext.locked}
                onChange={(v) =>
                  updateBoundedContext(boundedContext.id, { width: Math.max(80, v) })
                }
              />
              <NumberField
                label="Höhe"
                value={boundedContext.height}
                min={80}
                disabled={boundedContext.locked}
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
          </CollapsibleSection>
      )}
    </div>
  );
}

function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-md border border-[var(--border)]/70 bg-[var(--control)]/20">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[0.72rem] font-medium text-[var(--muted)] hover:text-[var(--text)]"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <ChevronDown
          className={["size-3.5 shrink-0 transition-transform", open ? "rotate-0" : "-rotate-90"].join(" ")}
          aria-hidden
        />
        <span className="flex-1">{title}</span>
      </button>
      {open && <div className="space-y-2 border-t border-[var(--border)]/60 px-2.5 py-2">{children}</div>}
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
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  disabled?: boolean;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        min={min}
        disabled={disabled}
        className="dock-field disabled:opacity-50"
        value={Math.round(value)}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </Field>
  );
}
