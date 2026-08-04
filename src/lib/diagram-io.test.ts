import { describe, expect, it } from "vitest";

import { boardImportPayloadFromAnyExportText } from "@/lib/board-import-text";
import { detectDiagramKind } from "@/lib/diagram-text";
import { boardImportPayloadFromDiagramText } from "@/lib/diagram-io";
import { parseMermaidToAiContext, renderMermaidFromAiContext } from "@/lib/mermaid-diagram";
import { parsePlantUmlToAiContext, renderPlantUmlFromAiContext } from "@/lib/plantuml-diagram";
import type { AiBoardContext } from "@/lib/view-export";
import { AI_CONTEXT_FORMAT, AI_CONTEXT_VERSION } from "@/lib/view-export";

function sampleCtx(mode: AiBoardContext["view"]["modelingMode"] = "eventStorming"): AiBoardContext {
  return {
    format: AI_CONTEXT_FORMAT,
    version: AI_CONTEXT_VERSION,
    exportedAt: "2026-01-01T00:00:00.000Z",
    title: "Demo",
    view: {
      id: "v1",
      name: "Board",
      modelingMode: mode,
      workshopFormat: "free",
      elements: [
        {
          id: "cmd-1",
          type: "command",
          label: "Place Order",
          order: 1,
          swimlane: "Checkout",
        },
        {
          id: "evt-1",
          type: "domainEvent",
          label: "Order Placed",
          order: 2,
          swimlane: "Checkout",
        },
      ],
      relations: [
        {
          type: "triggers",
          fromId: "cmd-1",
          toId: "evt-1",
          from: "Place Order",
          to: "Order Placed",
        },
      ],
      contextRelations: [],
      swimlanes: [{ id: "lane-1", label: "Checkout" }],
      boundedContexts: [],
    },
    glossary: [],
    actionItems: [],
  };
}

describe("mermaid / plantuml export-import", () => {
  it("detects diagram kinds", () => {
    expect(detectDiagramKind("flowchart LR\n  A --> B")).toBe("mermaid");
    expect(detectDiagramKind("@startuml\nA --> B\n@enduml")).toBe("plantuml");
    expect(detectDiagramKind('{"format":"event-storming-tool"}')).toBeNull();
  });

  it("exports mermaid flowchart and re-imports nodes/edges", () => {
    const mmd = renderMermaidFromAiContext(sampleCtx());
    expect(mmd).toContain("flowchart LR");
    expect(mmd).toContain("Place Order");
    expect(mmd).toContain("Order Placed");
    expect(mmd).toMatch(/-->/);

    const parsed = parseMermaidToAiContext(mmd);
    expect(parsed).not.toBeNull();
    expect(parsed!.view.elements.length).toBeGreaterThanOrEqual(2);
    expect(parsed!.view.relations.length).toBeGreaterThanOrEqual(1);

    const payload = boardImportPayloadFromDiagramText(mmd);
    expect(payload!.views[0]!.elements.length).toBeGreaterThanOrEqual(2);
  });

  it("exports plantuml and re-imports", () => {
    const puml = renderPlantUmlFromAiContext(sampleCtx());
    expect(puml).toContain("@startuml");
    expect(puml).toContain("Place Order");
    expect(puml).toContain("@enduml");

    const parsed = parsePlantUmlToAiContext(puml);
    expect(parsed).not.toBeNull();
    expect(parsed!.view.elements.length).toBeGreaterThanOrEqual(2);
    expect(parsed!.view.relations.length).toBeGreaterThanOrEqual(1);
  });

  it("exports class diagram for DDD mode", () => {
    const ctx = sampleCtx("domainDrivenDesign");
    ctx.view.elements = [
      { id: "a1", type: "aggregate", label: "Order", order: 1 },
      { id: "e1", type: "entity", label: "LineItem", order: 2 },
    ];
    ctx.view.relations = [
      {
        type: "contains",
        fromId: "a1",
        toId: "e1",
        from: "Order",
        to: "LineItem",
      },
    ];
    const mmd = renderMermaidFromAiContext(ctx);
    expect(mmd).toContain("classDiagram");
    expect(mmd).toContain("*--");
  });

  it("parses fenced mermaid via any-export bridge", () => {
    const text = "```mermaid\nflowchart LR\n  A[Do] -->|triggers| B[Done]\n```";
    const payload = boardImportPayloadFromAnyExportText(text);
    expect(payload).not.toBeNull();
    expect(payload!.views[0]!.elements.map((e) => e.label)).toEqual(
      expect.arrayContaining(["Do", "Done"]),
    );
  });

  it("parses simple plantuml activity steps", () => {
    const text = `@startuml
|Checkout|
:Place Order;
:Order Placed;
@enduml`;
    const parsed = parsePlantUmlToAiContext(text);
    expect(parsed!.view.elements.length).toBe(2);
    expect(parsed!.view.relations.length).toBe(1);
  });
});
