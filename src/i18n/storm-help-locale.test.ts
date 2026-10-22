import { describe, expect, it } from "vitest";

import { getElementHelp, getRelationHelp } from "@/lib/storm-help";

describe("storm-help locale", () => {
  it("serves German and English element help", () => {
    expect(getElementHelp("note", "de").title).toBe("Notiz");
    expect(getElementHelp("note", "en").title).toBe("Note");
  });

  it("serves localized relation help", () => {
    expect(getRelationHelp("contains", "de").bullets?.[0]).toMatch(/Aggregate Root/);
    expect(getRelationHelp("contains", "en").bullets?.[0]).toMatch(/aggregate root/i);
  });
});
