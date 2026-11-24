import { describe, expect, it } from "vitest";
import { e2RefFromMxCell, mxCellId } from "@/lib/drawio/cell-ids";

describe("drawio cell-ids", () => {
  it("encodes stable mx ids", () => {
    expect(mxCellId("el", "evt-1")).toBe("el_evt-1");
  });

  it("prefers style e2Kind/e2Id", () => {
    expect(
      e2RefFromMxCell("ignored", "e2Kind=element;e2Id=abc;fillColor=#fff"),
    ).toEqual({ kind: "element", e2Id: "abc" });
  });

  it("falls back to id prefix", () => {
    expect(e2RefFromMxCell("conn_rel-1", undefined)).toEqual({
      kind: "connector",
      e2Id: "rel-1",
    });
  });
});