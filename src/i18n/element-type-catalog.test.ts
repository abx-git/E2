import { describe, expect, it } from "vitest";

import {
  defaultLabelForElementType,
  elementTypeLabel,
  localizedElementTypeLabel,
  localizedElementTypeShortLabel,
} from "@/i18n/domain-labels";
import { createTranslator } from "@/i18n/translate";
import { ELEMENT_STYLES } from "@/lib/element-styles";
import { ALL_ELEMENT_TYPES } from "@/types/storm-element";

const BOARD_ELEMENT_TYPES = [...new Set([...ALL_ELEMENT_TYPES, "swimlane", "boundedContext"])] as const;

describe("element type i18n catalog", () => {
  it("defines every palette style key in de/en elementType + elementTypeShort", () => {
    const styleKeys = Object.keys(ELEMENT_STYLES).sort();
    for (const locale of ["de", "en"] as const) {
      const t = createTranslator(locale);
      for (const type of styleKeys) {
        expect(() => elementTypeLabel(t, type as (typeof styleKeys)[number])).not.toThrow();
        expect(elementTypeLabel(t, type as (typeof styleKeys)[number]).length).toBeGreaterThan(0);
        expect(localizedElementTypeShortLabel(type as (typeof styleKeys)[number], locale).length).toBeGreaterThan(
          0,
        );
      }
    }
    expect(styleKeys).toEqual(expect.arrayContaining([...BOARD_ELEMENT_TYPES]));
  });

  it("uses locale-aware defaults for every board element type", () => {
    for (const type of BOARD_ELEMENT_TYPES) {
      if (type === "instruction") {
        expect(defaultLabelForElementType("instruction", "en")).toBe("Implementation aspect…");
        expect(defaultLabelForElementType("instruction", "de")).toBe("Umsetzungsaspekt…");
        continue;
      }
      expect(defaultLabelForElementType(type, "en")).toBe(localizedElementTypeLabel(type, "en"));
      expect(defaultLabelForElementType(type, "de")).toBe(localizedElementTypeLabel(type, "de"));
    }
  });

  it("translates process activity and note differently per locale", () => {
    expect(localizedElementTypeLabel("processActivity", "en")).toBe("Activity");
    expect(localizedElementTypeLabel("processActivity", "de")).toBe("Aktivität");
    expect(defaultLabelForElementType("processActivity", "en")).toBe("Activity");
    expect(defaultLabelForElementType("note", "en")).toBe("Note");
    expect(defaultLabelForElementType("note", "de")).toBe("Notiz");
  });
});
