import { describe, expect, it } from "vitest";

import { defaultLabelForElementType, localizedElementTypeLabel } from "@/i18n/domain-labels";

describe("defaultLabelForElementType", () => {
  it("uses locale for note and instruction defaults", () => {
    expect(defaultLabelForElementType("note", "de")).toBe("Notiz");
    expect(defaultLabelForElementType("note", "en")).toBe("Note");
    expect(defaultLabelForElementType("instruction", "de")).toBe("Umsetzungsaspekt…");
    expect(defaultLabelForElementType("instruction", "en")).toBe("Implementation aspect…");
  });

  it("localizes types that had German fallbacks in ELEMENT_STYLES", () => {
    expect(localizedElementTypeLabel("cloudBoundary", "en")).toBe("Cloud boundary");
    expect(localizedElementTypeLabel("cloudBoundary", "de")).toBe("Cloud-Grenze");
    expect(localizedElementTypeLabel("dataEntity", "de")).toBe("Entität");
    expect(localizedElementTypeLabel("dataEntity", "en")).toBe("Entity");
  });
});
