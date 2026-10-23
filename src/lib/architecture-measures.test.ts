import { beforeEach, describe, expect, it } from "vitest";
import {
  createEmptyActionsView,
  filterMeasureItems,
  generateActionsMarkdownReport,
  normalizeActionsView,
  normalizeMeasureActionItem,
} from "@/lib/architecture-measures";
import { encodeE2vDocument } from "@/lib/e2v/encode";
import { boardImportPayloadFromE2vText } from "@/lib/e2v/decode";
import { normalizeBoardDocument, createDefaultBoardDocument } from "@/lib/storm-json";
import { useStormBoardStore } from "@/store/storm-board-store";

describe("architecture measures", () => {
  it("normalizes measure items with defaults", () => {
    const item = normalizeMeasureActionItem({ title: "Edge API" });
    expect(item.title).toBe("Edge API");
    expect(item.actionType).toBe("IMPROVE");
    expect(item.obligation).toBe("Recommended");
    expect(item.status).toBe("open");
  });

  it("keeps an empty title instead of substituting placeholder text", () => {
    const item = normalizeMeasureActionItem({ title: "" });
    expect(item.title).toBe("");
  });

  it("filters by quality and search", () => {
    const view = createEmptyActionsView({
      id: "v1",
      name: "Review",
      items: [
        normalizeMeasureActionItem({
          title: "TLS",
          qualities: ["Security"],
          owner: "Alex",
        }),
        normalizeMeasureActionItem({ title: "Cache", qualities: ["Performance"] }),
      ],
    });
    const filtered = filterMeasureItems(view.items, {
      groupBy: "obligation",
      qualityFilters: { Security: "include" },
      searchQuery: "tls",
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.title).toBe("TLS");
  });

  it("generates markdown report sections", () => {
    const view = normalizeActionsView({
      id: "a1",
      name: "Board",
      type: "actions",
      items: [
        normalizeMeasureActionItem({
          title: "Cut legacy",
          actionType: "CUT",
          obligation: "Required",
          description: "Remove batch job",
        }),
      ],
    });
    const md = generateActionsMarkdownReport(view, "Projekt", {
      title: "Maßnahmen",
      created: "Erstellt",
      overview: "Übersicht",
      total: "Gesamt",
      byObligation: "Obligation",
      byActionType: "Typ",
      tableHeaders: {
        type: "Typ",
        measure: "Maßnahme",
        obligation: "Obligation",
        qualities: "Qualitäten",
        effort: "Aufwand",
        owner: "Owner",
        reference: "Referenz",
      },
      details: "Details",
      none: "Keine",
      actionType: {
        INTRODUCE: "Intro",
        SCALE: "Scale",
        IMPROVE: "Improve",
        HOLD: "Hold",
        CUT: "Cut",
      },
      obligation: {
        Required: "Required",
        Recommended: "Recommended",
        Optional: "Optional",
      },
      quality: {
        Security: "Security",
        Maintainability: "Maintainability",
        Resilience: "Resilience",
        Performance: "Performance",
        Observability: "Observability",
        Interoperability: "Interop",
      },
      status: {
        open: "open",
        in_progress: "in progress",
        done: "done",
        discarded: "discarded",
      },
      effort: { XS: "XS", S: "S", M: "M", L: "L", XL: "XL" },
    });
    expect(md).toContain("Cut legacy");
    expect(md).toContain("Remove batch job");
    expect(md).toContain("| Cut |");
  });

  it("round-trips actions views through E2V", () => {
    const doc = normalizeBoardDocument({
      title: "E2V",
      views: [
        createEmptyActionsView({
          id: "a1",
          name: "Review",
          items: [normalizeMeasureActionItem({ title: "Scale out API", actionType: "SCALE" })],
        }),
      ],
      activeViewId: "a1",
    });
    const text = encodeE2vDocument(doc);
    const decoded = boardImportPayloadFromE2vText(text);
    expect(decoded?.views[0]).toMatchObject({ type: "actions", name: "Review" });
    if (!decoded || decoded.views[0]?.type !== "actions") throw new Error("expected actions");
    expect(decoded.views[0].items[0]?.title).toBe("Scale out API");
  });

  it("accepts actions views in board document normalization", () => {
    const doc = normalizeBoardDocument({
      title: "T",
      views: [
        {
          id: "c1",
          name: "Canvas",
          modelingMode: "eventStorming",
          workshopFormat: "free",
          facilitatorEnabled: false,
          facilitatorPhase: 0,
          elements: [],
          relations: [],
          swimlanes: [],
          boundedContexts: [],
          timeline: { startLabel: "", endLabel: "", visible: true, y: 0 },
          viewport: { x: 0, y: 0, zoom: 1 },
          snapToTimeline: true,
          snapToGrid: false,
        },
        {
          type: "actions",
          id: "a1",
          name: "Measures",
          config: { groupBy: "obligation" },
          items: [],
        },
      ],
      activeViewId: "a1",
    });
    expect(doc.views).toHaveLength(2);
    expect(doc.views[1]).toMatchObject({ type: "actions", id: "a1" });
  });
});

describe("store measure CRUD", () => {
  beforeEach(() => {
    useStormBoardStore.getState().replaceBoardFromImport(createDefaultBoardDocument());
    useStormBoardStore.setState({ past: [], future: [] });
  });

  it("adds and updates measures with undo", () => {
    const viewId = useStormBoardStore.getState().addActionsView("Review");
    const itemId = useStormBoardStore.getState().addMeasureActionItem(viewId, {
      title: "Introduce API GW",
    });
    expect(itemId).toBeTruthy();
    useStormBoardStore.getState().updateMeasureActionItem(viewId, itemId, {
      obligation: "Required",
    });
    const view = useStormBoardStore
      .getState()
      .views.find((v) => v.id === viewId);
    expect(view && "items" in view && view.type === "actions").toBe(true);
    if (!view || view.type !== "actions") throw new Error("expected actions view");
    expect(view.items[0]?.obligation).toBe("Required");
    useStormBoardStore.getState().undo();
    const undone = useStormBoardStore
      .getState()
      .views.find((v) => v.id === viewId);
    if (!undone || undone.type !== "actions") throw new Error("expected actions view");
    expect(undone.items[0]?.obligation).toBe("Recommended");
  });
});
