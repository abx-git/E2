import {
  contextMapEdgeLabel,
  diagramHeaderComment,
  diagramSafeId,
  emptyAiContextFromView,
  escapeDiagramLabel,
  inferElementTypeFromLabel,
  inferModelingModeFromDiagram,
  inferRelationType,
  relationLabel,
  stereotypeForType,
  stripPlantUmlWrappers,
} from "@/lib/diagram-text";
import type { AiBoardContext, AiContextElement, AiContextRelation } from "@/lib/view-export";
import type { ElementType, ModelingMode } from "@/types/storm-element";
import type { RelationType } from "@/types/storm-relation";

function exportActivity(ctx: AiBoardContext): string {
  // Process boards are graphs — component notation round-trips more reliably than linear activity.
  return exportComponent(ctx);
}

function exportComponent(ctx: AiBoardContext): string {
  const view = ctx.view;
  const lines: string[] = [
    "@startuml",
    diagramHeaderComment("plantuml", ctx),
    "left to right direction",
    "skinparam componentStyle rectangle",
  ];

  const idMap = new Map<string, string>();
  const used = new Set<string>();

  for (const el of view.elements) {
    let id = diagramSafeId(el.id, "n");
    if (used.has(id)) id = `${id}_${el.order}`;
    used.add(id);
    idMap.set(el.id, id);
  }

  const lanes = new Map<string, typeof view.elements>();
  for (const el of view.elements) {
    const key = el.swimlane?.trim() || el.boundedContext?.trim() || "";
    const list = lanes.get(key) ?? [];
    list.push(el);
    lanes.set(key, list);
  }

  for (const [pkg, els] of lanes) {
    if (pkg) {
      lines.push(`package "${escapeDiagramLabel(pkg)}" {`);
      for (const el of els) {
        const id = idMap.get(el.id)!;
        lines.push(
          `  component "${escapeDiagramLabel(el.label)}" as ${id} <<${stereotypeForType(el.type)}>>`,
        );
      }
      lines.push("}");
    } else {
      for (const el of els) {
        const id = idMap.get(el.id)!;
        lines.push(
          `component "${escapeDiagramLabel(el.label)}" as ${id} <<${stereotypeForType(el.type)}>>`,
        );
      }
    }
  }

  for (const rel of view.relations) {
    const from = idMap.get(rel.fromId);
    const to = idMap.get(rel.toId);
    if (!from || !to) continue;
    const arrow =
      rel.type === "reactsWith" || rel.type === "annotates" ? "..>" : "-->";
    lines.push(
      `${from} ${arrow} ${to} : ${escapeDiagramLabel(relationLabel(rel.type, rel.label))}`,
    );
  }

  for (const rel of view.contextRelations) {
    const from = diagramSafeId(rel.fromId || rel.from, "bcA");
    const to = diagramSafeId(rel.toId || rel.to, "bcB");
    lines.push(`rectangle "${escapeDiagramLabel(rel.from)}" as ${from}`);
    lines.push(`rectangle "${escapeDiagramLabel(rel.to)}" as ${to}`);
    lines.push(
      `${from} ..> ${to} : ${escapeDiagramLabel(contextMapEdgeLabel(rel.type, rel.label))}`,
    );
  }

  lines.push("@enduml");
  return lines.join("\n");
}

function exportClass(ctx: AiBoardContext): string {
  const view = ctx.view;
  const lines: string[] = [
    "@startuml",
    diagramHeaderComment("plantuml", ctx),
    "skinparam classAttributeIconSize 0",
  ];
  const idMap = new Map<string, string>();

  for (const el of view.elements) {
    if (el.type === "note" || el.type === "instruction" || el.type === "hotspot" || el.type === "link") continue;
    const id = diagramSafeId(el.id, "C");
    idMap.set(el.id, id);
    const stereo = stereotypeForType(el.type);
    lines.push(`class "${escapeDiagramLabel(el.label)}" as ${id} <<${stereo}>> {`);
    for (const a of el.metadata?.attributes ?? []) {
      lines.push(`  ${escapeDiagramLabel(a)}`);
    }
    for (const o of el.metadata?.operations ?? el.metadata?.aggregateMethods ?? []) {
      lines.push(`  ${escapeDiagramLabel(o)}()`);
    }
    lines.push("}");
    if (el.boundedContext) {
      lines.push(`package "${escapeDiagramLabel(el.boundedContext)}" {`);
      lines.push(`  class ${id}`);
      lines.push("}");
    }
  }

  for (const rel of view.relations) {
    const from = idMap.get(rel.fromId);
    const to = idMap.get(rel.toId);
    if (!from || !to) continue;
    if (rel.type === "contains") {
      lines.push(`${from} *-- ${to} : ${escapeDiagramLabel(relationLabel(rel.type, rel.label))}`);
    } else {
      lines.push(`${from} --> ${to} : ${escapeDiagramLabel(relationLabel(rel.type, rel.label))}`);
    }
  }

  lines.push("@enduml");
  return lines.join("\n");
}

function exportEr(ctx: AiBoardContext): string {
  const view = ctx.view;
  const lines: string[] = [
    "@startuml",
    diagramHeaderComment("plantuml", ctx),
    "!define primary_key(x) <b><color:#b8861b><&key></color> x</b>",
    "hide circle",
    "skinparam linetype ortho",
  ];
  const idMap = new Map<string, string>();

  for (const el of view.elements) {
    if (el.type !== "dataEntity" && el.type !== "entity" && el.type !== "aggregate") continue;
    const id = diagramSafeId(el.label || el.id, "E");
    idMap.set(el.id, id);
    lines.push(`entity "${escapeDiagramLabel(el.label)}" as ${id} {`);
    for (const pk of el.metadata?.identityFields ?? ["id"]) {
      lines.push(`  * ${escapeDiagramLabel(pk)} <<PK>>`);
    }
    for (const a of el.metadata?.attributes ?? []) {
      lines.push(`  ${escapeDiagramLabel(a)}`);
    }
    lines.push("}");
  }

  for (const rel of view.relations) {
    const from = idMap.get(rel.fromId);
    const to = idMap.get(rel.toId);
    if (!from || !to) continue;
    lines.push(`${from} ||--o{ ${to} : ${escapeDiagramLabel(relationLabel(rel.type, rel.label))}`);
  }

  lines.push("@enduml");
  return lines.join("\n");
}

/** Export one Sicht as PlantUML text (mode-aware). */
export function renderPlantUmlFromAiContext(ctx: AiBoardContext): string {
  switch (ctx.view.modelingMode) {
    case "dataModel":
      return exportEr(ctx);
    case "domainDrivenDesign":
      return exportClass(ctx);
    case "processFlow":
      return exportActivity(ctx);
    default:
      return exportComponent(ctx);
  }
}

// --- Import ---

function parsePlantUmlComponentOrClass(body: string, mode: ModelingMode): AiBoardContext {
  const nodes = new Map<string, { id: string; label: string; stereo?: string; pkg?: string }>();
  const edges: Array<{ from: string; to: string; label?: string; dashed?: boolean }> = [];
  let currentPkg: string | undefined;
  let pkgDepth = 0;

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("'") || line.startsWith("!") || line.startsWith("skinparam")) {
      continue;
    }
    if (/^left to right/i.test(line) || /^top to bottom/i.test(line) || /^hide /i.test(line)) {
      continue;
    }

    const pkgOpen = line.match(/^package\s+"([^"]+)"\s*\{/);
    if (pkgOpen) {
      currentPkg = pkgOpen[1];
      pkgDepth += 1;
      continue;
    }
    if (line === "}") {
      pkgDepth = Math.max(0, pkgDepth - 1);
      if (pkgDepth === 0) currentPkg = undefined;
      continue;
    }

    const comp = line.match(
      /^(?:component|rectangle|entity|class)\s+"([^"]+)"\s+as\s+(\w+)(?:\s+<<([^>]+)>>)?/i,
    );
    if (comp) {
      nodes.set(comp[2]!, {
        id: comp[2]!,
        label: comp[1]!,
        stereo: comp[3],
        pkg: currentPkg,
      });
      continue;
    }

    const bareClass = line.match(/^class\s+(\w+)(?:\s+<<([^>]+)>>)?/i);
    if (bareClass) {
      nodes.set(bareClass[1]!, {
        id: bareClass[1]!,
        label: bareClass[1]!,
        stereo: bareClass[2],
        pkg: currentPkg,
      });
      continue;
    }

    const edge = line.match(/^(\w+)\s+(\.?\.?>|->|-->|\*--)\s+(\w+)(?:\s*:\s*(.+))?/);
    if (edge) {
      if (!nodes.has(edge[1]!)) nodes.set(edge[1]!, { id: edge[1]!, label: edge[1]! });
      if (!nodes.has(edge[3]!)) nodes.set(edge[3]!, { id: edge[3]!, label: edge[3]! });
      edges.push({
        from: edge[1]!,
        to: edge[3]!,
        label: edge[4]?.trim(),
        dashed: edge[2]!.includes("."),
      });
    }
  }

  // Activity-style :label;
  if (nodes.size === 0) {
    const acts: string[] = [];
    let lane: string | undefined;
    const laneMap = new Map<string, string>();
    for (const rawLine of body.split(/\r?\n/)) {
      const line = rawLine.trim();
      const laneMatch = line.match(/^\|([^|]+)\|/);
      if (laneMatch) {
        lane = laneMatch[1]!.trim();
        continue;
      }
      const act = line.match(/^:(.+);/);
      if (act) {
        const label = act[1]!.trim();
        const id = diagramSafeId(label, `a${acts.length + 1}`);
        acts.push(label);
        nodes.set(id, { id, label, pkg: lane });
        if (lane) laneMap.set(id, lane);
      }
    }
    const ids = [...nodes.keys()];
    for (let i = 0; i < ids.length - 1; i += 1) {
      edges.push({ from: ids[i]!, to: ids[i + 1]! });
    }
  }

  const elements: AiContextElement[] = [...nodes.values()].map((n, i) => {
    let type: ElementType = inferElementTypeFromLabel(n.label, mode);
    const s = (n.stereo ?? "").toLowerCase();
    if (s.includes("event")) type = "domainEvent";
    else if (s.includes("cmd") || s.includes("command")) type = "command";
    else if (s.includes("actor")) type = "actor";
    else if (s.includes("agg")) type = "aggregate";
    else if (s.includes("entity")) type = mode === "dataModel" ? "dataEntity" : "entity";
    else if (s.includes("policy")) type = "policy";
    return {
      id: n.id,
      type,
      label: n.label,
      order: i + 1,
      ...(n.pkg ? { swimlane: n.pkg } : {}),
    };
  });

  const relations: AiContextRelation[] = edges.map((e) => {
    const type: RelationType = e.dashed
      ? inferRelationType(e.label ?? "reactsWith", mode)
      : inferRelationType(e.label, mode);
    const fromEl = elements.find((el) => el.id === e.from);
    const toEl = elements.find((el) => el.id === e.to);
    return {
      type: /\*/.test(e.label ?? "") ? "contains" : type,
      fromId: e.from,
      toId: e.to,
      from: fromEl?.label ?? e.from,
      to: toEl?.label ?? e.to,
      ...(e.label ? { label: e.label } : {}),
    };
  });

  const swimlanes = [
    ...new Set(elements.map((e) => e.swimlane).filter(Boolean) as string[]),
  ].map((label, i) => ({ id: `lane-${i + 1}`, label }));

  return emptyAiContextFromView("PlantUML Import", {
    id: "plantuml-import",
    name: mode === "processFlow" ? "Activity" : "PlantUML",
    modelingMode: mode,
    workshopFormat: "free",
    elements,
    relations,
    swimlanes,
  });
}

/** Parse PlantUML text into AI context. */
export function parsePlantUmlToAiContext(text: string): AiBoardContext | null {
  const raw = text.trim();
  if (!raw) return null;
  const body = stripPlantUmlWrappers(raw);
  if (!body && !/@startuml/i.test(raw)) return null;

  const mode = inferModelingModeFromDiagram(raw, "plantuml");
  const ctx = parsePlantUmlComponentOrClass(body || raw, mode);
  if (ctx.view.elements.length === 0) return null;
  return ctx;
}
