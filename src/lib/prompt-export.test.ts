import { describe, expect, it } from "vitest";

import { exportBoardAsPrompt } from "./prompt-export";
import type { BoardActiveSlice } from "@/lib/storm-json";
import { DEFAULT_APPEARANCE } from "@/lib/board-appearance";
import { DEFAULT_TIMELINE, DEFAULT_VIEWPORT } from "@/types/storm-element";

const emptySlice = (over: Partial<BoardActiveSlice> = {}): BoardActiveSlice => ({
  title: "Demo Board",
  modelingMode: "eventStorming",
  workshopFormat: "free",
  facilitatorEnabled: false,
  facilitatorPhase: 0,
  elements: [],
  relations: [],
  contextRelations: [],
  swimlanes: [],
  boundedContexts: [],
  canvasLines: [],
  timeline: { ...DEFAULT_TIMELINE },
  viewport: { ...DEFAULT_VIEWPORT },
  glossary: [],
  actionItems: [],
  appearance: { ...DEFAULT_APPEARANCE },
  snapToTimeline: false,
  snapToGrid: false,
  customCardTypes: [],
  ...over,
});

describe("exportBoardAsPrompt", () => {
  it("exports stickies with type captions and descriptions", () => {
    const text = exportBoardAsPrompt(
      emptySlice({
        elements: [
          {
            id: "evt-1",
            type: "domainEvent",
            label: "Order Placed",
            description: "After checkout succeeds.",
            x: 200,
            y: 80,
          },
          {
            id: "cmd-1",
            type: "command",
            label: "Place Order",
            x: 40,
            y: 80,
          },
        ],
      }),
    );
    expect(text).toContain("# Demo Board");
    expect(text).toContain("## Elemente (2)");
    expect(text).toContain("### [Command] Place Order");
    expect(text).toContain("### [Domain Event] Order Placed");
    expect(text).toContain("Beschreibung: After checkout succeeds.");
    // left-to-right: command before event
    expect(text.indexOf("Place Order")).toBeLessThan(text.indexOf("Order Placed"));
  });

  it("includes relations, swimlanes, and context map", () => {
    const text = exportBoardAsPrompt(
      emptySlice({
        title: "Ordering",
        elements: [
          { id: "cmd-1", type: "command", label: "Place Order", x: 0, y: 0, swimlaneId: "lane-1" },
          { id: "evt-1", type: "domainEvent", label: "Order Placed", x: 200, y: 0, boundedContextId: "bc-1" },
        ],
        relations: [
          { id: "r1", type: "triggers", sourceId: "cmd-1", targetId: "evt-1", label: "after validation" },
        ],
        swimlanes: [{ id: "lane-1", label: "Checkout", x: 0, y: 0, width: 400, height: 200 }],
        boundedContexts: [{ id: "bc-1", label: "Sales", x: 0, y: 0, width: 400, height: 200 }],
        contextRelations: [
          { id: "cx-1", type: "customerSupplier", sourceContextId: "bc-1", targetContextId: "bc-1" },
        ],
      }),
      { contextTitle: "Ordering — Big Picture" },
    );
    expect(text).toContain("# Ordering — Big Picture");
    expect(text).toContain("Place Order → Order Placed [löst aus: after validation]");
    expect(text).toContain("Swimlane: Checkout");
    expect(text).toContain("Bounded Context: Sales");
    expect(text).toContain("## Bounded Contexts (1)");
    expect(text).toContain("## Swimlanes (1)");
    expect(text).toContain("Sales → Sales [Customer/Supplier]");
  });
});
