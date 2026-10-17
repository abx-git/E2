import { describe, expect, it } from "vitest";

import {
  aiContextModeSchemaFilename,
  aiContextModeSchemaId,
  buildAiContextModeSchema,
} from "@/lib/ai-context-mode-schema";
import { AI_CONTEXT_FORMAT } from "@/lib/view-export";
import {
  ALL_ELEMENT_TYPES,
  elementTypesForMode,
  workshopFormatsForMode,
} from "@/types/storm-element";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

describe("ai-context-mode-schema", () => {
  it("builds a mode-scoped schema with fewer element types than the full catalog", () => {
    const schema = buildAiContextModeSchema("eventStorming");
    expect(schema.$id).toBe(aiContextModeSchemaId("eventStorming"));
    expect(aiContextModeSchemaFilename("eventStorming")).toBe(
      "ai-board-context-eventStorming-v1.schema.json",
    );
    expect(String(schema.description)).toContain(AI_CONTEXT_FORMAT);

    const defs = schema.$defs;
    expect(isRecord(defs)).toBe(true);
    const elementType = isRecord(defs) ? defs.elementType : null;
    const modelingMode = isRecord(defs) ? defs.modelingMode : null;
    const workshopFormat = isRecord(defs) ? defs.workshopFormat : null;

    expect(isRecord(elementType)).toBe(true);
    expect(isRecord(modelingMode)).toBe(true);
    expect(isRecord(workshopFormat)).toBe(true);

    const types = isRecord(elementType) ? (elementType.enum as string[]) : [];
    const modes = isRecord(modelingMode) ? (modelingMode.enum as string[]) : [];
    const formats = isRecord(workshopFormat) ? (workshopFormat.enum as string[]) : [];

    expect(modes).toEqual(["eventStorming"]);
    expect(formats).toEqual([...workshopFormatsForMode("eventStorming")]);
    expect(types).toEqual([...elementTypesForMode("eventStorming")]);
    expect(types.length).toBeLessThan(ALL_ELEMENT_TYPES.length);
    expect(types).not.toContain("c4Person");
    expect(types).toContain("domainEvent");
  });

  it("scopes DDD workshop formats and types", () => {
    const schema = buildAiContextModeSchema("domainDrivenDesign");
    const defs = schema.$defs;
    expect(isRecord(defs)).toBe(true);
    const elementType = isRecord(defs) ? defs.elementType : null;
    const types = isRecord(elementType) ? (elementType.enum as string[]) : [];
    expect(types).toContain("entity");
    expect(types).toContain("aggregate");
    expect(types).not.toContain("processGateway");
  });

  it("keeps optional layout properties from the base schema", () => {
    const schema = buildAiContextModeSchema("eventStorming");
    const defs = schema.$defs;
    expect(isRecord(defs)).toBe(true);
    const aiElement = isRecord(defs) ? defs.aiElement : null;
    expect(isRecord(aiElement)).toBe(true);
    const props = isRecord(aiElement) && isRecord(aiElement.properties) ? aiElement.properties : {};
    expect(props).toHaveProperty("x");
    expect(props).toHaveProperty("y");
    expect(props).toHaveProperty("width");
    expect(props).toHaveProperty("height");
  });
});
