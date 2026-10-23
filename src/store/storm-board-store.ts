import { create } from "zustand";

import { elementDimensions, defaultLabelForType } from "@/lib/element-styles";
import { defaultRelationType } from "@/lib/relation-validation";
import {
  applyContainmentAssignments,
  translateMatchingElements,
} from "@/lib/region-containment";
import {
  buildBoardViewFromBoundedContextPayload,
  extractBoundedContextViewPayload,
  resolveBoundedContextViewNavigation,
} from "@/lib/bounded-context-view";
import {
  buildBoardViewFromBuildingBlock,
  extractBuildingBlockViewPayload,
  resolveBuildingBlockViewNavigation,
} from "@/lib/building-block-view";
import { supportsArchDrilldown } from "@/types/storm-element";
import {
  extractClipboardPayload,
  isClipboardEmpty,
  mergeClipboardPayloads,
  normalizeClipboardPayload,
  remapClipboardForPaste,
  takeIdsFromClipboard,
  type BoardClipboardPayload,
  type ClipboardSelection,
} from "@/lib/board-clipboard";
import {
  bringElementsForward as computeBringForward,
  bringElementsToFront as computeBringToFront,
  bringForward as computeBringRegionsForward,
  bringToFront as computeBringRegionsToFront,
  enforceContainerBehindContents,
  expandZOrderSelection,
  itemZIndex,
  nextElementZIndex,
  nextZIndex,
  regionZOrderItems,
  sendBackward as computeSendRegionsBackward,
  sendElementsBackward as computeSendBackward,
  sendElementsToBack as computeSendToBack,
  sendToBack as computeSendRegionsToBack,
} from "@/lib/element-z-order";
import { generateStormId } from "@/lib/storm-id";
import type { CustomCardType } from "@/lib/custom-card-types";
import {
  colorsFromPreset,
  createDefaultCustomCardTypes,
  CUSTOM_CARD_COLOR_PRESETS,
  DEFAULT_CUSTOM_CARD_COLORS,
} from "@/lib/custom-card-types";
import { findCustomCardType } from "@/lib/custom-card-types";
import type { ProgressMark } from "@/lib/progress-mark";
import { normalizeProgressMark } from "@/lib/progress-mark";

const DUPLICATE_OFFSET_PX = 28;
import { prepareImportedViewsAsNewPages } from "@/lib/board-view-import";
import { normalizeActionItem } from "@/lib/action-items";
import {
  findMeasureForHotspot,
  measureTargetsHotspot,
  patchHotspotMeasuresBacklog,
  type BoardHotspotRef,
} from "@/lib/board-hotspots";
import {
  createEmptyActionsView,
  normalizeMeasureActionItem,
  patchActionsViewInList,
} from "@/lib/architecture-measures";
import type { BoardImportPayload, BoardView } from "@/lib/storm-json";
import {
  createEmptyBoardView,
  isActionsView,
  isCanvasBoardView,
  normalizeBoardDocument,
} from "@/lib/storm-json";
import type {
  ActionType,
  ActionsViewConfig,
  MeasureActionItem,
  ObligationLevel,
} from "@/types/actions-view";
import {
  applyViewToFlatPatch,
  CLEAR_CONNECTOR_FOCUS_PATCH,
  CLEAR_SELECTION_PATCH,
  createInitialViewDocument,
  flushActiveViewIntoViews,
  resolveActiveView,
} from "@/lib/board-views";
import {
  DEFAULT_APPEARANCE,
  type BoardAppearance,
} from "@/lib/board-appearance";
import {
  readElementsPanelOpen,
  readPropertiesPanelOpen,
  writeElementsPanelOpen,
  writePropertiesPanelOpen,
} from "@/lib/board-layout-prefs";
import {
  type BoardDomainSnapshot,
  pushHistory,
  redoHistory,
  undoHistory,
} from "@/lib/board-history";
import type {
  BoundedContext,
  ElementType,
  GlossaryEntry,
  ModelingMode,
  StormElement,
  Swimlane,
  Timeline,
  Viewport,
  WorkshopFormat,
} from "@/types/storm-element";
import {
  defaultPaletteTypeForMode,
  isWorkshopFormatForMode,
} from "@/types/storm-element";
import type {
  ContextMapPattern,
  ContextRelation,
  RelationType,
  StormRelation,
} from "@/types/storm-relation";
import type { ContextMenuState, ContextMenuTarget } from "@/types/context-menu";
import type { ActionItem } from "@/types/action-item";
import type { CanvasLine, LineArrowHead, ViewBookmark } from "@/types/canvas-annotation";
import { normalizeCanvasLine } from "@/lib/canvas-annotations";
import { sanitizeRegionGeometryPatch } from "@/lib/region-style";
import type { BoardConnector, ConnectorEndpoint } from "@/types/board-connector";
import {
  canvasLineToConnector,
  connectorsToLegacy,
  contextRelationToConnector,
  prepareConnectorEndpoints,
  stormRelationToConnector,
  connectorToCanvasLine,
  connectorToContextRelation,
  connectorToStormRelation,
} from "@/lib/board-connector-migrate";

function withConnectors(connectors: BoardConnector[]) {
  const legacy = connectorsToLegacy(connectors);
  return {
    connectors,
    relations: legacy.relations,
    contextRelations: legacy.contextRelations,
    canvasLines: legacy.canvasLines,
  };
}

export interface StormBoardState {
  title: string;
  /** Project-wide: sync active tab in collab when true. */
  workshopMode: boolean;
  activeViewId: string;
  views: BoardView[];
  /** Flat mirror of the active view (canvas). */
  modelingMode: ModelingMode;
  workshopFormat: WorkshopFormat;
  facilitatorEnabled: boolean;
  facilitatorPhase: number;
  elements: StormElement[];
  connectors: BoardConnector[];
  relations: StormRelation[];
  contextRelations: ContextRelation[];
  swimlanes: Swimlane[];
  boundedContexts: BoundedContext[];
  canvasLines: CanvasLine[];
  bookmarks: ViewBookmark[];
  timeline: Timeline;
  viewport: Viewport;
  glossary: GlossaryEntry[];
  actionItems: ActionItem[];
  appearance: BoardAppearance;
  snapToTimeline: boolean;
  snapToGrid: boolean;
  /** Freeform: stereotype definitions for the active view. */
  customCardTypes: CustomCardType[];
  selectedElementIds: string[];
  selectedConnectorId: string | null;
  selectedRelationId: string | null;
  selectedContextRelationId: string | null;
  connectorDraftSource: ConnectorEndpoint | null;
  selectedBoundedContextIds: string[];
  selectedSwimlaneIds: string[];
  /** Ephemeral UI: element that should enter label edit (e.g. after create). */
  editingElementId: string | null;
  paletteType: ElementType;
  /** Ephemeral: which freeform stereotype is selected for placement. */
  paletteCustomTypeId: string | null;
  focusMode: boolean;
  /** Desktop layout: left element palette visible. */
  elementsPanelOpen: boolean;
  /** Desktop layout: right inspector + tools rail visible. */
  propertiesPanelOpen: boolean;
  /** Ephemeral canvas text search (not persisted / not undo). */
  searchQuery: string;
  /** When true, non-selected elements are faded on the canvas (like search). */
  selectionFilterEnabled: boolean;
  relationMode: boolean;
  relationDraftSourceId: string | null;
  contextMapMode: boolean;
  contextMapDraftSourceId: string | null;
  lineDrawMode: boolean;
  lineArrowHead: LineArrowHead;
  selectedCanvasLineId: string | null;
  contextMenu: ContextMenuState | null;
  /** Ephemeral cut buffer (not persisted / not in undo domain snapshot as separate field — cut is undoable via board state). */
  clipboard: BoardClipboardPayload | null;
  clipboardDropHighlight: boolean;
  /** Pick a canvas hotspot to link the open measure (ephemeral). */
  measureHotspotLinkPick: { actionsViewId: string; measureId: string } | null;

  /** Undo stacks (not persisted). */
  past: BoardDomainSnapshot[];
  future: BoardDomainSnapshot[];
  gestureActive: boolean;
  gestureSnapshotTaken: boolean;

  setTitle: (title: string) => void;
  setWorkshopMode: (enabled: boolean) => void;
  setActiveView: (id: string) => void;
  addView: (name?: string, modelingMode?: ModelingMode) => string;
  addActionsView: (name?: string) => string;
  renameView: (id: string, name: string) => void;
  duplicateView: (id: string) => string | null;
  deleteView: (id: string) => boolean;
  setModelingMode: (mode: ModelingMode) => void;
  setWorkshopFormat: (format: WorkshopFormat) => void;
  setFacilitatorEnabled: (enabled: boolean) => void;
  setFacilitatorPhase: (phase: number) => void;
  nextFacilitatorPhase: () => void;
  prevFacilitatorPhase: () => void;
  setViewport: (viewport: Viewport) => void;
  setSnapToTimeline: (v: boolean) => void;
  setSnapToGrid: (v: boolean) => void;
  setAppearance: (patch: Partial<BoardAppearance>) => void;
  setPaletteType: (type: ElementType) => void;
  setPaletteCustomTypeId: (id: string | null) => void;
  setFocusMode: (enabled: boolean) => void;
  setElementsPanelOpen: (open: boolean) => void;
  setPropertiesPanelOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  setSelectionFilterEnabled: (enabled: boolean) => void;
  setClipboardDropHighlight: (active: boolean) => void;
  /** Cut selection into the board clipboard (removes from canvas). */
  moveToClipboard: (selection: ClipboardSelection | string[]) => boolean;
  /** Copy selection into the board clipboard (keeps originals). */
  copyToClipboard: (selection: ClipboardSelection | string[]) => boolean;
  /** Duplicate selection in place with a slight offset. */
  duplicateElements: (ids: string[]) => string[];
  pasteClipboardAt: (worldX: number, worldY: number) => string[];
  /** Paste subset from clipboard onto the board and remove those items from the clipboard. */
  takeClipboardElementsAt: (ids: string[], worldX: number, worldY: number) => string[];
  clearClipboard: () => void;
  selectElement: (id: string | null, additive?: boolean) => void;
  setSelectedElementIds: (ids: string[], additive?: boolean) => void;
  /** Marquee / multi-select including regions. */
  setCanvasSelection: (
    selection: {
      elementIds?: string[];
      swimlaneIds?: string[];
      boundedContextIds?: string[];
    },
    additive?: boolean,
  ) => void;
  selectRelation: (id: string | null) => void;
  selectContextRelation: (id: string | null) => void;
  selectBoundedContext: (id: string | null, additive?: boolean) => void;
  selectSwimlane: (id: string | null, additive?: boolean) => void;
  clearSelection: () => void;
  openContextMenu: (x: number, y: number, target: ContextMenuTarget) => void;
  closeContextMenu: () => void;
  /** Clear the pending auto-edit request (card consumes it). */
  clearEditingElementId: () => void;

  beginGesture: () => void;
  endGesture: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  addElement: (
    type: ElementType,
    x: number,
    y: number,
    label?: string,
    options?: { customTypeId?: string },
  ) => string;
  addCustomCardType: (partial?: Partial<Pick<CustomCardType, "name" | "fill" | "stroke" | "ink">>) => string;
  updateCustomCardType: (
    id: string,
    patch: Partial<Pick<CustomCardType, "name" | "fill" | "stroke" | "ink">>,
  ) => void;
  deleteCustomCardType: (id: string) => void;
  updateElement: (id: string, patch: Partial<StormElement>) => void;
  deleteElement: (id: string) => void;
  moveElement: (id: string, x: number, y: number) => void;
  moveElements: (updates: Array<{ id: string; x: number; y: number }>) => void;
  /** Move stickies + regions in one undo step (marquee / multi-select drag). */
  moveCanvasSelection: (updates: {
    elements?: Array<{ id: string; x: number; y: number }>;
    swimlanes?: Array<{ id: string; x: number; y: number }>;
    boundedContexts?: Array<{ id: string; x: number; y: number }>;
  }) => void;
  patchElements: (
    updates: Array<{
      id: string;
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      zIndex?: number;
      rotation?: number;
    }>,
  ) => void;
  bringElementsToFront: (ids: string[]) => void;
  sendElementsToBack: (ids: string[]) => void;
  bringElementsForward: (ids: string[]) => void;
  sendElementsBackward: (ids: string[]) => void;

  addRelation: (sourceId: string, targetId: string, type?: RelationType, label?: string) => string | null;
  updateRelation: (id: string, patch: Partial<StormRelation>) => void;
  deleteRelation: (id: string) => void;
  /** Toggle progress mark on selected stickies and/or selected connector (Ctrl+1/2/3). */
  applyProgressMark: (mark: ProgressMark) => void;
  setRelationMode: (enabled: boolean) => void;
  /** Alias: one tool for click-connect, region-connect, and drag lines. */
  setConnectorMode: (enabled: boolean) => void;
  setRelationDraftSource: (id: string | null) => void;
  connectElements: (sourceId: string, targetId: string) => string | null;
  connectEndpoints: (source: ConnectorEndpoint, target: ConnectorEndpoint) => string | null;
  updateConnector: (id: string, patch: Partial<BoardConnector>) => void;
  deleteConnector: (id: string) => void;
  selectConnector: (id: string | null) => void;
  reconnectConnector: (
    connectorId: string,
    endpoint: "source" | "target",
    attach: ConnectorEndpoint,
  ) => boolean;
  setConnectorDraftSource: (source: ConnectorEndpoint | null) => void;
  reconnectRelation: (
    relationId: string,
    endpoint: "source" | "target",
    elementId: string,
  ) => boolean;

  addContextRelation: (
    sourceContextId: string,
    targetContextId: string,
    type?: ContextMapPattern,
    label?: string,
  ) => string | null;
  updateContextRelation: (id: string, patch: Partial<ContextRelation>) => void;
  deleteContextRelation: (id: string) => void;
  setContextMapMode: (enabled: boolean) => void;
  setContextMapDraftSource: (id: string | null) => void;
  connectBoundedContexts: (sourceContextId: string, targetContextId: string) => string | null;
  reconnectContextRelation: (
    relationId: string,
    endpoint: "source" | "target",
    boundedContextId: string,
  ) => boolean;

  setLineDrawMode: (enabled: boolean) => void;
  setLineArrowHead: (head: LineArrowHead) => void;
  addCanvasLine: (line: Omit<CanvasLine, "id"> & { id?: string }) => string | null;
  updateCanvasLine: (id: string, patch: Partial<Omit<CanvasLine, "id">>) => void;
  deleteCanvasLine: (id: string) => void;
  selectCanvasLine: (id: string | null) => void;
  addBookmark: (name: string) => string | null;
  updateBookmark: (id: string, patch: Partial<Pick<ViewBookmark, "name" | "viewport">>) => void;
  deleteBookmark: (id: string) => void;
  jumpToBookmark: (id: string) => boolean;

  addSwimlane: (label?: string) => string;
  updateSwimlane: (id: string, patch: Partial<Swimlane>, options?: { moveElementIds?: string[] }) => void;
  deleteSwimlane: (id: string) => void;

  addBoundedContext: (x: number, y: number, width: number, height: number, label?: string) => string;
  updateBoundedContext: (
    id: string,
    patch: Partial<BoundedContext>,
    options?: { moveElementIds?: string[] },
  ) => void;
  deleteBoundedContext: (id: string) => void;
  /** Open linked detail view or create one from BC contents (with direct external refs). */
  openBoundedContextView: (bcId: string) => string | null;
  /** Navigate to the parent overview when this BC is a copy inside a detail view. */
  openBoundedContextParentView: (bcId: string) => string | null;
  /** Navigate down to detail view or up to parent overview when a link exists. */
  navigateBoundedContextViewLink: (bcId: string) => string | null;

  /** Open or create architecture detail view (C4 zoom / Blackbox→Whitebox). */
  openBuildingBlockView: (elementId: string) => string | null;
  openBuildingBlockParentView: (elementId: string) => string | null;
  navigateBuildingBlockViewLink: (elementId: string) => string | null;

  /** Shared z-order among swimlanes and bounded contexts. */
  bringRegionsToFront: (ids: string[]) => void;
  sendRegionsToBack: (ids: string[]) => void;
  bringRegionsForward: (ids: string[]) => void;
  sendRegionsBackward: (ids: string[]) => void;

  setTimeline: (timeline: Partial<Timeline>) => void;
  addGlossaryEntry: (term: string, definition: string) => void;
  updateGlossaryEntry: (term: string, definition: string) => void;
  deleteGlossaryEntry: (term: string) => void;

  addActionItem: (
    item: Omit<ActionItem, "id"> & { id?: string },
  ) => string | null;
  updateActionItem: (id: string, patch: Partial<Omit<ActionItem, "id">>) => void;
  deleteActionItem: (id: string) => void;

  /** Selected architecture measure in an actions view (not persisted separately). */
  selectedMeasureId: string | null;
  selectMeasure: (id: string | null) => void;
  addMeasureActionItem: (
    viewId: string,
    item?: Partial<Omit<MeasureActionItem, "id" | "createdAt" | "updatedAt">>,
  ) => string;
  /** Create a measure linked to a board hotspot, or return existing measure id. */
  addMeasureFromHotspot: (actionsViewId: string, hotspot: BoardHotspotRef) => string | null;
  linkMeasureToCanvasHotspot: (
    actionsViewId: string,
    measureId: string,
    hotspotViewId: string,
    hotspotElementId: string,
    hotspotViewName: string,
    hotspotLabel: string,
  ) => void;
  setHotspotMeasuresBacklogHidden: (
    actionsViewId: string,
    hotspotViewId: string,
    hotspotElementId: string,
    hidden: boolean,
  ) => void;
  beginMeasureHotspotLinkPick: (actionsViewId: string, measureId: string) => void;
  cancelMeasureHotspotLinkPick: () => void;
  completeMeasureHotspotLinkPick: (hotspotElementId: string) => boolean;
  updateMeasureActionItem: (
    viewId: string,
    itemId: string,
    patch: Partial<Omit<MeasureActionItem, "id" | "createdAt">>,
  ) => void;
  removeMeasureActionItem: (viewId: string, itemId: string) => void;
  duplicateMeasureActionItem: (viewId: string, itemId: string) => string | null;
  moveMeasureActionItem: (
    viewId: string,
    itemId: string,
    targetObligation: ObligationLevel,
    targetActionType: ActionType,
  ) => void;
  updateActionsViewConfig: (viewId: string, patch: Partial<ActionsViewConfig>) => void;
  /** Switch tab and focus a canvas sticky from a measure link. */
  navigateToMeasureTarget: (viewId: string, elementId: string) => void;

  replaceBoardFromImport: (payload: BoardImportPayload) => void;
  /**
   * Append views from an imported E2 document as new tabs.
   * Keeps open-document globals (title, appearance, glossary, workshopMode).
   */
  importDocumentAsNewViews: (payload: BoardImportPayload) => {
    ok: true;
    viewIds: string[];
    activeViewId: string;
  } | { ok: false; error: string };
}

/** Containment assignment + keep stacking containers behind their contents. */
function settleElements(
  elements: StormElement[],
  swimlanes: Swimlane[],
  boundedContexts: BoundedContext[],
): StormElement[] {
  return enforceContainerBehindContents(
    applyContainmentAssignments(elements, swimlanes, boundedContexts),
  );
}

function createElement(
  type: ElementType,
  x: number,
  y: number,
  label?: string,
  zIndex = 0,
  options?: { customTypeId?: string; customTypeName?: string },
): StormElement {
  const dims = elementDimensions(type);
  const customLabel =
    type === "customCard" && options?.customTypeName
      ? options.customTypeName
      : undefined;
  return {
    id: generateStormId(),
    type,
    label:
      label ??
      customLabel ??
      (type === "instruction" ? "Umsetzungsaspekt…" : defaultLabelForType(type)),
    x,
    y,
    width: dims.width,
    height: dims.height,
    zIndex,
    rotation: type === "hotspot" ? 45 : undefined,
    metadata: type === "hotspot"
      ? { hotspotStatus: "open", hotspotPriority: "medium" }
      : type === "note"
        ? { noteColor: "cream" }
        : type === "customCard"
          ? { customTypeId: options?.customTypeId }
          : type === "subdomain"
            ? { subdomainKind: "core" }
            : type === "valueObject"
              ? { immutable: true }
              : type === "domainService"
                ? { stateless: true }
                : type === "question"
                  ? { questionStatus: "open" }
                  : type === "userStory"
                    ? { storyPriority: "must" }
                    : type === "processGateway"
                      ? { gatewayKind: "xor" }
                      : type === "dataAssociation"
                        ? { dataCardinality: "1:n" }
                        : type === "link"
                            ? { linkKind: "external" }
                            : undefined,
  };
}

function captureDomain(s: StormBoardState): BoardDomainSnapshot {
  return {
    title: s.title,
    glossary: s.glossary,
    actionItems: s.actionItems,
    bookmarks: s.bookmarks,
    appearance: s.appearance,
    workshopMode: s.workshopMode,
    activeViewId: s.activeViewId,
    views: flushActiveViewIntoViews(s),
  };
}

function domainPatch(snap: BoardDomainSnapshot): Partial<StormBoardState> {
  const views = snap.views.length
    ? snap.views
    : [createEmptyBoardView({ id: generateStormId(), name: "Board" })];
  const active = resolveActiveView(views, snap.activeViewId);
  return {
    title: snap.title,
    glossary: snap.glossary,
    actionItems: snap.actionItems,
    bookmarks: snap.bookmarks,
    appearance: snap.appearance,
    workshopMode: snap.workshopMode,
    activeViewId: active.id,
    views,
    ...applyViewToFlatPatch(active),
    ...CLEAR_SELECTION_PATCH,
  };
}

const initialViewDoc = createInitialViewDocument("Neues Event Storming Board");

type SetFn = (
  partial:
    | Partial<StormBoardState>
    | ((state: StormBoardState) => Partial<StormBoardState> | StormBoardState),
) => void;
type GetFn = () => StormBoardState;

function applyRegionZPatches(
  set: SetFn,
  get: GetFn,
  patches: Array<{ id: string; zIndex: number }>,
): void {
  if (patches.length === 0) return;
  const byId = new Map(patches.map((p) => [p.id, p.zIndex]));
  commit(set, get, (s) => {
    let swimlanesChanged = false;
    let bcsChanged = false;
    const swimlanes = s.swimlanes.map((lane) => {
      const z = byId.get(lane.id);
      if (z === undefined || lane.zIndex === z) return lane;
      swimlanesChanged = true;
      return { ...lane, zIndex: z };
    });
    const boundedContexts = s.boundedContexts.map((bc) => {
      const z = byId.get(bc.id);
      if (z === undefined || bc.zIndex === z) return bc;
      bcsChanged = true;
      return { ...bc, zIndex: z };
    });
    if (!swimlanesChanged && !bcsChanged) return {};
    return {
      ...(swimlanesChanged ? { swimlanes } : {}),
      ...(bcsChanged ? { boundedContexts } : {}),
    };
  });
}

/** Apply a domain mutation, pushing history once (or once per gesture). */
function commit(
  set: SetFn,
  get: GetFn,
  updater: (s: StormBoardState) => Partial<StormBoardState>,
): void {
  const s = get();
  const needsPush = !s.gestureActive || !s.gestureSnapshotTaken;
  if (needsPush) {
    const past = pushHistory(s.past, captureDomain(s));
    const patch = updater(s);
    set({
      ...patch,
      past,
      future: [],
      gestureSnapshotTaken: s.gestureActive ? true : s.gestureSnapshotTaken,
    });
  } else {
    set(updater(s));
  }
}

export const useStormBoardStore = create<StormBoardState>((set, get) => ({
  title: "Neues Event Storming Board",
  workshopMode: false,
  activeViewId: initialViewDoc.activeViewId,
  views: initialViewDoc.views,
  modelingMode: initialViewDoc.modelingMode,
  workshopFormat: initialViewDoc.workshopFormat,
  facilitatorEnabled: initialViewDoc.facilitatorEnabled,
  facilitatorPhase: initialViewDoc.facilitatorPhase,
  elements: initialViewDoc.elements,
  connectors: initialViewDoc.connectors,
  relations: initialViewDoc.relations,
  contextRelations: initialViewDoc.contextRelations,
  swimlanes: initialViewDoc.swimlanes,
  boundedContexts: initialViewDoc.boundedContexts,
  canvasLines: initialViewDoc.canvasLines,
  bookmarks: [],
  timeline: initialViewDoc.timeline,
  viewport: initialViewDoc.viewport,
  glossary: [],
  actionItems: [],
  appearance: { ...DEFAULT_APPEARANCE },
  snapToTimeline: initialViewDoc.snapToTimeline,
  snapToGrid: initialViewDoc.snapToGrid,
  customCardTypes: initialViewDoc.customCardTypes ?? [],
  selectedElementIds: [],
  selectedConnectorId: null,
  selectedRelationId: null,
  selectedContextRelationId: null,
  connectorDraftSource: null,
  selectedBoundedContextIds: [],
  selectedSwimlaneIds: [],
  editingElementId: null,
  paletteType: defaultPaletteTypeForMode(initialViewDoc.modelingMode),
  paletteCustomTypeId: null,
  focusMode: false,
  elementsPanelOpen: readElementsPanelOpen(),
  propertiesPanelOpen: readPropertiesPanelOpen(),
  searchQuery: "",
  selectionFilterEnabled: false,
  relationMode: false,
  relationDraftSourceId: null,
  contextMapMode: false,
  contextMapDraftSourceId: null,
  lineDrawMode: false,
  lineArrowHead: "end",
  selectedCanvasLineId: null,
  contextMenu: null,
  clipboard: null,
  clipboardDropHighlight: false,
  measureHotspotLinkPick: null,
  selectedMeasureId: null,
  past: [],
  future: [],
  gestureActive: false,
  gestureSnapshotTaken: false,

  setTitle: (title) => commit(set, get, () => ({ title })),
  setWorkshopMode: (workshopMode) => commit(set, get, () => ({ workshopMode })),

  setActiveView: (id) => {
    const s = get();
    if (id === s.activeViewId || !s.views.some((v) => v.id === id)) return;
    const views = flushActiveViewIntoViews(s);
    const next = resolveActiveView(views, id);
    set({
      views,
      activeViewId: next.id,
      ...applyViewToFlatPatch(next),
      ...CLEAR_SELECTION_PATCH,
      selectedMeasureId: null,
      measureHotspotLinkPick: null,
      past: [],
      future: [],
      gestureActive: false,
      gestureSnapshotTaken: false,
    });
  },

  addView: (name, modelingModeOverride) => {
    let createdId = "";
    commit(set, get, (s) => {
      const views = flushActiveViewIntoViews(s);
      createdId = generateStormId();
      const modelingMode = modelingModeOverride ?? s.modelingMode;
      const view = createEmptyBoardView({
        id: createdId,
        name: name?.trim() || `Sicht ${views.length + 1}`,
        modelingMode,
        workshopFormat: isWorkshopFormatForMode(s.workshopFormat, modelingMode)
          ? s.workshopFormat
          : "free",
      });
      return {
        views: [...views, view],
        activeViewId: createdId,
        ...applyViewToFlatPatch(view),
        ...CLEAR_SELECTION_PATCH,
        selectedMeasureId: null,
      };
    });
    return createdId;
  },

  addActionsView: (name) => {
    let createdId = "";
    commit(set, get, (s) => {
      const views = flushActiveViewIntoViews(s);
      createdId = generateStormId();
      const view = createEmptyActionsView({
        id: createdId,
        name: name?.trim() || `Maßnahmen ${views.length + 1}`,
      });
      return {
        views: [...views, view],
        activeViewId: createdId,
        ...applyViewToFlatPatch(view),
        ...CLEAR_SELECTION_PATCH,
        selectedMeasureId: null,
      };
    });
    return createdId;
  },

  renameView: (id, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    commit(set, get, (s) => {
      const views = flushActiveViewIntoViews(s).map((v) =>
        v.id === id ? { ...v, name: trimmed } : v,
      );
      return { views };
    });
  },

  duplicateView: (id) => {
    let createdId: string | null = null;
    commit(set, get, (s) => {
      const views = flushActiveViewIntoViews(s);
      const source = views.find((v) => v.id === id);
      if (!source) return {};
      createdId = generateStormId();
      const copy = structuredClone(source);
      copy.id = createdId;
      copy.name = `${source.name} Kopie`;
      return {
        views: [...views, copy],
        activeViewId: createdId,
        ...applyViewToFlatPatch(copy),
        ...CLEAR_SELECTION_PATCH,
      };
    });
    return createdId;
  },

  deleteView: (id) => {
    const s = get();
    if (s.views.length <= 1) return false;
    if (!s.views.some((v) => v.id === id)) return false;
    commit(set, get, (state) => {
      const views = flushActiveViewIntoViews(state).filter((v) => v.id !== id);
      const nextActive =
        state.activeViewId === id
          ? views[0]!
          : resolveActiveView(views, state.activeViewId);
      return {
        views,
        activeViewId: nextActive.id,
        bookmarks: state.bookmarks.filter((bookmark) => bookmark.viewId !== id),
        ...applyViewToFlatPatch(nextActive),
        ...CLEAR_SELECTION_PATCH,
      };
    });
    return true;
  },

  setModelingMode: (modelingMode) =>
    commit(set, get, (s) => {
      const workshopFormat = isWorkshopFormatForMode(s.workshopFormat, modelingMode)
        ? s.workshopFormat
        : "free";
      let customCardTypes = s.customCardTypes;
      let paletteCustomTypeId = s.paletteCustomTypeId;
      if (modelingMode === "freeform") {
        if (customCardTypes.length === 0) {
          customCardTypes = createDefaultCustomCardTypes();
        }
        paletteCustomTypeId = customCardTypes[0]?.id ?? null;
      } else {
        paletteCustomTypeId = null;
      }
      return {
        modelingMode,
        workshopFormat,
        facilitatorPhase: 0,
        facilitatorEnabled: workshopFormat === "free" ? false : s.facilitatorEnabled,
        paletteType: defaultPaletteTypeForMode(modelingMode),
        customCardTypes,
        paletteCustomTypeId,
      };
    }),
  setWorkshopFormat: (workshopFormat) =>
    commit(set, get, () => ({ workshopFormat, facilitatorPhase: 0 })),
  setFacilitatorEnabled: (facilitatorEnabled) =>
    commit(set, get, () => ({ facilitatorEnabled })),
  setFacilitatorPhase: (facilitatorPhase) => commit(set, get, () => ({ facilitatorPhase })),
  nextFacilitatorPhase: () =>
    commit(set, get, (s) => ({ facilitatorPhase: s.facilitatorPhase + 1 })),
  prevFacilitatorPhase: () =>
    commit(set, get, (s) => ({ facilitatorPhase: Math.max(0, s.facilitatorPhase - 1) })),
  setViewport: (viewport) => set({ viewport }),
  setSnapToTimeline: (snapToTimeline) => commit(set, get, () => ({ snapToTimeline })),
  setSnapToGrid: (snapToGrid) => commit(set, get, () => ({ snapToGrid })),
  setAppearance: (patch) =>
    commit(set, get, (s) => ({ appearance: { ...s.appearance, ...patch } })),
  setPaletteType: (paletteType) => set({ paletteType }),
  setPaletteCustomTypeId: (paletteCustomTypeId) => set({ paletteCustomTypeId }),
  setFocusMode: (focusMode) => set({ focusMode }),
  setElementsPanelOpen: (elementsPanelOpen) => {
    writeElementsPanelOpen(elementsPanelOpen);
    set({ elementsPanelOpen });
  },
  setPropertiesPanelOpen: (propertiesPanelOpen) => {
    writePropertiesPanelOpen(propertiesPanelOpen);
    set({ propertiesPanelOpen });
  },
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectionFilterEnabled: (selectionFilterEnabled) => set({ selectionFilterEnabled }),
  setClipboardDropHighlight: (clipboardDropHighlight) => set({ clipboardDropHighlight }),

  moveToClipboard: (selection) => {
    const sel = Array.isArray(selection) ? { elementIds: selection } : selection;
    const elementIds = Array.from(new Set(sel.elementIds ?? []));
    const swimlaneIds = Array.from(new Set(sel.swimlaneIds ?? []));
    const boundedContextIds = Array.from(new Set(sel.boundedContextIds ?? []));
    if (elementIds.length === 0 && swimlaneIds.length === 0 && boundedContextIds.length === 0) {
      return false;
    }
    let ok = false;
    commit(set, get, (s) => {
      const extracted = extractClipboardPayload(
        s.elements,
        s.relations,
        { elementIds, swimlaneIds, boundedContextIds },
        s.swimlanes,
        s.boundedContexts,
        s.contextRelations,
      );
      if (!extracted) return {};
      ok = true;
      const elSet = new Set(elementIds);
      const laneSet = new Set(swimlaneIds);
      const bcSet = new Set(boundedContextIds);
      return {
        clipboard: mergeClipboardPayloads(s.clipboard, extracted),
        clipboardDropHighlight: false,
        elements: s.elements
          .filter((e) => !elSet.has(e.id))
          .map((e) => ({
            ...e,
            swimlaneId: e.swimlaneId && laneSet.has(e.swimlaneId) ? undefined : e.swimlaneId,
            boundedContextId:
              e.boundedContextId && bcSet.has(e.boundedContextId) ? undefined : e.boundedContextId,
            aggregateId: e.aggregateId && elSet.has(e.aggregateId) ? undefined : e.aggregateId,
            subdomainId: e.subdomainId && elSet.has(e.subdomainId) ? undefined : e.subdomainId,
          })),
        relations: s.relations.filter(
          (r) => !elSet.has(r.sourceId) && !elSet.has(r.targetId),
        ),
        swimlanes: s.swimlanes.filter((l) => !laneSet.has(l.id)),
        boundedContexts: s.boundedContexts.filter((b) => !bcSet.has(b.id)),
        contextRelations: s.contextRelations.filter(
          (r) => !bcSet.has(r.sourceContextId) && !bcSet.has(r.targetContextId),
        ),
        selectedElementIds: [],
        selectedRelationId: null,
        selectedContextRelationId: null,
        selectedBoundedContextIds: [],
        selectedSwimlaneIds: [],
      };
    });
    return ok;
  },

  copyToClipboard: (selection) => {
    const sel = Array.isArray(selection) ? { elementIds: selection } : selection;
    const s = get();
    const extracted = extractClipboardPayload(
      s.elements,
      s.relations,
      sel,
      s.swimlanes,
      s.boundedContexts,
      s.contextRelations,
    );
    if (!extracted) return false;
    set({ clipboard: mergeClipboardPayloads(s.clipboard, extracted) });
    return true;
  },

  duplicateElements: (ids) => {
    const unique = Array.from(new Set(ids));
    if (unique.length === 0) return [];
    let newIds: string[] = [];
    commit(set, get, (s) => {
      const extracted = extractClipboardPayload(s.elements, s.relations, unique);
      if (!extracted) return {};
      const remapped = remapClipboardForPaste(
        extracted,
        extracted.originX + DUPLICATE_OFFSET_PX,
        extracted.originY + DUPLICATE_OFFSET_PX,
      );
      let z = nextElementZIndex(s.elements);
      const elementsWithZ = remapped.elements.map((el) => ({
        ...el,
        zIndex: z++,
      }));
      newIds = remapped.newIds;
      const elements = settleElements(
        [...s.elements, ...elementsWithZ],
        s.swimlanes,
        s.boundedContexts,
      );
      return {
        elements,
        relations: [...s.relations, ...remapped.relations],
        selectedElementIds: remapped.newIds,
        selectedRelationId: null,
        selectedContextRelationId: null,
        selectedBoundedContextIds: [],
        selectedSwimlaneIds: [],
      };
    });
    return newIds;
  },

  pasteClipboardAt: (worldX, worldY) => {
    const payload = normalizeClipboardPayload(get().clipboard);
    if (!payload || isClipboardEmpty(payload)) return [];
    let newIds: string[] = [];
    commit(set, get, (s) => {
      const remapped = remapClipboardForPaste(payload, worldX, worldY);
      newIds = remapped.newIds;
      let regionZ = nextZIndex(regionZOrderItems(s.swimlanes, s.boundedContexts));
      const swimlanes = [
        ...s.swimlanes,
        ...remapped.swimlanes.map((lane) => ({ ...lane, zIndex: regionZ++ })),
      ];
      const boundedContexts = [
        ...s.boundedContexts,
        ...remapped.boundedContexts.map((bc) => ({ ...bc, zIndex: regionZ++ })),
      ];
      let z = nextElementZIndex(s.elements);
      const pastedElements = remapped.elements.map((el) => ({
        ...el,
        zIndex: z++,
      }));
      const elements = settleElements(
        [...s.elements, ...pastedElements],
        swimlanes,
        boundedContexts,
      );
      return {
        elements,
        relations: [...s.relations, ...remapped.relations],
        swimlanes,
        boundedContexts,
        contextRelations: [...s.contextRelations, ...remapped.contextRelations],
        selectedElementIds: remapped.newIds,
        selectedRelationId: null,
        selectedContextRelationId: null,
        selectedBoundedContextIds: remapped.newBoundedContextIds,
        selectedSwimlaneIds: remapped.newSwimlaneIds,
      };
    });
    return newIds;
  },

  takeClipboardElementsAt: (ids, worldX, worldY) => {
    const payload = normalizeClipboardPayload(get().clipboard);
    if (!payload) return [];
    const { taken, remaining } = takeIdsFromClipboard(payload, ids);
    if (!taken) return [];
    let newIds: string[] = [];
    commit(set, get, (s) => {
      const remapped = remapClipboardForPaste(taken, worldX, worldY);
      newIds = remapped.newIds;
      let z = nextElementZIndex(s.elements);
      const pastedElements = remapped.elements.map((el) => ({
        ...el,
        zIndex: z++,
      }));
      const elements = settleElements(
        [...s.elements, ...pastedElements],
        s.swimlanes,
        s.boundedContexts,
      );
      return {
        clipboard: remaining,
        elements,
        relations: [...s.relations, ...remapped.relations],
        selectedElementIds: remapped.newIds,
        selectedRelationId: null,
        selectedContextRelationId: null,
        selectedBoundedContextIds: [],
        selectedSwimlaneIds: [],
      };
    });
    return newIds;
  },

  clearClipboard: () => set({ clipboard: null, clipboardDropHighlight: false }),

  selectElement: (id, additive) =>
    set((s) => {
      if (!id) {
        return {
          selectedElementIds: [],
          ...CLEAR_CONNECTOR_FOCUS_PATCH,
          editingElementId: null,
        };
      }
      if (additive) {
        const exists = s.selectedElementIds.includes(id);
        const selectedElementIds = exists
          ? s.selectedElementIds.filter((x) => x !== id)
          : [...s.selectedElementIds, id];
        return {
          selectedElementIds,
          ...CLEAR_CONNECTOR_FOCUS_PATCH,
          selectedBoundedContextIds: [],
          selectedSwimlaneIds: [],
          editingElementId:
            s.editingElementId && selectedElementIds.includes(s.editingElementId)
              ? s.editingElementId
              : null,
        };
      }
      return {
        selectedElementIds: [id],
        ...CLEAR_CONNECTOR_FOCUS_PATCH,
        selectedBoundedContextIds: [],
        selectedSwimlaneIds: [],
        editingElementId: s.editingElementId === id ? s.editingElementId : null,
      };
    }),

  setSelectedElementIds: (ids, additive) =>
    set((s) => {
      const next = additive
        ? Array.from(new Set([...s.selectedElementIds, ...ids]))
        : ids;
      return {
        selectedElementIds: next,
        ...CLEAR_CONNECTOR_FOCUS_PATCH,
        selectedBoundedContextIds: [],
        selectedSwimlaneIds: [],
        editingElementId:
          s.editingElementId && next.includes(s.editingElementId)
            ? s.editingElementId
            : null,
      };
    }),

  setCanvasSelection: (selection, additive) =>
    set((s) => {
      const elementIds = selection.elementIds ?? [];
      const swimlaneIds = selection.swimlaneIds ?? [];
      const boundedContextIds = selection.boundedContextIds ?? [];
      if (additive) {
        return {
          selectedElementIds: Array.from(new Set([...s.selectedElementIds, ...elementIds])),
          selectedSwimlaneIds: Array.from(new Set([...s.selectedSwimlaneIds, ...swimlaneIds])),
          selectedBoundedContextIds: Array.from(
            new Set([...s.selectedBoundedContextIds, ...boundedContextIds]),
          ),
          ...CLEAR_CONNECTOR_FOCUS_PATCH,
          editingElementId: null,
        };
      }
      return {
        selectedElementIds: elementIds,
        selectedSwimlaneIds: swimlaneIds,
        selectedBoundedContextIds: boundedContextIds,
        ...CLEAR_CONNECTOR_FOCUS_PATCH,
        editingElementId: null,
      };
    }),

  selectRelation: (id) =>
    set({
      ...CLEAR_CONNECTOR_FOCUS_PATCH,
      selectedRelationId: id,
      selectedConnectorId: id,
      selectedElementIds: id ? [] : get().selectedElementIds,
      selectedBoundedContextIds: [],
      selectedSwimlaneIds: [],
    }),

  selectContextRelation: (id) =>
    set({
      ...CLEAR_CONNECTOR_FOCUS_PATCH,
      selectedContextRelationId: id,
      selectedConnectorId: id,
      selectedElementIds: id ? [] : get().selectedElementIds,
      selectedBoundedContextIds: [],
      selectedSwimlaneIds: [],
    }),

  selectBoundedContext: (id, additive) =>
    set((s) => {
      if (!id) {
        return { selectedBoundedContextIds: [] };
      }
      if (additive) {
        const exists = s.selectedBoundedContextIds.includes(id);
        return {
          selectedBoundedContextIds: exists
            ? s.selectedBoundedContextIds.filter((x) => x !== id)
            : [...s.selectedBoundedContextIds, id],
          selectedElementIds: [],
          ...CLEAR_CONNECTOR_FOCUS_PATCH,
          selectedSwimlaneIds: [],
        };
      }
      return {
        selectedBoundedContextIds: [id],
        selectedElementIds: [],
        ...CLEAR_CONNECTOR_FOCUS_PATCH,
        selectedSwimlaneIds: [],
      };
    }),

  selectSwimlane: (id, additive) =>
    set((s) => {
      if (!id) {
        return { selectedSwimlaneIds: [] };
      }
      if (additive) {
        const exists = s.selectedSwimlaneIds.includes(id);
        return {
          selectedSwimlaneIds: exists
            ? s.selectedSwimlaneIds.filter((x) => x !== id)
            : [...s.selectedSwimlaneIds, id],
          selectedElementIds: [],
          ...CLEAR_CONNECTOR_FOCUS_PATCH,
          selectedBoundedContextIds: [],
        };
      }
      return {
        selectedSwimlaneIds: [id],
        selectedElementIds: [],
        ...CLEAR_CONNECTOR_FOCUS_PATCH,
        selectedBoundedContextIds: [],
      };
    }),

  clearSelection: () =>
    set({
      selectedElementIds: [],
      ...CLEAR_CONNECTOR_FOCUS_PATCH,
      selectedBoundedContextIds: [],
      selectedSwimlaneIds: [],
      editingElementId: null,
    }),

  openContextMenu: (x, y, target) => set({ contextMenu: { x, y, target } }),
  closeContextMenu: () => set({ contextMenu: null }),
  clearEditingElementId: () => set({ editingElementId: null }),

  beginGesture: () => set({ gestureActive: true, gestureSnapshotTaken: false }),
  endGesture: () => {
    const s = get();
    const elements = settleElements(s.elements, s.swimlanes, s.boundedContexts);
    // Fold assignment into the open gesture snapshot (one Undo for move + Zuordnung).
    if (s.gestureActive && s.gestureSnapshotTaken) {
      set({
        elements,
        gestureActive: false,
        gestureSnapshotTaken: false,
      });
      return;
    }
    if (elements !== s.elements) {
      commit(set, get, () => ({
        elements,
        gestureActive: false,
        gestureSnapshotTaken: false,
      }));
      return;
    }
    set({ gestureActive: false, gestureSnapshotTaken: false });
  },

  undo: () => {
    const s = get();
    const result = undoHistory(s.past, s.future, captureDomain(s));
    if (!result) return;
    set({
      ...domainPatch(result.restored),
      past: result.past,
      future: result.future,
      gestureActive: false,
      gestureSnapshotTaken: false,
      selectedElementIds: [],
      ...CLEAR_CONNECTOR_FOCUS_PATCH,
      selectedBoundedContextIds: [],
      selectedSwimlaneIds: [],
      editingElementId: null,
    });
  },

  redo: () => {
    const s = get();
    const result = redoHistory(s.past, s.future, captureDomain(s));
    if (!result) return;
    set({
      ...domainPatch(result.restored),
      past: result.past,
      future: result.future,
      gestureActive: false,
      gestureSnapshotTaken: false,
      selectedElementIds: [],
      ...CLEAR_CONNECTOR_FOCUS_PATCH,
      selectedBoundedContextIds: [],
      selectedSwimlaneIds: [],
      editingElementId: null,
    });
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  addElement: (type, x, y, label, options) => {
    let createdId = "";
    commit(set, get, (s) => {
      const customTypeId =
        type === "customCard"
          ? options?.customTypeId ?? s.paletteCustomTypeId ?? s.customCardTypes[0]?.id
          : undefined;
      const customDef = customTypeId
        ? findCustomCardType(s.customCardTypes, customTypeId)
        : null;
      const el = createElement(type, x, y, label, nextElementZIndex(s.elements), {
        customTypeId: customDef?.id,
        customTypeName: customDef?.name,
      });
      createdId = el.id;
      const elements = settleElements(
        [...s.elements, el],
        s.swimlanes,
        s.boundedContexts,
      );
      return {
        elements,
        selectedElementIds: [el.id],
        editingElementId: el.id,
        paletteType: type,
        paletteCustomTypeId: customDef?.id ?? s.paletteCustomTypeId,
      };
    });
    return createdId;
  },

  addCustomCardType: (partial) => {
    let createdId = "";
    commit(set, get, (s) => {
      const preset =
        CUSTOM_CARD_COLOR_PRESETS[
          s.customCardTypes.length % CUSTOM_CARD_COLOR_PRESETS.length
        ]!;
      const colors = partial?.fill
        ? {
            fill: partial.fill,
            stroke: partial.stroke ?? DEFAULT_CUSTOM_CARD_COLORS.stroke,
            ink: partial.ink ?? DEFAULT_CUSTOM_CARD_COLORS.ink,
          }
        : colorsFromPreset(preset);
      const next: CustomCardType = {
        id: generateStormId(),
        name: partial?.name?.trim() || `Typ ${s.customCardTypes.length + 1}`,
        ...colors,
      };
      createdId = next.id;
      return {
        customCardTypes: [...s.customCardTypes, next],
        paletteType: "customCard",
        paletteCustomTypeId: next.id,
      };
    });
    return createdId;
  },

  updateCustomCardType: (id, patch) =>
    commit(set, get, (s) => ({
      customCardTypes: s.customCardTypes.map((t) => {
        if (t.id !== id) return t;
        const next = { ...t };
        if (patch.name !== undefined) {
          // Allow empty while editing; display layers fall back to "Typ".
          next.name = patch.name.slice(0, 64);
        }
        if (patch.fill !== undefined) next.fill = patch.fill;
        if (patch.stroke !== undefined) next.stroke = patch.stroke;
        if (patch.ink !== undefined) next.ink = patch.ink;
        return next;
      }),
    })),

  deleteCustomCardType: (id) =>
    commit(set, get, (s) => {
      const customCardTypes = s.customCardTypes.filter((t) => t.id !== id);
      const paletteCustomTypeId =
        s.paletteCustomTypeId === id
          ? customCardTypes[0]?.id ?? null
          : s.paletteCustomTypeId;
      return { customCardTypes, paletteCustomTypeId };
    }),

  updateElement: (id, patch) =>
    commit(set, get, (s) => {
      const elements = s.elements.map((e) => (e.id === id ? { ...e, ...patch, id: e.id } : e));
      const geometryChanged =
        patch.x !== undefined ||
        patch.y !== undefined ||
        patch.width !== undefined ||
        patch.height !== undefined;
      return {
        elements: geometryChanged
          ? settleElements(elements, s.swimlanes, s.boundedContexts)
          : elements,
      };
    }),

  deleteElement: (id) =>
    commit(set, get, (s) => ({
      elements: s.elements
        .filter((e) => e.id !== id)
        .map((e) => {
          let next = e;
          if (next.aggregateId === id) next = { ...next, aggregateId: undefined };
          if (next.subdomainId === id) next = { ...next, subdomainId: undefined };
          return next;
        }),
      ...withConnectors(
        s.connectors.filter((c) => {
          const hits =
            (c.source.attach === "element" && c.source.id === id) ||
            (c.target.attach === "element" && c.target.id === id);
          return !hits;
        }),
      ),
      selectedElementIds: s.selectedElementIds.filter((x) => x !== id),
    })),

  moveElement: (id, x, y) =>
    commit(set, get, (s) => ({
      elements: s.elements.map((e) => (e.id === id ? { ...e, x, y } : e)),
    })),

  moveElements: (updates) =>
    commit(set, get, (s) => {
      if (updates.length === 0) return {};
      const byId = new Map(updates.map((u) => [u.id, u]));
      return {
        elements: s.elements.map((e) => {
          const u = byId.get(e.id);
          return u ? { ...e, x: u.x, y: u.y } : e;
        }),
      };
    }),

  moveCanvasSelection: (updates) =>
    commit(set, get, (s) => {
      const elementUpdates = updates.elements ?? [];
      const swimlaneUpdates = updates.swimlanes ?? [];
      const bcUpdates = updates.boundedContexts ?? [];
      if (elementUpdates.length === 0 && swimlaneUpdates.length === 0 && bcUpdates.length === 0) {
        return {};
      }

      const elById = new Map(elementUpdates.map((u) => [u.id, u]));
      const laneById = new Map(swimlaneUpdates.map((u) => [u.id, u]));
      const bcById = new Map(bcUpdates.map((u) => [u.id, u]));

      const elements =
        elementUpdates.length === 0
          ? s.elements
          : s.elements.map((e) => {
              const u = elById.get(e.id);
              return u ? { ...e, x: u.x, y: u.y } : e;
            });

      const swimlanes =
        swimlaneUpdates.length === 0
          ? s.swimlanes
          : s.swimlanes.map((lane) => {
              const u = laneById.get(lane.id);
              if (!u) return lane;
              const safe = sanitizeRegionGeometryPatch(Boolean(lane.locked), {
                x: u.x,
                y: u.y,
              }) as { x?: number; y?: number };
              if (safe.x === undefined && safe.y === undefined) return lane;
              return {
                ...lane,
                x: safe.x ?? lane.x,
                y: safe.y ?? lane.y,
              };
            });

      const boundedContexts =
        bcUpdates.length === 0
          ? s.boundedContexts
          : s.boundedContexts.map((bc) => {
              const u = bcById.get(bc.id);
              if (!u) return bc;
              const safe = sanitizeRegionGeometryPatch(Boolean(bc.locked), {
                x: u.x,
                y: u.y,
              }) as { x?: number; y?: number };
              if (safe.x === undefined && safe.y === undefined) return bc;
              return {
                ...bc,
                x: safe.x ?? bc.x,
                y: safe.y ?? bc.y,
              };
            });

      // Containment is re-applied in endGesture so passers-by are not picked up mid-drag.
      return { elements, swimlanes, boundedContexts };
    }),

  patchElements: (updates) =>
    commit(set, get, (s) => {
      if (updates.length === 0) return {};
      const byId = new Map(updates.map((u) => [u.id, u]));
      const elements = s.elements.map((e) => {
        const u = byId.get(e.id);
        if (!u) return e;
        const { id: _id, ...patch } = u;
        return { ...e, ...patch, id: e.id };
      });
      const geometryChanged = updates.some(
        (u) =>
          u.x !== undefined ||
          u.y !== undefined ||
          u.width !== undefined ||
          u.height !== undefined,
      );
      const zChanged = updates.some((u) => u.zIndex !== undefined);
      return {
        elements:
          geometryChanged
            ? settleElements(elements, s.swimlanes, s.boundedContexts)
            : zChanged
              ? enforceContainerBehindContents(elements)
              : elements,
      };
    }),

  bringElementsToFront: (ids) => {
    commit(set, get, (s) => {
      const orderedIds = expandZOrderSelection(s.elements, ids);
      const patches = computeBringToFront(s.elements, orderedIds);
      if (!patches.length) return {};
      const byId = new Map(patches.map((p) => [p.id, p.zIndex]));
      const elements = s.elements.map((e) => {
        const z = byId.get(e.id);
        return z === undefined || itemZIndex(e) === z ? e : { ...e, zIndex: z };
      });
      return { elements: enforceContainerBehindContents(elements) };
    });
  },

  sendElementsToBack: (ids) => {
    commit(set, get, (s) => {
      const orderedIds = expandZOrderSelection(s.elements, ids);
      const patches = computeSendToBack(s.elements, orderedIds);
      if (!patches.length) return {};
      const byId = new Map(patches.map((p) => [p.id, p.zIndex]));
      const elements = s.elements.map((e) => {
        const z = byId.get(e.id);
        return z === undefined || itemZIndex(e) === z ? e : { ...e, zIndex: z };
      });
      return { elements: enforceContainerBehindContents(elements) };
    });
  },

  bringElementsForward: (ids) => {
    commit(set, get, (s) => {
      const orderedIds = expandZOrderSelection(s.elements, ids);
      const patches = computeBringForward(s.elements, orderedIds);
      if (!patches.length) return {};
      const byId = new Map(patches.map((p) => [p.id, p.zIndex]));
      const elements = s.elements.map((e) => {
        const z = byId.get(e.id);
        return z === undefined || itemZIndex(e) === z ? e : { ...e, zIndex: z };
      });
      return { elements: enforceContainerBehindContents(elements) };
    });
  },

  sendElementsBackward: (ids) => {
    commit(set, get, (s) => {
      const orderedIds = expandZOrderSelection(s.elements, ids);
      const patches = computeSendBackward(s.elements, orderedIds);
      if (!patches.length) return {};
      const byId = new Map(patches.map((p) => [p.id, p.zIndex]));
      const elements = s.elements.map((e) => {
        const z = byId.get(e.id);
        return z === undefined || itemZIndex(e) === z ? e : { ...e, zIndex: z };
      });
      return { elements: enforceContainerBehindContents(elements) };
    });
  },

  addRelation: (sourceId, targetId, type, label) => {
    if (sourceId === targetId) return null;
    const exists = get().relations.some(
      (r) =>
        r.sourceId === sourceId &&
        r.targetId === targetId &&
        (type === undefined || r.type === type),
    );
    if (exists) return null;
    const rel: StormRelation = {
      id: generateStormId(),
      type: type ?? "triggers",
      sourceId,
      targetId,
      labelMode: label?.trim() ? "custom" : "type",
      ...(label?.trim() ? { label: label.trim() } : {}),
    };
    commit(set, get, (s) => ({
      ...withConnectors([...s.connectors, stormRelationToConnector(rel)]),
      relationDraftSourceId: null,
      connectorDraftSource: null,
    }));
    return rel.id;
  },

  updateRelation: (id, patch) =>
    commit(set, get, (s) => {
      const rel = s.relations.find((r) => r.id === id);
      if (!rel) return {};
      const next = { ...rel, ...patch, id: rel.id };
      const connectors = s.connectors.map((c) =>
        c.id === id ? stormRelationToConnector(next) : c,
      );
      return withConnectors(connectors);
    }),

  applyProgressMark: (mark) =>
    commit(set, get, (s) => {
      const elementIds = s.selectedElementIds;
      const relationId = s.selectedRelationId ?? s.selectedConnectorId;
      if (elementIds.length === 0 && !relationId) return {};

      const selectedEls = s.elements.filter((e) => elementIds.includes(e.id));
      const selectedRel = relationId
        ? s.relations.find((r) => r.id === relationId)
        : undefined;
      const selectedConn =
        relationId && !selectedRel
          ? s.connectors.find((c) => c.id === relationId)
          : undefined;

      const allAlready =
        selectedEls.every(
          (e) => normalizeProgressMark(e.metadata?.progressMark) === mark,
        ) &&
        (selectedRel
          ? normalizeProgressMark(selectedRel.progressMark) === mark
          : selectedConn
            ? normalizeProgressMark(selectedConn.progressMark) === mark
            : true) &&
        (selectedEls.length > 0 || Boolean(selectedRel) || Boolean(selectedConn));

      const next = allAlready ? undefined : mark;

      const elements =
        elementIds.length === 0
          ? s.elements
          : s.elements.map((e) => {
              if (!elementIds.includes(e.id)) return e;
              const metadata = { ...(e.metadata ?? {}) };
              if (next) metadata.progressMark = next;
              else delete metadata.progressMark;
              return {
                ...e,
                metadata: Object.keys(metadata).length ? metadata : undefined,
              };
            });

      const markConnectorId = selectedRel?.id ?? selectedConn?.id;
      const connectors = markConnectorId
        ? s.connectors.map((c) => {
            if (c.id !== markConnectorId) return c;
            if (!next) {
              const { progressMark: _removed, ...rest } = c;
              return rest;
            }
            return { ...c, progressMark: next };
          })
        : s.connectors;

      return { elements, ...withConnectors(connectors) };
    }),

  deleteRelation: (id) =>
    commit(set, get, (s) => ({
      ...withConnectors(s.connectors.filter((c) => c.id !== id)),
      selectedRelationId: s.selectedRelationId === id ? null : s.selectedRelationId,
      selectedConnectorId: s.selectedConnectorId === id ? null : s.selectedConnectorId,
    })),

  setRelationMode: (relationMode) =>
    set({
      relationMode,
      lineDrawMode: false,
      contextMapMode: false,
      relationDraftSourceId: relationMode ? get().relationDraftSourceId : null,
      contextMapDraftSourceId: null,
      connectorDraftSource: relationMode ? get().connectorDraftSource : null,
      selectedCanvasLineId: relationMode ? null : get().selectedCanvasLineId,
    }),

  setConnectorMode: (enabled) => get().setRelationMode(enabled),

  setRelationDraftSource: (relationDraftSourceId) => set({ relationDraftSourceId }),

  connectElements: (sourceId, targetId) => {
    if (sourceId === targetId) return null;
    const src = get().elements.find((e) => e.id === sourceId);
    const tgt = get().elements.find((e) => e.id === targetId);
    if (!src || !tgt) return null;
    return get().addRelation(sourceId, targetId, defaultRelationType(src, tgt));
  },

  reconnectRelation: (relationId, endpoint, elementId) => {
    const state = get();
    const rel = state.relations.find((r) => r.id === relationId);
    if (!rel) return false;
    const sourceId = endpoint === "source" ? elementId : rel.sourceId;
    const targetId = endpoint === "target" ? elementId : rel.targetId;
    if (sourceId === targetId) return false;
    const src = state.elements.find((e) => e.id === sourceId);
    const tgt = state.elements.find((e) => e.id === targetId);
    if (!src || !tgt) return false;
    const duplicate = state.relations.some(
      (r) => r.id !== relationId && r.sourceId === sourceId && r.targetId === targetId,
    );
    if (duplicate) return false;
    const next = {
      ...rel,
      sourceId,
      targetId,
      type: defaultRelationType(src, tgt),
    };
    commit(set, get, (s) => ({
      ...withConnectors(
        s.connectors.map((c) => (c.id === relationId ? stormRelationToConnector(next) : c)),
      ),
    }));
    return true;
  },

  connectEndpoints: (source, target) => {
    const state = get();
    const prepared = prepareConnectorEndpoints(
      source,
      target,
      state.elements,
      state.swimlanes,
      state.boundedContexts,
    );
    if (
      prepared.source.attach !== "point" &&
      prepared.target.attach !== "point" &&
      JSON.stringify(prepared.source) === JSON.stringify(prepared.target)
    ) {
      return null;
    }
    const { source: srcEp, target: tgtEp } = prepared;
    if (srcEp.attach === "element" && tgtEp.attach === "element") {
      const src = state.elements.find((e) => e.id === srcEp.id);
      const tgt = state.elements.find((e) => e.id === tgtEp.id);
      if (!src || !tgt) return null;
    }
    const connector: BoardConnector = {
      id: generateStormId(),
      source: prepared.source,
      target: prepared.target,
      arrowHead: state.lineArrowHead,
      ...prepared.semantics,
    };
    commit(set, get, (s) => ({
      ...withConnectors([...s.connectors, connector]),
      connectorDraftSource: null,
      relationDraftSourceId: null,
      contextMapDraftSourceId: null,
      selectedConnectorId: connector.id,
    }));
    return connector.id;
  },

  updateConnector: (id, patch) =>
    commit(set, get, (s) => {
      const connectors = s.connectors.map((c) =>
        c.id === id ? { ...c, ...patch, id: c.id } : c,
      );
      return withConnectors(connectors);
    }),

  deleteConnector: (id) =>
    commit(set, get, (s) => ({
      ...withConnectors(s.connectors.filter((c) => c.id !== id)),
      selectedConnectorId: s.selectedConnectorId === id ? null : s.selectedConnectorId,
      selectedRelationId: s.selectedRelationId === id ? null : s.selectedRelationId,
      selectedContextRelationId:
        s.selectedContextRelationId === id ? null : s.selectedContextRelationId,
      selectedCanvasLineId: s.selectedCanvasLineId === id ? null : s.selectedCanvasLineId,
    })),

  selectConnector: (id) => {
    const conn = get().connectors.find((c) => c.id === id);
    set({
      selectedConnectorId: id,
      selectedRelationId: conn && connectorToStormRelation(conn) ? id : null,
      selectedContextRelationId: conn && connectorToContextRelation(conn) ? id : null,
      selectedCanvasLineId: conn && connectorToCanvasLine(conn) ? id : null,
      selectedElementIds: [],
      selectedBoundedContextIds: [],
      selectedSwimlaneIds: [],
    });
  },

  reconnectConnector: (connectorId, endpoint, attach) => {
    const state = get();
    const conn = state.connectors.find((c) => c.id === connectorId);
    if (!conn) return false;
    const source = endpoint === "source" ? attach : conn.source;
    const target = endpoint === "target" ? attach : conn.target;
    if (JSON.stringify(source) === JSON.stringify(target)) return false;
    const prepared = prepareConnectorEndpoints(
      source,
      target,
      state.elements,
      state.swimlanes,
      state.boundedContexts,
    );
    let next: BoardConnector = {
      ...conn,
      source: prepared.source,
      target: prepared.target,
      relationType: undefined,
      contextMapPattern: undefined,
      labelMode: undefined,
      ...prepared.semantics,
    };
    if (prepared.source.attach === "boundedContext" && prepared.target.attach === "boundedContext") {
      next = {
        ...next,
        contextMapPattern: next.contextMapPattern ?? "customerSupplier",
        relationType: undefined,
      };
    }
    commit(set, get, (s) => ({
      ...withConnectors(s.connectors.map((c) => (c.id === connectorId ? next : c))),
    }));
    return true;
  },

  setConnectorDraftSource: (connectorDraftSource) => set({ connectorDraftSource }),

  addContextRelation: (sourceContextId, targetContextId, type, label) => {
    if (sourceContextId === targetContextId) return null;
    const exists = get().contextRelations.some(
      (r) =>
        (r.sourceContextId === sourceContextId && r.targetContextId === targetContextId) ||
        (r.sourceContextId === targetContextId && r.targetContextId === sourceContextId),
    );
    if (exists) return null;
    const rel: ContextRelation = {
      id: generateStormId(),
      type: type ?? "customerSupplier",
      sourceContextId,
      targetContextId,
      label,
    };
    commit(set, get, (s) => ({
      ...withConnectors([...s.connectors, contextRelationToConnector(rel)]),
      contextMapDraftSourceId: null,
      connectorDraftSource: null,
      selectedContextRelationId: rel.id,
      selectedConnectorId: rel.id,
    }));
    return rel.id;
  },

  updateContextRelation: (id, patch) =>
    commit(set, get, (s) => {
      const rel = s.contextRelations.find((r) => r.id === id);
      if (!rel) return {};
      const next = { ...rel, ...patch, id: rel.id };
      const connectors = s.connectors.map((c) =>
        c.id === id ? contextRelationToConnector(next) : c,
      );
      return withConnectors(connectors);
    }),

  deleteContextRelation: (id) => get().deleteConnector(id),

  setContextMapMode: (contextMapMode) =>
    set({
      contextMapMode,
      contextMapDraftSourceId: contextMapMode ? get().contextMapDraftSourceId : null,
      relationMode: contextMapMode ? false : get().relationMode,
      relationDraftSourceId: contextMapMode ? null : get().relationDraftSourceId,
      lineDrawMode: contextMapMode ? false : get().lineDrawMode,
      selectedCanvasLineId: contextMapMode ? null : get().selectedCanvasLineId,
    }),

  setContextMapDraftSource: (contextMapDraftSourceId) => set({ contextMapDraftSourceId }),

  setLineDrawMode: (lineDrawMode) => {
    if (lineDrawMode) {
      set({
        relationMode: true,
        lineDrawMode: true,
        contextMapMode: false,
        connectorDraftSource: null,
        relationDraftSourceId: null,
        contextMapDraftSourceId: null,
        selectedCanvasLineId: null,
      });
      return;
    }
    set({ lineDrawMode: false });
  },

  setLineArrowHead: (lineArrowHead) => set({ lineArrowHead }),

  addCanvasLine: (line) => {
    const normalized = normalizeCanvasLine({
      ...line,
      arrowHead: line.arrowHead ?? get().lineArrowHead,
    });
    if (!normalized) return null;
    const connector = canvasLineToConnector(normalized);
    commit(set, get, (s) => ({
      ...withConnectors([...s.connectors, connector]),
      selectedCanvasLineId: normalized.id,
      selectedConnectorId: normalized.id,
      selectedElementIds: [],
      selectedRelationId: null,
      selectedContextRelationId: null,
      selectedBoundedContextIds: [],
      selectedSwimlaneIds: [],
    }));
    return normalized.id;
  },

  updateCanvasLine: (id, patch) =>
    commit(set, get, (s) => {
      const line = s.canvasLines.find((l) => l.id === id);
      if (!line) return {};
      const normalized = normalizeCanvasLine({ ...line, ...patch, id: line.id });
      if (!normalized) return {};
      const connectors = s.connectors.map((c) =>
        c.id === id ? canvasLineToConnector(normalized) : c,
      );
      return withConnectors(connectors);
    }),

  deleteCanvasLine: (id) => get().deleteConnector(id),

  selectCanvasLine: (id) =>
    set({
      selectedCanvasLineId: id,
      selectedElementIds: [],
      selectedRelationId: null,
      selectedContextRelationId: null,
      selectedBoundedContextIds: [],
      selectedSwimlaneIds: [],
    }),

  addBookmark: (name) => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const bookmark: ViewBookmark = {
      id: generateStormId(),
      name: trimmed,
      viewId: get().activeViewId,
      viewport: { ...get().viewport },
    };
    commit(set, get, (s) => ({ bookmarks: [...s.bookmarks, bookmark] }));
    return bookmark.id;
  },

  updateBookmark: (id, patch) =>
    commit(set, get, (s) => ({
      bookmarks: s.bookmarks.map((bookmark) =>
        bookmark.id === id ? { ...bookmark, ...patch, id: bookmark.id } : bookmark,
      ),
    })),

  deleteBookmark: (id) =>
    commit(set, get, (s) => ({
      bookmarks: s.bookmarks.filter((bookmark) => bookmark.id !== id),
    })),

  jumpToBookmark: (id) => {
    const bookmark = get().bookmarks.find((b) => b.id === id);
    if (!bookmark) return false;
    const s = get();
    if (!s.views.some((view) => view.id === bookmark.viewId)) return false;
    if (s.activeViewId !== bookmark.viewId) {
      const views = flushActiveViewIntoViews(s);
      const next = resolveActiveView(views, bookmark.viewId);
      set({
        views,
        activeViewId: next.id,
        ...applyViewToFlatPatch(next),
        viewport: { ...bookmark.viewport },
        ...CLEAR_SELECTION_PATCH,
      });
      return true;
    }
    set({ viewport: { ...bookmark.viewport } });
    return true;
  },

  connectBoundedContexts: (sourceContextId, targetContextId) => {
    if (sourceContextId === targetContextId) return null;
    const src = get().boundedContexts.find((b) => b.id === sourceContextId);
    const tgt = get().boundedContexts.find((b) => b.id === targetContextId);
    if (!src || !tgt) return null;
    return get().addContextRelation(sourceContextId, targetContextId, "customerSupplier");
  },

  reconnectContextRelation: (relationId, endpoint, boundedContextId) => {
    const state = get();
    const rel = state.contextRelations.find((r) => r.id === relationId);
    if (!rel) return false;
    const sourceContextId =
      endpoint === "source" ? boundedContextId : rel.sourceContextId;
    const targetContextId =
      endpoint === "target" ? boundedContextId : rel.targetContextId;
    if (sourceContextId === targetContextId) return false;
    const src = state.boundedContexts.find((b) => b.id === sourceContextId);
    const tgt = state.boundedContexts.find((b) => b.id === targetContextId);
    if (!src || !tgt) return false;
    const duplicate = state.contextRelations.some(
      (r) =>
        r.id !== relationId &&
        ((r.sourceContextId === sourceContextId && r.targetContextId === targetContextId) ||
          (r.sourceContextId === targetContextId && r.targetContextId === sourceContextId)),
    );
    if (duplicate) return false;
    const next = { ...rel, sourceContextId, targetContextId };
    commit(set, get, (s) => ({
      ...withConnectors(
        s.connectors.map((c) =>
          c.id === relationId ? contextRelationToConnector(next) : c,
        ),
      ),
    }));
    return true;
  },

  addSwimlane: (label) => {
    const id = generateStormId();
    const y = 120 + get().swimlanes.length * 180;
    const lane: Swimlane = {
      id,
      label: label ?? `Swimlane ${get().swimlanes.length + 1}`,
      x: 40,
      y,
      width: 1200,
      height: 160,
      zIndex: nextZIndex(regionZOrderItems(get().swimlanes, get().boundedContexts)),
    };
    commit(set, get, (s) => {
      const swimlanes = [...s.swimlanes, lane];
      return {
        swimlanes,
        selectedSwimlaneIds: [id],
        elements: settleElements(s.elements, swimlanes, s.boundedContexts),
      };
    });
    return id;
  },

  updateSwimlane: (id, patch, options) =>
    commit(set, get, (s) => {
      const lane = s.swimlanes.find((l) => l.id === id);
      if (!lane) return {};
      const safePatch = sanitizeRegionGeometryPatch(
        Boolean(lane.locked),
        patch as Record<string, unknown>,
      ) as typeof patch;
      const nextLane = { ...lane, ...safePatch, id: lane.id };
      const swimlanes = s.swimlanes.map((l) => (l.id === id ? nextLane : l));

      const resizing = safePatch.width !== undefined || safePatch.height !== undefined;
      const dx = (nextLane.x ?? 0) - (lane.x ?? 0);
      const dy = nextLane.y - lane.y;
      let elements = s.elements;
      if (!resizing && (dx !== 0 || dy !== 0)) {
        if (options?.moveElementIds) {
          const ids = new Set(options.moveElementIds);
          elements = translateMatchingElements(elements, (e) => ids.has(e.id), dx, dy);
        } else {
          elements = translateMatchingElements(elements, (e) => e.swimlaneId === id, dx, dy);
        }
      }

      // During a locked move, do not re-run containment (would "pick up" passers-by).
      // Resize and non-gesture edits still update assignments immediately.
      const lockedMove = Boolean(options?.moveElementIds) && !resizing;
      if (!lockedMove && (safePatch.x !== undefined || safePatch.y !== undefined || resizing)) {
        elements = settleElements(elements, swimlanes, s.boundedContexts);
      }

      return { swimlanes, elements };
    }),

  deleteSwimlane: (id) =>
    commit(set, get, (s) => ({
      swimlanes: s.swimlanes.filter((l) => l.id !== id),
      elements: s.elements.map((e) =>
        e.swimlaneId === id ? { ...e, swimlaneId: undefined } : e,
      ),
      selectedSwimlaneIds: s.selectedSwimlaneIds.filter((x) => x !== id),
    })),

  addBoundedContext: (x, y, width, height, label) => {
    const id = generateStormId();
    const bc: BoundedContext = {
      id,
      label: label ?? "Bounded Context",
      x,
      y,
      width,
      height,
      color: "#dbeafe",
      zIndex: nextZIndex(regionZOrderItems(get().swimlanes, get().boundedContexts)),
    };
    commit(set, get, (s) => {
      const boundedContexts = [...s.boundedContexts, bc];
      return {
        boundedContexts,
        selectedBoundedContextIds: [id],
        elements: settleElements(s.elements, s.swimlanes, boundedContexts),
      };
    });
    return id;
  },

  updateBoundedContext: (id, patch, options) =>
    commit(set, get, (s) => {
      const bc = s.boundedContexts.find((b) => b.id === id);
      if (!bc) return {};
      const safePatch = sanitizeRegionGeometryPatch(
        Boolean(bc.locked),
        patch as Record<string, unknown>,
      ) as typeof patch;
      const nextBc = { ...bc, ...safePatch, id: bc.id };
      const boundedContexts = s.boundedContexts.map((b) => (b.id === id ? nextBc : b));

      const resizing = safePatch.width !== undefined || safePatch.height !== undefined;
      const dx = nextBc.x - bc.x;
      const dy = nextBc.y - bc.y;
      let elements = s.elements;
      if (!resizing && (dx !== 0 || dy !== 0)) {
        if (options?.moveElementIds) {
          const ids = new Set(options.moveElementIds);
          elements = translateMatchingElements(elements, (e) => ids.has(e.id), dx, dy);
        } else {
          elements = translateMatchingElements(
            elements,
            (e) => e.boundedContextId === id,
            dx,
            dy,
          );
        }
      }

      const lockedMove = Boolean(options?.moveElementIds) && !resizing;
      if (!lockedMove && (safePatch.x !== undefined || safePatch.y !== undefined || resizing)) {
        elements = settleElements(elements, s.swimlanes, boundedContexts);
      }

      return { boundedContexts, elements };
    }),

  deleteBoundedContext: (id) =>
    commit(set, get, (s) => {
      const nextContextRelations = s.contextRelations.filter(
        (r) => r.sourceContextId !== id && r.targetContextId !== id,
      );
      return {
        boundedContexts: s.boundedContexts.filter((b) => b.id !== id),
        contextRelations: nextContextRelations,
        elements: s.elements.map((e) =>
          e.boundedContextId === id ? { ...e, boundedContextId: undefined } : e,
        ),
        selectedBoundedContextIds: s.selectedBoundedContextIds.filter((x) => x !== id),
        selectedContextRelationId:
          s.selectedContextRelationId &&
          !nextContextRelations.some((r) => r.id === s.selectedContextRelationId)
            ? null
            : s.selectedContextRelationId,
      };
    }),

  openBoundedContextView: (bcId) => {
    let resultId: string | null = null;
    commit(set, get, (s) => {
      const views = flushActiveViewIntoViews(s);
      const activeView = resolveActiveView(views, s.activeViewId);
      if (!isCanvasBoardView(activeView)) return {};
      const bc = activeView.boundedContexts.find((b) => b.id === bcId);
      if (!bc) return {};

      const linkedViewId = bc.detailViewId?.trim();
      if (linkedViewId) {
        const linked = views.find((v) => v.id === linkedViewId);
        if (linked) {
          resultId = linked.id;
          return {
            views,
            activeViewId: linked.id,
            ...applyViewToFlatPatch(linked),
            ...CLEAR_SELECTION_PATCH,
            past: [],
            future: [],
            gestureActive: false,
            gestureSnapshotTaken: false,
          };
        }
      }

      const payload = extractBoundedContextViewPayload(
        bcId,
        activeView.elements,
        activeView.relations,
        activeView.boundedContexts,
        activeView.contextRelations,
        activeView.swimlanes,
      );
      if (!payload) return {};

      const newViewId = generateStormId();
      const viewName = bc.label.trim() || `Sicht ${views.length + 1}`;
      const newView = buildBoardViewFromBoundedContextPayload(payload, {
        id: newViewId,
        name: viewName,
        modelingMode: activeView.modelingMode,
        workshopFormat: activeView.workshopFormat,
      });

      const updatedViews = views.map((v) => {
        if (v.id !== activeView.id || !isCanvasBoardView(v)) return v;
        return {
          ...v,
          boundedContexts: v.boundedContexts.map((b) =>
            b.id === bcId ? { ...b, detailViewId: newViewId } : b,
          ),
        };
      });

      resultId = newViewId;
      return {
        views: [...updatedViews, newView],
        activeViewId: newViewId,
        ...applyViewToFlatPatch(newView),
        ...CLEAR_SELECTION_PATCH,
        past: [],
        future: [],
        gestureActive: false,
        gestureSnapshotTaken: false,
      };
    });
    return resultId;
  },

  openBoundedContextParentView: (bcId) => {
    let resultId: string | null = null;
    commit(set, get, (s) => {
      const views = flushActiveViewIntoViews(s);
      const bc = s.boundedContexts.find((b) => b.id === bcId);
      if (!bc) return {};

      const nav = resolveBoundedContextViewNavigation(bc, s.activeViewId, views);
      if (!nav || nav.direction !== "up" || !nav.parentBoundedContextId) return {};

      const next = resolveActiveView(views, nav.targetViewId);
      resultId = next.id;
      return {
        views,
        activeViewId: next.id,
        ...applyViewToFlatPatch(next),
        selectedBoundedContextIds: [nav.parentBoundedContextId],
        selectedElementIds: [],
        selectedRelationId: null,
        selectedContextRelationId: null,
        selectedSwimlaneIds: [],
        past: [],
        future: [],
        gestureActive: false,
        gestureSnapshotTaken: false,
      };
    });
    return resultId;
  },

  navigateBoundedContextViewLink: (bcId) => {
    const s = get();
    const bc = s.boundedContexts.find((b) => b.id === bcId);
    if (!bc) return null;

    const views = flushActiveViewIntoViews(s);
    const nav = resolveBoundedContextViewNavigation(bc, s.activeViewId, views);
    if (!nav) return null;

    if (nav.direction === "down") {
      return get().openBoundedContextView(bcId);
    }

    return get().openBoundedContextParentView(bcId);
  },

  openBuildingBlockView: (elementId) => {
    let resultId: string | null = null;
    commit(set, get, (s) => {
      const views = flushActiveViewIntoViews(s);
      const activeView = resolveActiveView(views, s.activeViewId);
      if (!isCanvasBoardView(activeView)) return {};
      const el = activeView.elements.find((e) => e.id === elementId);
      if (!el || !supportsArchDrilldown(el.type)) return {};

      const linkedViewId = el.detailViewId?.trim();
      if (linkedViewId) {
        const linked = views.find((v) => v.id === linkedViewId);
        if (linked) {
          resultId = linked.id;
          return {
            views,
            activeViewId: linked.id,
            ...applyViewToFlatPatch(linked),
            ...CLEAR_SELECTION_PATCH,
            past: [],
            future: [],
            gestureActive: false,
            gestureSnapshotTaken: false,
          };
        }
      }

      const payload = extractBuildingBlockViewPayload(
        elementId,
        activeView.elements,
        activeView.relations,
      );
      if (!payload) return {};

      const newViewId = generateStormId();
      const viewName = el.label.trim() || `Sicht ${views.length + 1}`;
      const newView = buildBoardViewFromBuildingBlock(el, payload, {
        id: newViewId,
        name: viewName,
        modelingMode: activeView.modelingMode,
        workshopFormat: activeView.workshopFormat,
      });

      const updatedViews = views.map((v) => {
        if (v.id !== activeView.id || !isCanvasBoardView(v)) return v;
        return {
          ...v,
          elements: v.elements.map((e) =>
            e.id === elementId ? { ...e, detailViewId: newViewId } : e,
          ),
        };
      });

      resultId = newViewId;
      return {
        views: [...updatedViews, newView],
        activeViewId: newViewId,
        ...applyViewToFlatPatch(newView),
        ...CLEAR_SELECTION_PATCH,
        past: [],
        future: [],
        gestureActive: false,
        gestureSnapshotTaken: false,
      };
    });
    return resultId;
  },

  openBuildingBlockParentView: (elementId) => {
    let resultId: string | null = null;
    commit(set, get, (s) => {
      const views = flushActiveViewIntoViews(s);
      const el = s.elements.find((e) => e.id === elementId);
      if (!el) return {};

      const nav = resolveBuildingBlockViewNavigation(el, s.activeViewId, views);
      if (!nav || nav.direction !== "up" || !nav.parentElementId) return {};

      const next = resolveActiveView(views, nav.targetViewId);
      resultId = next.id;
      return {
        views,
        activeViewId: next.id,
        ...applyViewToFlatPatch(next),
        selectedElementIds: [nav.parentElementId],
        selectedRelationId: null,
        selectedContextRelationId: null,
        selectedSwimlaneIds: [],
        selectedBoundedContextIds: [],
        past: [],
        future: [],
        gestureActive: false,
        gestureSnapshotTaken: false,
      };
    });
    return resultId;
  },

  navigateBuildingBlockViewLink: (elementId) => {
    const s = get();
    const el = s.elements.find((e) => e.id === elementId);
    if (!el) return null;

    const views = flushActiveViewIntoViews(s);
    const nav = resolveBuildingBlockViewNavigation(el, s.activeViewId, views);
    if (!nav) return null;

    if (nav.direction === "down") {
      return get().openBuildingBlockView(elementId);
    }

    return get().openBuildingBlockParentView(elementId);
  },

  bringRegionsToFront: (ids) => {
    const s = get();
    const patches = computeBringRegionsToFront(regionZOrderItems(s.swimlanes, s.boundedContexts), ids);
    if (patches.length) applyRegionZPatches(set, get, patches);
  },

  sendRegionsToBack: (ids) => {
    const s = get();
    const patches = computeSendRegionsToBack(regionZOrderItems(s.swimlanes, s.boundedContexts), ids);
    if (patches.length) applyRegionZPatches(set, get, patches);
  },

  bringRegionsForward: (ids) => {
    const s = get();
    const patches = computeBringRegionsForward(regionZOrderItems(s.swimlanes, s.boundedContexts), ids);
    if (patches.length) applyRegionZPatches(set, get, patches);
  },

  sendRegionsBackward: (ids) => {
    const s = get();
    const patches = computeSendRegionsBackward(regionZOrderItems(s.swimlanes, s.boundedContexts), ids);
    if (patches.length) applyRegionZPatches(set, get, patches);
  },

  setTimeline: (timeline) =>
    commit(set, get, (s) => ({ timeline: { ...s.timeline, ...timeline } })),

  addGlossaryEntry: (term, definition) =>
    commit(set, get, (s) => {
      if (s.glossary.some((g) => g.term === term)) return {};
      return { glossary: [...s.glossary, { term, definition }] };
    }),

  updateGlossaryEntry: (term, definition) =>
    commit(set, get, (s) => ({
      glossary: s.glossary.map((g) => (g.term === term ? { term, definition } : g)),
    })),

  deleteGlossaryEntry: (term) =>
    commit(set, get, (s) => ({ glossary: s.glossary.filter((g) => g.term !== term) })),

  addActionItem: (item) => {
    const normalized = normalizeActionItem(item);
    if (!normalized) return null;
    commit(set, get, (s) => ({
      actionItems: [...s.actionItems, normalized],
    }));
    return normalized.id;
  },

  updateActionItem: (id, patch) =>
    commit(set, get, (s) => ({
      actionItems: s.actionItems.map((item) => {
        if (item.id !== id) return item;
        return normalizeActionItem({ ...item, ...patch, id: item.id }) ?? item;
      }),
    })),

  deleteActionItem: (id) =>
    commit(set, get, (s) => ({
      actionItems: s.actionItems.filter((item) => item.id !== id),
    })),

  selectMeasure: (id) =>
    set(
      id
        ? {
            selectedMeasureId: id,
            ...CLEAR_SELECTION_PATCH,
          }
        : { selectedMeasureId: null },
    ),

  addMeasureActionItem: (viewId, partial) => {
    let createdId = "";
    commit(set, get, (s) => {
      const views = flushActiveViewIntoViews(s);
      const view = views.find((v) => v.id === viewId);
      if (!view || !isActionsView(view)) return {};
      const item = normalizeMeasureActionItem({
        title: partial?.title,
        description: partial?.description,
        actionType: partial?.actionType,
        obligation: partial?.obligation ?? "Recommended",
        qualities: partial?.qualities ?? [],
        status: partial?.status ?? "open",
        effort: partial?.effort,
        owner: partial?.owner,
        targetRef: partial?.targetRef,
      });
      createdId = item.id;
      return {
        views: patchActionsViewInList(views, viewId, {
          items: [...view.items, item],
        }),
        selectedMeasureId: item.id,
      };
    });
    return createdId;
  },

  addMeasureFromHotspot: (actionsViewId, hotspot) => {
    let resultId: string | null = null;
    commit(set, get, (s) => {
      const views = flushActiveViewIntoViews(s);
      const view = views.find((v) => v.id === actionsViewId);
      if (!view || !isActionsView(view)) return {};
      const existing = findMeasureForHotspot(
        view.items,
        hotspot.viewId,
        hotspot.elementId,
      );
      if (existing) {
        resultId = existing.id;
        const backlog = patchHotspotMeasuresBacklog(
          view.config,
          hotspot.viewId,
          hotspot.elementId,
          true,
        );
        return {
          selectedMeasureId: existing.id,
          views: patchActionsViewInList(views, actionsViewId, {
            config: { ...view.config, ...backlog },
          }),
        };
      }
      const obligation =
        hotspot.priority === "high"
          ? ("Required" as const)
          : hotspot.priority === "low"
            ? ("Optional" as const)
            : ("Recommended" as const);
      const item = normalizeMeasureActionItem({
        title: hotspot.label,
        description: hotspot.description,
        actionType: "IMPROVE",
        obligation,
        qualities: [],
        status: hotspot.status === "resolved" ? "done" : "open",
        targetRef: {
          viewId: hotspot.viewId,
          elementId: hotspot.elementId,
          elementLabel: `[${hotspot.viewName}] ${hotspot.label}`,
        },
      });
      resultId = item.id;
      const backlog = patchHotspotMeasuresBacklog(
        view.config,
        hotspot.viewId,
        hotspot.elementId,
        true,
      );
      return {
        views: patchActionsViewInList(views, actionsViewId, {
          items: [...view.items, item],
          config: { ...view.config, ...backlog },
        }),
        selectedMeasureId: item.id,
      };
    });
    return resultId;
  },

  linkMeasureToCanvasHotspot: (
    actionsViewId,
    measureId,
    hotspotViewId,
    hotspotElementId,
    hotspotViewName,
    hotspotLabel,
  ) =>
    commit(set, get, (s) => {
      const views = flushActiveViewIntoViews(s);
      const view = views.find((v) => v.id === actionsViewId);
      if (!view || !isActionsView(view)) return {};
      const items = view.items.map((item) => {
        if (item.id === measureId) {
          return normalizeMeasureActionItem({
            ...item,
            targetRef: {
              viewId: hotspotViewId,
              elementId: hotspotElementId,
              elementLabel: `[${hotspotViewName}] ${hotspotLabel}`,
            },
            updatedAt: new Date().toISOString(),
          });
        }
        if (measureTargetsHotspot(item, hotspotViewId, hotspotElementId)) {
          return normalizeMeasureActionItem({
            ...item,
            targetRef: undefined,
            updatedAt: new Date().toISOString(),
          });
        }
        return item;
      });
      const backlog = patchHotspotMeasuresBacklog(
        view.config,
        hotspotViewId,
        hotspotElementId,
        true,
      );
      return {
        views: patchActionsViewInList(views, actionsViewId, {
          items,
          config: { ...view.config, ...backlog },
        }),
        selectedMeasureId: measureId,
        measureHotspotLinkPick: null,
      };
    }),

  setHotspotMeasuresBacklogHidden: (actionsViewId, hotspotViewId, hotspotElementId, hidden) =>
    commit(set, get, (s) => {
      const views = flushActiveViewIntoViews(s);
      const view = views.find((v) => v.id === actionsViewId);
      if (!view || !isActionsView(view)) return {};
      const backlog = patchHotspotMeasuresBacklog(
        view.config,
        hotspotViewId,
        hotspotElementId,
        hidden,
      );
      return {
        views: patchActionsViewInList(views, actionsViewId, {
          config: { ...view.config, ...backlog },
        }),
      };
    }),

  beginMeasureHotspotLinkPick: (actionsViewId, measureId) =>
    set({
      measureHotspotLinkPick: { actionsViewId, measureId },
      relationMode: false,
      relationDraftSourceId: null,
      contextMapMode: false,
      contextMapDraftSourceId: null,
      lineDrawMode: false,
      connectorDraftSource: null,
    }),

  cancelMeasureHotspotLinkPick: () => set({ measureHotspotLinkPick: null }),

  completeMeasureHotspotLinkPick: (hotspotElementId) => {
    const s = get();
    const pick = s.measureHotspotLinkPick;
    if (!pick) return false;
    const el = s.elements.find((e) => e.id === hotspotElementId);
    if (!el || el.type !== "hotspot") return false;
    const canvasView = s.views.find((v) => v.id === s.activeViewId);
    const viewName = canvasView?.name ?? "Board";
    get().linkMeasureToCanvasHotspot(
      pick.actionsViewId,
      pick.measureId,
      s.activeViewId,
      el.id,
      viewName,
      el.label?.trim() || el.id,
    );
    return true;
  },

  updateMeasureActionItem: (viewId, itemId, patch) =>
    commit(set, get, (s) => {
      const views = flushActiveViewIntoViews(s);
      const view = views.find((v) => v.id === viewId);
      if (!view || !isActionsView(view)) return {};
      const items = view.items.map((item) => {
        if (item.id !== itemId) return item;
        return normalizeMeasureActionItem({
          ...item,
          ...patch,
          id: item.id,
          createdAt: item.createdAt,
          updatedAt: new Date().toISOString(),
        });
      });
      return { views: patchActionsViewInList(views, viewId, { items }) };
    }),

  removeMeasureActionItem: (viewId, itemId) =>
    commit(set, get, (s) => {
      const views = flushActiveViewIntoViews(s);
      const view = views.find((v) => v.id === viewId);
      if (!view || !isActionsView(view)) return {};
      return {
        views: patchActionsViewInList(views, viewId, {
          items: view.items.filter((i) => i.id !== itemId),
        }),
        selectedMeasureId: s.selectedMeasureId === itemId ? null : s.selectedMeasureId,
      };
    }),

  duplicateMeasureActionItem: (viewId, itemId) => {
    let createdId: string | null = null;
    commit(set, get, (s) => {
      const views = flushActiveViewIntoViews(s);
      const view = views.find((v) => v.id === viewId);
      if (!view || !isActionsView(view)) return {};
      const source = view.items.find((i) => i.id === itemId);
      if (!source) return {};
      const copy = normalizeMeasureActionItem({
        ...structuredClone(source),
        id: generateStormId(),
        title: `${source.title} (Kopie)`,
      });
      createdId = copy.id;
      return {
        views: patchActionsViewInList(views, viewId, {
          items: [...view.items, copy],
        }),
        selectedMeasureId: copy.id,
      };
    });
    return createdId;
  },

  moveMeasureActionItem: (viewId, itemId, targetObligation, targetActionType) =>
    commit(set, get, (s) => {
      const views = flushActiveViewIntoViews(s);
      const view = views.find((v) => v.id === viewId);
      if (!view || !isActionsView(view)) return {};
      const items = view.items.map((item) =>
        item.id === itemId
          ? normalizeMeasureActionItem({
              ...item,
              obligation: targetObligation,
              actionType: targetActionType,
              updatedAt: new Date().toISOString(),
            })
          : item,
      );
      return { views: patchActionsViewInList(views, viewId, { items }) };
    }),

  updateActionsViewConfig: (viewId, patch) =>
    commit(set, get, (s) => {
      const views = flushActiveViewIntoViews(s);
      const view = views.find((v) => v.id === viewId);
      if (!view || !isActionsView(view)) return {};
      return {
        views: patchActionsViewInList(views, viewId, {
          config: { ...view.config, ...patch },
        }),
      };
    }),

  navigateToMeasureTarget: (targetViewId, elementId) => {
    const s = get();
    const views = flushActiveViewIntoViews(s);
    const targetView = views.find((v) => v.id === targetViewId);
    if (!targetView || !isCanvasBoardView(targetView)) return;
    const hasElement =
      targetView.elements.some((e) => e.id === elementId) ||
      targetView.boundedContexts.some((bc) => bc.id === elementId);
    if (!hasElement) return;
    const next = resolveActiveView(views, targetViewId);
    set({
      views,
      activeViewId: next.id,
      ...applyViewToFlatPatch(next),
      ...CLEAR_SELECTION_PATCH,
      selectedMeasureId: null,
      selectedElementIds: targetView.elements.some((e) => e.id === elementId)
        ? [elementId]
        : [],
      selectedBoundedContextIds: targetView.boundedContexts.some((bc) => bc.id === elementId)
        ? [elementId]
        : [],
      past: [],
      future: [],
    });
  },

  replaceBoardFromImport: (payload) => {
    const s = get();
    const past = pushHistory(s.past, captureDomain(s));
    const doc = normalizeBoardDocument(payload);
    const active = resolveActiveView(doc.views, doc.activeViewId);
    set({
      title: doc.title,
      glossary: doc.glossary,
      actionItems: doc.actionItems ?? [],
      bookmarks: doc.bookmarks ?? [],
      appearance: doc.appearance,
      workshopMode: doc.workshopMode,
      activeViewId: active.id,
      views: doc.views,
      ...applyViewToFlatPatch(active),
      ...CLEAR_SELECTION_PATCH,
      past,
      future: [],
      gestureActive: false,
      gestureSnapshotTaken: false,
    });
  },

  importDocumentAsNewViews: (payload) => {
    const prepared = prepareImportedViewsAsNewPages(
      payload,
      get().views.map((v) => v.name),
    );
    if (prepared.views.length === 0) {
      return { ok: false, error: "Die Datei enthält keine Sichten." };
    }
    commit(set, get, (s) => {
      const views = [...flushActiveViewIntoViews(s), ...prepared.views];
      const active = resolveActiveView(views, prepared.activeViewId);
      return {
        views,
        activeViewId: active.id,
        ...applyViewToFlatPatch(active),
        ...CLEAR_SELECTION_PATCH,
      };
    });
    return {
      ok: true,
      viewIds: prepared.views.map((v) => v.id),
      activeViewId: prepared.activeViewId,
    };
  },
}));

export function boardImportPayloadFromStore(): BoardImportPayload {
  const s = useStormBoardStore.getState();
  return {
    title: s.title,
    glossary: s.glossary,
    actionItems: s.actionItems,
    bookmarks: s.bookmarks,
    appearance: s.appearance,
    workshopMode: s.workshopMode,
    activeViewId: s.activeViewId,
    views: flushActiveViewIntoViews(s),
  };
}

/** Flat globals + active view — for SVG/PNG/Markdown exports. */
export function boardActiveSliceFromStore() {
  const s = useStormBoardStore.getState();
  return {
    title: s.title,
    glossary: s.glossary,
    actionItems: s.actionItems,
    appearance: s.appearance,
    modelingMode: s.modelingMode,
    workshopFormat: s.workshopFormat,
    facilitatorEnabled: s.facilitatorEnabled,
    facilitatorPhase: s.facilitatorPhase,
    elements: s.elements,
    connectors: s.connectors,
    relations: s.relations,
    contextRelations: s.contextRelations,
    swimlanes: s.swimlanes,
    boundedContexts: s.boundedContexts,
    canvasLines: s.canvasLines,
    timeline: s.timeline,
    viewport: s.viewport,
    snapToTimeline: s.snapToTimeline,
    snapToGrid: s.snapToGrid,
    customCardTypes: s.customCardTypes,
  };
}
