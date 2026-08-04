import type { AiBoardContext, AiContextView } from "@/lib/view-export";
import { AI_CONTEXT_FORMAT, AI_CONTEXT_VERSION } from "@/lib/view-export";
import type { ModelingMode, ElementType } from "@/types/storm-element";
import type { RelationType } from "@/types/storm-relation";
import { RELATION_TYPE_LABELS, CONTEXT_MAP_PATTERN_LABELS } from "@/types/storm-relation";
import { ELEMENT_STYLES } from "@/lib/element-styles";

/** Sanitize to a Mermaid/PlantUML-safe node id. */
export function diagramSafeId(raw: string, fallback = "n"): string {
  const cleaned = raw
    .trim()
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .replace(/^(\d)/, "_$1")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return cleaned || fallback;
}

export function escapeDiagramLabel(label: string): string {
  return label.replace(/"/g, "'").replace(/\n/g, " ").trim() || "?";
}

export function relationLabel(type: RelationType, custom?: string): string {
  const c = custom?.trim();
  if (c) return c;
  return RELATION_TYPE_LABELS[type] ?? type;
}

export function inferElementTypeFromLabel(
  label: string,
  mode: ModelingMode,
): ElementType {
  const l = label.toLowerCase();
  if (/\b(start|begin)\b/.test(l)) return "processStart";
  if (/\b(end|ende|finish)\b/.test(l)) return "processEnd";
  if (/\b(xor|gateway|gateway|entscheid)/i.test(l)) return "processGateway";
  if (mode === "dataModel" || mode === "architectureDocumentation") {
    if (/\b(assoc|beziehung|link)\b/.test(l)) return "dataAssociation";
    if (mode === "dataModel") return "dataEntity";
  }
  if (mode === "processFlow") return "processActivity";
  if (mode === "domainDrivenDesign") {
    if (/\b(vo|value)\b/.test(l)) return "valueObject";
    if (/\b(repo)\b/.test(l)) return "repository";
    if (/\b(service)\b/.test(l)) return "domainService";
    if (/\b(agg|aggregate)\b/.test(l)) return "aggregate";
    return "entity";
  }
  if (mode === "architectureDocumentation") {
    if (/\b(person|user|actor)\b/.test(l)) return "c4Person";
    if (/\b(vpc|vnet|subnet|netzwerk|network)\b/.test(l)) return "cloudNetwork";
    if (/\b(compute|lambda|function|aks|eks|gke|vm|container.?app)\b/.test(l)) return "cloudCompute";
    if (/\b(s3|blob|rds|dynamo|cosmos|storage|datenbank|database|cache|redis)\b/.test(l)) {
      return "cloudDataStore";
    }
    if (/\b(queue|bus|kafka|pubsub|sqs|sns|event.?hub|messaging)\b/.test(l)) return "cloudMessaging";
    if (/\b(iam|identity|cognito|entra|auth|secrets?)\b/.test(l)) return "cloudIdentity";
    if (/\b(cdn|gateway|waf|load.?balancer|edge|cloudfront|apigw)\b/.test(l)) return "cloudEdge";
    if (/\b(account|landing.?zone|subscription|tenant|cloud.?grenze|boundary)\b/.test(l)) {
      return "cloudBoundary";
    }
    if (/\b(managed|saas|paas)\b/.test(l)) return "cloudManagedService";
    if (/\b(container)\b/.test(l)) return "c4Container";
    if (/\b(component|komponente)\b/.test(l)) return "c4Component";
    if (/\b(system)\b/.test(l)) return "c4SoftwareSystem";
    if (/\b(blackbox|whitebox)\b/.test(l)) return "archBlackbox";
    return "archComponent";
  }
  if (mode === "bdd") {
    if (/\?|frage|question/.test(l)) return "question";
    if (/\b(example|beispiel|given)\b/.test(l)) return "example";
    return "rule";
  }
  if (mode === "userStoryMapping") {
    if (/\b(story|user story)\b/.test(l)) return "userStory";
    if (/\b(task|aufgabe)\b/.test(l)) return "userTask";
    if (/\b(release)\b/.test(l)) return "release";
    return "activity";
  }
  if (/\b(actor|user|rolle)\b/.test(l)) return "actor";
  if (/\b(command|befehl|cmd)\b/.test(l)) return "command";
  if (/\b(policy|regel)\b/.test(l)) return "policy";
  if (/\b(read ?model|view|lesemodell)\b/.test(l)) return "readModel";
  if (/\b(aggregate|agg)\b/.test(l)) return "aggregate";
  if (/\b(event|ereignis)\b/.test(l)) return "domainEvent";
  if (/\b(instruction|anweisung)\b/.test(l)) return "instruction";
  if (mode === "eventStorming" || mode === "eventModeling") return "domainEvent";
  return "note";
}

export function inferRelationType(edgeLabel: string | undefined, mode: ModelingMode): RelationType {
  const l = (edgeLabel ?? "").toLowerCase();
  for (const [type, de] of Object.entries(RELATION_TYPE_LABELS) as Array<[RelationType, string]>) {
    if (l === type.toLowerCase() || l === de.toLowerCase()) return type;
  }
  if (/trigger|löst/.test(l)) return "triggers";
  if (/react|reagiert/.test(l)) return "reactsWith";
  if (/inform/.test(l)) return "informs";
  if (/execut|ausgeführt|by/.test(l)) return "executedBy";
  if (/invok|ruft|uses|calls/.test(l)) return "invokes";
  if (/contain|enthält|has/.test(l)) return "contains";
  if (/annot|note/.test(l)) return "annotates";
  if (/causal|verursacht/.test(l)) return "causal";
  if (mode === "processFlow") return "causal";
  if (mode === "dataModel" || mode === "domainDrivenDesign" || mode === "architectureDocumentation") {
    return "contains";
  }
  return "triggers";
}

export function stereotypeForType(type: ElementType): string {
  return ELEMENT_STYLES[type]?.shortLabel ?? type;
}

export function detectDiagramKind(text: string): "mermaid" | "plantuml" | null {
  const t = text.trim();
  if (!t) return null;
  if (/^@startuml\b/im.test(t) || /^@startmindmap\b/im.test(t) || /^@startc4/im.test(t)) {
    return "plantuml";
  }
  if (
    /^(flowchart|graph|sequenceDiagram|classDiagram|erDiagram|stateDiagram|C4Context|C4Container|C4Component|mindmap)\b/im.test(
      t,
    ) ||
    /^```\s*mermaid\b/im.test(t)
  ) {
    return "mermaid";
  }
  // Heuristic: PlantUML often has skinparam / component without @startuml when pasted partial
  if (/\b(skinparam|!include|component\s+")/i.test(t) && /-->/.test(t)) return "plantuml";
  if (/\b(subgraph|end)\b/i.test(t) && /(-->|---|\|)/.test(t)) return "mermaid";
  return null;
}

export function stripMermaidFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:mermaid)?\s*([\s\S]*?)```$/i);
  if (fenced) return fenced[1]!.trim();
  return trimmed;
}

export function stripPlantUmlWrappers(text: string): string {
  let t = text.trim();
  t = t.replace(/^@startuml[^\n]*\n?/i, "");
  t = t.replace(/\n?@enduml\s*$/i, "");
  return t.trim();
}

export function inferModelingModeFromDiagram(text: string, kind: "mermaid" | "plantuml"): ModelingMode {
  const t = text.toLowerCase();
  if (/\berdiagram\b|\bentity\b/.test(t) && /\|/.test(t)) return "dataModel";
  if (/\bclassdiagram\b|\bclass\s+\w+/.test(t)) return "domainDrivenDesign";
  if (/\bc4|person\(|system\(|container\(|component\(/.test(t)) return "architectureDocumentation";
  if (/\bactivity\b|start\b.*:|\|lane/.test(t) || (kind === "plantuml" && /\bif\s*\(/.test(t))) {
    return "processFlow";
  }
  if (/\bsequencediagram\b/.test(t)) return "eventStorming";
  if (kind === "mermaid" && /\bflowchart\s+tb\b|\bgraph\s+tb\b/.test(t)) return "processFlow";
  return "eventStorming";
}

export function contextMapEdgeLabel(type: string, custom?: string): string {
  const c = custom?.trim();
  if (c) return c;
  return CONTEXT_MAP_PATTERN_LABELS[type as keyof typeof CONTEXT_MAP_PATTERN_LABELS] ?? type;
}

/** Build a short header comment for exported diagrams. */
export function diagramHeaderComment(
  kind: "mermaid" | "plantuml",
  ctx: AiBoardContext,
): string {
  const line = `E2 export — ${ctx.title} / ${ctx.view.name} (${ctx.view.modelingMode})`;
  if (kind === "mermaid") return `%% ${line}`;
  return `' ${line}`;
}

export function emptyAiContextFromView(
  title: string,
  view: Pick<AiContextView, "name" | "modelingMode" | "workshopFormat"> &
    Partial<AiContextView>,
): AiBoardContext {
  return {
    format: AI_CONTEXT_FORMAT,
    version: AI_CONTEXT_VERSION,
    exportedAt: new Date().toISOString(),
    title,
    view: {
      id: view.id ?? "imported",
      name: view.name,
      modelingMode: view.modelingMode,
      workshopFormat: view.workshopFormat ?? "free",
      elements: view.elements ?? [],
      relations: view.relations ?? [],
      contextRelations: view.contextRelations ?? [],
      swimlanes: view.swimlanes ?? [],
      boundedContexts: view.boundedContexts ?? [],
      ...(view.timeline ? { timeline: view.timeline } : {}),
    },
    glossary: [],
    actionItems: [],
  };
}
