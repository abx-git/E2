"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertCircle, ChevronDown, ExternalLink, HelpCircle, Pencil, Trash2 } from "lucide-react";

import { activateBoardLink } from "@/lib/board-link";
import { normalizeCardWebLinks } from "@/lib/card-web-links";
import { BoundedContextDetailPanel } from "@/components/bounded-context-detail-panel";
import { RegionAppearanceControls } from "@/components/region-appearance-controls";
import { connectorArrowHeadGlyph } from "@/lib/connector-arrow-head";
import { resolveElementStyle } from "@/lib/element-styles";
import {
  cardShowsDetails,
  isOnCardFieldEnabled,
  onCardDisplayFieldsForType,
  type OnCardDisplayKey,
} from "@/lib/card-preview";
import { isTypingTarget } from "@/lib/keyboard-input-guard";
import { normalizeRotationDegrees } from "@/lib/element-rotation";
import { NOTE_COLOR_IDS, NOTE_COLORS } from "@/lib/note-colors";
import { resolveNoteCompactLayout } from "@/lib/note-compact";
import { connectorToCanvasLine } from "@/lib/board-connector-migrate";
import { resolveBoardConnectorStrokeStyle } from "@/lib/board-connector-style";
import { defaultRelationType, validateBoard } from "@/lib/relation-validation";
import { JsonValueEditor } from "@/components/json-value-editor";
import { DescriptionMarkdownContent } from "@/components/description-markdown-content";
import { HotspotMeasuresActions } from "@/components/hotspot-measures-actions";
import { DescriptionEditorDialog } from "@/components/description-editor-dialog";
import {
  CONNECTOR_STROKE_STYLES,
  isConnectorStrokeStyle,
  resolveRelationStrokeStyle,
  type ConnectorStrokeStyle,
} from "@/lib/connector-style";
import { RELATION_TYPES, type RelationType } from "@/types/storm-relation";
import type {
  CardWebLink,
  DataCardinality,
  ElementType,
  GatewayKind,
  LinkKind,
  NoteColorId,
  QuestionStatus,
  StoryPriority,
  SubdomainKind,
} from "@/types/storm-element";
import { isCloudElementType, supportsArchDrilldown } from "@/types/storm-element";
import { CONNECTOR_ARROW_HEADS } from "@/types/canvas-annotation";
import { useStormBoardStore } from "@/store/storm-board-store";
import {
  connectorStrokeStyleLabel,
  elementTypeLabel,
  lineArrowHeadLabel,
  relationTypeLabel,
  useT,
} from "@/i18n";
import type { MessageKey } from "@/i18n/types";
import type { TranslateFn } from "@/i18n/translate";

const MIN_ELEMENT_SIZE = 40;

const DATA_CARDINALITY_KEY: Record<DataCardinality, MessageKey> = {
  "1:1": "detailSidebar.enums.dataCardinality.oneOne",
  "1:n": "detailSidebar.enums.dataCardinality.oneMany",
  "n:1": "detailSidebar.enums.dataCardinality.manyOne",
  "n:m": "detailSidebar.enums.dataCardinality.manyMany",
};

function dataCardinalityLabel(t: TranslateFn, value: DataCardinality): string {
  return t(DATA_CARDINALITY_KEY[value]);
}

function noteColorLabel(t: TranslateFn, id: NoteColorId): string {
  return t(`detailSidebar.noteColors.${id}` as MessageKey);
}

function onCardFieldLabel(t: TranslateFn, key: OnCardDisplayKey): string {
  return t(`detailSidebar.onCard.fields.${key}` as MessageKey);
}

function linesFromMeta(values: string[] | undefined): string {
  return (values ?? []).join("\n");
}

/** Compact line list for storage / card preview (no blank lines). */
function linesToMeta(text: string): string[] {
  return text.split("\n").map((l) => l.trim()).filter(Boolean);
}

/**
 * Controlled line editor that keeps blank lines while focused so Enter at
 * end-of-text works. Empty lines are stripped only when committing to meta.
 */
function LinesTextarea({
  values,
  onChange,
  resetKey,
  placeholder,
  rows = 3,
  className = "dock-field min-h-[4rem]",
}: {
  values: string[] | undefined;
  onChange: (lines: string[]) => void;
  resetKey: string;
  placeholder?: string;
  rows?: number;
  className?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  useEffect(() => {
    setDraft(null);
  }, [resetKey]);

  return (
    <textarea
      className={className}
      rows={rows}
      value={draft ?? linesFromMeta(values)}
      placeholder={placeholder}
      onFocus={() => setDraft(linesFromMeta(values))}
      onChange={(e) => {
        const text = e.target.value;
        setDraft(text);
        onChange(linesToMeta(text));
      }}
      onBlur={() => {
        if (draft !== null) onChange(linesToMeta(draft));
        setDraft(null);
      }}
    />
  );
}

function WebLinksEditor({
  links,
  onChange,
  t,
}: {
  links: CardWebLink[] | undefined;
  onChange: (links: CardWebLink[]) => void;
  t: TranslateFn;
}) {
  const rows = links && links.length > 0 ? links : [{ url: "" }];
  const commit = (next: CardWebLink[]) => onChange(normalizeCardWebLinks(next));

  const patchRow = (index: number, patch: Partial<CardWebLink>) => {
    const next = rows.map((row, i) => (i === index ? { ...row, ...patch } : row));
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {rows.map((link, index) => (
        <div key={index} className="flex items-start gap-1">
          <div className="min-w-0 flex-1 space-y-1">
            <input
              className="dock-field"
              type="url"
              placeholder={t("detailSidebar.webLinks.urlPlaceholder")}
              value={link.url}
              onChange={(e) => patchRow(index, { url: e.target.value })}
              onBlur={() => commit(rows)}
            />
            <input
              className="dock-field"
              placeholder={t("detailSidebar.webLinks.titlePlaceholder")}
              value={link.title ?? ""}
              onChange={(e) => patchRow(index, { title: e.target.value })}
              onBlur={() => commit(rows)}
            />
          </div>
          <button
            type="button"
            className="mt-1 rounded-md p-1 text-[var(--muted)] hover:bg-[var(--control)] hover:text-[var(--text)]"
            aria-label={t("detailSidebar.aria.removeLink")}
            onClick={() => commit(rows.filter((_, i) => i !== index))}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="w-full rounded-md border border-dashed border-[var(--border)] px-2 py-1 text-[0.72rem] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--text)]"
        onClick={() => onChange([...rows, { url: "" }])}
      >
        {t("detailSidebar.webLinks.addLink")}
      </button>
    </div>
  );
}

export interface ElementDetailSidebarProps {
  onRequestHelpElementType?: (type: ElementType) => void;
  onRequestHelpRelationType?: (type: RelationType) => void;
}

/** Inspector for continuous editing. Discrete actions live in the context menu. */
export function ElementDetailSidebar({
  onRequestHelpElementType,
  onRequestHelpRelationType,
}: ElementDetailSidebarProps) {
  const t = useT();
  const elements = useStormBoardStore((s) => s.elements);
  const relations = useStormBoardStore((s) => s.relations);
  const canvasLines = useStormBoardStore((s) => s.canvasLines);
  const connectors = useStormBoardStore((s) => s.connectors);
  const selectedElementIds = useStormBoardStore((s) => s.selectedElementIds);
  const selectedRelationId = useStormBoardStore((s) => s.selectedRelationId);
  const selectedConnectorId = useStormBoardStore((s) => s.selectedConnectorId);
  const selectedCanvasLineId = useStormBoardStore((s) => s.selectedCanvasLineId);
  const selectedBoundedContextId = useStormBoardStore((s) => s.selectedBoundedContextIds[0] ?? null);
  const selectedSwimlaneId = useStormBoardStore((s) => s.selectedSwimlaneIds[0] ?? null);
  const updateElement = useStormBoardStore((s) => s.updateElement);
  const updateCustomCardType = useStormBoardStore((s) => s.updateCustomCardType);
  const customCardTypes = useStormBoardStore((s) => s.customCardTypes);
  const updateRelation = useStormBoardStore((s) => s.updateRelation);
  const deleteRelation = useStormBoardStore((s) => s.deleteRelation);
  const updateCanvasLine = useStormBoardStore((s) => s.updateCanvasLine);
  const deleteCanvasLine = useStormBoardStore((s) => s.deleteCanvasLine);
  const updateConnector = useStormBoardStore((s) => s.updateConnector);
  const deleteConnector = useStormBoardStore((s) => s.deleteConnector);
  const updateSwimlane = useStormBoardStore((s) => s.updateSwimlane);
  const openBuildingBlockView = useStormBoardStore((s) => s.openBuildingBlockView);
  const navigateBuildingBlockViewLink = useStormBoardStore((s) => s.navigateBuildingBlockViewLink);
  const followElementLinkedView = useStormBoardStore((s) => s.followElementLinkedView);
  const boundedContexts = useStormBoardStore((s) => s.boundedContexts);
  const swimlanes = useStormBoardStore((s) => s.swimlanes);
  const views = useStormBoardStore((s) => s.views);
  const activeViewId = useStormBoardStore((s) => s.activeViewId);
  const notesCompact = useStormBoardStore((s) => s.notesCompact);
  const setNoteCompactOverride = useStormBoardStore((s) => s.setNoteCompactOverride);

  const contextRelations = useStormBoardStore((s) => s.contextRelations);
  const selectedElement = elements.find((e) => e.id === selectedElementIds[0]);
  const selectedRelation = relations.find((r) => r.id === selectedRelationId);
  const selectedConnector = connectors.find((c) => c.id === selectedConnectorId);
  const selectedCanvasLine = canvasLines.find((line) => line.id === selectedCanvasLineId);
  const selectedBoundedContext = boundedContexts.find((bc) => bc.id === selectedBoundedContextId);
  const selectedSwimlane = swimlanes.find((lane) => lane.id === selectedSwimlaneId);
  const multiCount = selectedElementIds.length;
  const [descriptionEditorOpen, setDescriptionEditorOpen] = useState(false);
  const selectedElementId = selectedElement?.id ?? null;

  useEffect(() => {
    setDescriptionEditorOpen(false);
  }, [selectedElementId]);

  const issues = useMemo(
    () =>
      validateBoard(elements, relations, contextRelations).filter(
        (i) => i.elementId === selectedElement?.id,
      ),
    [elements, relations, contextRelations, selectedElement?.id],
  );

  if (selectedConnector && connectorToCanvasLine(selectedConnector)) {
    const c = selectedConnector;
    const arrowHead = c.arrowHead ?? "end";
    const strokeStyle = resolveBoardConnectorStrokeStyle(c);
    let srcEl: (typeof elements)[number] | undefined;
    let tgtEl: (typeof elements)[number] | undefined;
    if (c.source.attach === "element") {
      const sourceId = c.source.id;
      srcEl = elements.find((e) => e.id === sourceId);
    }
    if (c.target.attach === "element") {
      const targetId = c.target.id;
      tgtEl = elements.find((e) => e.id === targetId);
    }
    const elementLink = Boolean(srcEl && tgtEl);
    const relationType =
      c.relationType ?? (srcEl && tgtEl ? defaultRelationType(srcEl, tgtEl) : undefined);
    return (
      <DockPanel title={t("detailSidebar.titles.connector")} t={t}>
        {relationType && (
          <Field label={t("detailSidebar.fields.kind")}>
            <select
              className="dock-field"
              value={relationType}
              onChange={(e) =>
                updateConnector(c.id, {
                  relationType: e.target.value as RelationType,
                })
              }
            >
              {RELATION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {relationTypeLabel(t, type)}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label={t("detailSidebar.fields.caption")}>
          <input
            className="dock-field"
            value={c.label ?? ""}
            onChange={(e) =>
              updateConnector(c.id, { label: e.target.value, labelMode: "custom" })
            }
            placeholder={t("detailSidebar.optional")}
          />
        </Field>
        <Field label={t("detailSidebar.fields.line")}>
          <StrokeStyleButtons
            value={strokeStyle}
            t={t}
            onChange={(next) => updateConnector(c.id, { strokeStyle: next })}
          />
        </Field>
        <Field label={t("detailSidebar.fields.arrow")}>
          <div className="flex gap-1" role="group" aria-label={t("detailSidebar.aria.arrowDirection")}>
            {CONNECTOR_ARROW_HEADS.map((head) => (
              <button
                key={head}
                type="button"
                title={lineArrowHeadLabel(t, head)}
                aria-label={lineArrowHeadLabel(t, head)}
                aria-pressed={arrowHead === head}
                className={[
                  "flex h-8 flex-1 items-center justify-center rounded-md text-sm font-medium transition",
                  arrowHead === head
                    ? "dock-control-active"
                    : "dock-control hover:bg-[var(--control-hover)]",
                ].join(" ")}
                onClick={() => updateConnector(c.id, { arrowHead: head })}
              >
                {connectorArrowHeadGlyph(head)}
              </button>
            ))}
          </div>
        </Field>
        <Field label={t("detailSidebar.fields.color")}>
          <input
            className="dock-field h-9 cursor-pointer p-1"
            type="color"
            value={c.color ?? "#64748b"}
            onChange={(e) => updateConnector(c.id, { color: e.target.value })}
          />
        </Field>
        <button
          type="button"
          className="flex w-full items-center justify-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--control)] px-2 py-1.5 text-xs font-medium text-[#f0a8a0] hover:border-[#f0a8a0]"
          onClick={() => deleteConnector(c.id)}
        >
          <Trash2 className="size-3.5" aria-hidden />
          {t("detailSidebar.delete")}
        </button>
      </DockPanel>
    );
  }

  if (selectedRelation) {
    const strokeStyle = resolveRelationStrokeStyle(selectedRelation);
    const typeCaption = relationTypeLabel(t, selectedRelation.type);
    const labelMode = selectedRelation.labelMode;
    const typeLabelSelected = labelMode === "type";
    const customLabelSelected = labelMode !== "type";
    return (
      <DockPanel
        title={t("detailSidebar.titles.relation")}
        t={t}
        onHelp={() => onRequestHelpRelationType?.(selectedRelation.type)}
      >
        <Field label={t("detailSidebar.fields.kind")}>
          <select
            className="dock-field"
            value={selectedRelation.type}
            onChange={(e) =>
              updateRelation(selectedRelation.id, { type: e.target.value as RelationType })
            }
          >
            {RELATION_TYPES.map((type) => (
              <option key={type} value={type}>
                {relationTypeLabel(t, type)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("detailSidebar.fields.line")}>
          <StrokeStyleButtons
            value={strokeStyle}
            t={t}
            onChange={(next) => updateRelation(selectedRelation.id, { strokeStyle: next })}
          />
        </Field>
        <Field label={t("detailSidebar.fields.arrow")}>
          <div className="flex gap-1" role="group" aria-label={t("detailSidebar.aria.arrowDirection")}>
            {CONNECTOR_ARROW_HEADS.map((head) => {
              const conn = connectors.find((x) => x.id === selectedRelation.id);
              const active = (conn?.arrowHead ?? "end") === head;
              return (
                <button
                  key={head}
                  type="button"
                  title={lineArrowHeadLabel(t, head)}
                  aria-label={lineArrowHeadLabel(t, head)}
                  aria-pressed={active}
                  className={[
                    "flex h-8 flex-1 items-center justify-center rounded-md text-sm font-medium transition",
                    active
                      ? "dock-control-active"
                      : "dock-control hover:bg-[var(--control-hover)]",
                  ].join(" ")}
                  onClick={() => updateConnector(selectedRelation.id, { arrowHead: head })}
                >
                  {connectorArrowHeadGlyph(head)}
                </button>
              );
            })}
          </div>
        </Field>
        <Field label={t("detailSidebar.fields.caption")}>
          <div className="flex gap-1" role="group" aria-label={t("detailSidebar.aria.captionMode")}>
            <button
              type="button"
              aria-pressed={typeLabelSelected}
              className={[
                "flex h-8 flex-1 items-center justify-center rounded-md px-2 text-[0.72rem] font-medium transition",
                typeLabelSelected
                  ? "dock-control-active"
                  : "dock-control hover:bg-[var(--control-hover)]",
              ].join(" ")}
              onClick={() => updateRelation(selectedRelation.id, { labelMode: "type" })}
            >
              {t("detailSidebar.captionMode.kind")}
            </button>
            <button
              type="button"
              aria-pressed={customLabelSelected}
              className={[
                "flex h-8 flex-1 items-center justify-center rounded-md px-2 text-[0.72rem] font-medium transition",
                customLabelSelected
                  ? "dock-control-active"
                  : "dock-control hover:bg-[var(--control-hover)]",
              ].join(" ")}
              onClick={() => updateRelation(selectedRelation.id, { labelMode: "custom" })}
            >
              {t("detailSidebar.captionMode.freeText")}
            </button>
          </div>
        </Field>
        {typeLabelSelected ? (
          <p className="text-[0.72rem] text-[var(--muted)]">
            {t("detailSidebar.relationLabelOnConnector", { type: typeCaption })}
          </p>
        ) : (
          <Field label={t("detailSidebar.fields.text")}>
            <input
              className="dock-field"
              value={selectedRelation.label ?? ""}
              onChange={(e) =>
                updateRelation(selectedRelation.id, {
                  label: e.target.value,
                  labelMode: "custom",
                })
              }
              placeholder={t("detailSidebar.optional")}
            />
          </Field>
        )}
        <button
          type="button"
          className="flex w-full items-center justify-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--control)] px-2 py-1.5 text-xs font-medium text-[#f0a8a0] hover:border-[#f0a8a0]"
          onClick={() => deleteRelation(selectedRelation.id)}
        >
          <Trash2 className="size-3.5" aria-hidden />
          {t("detailSidebar.delete")}
        </button>
      </DockPanel>
    );
  }

  if (multiCount >= 2) {
    return (
      <DockPanel title={t("detailSidebar.titles.multiElements", { count: multiCount })} t={t}>
        <p className="text-[0.82rem] text-[var(--muted)]">{t("detailSidebar.multiSelectHint")}</p>
      </DockPanel>
    );
  }

  if (!selectedElement) {
    if (selectedSwimlane) {
      return (
        <DockPanel title={t("detailSidebar.titles.swimlane")} t={t}>
          <Field label={t("detailSidebar.fields.label")}>
            <input
              className="dock-field"
              value={selectedSwimlane.label}
              onChange={(e) => updateSwimlane(selectedSwimlane.id, { label: e.target.value })}
            />
          </Field>
          <RegionAppearanceControls
            kind="swimlane"
            region={selectedSwimlane}
            onChange={(patch) => updateSwimlane(selectedSwimlane.id, patch)}
          />
          <CollapsibleSection title={t("detailSidebar.positionSize.sectionTitle")} defaultOpen={false}>
            {selectedSwimlane.locked && (
              <p className="mb-2 text-[0.65rem] text-[var(--muted)]">
                {t("detailSidebar.positionSize.lockedHint")}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label={t("detailSidebar.positionSize.x")}
                value={selectedSwimlane.x ?? 0}
                disabled={selectedSwimlane.locked}
                onChange={(v) => updateSwimlane(selectedSwimlane.id, { x: v })}
              />
              <NumberField
                label={t("detailSidebar.positionSize.y")}
                value={selectedSwimlane.y}
                disabled={selectedSwimlane.locked}
                onChange={(v) => updateSwimlane(selectedSwimlane.id, { y: v })}
              />
              <NumberField
                label={t("detailSidebar.positionSize.width")}
                value={selectedSwimlane.width ?? 4000}
                min={80}
                disabled={selectedSwimlane.locked}
                onChange={(v) => updateSwimlane(selectedSwimlane.id, { width: Math.max(80, v) })}
              />
              <NumberField
                label={t("detailSidebar.positionSize.height")}
                value={selectedSwimlane.height}
                min={80}
                disabled={selectedSwimlane.locked}
                onChange={(v) => updateSwimlane(selectedSwimlane.id, { height: Math.max(80, v) })}
              />
              <NumberField
                label={t("detailSidebar.positionSize.zIndex")}
                value={selectedSwimlane.zIndex ?? 0}
                onChange={(v) => updateSwimlane(selectedSwimlane.id, { zIndex: v })}
              />
            </div>
          </CollapsibleSection>
        </DockPanel>
      );
    }

    if (selectedBoundedContext) {
      return (
        <DockPanel title={t("detailSidebar.titles.boundedContext")} t={t}>
          <BoundedContextDetailPanel boundedContext={selectedBoundedContext} />
        </DockPanel>
      );
    }

    return null;
  }

  const style = resolveElementStyle(selectedElement, customCardTypes);
  const width = selectedElement.width ?? style.defaultWidth;
  const height = selectedElement.height ?? style.defaultHeight;
  const cardFlagsActive = cardShowsDetails(selectedElement);
  const panelTitle =
    selectedElement.type === "customCard"
      ? style.label
      : elementTypeLabel(t, selectedElement.type);

  return (
    <DockPanel
      title={panelTitle}
      t={t}
      onHelp={() => onRequestHelpElementType?.(selectedElement.type)}
    >
      <Field label={t("detailSidebar.fields.label")}>
        <input
          className="dock-field"
          value={selectedElement.label}
          onChange={(e) => updateElement(selectedElement.id, { label: e.target.value })}
        />
      </Field>
      <div className="space-y-1">
        <p className="text-[0.72rem] font-medium text-[var(--muted)]">
          {t("detailSidebar.fields.description")}
        </p>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--control)] px-2.5 py-2 text-xs text-[var(--text)]">
          {selectedElement.description?.trim() ? (
            <DescriptionMarkdownContent markdown={selectedElement.description} compact />
          ) : (
            <p className="italic text-[var(--muted)]">{t("detailSidebar.description.none")}</p>
          )}
        </div>
        <button
          type="button"
          className="dock-control flex w-full items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium"
          onClick={() => setDescriptionEditorOpen(true)}
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden />
          {t("detailSidebar.description.openWysiwyg")}
        </button>
        <DescriptionEditorDialog
          open={descriptionEditorOpen}
          elementId={selectedElement.id}
          elementLabel={selectedElement.label}
          markdown={selectedElement.description ?? ""}
          onClose={() => setDescriptionEditorOpen(false)}
          onSave={(md) => updateElement(selectedElement.id, { description: md })}
        />
      </div>

      {selectedElement.type === "hotspot" ? (
        <HotspotMeasuresActions element={selectedElement} />
      ) : null}

      <CollapsibleSection
        title={t("detailSidebar.onCard.sectionTitle")}
        defaultOpen={cardFlagsActive || selectedElement.type === "note"}
        hint={cardFlagsActive ? t("detailSidebar.active") : undefined}
      >
        <div className="flex flex-col gap-1.5 text-xs text-[var(--text)]">
          {onCardDisplayFieldsForType(selectedElement.type).map(({ key }) => (
            <label key={key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isOnCardFieldEnabled(selectedElement, key)}
                onChange={(e) =>
                  updateElement(selectedElement.id, {
                    metadata: {
                      ...selectedElement.metadata,
                      [key]: e.target.checked,
                    },
                  })
                }
              />
              {onCardFieldLabel(t, key)}
            </label>
          ))}
        </div>
        {selectedElement.type === "note" && (
          <div className="mt-2">
            <p className="mb-1.5 text-[0.65rem] font-medium text-[var(--muted)]">
              {t("detailSidebar.onCard.background")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {NOTE_COLOR_IDS.map((id) => {
                const c = NOTE_COLORS[id];
                const colorLabel = noteColorLabel(t, id);
                const active = (selectedElement.metadata?.noteColor ?? "cream") === id;
                return (
                  <button
                    key={id}
                    type="button"
                    title={colorLabel}
                    aria-label={colorLabel}
                    aria-pressed={active}
                    className={[
                      "h-7 w-7 rounded-md border-2 shadow-sm transition-transform",
                      active ? "scale-110 border-[var(--accent)]" : "border-transparent hover:scale-105",
                    ].join(" ")}
                    style={{ backgroundColor: c.fill, boxShadow: `inset 0 0 0 1px ${c.stroke}` }}
                    onClick={() =>
                      updateElement(selectedElement.id, {
                        metadata: {
                          ...selectedElement.metadata,
                          noteColor: id as NoteColorId,
                        },
                      })
                    }
                  />
                );
              })}
            </div>
            <div className="mt-3">
              <p className="mb-1.5 text-[0.65rem] font-medium text-[var(--muted)]">
                {t("detailSidebar.onCard.noteDisplay")}
              </p>
              <div className="flex flex-col gap-1">
                {(
                  [
                    {
                      key: "compact",
                      label: t("detailSidebar.onCard.noteCompact"),
                      active: resolveNoteCompactLayout(selectedElement, notesCompact) === true,
                      value: true,
                    },
                    {
                      key: "full",
                      label: t("detailSidebar.onCard.noteExpanded"),
                      active: resolveNoteCompactLayout(selectedElement, notesCompact) === false,
                      value: false,
                    },
                    {
                      key: "default",
                      label: t("detailSidebar.onCard.noteCompactViewDefault"),
                      active: selectedElement.metadata?.noteCompact === undefined,
                      value: undefined,
                    },
                  ] as Array<{
                    key: string;
                    label: string;
                    active: boolean;
                    value: boolean | undefined;
                  }>
                ).map((opt) => (
                  <label
                    key={opt.key}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-xs hover:bg-[var(--control-hover)]"
                  >
                    <input
                      type="radio"
                      name="note-display"
                      className="accent-[var(--accent)]"
                      checked={opt.active}
                      onChange={() =>
                        setNoteCompactOverride(selectedElement.id, opt.value)
                      }
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
        {selectedElement.type === "customCard" && (
          <div className="mt-2 space-y-2">
            <label className="flex flex-col gap-1 text-xs text-[var(--text)]">
              <span className="text-[0.65rem] font-medium text-[var(--muted)]">
                {t("detailSidebar.onCard.cardType")}
              </span>
              <select
                className="dock-field"
                value={selectedElement.metadata?.customTypeId ?? ""}
                onChange={(e) => {
                  const customTypeId = e.target.value || undefined;
                  updateElement(selectedElement.id, {
                    metadata: { ...selectedElement.metadata, customTypeId },
                  });
                }}
              >
                <option value="">{t("detailSidebar.noCardType")}</option>
                {customCardTypes.map((ct) => (
                  <option key={ct.id} value={ct.id}>
                    {ct.name}
                  </option>
                ))}
              </select>
            </label>
            {(() => {
              const typeId = selectedElement.metadata?.customTypeId;
              const def = customCardTypes.find((ct) => ct.id === typeId);
              if (!def) return null;
              return (
                <div>
                  <p className="mb-1.5 text-[0.65rem] font-medium text-[var(--muted)]">
                    {t("detailSidebar.onCard.typeColorAll", { name: def.name })}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {NOTE_COLOR_IDS.map((id) => {
                      const c = NOTE_COLORS[id];
                      const colorLabel = noteColorLabel(t, id);
                      const active = def.fill === c.fill;
                      return (
                        <button
                          key={id}
                          type="button"
                          title={colorLabel}
                          aria-label={colorLabel}
                          aria-pressed={active}
                          className={[
                            "h-7 w-7 rounded-md border-2 shadow-sm transition-transform",
                            active
                              ? "scale-110 border-[var(--accent)]"
                              : "border-transparent hover:scale-105",
                          ].join(" ")}
                          style={{
                            backgroundColor: c.fill,
                            boxShadow: `inset 0 0 0 1px ${c.stroke}`,
                          }}
                          onClick={() =>
                            updateCustomCardType(def.id, {
                              fill: c.fill,
                              stroke: c.stroke,
                              ink: c.ink,
                            })
                          }
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title={t("detailSidebar.webLinks.sectionTitle")}
        defaultOpen={Boolean(selectedElement.metadata?.webLinks?.length)}
        hint={
          selectedElement.metadata?.webLinks?.length
            ? String(selectedElement.metadata.webLinks.length)
            : undefined
        }
      >
        <WebLinksEditor
          t={t}
          links={selectedElement.metadata?.webLinks}
          onChange={(webLinks) =>
            updateElement(selectedElement.id, {
              metadata: {
                ...selectedElement.metadata,
                webLinks: webLinks.length ? webLinks : undefined,
              },
            })
          }
        />
      </CollapsibleSection>

      <CollapsibleSection title={t("detailSidebar.positionSize.sectionTitle")} defaultOpen={false}>
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label={t("detailSidebar.positionSize.x")}
            value={selectedElement.x}
            onChange={(v) => updateElement(selectedElement.id, { x: v })}
          />
          <NumberField
            label={t("detailSidebar.positionSize.y")}
            value={selectedElement.y}
            onChange={(v) => updateElement(selectedElement.id, { y: v })}
          />
          <NumberField
            label={t("detailSidebar.positionSize.width")}
            value={width}
            min={MIN_ELEMENT_SIZE}
            onChange={(v) =>
              updateElement(selectedElement.id, {
                width: Math.max(MIN_ELEMENT_SIZE, v),
              })
            }
          />
          <NumberField
            label={t("detailSidebar.positionSize.height")}
            value={height}
            min={MIN_ELEMENT_SIZE}
            onChange={(v) =>
              updateElement(selectedElement.id, {
                height: Math.max(MIN_ELEMENT_SIZE, v),
              })
            }
          />
          <NumberField
            label={t("detailSidebar.positionSize.rotation")}
            value={selectedElement.rotation ?? style.rotation ?? 0}
            onChange={(v) =>
              updateElement(selectedElement.id, {
                rotation: normalizeRotationDegrees(v),
              })
            }
          />
        </div>
      </CollapsibleSection>

      {(selectedElement.type === "domainEvent" || selectedElement.type === "aggregate") && (
        <Field label={t("detailSidebar.fields.eventSchema")}>
          <JsonValueEditor
            value={selectedElement.metadata?.eventSchema}
            onChange={(eventSchema) =>
              updateElement(selectedElement.id, {
                metadata: { ...selectedElement.metadata, eventSchema },
              })
            }
            emptyHint={t("detailSidebar.jsonSchemaEmptyHint")}
          />
        </Field>
      )}

      {selectedElement.type === "aggregate" && (
        <>
          <Field label={t("detailSidebar.fields.attributesPerLine")}>
            <LinesTextarea
              resetKey={selectedElement.id}
              values={selectedElement.metadata?.attributes}
              onChange={(attributes) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    attributes,
                  },
                })
              }
              rows={3}
              className="dock-field min-h-[4rem]"
              placeholder={t("detailSidebar.placeholders.aggregateAttributes")}
            />
          </Field>
          <Field label={t("detailSidebar.fields.methodsPerLine")}>
            <LinesTextarea
              resetKey={selectedElement.id}
              values={selectedElement.metadata?.aggregateMethods}
              onChange={(aggregateMethods) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    aggregateMethods,
                  },
                })
              }
              rows={3}
              className="dock-field min-h-[4rem]"
            />
          </Field>
          <Field label={t("detailSidebar.fields.invariantsPerLine")}>
            <LinesTextarea
              resetKey={selectedElement.id}
              values={selectedElement.metadata?.aggregateInvariants}
              onChange={(aggregateInvariants) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    aggregateInvariants,
                  },
                })
              }
              rows={3}
              className="dock-field min-h-[4rem]"
              placeholder={t("detailSidebar.placeholders.aggregateInvariants")}
            />
          </Field>
        </>
      )}

      {selectedElement.type === "entity" && (
        <>
          <Field label={t("detailSidebar.fields.identityPerLine")}>
            <LinesTextarea
              resetKey={selectedElement.id}
              values={selectedElement.metadata?.identityFields}
              onChange={(identityFields) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    identityFields,
                  },
                })
              }
              rows={2}
              className="dock-field min-h-[2.5rem]"
              placeholder={t("detailSidebar.placeholders.entityIdentity")}
            />
          </Field>
          <Field label={t("detailSidebar.fields.attributesPerLine")}>
            <LinesTextarea
              resetKey={selectedElement.id}
              values={selectedElement.metadata?.attributes}
              onChange={(attributes) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    attributes,
                  },
                })
              }
              rows={3}
              className="dock-field min-h-[4rem]"
              placeholder={t("detailSidebar.placeholders.entityAttributes")}
            />
          </Field>
          <Field label={t("detailSidebar.fields.operationsPerLine")}>
            <LinesTextarea
              resetKey={selectedElement.id}
              values={selectedElement.metadata?.operations}
              onChange={(operations) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    operations,
                  },
                })
              }
              rows={3}
              className="dock-field min-h-[4rem]"
              placeholder={t("detailSidebar.placeholders.entityOperations")}
            />
          </Field>
        </>
      )}

      {selectedElement.type === "valueObject" && (
        <>
          <label className="flex items-center gap-2 text-xs text-[var(--text)]">
            <input
              type="checkbox"
              checked={selectedElement.metadata?.immutable !== false}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    immutable: e.target.checked,
                  },
                })
              }
            />
            {t("detailSidebar.flags.immutable")}
          </label>
          <Field label={t("detailSidebar.fields.attributesComponentsPerLine")}>
            <LinesTextarea
              resetKey={selectedElement.id}
              values={selectedElement.metadata?.attributes}
              onChange={(attributes) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    attributes,
                  },
                })
              }
              rows={3}
              className="dock-field min-h-[4rem]"
              placeholder={t("detailSidebar.placeholders.valueObjectAttributes")}
            />
          </Field>
        </>
      )}

      {selectedElement.type === "domainService" && (
        <>
          <label className="flex items-center gap-2 text-xs text-[var(--text)]">
            <input
              type="checkbox"
              checked={selectedElement.metadata?.stateless !== false}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    stateless: e.target.checked,
                  },
                })
              }
            />
            {t("detailSidebar.flags.stateless")}
          </label>
          <Field label={t("detailSidebar.fields.operationsPerLine")}>
            <LinesTextarea
              resetKey={selectedElement.id}
              values={selectedElement.metadata?.operations}
              onChange={(operations) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    operations,
                  },
                })
              }
              rows={3}
              className="dock-field min-h-[4rem]"
              placeholder={t("detailSidebar.placeholders.domainServiceOperations")}
            />
          </Field>
        </>
      )}

      {selectedElement.type === "repository" && (
        <>
          <Field label={t("detailSidebar.fields.aggregateRoot")}>
            <input
              className="dock-field"
              value={selectedElement.metadata?.aggregateRootRef ?? ""}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    aggregateRootRef: e.target.value,
                  },
                })
              }
              placeholder={t("detailSidebar.placeholders.aggregateRootRef")}
            />
          </Field>
          <Field label={t("detailSidebar.fields.operationsPerLine")}>
            <LinesTextarea
              resetKey={selectedElement.id}
              values={selectedElement.metadata?.operations}
              onChange={(operations) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    operations,
                  },
                })
              }
              rows={3}
              className="dock-field min-h-[4rem]"
              placeholder={t("detailSidebar.placeholders.repositoryOperations")}
            />
          </Field>
        </>
      )}

      {selectedElement.type === "factory" && (
        <>
          <Field label={t("detailSidebar.fields.creates")}>
            <input
              className="dock-field"
              value={selectedElement.metadata?.createsRef ?? ""}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    createsRef: e.target.value,
                  },
                })
              }
              placeholder={t("detailSidebar.placeholders.createsRef")}
            />
          </Field>
          <Field label={t("detailSidebar.fields.operationsPerLine")}>
            <LinesTextarea
              resetKey={selectedElement.id}
              values={selectedElement.metadata?.operations}
              onChange={(operations) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    operations,
                  },
                })
              }
              rows={3}
              className="dock-field min-h-[4rem]"
              placeholder={t("detailSidebar.placeholders.factoryOperations")}
            />
          </Field>
        </>
      )}

      {selectedElement.type === "subdomain" && (
        <Field label={t("detailSidebar.fields.subdomainKind")}>
          <select
            className="dock-field"
            value={selectedElement.metadata?.subdomainKind ?? "core"}
            onChange={(e) =>
              updateElement(selectedElement.id, {
                metadata: {
                  ...selectedElement.metadata,
                  subdomainKind: e.target.value as SubdomainKind,
                },
              })
            }
          >
            <option value="core">{t("detailSidebar.enums.subdomainKind.core")}</option>
            <option value="supporting">{t("detailSidebar.enums.subdomainKind.supporting")}</option>
            <option value="generic">{t("detailSidebar.enums.subdomainKind.generic")}</option>
          </select>
        </Field>
      )}

      {selectedElement.type === "rule" && (
        <Field label={t("detailSidebar.fields.ruleCriteriaPerLine")}>
          <LinesTextarea
              resetKey={selectedElement.id}
              values={selectedElement.metadata?.ruleCriteria}
              onChange={(ruleCriteria) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    ruleCriteria,
                  },
                })
              }
              rows={3}
              className="dock-field min-h-[4rem]"
              placeholder={t("detailSidebar.placeholders.ruleCriteria")}
            />
        </Field>
      )}

      {selectedElement.type === "example" && (
        <>
          <Field label={t("detailSidebar.fields.givenPerLine")}>
            <LinesTextarea
              resetKey={selectedElement.id}
              values={selectedElement.metadata?.exampleGiven}
              onChange={(exampleGiven) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    exampleGiven,
                  },
                })
              }
              rows={2}
              className="dock-field min-h-[3rem]"
              placeholder={t("detailSidebar.placeholders.exampleGiven")}
            />
          </Field>
          <Field label={t("detailSidebar.fields.whenPerLine")}>
            <LinesTextarea
              resetKey={selectedElement.id}
              values={selectedElement.metadata?.exampleWhen}
              onChange={(exampleWhen) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    exampleWhen,
                  },
                })
              }
              rows={2}
              className="dock-field min-h-[3rem]"
              placeholder={t("detailSidebar.placeholders.exampleWhen")}
            />
          </Field>
          <Field label={t("detailSidebar.fields.thenPerLine")}>
            <LinesTextarea
              resetKey={selectedElement.id}
              values={selectedElement.metadata?.exampleThen}
              onChange={(exampleThen) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    exampleThen,
                  },
                })
              }
              rows={2}
              className="dock-field min-h-[3rem]"
              placeholder={t("detailSidebar.placeholders.exampleThen")}
            />
          </Field>
        </>
      )}

      {selectedElement.type === "question" && (
        <Field label={t("detailSidebar.fields.status")}>
          <select
            className="dock-field"
            value={selectedElement.metadata?.questionStatus ?? "open"}
            onChange={(e) =>
              updateElement(selectedElement.id, {
                metadata: {
                  ...selectedElement.metadata,
                  questionStatus: e.target.value as QuestionStatus,
                },
              })
            }
          >
            <option value="open">{t("detailSidebar.enums.questionStatus.open")}</option>
            <option value="resolved">{t("detailSidebar.enums.questionStatus.resolved")}</option>
          </select>
        </Field>
      )}

      {selectedElement.type === "userStory" && (
        <>
          <Field label={t("detailSidebar.fields.persona")}>
            <input
              className="dock-field"
              value={selectedElement.metadata?.storyPersona ?? ""}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    storyPersona: e.target.value,
                  },
                })
              }
              placeholder={t("detailSidebar.placeholders.storyPersona")}
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label={t("detailSidebar.fields.priority")}>
              <select
                className="dock-field"
                value={selectedElement.metadata?.storyPriority ?? "must"}
                onChange={(e) =>
                  updateElement(selectedElement.id, {
                    metadata: {
                      ...selectedElement.metadata,
                      storyPriority: e.target.value as StoryPriority,
                    },
                  })
                }
              >
                <option value="must">{t("detailSidebar.enums.storyPriority.must")}</option>
                <option value="should">{t("detailSidebar.enums.storyPriority.should")}</option>
                <option value="could">{t("detailSidebar.enums.storyPriority.could")}</option>
                <option value="wont">{t("detailSidebar.enums.storyPriority.wont")}</option>
              </select>
            </Field>
            <Field label={t("detailSidebar.fields.estimate")}>
              <input
                className="dock-field"
                value={selectedElement.metadata?.storyEstimate ?? ""}
                onChange={(e) =>
                  updateElement(selectedElement.id, {
                    metadata: {
                      ...selectedElement.metadata,
                      storyEstimate: e.target.value,
                    },
                  })
                }
                placeholder={t("detailSidebar.placeholders.storyEstimate")}
              />
            </Field>
          </div>
          <Field label={t("detailSidebar.fields.acceptancePerLine")}>
            <LinesTextarea
              resetKey={selectedElement.id}
              values={selectedElement.metadata?.storyAcceptance}
              onChange={(storyAcceptance) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    storyAcceptance,
                  },
                })
              }
              rows={3}
              className="dock-field min-h-[4rem]"
            />
          </Field>
        </>
      )}

      {(selectedElement.type === "release" || selectedElement.type === "slice") && (
        <Field
          label={
            selectedElement.type === "slice"
              ? t("detailSidebar.fields.sliceGoal")
              : t("detailSidebar.fields.releaseGoal")
          }
        >
          <input
            className="dock-field"
            value={selectedElement.metadata?.releaseGoal ?? ""}
            onChange={(e) =>
              updateElement(selectedElement.id, {
                metadata: {
                  ...selectedElement.metadata,
                  releaseGoal: e.target.value,
                },
              })
            }
            placeholder={
              selectedElement.type === "slice"
                ? t("detailSidebar.placeholders.sliceGoal")
                : t("detailSidebar.placeholders.releaseGoal")
            }
          />
        </Field>
      )}

      {selectedElement.type === "slice" && (
        <Field label={t("detailSidebar.fields.sliceSystemsPerLine")}>
          <LinesTextarea
              resetKey={selectedElement.id}
              values={selectedElement.metadata?.sliceSystems}
              onChange={(sliceSystems) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    sliceSystems,
                  },
                })
              }
              rows={2}
              className="dock-field min-h-[3rem]"
              placeholder={t("detailSidebar.placeholders.sliceSystems")}
            />
        </Field>
      )}

      {selectedElement.type === "processActivity" && (
        <>
          <Field label={t("detailSidebar.fields.processRole")}>
            <input
              className="dock-field"
              value={selectedElement.metadata?.processRole ?? ""}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  metadata: { ...selectedElement.metadata, processRole: e.target.value },
                })
              }
            />
          </Field>
          <Field label={t("detailSidebar.fields.processSystem")}>
            <input
              className="dock-field"
              value={selectedElement.metadata?.processSystem ?? ""}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  metadata: { ...selectedElement.metadata, processSystem: e.target.value },
                })
              }
            />
          </Field>
          <Field label={t("detailSidebar.fields.processDuration")}>
            <input
              className="dock-field"
              value={selectedElement.metadata?.processDuration ?? ""}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  metadata: { ...selectedElement.metadata, processDuration: e.target.value },
                })
              }
              placeholder={t("detailSidebar.placeholders.processDuration")}
            />
          </Field>
          <Field label={t("detailSidebar.fields.processInputsPerLine")}>
            <LinesTextarea
              resetKey={selectedElement.id}
              values={selectedElement.metadata?.processInputs}
              onChange={(processInputs) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    processInputs,
                  },
                })
              }
              rows={2}
              className="dock-field min-h-[3rem]"
            />
          </Field>
          <Field label={t("detailSidebar.fields.processOutputsPerLine")}>
            <LinesTextarea
              resetKey={selectedElement.id}
              values={selectedElement.metadata?.processOutputs}
              onChange={(processOutputs) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    processOutputs,
                  },
                })
              }
              rows={2}
              className="dock-field min-h-[3rem]"
            />
          </Field>
        </>
      )}

      {selectedElement.type === "processGateway" && (
        <>
          <Field label={t("detailSidebar.fields.gatewayKind")}>
            <select
              className="dock-field"
              value={selectedElement.metadata?.gatewayKind ?? "xor"}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    gatewayKind: e.target.value as GatewayKind,
                  },
                })
              }
            >
              <option value="xor">{t("detailSidebar.enums.gatewayKind.xor")}</option>
              <option value="and">{t("detailSidebar.enums.gatewayKind.and")}</option>
              <option value="or">{t("detailSidebar.enums.gatewayKind.or")}</option>
            </select>
          </Field>
          <Field label={t("detailSidebar.fields.gatewayConditionsPerLine")}>
            <LinesTextarea
              resetKey={selectedElement.id}
              values={selectedElement.metadata?.gatewayConditions}
              onChange={(gatewayConditions) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    gatewayConditions,
                  },
                })
              }
              rows={3}
              className="dock-field min-h-[3rem]"
              placeholder={t("detailSidebar.placeholders.gatewayConditions")}
            />
          </Field>
        </>
      )}

      {selectedElement.type === "processStart" && (
        <Field label={t("detailSidebar.fields.processTrigger")}>
          <input
            className="dock-field"
            value={selectedElement.metadata?.processTrigger ?? ""}
            onChange={(e) =>
              updateElement(selectedElement.id, {
                metadata: { ...selectedElement.metadata, processTrigger: e.target.value },
              })
            }
          />
        </Field>
      )}

      {selectedElement.type === "processEnd" && (
        <Field label={t("detailSidebar.fields.processResult")}>
          <input
            className="dock-field"
            value={selectedElement.metadata?.processResult ?? ""}
            onChange={(e) =>
              updateElement(selectedElement.id, {
                metadata: { ...selectedElement.metadata, processResult: e.target.value },
              })
            }
          />
        </Field>
      )}

      {selectedElement.type === "dataEntity" && (
        <>
          <Field label={t("detailSidebar.fields.dataTableName")}>
            <input
              className="dock-field"
              value={selectedElement.metadata?.dataTableName ?? ""}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  metadata: { ...selectedElement.metadata, dataTableName: e.target.value },
                })
              }
            />
          </Field>
          <Field label={t("detailSidebar.fields.dataIdentityPerLine")}>
            <LinesTextarea
              resetKey={selectedElement.id}
              values={selectedElement.metadata?.identityFields}
              onChange={(identityFields) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    identityFields,
                  },
                })
              }
              rows={2}
              className="dock-field min-h-[3rem]"
            />
          </Field>
          <Field label={t("detailSidebar.fields.dataAttributesPerLine")}>
            <LinesTextarea
              resetKey={selectedElement.id}
              values={selectedElement.metadata?.attributes}
              onChange={(attributes) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    attributes,
                  },
                })
              }
              rows={4}
              className="dock-field min-h-[4rem]"
            />
          </Field>
          <Field label={t("detailSidebar.fields.dataUniqueKeysPerLine")}>
            <LinesTextarea
              resetKey={selectedElement.id}
              values={selectedElement.metadata?.dataUniqueKeys}
              onChange={(dataUniqueKeys) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    dataUniqueKeys,
                  },
                })
              }
              rows={2}
              className="dock-field min-h-[2.5rem]"
            />
          </Field>
        </>
      )}

      {selectedElement.type === "dataAssociation" && (
        <>
          <Field label={t("detailSidebar.fields.dataCardinality")}>
            <select
              className="dock-field"
              value={selectedElement.metadata?.dataCardinality ?? "1:n"}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    dataCardinality: e.target.value as DataCardinality,
                  },
                })
              }
            >
              {(["1:1", "1:n", "n:1", "n:m"] as const).map((card) => (
                <option key={card} value={card}>
                  {dataCardinalityLabel(t, card)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("detailSidebar.fields.dataLeftEntity")}>
            <input
              className="dock-field"
              value={selectedElement.metadata?.dataLeftEntity ?? ""}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  metadata: { ...selectedElement.metadata, dataLeftEntity: e.target.value },
                })
              }
            />
          </Field>
          <Field label={t("detailSidebar.fields.dataRightEntity")}>
            <input
              className="dock-field"
              value={selectedElement.metadata?.dataRightEntity ?? ""}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  metadata: { ...selectedElement.metadata, dataRightEntity: e.target.value },
                })
              }
            />
          </Field>
          <Field label={t("detailSidebar.fields.relationAttributesPerLine")}>
            <LinesTextarea
              resetKey={selectedElement.id}
              values={selectedElement.metadata?.attributes}
              onChange={(attributes) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    attributes,
                  },
                })
              }
              rows={2}
              className="dock-field min-h-[3rem]"
            />
          </Field>
        </>
      )}

      {selectedElement.type !== "link" && (
        <div className="space-y-1.5">
          <Field label={t("detailSidebar.fields.linkedView")}>
            <select
              className="dock-field"
              value={selectedElement.detailViewId ?? ""}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  detailViewId: e.target.value || undefined,
                })
              }
            >
              <option value="">{t("detailSidebar.chooseView")}</option>
              {views.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                  {v.id === activeViewId ? t("detailSidebar.currentViewSuffix") : ""}
                </option>
              ))}
            </select>
          </Field>
          {selectedElement.detailViewId &&
          views.some((v) => v.id === selectedElement.detailViewId) ? (
            <button
              type="button"
              className="flex w-full items-center justify-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--control)] px-2 py-1.5 text-xs font-medium text-[var(--text)] hover:border-[var(--accent)]"
              onClick={() => followElementLinkedView(selectedElement.id)}
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              {t("detailSidebar.linkedView.open")}
            </button>
          ) : null}
          {supportsArchDrilldown(selectedElement.type) ? null : (
            <p className="text-[0.72rem] text-[var(--muted)]">{t("detailSidebar.linkedView.hint")}</p>
          )}
        </div>
      )}

      {supportsArchDrilldown(selectedElement.type) && (
        <div className="space-y-1.5">
          <button
            type="button"
            className="flex w-full items-center justify-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--control)] px-3 py-2 text-sm font-medium text-[var(--text)] hover:border-[var(--accent)]"
            onClick={() => {
              const linked = selectedElement.detailViewId?.trim();
              if (linked && views.some((v) => v.id === linked)) {
                navigateBuildingBlockViewLink(selectedElement.id);
              } else {
                openBuildingBlockView(selectedElement.id);
              }
            }}
          >
            {selectedElement.detailViewId &&
            views.some((v) => v.id === selectedElement.detailViewId)
              ? t("contextMenu.openDetailView")
              : t("contextMenu.createDetailView")}
          </button>
          <p className="text-[0.72rem] text-[var(--muted)]">
            {selectedElement.type === "c4SoftwareSystem"
              ? t("detailSidebar.drilldown.hintC4SoftwareSystem")
              : selectedElement.type === "c4Container"
                ? t("detailSidebar.drilldown.hintC4Container")
                : selectedElement.type === "cloudBoundary"
                  ? t("detailSidebar.drilldown.hintCloudBoundary")
                  : selectedElement.type === "archBlackbox"
                    ? t("detailSidebar.drilldown.hintArchBlackbox")
                    : t("detailSidebar.drilldown.hintDefault")}
          </p>
        </div>
      )}

      {(selectedElement.type === "c4Container" ||
        selectedElement.type === "c4Component" ||
        selectedElement.type === "archComponent" ||
        isCloudElementType(selectedElement.type)) && (
        <>
          {isCloudElementType(selectedElement.type) && (
            <Field label={t("detailSidebar.fields.provider")}>
              <input
                className="dock-field"
                placeholder={t("detailSidebar.placeholders.cloudProvider")}
                value={selectedElement.metadata?.cloudProvider ?? ""}
                onChange={(e) =>
                  updateElement(selectedElement.id, {
                    metadata: { ...selectedElement.metadata, cloudProvider: e.target.value },
                  })
                }
              />
            </Field>
          )}
          <Field label={t("detailSidebar.fields.technology")}>
            <input
              className="dock-field"
              placeholder={
                isCloudElementType(selectedElement.type)
                  ? t("detailSidebar.placeholders.c4TechnologyCloud")
                  : t("detailSidebar.placeholders.c4TechnologyDefault")
              }
              value={selectedElement.metadata?.c4Technology ?? ""}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  metadata: { ...selectedElement.metadata, c4Technology: e.target.value },
                })
              }
            />
          </Field>
        </>
      )}

      {selectedElement.type === "link" && (
        <>
          <Field label={t("detailSidebar.fields.linkTargetKind")}>
            <select
              className="dock-field"
              value={selectedElement.metadata?.linkKind ?? "external"}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    linkKind: e.target.value as LinkKind,
                  },
                })
              }
            >
              <option value="external">{t("detailSidebar.enums.linkKind.external")}</option>
              <option value="view">{t("detailSidebar.enums.linkKind.view")}</option>
            </select>
          </Field>
          {(selectedElement.metadata?.linkKind ?? "external") === "external" ? (
            <Field label={t("detailSidebar.fields.url")}>
              <input
                className="dock-field"
                type="url"
                placeholder={t("detailSidebar.webLinks.urlPlaceholder")}
                value={selectedElement.metadata?.linkUrl ?? ""}
                onChange={(e) =>
                  updateElement(selectedElement.id, {
                    metadata: { ...selectedElement.metadata, linkUrl: e.target.value },
                  })
                }
              />
            </Field>
          ) : (
            <Field label={t("detailSidebar.fields.view")}>
              <select
                className="dock-field"
                value={selectedElement.metadata?.linkViewId ?? ""}
                onChange={(e) =>
                  updateElement(selectedElement.id, {
                    metadata: {
                      ...selectedElement.metadata,
                      linkViewId: e.target.value || undefined,
                    },
                  })
                }
              >
                <option value="">{t("detailSidebar.chooseView")}</option>
                {views.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                    {v.id === activeViewId ? t("detailSidebar.currentViewSuffix") : ""}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <button
            type="button"
            className="flex w-full items-center justify-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--control)] px-2 py-1.5 text-xs font-medium text-[var(--text)] hover:border-[var(--accent)]"
            onClick={() => {
              const result = activateBoardLink(selectedElement);
              if (!result.ok) {
                window.alert(result.reason);
              }
            }}
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            {t("detailSidebar.open")}
          </button>
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

      <p className="text-[0.7rem] text-[var(--muted)]">{t("detailSidebar.moreViaContextMenu")}</p>
    </DockPanel>
  );
}

function CollapsibleSection({
  title,
  defaultOpen = false,
  hint,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  hint?: string;
  children: ReactNode;
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
          className={[
            "size-3.5 shrink-0 transition-transform",
            open ? "rotate-0" : "-rotate-90",
          ].join(" ")}
          aria-hidden
        />
        <span className="flex-1">{title}</span>
        {hint && !open && (
          <span className="text-[0.65rem] font-normal text-[var(--accent)]">{hint}</span>
        )}
      </button>
      {open && <div className="space-y-2 border-t border-[var(--border)]/60 px-2.5 py-2">{children}</div>}
    </div>
  );
}

function DockPanel({
  title,
  onHelp,
  t,
  children,
}: {
  title: string;
  onHelp?: () => void;
  t: TranslateFn;
  children: ReactNode;
}) {
  return (
    <div
      className="flex min-h-0 flex-col"
      data-board-inspector
      onKeyDownCapture={(e) => {
        if (e.key !== "Delete" && e.key !== "Backspace") return;
        if (isTypingTarget(e.target)) return;
        e.stopPropagation();
      }}
    >
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
        <h2 className="text-sm font-semibold tracking-tight text-[var(--text)]">{title}</h2>
        {onHelp && (
          <button
            type="button"
            onClick={onHelp}
            className="dock-control rounded-md p-1.5 text-[var(--muted)] hover:text-[var(--text)]"
            title={t("detailSidebar.help")}
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="space-y-3 p-4">{children}</div>
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

function StrokeStyleButtons({
  value,
  onChange,
  t,
}: {
  value: ConnectorStrokeStyle;
  onChange: (style: ConnectorStrokeStyle) => void;
  t: TranslateFn;
}) {
  return (
    <div className="flex gap-1" role="group" aria-label={t("detailSidebar.aria.lineStyle")}>
      {CONNECTOR_STROKE_STYLES.map((style) => (
        <button
          key={style}
          type="button"
          title={connectorStrokeStyleLabel(t, style)}
          aria-label={connectorStrokeStyleLabel(t, style)}
          aria-pressed={value === style}
          className={[
            "flex h-8 flex-1 items-center justify-center rounded-md px-1.5 transition",
            value === style ? "dock-control-active" : "dock-control hover:bg-[var(--control-hover)]",
          ].join(" ")}
          onClick={() => onChange(style)}
        >
          <span
            className="block w-full border-t-2 border-current"
            style={{
              borderStyle: style === "solid" ? "solid" : style === "dashed" ? "dashed" : "dotted",
            }}
          />
        </button>
      ))}
    </div>
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
