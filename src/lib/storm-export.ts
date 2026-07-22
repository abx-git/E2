import { elementRect as geomElementRect, relationAnchors } from "@/lib/connector-geometry";
import {
  cardAttributeLines,
  cardMethodLines,
} from "@/lib/card-preview";
import { ELEMENT_STYLES } from "@/lib/element-styles";
import { resolveNoteColor } from "@/lib/note-colors";
import { boardActiveSliceFromStore } from "@/store/storm-board-store";
import type { BoardActiveSlice } from "@/lib/storm-json";
import type { StormElement } from "@/types/storm-element";
import { RELATION_TYPE_LABELS, CONTEXT_MAP_PATTERN_LABELS } from "@/types/storm-relation";

function downloadText(filename: string, content: string, mime = "text/plain;charset=utf-8"): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportHotspotReportMarkdown(): void {
  const { elements, title } = boardActiveSliceFromStore();
  const hotspots = elements.filter((e) => e.type === "hotspot");
  const lines = [`# Hotspot Report — ${title}`, "", `Erstellt: ${new Date().toLocaleString("de-DE")}`, ""];

  if (hotspots.length === 0) {
    lines.push("_Keine Hotspots._");
  } else {
    for (const h of hotspots) {
      const status = h.metadata?.hotspotStatus ?? "open";
      const priority = h.metadata?.hotspotPriority ?? "medium";
      lines.push(`## ${h.label}`, `- Status: ${status}`, `- Priorität: ${priority}`);
      if (h.description) lines.push(`- Beschreibung: ${h.description}`);
      lines.push("");
    }
  }

  downloadText(`${title.replace(/\s+/g, "-").toLowerCase()}-hotspots.md`, lines.join("\n"));
}

export function exportGlossaryMarkdown(): void {
  const { glossary, title } = boardActiveSliceFromStore();
  const lines = [`# Ubiquitous Language — ${title}`, "", "| Begriff | Definition |", "| --- | --- |"];
  for (const g of glossary) {
    lines.push(`| ${g.term} | ${g.definition.replace(/\|/g, "\\|")} |`);
  }
  if (glossary.length === 0) lines.push("| _leer_ | _leer_ |");
  downloadText(`${title.replace(/\s+/g, "-").toLowerCase()}-glossary.md`, lines.join("\n"));
}

export function exportContextMapMarkdown(): void {
  const { boundedContexts, elements, relations, contextRelations, title } =
    boardActiveSliceFromStore();
  const lines = [`# Context Map — ${title}`, ""];

  for (const bc of boundedContexts) {
    const inside = elements.filter((e) => e.boundedContextId === bc.id);
    lines.push(`## ${bc.label}`);
    if (bc.purpose) lines.push(bc.purpose);
    lines.push("", "**Elemente:**");
    for (const el of inside) lines.push(`- ${ELEMENT_STYLES[el.type].shortLabel}: ${el.label}`);
    lines.push("");
  }

  if (contextRelations.length > 0) {
    lines.push("## Context-Map-Muster", "");
    for (const r of contextRelations) {
      const src = boundedContexts.find((b) => b.id === r.sourceContextId);
      const tgt = boundedContexts.find((b) => b.id === r.targetContextId);
      const label = r.label ? ` — ${r.label}` : "";
      lines.push(
        `- ${src?.label ?? r.sourceContextId} → ${tgt?.label ?? r.targetContextId} (${CONTEXT_MAP_PATTERN_LABELS[r.type]})${label}`,
      );
    }
    lines.push("");
  }

  const crossBoundary = relations.filter((r) => {
    const src = elements.find((e) => e.id === r.sourceId);
    const tgt = elements.find((e) => e.id === r.targetId);
    return src?.boundedContextId && tgt?.boundedContextId && src.boundedContextId !== tgt.boundedContextId;
  });

  if (crossBoundary.length > 0) {
    lines.push("## Integrationspunkte (Element-Relationen)", "");
    for (const r of crossBoundary) {
      const src = elements.find((e) => e.id === r.sourceId)!;
      const tgt = elements.find((e) => e.id === r.targetId)!;
      lines.push(`- ${src.label} → ${tgt.label} (${RELATION_TYPE_LABELS[r.type]})`);
    }
  }

  downloadText(`${title.replace(/\s+/g, "-").toLowerCase()}-context-map.md`, lines.join("\n"));
}

export function exportEventCatalogMarkdown(): void {
  const { elements, title } = boardActiveSliceFromStore();
  const events = elements.filter((e) => e.type === "domainEvent");
  const lines = [`# Event Catalog — ${title}`, "", "| Event | Schema | Beschreibung |", "| --- | --- | --- |"];

  for (const e of events) {
    const schema = e.metadata?.eventSchema
      ? `\`${JSON.stringify(e.metadata.eventSchema)}\``
      : "_—_";
    lines.push(`| ${e.label} | ${schema} | ${e.description ?? "—"} |`);
  }

  if (events.length === 0) lines.push("| _keine Events_ | — | — |");
  downloadText(`${title.replace(/\s+/g, "-").toLowerCase()}-events.md`, lines.join("\n"));
}

function slugTitle(title: string): string {
  return title.replace(/\s+/g, "-").toLowerCase();
}

function mdBulletList(items: string[], empty = "_—_"): string[] {
  if (items.length === 0) return [`- ${empty}`];
  return items.map((i) => `- ${i}`);
}

function mdMetaBlock(el: StormElement): string[] {
  const lines: string[] = [];
  if (el.description?.trim()) lines.push(`- Beschreibung: ${el.description.trim()}`);
  const attrs = cardAttributeLines(el);
  if (attrs.length) {
    lines.push("- Attribute:");
    for (const a of attrs) lines.push(`  - ${a}`);
  }
  const methods = cardMethodLines(el);
  if (methods.length) {
    lines.push("- Methoden / Operationen:");
    for (const m of methods) lines.push(`  - ${m}`);
  }
  return lines;
}

/** DDD: Subdomains, Aggregates, Entities, VOs, Services, Repositories, Factories. */
export function exportDomainModelMarkdown(): void {
  const { elements, title, boundedContexts, glossary } = boardActiveSliceFromStore();
  const lines = [
    `# Domain Model — ${title}`,
    "",
    `Erstellt: ${new Date().toLocaleString("de-DE")}`,
    "",
  ];

  const subdomains = elements.filter((e) => e.type === "subdomain");
  if (subdomains.length > 0) {
    lines.push("## Subdomains", "");
    for (const s of subdomains) {
      const kind = s.metadata?.subdomainKind ?? "core";
      lines.push(`### ${s.label} (${kind})`);
      lines.push(...mdMetaBlock(s), "");
    }
  }

  if (boundedContexts.length > 0) {
    lines.push("## Bounded Contexts", "");
    for (const bc of boundedContexts) {
      lines.push(`### ${bc.label}`);
      if (bc.purpose) lines.push(bc.purpose);
      const inside = elements.filter((e) => e.boundedContextId === bc.id);
      if (inside.length) {
        lines.push("", "**Bausteine:**");
        for (const el of inside) {
          lines.push(`- ${ELEMENT_STYLES[el.type].label}: ${el.label}`);
        }
      }
      lines.push("");
    }
  }

  const groups: { title: string; types: StormElement["type"][] }[] = [
    { title: "Aggregates", types: ["aggregate"] },
    { title: "Entities", types: ["entity"] },
    { title: "Value Objects", types: ["valueObject"] },
    { title: "Domain Services", types: ["domainService"] },
    { title: "Repositories", types: ["repository"] },
    { title: "Factories", types: ["factory"] },
  ];

  for (const g of groups) {
    const items = elements.filter((e) => g.types.includes(e.type));
    if (items.length === 0) continue;
    lines.push(`## ${g.title}`, "");
    for (const el of items) {
      lines.push(`### ${el.label}`);
      if (el.type === "repository" && el.metadata?.aggregateRootRef) {
        lines.push(`- Aggregate Root: ${el.metadata.aggregateRootRef}`);
      }
      if (el.type === "factory" && el.metadata?.createsRef) {
        lines.push(`- Erzeugt: ${el.metadata.createsRef}`);
      }
      if (el.type === "valueObject" && el.metadata?.immutable !== false) {
        lines.push("- Unveränderlich: ja");
      }
      if (el.type === "domainService" && el.metadata?.stateless !== false) {
        lines.push("- Zustandslos: ja");
      }
      if (el.metadata?.identityFields?.length) {
        lines.push(`- Identität: ${el.metadata.identityFields.join(", ")}`);
      }
      lines.push(...mdMetaBlock(el), "");
    }
  }

  if (glossary.length > 0) {
    lines.push("## Ubiquitous Language (Auszug)", "");
    for (const g of glossary) {
      lines.push(`- **${g.term}**: ${g.definition}`);
    }
    lines.push("");
  }

  if (lines.length <= 5) {
    lines.push("_Keine DDD-Bausteine auf dem Board._", "");
  }

  downloadText(`${slugTitle(title)}-domain-model.md`, lines.join("\n"));
}

/** BDD / Example Mapping: Rules, Examples (Given/When/Then), Questions. */
export function exportExampleMappingMarkdown(): void {
  const { elements, title } = boardActiveSliceFromStore();
  const lines = [
    `# Example Mapping — ${title}`,
    "",
    `Erstellt: ${new Date().toLocaleString("de-DE")}`,
    "",
  ];

  const rules = elements.filter((e) => e.type === "rule");
  const examples = elements.filter((e) => e.type === "example");
  const questions = elements.filter((e) => e.type === "question");

  lines.push("## Rules", "");
  if (rules.length === 0) {
    lines.push("_Keine Rules._", "");
  } else {
    for (const r of rules) {
      lines.push(`### ${r.label}`);
      if (r.description) lines.push(r.description);
      const criteria = r.metadata?.ruleCriteria ?? [];
      if (criteria.length) {
        lines.push("", "**Kriterien:**");
        lines.push(...mdBulletList(criteria));
      }
      lines.push("");
    }
  }

  lines.push("## Examples", "");
  if (examples.length === 0) {
    lines.push("_Keine Examples._", "");
  } else {
    for (const ex of examples) {
      lines.push(`### ${ex.label}`);
      if (ex.description) lines.push(ex.description, "");
      lines.push("**Given**");
      lines.push(...mdBulletList(ex.metadata?.exampleGiven ?? []));
      lines.push("", "**When**");
      lines.push(...mdBulletList(ex.metadata?.exampleWhen ?? []));
      lines.push("", "**Then**");
      lines.push(...mdBulletList(ex.metadata?.exampleThen ?? []));
      lines.push("");
    }
  }

  lines.push("## Questions", "");
  if (questions.length === 0) {
    lines.push("_Keine Questions._", "");
  } else {
    for (const q of questions) {
      const status = q.metadata?.questionStatus ?? "open";
      lines.push(`- **${q.label}** (${status === "resolved" ? "geklärt" : "offen"})`);
      if (q.description) lines.push(`  - ${q.description}`);
    }
    lines.push("");
  }

  downloadText(`${slugTitle(title)}-example-mapping.md`, lines.join("\n"));
}

const STORY_PRIORITY_LABEL: Record<string, string> = {
  must: "Must",
  should: "Should",
  could: "Could",
  wont: "Won't",
};

/** User Story Mapping: Activities → Tasks → Stories, Releases. */
export function exportStoryMapMarkdown(): void {
  const { elements, title } = boardActiveSliceFromStore();
  const lines = [
    `# Story Map — ${title}`,
    "",
    `Erstellt: ${new Date().toLocaleString("de-DE")}`,
    "",
  ];

  const activities = [...elements.filter((e) => e.type === "activity")].sort(
    (a, b) => a.x - b.x || a.y - b.y,
  );
  const tasks = elements.filter((e) => e.type === "userTask");
  const stories = elements.filter((e) => e.type === "userStory");
  const releases = [...elements.filter((e) => e.type === "release")].sort(
    (a, b) => a.y - b.y || a.x - b.x,
  );

  lines.push("## Backbone (Activities)", "");
  if (activities.length === 0) {
    lines.push("_Keine Activities._", "");
  } else {
    for (const act of activities) {
      lines.push(`### ${act.label}`);
      if (act.description) lines.push(act.description);
      const nearbyTasks = tasks
        .filter((t) => t.x + (t.width ?? 140) > act.x && t.x < act.x + (act.width ?? 160) + 40)
        .sort((a, b) => a.y - b.y);
      if (nearbyTasks.length) {
        lines.push("", "**Tasks:**");
        for (const t of nearbyTasks) {
          lines.push(`- ${t.label}`);
          const underStories = stories
            .filter(
              (s) =>
                s.x + (s.width ?? 160) > t.x &&
                s.x < t.x + (t.width ?? 140) + 40 &&
                s.y >= t.y,
            )
            .sort((a, b) => a.y - b.y);
          for (const st of underStories) {
            const prio = STORY_PRIORITY_LABEL[st.metadata?.storyPriority ?? "must"] ?? "Must";
            const persona = st.metadata?.storyPersona ? ` · ${st.metadata.storyPersona}` : "";
            const est = st.metadata?.storyEstimate ? ` · ${st.metadata.storyEstimate}` : "";
            lines.push(`  - Story: ${st.label} (${prio}${persona}${est})`);
            const acc = st.metadata?.storyAcceptance ?? [];
            for (const a of acc) lines.push(`    - AC: ${a}`);
          }
        }
      }
      lines.push("");
    }
  }

  const orphanStories = stories.filter((st) => {
    // listed under some task above if spatially related; still list all in summary
    return true;
  });
  if (orphanStories.length > 0) {
    lines.push("## Alle User Stories", "");
    lines.push(
      "| Story | Persona | Priorität | Schätzung |",
      "| --- | --- | --- | --- |",
    );
    for (const st of orphanStories.sort((a, b) => a.y - b.y || a.x - b.x)) {
      lines.push(
        `| ${st.label} | ${st.metadata?.storyPersona ?? "—"} | ${STORY_PRIORITY_LABEL[st.metadata?.storyPriority ?? "must"] ?? "Must"} | ${st.metadata?.storyEstimate ?? "—"} |`,
      );
    }
    lines.push("");
  }

  lines.push("## Releases", "");
  if (releases.length === 0) {
    lines.push("_Keine Release-Linien._", "");
  } else {
    for (const r of releases) {
      lines.push(`### ${r.label}`);
      if (r.metadata?.releaseGoal) lines.push(`- Ziel: ${r.metadata.releaseGoal}`);
      if (r.description) lines.push(`- ${r.description}`);
      lines.push("");
    }
  }

  downloadText(`${slugTitle(title)}-story-map.md`, lines.join("\n"));
}

/** Event Modeling: Slices + Commands / Events / Views / UI / Policies. */
export function exportEventModelMarkdown(): void {
  const { elements, title, swimlanes } = boardActiveSliceFromStore();
  const lines = [
    `# Event Model — ${title}`,
    "",
    `Erstellt: ${new Date().toLocaleString("de-DE")}`,
    "",
  ];

  const slices = [...elements.filter((e) => e.type === "slice")].sort(
    (a, b) => a.x - b.x || a.y - b.y,
  );

  lines.push("## Vertical Slices", "");
  if (slices.length === 0) {
    lines.push("_Keine Slices._", "");
  } else {
    for (const sl of slices) {
      lines.push(`### ${sl.label}`);
      if (sl.metadata?.releaseGoal) lines.push(`- Ziel: ${sl.metadata.releaseGoal}`);
      if (sl.description) lines.push(`- ${sl.description}`);
      const systems = sl.metadata?.sliceSystems ?? [];
      if (systems.length) {
        lines.push("- Systeme / Lanes:");
        lines.push(...mdBulletList(systems));
      }
      // Elements roughly under/near the slice on the timeline (same x-band).
      const bandLeft = sl.x - 40;
      const bandRight = sl.x + (sl.width ?? 220) + 40;
      const inBand = elements.filter(
        (e) =>
          e.id !== sl.id &&
          ["domainEvent", "command", "readModel", "ui", "policy", "actor"].includes(e.type) &&
          e.x + (e.width ?? 100) > bandLeft &&
          e.x < bandRight,
      );
      if (inBand.length) {
        lines.push("", "**Bausteine in der Slice-Spalte:**");
        for (const el of inBand.sort((a, b) => a.y - b.y)) {
          lines.push(`- ${ELEMENT_STYLES[el.type].label}: ${el.label}`);
        }
      }
      lines.push("");
    }
  }

  const catalog: { title: string; type: StormElement["type"] }[] = [
    { title: "Domain Events", type: "domainEvent" },
    { title: "Commands", type: "command" },
    { title: "Read Models / Views", type: "readModel" },
    { title: "UI", type: "ui" },
    { title: "Policies / Automation", type: "policy" },
    { title: "Actors", type: "actor" },
    { title: "External Systems", type: "externalSystem" },
  ];

  for (const c of catalog) {
    const items = elements.filter((e) => e.type === c.type);
    if (items.length === 0) continue;
    lines.push(`## ${c.title}`, "");
    for (const el of items.sort((a, b) => a.x - b.x || a.y - b.y)) {
      lines.push(`- **${el.label}**${el.description ? ` — ${el.description}` : ""}`);
    }
    lines.push("");
  }

  if (swimlanes.length > 0) {
    lines.push("## Swimlanes", "");
    for (const lane of swimlanes) {
      const inside = elements.filter((e) => e.swimlaneId === lane.id);
      lines.push(`### ${lane.label}`);
      if (inside.length === 0) lines.push("- _(leer)_");
      else for (const el of inside) lines.push(`- ${ELEMENT_STYLES[el.type].shortLabel}: ${el.label}`);
      lines.push("");
    }
  }

  downloadText(`${slugTitle(title)}-event-model.md`, lines.join("\n"));
}

/** Process flow (BPMN-lite): Start, Activities, Gateways, End. */
export function exportProcessMarkdown(): void {
  const { elements, title, swimlanes } = boardActiveSliceFromStore();
  const lines = [
    `# Prozessmodell — ${title}`,
    "",
    `Erstellt: ${new Date().toLocaleString("de-DE")}`,
    "",
  ];

  const starts = elements.filter((e) => e.type === "processStart");
  const activities = elements.filter((e) => e.type === "processActivity");
  const gateways = elements.filter((e) => e.type === "processGateway");
  const ends = elements.filter((e) => e.type === "processEnd");

  if (starts.length) {
    lines.push("## Start", "");
    for (const s of starts) {
      lines.push(`### ${s.label}`);
      if (s.metadata?.processTrigger) lines.push(`- Auslöser: ${s.metadata.processTrigger}`);
      lines.push(...mdMetaBlock(s), "");
    }
  }

  if (activities.length) {
    lines.push("## Aktivitäten", "");
    for (const a of [...activities].sort((x, y) => x.x - y.x || x.y - y.y)) {
      lines.push(`### ${a.label}`);
      if (a.metadata?.processRole) lines.push(`- Rolle: ${a.metadata.processRole}`);
      if (a.metadata?.processSystem) lines.push(`- System: ${a.metadata.processSystem}`);
      if (a.metadata?.processDuration) lines.push(`- Dauer: ${a.metadata.processDuration}`);
      if (a.metadata?.processInputs?.length) {
        lines.push("- Eingaben:");
        lines.push(...mdBulletList(a.metadata.processInputs));
      }
      if (a.metadata?.processOutputs?.length) {
        lines.push("- Ausgaben:");
        lines.push(...mdBulletList(a.metadata.processOutputs));
      }
      lines.push(...mdMetaBlock(a), "");
    }
  }

  if (gateways.length) {
    lines.push("## Gateways", "");
    for (const g of gateways) {
      lines.push(`### ${g.label} (${(g.metadata?.gatewayKind ?? "xor").toUpperCase()})`);
      if (g.metadata?.gatewayConditions?.length) {
        lines.push("- Pfade / Bedingungen:");
        lines.push(...mdBulletList(g.metadata.gatewayConditions));
      }
      lines.push(...mdMetaBlock(g), "");
    }
  }

  if (ends.length) {
    lines.push("## Ende", "");
    for (const e of ends) {
      lines.push(`### ${e.label}`);
      if (e.metadata?.processResult) lines.push(`- Ergebnis: ${e.metadata.processResult}`);
      lines.push(...mdMetaBlock(e), "");
    }
  }

  if (swimlanes.length) {
    lines.push("## Swimlanes", "");
    for (const lane of swimlanes) {
      const inside = elements.filter((el) => el.swimlaneId === lane.id);
      lines.push(`### ${lane.label}`);
      if (inside.length === 0) lines.push("- _(leer)_");
      else for (const el of inside) lines.push(`- ${ELEMENT_STYLES[el.type].shortLabel}: ${el.label}`);
      lines.push("");
    }
  }

  if (starts.length + activities.length + gateways.length + ends.length === 0) {
    lines.push("_Keine Prozess-Bausteine auf dem Board._", "");
  }

  downloadText(`${slugTitle(title)}-process.md`, lines.join("\n"));
}

/** Conceptual data model: entities, associations, attributes/keys. */
export function exportDataModelMarkdown(): void {
  const { elements, title, relations } = boardActiveSliceFromStore();
  const lines = [
    `# Datenmodell — ${title}`,
    "",
    `Erstellt: ${new Date().toLocaleString("de-DE")}`,
    "",
  ];

  const entities = elements.filter((e) => e.type === "dataEntity");
  const associations = elements.filter((e) => e.type === "dataAssociation");

  lines.push("## Entitäten", "");
  if (entities.length === 0) {
    lines.push("_Keine Entitäten._", "");
  } else {
    for (const ent of entities) {
      lines.push(`### ${ent.label}`);
      if (ent.metadata?.dataTableName) lines.push(`- Tabelle: \`${ent.metadata.dataTableName}\``);
      if (ent.metadata?.identityFields?.length) {
        lines.push("- Primärschlüssel / Identität:");
        lines.push(...mdBulletList(ent.metadata.identityFields));
      }
      if (ent.metadata?.attributes?.length) {
        lines.push("- Attribute:");
        lines.push(...mdBulletList(ent.metadata.attributes));
      }
      if (ent.metadata?.dataUniqueKeys?.length) {
        lines.push("- Unique Keys:");
        lines.push(...mdBulletList(ent.metadata.dataUniqueKeys));
      }
      lines.push(...mdMetaBlock(ent), "");
    }
  }

  if (associations.length) {
    lines.push("## Assoziationen", "");
    for (const a of associations) {
      const card = a.metadata?.dataCardinality ?? "1:n";
      const left = a.metadata?.dataLeftEntity ?? "?";
      const right = a.metadata?.dataRightEntity ?? "?";
      lines.push(`### ${a.label} (${card})`);
      lines.push(`- ${left} — ${right}`);
      if (a.metadata?.attributes?.length) {
        lines.push("- Beziehungsattribute:");
        lines.push(...mdBulletList(a.metadata.attributes));
      }
      lines.push(...mdMetaBlock(a), "");
    }
  }

  const entityIds = new Set(entities.map((e) => e.id));
  const assocIds = new Set(associations.map((e) => e.id));
  const dataRels = relations.filter(
    (r) =>
      (entityIds.has(r.sourceId) || assocIds.has(r.sourceId)) &&
      (entityIds.has(r.targetId) || assocIds.has(r.targetId)),
  );
  if (dataRels.length) {
    lines.push("## Relationen auf dem Board", "");
    for (const r of dataRels) {
      const src = elements.find((e) => e.id === r.sourceId);
      const tgt = elements.find((e) => e.id === r.targetId);
      lines.push(
        `- ${src?.label ?? r.sourceId} → ${tgt?.label ?? r.targetId}${r.label ? ` (${r.label})` : ""}`,
      );
    }
    lines.push("");
  }

  downloadText(`${slugTitle(title)}-data-model.md`, lines.join("\n"));
}

function elementRect(el: StormElement): { x: number; y: number; w: number; h: number } {
  return geomElementRect(el);
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Matches Tailwind `text-xs font-semibold` on stickies. */
const LABEL_FONT_PX = 12;
const LABEL_FONT_WEIGHT = 600;
/** Matches ~0.62rem meta lines on cards. */
const META_FONT_PX = 10;
const REGION_LABEL_FONT_PX = 12;
const PAD = 80;
const CARD_PAD_X = 8;
const CARD_PAD_Y = 4;

function boardFontFamily(): string {
  if (typeof document !== "undefined") {
    const family = getComputedStyle(document.body).fontFamily?.trim();
    if (family) return family;
  }
  return '"IBM Plex Sans", "Segoe UI", system-ui, sans-serif';
}

function cssFont(weight: number, sizePx: number): string {
  return `${weight} ${sizePx}px ${boardFontFamily()}`;
}

function cornerRadius(el: StormElement, h: number): number {
  const shape = ELEMENT_STYLES[el.type].shape;
  if (shape === "pill") return h / 2;
  if (shape === "rectangle") return 2;
  if (shape === "wide") return 6;
  return 8;
}

function elementFillStrokeInk(el: StormElement): { fill: string; stroke: string; ink: string } {
  if (el.type === "note") {
    const c = resolveNoteColor(el.metadata?.noteColor);
    return { fill: c.fill, stroke: c.stroke, ink: c.ink };
  }
  const s = ELEMENT_STYLES[el.type];
  return { fill: s.fill, stroke: s.stroke, ink: s.ink };
}

interface BoardBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  ox: number;
  oy: number;
}

function computeBoardBounds(state: ReturnType<typeof boardActiveSliceFromStore>): BoardBounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const expand = (x: number, y: number, w: number, h: number) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);
  };

  for (const el of state.elements) {
    const r = elementRect(el);
    expand(r.x, r.y, r.w, r.h);
  }
  for (const bc of state.boundedContexts) {
    expand(bc.x, bc.y, bc.width, bc.height);
  }
  for (const lane of state.swimlanes) {
    expand(lane.x ?? 0, lane.y, lane.width ?? 4000, lane.height);
  }
  if (state.timeline.visible !== false) {
    expand(minX === Infinity ? 0 : minX, state.timeline.y - 1, 1, 2);
  }

  if (!Number.isFinite(minX)) {
    minX = 0;
    minY = 0;
    maxX = 800;
    maxY = 600;
  }

  const width = maxX - minX + PAD * 2;
  const height = maxY - minY + PAD * 2;
  return {
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
    ox: -minX + PAD,
    oy: -minY + PAD,
  };
}

function wrapLabelLines(
  text: string,
  maxWidth: number,
  measure: (s: string) => number,
): string[] {
  const raw = text.trim() || " ";
  const paragraphs = raw.split(/\n/);
  const lines: string[] = [];
  for (const para of paragraphs) {
    const words = para.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let current = words[0]!;
    for (let i = 1; i < words.length; i++) {
      const next = `${current} ${words[i]}`;
      if (measure(next) <= maxWidth) {
        current = next;
      } else {
        lines.push(current);
        current = words[i]!;
      }
    }
    lines.push(current);
  }
  return lines.length > 0 ? lines : [raw];
}

function cardPreviewLines(el: StormElement): { description?: string; attrs: string[]; methods: string[] } {
  return {
    description:
      el.metadata?.showDescriptionOnCard && el.description?.trim()
        ? el.description.trim()
        : undefined,
    attrs: el.metadata?.showAttributesOnCard ? cardAttributeLines(el).slice(0, 8) : [],
    methods: el.metadata?.showMethodsOnCard ? cardMethodLines(el).slice(0, 8) : [],
  };
}

/** Stable mxGraph cell ids (0/1 are reserved by draw.io). */
function mxCellId(prefix: string, id: string): string {
  return `${prefix}_${id.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

function mxLabelValue(text: string): string {
  return escapeXml(text).replace(/\r\n|\n|\r/g, "&#xa;");
}

function parseCssColor(color: string): { hex: string; opacityPct?: number } {
  const rgba = color.match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/i,
  );
  if (rgba) {
    const hex =
      "#" +
      [rgba[1], rgba[2], rgba[3]]
        .map((n) => Number(n).toString(16).padStart(2, "0"))
        .join("");
    const opacityPct =
      rgba[4] != null ? Math.max(0, Math.min(100, Math.round(Number(rgba[4]) * 100))) : undefined;
    return { hex, opacityPct };
  }
  return { hex: color.startsWith("#") ? color : `#${color}` };
}

function mxStyle(parts: Record<string, string | number | boolean | undefined>): string {
  return Object.entries(parts)
    .filter(([, v]) => v !== undefined && v !== false)
    .map(([k, v]) => (v === true ? `${k}=1` : `${k}=${v}`))
    .join(";");
}

/**
 * Builds an uncompressed draw.io mxfile for the board.
 * Embedded in SVG `content` so diagrams.net / draw.io can reopen the file for editing.
 */
export function buildDrawioMxFile(state: BoardActiveSlice, bounds: BoardBounds): string {
  const { width, height, ox, oy } = bounds;
  const pageW = Math.max(1, Math.ceil(width));
  const pageH = Math.max(1, Math.ceil(height));
  const cells: string[] = [
    `<mxCell id="0"/>`,
    `<mxCell id="1" parent="0"/>`,
  ];

  for (const lane of state.swimlanes) {
    const x = (lane.x ?? 0) + ox;
    const y = lane.y + oy;
    const w = lane.width ?? 4000;
    const h = lane.height;
    const { hex, opacityPct } = parseCssColor(lane.color ?? "rgba(148,163,184,0.18)");
    const style = mxStyle({
      rounded: 0,
      whiteSpace: "wrap",
      html: 1,
      align: "left",
      verticalAlign: "top",
      spacingLeft: 12,
      spacingTop: 4,
      fillColor: hex,
      fillOpacity: opacityPct ?? 40,
      strokeColor: "#94a3b8",
      strokeWidth: 2,
      fontColor: "#475569",
      fontStyle: 1,
      fontSize: REGION_LABEL_FONT_PX,
    });
    cells.push(
      `<mxCell id="${mxCellId("lane", lane.id)}" value="${mxLabelValue(lane.label)}" style="${style}" vertex="1" parent="1">`,
      `<mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/>`,
      `</mxCell>`,
    );
  }

  for (const bc of state.boundedContexts) {
    const { hex } = parseCssColor(bc.color ?? "#dbeafe");
    const style = mxStyle({
      rounded: 1,
      arcSize: 8,
      whiteSpace: "wrap",
      html: 1,
      align: "left",
      verticalAlign: "top",
      spacingLeft: 8,
      spacingTop: 4,
      fillColor: hex,
      fillOpacity: 40,
      strokeColor: "#3b82f6",
      strokeWidth: 2,
      fontColor: "#1e40af",
      fontStyle: 1,
      fontSize: REGION_LABEL_FONT_PX,
    });
    cells.push(
      `<mxCell id="${mxCellId("bc", bc.id)}" value="${mxLabelValue(bc.label)}" style="${style}" vertex="1" parent="1">`,
      `<mxGeometry x="${bc.x + ox}" y="${bc.y + oy}" width="${bc.width}" height="${bc.height}" as="geometry"/>`,
      `</mxCell>`,
    );
  }

  if (state.timeline.visible !== false) {
    const ty = state.timeline.y + oy;
    const x1 = PAD / 2;
    const x2 = width - PAD / 2;
    const style = mxStyle({
      endArrow: "none",
      html: 1,
      dashed: 1,
      dashPattern: "8 4",
      strokeColor: "#94a3b8",
      strokeWidth: 2,
    });
    cells.push(
      `<mxCell id="timeline" style="${style}" edge="1" parent="1">`,
      `<mxGeometry relative="1" as="geometry">`,
      `<mxPoint x="${x1}" y="${ty}" as="sourcePoint"/>`,
      `<mxPoint x="${x2}" y="${ty}" as="targetPoint"/>`,
      `</mxGeometry>`,
      `</mxCell>`,
    );
  }

  for (const el of state.elements) {
    const r = elementRect(el);
    const { fill, stroke, ink } = elementFillStrokeInk(el);
    const shape = ELEMENT_STYLES[el.type].shape;
    const style = mxStyle({
      rounded: shape === "rectangle" ? 0 : 1,
      arcSize: shape === "pill" ? 50 : shape === "wide" ? 6 : 8,
      whiteSpace: "wrap",
      html: 1,
      align: "center",
      verticalAlign: "middle",
      fillColor: fill,
      strokeColor: stroke,
      strokeWidth: 1.5,
      fontColor: ink,
      fontStyle: 1,
      fontSize: LABEL_FONT_PX,
      dashed: el.type === "note" ? 1 : undefined,
      dashPattern: el.type === "note" ? "4 3" : undefined,
      rotation: el.rotation || undefined,
    });
    cells.push(
      `<mxCell id="${mxCellId("el", el.id)}" value="${mxLabelValue(el.label)}" style="${style}" vertex="1" parent="1">`,
      `<mxGeometry x="${r.x + ox}" y="${r.y + oy}" width="${r.w}" height="${r.h}" as="geometry"/>`,
      `</mxCell>`,
    );
  }

  for (const rel of state.relations) {
    const src = state.elements.find((e) => e.id === rel.sourceId);
    const tgt = state.elements.find((e) => e.id === rel.targetId);
    if (!src || !tgt) continue;
    const dashed = rel.type === "annotates" || rel.type === "informs";
    const style = mxStyle({
      endArrow: "block",
      html: 1,
      rounded: 0,
      strokeColor: "#64748b",
      strokeWidth: 2,
      dashed: dashed ? 1 : undefined,
      dashPattern: dashed ? "6 4" : undefined,
    });
    const label = RELATION_TYPE_LABELS[rel.type] ?? rel.type;
    cells.push(
      `<mxCell id="${mxCellId("rel", rel.id)}" value="${mxLabelValue(label)}" style="${style}" edge="1" parent="1" source="${mxCellId("el", rel.sourceId)}" target="${mxCellId("el", rel.targetId)}">`,
      `<mxGeometry relative="1" as="geometry"/>`,
      `</mxCell>`,
    );
  }

  const modified = new Date().toISOString();
  const diagramName = escapeXml(state.title || "Board");
  return [
    `<mxfile host="app.diagrams.net" modified="${modified}" agent="E2" version="22.0.0" type="device">`,
    `<diagram id="board" name="${diagramName}">`,
    `<mxGraphModel dx="${pageW}" dy="${pageH}" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${pageW}" pageHeight="${pageH}" math="0" shadow="0" background="#f4f5f7">`,
    `<root>`,
    ...cells,
    `</root>`,
    `</mxGraphModel>`,
    `</diagram>`,
    `</mxfile>`,
  ].join("");
}

export function exportBoardSvg(): void {
  const state = boardActiveSliceFromStore();
  const bounds = computeBoardBounds(state);
  const { width, height, ox, oy } = bounds;
  const fontFamily = boardFontFamily();
  const mxfile = buildDrawioMxFile(state, bounds);

  // Measure with an offscreen canvas so wrapping matches PNG / UI metrics.
  const measureCanvas = document.createElement("canvas");
  const measureCtx = measureCanvas.getContext("2d");
  const measureAt = (sizePx: number, weight: number, s: string) => {
    if (!measureCtx) return s.length * sizePx * 0.55;
    measureCtx.font = cssFont(weight, sizePx);
    return measureCtx.measureText(s).width;
  };

  const parts: string[] = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="${width}px" height="${height}px" viewBox="0 0 ${width} ${height}" content="${escapeXml(mxfile)}">`,
    `<rect width="100%" height="100%" fill="#f4f5f7"/>`,
    `<defs>`,
    `<marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto"><path d="M0,0 L10,3 L0,6 Z" fill="#64748b"/></marker>`,
    `<style><![CDATA[
      .label { font-family: ${fontFamily}; font-size: ${LABEL_FONT_PX}px; font-weight: ${LABEL_FONT_WEIGHT}; }
      .meta { font-family: ${fontFamily}; font-size: ${META_FONT_PX}px; font-weight: 500; }
      .region { font-family: ${fontFamily}; font-size: ${REGION_LABEL_FONT_PX}px; font-weight: ${LABEL_FONT_WEIGHT}; }
    ]]></style>`,
    `</defs>`,
  ];

  for (const lane of state.swimlanes) {
    const x = (lane.x ?? 0) + ox;
    const y = lane.y + oy;
    const w = lane.width ?? 4000;
    const h = lane.height;
    const fill = lane.color ?? "rgba(148,163,184,0.18)";
    parts.push(
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${escapeXml(fill)}" stroke="#94a3b8" stroke-width="2"/>`,
      `<text class="region" x="${x + 12}" y="${y + 18}" fill="#475569">${escapeXml(lane.label)}</text>`,
    );
  }

  for (const bc of state.boundedContexts) {
    const fill = bc.color ?? "#dbeafe";
    parts.push(
      `<rect x="${bc.x + ox}" y="${bc.y + oy}" width="${bc.width}" height="${bc.height}" fill="${escapeXml(fill)}" fill-opacity="0.4" stroke="#3b82f6" stroke-width="2" rx="8"/>`,
      `<text class="region" x="${bc.x + ox + 8}" y="${bc.y + oy + 18}" fill="#1e40af">${escapeXml(bc.label)}</text>`,
    );
  }

  if (state.timeline.visible !== false) {
    const ty = state.timeline.y + oy;
    parts.push(
      `<line x1="${PAD / 2}" y1="${ty}" x2="${width - PAD / 2}" y2="${ty}" stroke="#94a3b8" stroke-width="2" stroke-dasharray="8 4"/>`,
    );
  }

  for (const rel of state.relations) {
    const src = state.elements.find((e) => e.id === rel.sourceId);
    const tgt = state.elements.find((e) => e.id === rel.targetId);
    if (!src || !tgt) continue;
    const { start, end } = relationAnchors(src, tgt);
    const dashed = rel.type === "annotates" || rel.type === "informs" ? ` stroke-dasharray="6 4"` : "";
    parts.push(
      `<line x1="${start.x + ox}" y1="${start.y + oy}" x2="${end.x + ox}" y2="${end.y + oy}" stroke="#64748b" stroke-width="2" marker-end="url(#arrow)"${dashed}/>`,
    );
  }

  for (const el of state.elements) {
    const r = elementRect(el);
    const { fill, stroke, ink } = elementFillStrokeInk(el);
    const x = r.x + ox;
    const y = r.y + oy;
    const rx = cornerRadius(el, r.h);
    const rot = el.rotation
      ? ` transform="rotate(${el.rotation} ${x + r.w / 2} ${y + r.h / 2})"`
      : "";
    const dash = el.type === "note" ? ` stroke-dasharray="4 3"` : "";
    parts.push(
      `<rect x="${x}" y="${y}" width="${r.w}" height="${r.h}" fill="${escapeXml(fill)}" stroke="${escapeXml(stroke)}" stroke-width="1.5" rx="${rx}"${dash}${rot}/>`,
    );

    const textW = Math.max(20, r.w - CARD_PAD_X * 2);
    const labelLines = wrapLabelLines(el.label, textW, (s) =>
      measureAt(LABEL_FONT_PX, LABEL_FONT_WEIGHT, s),
    );
    const preview = cardPreviewLines(el);
    const descLines = preview.description
      ? wrapLabelLines(preview.description, textW, (s) => measureAt(META_FONT_PX, 500, s)).slice(0, 3)
      : [];
    const lineH = LABEL_FONT_PX * 1.25;
    const metaH = META_FONT_PX * 1.25;
    const blockH =
      labelLines.length * lineH +
      descLines.length * metaH +
      preview.attrs.length * metaH +
      preview.methods.length * metaH;
    let cursorY = y + CARD_PAD_Y + LABEL_FONT_PX;
    if (blockH < r.h - CARD_PAD_Y * 2) {
      cursorY = y + (r.h - blockH) / 2 + LABEL_FONT_PX;
    }

    const pushTextBlock = (
      lines: string[],
      className: string,
      fillColor: string,
      step: number,
      weightHint: "label" | "meta",
    ) => {
      if (lines.length === 0) return;
      const anchor = weightHint === "label" && !preview.description && preview.attrs.length === 0 && preview.methods.length === 0
        ? "middle"
        : "start";
      const tx = anchor === "middle" ? x + r.w / 2 : x + CARD_PAD_X;
      parts.push(`<text class="${className}" fill="${escapeXml(fillColor)}" text-anchor="${anchor}"${rot}>`);
      for (const line of lines) {
        parts.push(
          `<tspan x="${tx}" y="${cursorY}">${escapeXml(line)}</tspan>`,
        );
        cursorY += step;
      }
      parts.push(`</text>`);
    };

    pushTextBlock(labelLines, "label", ink, lineH, "label");
    if (descLines.length) {
      cursorY += 2;
      pushTextBlock(descLines, "meta", ink, metaH, "meta");
    }
    if (preview.attrs.length) {
      cursorY += 2;
      pushTextBlock(preview.attrs, "meta", ink, metaH, "meta");
    }
    if (preview.methods.length) {
      cursorY += 2;
      pushTextBlock(preview.methods, "meta", ink, metaH, "meta");
    }
  }

  parts.push("</svg>");
  // `.drawio.svg` is recognized by diagrams.net / draw.io Desktop as an editable diagram.
  downloadText(
    `${state.title.replace(/\s+/g, "-").toLowerCase()}.drawio.svg`,
    parts.join("\n"),
    "image/svg+xml",
  );
}

export async function exportBoardPng(): Promise<void> {
  const state = boardActiveSliceFromStore();
  const { width, height, ox, oy } = computeBoardBounds(state);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Crisp export on retina displays.
  const scale = Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
  canvas.width = Math.ceil(width * scale);
  canvas.height = Math.ceil(height * scale);
  ctx.scale(scale, scale);

  ctx.fillStyle = "#f4f5f7";
  ctx.fillRect(0, 0, width, height);

  for (const lane of state.swimlanes) {
    const x = (lane.x ?? 0) + ox;
    const y = lane.y + oy;
    const w = lane.width ?? 4000;
    const h = lane.height;
    ctx.fillStyle = lane.color ?? "rgba(148,163,184,0.18)";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = "#475569";
    ctx.font = cssFont(LABEL_FONT_WEIGHT, REGION_LABEL_FONT_PX);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(lane.label, x + 12, y + 18);
  }

  for (const bc of state.boundedContexts) {
    const x = bc.x + ox;
    const y = bc.y + oy;
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = bc.color ?? "#dbeafe";
    roundRect(ctx, x, y, bc.width, bc.height, 8);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, bc.width, bc.height, 8);
    ctx.stroke();
    ctx.fillStyle = "#1e40af";
    ctx.font = cssFont(LABEL_FONT_WEIGHT, REGION_LABEL_FONT_PX);
    ctx.textAlign = "left";
    ctx.fillText(bc.label, x + 8, y + 18);
  }

  if (state.timeline.visible !== false) {
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    const ty = state.timeline.y + oy;
    ctx.moveTo(PAD / 2, ty);
    ctx.lineTo(width - PAD / 2, ty);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  for (const rel of state.relations) {
    const src = state.elements.find((e) => e.id === rel.sourceId);
    const tgt = state.elements.find((e) => e.id === rel.targetId);
    if (!src || !tgt) continue;
    const { start, end } = relationAnchors(src, tgt);
    ctx.strokeStyle = "#64748b";
    ctx.lineWidth = 2;
    if (rel.type === "annotates" || rel.type === "informs") ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(start.x + ox, start.y + oy);
    ctx.lineTo(end.x + ox, end.y + oy);
    ctx.stroke();
    ctx.setLineDash([]);
    drawArrowHead(ctx, start.x + ox, start.y + oy, end.x + ox, end.y + oy);
  }

  for (const el of state.elements) {
    const r = elementRect(el);
    const x = r.x + ox;
    const y = r.y + oy;
    const { fill, stroke, ink } = elementFillStrokeInk(el);
    const rx = cornerRadius(el, r.h);

    ctx.save();
    if (el.rotation) {
      ctx.translate(x + r.w / 2, y + r.h / 2);
      ctx.rotate((el.rotation * Math.PI) / 180);
      ctx.translate(-(x + r.w / 2), -(y + r.h / 2));
    }

    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    if (el.type === "note") ctx.setLineDash([4, 3]);
    roundRect(ctx, x, y, r.w, r.h, rx);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);

    const textW = Math.max(20, r.w - CARD_PAD_X * 2);
    ctx.font = cssFont(LABEL_FONT_WEIGHT, LABEL_FONT_PX);
    const labelLines = wrapLabelLines(el.label, textW, (s) => ctx.measureText(s).width);
    const preview = cardPreviewLines(el);
    ctx.font = cssFont(500, META_FONT_PX);
    const descLines = preview.description
      ? wrapLabelLines(preview.description, textW, (s) => ctx.measureText(s).width).slice(0, 3)
      : [];
    const lineH = LABEL_FONT_PX * 1.25;
    const metaH = META_FONT_PX * 1.25;
    const blockH =
      labelLines.length * lineH +
      descLines.length * metaH +
      preview.attrs.length * metaH +
      preview.methods.length * metaH;

    const centered =
      !preview.description && preview.attrs.length === 0 && preview.methods.length === 0;
    let cursorY = y + CARD_PAD_Y + LABEL_FONT_PX;
    if (blockH < r.h - CARD_PAD_Y * 2) {
      cursorY = y + (r.h - blockH) / 2 + LABEL_FONT_PX;
    }

    ctx.fillStyle = ink;
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = centered ? "center" : "left";
    const tx = centered ? x + r.w / 2 : x + CARD_PAD_X;

    ctx.font = cssFont(LABEL_FONT_WEIGHT, LABEL_FONT_PX);
    for (const line of labelLines) {
      ctx.fillText(line, tx, cursorY, textW);
      cursorY += lineH;
    }
    ctx.font = cssFont(500, META_FONT_PX);
    ctx.textAlign = "left";
    const metaX = x + CARD_PAD_X;
    for (const line of descLines) {
      cursorY += 1;
      ctx.globalAlpha = 0.85;
      ctx.fillText(line, metaX, cursorY, textW);
      ctx.globalAlpha = 1;
      cursorY += metaH;
    }
    for (const line of preview.attrs) {
      cursorY += 1;
      ctx.globalAlpha = 0.85;
      ctx.fillText(line, metaX, cursorY, textW);
      ctx.globalAlpha = 1;
      cursorY += metaH;
    }
    for (const line of preview.methods) {
      cursorY += 1;
      ctx.globalAlpha = 0.85;
      ctx.fillText(line, metaX, cursorY, textW);
      ctx.globalAlpha = 1;
      cursorY += metaH;
    }

    ctx.restore();
  }

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${state.title.replace(/\s+/g, "-").toLowerCase()}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): void {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const size = 8;
  ctx.fillStyle = "#64748b";
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - size * Math.cos(angle - 0.4), y2 - size * Math.sin(angle - 0.4));
  ctx.lineTo(x2 - size * Math.cos(angle + 0.4), y2 - size * Math.sin(angle + 0.4));
  ctx.closePath();
  ctx.fill();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
