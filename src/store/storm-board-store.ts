import { create } from "zustand";

import { elementDimensions, defaultLabelForType } from "@/lib/element-styles";
import { defaultRelationType } from "@/lib/relation-validation";
import {
  applyContainmentAssignments,
  translateMatchingElements,
} from "@/lib/region-containment";
import {
  extractClipboardPayload,
  remapClipboardForPaste,
  selectionCentroid,
  takeIdsFromClipboard,
  type BoardClipboardPayload,
} from "@/lib/board-clipboard";
import { generateStormId } from "@/lib/storm-id";
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
  timeline: Timeline;
  viewport: Viewport;
  glossary: GlossaryEntry[];
  appearance: BoardAppearance;
  snapToTimeline: boolean;
  snapToGrid: boolean;
  selectedElementIds: string[];
  selectedRelationId: string | null;
  selectedContextRelationId: string | null;
  selectedBoundedContextId: string | null;
  selectedSwimlaneId: string | null;
  paletteType: ElementType;
  focusMode: boolean;
  relationMode: boolean;
  relationDraftSourceId: string | null;
  contextMapMode: boolean;
  contextMapDraftSourceId: string | null;
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
  setClipboardDropHighlight: (active: boolean) => void;
  moveToClipboard: (ids: string[]) => boolean;
  pasteClipboardAt: (worldX: number, worldY: number) => string[];
  /** Paste subset from clipboard onto the board and remove those items from the clipboard. */
  takeClipboardElementsAt: (ids: string[], worldX: number, worldY: number) => string[];
  clearClipboard: () => void;
  selectElement: (id: string | null, additive?: boolean) => void;
  setSelectedElementIds: (ids: string[], additive?: boolean) => void;
  selectRelation: (id: string | null) => void;
  selectContextRelation: (id: string | null) => void;
  selectBoundedContext: (id: string | null) => void;
  selectSwimlane: (id: string | null) => void;
  clearSelection: () => void;
  openContextMenu: (x: number, y: number, target: ContextMenuTarget) => void;
  closeContextMenu: () => void;

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
    updates: Array<{ id: string; x?: number; y?: number; width?: number; height?: number }>,
  ) => void;

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

  setTimeline: (timeline: Partial<Timeline>) => void;
  addGlossaryEntry: (term: string, definition: string) => void;
  updateGlossaryEntry: (term: string, definition: string) => void;
  deleteGlossaryEntry: (term: string) => void;

  replaceBoardFromImport: (payload: BoardImportPayload) => void;
}

function createElement(type: ElementType, x: number, y: number, label?: string): StormElement {
  const dims = elementDimensions(type);
  return {
    id: generateStormId(),
    type,
    label: label ?? defaultLabelForType(type),
    x,
    y,
    width: dims.width,
    height: dims.height,
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
                  : undefined,
  };
}

function captureDomain(s: StormBoardState): BoardDomainSnapshot {
  return {
    title: s.title,
    glossary: s.glossary,
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
  timeline: initialViewDoc.timeline,
  viewport: initialViewDoc.viewport,
  glossary: [],
  appearance: { ...DEFAULT_APPEARANCE },
  snapToTimeline: initialViewDoc.snapToTimeline,
  snapToGrid: initialViewDoc.snapToGrid,
  selectedElementIds: [],
  selectedRelationId: null,
  selectedContextRelationId: null,
  selectedBoundedContextId: null,
  selectedSwimlaneId: null,
  paletteType: defaultPaletteTypeForMode(initialViewDoc.modelingMode),
  focusMode: false,
  relationMode: false,
  relationDraftSourceId: null,
  contextMapMode: false,
  contextMapDraftSourceId: null,
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
  setClipboardDropHighlight: (clipboardDropHighlight) => set({ clipboardDropHighlight }),

  moveToClipboard: (ids) => {
    const unique = Array.from(new Set(ids));
    if (unique.length === 0) return false;
    let ok = false;
    commit(set, get, (s) => {
      const extracted = extractClipboardPayload(s.elements, s.relations, unique);
      if (!extracted) return {};
      ok = true;
      const idSet = new Set(unique);
      const mergedElements = s.clipboard
        ? [...s.clipboard.elements, ...extracted.elements]
        : extracted.elements;
      const mergedRelations = s.clipboard
        ? [...s.clipboard.relations, ...extracted.relations]
        : extracted.relations;
      const centroid = selectionCentroid(mergedElements);
      return {
        clipboard: {
          elements: mergedElements,
          relations: mergedRelations,
          originX: centroid.x,
          originY: centroid.y,
        },
        clipboardDropHighlight: false,
        elements: s.elements.filter((e) => !idSet.has(e.id)),
        relations: s.relations.filter(
          (r) => !idSet.has(r.sourceId) && !idSet.has(r.targetId),
        ),
        selectedElementIds: [],
        selectedRelationId: null,
      };
    });
    return ok;
  },

  pasteClipboardAt: (worldX, worldY) => {
    const payload = get().clipboard;
    if (!payload || payload.elements.length === 0) return [];
    let newIds: string[] = [];
    commit(set, get, (s) => {
      const remapped = remapClipboardForPaste(payload, worldX, worldY);
      newIds = remapped.newIds;
      const elements = applyContainmentAssignments(
        [...s.elements, ...remapped.elements],
        s.swimlanes,
        s.boundedContexts,
      );
      return {
        elements,
        relations: [...s.relations, ...remapped.relations],
        selectedElementIds: remapped.newIds,
        selectedRelationId: null,
        selectedContextRelationId: null,
        selectedBoundedContextId: null,
        selectedSwimlaneId: null,
      };
    });
    return newIds;
  },

  takeClipboardElementsAt: (ids, worldX, worldY) => {
    const payload = get().clipboard;
    if (!payload) return [];
    const { taken, remaining } = takeIdsFromClipboard(payload, ids);
    if (!taken) return [];
    let newIds: string[] = [];
    commit(set, get, (s) => {
      const remapped = remapClipboardForPaste(taken, worldX, worldY);
      newIds = remapped.newIds;
      const elements = applyContainmentAssignments(
        [...s.elements, ...remapped.elements],
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
        selectedBoundedContextId: null,
        selectedSwimlaneId: null,
      };
    });
    return newIds;
  },

  clearClipboard: () => set({ clipboard: null, clipboardDropHighlight: false }),

  selectElement: (id, additive) =>
    set((s) => {
      if (!id) return { selectedElementIds: [], selectedRelationId: null };
      if (additive) {
        const exists = s.selectedElementIds.includes(id);
        return {
          selectedElementIds: exists
            ? s.selectedElementIds.filter((x) => x !== id)
            : [...s.selectedElementIds, id],
          selectedRelationId: null,
          selectedContextRelationId: null,
          selectedBoundedContextId: null,
          selectedSwimlaneId: null,
        };
      }
      return {
        selectedElementIds: [id],
        selectedRelationId: null,
        selectedContextRelationId: null,
        selectedBoundedContextId: null,
        selectedSwimlaneId: null,
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
        selectedBoundedContextId: null,
        selectedSwimlaneId: null,
      };
    }),

  selectRelation: (id) =>
    set({
      selectedRelationId: id,
      selectedContextRelationId: null,
      selectedElementIds: id ? [] : get().selectedElementIds,
      selectedBoundedContextId: null,
      selectedSwimlaneId: null,
    }),

  selectContextRelation: (id) =>
    set({
      selectedContextRelationId: id,
      selectedRelationId: null,
      selectedElementIds: id ? [] : get().selectedElementIds,
      selectedBoundedContextId: null,
      selectedSwimlaneId: null,
    }),

  selectBoundedContext: (id) =>
    set({
      selectedBoundedContextId: id,
      selectedElementIds: id ? [] : get().selectedElementIds,
      selectedRelationId: null,
      selectedContextRelationId: null,
      selectedSwimlaneId: null,
    }),

  selectSwimlane: (id) =>
    set({
      selectedSwimlaneId: id,
      selectedElementIds: id ? [] : get().selectedElementIds,
      selectedRelationId: null,
      selectedContextRelationId: null,
      selectedBoundedContextId: null,
    }),

  clearSelection: () =>
    set({
      selectedElementIds: [],
      selectedRelationId: null,
      selectedContextRelationId: null,
      selectedBoundedContextId: null,
      selectedSwimlaneId: null,
    }),

  openContextMenu: (x, y, target) => set({ contextMenu: { x, y, target } }),
  closeContextMenu: () => set({ contextMenu: null }),

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
      selectedBoundedContextId: null,
      selectedSwimlaneId: null,
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
      selectedBoundedContextId: null,
      selectedSwimlaneId: null,
    });
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  addElement: (type, x, y, label) => {
    const el = createElement(type, x, y, label);
    commit(set, get, (s) => {
      const elements = applyContainmentAssignments(
        [...s.elements, el],
        s.swimlanes,
        s.boundedContexts,
      );
      return {
        elements,
        selectedElementIds: [el.id],
      };
    });
    return el.id;
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
      return {
        elements: applyContainmentAssignments(elements, s.swimlanes, s.boundedContexts),
      };
    }),

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
    }),

  setContextMapDraftSource: (contextMapDraftSourceId) => set({ contextMapDraftSourceId }),

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
    };
    commit(set, get, (s) => {
      const swimlanes = [...s.swimlanes, lane];
      return {
        swimlanes,
        selectedSwimlaneId: id,
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
      selectedSwimlaneId: s.selectedSwimlaneId === id ? null : s.selectedSwimlaneId,
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
    };
    commit(set, get, (s) => {
      const boundedContexts = [...s.boundedContexts, bc];
      return {
        boundedContexts,
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
        selectedBoundedContextId:
          s.selectedBoundedContextId === id ? null : s.selectedBoundedContextId,
        selectedContextRelationId:
          s.selectedContextRelationId &&
          !nextContextRelations.some((r) => r.id === s.selectedContextRelationId)
            ? null
            : s.selectedContextRelationId,
      };
    }),

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

  replaceBoardFromImport: (payload) => {
    const s = get();
    const past = pushHistory(s.past, captureDomain(s));
    const doc = normalizeBoardDocument(payload);
    const active = resolveActiveView(doc.views, doc.activeViewId);
    set({
      title: doc.title,
      glossary: doc.glossary,
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
}));

export function boardImportPayloadFromStore(): BoardImportPayload {
  const s = useStormBoardStore.getState();
  return {
    title: s.title,
    glossary: s.glossary,
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
    timeline: s.timeline,
    viewport: s.viewport,
    snapToTimeline: s.snapToTimeline,
    snapToGrid: s.snapToGrid,
  };
}
