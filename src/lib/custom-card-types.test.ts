import { describe, expect, it } from "vitest";

import {
  createDefaultCustomCardTypes,
  normalizeCustomCardTypes,
  stereotypeLabel,
} from "@/lib/custom-card-types";
import { resolveElementStyle, styleForCustomCardType } from "@/lib/element-styles";

describe("custom-card-types", () => {
  it("builds stereotype labels", () => {
    expect(stereotypeLabel("Interface")).toBe("«Interface»");
    expect(stereotypeLabel("  ")).toBe("«Typ»");
  });

  it("normalizes types and drops invalid entries", () => {
    const types = normalizeCustomCardTypes([
      { id: "a", name: " Interface ", fill: "#e0f2fe", stroke: "#7dd3fc", ink: "#0c4a6e" },
      { id: "a", name: "dup" },
      null,
      { name: "NoId", fill: "not-a-color" },
    ]);
    expect(types).toHaveLength(2);
    expect(types[0]).toMatchObject({ id: "a", name: "Interface", fill: "#e0f2fe" });
    expect(types[1]?.name).toBe("NoId");
    expect(types[1]?.fill).toMatch(/^#/);
  });

  it("seeds default freeform types", () => {
    const seeded = createDefaultCustomCardTypes();
    expect(seeded.map((t) => t.name)).toEqual(["Concept", "Interface", "Class"]);
  });

  it("resolves element style from custom type", () => {
    const types = createDefaultCustomCardTypes();
    const iface = types.find((t) => t.name === "Interface")!;
    const style = resolveElementStyle(
      { type: "customCard", metadata: { customTypeId: iface.id } },
      types,
    );
    expect(style.fill).toBe(iface.fill);
    expect(style.shortLabel).toBe("«Interface»");
    expect(styleForCustomCardType(iface).label).toBe("Interface");
  });
});
