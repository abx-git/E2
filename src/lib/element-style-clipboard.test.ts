import { describe, expect, it } from "vitest";

import {
  buildElementStyleClipboard,
  planElementStylePaste,
  styleMetadataHasContent,
} from "@/lib/element-style-clipboard";
import type { StormElement } from "@/types/storm-element";

function el(partial: Partial<StormElement> & Pick<StormElement, "id" | "type">): StormElement {
  return {
    label: "X",
    x: 0,
    y: 0,
    ...partial,
  };
}

describe("element-style-clipboard", () => {
  it("copies card fill/border without domain metadata", () => {
    const clip = buildElementStyleClipboard(
      el({
        id: "a",
        type: "command",
        metadata: {
          cardFillColor: "#ff0000",
          cardBorderColor: "#00ff00",
          exampleGiven: ["foo"],
        },
      }),
    );
    expect(clip).not.toBeNull();
    expect(clip!.metadata.exampleGiven).toBeUndefined();
    expect(clip!.metadata.cardFillColor).toBe("#ff0000");
  });

  it("pastes card style onto another type without changing type", () => {
    const clip = buildElementStyleClipboard(
      el({ id: "s", type: "domainEvent", metadata: { cardFillColor: "#112233" } }),
    )!;
    const target = el({ id: "t", type: "command", metadata: {} });
    const plan = planElementStylePaste(target, clip);
    expect(plan?.patch.type).toBeUndefined();
    expect(plan?.patch.metadata?.cardFillColor).toBe("#112233");
    expect(plan?.warnings).toEqual([]);
  });

  it("copies resolved layout region paint", () => {
    const clip = buildElementStyleClipboard(
      el({
        id: "bc",
        type: "boundedContext",
        width: 200,
        height: 120,
        metadata: { regionColor: "#abcdef" },
      }),
    );
    expect(styleMetadataHasContent(clip?.metadata)).toBe(true);
    const sticky = el({ id: "c", type: "note" });
    expect(planElementStylePaste(sticky, clip!)).toBeNull();
  });
});