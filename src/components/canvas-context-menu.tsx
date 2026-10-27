"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalSpaceBetween,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalSpaceBetween,
  BringToFront,
  ClipboardCopy,
  ClipboardList,
  ClipboardPaste,
  Copy,
  EyeOff,
  HelpCircle,
  Link2,
  Plus,
  RotateCcw,
  LayoutDashboard,
  Lock,
  RotateCw,
  SendToBack,
  StretchHorizontal,
  StretchVertical,
  Target,
  Trash2,
  Unlock,
  ExternalLink,
  Wand2,
} from "lucide-react";

import { computeAlignPatches, type AlignMode } from "@/lib/element-align";
import { resolveBoundedContextDetailView } from "@/lib/bounded-context-view";
import { resolveBuildingBlockViewNavigation } from "@/lib/building-block-view";
import { elementHasLinkedView } from "@/lib/view-navigation";
import { clipboardItemCount, isClipboardEmpty } from "@/lib/board-clipboard";
import {
  runElementAttributeCopy,
  runElementAttributePaste,
} from "@/lib/element-attribute-clipboard-ui";
import { useIsMobileLayout } from "@/lib/use-media-query";
import {
  effectiveElementRotation,
  normalizeRotationDegrees,
} from "@/lib/element-rotation";
import {
  ELEMENT_STYLES,
  HOTSPOT_DEFAULT_ROTATION_DEG,
  styleForElementType,
} from "@/lib/element-styles";
import { selectMeasureItem } from "@/lib/select-measure-item";
import {
  ACTION_TYPES,
  MEASURE_STATUSES,
  OBLIGATION_LEVELS,
} from "@/types/actions-view";
import { isOnCardFieldEnabled, onCardDisplayFieldsForType } from "@/lib/card-preview";
import { NOTE_COLOR_IDS, NOTE_COLORS } from "@/lib/note-colors";
import {
  PROGRESS_MARKS,
  PROGRESS_MARK_SHORTCUT,
  PROGRESS_MARK_STYLE,
  normalizeProgressMark,
} from "@/lib/progress-mark";
import { ProgressMarkGlyph } from "@/components/progress-mark-badge";
import {
  connectorStrokeStyleLabel,
  contextMapPatternLabel,
  hotspotPriorityLabel,
  lineArrowHeadLabel,
  progressMarkLongLabel,
  progressMarkShortLabel,
  relationTypeLabel,
  elementTypeLabel,
  elementTypeShortLabel,
  useT,
} from "@/i18n";
import {
  findMeasureForHotspot,
  isHotspotExcludedFromMeasures,
} from "@/lib/board-hotspots";
import { resolveDefaultActionsViewId } from "@/lib/measure-hotspot-ui";
import { isActionsView, isCanvasBoardView } from "@/lib/storm-json";
import { useStormBoardStore } from "@/store/storm-board-store";
import { supportsArchDrilldown, type NoteColorId } from "@/types/storm-element";
import { RELATION_TYPES, CONTEXT_MAP_PATTERNS, type RelationType, type ContextMapPattern } from "@/types/storm-relation";
import { resolveBoardConnectorStrokeStyle } from "@/lib/board-connector-style";
import {
  CONNECTOR_STROKE_STYLES,
  resolveRelationStrokeStyle,
} from "@/lib/connector-style";
import { defaultRelationType } from "@/lib/relation-validation";
import { CONNECTOR_ARROW_HEADS } from "@/types/canvas-annotation";
import { connectorArrowHeadGlyph } from "@/lib/connector-arrow-head";
import type { BoardConnector } from "@/types/board-connector";

function clipboardSelectionFromStore() {
  const s = useStormBoardStore.getState();
  return {
    elementIds: s.selectedElementIds,
    swimlaneIds: s.selectedSwimlaneIds,
    boundedContextIds: s.selectedBoundedContextIds,
  };
}

const CONTEXT_PATTERNS = CONTEXT_MAP_PATTERNS;



export interface CanvasContextMenuProps {
  onRequestHelpElementType?: (type: string) => void;
  onRequestHelpRelationType?: (type: RelationType) => void;
  onRequestHelpContextMap?: (type: ContextMapPattern) => void;
}

export function CanvasContextMenu({
  onRequestHelpElementType,
  onRequestHelpRelationType,
  onRequestHelpContextMap,
}: CanvasContextMenuProps) {
  const t = useT();
  const alignRow = [
    { mode: "left" as const, label: t("contextMenu.alignLeft"), icon: AlignStartVertical },
    { mode: "centerX" as const, label: t("contextMenu.alignCenterX"), icon: AlignCenterVertical },
    { mode: "right" as const, label: t("contextMenu.alignRight"), icon: AlignEndVertical },
    { mode: "top" as const, label: t("contextMenu.alignTop"), icon: AlignStartHorizontal },
    { mode: "centerY" as const, label: t("contextMenu.alignCenterY"), icon: AlignCenterHorizontal },
    { mode: "bottom" as const, label: t("contextMenu.alignBottom"), icon: AlignEndHorizontal },
  ];
  const menu = useStormBoardStore((s) => s.contextMenu);
  const closeContextMenu = useStormBoardStore((s) => s.closeContextMenu);
  const elements = useStormBoardStore((s) => s.elements);
  const relations = useStormBoardStore((s) => s.relations);
  const connectors = useStormBoardStore((s) => s.connectors);
  const contextRelations = useStormBoardStore((s) => s.contextRelations);
  const swimlanes = useStormBoardStore((s) => s.swimlanes);
  const boundedContexts = useStormBoardStore((s) => s.boundedContexts);
  const views = useStormBoardStore((s) => s.views);
  const activeViewId = useStormBoardStore((s) => s.activeViewId);
  const updateElement = useStormBoardStore((s) => s.updateElement);
  const openBuildingBlockView = useStormBoardStore((s) => s.openBuildingBlockView);
  const navigateBuildingBlockViewLink = useStormBoardStore((s) => s.navigateBuildingBlockViewLink);
  const followElementLinkedView = useStormBoardStore((s) => s.followElementLinkedView);
  const deleteElement = useStormBoardStore((s) => s.deleteElement);
  const patchElements = useStormBoardStore((s) => s.patchElements);
  const bringElementsToFront = useStormBoardStore((s) => s.bringElementsToFront);
  const sendElementsToBack = useStormBoardStore((s) => s.sendElementsToBack);
  const bringElementsForward = useStormBoardStore((s) => s.bringElementsForward);
  const sendElementsBackward = useStormBoardStore((s) => s.sendElementsBackward);
  const updateRelation = useStormBoardStore((s) => s.updateRelation);
  const deleteRelation = useStormBoardStore((s) => s.deleteRelation);
  const updateConnector = useStormBoardStore((s) => s.updateConnector);
  const deleteConnector = useStormBoardStore((s) => s.deleteConnector);
  const updateContextRelation = useStormBoardStore((s) => s.updateContextRelation);
  const deleteContextRelation = useStormBoardStore((s) => s.deleteContextRelation);
  const setRelationMode = useStormBoardStore((s) => s.setRelationMode);
  const setRelationDraftSource = useStormBoardStore((s) => s.setRelationDraftSource);
  const setContextMapMode = useStormBoardStore((s) => s.setContextMapMode);
  const setContextMapDraftSource = useStormBoardStore((s) => s.setContextMapDraftSource);
  const deleteSwimlane = useStormBoardStore((s) => s.deleteSwimlane);
  const deleteBoundedContext = useStormBoardStore((s) => s.deleteBoundedContext);
  const updateSwimlane = useStormBoardStore((s) => s.updateSwimlane);
  const updateBoundedContext = useStormBoardStore((s) => s.updateBoundedContext);
  const openBoundedContextView = useStormBoardStore((s) => s.openBoundedContextView);
  const bringRegionsToFront = useStormBoardStore((s) => s.bringRegionsToFront);
  const sendRegionsToBack = useStormBoardStore((s) => s.sendRegionsToBack);
  const bringRegionsForward = useStormBoardStore((s) => s.bringRegionsForward);
  const sendRegionsBackward = useStormBoardStore((s) => s.sendRegionsBackward);
  const clearSelection = useStormBoardStore((s) => s.clearSelection);
  const addElement = useStormBoardStore((s) => s.addElement);
  const paletteType = useStormBoardStore((s) => s.paletteType);
  const timeline = useStormBoardStore((s) => s.timeline);
  const setTimeline = useStormBoardStore((s) => s.setTimeline);
  const moveToClipboard = useStormBoardStore((s) => s.moveToClipboard);
  const copyToClipboard = useStormBoardStore((s) => s.copyToClipboard);
  const duplicateElements = useStormBoardStore((s) => s.duplicateElements);
  const applyProgressMark = useStormBoardStore((s) => s.applyProgressMark);
  const pasteClipboardAt = useStormBoardStore((s) => s.pasteClipboardAt);
  const clipboard = useStormBoardStore((s) => s.clipboard);
  const elementAttributeClipboard = useStormBoardStore((s) => s.elementAttributeClipboard);
  const elementAttributeClipboardSourceId = useStormBoardStore(
    (s) => s.elementAttributeClipboardSourceId,
  );
  const addMeasureFromHotspot = useStormBoardStore((s) => s.addMeasureFromHotspot);
  const setHotspotBacklogHidden = useStormBoardStore((s) => s.setHotspotMeasuresBacklogHidden);
  const linkMeasureToHotspot = useStormBoardStore((s) => s.linkMeasureToCanvasHotspot);
  const setActiveView = useStormBoardStore((s) => s.setActiveView);
  const selectMeasure = useStormBoardStore((s) => s.selectMeasure);
  const moveMeasure = useStormBoardStore((s) => s.moveMeasureActionItem);
  const updateMeasure = useStormBoardStore((s) => s.updateMeasureActionItem);
  const removeMeasure = useStormBoardStore((s) => s.removeMeasureActionItem);
  const duplicateMeasure = useStormBoardStore((s) => s.duplicateMeasureActionItem);
  const beginMeasureHotspotPick = useStormBoardStore((s) => s.beginMeasureHotspotLinkPick);
  const cancelMeasureHotspotPick = useStormBoardStore((s) => s.cancelMeasureHotspotLinkPick);
  const measureHotspotLinkPick = useStormBoardStore((s) => s.measureHotspotLinkPick);
  const navigateMeasureTarget = useStormBoardStore((s) => s.navigateToMeasureTarget);
  const copyE2vSelectionForAi = useStormBoardStore((s) => s.copyE2vSelectionForAi);
  const applyE2vSelectionFromClipboard = useStormBoardStore(
    (s) => s.applyE2vSelectionFromClipboard,
  );
  const selectedElementIds = useStormBoardStore((s) => s.selectedElementIds);
  const selectedSwimlaneIds = useStormBoardStore((s) => s.selectedSwimlaneIds);
  const selectedBoundedContextIds = useStormBoardStore((s) => s.selectedBoundedContextIds);
  const isMobile = useIsMobileLayout();

  const canvasViewActive = Boolean(
    views.some((v) => v.id === activeViewId && isCanvasBoardView(v)),
  );
  const canExtractE2v =
    canvasViewActive &&
    (selectedElementIds.length > 0 ||
      selectedSwimlaneIds.length > 0 ||
      selectedBoundedContextIds.length > 0);

  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: 0, top: 0 });

  useLayoutEffect(() => {
    if (!menu || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const pad = 8;
    setPos({
      left: Math.min(menu.x, window.innerWidth - rect.width - pad),
      top: Math.min(menu.y, window.innerHeight - rect.height - pad),
    });
  }, [menu]);

  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeContextMenu();
    };
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) closeContextMenu();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown, true);
    };
  }, [menu, closeContextMenu]);

  if (!menu) return null;

  const run = (fn: () => void) => {
    fn();
    closeContextMenu();
  };

  const renderE2vAiMenu = () =>
    canvasViewActive ? (
      <>
        <Separator />
        <E2vSelectionAiMenuItems
          t={t}
          run={run}
          canExtract={canExtractE2v}
          onCopy={copyE2vSelectionForAi}
          onApply={applyE2vSelectionFromClipboard}
        />
      </>
    ) : null;

  const target = menu.target;
  let body: ReactNode = null;

  if (target.kind === "element") {
    const el = elements.find((e) => e.id === target.id);
    if (!el) return null;
    const style = styleForElementType(el.type);
    const typeLabel = elementTypeLabel(t, el.type);
    body = (
      <>
        <Header title={el.label || typeLabel} subtitle={typeLabel} />
        {supportsArchDrilldown(el.type) && (
          <>
            <Item
              icon={LayoutDashboard}
              label={
                el.detailViewId && views.some((v) => v.id === el.detailViewId)
                  ? t("contextMenu.openDetailView")
                  : resolveBuildingBlockViewNavigation(el, activeViewId, views)?.direction === "up"
                    ? t("contextMenu.openOverview")
                    : t("contextMenu.createDetailView")
              }
              onClick={() =>
                run(() => {
                  const nav = resolveBuildingBlockViewNavigation(el, activeViewId, views);
                  if (nav) navigateBuildingBlockViewLink(el.id);
                  else openBuildingBlockView(el.id);
                })
              }
            />
            <Separator />
          </>
        )}
        {el.type !== "link" &&
          !supportsArchDrilldown(el.type) &&
          elementHasLinkedView(el, views) && (
            <>
              <Item
                icon={LayoutDashboard}
                label={t("contextMenu.openLinkedView")}
                onClick={() => run(() => followElementLinkedView(el.id))}
              />
              <Separator />
            </>
          )}
        <Item
          icon={Link2}
          label={t("contextMenu.startRelation")}
          onClick={() =>
            run(() => {
              setRelationMode(true);
              setRelationDraftSource(el.id);
            })
          }
        />
        {swimlanes.length > 0 && (
          <Submenu label={t("contextMenu.swimlane")}>
            <Item
              label={t("common.none")}
              onClick={() => run(() => updateElement(el.id, { swimlaneId: undefined }))}
            />
            {swimlanes.map((lane) => (
              <Item
                key={lane.id}
                label={lane.label}
                active={el.swimlaneId === lane.id}
                onClick={() => run(() => updateElement(el.id, { swimlaneId: lane.id }))}
              />
            ))}
          </Submenu>
        )}
        {boundedContexts.length > 0 && (
          <Submenu label={t("contextMenu.boundedContext")}>
            <Item
              label={t("common.noneContext")}
              onClick={() => run(() => updateElement(el.id, { boundedContextId: undefined }))}
            />
            {boundedContexts.map((bc) => (
              <Item
                key={bc.id}
                label={bc.label}
                active={el.boundedContextId === bc.id}
                onClick={() => run(() => updateElement(el.id, { boundedContextId: bc.id }))}
              />
            ))}
          </Submenu>
        )}
        {el.type === "note" && (
          <>
            <Section label={t("contextMenu.noteColor")} />
            {NOTE_COLOR_IDS.map((id) => (
              <Item
                key={id}
                label={NOTE_COLORS[id].label}
                active={(el.metadata?.noteColor ?? "cream") === id}
                onClick={() =>
                  run(() =>
                    updateElement(el.id, {
                      metadata: { ...el.metadata, noteColor: id as NoteColorId },
                    }),
                  )
                }
              />
            ))}
          </>
        )}
        {el.type === "hotspot" && (
          <>
            <Section label={t("contextMenu.hotspot")} />
            <Item
              label={t("contextMenu.statusOpen")}
              active={(el.metadata?.hotspotStatus ?? "open") === "open"}
              onClick={() =>
                run(() =>
                  updateElement(el.id, {
                    metadata: { ...el.metadata, hotspotStatus: "open" },
                  }),
                )
              }
            />
            <Item
              label={t("contextMenu.statusResolved")}
              active={el.metadata?.hotspotStatus === "resolved"}
              onClick={() =>
                run(() =>
                  updateElement(el.id, {
                    metadata: { ...el.metadata, hotspotStatus: "resolved" },
                  }),
                )
              }
            />
            {(["low", "medium", "high"] as const).map((p) => (
              <Item
                key={p}
                label={t("contextMenu.priority", { level: hotspotPriorityLabel(t, p) })}
                active={(el.metadata?.hotspotPriority ?? "medium") === p}
                onClick={() =>
                  run(() =>
                    updateElement(el.id, {
                      metadata: { ...el.metadata, hotspotPriority: p },
                    }),
                  )
                }
              />
            ))}
            {(() => {
              const actionsViewId = resolveDefaultActionsViewId(views, activeViewId);
              if (!actionsViewId) return null;
              const actionsView = views.find((v) => v.id === actionsViewId);
              const viewName = views.find((v) => v.id === activeViewId)?.name ?? "Board";
              const items =
                actionsView && isActionsView(actionsView) ? actionsView.items : [];
              const config =
                actionsView && isActionsView(actionsView) ? actionsView.config : undefined;
              const linked = findMeasureForHotspot(items, activeViewId, el.id);
              const hidden = config
                ? isHotspotExcludedFromMeasures(config, activeViewId, el.id)
                : false;
              const hotspotRef = {
                viewId: activeViewId,
                viewName,
                elementId: el.id,
                label: el.label?.trim() || el.id,
                description: el.description?.trim() || undefined,
                status: el.metadata?.hotspotStatus ?? ("open" as const),
                priority: el.metadata?.hotspotPriority ?? ("medium" as const),
              };
              const linkableMeasures = items.filter(
                (m) =>
                  !m.targetRef ||
                  (m.targetRef.viewId === activeViewId &&
                    m.targetRef.elementId === el.id),
              );
              return (
                <>
                  <Separator />
                  <Section label={t("contextMenu.measuresLink")} />
                  {linked ? (
                    <Item
                      icon={Link2}
                      label={t("actionsView.hotspots.openMeasure")}
                      onClick={() =>
                        run(() => {
                          setActiveView(actionsViewId);
                          selectMeasure(linked.id);
                        })
                      }
                    />
                  ) : (
                    <Item
                      icon={Plus}
                      label={t("actionsView.hotspots.adoptAsMeasure")}
                      onClick={() =>
                        run(() => addMeasureFromHotspot(actionsViewId, hotspotRef))
                      }
                    />
                  )}
                  {linkableMeasures.length > 0 && !linked ? (
                    <Submenu label={t("contextMenu.linkExistingMeasure")}>
                      {linkableMeasures.map((m) => (
                        <Item
                          key={m.id}
                          label={m.title || t("actionsView.detail.titlePlaceholder")}
                          onClick={() =>
                            run(() =>
                              linkMeasureToHotspot(
                                actionsViewId,
                                m.id,
                                activeViewId,
                                el.id,
                                viewName,
                                el.label?.trim() || el.id,
                              ),
                            )
                          }
                        />
                      ))}
                    </Submenu>
                  ) : null}
                  <Item
                    icon={hidden ? RotateCcw : EyeOff}
                    label={
                      hidden
                        ? t("actionsView.hotspots.restoreToBacklog")
                        : t("actionsView.hotspots.excludeFromBacklog")
                    }
                    onClick={() =>
                      run(() =>
                        setHotspotBacklogHidden(
                          actionsViewId,
                          activeViewId,
                          el.id,
                          !hidden,
                        ),
                      )
                    }
                  />
                  <Item
                    icon={ClipboardList}
                    label={t("actionsView.hotspots.openMeasuresView")}
                    onClick={() => run(() => setActiveView(actionsViewId))}
                  />
                </>
              );
            })()}
          </>
        )}
        <Item
          label={el.metadata?.isRecurring ? t("contextMenu.recurringOff") : t("contextMenu.recurringOn")}
          onClick={() =>
            run(() =>
              updateElement(el.id, {
                metadata: { ...el.metadata, isRecurring: !el.metadata?.isRecurring },
              }),
            )
          }
        />
        <Submenu label={t("contextMenu.showOnCard")}>
          {onCardDisplayFieldsForType(el.type).map(({ key, label }) => (
            <Item
              key={key}
              label={label}
              active={isOnCardFieldEnabled(el, key)}
              onClick={() =>
                run(() =>
                  updateElement(el.id, {
                    metadata: {
                      ...el.metadata,
                      [key]: !isOnCardFieldEnabled(el, key),
                    },
                  }),
                )
              }
            />
          ))}
        </Submenu>
        <Item
          icon={HelpCircle}
          label={t("contextMenu.help")}
          onClick={() => run(() => onRequestHelpElementType?.(el.type))}
        />
        <Separator />
        <Section label={t("contextMenu.rotation")} />
        <Item
          icon={RotateCw}
          label={t("contextMenu.rotate45")}
          onClick={() =>
            run(() => {
              const current = effectiveElementRotation(el.rotation, style.rotation);
              updateElement(el.id, {
                rotation: normalizeRotationDegrees(current + 45),
              });
            })
          }
        />
        <Item
          icon={RotateCcw}
          label={t("contextMenu.rotateMinus45")}
          onClick={() =>
            run(() => {
              const current = effectiveElementRotation(el.rotation, style.rotation);
              updateElement(el.id, {
                rotation: normalizeRotationDegrees(current - 45),
              });
            })
          }
        />
        <Item
          label={t("contextMenu.upright0")}
          onClick={() => run(() => updateElement(el.id, { rotation: 0 }))}
        />
        {el.type === "hotspot" && (
          <Item
            label={t("contextMenu.hotspotSlant")}
            onClick={() =>
              run(() => updateElement(el.id, { rotation: HOTSPOT_DEFAULT_ROTATION_DEG }))
            }
          />
        )}
        <Separator />
        <Section label={t("contextMenu.layer")} />
        <Item
          icon={BringToFront}
          label={t("contextMenu.bringToFront")}
          onClick={() => run(() => bringElementsToFront([el.id]))}
        />
        <Item
          label={t("contextMenu.forwardOne")}
          onClick={() => run(() => bringElementsForward([el.id]))}
        />
        <Item
          label={t("contextMenu.backwardOne")}
          onClick={() => run(() => sendElementsBackward([el.id]))}
        />
        <Item
          icon={SendToBack}
          label={t("contextMenu.sendToBack")}
          onClick={() => run(() => sendElementsToBack([el.id]))}
        />
        <Separator />
        <Section label={t("contextMenu.progressMark")} />
        {PROGRESS_MARKS.map((mark) => (
          <Item
            key={mark}
            label={progressMarkShortLabel(t, mark)}
            hint={PROGRESS_MARK_SHORTCUT[mark]}
            active={normalizeProgressMark(el.metadata?.progressMark) === mark}
            leading={
              <span
                className="inline-flex h-4 w-4 items-center justify-center rounded-full"
                style={{
                  backgroundColor: PROGRESS_MARK_STYLE[mark].bg,
                  color: PROGRESS_MARK_STYLE[mark].fg,
                }}
                title={progressMarkLongLabel(t, mark)}
              >
                <ProgressMarkGlyph mark={mark} />
              </span>
            }
            onClick={() =>
              run(() => {
                useStormBoardStore.getState().setSelectedElementIds([el.id]);
                applyProgressMark(mark);
              })
            }
          />
        ))}
        {normalizeProgressMark(el.metadata?.progressMark) ? (
          <Item
            label={t("contextMenu.clearProgressMark")}
            onClick={() =>
              run(() => {
                useStormBoardStore.getState().setSelectedElementIds([el.id]);
                applyProgressMark(normalizeProgressMark(el.metadata?.progressMark)!);
              })
            }
          />
        ) : null}
        <Separator />
        <Item
          icon={Copy}
          label={t("contextMenu.duplicate")}
          hint="⌘D / Ctrl+D"
          onClick={() => run(() => duplicateElements([el.id]))}
        />
        <Item
          icon={ClipboardCopy}
          label={t("contextMenu.copyElementAttributes")}
          hint={t("contextMenu.copyElementAttributesHint")}
          onClick={() => run(() => runElementAttributeCopy(el.id))}
        />
        {elementAttributeClipboard ? (
          <Item
            icon={ClipboardPaste}
            label={t("contextMenu.pasteElementAttributes")}
            hint={t("contextMenu.pasteElementAttributesHint")}
            disabled={elementAttributeClipboardSourceId === el.id}
            onClick={() =>
              run(() => {
                const outcome = runElementAttributePaste(t, el.id);
                if (outcome.status === "error") {
                  if (outcome.reason === "no_clipboard") {
                    window.alert(t("alerts.elementAttributesPasteNoClipboard"));
                  } else if (outcome.reason === "same_element") {
                    window.alert(t("alerts.elementAttributesPasteSameElement"));
                  }
                }
              })
            }
          />
        ) : null}
        {renderE2vAiMenu()}
        <Item
          icon={ClipboardCopy}
          label={t("contextMenu.copyToClipboard")}
          onClick={() => run(() => copyToClipboard(clipboardSelectionFromStore()))}
        />
        <Item
          icon={ClipboardList}
          label={t("contextMenu.moveToClipboard")}
          onClick={() => run(() => moveToClipboard(clipboardSelectionFromStore()))}
        />
        <Item
          icon={Trash2}
          label={t("contextMenu.delete")}
          danger
          onClick={() =>
            run(() => {
              deleteElement(el.id);
              clearSelection();
            })
          }
        />
      </>
    );
  } else if (target.kind === "elements") {
    const selected = elements.filter((e) => target.ids.includes(e.id));
    body = (
      <>
        <Header title={t("contextMenu.multiElementsHeader", { n: selected.length })} subtitle={t("contextMenu.alignMultiSubtitle")} />
        <Section label={t("contextMenu.align")} />
        <div className="grid grid-cols-3 gap-1 px-2 pb-1">
          {alignRow.map(({ mode, label, icon: Icon }) => (
            <button
              key={mode}
              type="button"
              title={label}
              className="flex items-center justify-center rounded-md p-2 text-[var(--text)] hover:bg-[var(--control-hover)]"
              onClick={() =>
                run(() => {
                  const patches = computeAlignPatches(selected, mode, target.ids[0]);
                  if (patches.length) patchElements(patches);
                })
              }
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
        <Item
          icon={AlignHorizontalSpaceBetween}
          label={t("contextMenu.distributeH")}
          disabled={selected.length < 3}
          onClick={() =>
            run(() => {
              const patches = computeAlignPatches(selected, "distributeX");
              if (patches.length) patchElements(patches);
            })
          }
        />
        <Item
          icon={AlignVerticalSpaceBetween}
          label={t("contextMenu.distributeV")}
          disabled={selected.length < 3}
          onClick={() =>
            run(() => {
              const patches = computeAlignPatches(selected, "distributeY");
              if (patches.length) patchElements(patches);
            })
          }
        />
        <Item
          icon={StretchHorizontal}
          label={t("contextMenu.sameWidth")}
          onClick={() =>
            run(() => {
              const patches = computeAlignPatches(selected, "sameWidth", target.ids[0]);
              if (patches.length) patchElements(patches);
            })
          }
        />
        <Item
          icon={StretchVertical}
          label={t("contextMenu.sameHeight")}
          onClick={() =>
            run(() => {
              const patches = computeAlignPatches(selected, "sameHeight", target.ids[0]);
              if (patches.length) patchElements(patches);
            })
          }
        />
        <Separator />
        <Section label={t("contextMenu.rotation")} />
        <Item
          icon={RotateCw}
          label={t("contextMenu.rotateAll45")}
          onClick={() =>
            run(() => {
              patchElements(
                selected.map((el) => ({
                  id: el.id,
                  rotation: normalizeRotationDegrees(
                    effectiveElementRotation(el.rotation, styleForElementType(el.type).rotation) + 45,
                  ),
                })),
              );
            })
          }
        />
        <Item
          icon={RotateCcw}
          label={t("contextMenu.rotateAllMinus45")}
          onClick={() =>
            run(() => {
              patchElements(
                selected.map((el) => ({
                  id: el.id,
                  rotation: normalizeRotationDegrees(
                    effectiveElementRotation(el.rotation, styleForElementType(el.type).rotation) - 45,
                  ),
                })),
              );
            })
          }
        />
        <Item
          label={t("contextMenu.rotateAllUpright")}
          onClick={() =>
            run(() => {
              patchElements(selected.map((el) => ({ id: el.id, rotation: 0 })));
            })
          }
        />
        <Separator />
        <Section label={t("contextMenu.layer")} />
        <Item
          icon={BringToFront}
          label={t("contextMenu.bringToFront")}
          onClick={() => run(() => bringElementsToFront(target.ids))}
        />
        <Item
          label={t("contextMenu.forwardOne")}
          onClick={() => run(() => bringElementsForward(target.ids))}
        />
        <Item
          label={t("contextMenu.backwardOne")}
          onClick={() => run(() => sendElementsBackward(target.ids))}
        />
        <Item
          icon={SendToBack}
          label={t("contextMenu.sendToBack")}
          onClick={() => run(() => sendElementsToBack(target.ids))}
        />
        <Separator />
        <Section label={t("contextMenu.progressMark")} />
        {PROGRESS_MARKS.map((mark) => (
          <Item
            key={mark}
            label={progressMarkShortLabel(t, mark)}
            hint={PROGRESS_MARK_SHORTCUT[mark]}
            active={target.ids.every(
              (id) =>
                normalizeProgressMark(
                  elements.find((e) => e.id === id)?.metadata?.progressMark,
                ) === mark,
            )}
            leading={
              <span
                className="inline-flex h-4 w-4 items-center justify-center rounded-full"
                style={{
                  backgroundColor: PROGRESS_MARK_STYLE[mark].bg,
                  color: PROGRESS_MARK_STYLE[mark].fg,
                }}
                title={progressMarkLongLabel(t, mark)}
              >
                <ProgressMarkGlyph mark={mark} />
              </span>
            }
            onClick={() =>
              run(() => {
                useStormBoardStore.getState().setSelectedElementIds(target.ids);
                applyProgressMark(mark);
              })
            }
          />
        ))}
        <Separator />
        <Item
          icon={Copy}
          label={t("contextMenu.duplicate")}
          hint="⌘D / Ctrl+D"
          onClick={() => run(() => duplicateElements(target.ids))}
        />
        {target.ids.length === 1 ? (
          <>
            <Item
              icon={ClipboardCopy}
              label={t("contextMenu.copyElementAttributes")}
              hint={t("contextMenu.copyElementAttributesHint")}
              onClick={() => run(() => runElementAttributeCopy(target.ids[0]!))}
            />
            {elementAttributeClipboard ? (
              <Item
                icon={ClipboardPaste}
                label={t("contextMenu.pasteElementAttributes")}
                hint={t("contextMenu.pasteElementAttributesHint")}
                disabled={elementAttributeClipboardSourceId === target.ids[0]}
                onClick={() =>
                  run(() => {
                    const outcome = runElementAttributePaste(t, target.ids[0]!);
                    if (outcome.status === "error") {
                      if (outcome.reason === "no_clipboard") {
                        window.alert(t("alerts.elementAttributesPasteNoClipboard"));
                      } else if (outcome.reason === "same_element") {
                        window.alert(t("alerts.elementAttributesPasteSameElement"));
                      }
                    }
                  })
                }
              />
            ) : null}
          </>
        ) : null}
        {renderE2vAiMenu()}
        <Item
          icon={ClipboardCopy}
          label={t("contextMenu.copyToClipboard")}
          onClick={() => run(() => copyToClipboard(clipboardSelectionFromStore()))}
        />
        <Item
          icon={ClipboardList}
          label={t("contextMenu.moveToClipboard")}
          onClick={() => run(() => moveToClipboard(clipboardSelectionFromStore()))}
        />
        <Item
          icon={Trash2}
          label={t("contextMenu.deleteAll")}
          danger
          onClick={() =>
            run(() => {
              for (const id of target.ids) deleteElement(id);
              clearSelection();
            })
          }
        />
      </>
    );
  } else if (target.kind === "connector") {
    const c = connectors.find((x) => x.id === target.id);
    if (!c) return null;
    const patch = (p: Partial<BoardConnector>) => updateConnector(c.id, p);
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
    const relType =
      c.relationType ?? (srcEl && tgtEl ? defaultRelationType(srcEl, tgtEl) : null);

    if (c.contextMapPattern) {
      body = (
        <>
          <Header
            title={t("contextMenu.contextMap")}
            subtitle={contextMapPatternLabel(t, c.contextMapPattern)}
          />
          <Section label={t("contextMenu.pattern")} />
          {CONTEXT_PATTERNS.map((pattern) => (
            <Item
              key={pattern}
              label={contextMapPatternLabel(t, pattern)}
              active={c.contextMapPattern === pattern}
              onClick={() => run(() => patch({ contextMapPattern: pattern }))}
            />
          ))}
          <Separator />
          <Item
            icon={Trash2}
            label={t("contextMenu.delete")}
            danger
            onClick={() =>
              run(() => {
                deleteConnector(c.id);
                clearSelection();
              })
            }
          />
        </>
      );
    } else if (relType) {
      body = (
        <>
          <Header title={t("contextMenu.connector")} subtitle={relationTypeLabel(t, relType)} />
          <Section label={t("contextMenu.type")} />
          {RELATION_TYPES.map((rel) => (
            <Item
              key={rel}
              label={relationTypeLabel(t, rel)}
              active={relType === rel}
              onClick={() => run(() => patch({ relationType: rel, labelMode: "type" }))}
            />
          ))}
          <Item
            icon={HelpCircle}
            label={t("contextMenu.help")}
            onClick={() => run(() => onRequestHelpRelationType?.(relType))}
          />
          <Separator />
          <Section label={t("contextMenu.line")} />
          {CONNECTOR_STROKE_STYLES.map((style) => (
            <Item
              key={style}
              label={connectorStrokeStyleLabel(t, style)}
              active={resolveBoardConnectorStrokeStyle(c) === style}
              onClick={() => run(() => patch({ strokeStyle: style }))}
            />
          ))}
          <Separator />
          <Section label={t("contextMenu.arrow")} />
          {CONNECTOR_ARROW_HEADS.map((head) => (
            <Item
              key={head}
              label={`${connectorArrowHeadGlyph(head)} ${lineArrowHeadLabel(t, head)}`}
              active={(c.arrowHead ?? "end") === head}
              onClick={() => run(() => patch({ arrowHead: head }))}
            />
          ))}
          <Separator />
          <Section label={t("contextMenu.progressMark")} />
          {PROGRESS_MARKS.map((mark) => (
            <Item
              key={mark}
              label={progressMarkShortLabel(t, mark)}
              hint={PROGRESS_MARK_SHORTCUT[mark]}
              active={normalizeProgressMark(c.progressMark) === mark}
              leading={
                <span
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: PROGRESS_MARK_STYLE[mark].bg,
                    color: PROGRESS_MARK_STYLE[mark].fg,
                  }}
                >
                  <ProgressMarkGlyph mark={mark} />
                </span>
              }
              onClick={() =>
                run(() => {
                  useStormBoardStore.getState().selectConnector(c.id);
                  applyProgressMark(mark);
                })
              }
            />
          ))}
          <Separator />
          <Item
            icon={Trash2}
            label={t("contextMenu.delete")}
            danger
            onClick={() =>
              run(() => {
                deleteConnector(c.id);
                clearSelection();
              })
            }
          />
        </>
      );
    } else {
      body = (
        <>
          <Header title={t("contextMenu.connector")} subtitle={t("contextMenu.freeConnector")} />
          <Section label={t("contextMenu.line")} />
          {CONNECTOR_STROKE_STYLES.map((style) => (
            <Item
              key={style}
              label={connectorStrokeStyleLabel(t, style)}
              active={resolveBoardConnectorStrokeStyle(c) === style}
              onClick={() => run(() => patch({ strokeStyle: style }))}
            />
          ))}
          <Separator />
          <Section label={t("contextMenu.arrow")} />
          {CONNECTOR_ARROW_HEADS.map((head) => (
            <Item
              key={head}
              label={`${connectorArrowHeadGlyph(head)} ${lineArrowHeadLabel(t, head)}`}
              active={(c.arrowHead ?? "end") === head}
              onClick={() => run(() => patch({ arrowHead: head }))}
            />
          ))}
          <Separator />
          <Item
            label={t("contextMenu.editConnectorLabel")}
            onClick={() =>
              run(() => {
                const next = window.prompt(t("contextMenu.connectorLabelPrompt"), c.label ?? "");
                if (next !== null) patch({ label: next, labelMode: "custom" });
              })
            }
          />
          <Separator />
          <Item
            icon={Trash2}
            label={t("contextMenu.delete")}
            danger
            onClick={() =>
              run(() => {
                deleteConnector(c.id);
                clearSelection();
              })
            }
          />
        </>
      );
    }
  } else if (target.kind === "relation") {
    const rel = relations.find((r) => r.id === target.id);
    if (!rel) return null;
    body = (
      <>
        <Header title={t("contextMenu.relationHeader")} subtitle={relationTypeLabel(t, rel.type)} />
        <Section label={t("contextMenu.type")} />
        {RELATION_TYPES.map((rt) => (
          <Item
            key={rt}
            label={relationTypeLabel(t, rt)}
            active={rel.type === rt}
            onClick={() => run(() => updateRelation(rel.id, { type: rt }))}
          />
        ))}
        <Item
          icon={HelpCircle}
          label={t("contextMenu.help")}
          onClick={() => run(() => onRequestHelpRelationType?.(rel.type))}
        />
        <Separator />
        <Section label={t("contextMenu.line")} />
        {CONNECTOR_STROKE_STYLES.map((style) => (
          <Item
            key={style}
            label={connectorStrokeStyleLabel(t, style)}
            active={resolveRelationStrokeStyle(rel) === style}
            onClick={() => run(() => updateRelation(rel.id, { strokeStyle: style }))}
          />
        ))}
        <Separator />
        <Section label={t("contextMenu.caption")} />
        <Item
          label={`${t("contextMenu.type")} (${relationTypeLabel(t, rel.type)})`}
          active={rel.labelMode === "type"}
          onClick={() => run(() => updateRelation(rel.id, { labelMode: "type" }))}
        />
        <Item
          label={t("contextMenu.freeText")}
          active={rel.labelMode === "custom"}
          onClick={() =>
            run(() => {
              const next = window.prompt(t("contextMenu.connectorLabelPrompt"), rel.label ?? "");
              if (next === null) return;
              updateRelation(rel.id, { label: next, labelMode: "custom" });
            })
          }
        />
        <Separator />
        <Section label={t("contextMenu.progressMark")} />
        {PROGRESS_MARKS.map((mark) => (
          <Item
            key={mark}
            label={progressMarkShortLabel(t, mark)}
            hint={PROGRESS_MARK_SHORTCUT[mark]}
            active={normalizeProgressMark(rel.progressMark) === mark}
            leading={
              <span
                className="inline-flex h-4 w-4 items-center justify-center rounded-full"
                style={{
                  backgroundColor: PROGRESS_MARK_STYLE[mark].bg,
                  color: PROGRESS_MARK_STYLE[mark].fg,
                }}
                title={progressMarkLongLabel(t, mark)}
              >
                <ProgressMarkGlyph mark={mark} />
              </span>
            }
            onClick={() =>
              run(() => {
                useStormBoardStore.getState().selectRelation(rel.id);
                applyProgressMark(mark);
              })
            }
          />
        ))}
        {normalizeProgressMark(rel.progressMark) ? (
          <Item
            label={t("contextMenu.clearProgressMark")}
            onClick={() =>
              run(() => {
                useStormBoardStore.getState().selectRelation(rel.id);
                applyProgressMark(normalizeProgressMark(rel.progressMark)!);
              })
            }
          />
        ) : null}
        <Separator />
        <Item
          icon={Trash2}
          label={t("contextMenu.delete")}
          danger
          onClick={() =>
            run(() => {
              deleteRelation(rel.id);
              clearSelection();
            })
          }
        />
      </>
    );
  } else if (target.kind === "contextRelation") {
    const rel = contextRelations.find((r) => r.id === target.id);
    if (!rel) return null;
    body = (
      <>
        <Header title={t("contextMenu.contextMap")} subtitle={contextMapPatternLabel(t, rel.type)} />
        <Section label={t("contextMenu.pattern")} />
        {CONTEXT_PATTERNS.map((pattern) => (
          <Item
            key={pattern}
            label={contextMapPatternLabel(t, pattern)}
            active={rel.type === pattern}
            onClick={() => run(() => updateContextRelation(rel.id, { type: pattern }))}
          />
        ))}
        <Item
          label={t("contextMenu.editLabel")}
          onClick={() =>
            run(() => {
              const next = window.prompt(t("contextMenu.labelPrompt"), rel.label ?? "");
              if (next !== null) updateContextRelation(rel.id, { label: next || undefined });
            })
          }
        />
        <Item
          icon={HelpCircle}
          label={t("contextMenu.help")}
          onClick={() => run(() => onRequestHelpContextMap?.(rel.type))}
        />
        <Separator />
        <Item
          icon={Trash2}
          label={t("contextMenu.delete")}
          danger
          onClick={() =>
            run(() => {
              deleteContextRelation(rel.id);
              clearSelection();
            })
          }
        />
      </>
    );
  } else if (target.kind === "swimlane") {
    const lane = swimlanes.find((l) => l.id === target.id);
    if (!lane) return null;
    body = (
      <>
        <Header title={lane.label} subtitle={t("contextMenu.swimlane")} />
        <Item
          icon={lane.locked ? Unlock : Lock}
          label={lane.locked ? "Entsperren" : "Sperren"}
          onClick={() => run(() => updateSwimlane(lane.id, { locked: !lane.locked }))}
        />
        <Separator />
        <Section label={t("contextMenu.layer")} />
        <Item
          icon={BringToFront}
          label={t("contextMenu.bringToFront")}
          onClick={() => run(() => bringRegionsToFront([lane.id]))}
        />
        <Item
          label={t("contextMenu.forwardOne")}
          onClick={() => run(() => bringRegionsForward([lane.id]))}
        />
        <Item
          label={t("contextMenu.backwardOne")}
          onClick={() => run(() => sendRegionsBackward([lane.id]))}
        />
        <Item
          icon={SendToBack}
          label={t("contextMenu.sendToBack")}
          onClick={() => run(() => sendRegionsToBack([lane.id]))}
        />
        <Separator />
        {renderE2vAiMenu()}
        <Item
          icon={ClipboardCopy}
          label={t("contextMenu.copyToClipboard")}
          onClick={() => run(() => copyToClipboard(clipboardSelectionFromStore()))}
        />
        <Item
          icon={ClipboardList}
          label={t("contextMenu.moveToClipboard")}
          onClick={() => run(() => moveToClipboard(clipboardSelectionFromStore()))}
        />
        <Item
          icon={Trash2}
          label={t("contextMenu.delete")}
          danger
          onClick={() =>
            run(() => {
              deleteSwimlane(lane.id);
              clearSelection();
            })
          }
        />
      </>
    );
  } else if (target.kind === "boundedContext") {
    const bc = boundedContexts.find((b) => b.id === target.id);
    if (!bc) return null;
    const detailView = resolveBoundedContextDetailView(bc, views);
    body = (
      <>
        <Header title={bc.label} subtitle={t("contextMenu.boundedContext")} />
        <Item
          icon={LayoutDashboard}
          label={
            detailView
              ? t("contextMenu.openDetailNamed", { name: detailView.name })
              : t("contextMenu.createDetailView")
          }
          onClick={() => run(() => openBoundedContextView(bc.id))}
        />
        <Item
          icon={bc.locked ? Unlock : Lock}
          label={bc.locked ? "Entsperren" : "Sperren"}
          onClick={() => run(() => updateBoundedContext(bc.id, { locked: !bc.locked }))}
        />
        <Separator />
        <Item
          icon={Link2}
          label={t("contextMenu.connectContextMap")}
          onClick={() =>
            run(() => {
              setContextMapMode(true);
              setContextMapDraftSource(bc.id);
            })
          }
        />
        <Separator />
        <Section label={t("contextMenu.layer")} />
        <Item
          icon={BringToFront}
          label={t("contextMenu.bringToFront")}
          onClick={() => run(() => bringRegionsToFront([bc.id]))}
        />
        <Item
          label={t("contextMenu.forwardOne")}
          onClick={() => run(() => bringRegionsForward([bc.id]))}
        />
        <Item
          label={t("contextMenu.backwardOne")}
          onClick={() => run(() => sendRegionsBackward([bc.id]))}
        />
        <Item
          icon={SendToBack}
          label={t("contextMenu.sendToBack")}
          onClick={() => run(() => sendRegionsToBack([bc.id]))}
        />
        <Separator />
        {renderE2vAiMenu()}
        <Item
          icon={ClipboardCopy}
          label={t("contextMenu.copyToClipboard")}
          onClick={() => run(() => copyToClipboard(clipboardSelectionFromStore()))}
        />
        <Item
          icon={ClipboardList}
          label={t("contextMenu.moveToClipboard")}
          onClick={() => run(() => moveToClipboard(clipboardSelectionFromStore()))}
        />
        <Item
          icon={Trash2}
          label={t("contextMenu.delete")}
          danger
          onClick={() =>
            run(() => {
              deleteBoundedContext(bc.id);
              clearSelection();
            })
          }
        />
      </>
    );
  } else if (target.kind === "measure") {
    const item = selectMeasureItem(views, target.viewId, target.itemId);
    if (!item) return null;
    const pickActive =
      measureHotspotLinkPick?.actionsViewId === target.viewId &&
      measureHotspotLinkPick?.measureId === target.itemId;
    body = (
      <>
        <Header
          title={item.title.trim() || t("actionsView.detail.titlePlaceholder")}
          subtitle={t("contextMenu.measureSubtitle")}
        />
        <Submenu label={t("contextMenu.measureActionTypes")}>
          {ACTION_TYPES.map((type) => (
            <Item
              key={type}
              label={t(`actionsView.actionType.${type}`)}
              active={item.actionType === type}
              onClick={() =>
                run(() =>
                  moveMeasure(target.viewId, target.itemId, item.obligation, type),
                )
              }
            />
          ))}
        </Submenu>
        <Submenu label={t("contextMenu.measureObligations")}>
          {OBLIGATION_LEVELS.map((level) => (
            <Item
              key={level}
              label={t(`actionsView.obligation.${level}`)}
              active={item.obligation === level}
              onClick={() =>
                run(() =>
                  moveMeasure(target.viewId, target.itemId, level, item.actionType),
                )
              }
            />
          ))}
        </Submenu>
        <Submenu label={t("contextMenu.measureStatuses")}>
          {MEASURE_STATUSES.map((status) => (
            <Item
              key={status}
              label={t(`actionsView.status.${status}`)}
              active={item.status === status}
              onClick={() =>
                run(() => updateMeasure(target.viewId, target.itemId, { status }))
              }
            />
          ))}
        </Submenu>
        <Separator />
        <Item
          icon={Target}
          label={
            pickActive
              ? t("actionsView.detail.cancelHotspotPick")
              : t("actionsView.detail.pickHotspotOnCanvas")
          }
          active={pickActive}
          onClick={() =>
            run(() =>
              pickActive
                ? cancelMeasureHotspotPick()
                : beginMeasureHotspotPick(target.viewId, target.itemId),
            )
          }
        />
        {item.targetRef ? (
          <Item
            icon={ExternalLink}
            label={t("actionsView.detail.navigateTarget")}
            onClick={() =>
              run(() =>
                navigateMeasureTarget(item.targetRef!.viewId, item.targetRef!.elementId),
              )
            }
          />
        ) : null}
        <Item
          icon={Copy}
          label={t("actionsView.detail.duplicate")}
          onClick={() => run(() => duplicateMeasure(target.viewId, target.itemId))}
        />
        <Item
          icon={Trash2}
          label={t("actionsView.detail.delete")}
          danger
          onClick={() => run(() => removeMeasure(target.viewId, target.itemId))}
        />
      </>
    );
  } else if (target.kind === "timeline") {
    body = (
      <>
        <Header title={t("contextMenu.timeline")} subtitle={t("contextMenu.timelinePosition")} />
        <Item
          label={t("contextMenu.editStartLabel")}
          onClick={() =>
            run(() => {
              const next = window.prompt(t("contextMenu.startLabelPrompt"), timeline.startLabel ?? t("contextMenu.startDefault"));
              if (next !== null) setTimeline({ startLabel: next });
            })
          }
        />
        <Item
          label={t("contextMenu.editEndLabel")}
          onClick={() =>
            run(() => {
              const next = window.prompt(t("contextMenu.endLabelPrompt"), timeline.endLabel ?? t("contextMenu.endDefault"));
              if (next !== null) setTimeline({ endLabel: next });
            })
          }
        />
        <Item
          label={t("contextMenu.hideTimeline")}
          onClick={() => run(() => setTimeline({ visible: false }))}
        />
      </>
    );
  } else {
    body = (
      <>
        <Header title={t("contextMenu.canvas")} subtitle={t("contextMenu.quickActions")} />
        <Item
          label={t("contextMenu.addElement", {
            type: elementTypeShortLabel(t, paletteType),
          })}
          onClick={() =>
            run(() => addElement(paletteType, target.worldX, target.worldY))
          }
        />
        {clipboard && !isClipboardEmpty(clipboard) && (
          <Item
            icon={ClipboardPaste}
            label={t("contextMenu.pasteClipboard", { count: clipboardItemCount(clipboard) })}
            onClick={() => run(() => pasteClipboardAt(target.worldX, target.worldY))}
          />
        )}
        {renderE2vAiMenu()}
        {timeline.visible === false && (
          <Item
            label={t("contextMenu.showTimeline")}
            onClick={() => run(() => setTimeline({ visible: true }))}
          />
        )}
        <Item label={t("contextMenu.clearSelection")} onClick={() => run(() => clearSelection())} />
      </>
    );
  }

  const layer = isMobile && target.kind === "boundedContext" ? (
    <div
      className="fixed inset-0 z-[1200] flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm"
      role="presentation"
      onClick={() => closeContextMenu()}
    >
      <div
        ref={ref}
        role="menu"
        className="dock-surface max-h-[min(80vh,640px)] w-full max-w-lg overflow-y-auto rounded-t-xl py-2 text-sm text-[var(--text)] shadow-dock"
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.preventDefault()}
      >
        {body}
      </div>
    </div>
  ) : (
    <div
      ref={ref}
      role="menu"
      className="dock-surface fixed z-[1200] min-w-[220px] max-w-[280px] overflow-hidden rounded-dock py-1.5 text-sm text-[var(--text)]"
      style={{ left: pos.left || menu.x, top: pos.top || menu.y }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {body}
    </div>
  );

  return typeof document !== "undefined" ? createPortal(layer, document.body) : layer;
}

type E2vApplyFailureReason = "empty" | "invalid" | "wrong_view" | "not_canvas" | "clipboard_denied";

function e2vApplyFailureAlert(t: ReturnType<typeof useT>, reason: E2vApplyFailureReason) {
  switch (reason) {
    case "empty":
    case "clipboard_denied":
      window.alert(t("alerts.e2vApplyClipboardEmpty"));
      break;
    case "invalid":
      window.alert(t("alerts.e2vApplyInvalid"));
      break;
    case "wrong_view":
      window.alert(t("alerts.e2vApplyWrongView"));
      break;
    case "not_canvas":
      window.alert(t("alerts.e2vApplyNotCanvas"));
      break;
    default:
      window.alert(t("alerts.e2vApplyInvalid"));
  }
}

function E2vSelectionAiMenuItems({
  t,
  run,
  canExtract,
  onCopy,
  onApply,
}: {
  t: ReturnType<typeof useT>;
  run: (fn: () => void) => void;
  canExtract: boolean;
  onCopy: () => Promise<boolean>;
  onApply: () => Promise<{ ok: true } | { ok: false; reason: E2vApplyFailureReason }>;
}) {
  return (
    <>
      <Item
        icon={Wand2}
        label={t("contextMenu.extractForAi")}
        hint={t("contextMenu.extractForAiHint")}
        disabled={!canExtract}
        onClick={() =>
          run(() => {
            void onCopy().then((ok) => {
              if (!ok) window.alert(t("alerts.e2vSelectionExtractFailed"));
            });
          })
        }
      />
      <Item
        icon={ClipboardPaste}
        label={t("contextMenu.applyE2vFromClipboard")}
        hint={t("contextMenu.applyE2vFromClipboardHint")}
        onClick={() =>
          run(() => {
            void onApply().then((result) => {
              if (!result.ok) e2vApplyFailureAlert(t, result.reason);
            });
          })
        }
      />
    </>
  );
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="border-b border-[var(--border)] px-3 pb-2 pt-1.5">
      <p className="truncate text-sm font-semibold tracking-tight">{title}</p>
      <p className="text-[0.72rem] text-[var(--muted)]">{subtitle}</p>
    </div>
  );
}

function Section({ label }: { label: string }) {
  return <p className="group-label px-3 pb-1 pt-2">{label}</p>;
}

function Separator() {
  return <div className="my-1.5 border-t border-[var(--border)]" />;
}

function Item({
  label,
  onClick,
  icon: Icon,
  leading,
  danger,
  disabled,
  active,
  hint,
}: {
  label: string;
  onClick: () => void;
  icon?: typeof Trash2;
  leading?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  active?: boolean;
  hint?: string;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={[
        "flex w-full items-center gap-2 px-3 py-1.5 text-left text-[0.82rem] disabled:opacity-40",
        danger
          ? "text-[#f0a8a0] hover:bg-[#3a2220]"
          : active
            ? "bg-[#1e3a36] text-[#b8f0e6]"
            : "text-[var(--text)] hover:bg-[var(--control-hover)]",
      ].join(" ")}
    >
      {leading ? (
        <span className="flex h-4 w-4 shrink-0 items-center justify-center">{leading}</span>
      ) : Icon ? (
        <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" />
      ) : (
        <span className="w-3.5" />
      )}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {hint ? (
        <span className="shrink-0 text-[0.65rem] text-[var(--muted)]">{hint}</span>
      ) : null}
    </button>
  );
}

function Submenu({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="group border-b border-[var(--border)] last:border-0">
      <summary className="cursor-pointer list-none px-3 py-1.5 text-[0.82rem] text-[var(--muted)] hover:bg-[var(--control-hover)] hover:text-[var(--text)] [&::-webkit-details-marker]:hidden">
        {label} ▸
      </summary>
      <div className="bg-[rgba(0,0,0,0.15)] pb-1">{children}</div>
    </details>
  );
}
