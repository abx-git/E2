"use client";

import { useMemo } from "react";
import { AlertCircle, Trash2 } from "lucide-react";

import { validateBoard } from "@/lib/relation-validation";
import { RELATION_TYPE_LABELS, type RelationType } from "@/types/storm-relation";
import { useStormBoardStore } from "@/store/storm-board-store";
import { ELEMENT_STYLES } from "@/lib/element-styles";

const RELATION_TYPES: RelationType[] = [
  "triggers", "reactsWith", "informs", "executedBy", "invokes", "causal", "contains",
];

export function ElementDetailSidebar() {
  const elements = useStormBoardStore((s) => s.elements);
  const relations = useStormBoardStore((s) => s.relations);
  const selectedElementIds = useStormBoardStore((s) => s.selectedElementIds);
  const selectedRelationId = useStormBoardStore((s) => s.selectedRelationId);
  const updateElement = useStormBoardStore((s) => s.updateElement);
  const deleteElement = useStormBoardStore((s) => s.deleteElement);
  const updateRelation = useStormBoardStore((s) => s.updateRelation);
  const deleteRelation = useStormBoardStore((s) => s.deleteRelation);
  const boundedContexts = useStormBoardStore((s) => s.boundedContexts);
  const swimlanes = useStormBoardStore((s) => s.swimlanes);

  const selectedElement = elements.find((e) => e.id === selectedElementIds[0]);
  const selectedRelation = relations.find((r) => r.id === selectedRelationId);

  const issues = useMemo(
    () => validateBoard(elements, relations).filter((i) => i.elementId === selectedElement?.id),
    [elements, relations, selectedElement?.id],
  );

  if (selectedRelation) {
    return (
      <aside className="flex w-72 shrink-0 flex-col border-l border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Relation</h2>
        </div>
        <div className="space-y-3 p-4">
          <label className="block text-xs font-medium text-slate-600">
            Typ
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              value={selectedRelation.type}
              onChange={(e) => updateRelation(selectedRelation.id, { type: e.target.value as RelationType })}
            >
              {RELATION_TYPES.map((t) => (
                <option key={t} value={t}>{RELATION_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-slate-600">
            Label
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              value={selectedRelation.label ?? ""}
              onChange={(e) => updateRelation(selectedRelation.id, { label: e.target.value })}
            />
          </label>
          <button
            type="button"
            onClick={() => deleteRelation(selectedRelation.id)}
            className="flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" /> Relation löschen
          </button>
        </div>
      </aside>
    );
  }

  if (!selectedElement) {
    return (
      <aside className="flex w-72 shrink-0 flex-col border-l border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Details</h2>
        </div>
        <p className="p-4 text-sm text-slate-500">Element oder Relation auswählen</p>
      </aside>
    );
  }

  const style = ELEMENT_STYLES[selectedElement.type];

  return (
    <aside className="flex w-72 shrink-0 flex-col border-l border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">{style.label}</h2>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        <label className="block text-xs font-medium text-slate-600">
          Label
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            value={selectedElement.label}
            onChange={(e) => updateElement(selectedElement.id, { label: e.target.value })}
          />
        </label>
        <label className="block text-xs font-medium text-slate-600">
          Beschreibung
          <textarea
            className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            rows={3}
            value={selectedElement.description ?? ""}
            onChange={(e) => updateElement(selectedElement.id, { description: e.target.value })}
          />
        </label>

        {selectedElement.type === "hotspot" && (
          <>
            <label className="block text-xs font-medium text-slate-600">
              Status
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                value={selectedElement.metadata?.hotspotStatus ?? "open"}
                onChange={(e) =>
                  updateElement(selectedElement.id, {
                    metadata: {
                      ...selectedElement.metadata,
                      hotspotStatus: e.target.value as "open" | "resolved",
                    },
                  })
                }
              >
                <option value="open">Offen</option>
                <option value="resolved">Gelöst</option>
              </select>
            </label>
            <label className="block text-xs font-medium text-slate-600">
              Priorität
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                value={selectedElement.metadata?.hotspotPriority ?? "medium"}
                onChange={(e) =>
                  updateElement(selectedElement.id, {
                    metadata: {
                      ...selectedElement.metadata,
                      hotspotPriority: e.target.value as "low" | "medium" | "high",
                    },
                  })
                }
              >
                <option value="low">Niedrig</option>
                <option value="medium">Mittel</option>
                <option value="high">Hoch</option>
              </select>
            </label>
          </>
        )}

        {(selectedElement.type === "domainEvent" || selectedElement.type === "aggregate") && (
          <label className="block text-xs font-medium text-slate-600">
            Event Schema (JSON)
            <textarea
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 font-mono text-xs"
              rows={4}
              value={
                selectedElement.metadata?.eventSchema
                  ? JSON.stringify(selectedElement.metadata.eventSchema, null, 2)
                  : ""
              }
              onChange={(e) => {
                try {
                  const parsed = e.target.value.trim() ? JSON.parse(e.target.value) : undefined;
                  updateElement(selectedElement.id, {
                    metadata: { ...selectedElement.metadata, eventSchema: parsed },
                  });
                } catch {
                  /* invalid json while typing */
                }
              }}
              placeholder='{"orderId": "string"}'
            />
          </label>
        )}

        {selectedElement.type === "aggregate" && (
          <label className="block text-xs font-medium text-slate-600">
            Methoden (eine pro Zeile)
            <textarea
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
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
          </label>
        )}

        <label className="flex items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={selectedElement.metadata?.isRecurring ?? false}
            onChange={(e) =>
              updateElement(selectedElement.id, {
                metadata: { ...selectedElement.metadata, isRecurring: e.target.checked },
              })
            }
          />
          Wiederkehrend (Uhr/Kalender)
        </label>

        {boundedContexts.length > 0 && (
          <label className="block text-xs font-medium text-slate-600">
            Bounded Context
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              value={selectedElement.boundedContextId ?? ""}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  boundedContextId: e.target.value || undefined,
                })
              }
            >
              <option value="">—</option>
              {boundedContexts.map((bc) => (
                <option key={bc.id} value={bc.id}>{bc.label}</option>
              ))}
            </select>
          </label>
        )}

        {swimlanes.length > 0 && (
          <label className="block text-xs font-medium text-slate-600">
            Swimlane
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              value={selectedElement.swimlaneId ?? ""}
              onChange={(e) =>
                updateElement(selectedElement.id, { swimlaneId: e.target.value || undefined })
              }
            >
              <option value="">—</option>
              {swimlanes.map((l) => (
                <option key={l.id} value={l.id}>{l.label}</option>
              ))}
            </select>
          </label>
        )}

        {issues.map((issue) => (
          <div
            key={issue.id}
            className={[
              "flex gap-2 rounded-lg px-2 py-1.5 text-xs",
              issue.severity === "warning" ? "bg-amber-50 text-amber-900" : "bg-slate-50 text-slate-600",
            ].join(" ")}
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            {issue.message}
          </div>
        ))}

        <button
          type="button"
          onClick={() => deleteElement(selectedElement.id)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" /> Element löschen
        </button>
      </div>
    </aside>
  );
}
