import type { BoardView, CanvasBoardView } from "@/lib/storm-json";
import {
  createEmptyBoardView,
  isActionsView,
  isCanvasBoardView,
  normalizeBoardView,
} from "@/lib/storm-json";
import { generateStormId } from "@/lib/storm-id";
import type { CustomCardType } from "@/lib/custom-card-types";
import { defaultPaletteTypeForMode } from "@/types/storm-element";
import type {
  ElementType,
  ModelingMode,
  StormElement,
  Swimlane,
  BoundedContext,
  Timeline,
  Viewport,
  WorkshopFormat,
  GlossaryEntry,
} from "@/types/storm-element";
import type { ActionItem } from "@/types/action-item";
import type { CanvasLine, LineArrowHead, ViewBookmark } from "@/types/canvas-annotation";
import type { BoardConnector } from "@/types/board-connector";
import type { ContextRelation, StormRelation } from "@/types/storm-relation";
import type { BoardAppearance } from "@/lib/board-appearance";

/** Flat canvas fields mirrored from the active view. */
export interface ActiveViewFlatState {
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
  timeline: Timeline;
  viewport: Viewport;
  snapToTimeline: boolean;
  snapToGrid: boolean;
  customCardTypes: CustomCardType[];
  /** Canvas filter: built-in palette types hidden in this view. */
  hiddenElementTypes: ElementType[];
  /** Freeform: hidden custom stereotype ids in this view. */
  hiddenCustomTypeIds: string[];
}

export interface ViewDocumentState extends ActiveViewFlatState {
  title: string;
  glossary: GlossaryEntry[];
  actionItems: ActionItem[];
  bookmarks: ViewBookmark[];
  appearance: BoardAppearance;
  workshopMode: boolean;
  activeViewId: string;
  views: BoardView[];
}

export function flatFieldsFromView(view: CanvasBoardView): ActiveViewFlatState {
  return {
    modelingMode: view.modelingMode,
    workshopFormat: view.workshopFormat,
    facilitatorEnabled: view.facilitatorEnabled,
    facilitatorPhase: view.facilitatorPhase,
    elements: view.elements,
    connectors: view.connectors,
    relations: view.relations,
    contextRelations: view.contextRelations,
    swimlanes: view.swimlanes,
    boundedContexts: view.boundedContexts,
    canvasLines: view.canvasLines,
    timeline: view.timeline,
    viewport: view.viewport,
    snapToTimeline: view.snapToTimeline,
    snapToGrid: view.snapToGrid,
    customCardTypes: view.customCardTypes ?? [],
    hiddenElementTypes: view.hiddenElementTypes ?? [],
    hiddenCustomTypeIds: view.hiddenCustomTypeIds ?? [],
  };
}

export function viewFromFlat(
  id: string,
  name: string,
  flat: ActiveViewFlatState,
): CanvasBoardView {
  return normalizeBoardView({
    id,
    name,
    ...flat,
  });
}

/** Write current flat canvas fields back into the active entry of `views`. */
export function flushActiveViewIntoViews(state: ViewDocumentState): BoardView[] {
  const active = resolveActiveView(state.views, state.activeViewId);
  if (isActionsView(active)) {
    return state.views;
  }
  return state.views.map((v) =>
    v.id === state.activeViewId && isCanvasBoardView(v)
      ? viewFromFlat(v.id, v.name, state)
      : v,
  );
}

export function resolveActiveView(
  views: BoardView[],
  activeViewId: string,
): BoardView {
  return views.find((v) => v.id === activeViewId) ?? views[0]!;
}

export function applyViewToFlatPatch(view: BoardView): Partial<ActiveViewFlatState> & {
  paletteType: ReturnType<typeof defaultPaletteTypeForMode>;
  paletteCustomTypeId: string | null;
} {
  if (isActionsView(view)) {
    return {
      paletteType: defaultPaletteTypeForMode("eventStorming"),
      paletteCustomTypeId: null,
    };
  }
  return {
    ...flatFieldsFromView(view),
    paletteType: defaultPaletteTypeForMode(view.modelingMode),
    paletteCustomTypeId:
      view.modelingMode === "freeform"
        ? view.customCardTypes?.[0]?.id ?? null
        : null,
  };
}

export function createInitialViewDocument(title: string): {
  activeViewId: string;
  views: BoardView[];
} & ActiveViewFlatState {
  const id = generateStormId();
  const view = createEmptyBoardView({ id, name: "Board" });
  return {
    activeViewId: id,
    views: [view],
    ...flatFieldsFromView(view),
  };
}

/** Clear connector/relation focus (endpoint handles, inspector). */
export const CLEAR_CONNECTOR_FOCUS_PATCH = {
  selectedConnectorId: null as string | null,
  selectedRelationId: null as string | null,
  selectedContextRelationId: null as string | null,
  selectedCanvasLineId: null as string | null,
  selectedConnectorWaypoints: [] as { connectorId: string; index: number }[],
};

export const CLEAR_SELECTION_PATCH = {
  selectedElementIds: [] as string[],
  ...CLEAR_CONNECTOR_FOCUS_PATCH,
  connectorDraftSource: null,
  selectedBoundedContextIds: [] as string[],
  selectedSwimlaneIds: [] as string[],
  relationMode: false,
  relationDraftSourceId: null as string | null,
  contextMapMode: false,
  contextMapDraftSourceId: null as string | null,
  lineDrawMode: false,
  lineArrowHead: "end" as LineArrowHead,
  contextMenu: null,
  /** Ephemeral: request label edit on a newly created element. */
  editingElementId: null as string | null,
};
