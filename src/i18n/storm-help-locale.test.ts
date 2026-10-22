import { describe, expect, it } from "vitest";

import { getElementHelp, getRelationHelp, resolveHelpRequest } from "@/lib/storm-help";

describe("storm-help locale", () => {
  it("serves German and English element help", () => {
    expect(getElementHelp("note", "de").title).toBe("Notiz");
    expect(getElementHelp("note", "en").title).toBe("Note");
    expect(getElementHelp("note", "en").subtitle).toBe("Cream — free workshop annotation");
  });

  it("serves localized relation help", () => {
    expect(getRelationHelp("contains", "de").bullets?.[0]).toMatch(/Aggregate Root/);
    expect(getRelationHelp("contains", "en").bullets?.[0]).toMatch(/aggregate root/i);
  });

  it("resolves help requests by locale", () => {
    const de = resolveHelpRequest({ kind: "element", type: "note" }, "de");
    const en = resolveHelpRequest({ kind: "element", type: "note" }, "en");
    expect(de.paragraphs?.[0]).toMatch(/Frei positionierbarer/);
    expect(en.paragraphs?.[0]).toMatch(/Freely placed remark/);
  });
});
