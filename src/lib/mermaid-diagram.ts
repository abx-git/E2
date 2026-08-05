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
  stripMermaidFences,
} from "@/lib/diagram-text";
import type { AiBoardContext, AiContextElement, AiContextRelation } from "@/lib/view-export";
import type { ElementType, ModelingMode } from "@/types/storm-element";
import type { RelationType } from "@/types/storm-relation";

function nodeShape(type: ElementType, id: string, label: string): string {
  const l = `"${escapeDiagramLabel(label)}"`;
  switch (type) {
    case "processStart":
    case "processEnd":
      return `${id}([${l}])`;
    case "processGateway":
      return `${id}{${l}}`;
    case "actor":
    case "c4Person":
      return `${id}((${l}))`;
    case "command":
      return `${id}[${l}]`;
    case "domainEvent":
    case "pivotalEvent":
      return `${id}>${l}]`;
    case "note":
    case "instruction":
    case "hotspot":
    case "question":
      return `${id}{{${l}}}`;
    default:
      return `${id}[${l}]`;
  }
}

function flowchartDirection(mode: ModelingMode): "LR" | "TB" {
  if (
    mode === "processFlow" ||
    mode === "bdd" ||
    mode === "userStoryMapping" ||
    mode === "c4" ||
    mode === "arc42" ||
    mode === "cloud" ||
    mode === "domainDrivenDesign"
  ) {
    return "TB";
  }
  return "LR";
}

function exportFlowchart(ctx: AiBoardContext): string {
  const view = ctx.view;
  const dir = flowchartDirection(view.modelingMode);
  const lines: string[] = [
    diagramHeaderComment("mermaid", ctx),
    `flowchart ${dir}`,
  ];

  const idMap = new Map<string, string>();
  const used = new Set<string>();
  for (const el of view.elements) {
    let id = diagramSafeId(el.id, `n${el.order}`);
    if (used.has(id)) id = diagramSafeId(`${el.id}_${el.order}`, `n${el.order}`);
    used.add(id);
    idMap.set(el.id, id);
  }

  const byLane = new Map<string, AiContextElement[]>();
  for (const el of view.elements) {
    const key = el.swimlane?.trim() || "";
    const list = byLane.get(key) ?? [];
    list.push(el);
    byLane.set(key, list);
  }

  const emitNode = (el: AiContextElement, indent: string) => {
    const id = idMap.get(el.id)!;
    lines.push(`${indent}${nodeShape(el.type, id, el.label)}`);
    lines.push(`${indent}%% type:${el.type}`);
  };

  let laneIndex = 0;
  for (const [lane, els] of byLane) {
    if (lane) {
      const sid = diagramSafeId(`lane_${lane}`, `lane${laneIndex}`);
      lines.push(`  subgraph ${sid}["${escapeDiagramLabel(lane)}"]`);
      for (const el of els) emitNode(el, "    ");
      lines.push("  end");
    } else {
      for (const el of els) emitNode(el, "  ");
    }
    laneIndex += 1;
  }

  for (const bc of view.boundedContexts) {
    const members = view.elements.filter((e) => e.boundedContext === bc.label);
    if (members.length === 0) continue;
    const sid = diagramSafeId(`bc_${bc.id || bc.label}`, "bc");
    lines.push(`  subgraph ${sid}["BC: ${escapeDiagramLabel(bc.label)}"]`);
    for (const el of members) {
      const id = idMap.get(el.id);
      if (id) lines.push(`    ${id}`);
    }
    lines.push("  end");
  }

  for (const rel of view.relations) {
    const from = idMap.get(rel.fromId);
    const to = idMap.get(rel.toId);
    if (!from || !to) continue;
    const label = escapeDiagramLabel(relationLabel(rel.type, rel.label));
    const arrow =
      rel.type === "reactsWith" || rel.type === "annotates" ? "-.->" : "-->";
    lines.push(`  ${from} ${arrow}|${label}| ${to}`);
  }

  for (const rel of view.contextRelations) {
    const from = diagramSafeId(rel.fromId || rel.from, "bcA");
    const to = diagramSafeId(rel.toId || rel.to, "bcB");
    lines.push(`  ${from}["${escapeDiagramLabel(rel.from)}"]`);
    lines.push(`  ${to}["${escapeDiagramLabel(rel.to)}"]`);
    const label = escapeDiagramLabel(contextMapEdgeLabel(rel.type, rel.label));
    lines.push(`  ${from} -.->|${label}| ${to}`);
  }

  return lines.join("\n");
}

function exportClassDiagram(ctx: AiBoardContext): string {
  const view = ctx.view;
  const lines: string[] = [diagramHeaderComment("mermaid", ctx), "classDiagram"];
  const idMap = new Map<string, string>();

  for (const el of view.elements) {
    if (el.type === "note" || el.type === "instruction" || el.type === "hotspot" || el.type === "link") continue;
    const id = diagramSafeId(el.id, "C");
    idMap.set(el.id, id);
    lines.push(`  class ${id}["${escapeDiagramLabel(el.label)}"]`);
    lines.push(`  <<${stereotypeForType(el.type)}>> ${id}`);
    const attrs = el.metadata?.attributes ?? [];
    for (const a of attrs.slice(0, 12)) {
      lines.push(`  ${id} : ${escapeDiagramLabel(a)}`);
    }
    const ops = el.metadata?.operations ?? el.metadata?.aggregateMethods ?? [];
    for (const o of ops.slice(0, 8)) {
      lines.push(`  ${id} : ${escapeDiagramLabel(o)}()`);
    }
  }

  for (const rel of view.relations) {
    const from = idMap.get(rel.fromId);
    const to = idMap.get(rel.toId);
    if (!from || !to) continue;
    const label = escapeDiagramLabel(relationLabel(rel.type, rel.label));
    if (rel.type === "contains") {
      lines.push(`  ${from} *-- ${to} : ${label}`);
    } else {
      lines.push(`  ${from} --> ${to} : ${label}`);
    }
  }

  return lines.join("\n");
}

function exportErDiagram(ctx: AiBoardContext): string {
  const view = ctx.view;
  const lines: string[] = [diagramHeaderComment("mermaid", ctx), "erDiagram"];
  const idMap = new Map<string, string>();

  for (const el of view.elements) {
    if (el.type !== "dataEntity" && el.type !== "entity" && el.type !== "aggregate") continue;
    const id = diagramSafeId(el.label || el.id, "E").toUpperCase();
    idMap.set(el.id, id);
    const attrs = [
      ...(el.metadata?.identityFields ?? []).map((f) => `    ${escapeDiagramLabel(f)} PK`),
      ...(el.metadata?.attributes ?? []).map((a) => `    ${escapeDiagramLabel(a)}`),
    ];
    if (attrs.length > 0) {
      lines.push(`  ${id} {`);
      lines.push(...attrs);
      lines.push("  }");
    } else {
      lines.push(`  ${id} {`);
      lines.push(`    id PK`);
      lines.push("  }");
    }
  }

  const cardinalityArrow = (c?: string): string => {
    switch (c) {
      case "1:1":
        return "||--||";
      case "1:n":
        return "||--o{";
      case "n:1":
        return "}o--||";
      case "n:m":
        return "}o--o{";
      default:
        return "||--o{";
    }
  };

  for (const rel of view.relations) {
    const from = idMap.get(rel.fromId);
    const to = idMap.get(rel.toId);
    if (!from || !to) continue;
    lines.push(`  ${from} ${cardinalityArrow()} ${to} : "${escapeDiagramLabel(relationLabel(rel.type, rel.label))}"`);
  }

  for (const el of view.elements) {
    if (el.type !== "dataAssociation") continue;
    const left = el.metadata?.dataLeftEntity?.trim();
    const right = el.metadata?.dataRightEntity?.trim();
    if (!left || !right) continue;
    const a = diagramSafeId(left, "A").toUpperCase();
    const b = diagramSafeId(right, "B").toUpperCase();
    lines.push(
      `  ${a} ${cardinalityArrow(el.metadata?.dataCardinality)} ${b} : "${escapeDiagramLabel(el.label)}"`,
    );
  }

  return lines.join("\n");
}

/** Export one Sicht as Mermaid text (mode-aware). */
export function renderMermaidFromAiContext(ctx: AiBoardContext): string {
  switch (ctx.view.modelingMode) {
    case "dataModel":
      return exportErDiagram(ctx);
    case "domainDrivenDesign":
      return exportClassDiagram(ctx);
    default:
      return exportFlowchart(ctx);
  }
}

// --- Import ---

interface ParsedNode {
  id: string;
  label: string;
  typeHint?: ElementType;
  swimlane?: string;
}

interface ParsedEdge {
  from: string;
  to: string;
  label?: string;
}

function parseFlowchart(body: string, mode: ModelingMode): AiBoardContext {
  const nodes = new Map<string, ParsedNode>();
  const edges: ParsedEdge[] = [];
  let currentLane: string | undefined;
  const subgraphStack: string[] = [];

  const ensureNode = (id: string, label?: string) => {
    const safe = diagramSafeId(id, id);
    const existing = nodes.get(safe);
    if (existing) {
      if (label && label !== safe) existing.label = label;
      return existing;
    }
    const node: ParsedNode = {
      id: safe,
      label: label?.trim() || id,
      swimlane: currentLane,
    };
    nodes.set(safe, node);
    return node;
  };

  const lines = body.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("%%") || line.startsWith("flowchart") || line.startsWith("graph")) {
      continue;
    }

    const sub = line.match(/^subgraph\s+(\w+)(?:\["([^"]*)"\])?/i);
    if (sub) {
      const title = sub[2] || sub[1]!;
      subgraphStack.push(title);
      if (/^BC:/i.test(title)) {
        // BC subgraph — don't treat as swimlane
      } else {
        currentLane = title.replace(/^BC:\s*/i, "");
      }
      continue;
    }
    if (line === "end") {
      subgraphStack.pop();
      currentLane = undefined;
      for (let i = subgraphStack.length - 1; i >= 0; i -= 1) {
        const t = subgraphStack[i]!;
        if (!/^BC:/i.test(t)) {
          currentLane = t;
          break;
        }
      }
      continue;
    }

    const typeComment = line.match(/^%%\s*type:(\w+)/);
    if (typeComment) continue;

    // Node definition: id[label], id(label), id((label)), id{label}, id>label]
    const nodeDef = line.match(
      /^(\w+)\s*(?:\[([^\]]*)\]|\(([^\)]*)\)|\(\(([^\)]*)\)\)|\{([^\}]*)\}|>([^\]]*)\])\s*$/,
    );
    if (nodeDef && !/(-->|-\.->|---|==>)/.test(line)) {
      const id = nodeDef[1]!;
      const label =
        nodeDef[2] || nodeDef[3] || nodeDef[4] || nodeDef[5] || nodeDef[6] || id;
      ensureNode(id, label.replace(/^"|"$/g, ""));
      continue;
    }

    // Edge with optional inline shapes: A[Do] -->|label| B[Done]
    const edge = line.match(
      /^(\w+)(?:\[[^\]]*\]|\([^\)]*\)|\(\([^\)]*\)\)|\{[^\}]*\}|>[^\]]*])?\s*(-->|-\.->|---|==>)\s*(?:\|([^|]+)\|)?\s*(\w+)(?:\[[^\]]*\]|\([^\)]*\)|\(\([^\)]*\)\)|\{[^\}]*\}|>[^\]]*])?/,
    );
    if (edge) {
      const fromRaw = line.match(/^(\w+)(?:\[([^\]]*)\])?/);
      const toRaw = line.match(/(?:-->|-\.->|---|==>)\s*(?:\|[^|]+\|)?\s*(\w+)(?:\[([^\]]*)\])?/);
      const fromId = edge[1]!;
      const toId = edge[4]!;
      ensureNode(fromId, fromRaw?.[2] || undefined);
      ensureNode(toId, toRaw?.[2] || undefined);
      edges.push({
        from: diagramSafeId(fromId),
        to: diagramSafeId(toId),
        label: edge[3]?.trim(),
      });
      continue;
    }

    // Bare id inside subgraph
    if (/^\w+$/.test(line)) {
      ensureNode(line);
    }
  }

  // Apply type comments from original — scan again for id + %% type on previous pattern in export
  // Our export puts type on next line as %% type: — associate with last defined node is fragile.
  // Infer from labels instead.
  const elements: AiContextElement[] = [...nodes.values()].map((n, index) => ({
    id: n.id,
    type: inferElementTypeFromLabel(n.label, mode),
    label: n.label.replace(/^"|"$/g, ""),
    order: index + 1,
    ...(n.swimlane ? { swimlane: n.swimlane } : {}),
  }));

  const relations: AiContextRelation[] = edges.map((e) => {
    const fromEl = elements.find((el) => el.id === e.from);
    const toEl = elements.find((el) => el.id === e.to);
    const type = inferRelationType(e.label, mode);
    return {
      type,
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

  return emptyAiContextFromView("Mermaid Import", {
    id: "mermaid-import",
    name: "Mermaid",
    modelingMode: mode,
    workshopFormat: "free",
    elements,
    relations,
    swimlanes,
  });
}

function parseClassDiagram(body: string): AiBoardContext {
  const mode: ModelingMode = "domainDrivenDesign";
  const nodes = new Map<string, { id: string; label: string; stereotype?: string }>();
  const edges: ParsedEdge[] = [];

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("classDiagram") || line.startsWith("%%")) continue;

    const cls = line.match(/^class\s+(\w+)(?:\["([^"]*)"\])?/);
    if (cls) {
      nodes.set(cls[1]!, { id: cls[1]!, label: cls[2] || cls[1]! });
      continue;
    }
    const stereo = line.match(/^<<([^>]+)>>\s+(\w+)/);
    if (stereo) {
      const n = nodes.get(stereo[2]!);
      if (n) n.stereotype = stereo[1];
      continue;
    }
    const edge = line.match(/^(\w+)\s+(\*?--|-->|<\|--)\s+(\w+)(?:\s*:\s*(.+))?/);
    if (edge) {
      if (!nodes.has(edge[1]!)) nodes.set(edge[1]!, { id: edge[1]!, label: edge[1]! });
      if (!nodes.has(edge[3]!)) nodes.set(edge[3]!, { id: edge[3]!, label: edge[3]! });
      edges.push({ from: edge[1]!, to: edge[3]!, label: edge[4]?.trim() });
    }
  }

  const elements: AiContextElement[] = [...nodes.values()].map((n, i) => {
    let type: ElementType = "entity";
    const s = (n.stereotype ?? "").toLowerCase();
    if (s.includes("agg")) type = "aggregate";
    else if (s.includes("value") || s.includes("vo")) type = "valueObject";
    else if (s.includes("repo")) type = "repository";
    else if (s.includes("service")) type = "domainService";
    else if (s.includes("event")) type = "domainEvent";
    return { id: n.id, type, label: n.label, order: i + 1 };
  });

  const relations: AiContextRelation[] = edges.map((e) => {
    const type: RelationType = /enthält|contain/i.test(e.label ?? "") ? "contains" : inferRelationType(e.label, mode);
    const fromEl = elements.find((el) => el.id === e.from);
    const toEl = elements.find((el) => el.id === e.to);
    return {
      type,
      fromId: e.from,
      toId: e.to,
      from: fromEl?.label ?? e.from,
      to: toEl?.label ?? e.to,
      ...(e.label ? { label: e.label } : {}),
    };
  });

  return emptyAiContextFromView("Mermaid Import", {
    id: "mermaid-import",
    name: "Class Diagram",
    modelingMode: mode,
    workshopFormat: "tacticalDesign",
    elements,
    relations,
  });
}

function parseErDiagram(body: string): AiBoardContext {
  const mode: ModelingMode = "dataModel";
  const entities = new Map<string, { id: string; label: string; attrs: string[]; pks: string[] }>();
  const edges: Array<ParsedEdge & { card?: string }> = [];

  let current: string | null = null;
  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("erDiagram") || line.startsWith("%%")) continue;

    const ent = line.match(/^(\w+)\s*\{$/);
    if (ent) {
      current = ent[1]!;
      if (!entities.has(current)) {
        entities.set(current, { id: current, label: current, attrs: [], pks: [] });
      }
      continue;
    }
    if (line === "}" && current) {
      current = null;
      continue;
    }
    if (current && !line.includes("--")) {
      const pk = /\bPK\b/i.test(line);
      const name = line.replace(/\bPK\b/i, "").trim();
      const e = entities.get(current)!;
      if (pk) e.pks.push(name);
      else if (name) e.attrs.push(name);
      continue;
    }

    const rel = line.match(
      /^(\w+)\s+(\|\|--\|\||\|\|--o\{|\}o--\|\||\}o--o\{)\s+(\w+)\s*:\s*"?([^"]*)"?/,
    );
    if (rel) {
      if (!entities.has(rel[1]!)) entities.set(rel[1]!, { id: rel[1]!, label: rel[1]!, attrs: [], pks: [] });
      if (!entities.has(rel[3]!)) entities.set(rel[3]!, { id: rel[3]!, label: rel[3]!, attrs: [], pks: [] });
      edges.push({ from: rel[1]!, to: rel[3]!, label: rel[4]?.trim(), card: rel[2] });
    }
  }

  const elements: AiContextElement[] = [...entities.values()].map((e, i) => ({
    id: e.id,
    type: "dataEntity" as const,
    label: e.label,
    order: i + 1,
    metadata: {
      ...(e.attrs.length ? { attributes: e.attrs } : {}),
      ...(e.pks.length ? { identityFields: e.pks } : {}),
    },
  }));

  const cardMap: Record<string, "1:1" | "1:n" | "n:1" | "n:m"> = {
    "||--||": "1:1",
    "||--o{": "1:n",
    "}o--||": "n:1",
    "}o--o{": "n:m",
  };

  const relations: AiContextRelation[] = edges.map((e) => ({
    type: "contains" as const,
    fromId: e.from,
    toId: e.to,
    from: e.from,
    to: e.to,
    label: e.label || cardMap[e.card ?? ""] || "relates",
  }));

  return emptyAiContextFromView("Mermaid Import", {
    id: "mermaid-import",
    name: "ER Diagram",
    modelingMode: mode,
    workshopFormat: "dataModelWorkshop",
    elements,
    relations,
  });
}

/** Parse Mermaid text into AI context (then layout via existing import). */
export function parseMermaidToAiContext(text: string): AiBoardContext | null {
  const body = stripMermaidFences(text);
  if (!body.trim()) return null;

  const mode = inferModelingModeFromDiagram(body, "mermaid");
  const head = body.split(/\r?\n/).find((l) => l.trim() && !l.trim().startsWith("%%")) ?? "";

  if (/^classDiagram\b/i.test(head) || /^classDiagram\b/im.test(body)) {
    return parseClassDiagram(body);
  }
  if (/^erDiagram\b/i.test(head) || /^erDiagram\b/im.test(body)) {
    return parseErDiagram(body);
  }
  if (
    /^(flowchart|graph)\b/i.test(head) ||
    /^(flowchart|graph)\b/im.test(body) ||
    /-->/.test(body)
  ) {
    return parseFlowchart(body, mode);
  }
  return null;
}
