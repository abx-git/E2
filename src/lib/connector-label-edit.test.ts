import { describe, expect, it } from "vitest";

import {
  connectorFreeTextLabelPatch,
  connectorFreeTextPromptDefault,
} from "@/lib/connector-label-edit";
import type { BoardConnector } from "@/types/board-connector";

describe("connector-label-edit", () => {
  const base: BoardConnector = {
    id: "c1",
    source: { attach: "element", id: "a" },
    target: { attach: "element", id: "b" },
    relationType: "triggers",
  };

  it("uses stored label for custom mode", () => {
    expect(
      connectorFreeTextPromptDefault({ ...base, labelMode: "custom", label: "hi" }),
    ).toBe("hi");
  });

  it("starts empty in type mode unless a custom label was kept", () => {
    expect(connectorFreeTextPromptDefault({ ...base, labelMode: "type" })).toBe("");
    expect(
      connectorFreeTextPromptDefault({ ...base, labelMode: "type", label: "draft" }),
    ).toBe("draft");
  });

  it("always patches to custom free text", () => {
    expect(connectorFreeTextLabelPatch("x")).toEqual({ label: "x", labelMode: "custom" });
  });
});
