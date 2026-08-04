import { describe, expect, it } from "vitest";

import { DEFAULT_APPEARANCE } from "@/lib/board-appearance";
import { createDefaultBoardDocument, createEmptyBoardView } from "@/lib/storm-json";
import {
  AI_CONTEXT_FORMAT,
  AI_CONTEXT_VERSION,
  aiContextExportFilename,
  buildAiBoardContext,
  buildSingleViewSnapshot,
  singleViewExportFilename,
  stringifyAiBoardContext,
  stringifySingleViewExport,
} from "@/lib/view-export";

describe("view-export", () => {
  const doc = createDefaultBoardDocument({
    title: "Orders",
    glossary: [{ term: "Order", definition: "A customer purchase" }],
    actionItems: [
      {
        id: "ai-1",
        title: "Clarify payment",
        status: "open",
        area: "question",
        elementId: "evt-1",
      },
    ],
    appearance: { ...DEFAULT_APPEARANCE },
    views: [
      createEmptyBoardView({
        id: "view-a",
        name: "Big Picture",
        modelingMode: "eventStorming",
        elements: [
          {
            id: "evt-2",
            type: "domainEvent",
            label: "Order Shipped",
            x: 300,
            y: 100,
            width: 160,
            height: 72,
            metadata: {
              showDescriptionOnCard: true,
              noteColor: "cream",
              eventSchema: { orderId: "string" },
            },
          },
          {
            id: "evt-1",
            type: "domainEvent",
            label: "Order Placed",
            description: "Customer submitted checkout",
            x: 100,
            y: 100,
            width: 160,
            height: 72,
            boundedContextId: "bc-1",
            swimlaneId: "lane-1",
          },
          {
            id: "cmd-1",
            type: "command",
            label: "Place Order",
            x: 50,
            y: 200,
            width: 160,
            height: 72,
          },
        ],
        relations: [
          {
            id: "rel-1",
            type: "triggers",
            sourceId: "cmd-1",
            targetId: "evt-1",
            label: "on submit",
          },
        ],
        swimlanes: [
          {
            id: "lane-1",
            label: "Checkout",
            x: 0,
            y: 0,
            width: 800,
            height: 200,
            color: "#abcdef",
            locked: true,
          },
        ],
        boundedContexts: [
          {
            id: "bc-1",
            label: "Ordering",
            purpose: "Handle orders",
            x: 0,
            y: 0,
            width: 400,
            height: 300,
            detailViewId: "view-b",
          },
        ],
        contextRelations: [],
        timeline: { y: 400, startLabel: "Start", endLabel: "Done" },
      }),
      createEmptyBoardView({
        id: "view-b",
        name: "Ordering Detail",
        elements: [
          {
            id: "agg-1",
            type: "aggregate",
            label: "Order",
            x: 10,
            y: 10,
          },
        ],
      }),
    ],
    activeViewId: "view-a",
  });

  it("builds a re-importable single-view snapshot", () => {
    const snap = buildSingleViewSnapshot(doc, "view-a");
    expect(snap).not.toBeNull();
    expect(snap!.views).toHaveLength(1);
    expect(snap!.views[0]!.id).toBe("view-a");
    expect(snap!.views[0]!.elements).toHaveLength(3);
    expect(snap!.activeViewId).toBe("view-a");
    expect(snap!.glossary).toEqual(doc.glossary);
    expect(snap!.workshopMode).toBe(false);
    // Full extract keeps layout
    expect(snap!.views[0]!.elements[0]).toMatchObject({ x: expect.any(Number), y: expect.any(Number) });
  });

  it("stringifies single-view export", () => {
    const text = stringifySingleViewExport(doc, "view-a");
    expect(text).toContain('"name": "Big Picture"');
    expect(text).not.toContain("Ordering Detail");
  });

  it("returns null for unknown view", () => {
    expect(buildSingleViewSnapshot(doc, "missing")).toBeNull();
    expect(buildAiBoardContext(doc, "missing")).toBeNull();
  });

  it("builds AI context without layout and card-display noise", () => {
    const ctx = buildAiBoardContext(doc, "view-a");
    expect(ctx).not.toBeNull();
    expect(ctx!.format).toBe(AI_CONTEXT_FORMAT);
    expect(ctx!.version).toBe(AI_CONTEXT_VERSION);
    expect(ctx!.title).toBe("Orders");
    expect(ctx!.view.name).toBe("Big Picture");
    expect(ctx!.glossary).toEqual([{ term: "Order", definition: "A customer purchase" }]);

    // Left-to-right order
    expect(ctx!.view.elements.map((e) => e.label)).toEqual([
      "Place Order",
      "Order Placed",
      "Order Shipped",
    ]);
    expect(ctx!.view.elements[0]!.order).toBe(1);

    const placed = ctx!.view.elements.find((e) => e.id === "evt-1")!;
    expect(placed.swimlane).toBe("Checkout");
    expect(placed.boundedContext).toBe("Ordering");
    expect(placed.description).toBe("Customer submitted checkout");
    expect(placed).not.toHaveProperty("x");
    expect(placed).not.toHaveProperty("y");

    const shipped = ctx!.view.elements.find((e) => e.id === "evt-2")!;
    expect(shipped.metadata).toEqual({ eventSchema: { orderId: "string" } });
    expect(shipped.metadata).not.toHaveProperty("showDescriptionOnCard");
    expect(shipped.metadata).not.toHaveProperty("noteColor");

    expect(ctx!.view.boundedContexts[0]).toEqual({
      id: "bc-1",
      label: "Ordering",
      purpose: "Handle orders",
      detailView: "Ordering Detail",
    });
    expect(ctx!.view.swimlanes).toEqual([{ id: "lane-1", label: "Checkout" }]);
    expect(ctx!.view.timeline).toEqual({ startLabel: "Start", endLabel: "Done" });

    expect(ctx!.view.relations[0]).toMatchObject({
      type: "triggers",
      from: "Place Order",
      to: "Order Placed",
      label: "on submit",
    });

    expect(ctx!.actionItems[0]).toMatchObject({
      title: "Clarify payment",
      element: "Order Placed",
    });

    // No layout / appearance noise at top level
    expect(ctx).not.toHaveProperty("appearance");
    expect(ctx!.view).not.toHaveProperty("viewport");
    expect(ctx!.view).not.toHaveProperty("canvasLines");
  });

  it("stringifies AI context and filenames", () => {
    const text = stringifyAiBoardContext(doc, "view-b");
    expect(text).toContain(AI_CONTEXT_FORMAT);
    expect(text).toContain("Ordering Detail");
    expect(text).toContain("Order");
    expect(singleViewExportFilename("My Board", "Big Picture")).toBe(
      "my-board-big-picture.storm.json",
    );
    expect(aiContextExportFilename("My Board", "Big Picture")).toBe(
      "my-board-big-picture.ai-context.json",
    );
  });
});
