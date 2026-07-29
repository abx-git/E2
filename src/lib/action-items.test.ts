import { describe, expect, it } from "vitest";

import { normalizeActionItem, normalizeActionItems } from "@/lib/action-items";

describe("action-items", () => {
  it("normalizes a valid action item", () => {
    const item = normalizeActionItem({
      title: " API klären ",
      notes: " Mit Team X ",
      status: "inProgress",
      area: "risk",
    });
    expect(item).toMatchObject({
      title: "API klären",
      notes: "Mit Team X",
      status: "inProgress",
      area: "risk",
    });
    expect(item?.id).toBeTruthy();
  });

  it("rejects empty titles and falls back for invalid enums", () => {
    expect(normalizeActionItem({ title: "  " })).toBeNull();
    const item = normalizeActionItem({
      title: "X",
      status: "invalid" as never,
      area: "nope" as never,
    });
    expect(item?.status).toBe("open");
    expect(item?.area).toBe("followUp");
  });

  it("normalizes arrays from import payloads", () => {
    const items = normalizeActionItems([
      { id: "a1", title: "One", status: "open", area: "problem" },
      { title: "" },
      null,
    ]);
    expect(items).toHaveLength(1);
    expect(items[0]!.id).toBe("a1");
  });
});
