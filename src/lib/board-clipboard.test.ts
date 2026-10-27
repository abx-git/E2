import { describe, expect, it } from "vitest";

import {
  extractClipboardPayload,
  remapClipboardForPaste,
  selectionCentroid,
  takeIdsFromClipboard,
} from "@/lib/board-clipboard";
import type { BoundedContext, StormElement, Swimlane } from "@/types/storm-element";
import type { BoardConnector } from "@/types/board-connector";
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
  { id: "c", type: "actor", label: "C", x: 400, y: 0, width: 80, height: 40 },
];

const relations: StormRelation[] = [
  { id: "r1", type: "triggers", sourceId: "b", targetId: "a" },
  { id: "r2", type: "executedBy", sourceId: "b", targetId: "c" },
];

const swimlanes: Swimlane[] = [
  { id: "l1", label: "Lane", x: 0, y: 0, width: 400, height: 120 },
];

const boundedContexts: BoundedContext[] = [
  { id: "bc1", label: "BC", x: 0, y: 0, width: 180, height: 120 },
  { id: "bc2", label: "BC2", x: 300, y: 0, width: 160, height: 100 },
];

const contextRelations: ContextRelation[] = [
  { id: "cr1", sourceContextId: "bc1", targetContextId: "bc2", type: "sharedKernel" },
];

describe("board-clipboard", () => {
  it("extracts selection and only internal relations", () => {
    const connectors: BoardConnector[] = [
      {
        id: "cn-internal",
        type: "triggers",
        source: { attach: "element", id: "b" },
        target: { attach: "element", id: "a" },
      },
      {
        id: "cn-external",
        type: "triggers",
        source: { attach: "element", id: "b" },
        target: { attach: "element", id: "c" },
      },
    ];
    const payload = extractClipboardPayload(elements, relations, ["a", "b"], [], [], [], connectors);
    expect(payload).not.toBeNull();
    expect(payload!.elements.map((e) => e.id).sort()).toEqual(["a", "b"]);
    expect(payload!.relations).toHaveLength(1);
    expect(payload!.relations[0]!.id).toBe("r1");
    expect(payload!.connectors).toHaveLength(1);
    expect(payload!.connectors[0]!.id).toBe("cn-internal");
    expect(payload!.elements.every((e) => e.swimlaneId === undefined)).toBe(true);
    expect(payload!.elements.find((e) => e.id === "a")!.boundedContextId).toBeUndefined();
    expect(payload!.swimlanes).toEqual([]);
    expect(payload!.boundedContexts).toEqual([]);
  });

  it("keeps region refs when the region is also copied", () => {
    const payload = extractClipboardPayload(
      elements,
      relations,
      { elementIds: ["a"], boundedContextIds: ["bc1"] },
      swimlanes,
      boundedContexts,
      contextRelations,
    );
    expect(payload).not.toBeNull();
    expect(payload!.boundedContexts.map((b) => b.id)).toEqual(["bc1"]);
    expect(payload!.elements[0]!.boundedContextId).toBe("bc1");
    expect(payload!.contextRelations).toHaveLength(0);
  });

  it("copies swimlanes and context relations with both BCs", () => {
    const payload = extractClipboardPayload(
      elements,
      relations,
      { swimlaneIds: ["l1"], boundedContextIds: ["bc1", "bc2"] },
      swimlanes,
      boundedContexts,
      contextRelations,
    );
    expect(payload).not.toBeNull();
    expect(payload!.swimlanes.map((l) => l.id)).toEqual(["l1"]);
    expect(payload!.boundedContexts.map((b) => b.id).sort()).toEqual(["bc1", "bc2"]);
    expect(payload!.contextRelations).toHaveLength(1);
    expect(payload!.elements).toHaveLength(0);
  });

  it("remaps ids and offsets to paste target", () => {
    const connectors: BoardConnector[] = [
      {
        id: "cn1",
        type: "triggers",
        source: { attach: "element", id: "b" },
        target: { attach: "element", id: "a" },
      },
    ];
    const payload = extractClipboardPayload(elements, relations, ["a", "b"], [], [], [], connectors)!;
    const remapped = remapClipboardForPaste(payload, 1000, 500);
    expect(remapped.elements).toHaveLength(2);
    expect(remapped.newIds).toHaveLength(2);
    expect(remapped.newIds.every((id) => !["a", "b"].includes(id))).toBe(true);
    expect(remapped.relations).toHaveLength(1);
    expect(remapped.relations[0]!.sourceId).toBe(remapped.elements.find((e) => e.label === "B")!.id);
    expect(remapped.relations[0]!.targetId).toBe(remapped.elements.find((e) => e.label === "A")!.id);
    expect(remapped.connectors).toHaveLength(1);
    expect(remapped.connectors[0]!.id).not.toBe("cn1");
    const bEl = remapped.elements.find((e) => e.label === "B")!;
    const aEl = remapped.elements.find((e) => e.label === "A")!;
    expect(remapped.connectors[0]!.source).toEqual({ attach: "element", id: bEl.id });
    expect(remapped.connectors[0]!.target).toEqual({ attach: "element", id: aEl.id });

    const c = selectionCentroid(remapped.elements);
    expect(c.x).toBeCloseTo(1000, 5);
    expect(c.y).toBeCloseTo(500, 5);
  });

  it("remaps region ids and preserves element containment refs", () => {
    const payload = extractClipboardPayload(
      elements,
      relations,
      { elementIds: ["a"], boundedContextIds: ["bc1"] },
      swimlanes,
      boundedContexts,
    )!;
    const remapped = remapClipboardForPaste(payload, payload.originX + 50, payload.originY + 20);
    expect(remapped.boundedContexts).toHaveLength(1);
    expect(remapped.newBoundedContextIds[0]).not.toBe("bc1");
    expect(remapped.elements[0]!.boundedContextId).toBe(remapped.newBoundedContextIds[0]);
    expect(remapped.boundedContexts[0]!.x).toBe(boundedContexts[0]!.x + 50);
  });

  it("keeps aggregateId when Aggregate Root is also copied and remaps it", () => {
    const withAgg: StormElement[] = [
      {
        id: "agg",
        type: "aggregate",
        label: "Order",
        x: 0,
        y: 0,
        width: 280,
        height: 200,
      },
      {
        id: "ent",
        type: "entity",
        label: "LineItem",
        x: 40,
        y: 40,
        width: 100,
        height: 50,
        aggregateId: "agg",
      },
    ];
    const alone = extractClipboardPayload(withAgg, [], ["ent"]);
    expect(alone!.elements[0]!.aggregateId).toBeUndefined();

    const together = extractClipboardPayload(withAgg, [], ["agg", "ent"])!;
    expect(together.elements.find((e) => e.id === "ent")!.aggregateId).toBe("agg");

    const remapped = remapClipboardForPaste(together, together.originX + 10, together.originY + 10);
    const newAgg = remapped.elements.find((e) => e.type === "aggregate")!;
    const newEnt = remapped.elements.find((e) => e.type === "entity")!;
    expect(newAgg.id).not.toBe("agg");
    expect(newEnt.aggregateId).toBe(newAgg.id);
  });

  it("keeps subdomainId when Subdomain is also copied and remaps it", () => {
    const withSub: StormElement[] = [
      {
        id: "sub",
        type: "subdomain",
        label: "Sales",
        x: 0,
        y: 0,
        width: 320,
        height: 240,
        metadata: { subdomainKind: "core" },
      },
      {
        id: "agg",
        type: "aggregate",
        label: "Order",
        x: 40,
        y: 40,
        width: 140,
        height: 100,
        subdomainId: "sub",
      },
    ];
    const alone = extractClipboardPayload(withSub, [], ["agg"]);
    expect(alone!.elements[0]!.subdomainId).toBeUndefined();

    const together = extractClipboardPayload(withSub, [], ["sub", "agg"])!;
    expect(together.elements.find((e) => e.id === "agg")!.subdomainId).toBe("sub");

    const remapped = remapClipboardForPaste(together, together.originX + 5, together.originY + 5);
    const newSub = remapped.elements.find((e) => e.type === "subdomain")!;
    const newAgg = remapped.elements.find((e) => e.type === "aggregate")!;
    expect(newSub.id).not.toBe("sub");
    expect(newAgg.subdomainId).toBe(newSub.id);
  });

  it("splits internal connectors when taking ids from clipboard", () => {
    const connectors: BoardConnector[] = [
      {
        id: "cn-ab",
        type: "triggers",
        source: { attach: "element", id: "a" },
        target: { attach: "element", id: "b" },
      },
      {
        id: "cn-bc",
        type: "executedBy",
        source: { attach: "element", id: "b" },
        target: { attach: "element", id: "c" },
      },
    ];
    const payload = extractClipboardPayload(elements, relations, ["a", "b", "c"], [], [], [], connectors)!;
    const { taken, remaining } = takeIdsFromClipboard(payload, ["a", "b"]);
    expect(taken!.connectors).toHaveLength(1);
    expect(taken!.connectors[0]!.id).toBe("cn-ab");
    // Connector to a remaining element is dropped when the other end was taken.
    expect(remaining!.connectors).toHaveLength(0);
  });
});
