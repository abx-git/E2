import { describe, expect, it } from "vitest";

import { DEFAULT_APPEARANCE } from "@/lib/board-appearance";
import {
  boardImportPayloadFromE2vText,
  buildE2vClipboardPackage,
  buildE2vSchemaPromptPackageForView,
  decodeE2vText,
  encodeE2vDocument,
  encodeE2vSingleView,
  extractE2vFromClipboardText,
} from "@/lib/e2v";
import { createDefaultBoardDocument, createEmptyBoardView } from "@/lib/storm-json";

describe("e2v codec", () => {
  const doc = createDefaultBoardDocument({
    title: "Orders",
    glossary: [{ term: "Order", definition: "A customer purchase" }],
    views: [
      createEmptyBoardView({
        id: "view-a",
        name: "Big Picture",
        modelingMode: "eventStorming",
        elements: [
          {
            id: "evt-1",
            type: "domainEvent",
            label: "Order Placed",
            x: 100,
            y: 100,
            width: 160,
            height: 72,
          },
          {
            id: "cmd-1",
            type: "command",
            label: "Place Order",
            x: 50,
            y: 200,
            width: 150,
            height: 68,
          },
        ],
        relations: [
          {
            id: "rel-1",
            type: "triggers",
            sourceId: "cmd-1",
            targetId: "evt-1",
          },
        ],
      }),
    ],
    appearance: { ...DEFAULT_APPEARANCE },
  });

  it("round-trips a single view with layout", () => {
    const text = encodeE2vSingleView(doc, "view-a");
    expect(text).toContain("# e2v/1");
    expect(text).toContain("Order Placed");
    const back = decodeE2vText(text!);
    expect(back?.views).toHaveLength(1);
    expect(back?.views[0]?.elements).toHaveLength(2);
    const evt = back!.views[0]!.elements.find((e) => e.label === "Order Placed");
    expect(evt?.x).toBe(100);
    expect(evt?.width).toBe(160);
  });

  it("round-trips full document scope", () => {
    const text = encodeE2vDocument(doc, { scope: "document" });
    const back = boardImportPayloadFromE2vText(text);
    expect(back?.title).toBe("Orders");
    expect(back?.glossary).toHaveLength(1);
    expect(back!.views[0]!.relations[0]?.type).toBe("triggers");
    expect(back!.views[0]!.connectors.length).toBeGreaterThan(0);
  });

  it("builds schema prompt package without view data", () => {
    const pack = buildE2vSchemaPromptPackageForView(doc, "view-a");
    expect(pack).toContain("E2V schema prompt package");
    expect(pack).toContain("## prompt");
    expect(pack).toContain("## schema");
    expect(pack).not.toMatch(/\n## data\n/);
    expect(pack).not.toContain("Order Placed");
    expect(pack).toContain("eventStorming");
  });

  it("builds LLM package with prompt, schema, and data", () => {
    const pack = buildE2vClipboardPackage(doc, "view-a");
    expect(pack).toContain("## prompt");
    expect(pack).toContain("## schema");
    expect(pack).toContain("```e2v");
    expect(pack).toContain("Layout is explicit");
    const data = extractE2vFromClipboardText(pack!);
    expect(decodeE2vText(data)).not.toBeNull();
  });
});
