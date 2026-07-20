"use client";

import { useMemo } from "react";
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalSpaceBetween,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalSpaceBetween,
  AlertCircle,
  HelpCircle,
  StretchHorizontal,
  StretchVertical,
  Trash2,
} from "lucide-react";

import { computeAlignPatches, type AlignMode } from "@/lib/element-align";
import { ELEMENT_STYLES } from "@/lib/element-styles";
import { validateBoard } from "@/lib/relation-validation";
import { RELATION_TYPE_LABELS, type RelationType } from "@/types/storm-relation";
import type { ElementType } from "@/types/storm-element";
import { useStormBoardStore } from "@/store/storm-board-store";

const RELATION_TYPES: RelationType[] = [
  "triggers", "reactsWith", "informs", "executedBy", "invokes", "causal", "contains",
];

const MIN_ELEMENT_SIZE = 40;

const ALIGN_ACTIONS: { mode: AlignMode; label: string; icon: typeof AlignStartHorizontal; minCount?: number }[] = [
  { mode: "left", label: "Links ausrichten", icon: AlignStartVertical },
  { mode: "centerX", label: "Horizontal zentrieren", icon: AlignCenterVertical },
  { mode: "right", label: "Rechts ausrichten", icon: AlignEndVertical },
  { mode: "top", label: "Oben ausrichten", icon: AlignStartHorizontal },
  { mode: "centerY", label: "Vertikal zentrieren", icon: AlignCenterHorizontal },
  { mode: "bottom", label: "Unten ausrichten", icon: AlignEndHorizontal },
  { mode: "distributeX", label: "Horizontal verteilen", icon: AlignHorizontalSpaceBetween, minCount: 3 },
  { mode: "distributeY", label: "Vertikal verteilen", icon: AlignVerticalSpaceBetween, minCount: 3 },
  { mode: "sameWidth", label: "Gleiche Breite", icon: StretchHorizontal },
  { mode: "sameHeight", label: "Gleiche Höhe", icon: StretchVertical },
];

export interface ElementDetailSidebarProps {
  onRequestHelpElementType?: (type: ElementType) => void;
  onRequestHelpRelationType?: (type: RelationType) => void;
}

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
  const deleteElement = useStormBoardStore((s) => s.deleteElement);
  const patchElements = useStormBoardStore((s) => s.patchElements);
  const updateRelation = useStormBoardStore((s) => s.updateRelation);
  const deleteRelation = useStormBoardStore((s) => s.deleteRelation);
  const updateBoundedContext = useStormBoardStore((s) => s.updateBoundedContext);
  const deleteBoundedContext = useStormBoardStore((s) => s.deleteBoundedContext);
  const updateSwimlane = useStormBoardStore((s) => s.updateSwimlane);
  const deleteSwimlane = useStormBoardStore((s) => s.deleteSwimlane);
  const connectElements = useStormBoardStore((s) => s.connectElements);
  const clearSelection = useStormBoardStore((s) => s.clearSelection);
  const boundedContexts = useStormBoardStore((s) => s.boundedContexts);
  const swimlanes = useStormBoardStore((s) => s.swimlanes);

  const selectedElement = elements.find((e) => e.id === selectedElementIds[0]);
  const selectedRelation = relations.find((r) => r.id === selectedRelationId);
  const selectedBoundedContext = boundedContexts.find((bc) => bc.id === selectedBoundedContextId);
  const selectedSwimlane = swimlanes.find((lane) => lane.id === selectedSwimlaneId);

  const multiSelected = selectedElementIds.length >= 2
    ? elements.filter((e) => selectedElementIds.includes(e.id))
    : [];

  const issues = useMemo(
    () => validateBoard(elements, relations).filter((i) => i.elementId === selectedElement?.id),
    [elements, relations, selectedElement?.id],
  );

  const applyAlign = (mode: AlignMode) => {
    const patches = computeAlignPatches(multiSelected, mode, selectedElementIds[0]);
    if (patches.length > 0) patchElements(patches);
  };

  if (selectedRelation) {
    return (
      <aside className="flex w-72 shrink-0 flex-col border-l border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Relation</h2>
          <button
            type="button"
            onClick={() => onRequestHelpRelationType?.(selectedRelation.type)}
            className="rounded-lg border border-slate-200 bg-white/80 p-1.5 text-slate-600 hover:bg-white"
            title="Hilfe zur Relation"
            aria-label="Hilfe zur Relation"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
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

  if (multiSelected.length >= 2) {
    return (
      <aside className="flex w-72 shrink-0 flex-col border-l border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">
            {multiSelected.length} Elemente
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">Ausrichten und Größe angleichen</p>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <div>
            <p className="mb-2 text-xs font-medium text-slate-600">Ausrichten</p>
            <div className="grid grid-cols-3 gap-1.5">
              {ALIGN_ACTIONS.filter((a) =>
                ["left", "centerX", "right", "top", "centerY", "bottom"].includes(a.mode),
              ).map(({ mode, label, icon: Icon }) => (
                <button
                  key={mode}
                  type="button"
                  title={label}
                  aria-label={label}
                  onClick={() => applyAlign(mode)}
                  className="flex items-center justify-center rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-50"
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-slate-600">Verteilen</p>
            <div className="grid grid-cols-2 gap-1.5">
              {ALIGN_ACTIONS.filter((a) => a.mode === "distributeX" || a.mode === "distributeY").map(
                ({ mode, label, icon: Icon, minCount = 2 }) => (
                  <button
                    key={mode}
                    type="button"
                    title={label}
                    aria-label={label}
                    disabled={multiSelected.length < minCount}
                    onClick={() => applyAlign(mode)}
                    className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-2 py-2 text-xs text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Icon className="h-4 w-4" />
                    {mode === "distributeX" ? "Horizontal" : "Vertikal"}
                  </button>
                ),
              )}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-slate-600">
              Größe angleichen
              <span className="mt-0.5 block font-normal text-slate-400">
                Bezug: erstes ausgewähltes Element
              </span>
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {ALIGN_ACTIONS.filter((a) => a.mode === "sameWidth" || a.mode === "sameHeight").map(
                ({ mode, label, icon: Icon }) => (
                  <button
                    key={mode}
                    type="button"
                    title={label}
                    aria-label={label}
                    onClick={() => applyAlign(mode)}
                    className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-2 py-2 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    <Icon className="h-4 w-4" />
                    {mode === "sameWidth" ? "Breite" : "Höhe"}
                  </button>
                ),
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              for (const id of [...selectedElementIds]) deleteElement(id);
              clearSelection();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" /> Alle löschen
          </button>
        </div>
      </aside>
    );
  }

  if (!selectedElement) {
    if (selectedSwimlane) {
      return (
        <aside className="flex w-72 shrink-0 flex-col border-l border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Swimlane</h2>
          </div>
          <div className="space-y-3 p-4">
            <label className="block text-xs font-medium text-slate-600">
              Label
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                value={selectedSwimlane.label}
                onChange={(e) => updateSwimlane(selectedSwimlane.id, { label: e.target.value })}
              />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              Y-Position
              <input
                type="number"
                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                value={Math.round(selectedSwimlane.y)}
                onChange={(e) =>
                  updateSwimlane(selectedSwimlane.id, { y: Number(e.target.value) || 0 })
                }
              />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              Höhe
              <input
                type="number"
                min={40}
                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                value={Math.round(selectedSwimlane.height)}
                onChange={(e) =>
                  updateSwimlane(selectedSwimlane.id, {
                    height: Math.max(40, Number(e.target.value) || 40),
                  })
                }
              />
            </label>
            <button
              type="button"
              onClick={() => deleteSwimlane(selectedSwimlane.id)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" /> Swimlane löschen
            </button>
          </div>
        </aside>
      );
    }

    if (selectedBoundedContext) {
      return (
        <aside className="flex w-72 shrink-0 flex-col border-l border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Bounded Context</h2>
          </div>
          <div className="space-y-3 p-4">
            <label className="block text-xs font-medium text-slate-600">
              Label
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                value={selectedBoundedContext.label}
                onChange={(e) =>
                  updateBoundedContext(selectedBoundedContext.id, { label: e.target.value })
                }
              />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              Zweck
              <textarea
                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                rows={2}
                value={selectedBoundedContext.purpose ?? ""}
                onChange={(e) =>
                  updateBoundedContext(selectedBoundedContext.id, { purpose: e.target.value })
                }
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs font-medium text-slate-600">
                X
                <input
                  type="number"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  value={Math.round(selectedBoundedContext.x)}
                  onChange={(e) =>
                    updateBoundedContext(selectedBoundedContext.id, {
                      x: Number(e.target.value) || 0,
                    })
                  }
                />
              </label>
              <label className="block text-xs font-medium text-slate-600">
                Y
                <input
                  type="number"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  value={Math.round(selectedBoundedContext.y)}
                  onChange={(e) =>
                    updateBoundedContext(selectedBoundedContext.id, {
                      y: Number(e.target.value) || 0,
                    })
                  }
                />
              </label>
              <label className="block text-xs font-medium text-slate-600">
                Breite
                <input
                  type="number"
                  min={80}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  value={Math.round(selectedBoundedContext.width)}
                  onChange={(e) =>
                    updateBoundedContext(selectedBoundedContext.id, {
                      width: Math.max(80, Number(e.target.value) || 80),
                    })
                  }
                />
              </label>
              <label className="block text-xs font-medium text-slate-600">
                Höhe
                <input
                  type="number"
                  min={80}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  value={Math.round(selectedBoundedContext.height)}
                  onChange={(e) =>
                    updateBoundedContext(selectedBoundedContext.id, {
                      height: Math.max(80, Number(e.target.value) || 80),
                    })
                  }
                />
              </label>
            </div>
            <label className="block text-xs font-medium text-slate-600">
              Farbe
              <input
                type="color"
                className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-1 py-1"
                value={selectedBoundedContext.color ?? "#dbeafe"}
                onChange={(e) =>
                  updateBoundedContext(selectedBoundedContext.id, { color: e.target.value })
                }
              />
            </label>
            <button
              type="button"
              onClick={() => deleteBoundedContext(selectedBoundedContext.id)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" /> Bounded Context löschen
            </button>
          </div>
        </aside>
      );
    }

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
  const width = selectedElement.width ?? style.defaultWidth;
  const height = selectedElement.height ?? style.defaultHeight;

  return (
    <aside className="flex w-72 shrink-0 flex-col border-l border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">{style.label}</h2>
        <button
          type="button"
          onClick={() => onRequestHelpElementType?.(selectedElement.type)}
          className="rounded-lg border border-slate-200 bg-white/80 p-1.5 text-slate-600 hover:bg-white"
          title="Hilfe zu diesem Element"
          aria-label="Hilfe zu diesem Element"
        >
          <HelpCircle className="h-4 w-4" />
        </button>
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

        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs font-medium text-slate-600">
            X
            <input
              type="number"
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              value={Math.round(selectedElement.x)}
              onChange={(e) =>
                updateElement(selectedElement.id, { x: Number(e.target.value) || 0 })
              }
            />
          </label>
          <label className="block text-xs font-medium text-slate-600">
            Y
            <input
              type="number"
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              value={Math.round(selectedElement.y)}
              onChange={(e) =>
                updateElement(selectedElement.id, { y: Number(e.target.value) || 0 })
              }
            />
          </label>
          <label className="block text-xs font-medium text-slate-600">
            Breite
            <input
              type="number"
              min={MIN_ELEMENT_SIZE}
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              value={Math.round(width)}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  width: Math.max(MIN_ELEMENT_SIZE, Number(e.target.value) || MIN_ELEMENT_SIZE),
                })
              }
            />
          </label>
          <label className="block text-xs font-medium text-slate-600">
            Höhe
            <input
              type="number"
              min={MIN_ELEMENT_SIZE}
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              value={Math.round(height)}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  height: Math.max(MIN_ELEMENT_SIZE, Number(e.target.value) || MIN_ELEMENT_SIZE),
                })
              }
            />
          </label>
        </div>

        {elements.length > 1 && (
          <label className="block text-xs font-medium text-slate-600">
            Relation zu …
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              defaultValue=""
              onChange={(e) => {
                const targetId = e.target.value;
                if (!targetId) return;
                connectElements(selectedElement.id, targetId);
                e.target.value = "";
              }}
            >
              <option value="">Ziel-Element wählen …</option>
              {elements
                .filter((el) => el.id !== selectedElement.id)
                .map((el) => (
                  <option key={el.id} value={el.id}>
                    {ELEMENT_STYLES[el.type].shortLabel}: {el.label}
                  </option>
                ))}
            </select>
          </label>
        )}

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
