import { describe, expect, it } from "vitest";

import {
  aiBoardContextToImportPayload,
  boardImportPayloadFromAiContextText,
  layoutYOffsetForType,
  parseAiBoardContext,
} from "@/lib/ai-board-context-import";
import { boardImportPayloadFromAnyExportText } from "@/lib/board-import-text";
import { AI_BOARD_CONTEXT_SCHEMA_ID, AI_CONTEXT_FORMAT } from "@/lib/view-export";

const sampleAiJson = `{
  "format": "event-storming-tool-ai-context",
  "version": 1,
  "title": "Checkout",
  "glossary": [{ "term": "Order", "definition": "Purchase request" }],
  "actionItems": [
    {
      "title": "Clarify payment",
      "status": "open",
      "area": "question",
      "element": "Order Placed"
    }
  ],
  "view": {
    "name": "Big Picture",
    "modelingMode": "eventStorming",
    "workshopFormat": "bigPicture",
    "swimlanes": [{ "id": "lane-1", "label": "Checkout" }],
    "boundedContexts": [
      { "id": "bc-1", "label": "Ordering", "purpose": "Orders" }
    ],
    "elements": [
      {
        "id": "cmd-1",
        "type": "command",
        "label": "Place Order",
        "order": 1,
        "swimlane": "Checkout"
      },
      {
        "id": "evt-1",
        "type": "domainEvent",
        "label": "Order Placed",
        "order": 2,
        "swimlane": "Checkout",
        "boundedContext": "Ordering",
        "description": "Submitted"
      },
      {
        "id": "evt-2",
        "type": "domainEvent",
        "label": "Order Shipped",
        "order": 3,
        "boundedContext": "Ordering"
      }
    ],
    "relations": [
      {
        "type": "triggers",
        "fromId": "cmd-1",
        "toId": "evt-1",
        "from": "Place Order",
        "to": "Order Placed"
      }
    ],
    "timeline": { "startLabel": "Start", "endLabel": "Done" }
  }
}`;

describe("ai-board-context-import", () => {
  it("parses AI context JSON", () => {
    const ctx = parseAiBoardContext(JSON.parse(sampleAiJson));
    expect(ctx).not.toBeNull();
    expect(ctx!.format).toBe(AI_CONTEXT_FORMAT);
    expect(ctx!.view.elements).toHaveLength(3);
  });

  it("layouts elements left-to-right with distinct coordinates", () => {
    const ctx = parseAiBoardContext(JSON.parse(sampleAiJson))!;
    const payload = aiBoardContextToImportPayload(ctx);
    const view = payload.views[0]!;
    expect(view.elements).toHaveLength(3);

    const byLabel = Object.fromEntries(view.elements.map((e) => [e.label, e]));
    expect(byLabel["Place Order"]!.x).toBeLessThan(byLabel["Order Placed"]!.x);
    // Command sits above event on the type band
    expect(layoutYOffsetForType("command")).toBeLessThan(layoutYOffsetForType("domainEvent"));
    expect(byLabel["Place Order"]!.y).toBeLessThan(byLabel["Order Placed"]!.y);

    expect(view.relations).toHaveLength(1);
    expect(view.relations[0]).toMatchObject({ type: "triggers" });
    expect(view.swimlanes.some((s) => s.label === "Checkout")).toBe(true);
    expect(view.boundedContexts.some((b) => b.label === "Ordering")).toBe(true);
    expect(view.timeline.startLabel).toBe("Start");
    expect(payload.glossary[0]!.term).toBe("Order");
    expect(payload.actionItems?.[0]).toMatchObject({
      title: "Clarify payment",
      elementId: byLabel["Order Placed"]!.id,
    });
  });

  it("imports via text helper and any-export bridge", () => {
    const fromAi = boardImportPayloadFromAiContextText(sampleAiJson);
    const fromAny = boardImportPayloadFromAnyExportText(sampleAiJson);
    expect(fromAi).not.toBeNull();
    expect(fromAny).not.toBeNull();
    expect(fromAny!.views[0]!.name).toBe("Big Picture");
    expect(fromAny!.views[0]!.elements.length).toBe(3);
  });

  it("accepts label-only relations and missing ids", () => {
    const json = JSON.stringify({
      format: AI_CONTEXT_FORMAT,
      version: 1,
      title: "T",
      view: {
        name: "V",
        modelingMode: "eventStorming",
        elements: [
          { type: "command", label: "Do" },
          { type: "domainEvent", label: "Done" },
        ],
        relations: [{ type: "triggers", from: "Do", to: "Done" }],
      },
    });
    const payload = boardImportPayloadFromAiContextText(json);
    expect(payload!.views[0]!.relations).toHaveLength(1);
    expect(payload!.views[0]!.elements[0]!.x).toBeLessThan(payload!.views[0]!.elements[1]!.x);
  });

  it("rejects unrelated JSON", () => {
    expect(boardImportPayloadFromAiContextText('{"format":"nope"}')).toBeNull();
    expect(boardImportPayloadFromAnyExportText("{not-json")).toBeNull();
  });

  it("keeps storm snapshot path working through any-export", () => {
    const storm = JSON.stringify({
      $schema: "https://abx-git.github.io/E2/schemas/board-snapshot-v2.schema.json",
      format: "event-storming-tool",
      version: 2,
      exportedAt: "2026-01-01T00:00:00.000Z",
      title: "Full",
      glossary: [],
      workshopMode: false,
      activeViewId: "v1",
      views: [
        {
          id: "v1",
          name: "Board",
          modelingMode: "eventStorming",
          workshopFormat: "free",
          facilitatorEnabled: false,
          facilitatorPhase: 0,
          elements: [{ id: "e1", type: "domainEvent", label: "X", x: 10, y: 20 }],
          relations: [],
          contextRelations: [],
          swimlanes: [],
          boundedContexts: [],
          timeline: { y: 400 },
          viewport: { x: 0, y: 0, zoom: 1 },
          snapToTimeline: true,
          snapToGrid: false,
        },
      ],
      appearance: { theme: "system", stickyOpacity: 1, stickyScale: 1 },
    });
    const payload = boardImportPayloadFromAnyExportText(storm);
    expect(payload!.views[0]!.elements[0]).toMatchObject({ label: "X", x: 10, y: 20 });
  });

  it("schema id constant matches published path", () => {
    expect(AI_BOARD_CONTEXT_SCHEMA_ID).toContain("ai-board-context-v1.schema.json");
  });
});
