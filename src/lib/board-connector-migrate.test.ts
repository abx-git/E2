import { describe, expect, it } from "vitest";

import {
  connectorsToLegacy,
  legacyToConnectors,
  stormRelationToConnector,
} from "@/lib/board-connector-migrate";
import type { StormRelation } from "@/types/storm-relation";

describe("board-connector-migrate", () => {
  it("round-trips storm relations", () => {
    const relations: StormRelation[] = [
      { id: "r1", type: "triggers", sourceId: "a", targetId: "b" },
    ];
    const connectors = legacyToConnectors(relations, [], []);
    expect(connectors).toHaveLength(1);
    expect(connectors[0]).toMatchObject({
      source: { attach: "element", id: "a" },
      target: { attach: "element", id: "b" },
      relationType: "triggers",
    });
    const legacy = connectorsToLegacy(connectors);
    expect(legacy.relations).toEqual(relations);
  });

  it("converts storm relation to connector", () => {
    const c = stormRelationToConnector({
      id: "r",
      type: "annotates",
      sourceId: "n",
      targetId: "e",
      labelMode: "type",
    });
    expect(c.arrowHead).toBe("end");
    expect(c.relationType).toBe("annotates");
  });
});
