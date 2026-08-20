import { describe, expect, it } from "vitest";

import {
  boardImportPayloadFromJsonText,
  looksLikeJsonText,
} from "@/lib/board-import-text";

const stormJson = JSON.stringify({
  format: "event-storming-tool",
  version: 2,
  exportedAt: "2026-01-01T00:00:00.000Z",
  title: "Workshop",
  glossary: [],
  workshopMode: false,
  activeViewId: "v1",
  views: [
    {
      id: "v1",
      name: "Prozess",
      modelingMode: "eventStorming",
      workshopFormat: "free",
      facilitatorEnabled: false,
      facilitatorPhase: 0,
      elements: [{ id: "e1", type: "domainEvent", label: "Order Placed", x: 10, y: 20 }],
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

const aiJson = JSON.stringify({
  format: "event-storming-tool-ai-context",
  version: 1,
  title: "Checkout",
  view: {
    name: "Big Picture",
    modelingMode: "eventStorming",
    elements: [{ type: "domainEvent", label: "Paid" }],
  },
});

describe("boardImportPayloadFromJsonText", () => {
  it("detects JSON-looking text", () => {
    expect(looksLikeJsonText("  {\"a\":1}")).toBe(true);
    expect(looksLikeJsonText("[1]")).toBe(true);
    expect(looksLikeJsonText("flowchart LR")).toBe(false);
  });

  it("imports a .storm.json snapshot", () => {
    const payload = boardImportPayloadFromJsonText(stormJson);
    expect(payload).not.toBeNull();
    expect(payload!.title).toBe("Workshop");
    expect(payload!.views[0]!.name).toBe("Prozess");
    expect(payload!.views[0]!.elements[0]).toMatchObject({
      label: "Order Placed",
      x: 10,
      y: 20,
    });
  });

  it("imports AI-context JSON", () => {
    const payload = boardImportPayloadFromJsonText(aiJson);
    expect(payload).not.toBeNull();
    expect(payload!.views[0]!.name).toBe("Big Picture");
    expect(payload!.views[0]!.elements.some((el) => el.label === "Paid")).toBe(true);
  });

  it("rejects mermaid and unrelated JSON", () => {
    expect(boardImportPayloadFromJsonText("flowchart LR\n  A --> B")).toBeNull();
    expect(boardImportPayloadFromJsonText('{"format":"nope"}')).toBeNull();
    expect(boardImportPayloadFromJsonText("{not-json")).toBeNull();
  });

  it("maps unknown element types so pasted JSON can render", () => {
    const raw = JSON.stringify({
      format: "event-storming-tool",
      version: 2,
      exportedAt: "2026-01-01T00:00:00.000Z",
      title: "Paste",
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
          elements: [
            { id: "e1", type: "mysteryCard", label: "Imported", x: 40, y: 50, width: 160, height: 72 },
          ],
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
    const payload = boardImportPayloadFromJsonText(raw);
    expect(payload).not.toBeNull();
    expect(payload!.views[0]!.elements[0]).toMatchObject({
      id: "e1",
      type: "note",
      label: "Imported",
      width: 160,
      height: 72,
    });
  });
});
