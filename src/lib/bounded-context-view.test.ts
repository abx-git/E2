import { describe, expect, it } from "vitest";

import {
  buildBoardViewFromBoundedContextPayload,
  extractBoundedContextViewPayload,
  resolveBoundedContextDetailView,
} from "@/lib/bounded-context-view";
import { createEmptyBoardView } from "@/lib/storm-json";
import type { BoundedContext, StormElement } from "@/types/storm-element";
import type { ContextRelation, StormRelation } from "@/types/storm-relation";

const elements: StormElement[] = [
  {
    id: "a",
    type: "domainEvent",
    label: "A",
    x: 10,
    y: 10,
    width: 100,
    height: 50,
    boundedContextId: "bc1",
  },
  { id: "b", type: "command", label: "B", x: 200, y: 0, width: 100, height: 50 },
  { id: "c", type: "actor", label: "C", x: 400, y: 0, width: 80, height: 40, boundedContextId: "bc2" },
];

const relations: StormRelation[] = [
  { id: "r1", type: "triggers", sourceId: "b", targetId: "a" },
  { id: "r2", type: "executedBy", sourceId: "b", targetId: "c" },
];

const boundedContexts: BoundedContext[] = [
  { id: "bc1", label: "Orders", x: 0, y: 0, width: 180, height: 120 },
  { id: "bc2", label: "Billing", x: 300, y: 0, width: 200, height: 120, detailViewId: "v-existing" },
];

const contextRelations: ContextRelation[] = [
  { id: "cr1", sourceContextId: "bc1", targetContextId: "bc2", type: "customerSupplier" },
];

describe("bounded-context-view", () => {
  it("includes internal elements, direct external refs, and linked BCs", () => {
    const payload = extractBoundedContextViewPayload(
      "bc1",
      elements,
      relations,
      boundedContexts,
      contextRelations,
    );
    expect(payload).not.toBeNull();
    expect(payload!.elements.map((e) => e.id).sort()).toEqual(["a", "b", "c"]);
    expect(payload!.relations.map((r) => r.id).sort()).toEqual(["r1", "r2"]);
    expect(payload!.boundedContexts.map((b) => b.id).sort()).toEqual(["bc1", "bc2"]);
    expect(payload!.contextRelations).toHaveLength(1);
    expect(payload!.boundedContexts.find((b) => b.id === "bc2")!.detailViewId).toBeUndefined();
  });

  it("builds a board view with remapped ids", () => {
    const payload = extractBoundedContextViewPayload(
      "bc1",
      elements,
      relations,
      boundedContexts,
      contextRelations,
    )!;
    const view = buildBoardViewFromBoundedContextPayload(payload, {
      id: "v-new",
      name: "Orders",
      modelingMode: "domainDrivenDesign",
      workshopFormat: "free",
    });
    expect(view.id).toBe("v-new");
    expect(view.elements).toHaveLength(3);
    expect(view.elements.every((e) => !["a", "b", "c"].includes(e.id))).toBe(true);
    expect(view.boundedContexts).toHaveLength(2);
    expect(view.relations).toHaveLength(2);
  });

  it("resolves linked detail views", () => {
    const views = [
      createEmptyBoardView({ id: "v-existing", name: "Billing Detail" }),
      createEmptyBoardView({ id: "v-other", name: "Other" }),
    ];
    const linked = resolveBoundedContextDetailView(boundedContexts[1]!, views);
    expect(linked?.name).toBe("Billing Detail");
    expect(resolveBoundedContextDetailView(boundedContexts[0]!, views)).toBeNull();
  });
});
