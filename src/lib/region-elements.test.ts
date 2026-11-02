import { describe, expect, it } from "vitest";

import {
  boundedContextToElement,
  deriveBoundedContextsFromElements,
  deriveSwimlanesFromElements,
  migrateLegacyRegionsIntoElements,
  swimlaneToElement,
} from "@/lib/region-elements";
import type { CanvasBoardView } from "@/lib/storm-json";
import { createEmptyBoardView } from "@/lib/storm-json";

describe("region-elements", () => {
  it("round-trips swimlane through element form", () => {
    const lane = {
      id: "l1",
      label: "Lane A",
      x: 10,
      y: 20,
      width: 800,
      height: 120,
      color: "#94a3b8",
      locked: true,
    };
    const el = swimlaneToElement(lane);
    expect(el.type).toBe("swimlane");
    expect(deriveSwimlanesFromElements([el])[0]).toMatchObject({
      id: "l1",
      label: "Lane A",
      locked: true,
    });
  });

  it("migrates legacy arrays into elements", () => {
    const base = createEmptyBoardView({ id: "v1", name: "Test" });
    const view: CanvasBoardView = {
      ...base,
      swimlanes: [
        { id: "l1", label: "L", x: 0, y: 0, width: 400, height: 100 },
      ],
      boundedContexts: [
        { id: "bc1", label: "BC", x: 50, y: 50, width: 200, height: 150 },
      ],
    };
    const next = migrateLegacyRegionsIntoElements(view);
    expect(next.swimlanes).toEqual([]);
    expect(next.boundedContexts).toEqual([]);
    expect(next.elements.some((e) => e.id === "l1" && e.type === "swimlane")).toBe(true);
    expect(next.elements.some((e) => e.id === "bc1" && e.type === "boundedContext")).toBe(true);
  });

  it("round-trips bounded context purpose on element", () => {
    const bc = boundedContextToElement({
      id: "bc1",
      label: "Orders",
      purpose: "Order processing",
      x: 0,
      y: 0,
      width: 300,
      height: 200,
    });
    expect(bc.description).toBe("Order processing");
    expect(deriveBoundedContextsFromElements([bc])[0]?.purpose).toBe("Order processing");
  });
});
