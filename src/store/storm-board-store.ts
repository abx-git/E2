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
  nextElementZIndex,
  nextZIndex,
  regionZOrderItems,
  sendBackward as computeSendRegionsBackward,
  sendElementsBackward as computeSendBackward,
  sendElementsToBack as computeSendToBack,
  sendToBack as computeSendRegionsToBack,
} from "@/lib/element-z-order";
import { generateStormId } from "@/lib/storm-id";

const DUPLICATE_OFFSET_PX = 28;
import { prepareImportedViewsAsNewPages } from "@/lib/board-view-import";
import { backupBeforeSuspiciousSwitch } from "@/lib/board-backup";
import { normalizeActionItem } from "@/lib/action-items";
import type { BoardImportPayload, BoardView } from "@/lib/storm-json";
import { createEmptyBoardView, normalizeBoardDocument } from "@/lib/storm-json";
import {
  applyViewToFlatPatch,
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
  selectedElementIds: string[];
  selectedRelationId: string | null;
  selectedContextRelationId: string | null;
  selectedBoundedContextIds: string[];
  selectedSwimlaneIds: string[];
  /** Ephemeral UI: element that should enter label edit (e.g. after create). */
  editingElementId: string | null;
  paletteType: ElementType;
  focusMode: boolean;
  /** Ephemeral canvas text search (not persisted / not undo). */
  searchQuery: string;
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

  /** Undo stacks (not persisted). */
  past: BoardDomainSnapshot[];
  future: BoardDomainSnapshot[];
  gestureActive: boolean;
  gestureSnapshotTaken: boolean;

  setTitle: (title: string) => void;
  setWorkshopMode: (enabled: boolean) => void;
  setActiveView: (id: string) => void;
  addView: (name?: string) => string;
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
  setFocusMode: (enabled: boolean) => void;
  setSearchQuery: (query: string) => void;
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

  addElement: (type: ElementType, x: number, y: number, label?: string) => string;
  updateElement: (id: string, patch: Partial<StormElement>) => void;
  deleteElement: (id: string) => void;
  moveElement: (id: string, x: number, y: number) => void;
  moveElements: (updates: Array<{ id: string; x: number; y: number }>) => void;
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
  setRelationMode: (enabled: boolean) => void;
  setRelationDraftSource: (id: string | null) => void;
  connectElements: (sourceId: string, targetId: string) => string | null;

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

function createElement(
  type: ElementType,
  x: number,
  y: number,
  label?: string,
  zIndex = 0,
): StormElement {
  const dims = elementDimensions(type);
  return {
    id: generateStormId(),
    type,
    label: label ?? defaultLabelForType(type),
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
                      : type === "arc42Section"
                        ? { arc42SectionNumber: 1 }
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
  selectedElementIds: [],
  selectedRelationId: null,
  selectedContextRelationId: null,
  selectedBoundedContextIds: [],
  selectedSwimlaneIds: [],
  editingElementId: null,
  paletteType: defaultPaletteTypeForMode(initialViewDoc.modelingMode),
  focusMode: false,
  searchQuery: "",
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
      past: [],
      future: [],
      gestureActive: false,
      gestureSnapshotTaken: false,
    });
  },

  addView: (name) => {
    let createdId = "";
    commit(set, get, (s) => {
      const views = flushActiveViewIntoViews(s);
      createdId = generateStormId();
      const view = createEmptyBoardView({
        id: createdId,
        name: name?.trim() || `Sicht ${views.length + 1}`,
        modelingMode: s.modelingMode,
        workshopFormat: isWorkshopFormatForMode(s.workshopFormat, s.modelingMode)
          ? s.workshopFormat
          : "free",
      });
      return {
        views: [...views, view],
        activeViewId: createdId,
        ...applyViewToFlatPatch(view),
        ...CLEAR_SELECTION_PATCH,
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
      return {
        modelingMode,
        workshopFormat,
        facilitatorPhase: 0,
        facilitatorEnabled: workshopFormat === "free" ? false : s.facilitatorEnabled,
        paletteType: defaultPaletteTypeForMode(modelingMode),
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
  setFocusMode: (focusMode) => set({ focusMode }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
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
      const elements = applyContainmentAssignments(
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
      const elements = applyContainmentAssignments(
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
      const elements = applyContainmentAssignments(
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
          selectedRelationId: null,
          selectedCanvasLineId: null,
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
          selectedRelationId: null,
          selectedContextRelationId: null,
          selectedBoundedContextIds: [],
          selectedSwimlaneIds: [],
          selectedCanvasLineId: null,
          editingElementId:
            s.editingElementId && selectedElementIds.includes(s.editingElementId)
              ? s.editingElementId
              : null,
        };
      }
      return {
        selectedElementIds: [id],
        selectedRelationId: null,
        selectedContextRelationId: null,
        selectedBoundedContextIds: [],
        selectedSwimlaneIds: [],
        selectedCanvasLineId: null,
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
        selectedRelationId: null,
        selectedContextRelationId: null,
        selectedBoundedContextIds: [],
        selectedSwimlaneIds: [],
        selectedCanvasLineId: null,
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
          selectedRelationId: null,
          selectedContextRelationId: null,
          selectedCanvasLineId: null,
          editingElementId: null,
        };
      }
      return {
        selectedElementIds: elementIds,
        selectedSwimlaneIds: swimlaneIds,
        selectedBoundedContextIds: boundedContextIds,
        selectedRelationId: null,
        selectedContextRelationId: null,
        selectedCanvasLineId: null,
        editingElementId: null,
      };
    }),

  selectRelation: (id) =>
    set({
      selectedRelationId: id,
      selectedContextRelationId: null,
      selectedCanvasLineId: null,
      selectedElementIds: id ? [] : get().selectedElementIds,
      selectedBoundedContextIds: [],
      selectedSwimlaneIds: [],
    }),

  selectContextRelation: (id) =>
    set({
      selectedContextRelationId: id,
      selectedRelationId: null,
      selectedCanvasLineId: null,
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
          selectedRelationId: null,
          selectedContextRelationId: null,
          selectedSwimlaneIds: [],
          selectedCanvasLineId: null,
        };
      }
      return {
        selectedBoundedContextIds: [id],
        selectedElementIds: [],
        selectedRelationId: null,
        selectedContextRelationId: null,
        selectedSwimlaneIds: [],
        selectedCanvasLineId: null,
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
          selectedRelationId: null,
          selectedContextRelationId: null,
          selectedBoundedContextIds: [],
          selectedCanvasLineId: null,
        };
      }
      return {
        selectedSwimlaneIds: [id],
        selectedElementIds: [],
        selectedRelationId: null,
        selectedContextRelationId: null,
        selectedBoundedContextIds: [],
        selectedCanvasLineId: null,
      };
    }),

  clearSelection: () =>
    set({
      selectedElementIds: [],
      selectedRelationId: null,
      selectedContextRelationId: null,
      selectedBoundedContextIds: [],
      selectedSwimlaneIds: [],
      selectedCanvasLineId: null,
      editingElementId: null,
    }),

  openContextMenu: (x, y, target) => set({ contextMenu: { x, y, target } }),
  closeContextMenu: () => set({ contextMenu: null }),
  clearEditingElementId: () => set({ editingElementId: null }),

  beginGesture: () => set({ gestureActive: true, gestureSnapshotTaken: false }),
  endGesture: () => {
    const s = get();
    const elements = applyContainmentAssignments(s.elements, s.swimlanes, s.boundedContexts);
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
      selectedRelationId: null,
      selectedContextRelationId: null,
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
      selectedRelationId: null,
      selectedContextRelationId: null,
      selectedBoundedContextIds: [],
      selectedSwimlaneIds: [],
      editingElementId: null,
    });
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  addElement: (type, x, y, label) => {
    let createdId = "";
    commit(set, get, (s) => {
      const el = createElement(type, x, y, label, nextElementZIndex(s.elements));
      createdId = el.id;
      const elements = applyContainmentAssignments(
        [...s.elements, el],
        s.swimlanes,
        s.boundedContexts,
      );
      return {
        elements,
        selectedElementIds: [el.id],
        editingElementId: el.id,
      };
    });
    return createdId;
  },

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
          ? applyContainmentAssignments(elements, s.swimlanes, s.boundedContexts)
          : elements,
      };
    }),

  deleteElement: (id) =>
    commit(set, get, (s) => ({
      elements: s.elements.filter((e) => e.id !== id),
      relations: s.relations.filter((r) => r.sourceId !== id && r.targetId !== id),
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
      return {
        elements: geometryChanged
          ? applyContainmentAssignments(elements, s.swimlanes, s.boundedContexts)
          : elements,
      };
    }),

  bringElementsToFront: (ids) => {
    const patches = computeBringToFront(get().elements, ids);
    if (patches.length) get().patchElements(patches);
  },

  sendElementsToBack: (ids) => {
    const patches = computeSendToBack(get().elements, ids);
    if (patches.length) get().patchElements(patches);
  },

  bringElementsForward: (ids) => {
    const patches = computeBringForward(get().elements, ids);
    if (patches.length) get().patchElements(patches);
  },

  sendElementsBackward: (ids) => {
    const patches = computeSendBackward(get().elements, ids);
    if (patches.length) get().patchElements(patches);
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
      label,
    };
    commit(set, get, (s) => ({
      relations: [...s.relations, rel],
      relationDraftSourceId: null,
    }));
    return rel.id;
  },

  updateRelation: (id, patch) =>
    commit(set, get, (s) => ({
      relations: s.relations.map((r) => (r.id === id ? { ...r, ...patch, id: r.id } : r)),
    })),

  deleteRelation: (id) =>
    commit(set, get, (s) => ({
      relations: s.relations.filter((r) => r.id !== id),
      selectedRelationId: s.selectedRelationId === id ? null : s.selectedRelationId,
    })),

  setRelationMode: (relationMode) =>
    set({
      relationMode,
      relationDraftSourceId: relationMode ? get().relationDraftSourceId : null,
      contextMapMode: relationMode ? false : get().contextMapMode,
      contextMapDraftSourceId: relationMode ? null : get().contextMapDraftSourceId,
      lineDrawMode: relationMode ? false : get().lineDrawMode,
      selectedCanvasLineId: relationMode ? null : get().selectedCanvasLineId,
    }),

  setRelationDraftSource: (relationDraftSourceId) => set({ relationDraftSourceId }),

  connectElements: (sourceId, targetId) => {
    if (sourceId === targetId) return null;
    const src = get().elements.find((e) => e.id === sourceId);
    const tgt = get().elements.find((e) => e.id === targetId);
    if (!src || !tgt) return null;
    return get().addRelation(sourceId, targetId, defaultRelationType(src, tgt));
  },

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
      contextRelations: [...s.contextRelations, rel],
      contextMapDraftSourceId: null,
      selectedContextRelationId: rel.id,
    }));
    return rel.id;
  },

  updateContextRelation: (id, patch) =>
    commit(set, get, (s) => ({
      contextRelations: s.contextRelations.map((r) =>
        r.id === id ? { ...r, ...patch, id: r.id } : r,
      ),
    })),

  deleteContextRelation: (id) =>
    commit(set, get, (s) => ({
      contextRelations: s.contextRelations.filter((r) => r.id !== id),
      selectedContextRelationId:
        s.selectedContextRelationId === id ? null : s.selectedContextRelationId,
    })),

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

  setLineDrawMode: (lineDrawMode) =>
    set({
      lineDrawMode,
      selectedCanvasLineId: lineDrawMode ? null : get().selectedCanvasLineId,
      relationMode: lineDrawMode ? false : get().relationMode,
      relationDraftSourceId: lineDrawMode ? null : get().relationDraftSourceId,
      contextMapMode: lineDrawMode ? false : get().contextMapMode,
      contextMapDraftSourceId: lineDrawMode ? null : get().contextMapDraftSourceId,
    }),

  setLineArrowHead: (lineArrowHead) => set({ lineArrowHead }),

  addCanvasLine: (line) => {
    const normalized = normalizeCanvasLine({
      ...line,
      arrowHead: line.arrowHead ?? get().lineArrowHead,
    });
    if (!normalized) return null;
    commit(set, get, (s) => ({
      canvasLines: [...s.canvasLines, normalized],
      selectedCanvasLineId: normalized.id,
      selectedElementIds: [],
      selectedRelationId: null,
      selectedContextRelationId: null,
      selectedBoundedContextIds: [],
      selectedSwimlaneIds: [],
    }));
    return normalized.id;
  },

  updateCanvasLine: (id, patch) =>
    commit(set, get, (s) => ({
      canvasLines: s.canvasLines.map((line) => {
        if (line.id !== id) return line;
        return normalizeCanvasLine({ ...line, ...patch, id: line.id }) ?? line;
      }),
    })),

  deleteCanvasLine: (id) =>
    commit(set, get, (s) => ({
      canvasLines: s.canvasLines.filter((line) => line.id !== id),
      selectedCanvasLineId: s.selectedCanvasLineId === id ? null : s.selectedCanvasLineId,
    })),

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
        elements: applyContainmentAssignments(s.elements, swimlanes, s.boundedContexts),
      };
    });
    return id;
  },

  updateSwimlane: (id, patch, options) =>
    commit(set, get, (s) => {
      const lane = s.swimlanes.find((l) => l.id === id);
      if (!lane) return {};
      const nextLane = { ...lane, ...patch, id: lane.id };
      const swimlanes = s.swimlanes.map((l) => (l.id === id ? nextLane : l));

      const resizing = patch.width !== undefined || patch.height !== undefined;
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
      if (!lockedMove && (patch.x !== undefined || patch.y !== undefined || resizing)) {
        elements = applyContainmentAssignments(elements, swimlanes, s.boundedContexts);
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
        elements: applyContainmentAssignments(s.elements, s.swimlanes, boundedContexts),
      };
    });
    return id;
  },

  updateBoundedContext: (id, patch, options) =>
    commit(set, get, (s) => {
      const bc = s.boundedContexts.find((b) => b.id === id);
      if (!bc) return {};
      const nextBc = { ...bc, ...patch, id: bc.id };
      const boundedContexts = s.boundedContexts.map((b) => (b.id === id ? nextBc : b));

      const resizing = patch.width !== undefined || patch.height !== undefined;
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
      if (!lockedMove && (patch.x !== undefined || patch.y !== undefined || resizing)) {
        elements = applyContainmentAssignments(elements, s.swimlanes, boundedContexts);
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

      const updatedViews = views.map((v) =>
        v.id === activeView.id
          ? {
              ...v,
              boundedContexts: v.boundedContexts.map((b) =>
                b.id === bcId ? { ...b, detailViewId: newViewId } : b,
              ),
            }
          : v,
      );

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

    backupBeforeSuspiciousSwitch("view");
    return get().openBoundedContextParentView(bcId);
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
    relations: s.relations,
    contextRelations: s.contextRelations,
    swimlanes: s.swimlanes,
    boundedContexts: s.boundedContexts,
    canvasLines: s.canvasLines,
    timeline: s.timeline,
    viewport: s.viewport,
    snapToTimeline: s.snapToTimeline,
    snapToGrid: s.snapToGrid,
  };
}
