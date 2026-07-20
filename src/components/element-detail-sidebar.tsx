"use client";

import { useMemo, type ReactNode } from "react";
import { AlertCircle, HelpCircle } from "lucide-react";

import { ELEMENT_STYLES } from "@/lib/element-styles";
import { validateBoard } from "@/lib/relation-validation";
import { JsonValueEditor } from "@/components/json-value-editor";
import type { RelationType } from "@/types/storm-relation";
import type { ElementType } from "@/types/storm-element";
import { useStormBoardStore } from "@/store/storm-board-store";

const MIN_ELEMENT_SIZE = 40;

export interface ElementDetailSidebarProps {
  onRequestHelpElementType?: (type: ElementType) => void;
  onRequestHelpRelationType?: (type: RelationType) => void;
}

/** Inspector for continuous editing. Discrete actions live in the context menu. */
export function ElementDetailSidebar({
  onRequestHelpElementType,
  onRequestHelpRelationType,
}: ElementDetailSidebarProps) {
  const elements = useStormBoardStore((s) => s.elements);
  const relations = useStormBoardStore((s) => s.relations);
  const selectedElementIds = useStormBoardStore((s) => s.selectedElementIds);
  const selectedRelationId = useStormBoardStore((s) => s.selectedRelationId);
  const selectedBoundedContextId = useStormBoardStore((s) => s.selectedBoundedContextId);
  const selectedSwimlaneId = useStormBoardStore((s) => s.selectedSwimlaneId);
  const updateElement = useStormBoardStore((s) => s.updateElement);
  const updateRelation = useStormBoardStore((s) => s.updateRelation);
  const updateBoundedContext = useStormBoardStore((s) => s.updateBoundedContext);
  const updateSwimlane = useStormBoardStore((s) => s.updateSwimlane);
  const boundedContexts = useStormBoardStore((s) => s.boundedContexts);
  const swimlanes = useStormBoardStore((s) => s.swimlanes);

  const contextRelations = useStormBoardStore((s) => s.contextRelations);
  const selectedElement = elements.find((e) => e.id === selectedElementIds[0]);
  const selectedRelation = relations.find((r) => r.id === selectedRelationId);
  const selectedBoundedContext = boundedContexts.find((bc) => bc.id === selectedBoundedContextId);
  const selectedSwimlane = swimlanes.find((lane) => lane.id === selectedSwimlaneId);
  const multiCount = selectedElementIds.length;

  const issues = useMemo(
    () =>
      validateBoard(elements, relations, contextRelations).filter(
        (i) => i.elementId === selectedElement?.id,
      ),
    [elements, relations, contextRelations, selectedElement?.id],
  );

  if (selectedRelation) {
    return (
      <DockPanel
        title="Relation"
        onHelp={() => onRequestHelpRelationType?.(selectedRelation.type)}
      >
        <Field label="Label">
          <input
            className="dock-field"
            value={selectedRelation.label ?? ""}
            onChange={(e) => updateRelation(selectedRelation.id, { label: e.target.value })}
            placeholder="Optional"
          />
        </Field>
        <p className="text-[0.72rem] text-[var(--muted)]">
          Typ und Löschen: Rechtsklick auf die Verbindung.
        </p>
      </DockPanel>
    );
  }

  if (multiCount >= 2) {
    return (
      <DockPanel title={`${multiCount} Elemente`}>
        <p className="text-[0.82rem] text-[var(--muted)]">
          Ausrichten, Verteilen und Löschen über Rechtsklick auf die Auswahl.
        </p>
      </DockPanel>
    );
  }

  if (!selectedElement) {
    if (selectedSwimlane) {
      return (
        <DockPanel title="Swimlane">
          <Field label="Label">
            <input
              className="dock-field"
              value={selectedSwimlane.label}
              onChange={(e) => updateSwimlane(selectedSwimlane.id, { label: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <NumberField
              label="X"
              value={selectedSwimlane.x ?? 0}
              onChange={(v) => updateSwimlane(selectedSwimlane.id, { x: v })}
            />
            <NumberField
              label="Y"
              value={selectedSwimlane.y}
              onChange={(v) => updateSwimlane(selectedSwimlane.id, { y: v })}
            />
            <NumberField
              label="Breite"
              value={selectedSwimlane.width ?? 4000}
              min={80}
              onChange={(v) => updateSwimlane(selectedSwimlane.id, { width: Math.max(80, v) })}
            />
            <NumberField
              label="Höhe"
              value={selectedSwimlane.height}
              min={80}
              onChange={(v) => updateSwimlane(selectedSwimlane.id, { height: Math.max(80, v) })}
            />
          </div>
          <p className="text-[0.72rem] text-[var(--muted)]">Löschen: Rechtsklick.</p>
        </DockPanel>
      );
    }

    if (selectedBoundedContext) {
      return (
        <DockPanel title="Bounded Context">
          <Field label="Label">
            <input
              className="dock-field"
              value={selectedBoundedContext.label}
              onChange={(e) =>
                updateBoundedContext(selectedBoundedContext.id, { label: e.target.value })
              }
            />
          </Field>
          <Field label="Zweck">
            <textarea
              className="dock-field min-h-[4rem]"
              rows={2}
              value={selectedBoundedContext.purpose ?? ""}
              onChange={(e) =>
                updateBoundedContext(selectedBoundedContext.id, { purpose: e.target.value })
              }
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <NumberField
              label="X"
              value={selectedBoundedContext.x}
              onChange={(v) => updateBoundedContext(selectedBoundedContext.id, { x: v })}
            />
            <NumberField
              label="Y"
              value={selectedBoundedContext.y}
              onChange={(v) => updateBoundedContext(selectedBoundedContext.id, { y: v })}
            />
            <NumberField
              label="Breite"
              value={selectedBoundedContext.width}
              min={80}
              onChange={(v) =>
                updateBoundedContext(selectedBoundedContext.id, { width: Math.max(80, v) })
              }
            />
            <NumberField
              label="Höhe"
              value={selectedBoundedContext.height}
              min={80}
              onChange={(v) =>
                updateBoundedContext(selectedBoundedContext.id, { height: Math.max(80, v) })
              }
            />
          </div>
          <Field label="Farbe">
            <input
              type="color"
              className="dock-field h-9 cursor-pointer p-1"
              value={selectedBoundedContext.color ?? "#2a9d8f"}
              onChange={(e) =>
                updateBoundedContext(selectedBoundedContext.id, { color: e.target.value })
              }
            />
          </Field>
          <p className="text-[0.72rem] text-[var(--muted)]">Löschen: Rechtsklick.</p>
        </DockPanel>
      );
    }

    return (
      <DockPanel title="Details">
        <p className="text-[0.82rem] text-[var(--muted)]">
          Element wählen — Rechtsklick für Aktionen, Doppelklick für Fokus hier.
        </p>
      </DockPanel>
    );
  }

  const style = ELEMENT_STYLES[selectedElement.type];
  const width = selectedElement.width ?? style.defaultWidth;
  const height = selectedElement.height ?? style.defaultHeight;

  return (
    <DockPanel
      title={style.label}
      onHelp={() => onRequestHelpElementType?.(selectedElement.type)}
    >
      <Field label="Label">
        <input
          className="dock-field"
          value={selectedElement.label}
          onChange={(e) => updateElement(selectedElement.id, { label: e.target.value })}
        />
      </Field>
      <Field label="Beschreibung">
        <textarea
          className="dock-field min-h-[4.5rem]"
          rows={3}
          value={selectedElement.description ?? ""}
          onChange={(e) => updateElement(selectedElement.id, { description: e.target.value })}
        />
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <NumberField
          label="X"
          value={selectedElement.x}
          onChange={(v) => updateElement(selectedElement.id, { x: v })}
        />
        <NumberField
          label="Y"
          value={selectedElement.y}
          onChange={(v) => updateElement(selectedElement.id, { y: v })}
        />
        <NumberField
          label="Breite"
          value={width}
          min={MIN_ELEMENT_SIZE}
          onChange={(v) =>
            updateElement(selectedElement.id, {
              width: Math.max(MIN_ELEMENT_SIZE, v),
            })
          }
        />
        <NumberField
          label="Höhe"
          value={height}
          min={MIN_ELEMENT_SIZE}
          onChange={(v) =>
            updateElement(selectedElement.id, {
              height: Math.max(MIN_ELEMENT_SIZE, v),
            })
          }
        />
      </div>

      {(selectedElement.type === "domainEvent" || selectedElement.type === "aggregate") && (
        <Field label="Event Schema">
          <JsonValueEditor
            value={selectedElement.metadata?.eventSchema}
            onChange={(eventSchema) =>
              updateElement(selectedElement.id, {
                metadata: { ...selectedElement.metadata, eventSchema },
              })
            }
            emptyHint="Keine Schema-Felder — typischerweise Name → Typ"
          />
        </Field>
      )}

      {selectedElement.type === "aggregate" && (
        <>
          <Field label="Methoden (eine pro Zeile)">
            <textarea
              className="dock-field min-h-[4rem]"
              rows={3}
              value={(selectedElement.metadata?.aggregateMethods ?? []).join("\n")}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    aggregateMethods: e.target.value.split("\n").filter(Boolean),
                  },
                })
              }
            />
          </Field>
          <Field label="Invarianten (eine pro Zeile)">
            <textarea
              className="dock-field min-h-[4rem]"
              rows={3}
              value={(selectedElement.metadata?.aggregateInvariants ?? []).join("\n")}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    aggregateInvariants: e.target.value.split("\n").filter(Boolean),
                  },
                })
              }
              placeholder="z. B. Balance darf nicht negativ sein"
            />
          </Field>
        </>
      )}

      {issues.map((issue) => (
        <div
          key={issue.id}
          className="flex gap-2 rounded-lg bg-[rgba(233,196,106,0.12)] px-2 py-1.5 text-[0.72rem] text-[var(--accent-2)]"
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {issue.message}
        </div>
      ))}

      <p className="text-[0.72rem] text-[var(--muted)]">
        Relation, Zuordnung, Status und Löschen: Rechtsklick.
      </p>
    </DockPanel>
  );
}

function DockPanel({
  title,
  onHelp,
  children,
}: {
  title: string;
  onHelp?: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-col border-b border-[var(--border)]">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
        <h2 className="text-sm font-semibold tracking-tight text-[var(--text)]">{title}</h2>
        {onHelp && (
          <button
            type="button"
            onClick={onHelp}
            className="dock-control rounded-md p-1.5 text-[var(--muted)] hover:text-[var(--text)]"
            title="Hilfe"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="space-y-3 overflow-y-auto p-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
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
