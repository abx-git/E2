import { describe, expect, it } from "vitest";
import { filterMeasureItems, normalizeMeasureActionItem } from "@/lib/architecture-measures";
import { cycleTagFilterMode, matchesTagFilters } from "@/lib/measure-tag-filters";

describe("measure tag filters", () => {
  it("cycles off → include → exclude → off", () => {
    expect(cycleTagFilterMode(undefined)).toBe("include");
    expect(cycleTagFilterMode("include")).toBe("exclude");
    expect(cycleTagFilterMode("exclude")).toBeUndefined();
  });

  it("applies include and exclude for qualities", () => {
    const item = normalizeMeasureActionItem({
      title: "A",
      qualities: ["Security"],
      actionType: "IMPROVE",
    });
    expect(
      matchesTagFilters(
        { groupBy: "obligation", qualityFilters: { Security: "include" } },
        item,
      ),
    ).toBe(true);
    expect(
      matchesTagFilters(
        { groupBy: "obligation", qualityFilters: { Performance: "include" } },
        item,
      ),
    ).toBe(false);
    expect(
      matchesTagFilters(
        { groupBy: "obligation", qualityFilters: { Security: "exclude" } },
        item,
      ),
    ).toBe(false);
  });

  it("filters list via filterMeasureItems", () => {
    const items = [
      normalizeMeasureActionItem({ title: "1", qualities: ["Security"] }),
      normalizeMeasureActionItem({ title: "2", qualities: ["Performance"] }),
    ];
    const out = filterMeasureItems(items, {
      groupBy: "obligation",
      qualityFilters: { Security: "exclude" },
    });
    expect(out.map((i) => i.title)).toEqual(["2"]);
  });
});
