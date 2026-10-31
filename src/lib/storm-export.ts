import {
  BC_LABEL_FILL,
  CARD_PAD_X,
  CARD_PAD_Y,
  EXPORT_FONT_FAMILY,
  exportCanvasBackground,
  strokeSwimlaneExportBorder,
  svgSwimlaneExportBorder,
  EXPORT_FONT_STACK,
  LABEL_FONT_PX,
  LABEL_FONT_WEIGHT,
  META_FONT_PX,
  PAD,
  REGION_LABEL_FONT_PX,
  SWIMLANE_LABEL_FILL,
  TIMELINE_STROKE,
  cssExportFont,
  EXPORT_HIGHLIGHT_DIMMED_ELEMENT_FILTER,
  EXPORT_HIGHLIGHT_DIMMED_ELEMENT_OPACITY,
  elementFillWithOpacity,
  isBoundaryElement,
  elementIsDashed,
  elementLabelAlign,
  elementLabelIsCentered,
  elementStrokeWidth,
  elementTypeBadgeLabel,
  elementVerticalAlign,
} from "@/lib/board-export-visual";
import {
  drawExportConnectorsOnCanvas,
  drawioExportConnectorCells,
  svgExportConnectors,
  type BoardExportSlice,
} from "@/lib/board-export-connectors";
import { elementDimmedBySelectionFilter } from "@/lib/canvas-selection-filter";
import {
  elementCanvasBounds,
  noteUsesCompactLayout,
} from "@/lib/note-compact";
import {
  cardAttributeLines,
  cardMethodLines,
  cardShowsDescription,
} from "@/lib/card-preview";
import { markdownToPlainText } from "@/lib/description-markdown";
import { cardWebLinkLines } from "@/lib/card-web-links";
import { effectiveElementRotation } from "@/lib/element-rotation";
import {
  regionZOrderItems,
  sortByZOrder,
  sortElementsByZOrder,
} from "@/lib/element-z-order";
import {
  elementPillCornerRadiusPx,
  isCircularPillShape,
  resolveElementStyle,
  styleForElementType,
} from "@/lib/element-styles";
import { resolveNoteColor } from "@/lib/note-colors";
import { exportBoardAsPrompt } from "@/lib/prompt-export";
import { downloadCanvasAsPdf } from "@/lib/canvas-pdf-export";
import { resolveRegionPaint } from "@/lib/region-style";
import { writeClipboardText, writeClipboardXml } from "@/lib/system-clipboard";
import { slugForExportFilename } from "@/lib/view-export";
import {
  generateActionsMarkdownReport,
  type ActionsMarkdownLabels,
} from "@/lib/architecture-measures";
import { isActionsView, type BoardActiveSlice } from "@/lib/storm-json";
import { LOCALE_BCP47, type Locale } from "@/i18n/config";
import {
  actionItemAreaLabel,
  actionItemStatusLabel,
} from "@/i18n/domain-labels";
import { translate } from "@/i18n/translate";
import { resolveInitialLocale } from "@/i18n/resolve-locale";
import {
  boardActiveSliceFromStore,
  boardExportSliceFromStore,
  boardImportPayloadFromStore,
  useStormBoardStore,
} from "@/store/storm-board-store";
import type { BoundedContext, StormElement, Swimlane } from "@/types/storm-element";
import type { CustomCardType } from "@/lib/custom-card-types";
import {
  ACTION_TYPES,
  ARCHITECTURE_QUALITIES,
  EFFORT_ESTIMATES,
  MEASURE_STATUSES,
  OBLIGATION_LEVELS,
  type ActionStatus,
  type ActionType,
  type ArchitectureQuality,
  type EffortEstimate,
  type ObligationLevel,
} from "@/types/actions-view";
import { RELATION_TYPE_LABELS, CONTEXT_MAP_PATTERN_LABELS } from "@/types/storm-relation";

type ExportMdKey = `exportsMd.${keyof typeof import("@/i18n/messages/catalog/en/exportsMd").exportsMdEn.exportsMd}`;

function exportMarkdownI18n(locale: Locale = resolveInitialLocale()) {
  const t = (key: ExportMdKey, params?: Record<string, string | number>) =>
    translate(locale, key, params);
  const createdLine = () =>
    t("exportsMd.created", {
      when: new Date().toLocaleString(LOCALE_BCP47[locale]),
    });
  const emDash = () => t("exportsMd.emDash");
  return { locale, t, createdLine, emDash };
}

function elementExportRotation(el: StormElement): number {
  return effectiveElementRotation(el.rotation, styleForElementType(el.type).rotation);
}

function sortedRegions(state: Pick<BoardActiveSlice, "swimlanes" | "boundedContexts">): Array<
  | { kind: "swimlane"; region: Swimlane }
  | { kind: "boundedContext"; region: BoundedContext }
> {
  const laneById = new Map(state.swimlanes.map((l) => [l.id, l]));
  const bcById = new Map(state.boundedContexts.map((b) => [b.id, b]));
  const result: Array<
    | { kind: "swimlane"; region: Swimlane }
    | { kind: "boundedContext"; region: BoundedContext }
  > = [];
  for (const item of sortByZOrder(regionZOrderItems(state.swimlanes, state.boundedContexts))) {
    const lane = laneById.get(item.id);
    if (lane) {
      result.push({ kind: "swimlane", region: lane });
      continue;
    }
    const bc = bcById.get(item.id);
    if (bc) result.push({ kind: "boundedContext", region: bc });
  }
  return result;
}

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
  const { t, createdLine } = exportMarkdownI18n();
  const hotspots = elements.filter((e) => e.type === "hotspot");
  const lines = [`# Hotspot Report — ${title}`, "", createdLine(), ""];

  if (hotspots.length === 0) {
    lines.push(t("exportsMd.noHotspots"));
  } else {
    for (const h of hotspots) {
      const status = h.metadata?.hotspotStatus ?? "open";
      const priority = h.metadata?.hotspotPriority ?? "medium";
      lines.push(
        `## ${h.label}`,
        t("exportsMd.statusLine", { status }),
        t("exportsMd.priorityLine", { priority }),
      );
      if (h.description) lines.push(t("exportsMd.descriptionLine", { text: h.description }));
      lines.push("");
    }
  }

  downloadText(`${title.replace(/\s+/g, "-").toLowerCase()}-hotspots.md`, lines.join("\n"));
}

/** Action-item register: status, notes, problem areas. */
function actionsMarkdownLabels(): ActionsMarkdownLabels {
  const locale = resolveInitialLocale();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const actionType = Object.fromEntries(
    ACTION_TYPES.map((k) => [k, t(`actionsView.actionType.${k}` as const)]),
  ) as Record<ActionType, string>;
  const obligation = Object.fromEntries(
    OBLIGATION_LEVELS.map((k) => [k, t(`actionsView.obligation.${k}` as const)]),
  ) as Record<ObligationLevel, string>;
  const quality = Object.fromEntries(
    ARCHITECTURE_QUALITIES.map((k) => [k, t(`actionsView.quality.${k}` as const)]),
  ) as Record<ArchitectureQuality, string>;
  const status = Object.fromEntries(
    MEASURE_STATUSES.map((k) => [k, t(`actionsView.status.${k}` as const)]),
  ) as Record<ActionStatus, string>;
  const effort = Object.fromEntries(
    EFFORT_ESTIMATES.map((k) => [k, t(`actionsView.effort.${k}` as const)]),
  ) as Record<EffortEstimate, string>;
  return {
    title: t("actionsView.reportTitle"),
    created: t("actionsView.reportCreated"),
    overview: t("actionsView.reportOverview"),
    total: t("actionsView.reportTotal"),
    byObligation: t("actionsView.reportByObligation"),
    byActionType: t("actionsView.reportByActionType"),
    tableHeaders: {
      type: t("actionsView.tableType"),
      measure: t("actionsView.tableMeasure"),
      obligation: t("actionsView.tableObligation"),
      qualities: t("actionsView.tableQualities"),
      effort: t("actionsView.tableEffort"),
      owner: t("actionsView.tableOwner"),
      reference: t("actionsView.tableReference"),
    },
    details: t("actionsView.reportDetails"),
    none: t("actionsView.reportNone"),
    actionType,
    obligation,
    quality,
    status,
    effort,
  };
}

/** Architecture measures view — review protocol (active or first actions tab). */
export function exportArchitectureMeasuresMarkdown(): void {
  const payload = boardImportPayloadFromStore();
  const view =
    payload.views.find(
      (v): v is import("@/types/actions-view").ActionsView =>
        v.id === payload.activeViewId && isActionsView(v),
    ) ??
    payload.views.find((v): v is import("@/types/actions-view").ActionsView => isActionsView(v)) ??
    null;
  const title = payload.title;
  const { t } = exportMarkdownI18n();
  if (!view) {
    downloadText(`${slugTitle(title)}-architektur-massnahmen.md`, `${t("exportsMd.noActionsView")}\n`);
    return;
  }
  const md = generateActionsMarkdownReport(view, title, actionsMarkdownLabels());
  downloadText(`${slugTitle(title)}-architektur-massnahmen.md`, md);
}

export function exportActionItemsMarkdown(): void {
  const { actionItems, title } = boardActiveSliceFromStore();
  const { locale, t, createdLine } = exportMarkdownI18n();
  const panelT = (key: "panels.actionItemsTitle") => translate(locale, key);
  const statusLabel = (status: (typeof actionItems)[number]["status"]) =>
    actionItemStatusLabel((k) => translate(locale, k), status);
  const areaLabel = (area: (typeof actionItems)[number]["area"]) =>
    actionItemAreaLabel((k) => translate(locale, k), area);
  const lines = [`# ${panelT("panels.actionItemsTitle")} — ${title}`, "", createdLine(), ""];

  if (actionItems.length === 0) {
    lines.push(t("exportsMd.noEntries"));
    downloadText(`${slugTitle(title)}-action-items.md`, lines.join("\n"));
    return;
  }

  const byArea = new Map<string, typeof actionItems>();
  for (const item of actionItems) {
    const list = byArea.get(item.area) ?? [];
    list.push(item);
    byArea.set(item.area, list);
  }

  for (const [area, items] of byArea) {
    lines.push(`## ${areaLabel(area as (typeof actionItems)[number]["area"])}`, "");
    for (const item of items) {
      lines.push(`- **${item.title}** — ${statusLabel(item.status)}`);
      if (item.notes?.trim()) lines.push(`  - ${item.notes.trim()}`);
    }
    lines.push("");
  }

  downloadText(`${slugTitle(title)}-action-items.md`, lines.join("\n"));
}

export function exportGlossaryMarkdown(): void {
  const { glossary, title } = boardActiveSliceFromStore();
  const { t } = exportMarkdownI18n();
  const empty = t("exportsMd.glossaryEmpty");
  const termHeader = t("exportsMd.glossaryTerm");
  const defHeader = t("exportsMd.glossaryDefinition");
  const lines = [
    `# Ubiquitous Language — ${title}`,
    "",
    `| ${termHeader} | ${defHeader} |`,
    "| --- | --- |",
  ];
  for (const g of glossary) {
    lines.push(`| ${g.term} | ${g.definition.replace(/\|/g, "\\|")} |`);
  }
  if (glossary.length === 0) lines.push(`| ${empty} | ${empty} |`);
  downloadText(`${title.replace(/\s+/g, "-").toLowerCase()}-glossary.md`, lines.join("\n"));
}

export function exportContextMapMarkdown(): void {
  const { boundedContexts, elements, relations, contextRelations, title } =
    boardActiveSliceFromStore();
  const { t } = exportMarkdownI18n();
  const lines = [`# Context Map — ${title}`, ""];

  for (const bc of boundedContexts) {
    const inside = elements.filter((e) => e.boundedContextId === bc.id);
    lines.push(`## ${bc.label}`);
    if (bc.purpose) lines.push(bc.purpose);
    lines.push("", t("exportsMd.contextMapElements"));
    for (const el of inside) lines.push(`- ${styleForElementType(el.type).shortLabel}: ${el.label}`);
    lines.push("");
  }

  if (contextRelations.length > 0) {
    lines.push(t("exportsMd.contextMapPatternsHeading"), "");
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
    lines.push(t("exportsMd.integrationPointsHeading"), "");
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
  const { t, emDash } = exportMarkdownI18n();
  const events = elements.filter((e) => e.type === "domainEvent");
  const descHeader = t("exportsMd.eventCatalogHeaderDescription");
  const dash = emDash();
  const lines = [
    `# Event Catalog — ${title}`,
    "",
    `| Event | Schema | ${descHeader} |`,
    "| --- | --- | --- |",
  ];

  for (const e of events) {
    const schema = e.metadata?.eventSchema
      ? `\`${JSON.stringify(e.metadata.eventSchema)}\``
      : `_${dash}_`;
    lines.push(`| ${e.label} | ${schema} | ${e.description ?? dash} |`);
  }

  if (events.length === 0) lines.push(`| ${t("exportsMd.noEventsRow")} | ${dash} | ${dash} |`);
  downloadText(`${title.replace(/\s+/g, "-").toLowerCase()}-events.md`, lines.join("\n"));
}

function slugTitle(title: string): string {
  return title.replace(/\s+/g, "-").toLowerCase();
}

function mdBulletList(items: string[], empty: string): string[] {
  if (items.length === 0) return [`- ${empty}`];
  return items.map((i) => `- ${i}`);
}

function mdMetaBlock(el: StormElement, t: ReturnType<typeof exportMarkdownI18n>["t"]): string[] {
  const lines: string[] = [];
  if (el.description?.trim()) {
    lines.push(t("exportsMd.metaDescriptionLine", { text: el.description.trim() }));
  }
  const attrs = cardAttributeLines(el);
  if (attrs.length) {
    lines.push(t("exportsMd.metaAttributesHeading"));
    for (const a of attrs) lines.push(`  - ${a}`);
  }
  const methods = cardMethodLines(el);
  if (methods.length) {
    lines.push(t("exportsMd.metaMethodsHeading"));
    for (const m of methods) lines.push(`  - ${m}`);
  }
  const links = cardWebLinkLines(el);
  if (links.length) {
    lines.push(t("exportsMd.metaWebLinksHeading"));
    for (const l of links) lines.push(`  - ${l}`);
  }
  return lines;
}

/** DDD: Subdomains, Aggregates, Entities, VOs, Services, Repositories, Factories. */
export function exportDomainModelMarkdown(): void {
  const { elements, title, boundedContexts, glossary } = boardActiveSliceFromStore();
  const { t, createdLine } = exportMarkdownI18n();
  const lines = [`# Domain Model — ${title}`, "", createdLine(), ""];

  const subdomains = elements.filter((e) => e.type === "subdomain");
  if (subdomains.length > 0) {
    lines.push("## Subdomains", "");
    for (const s of subdomains) {
      const kind = s.metadata?.subdomainKind ?? "core";
      lines.push(`### ${s.label} (${kind})`);
      lines.push(...mdMetaBlock(s, t), "");
    }
  }

  if (boundedContexts.length > 0) {
    lines.push("## Bounded Contexts", "");
    for (const bc of boundedContexts) {
      lines.push(`### ${bc.label}`);
      if (bc.purpose) lines.push(bc.purpose);
      const inside = elements.filter((e) => e.boundedContextId === bc.id);
      if (inside.length) {
        lines.push("", t("exportsMd.dddBlocks"));
        for (const el of inside) {
          lines.push(`- ${styleForElementType(el.type).label}: ${el.label}`);
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
        lines.push(t("exportsMd.aggregateRootLine", { ref: el.metadata.aggregateRootRef }));
      }
      if (el.type === "factory" && el.metadata?.createsRef) {
        lines.push(t("exportsMd.createsLine", { ref: el.metadata.createsRef }));
      }
      if (el.type === "valueObject" && el.metadata?.immutable !== false) {
        lines.push(t("exportsMd.immutableYes"));
      }
      if (el.type === "domainService" && el.metadata?.stateless !== false) {
        lines.push(t("exportsMd.statelessYes"));
      }
      if (el.metadata?.identityFields?.length) {
        lines.push(t("exportsMd.identityLine", { fields: el.metadata.identityFields.join(", ") }));
      }
      lines.push(...mdMetaBlock(el, t), "");
    }
  }

  if (glossary.length > 0) {
    lines.push(t("exportsMd.ubiquitousLanguageExcerpt"), "");
    for (const g of glossary) {
      lines.push(`- **${g.term}**: ${g.definition}`);
    }
    lines.push("");
  }

  if (lines.length <= 5) {
    lines.push(t("exportsMd.noDddOnBoard"), "");
  }

  downloadText(`${slugTitle(title)}-domain-model.md`, lines.join("\n"));
}

/** BDD / Example Mapping: Rules, Examples (Given/When/Then), Questions. */
export function exportExampleMappingMarkdown(): void {
  const { elements, title } = boardActiveSliceFromStore();
  const { t, createdLine, emDash } = exportMarkdownI18n();
  const dash = emDash();
  const lines = [`# Example Mapping — ${title}`, "", createdLine(), ""];

  const rules = elements.filter((e) => e.type === "rule");
  const examples = elements.filter((e) => e.type === "example");
  const questions = elements.filter((e) => e.type === "question");

  lines.push("## Rules", "");
  if (rules.length === 0) {
    lines.push(t("exportsMd.noRules"), "");
  } else {
    for (const r of rules) {
      lines.push(`### ${r.label}`);
      if (r.description) lines.push(r.description);
      const criteria = r.metadata?.ruleCriteria ?? [];
      if (criteria.length) {
        lines.push("", t("exportsMd.criteriaHeading"));
        lines.push(...mdBulletList(criteria, dash));
      }
      lines.push("");
    }
  }

  lines.push("## Examples", "");
  if (examples.length === 0) {
    lines.push(t("exportsMd.noExamples"), "");
  } else {
    for (const ex of examples) {
      lines.push(`### ${ex.label}`);
      if (ex.description) lines.push(ex.description, "");
      lines.push("**Given**");
      lines.push(...mdBulletList(ex.metadata?.exampleGiven ?? [], dash));
      lines.push("", "**When**");
      lines.push(...mdBulletList(ex.metadata?.exampleWhen ?? [], dash));
      lines.push("", "**Then**");
      lines.push(...mdBulletList(ex.metadata?.exampleThen ?? [], dash));
      lines.push("");
    }
  }

  lines.push("## Questions", "");
  if (questions.length === 0) {
    lines.push(t("exportsMd.noQuestions"), "");
  } else {
    for (const q of questions) {
      const status = q.metadata?.questionStatus ?? "open";
      const statusLabel =
        status === "resolved" ? t("exportsMd.questionResolved") : t("exportsMd.questionOpen");
      lines.push(`- **${q.label}** (${statusLabel})`);
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
  const { t, createdLine, emDash } = exportMarkdownI18n();
  const dash = emDash();
  const lines = [`# Story Map — ${title}`, "", createdLine(), ""];

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
    lines.push(t("exportsMd.noActivities"), "");
  } else {
    for (const act of activities) {
      lines.push(`### ${act.label}`);
      if (act.description) lines.push(act.description);
      const nearbyTasks = tasks
        .filter((task) => task.x + (task.width ?? 140) > act.x && task.x < act.x + (act.width ?? 160) + 40)
        .sort((a, b) => a.y - b.y);
      if (nearbyTasks.length) {
        lines.push("", t("exportsMd.tasksHeading"));
        for (const task of nearbyTasks) {
          lines.push(`- ${task.label}`);
          const underStories = stories
            .filter(
              (s) =>
                s.x + (s.width ?? 160) > task.x &&
                s.x < task.x + (task.width ?? 140) + 40 &&
                s.y >= task.y,
            )
            .sort((a, b) => a.y - b.y);
          for (const st of underStories) {
            const prio = STORY_PRIORITY_LABEL[st.metadata?.storyPriority ?? "must"] ?? "Must";
            const persona = st.metadata?.storyPersona ? ` · ${st.metadata.storyPersona}` : "";
            const est = st.metadata?.storyEstimate ? ` · ${st.metadata.storyEstimate}` : "";
            lines.push(t("exportsMd.storyLine", { label: st.label, details: `${prio}${persona}${est}` }));
            const acc = st.metadata?.storyAcceptance ?? [];
            for (const a of acc) lines.push(t("exportsMd.acceptanceLine", { text: a }));
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
    lines.push(t("exportsMd.allUserStories"), "");
    lines.push(t("exportsMd.storyTableHeader"), "| --- | --- | --- | --- |");
    for (const st of orphanStories.sort((a, b) => a.y - b.y || a.x - b.x)) {
      lines.push(
        `| ${st.label} | ${st.metadata?.storyPersona ?? dash} | ${STORY_PRIORITY_LABEL[st.metadata?.storyPriority ?? "must"] ?? "Must"} | ${st.metadata?.storyEstimate ?? dash} |`,
      );
    }
    lines.push("");
  }

  lines.push("## Releases", "");
  if (releases.length === 0) {
    lines.push(t("exportsMd.noReleases"), "");
  } else {
    for (const r of releases) {
      lines.push(`### ${r.label}`);
      if (r.metadata?.releaseGoal) {
        lines.push(t("exportsMd.goalLine", { goal: r.metadata.releaseGoal }));
      }
      if (r.description) lines.push(`- ${r.description}`);
      lines.push("");
    }
  }

  downloadText(`${slugTitle(title)}-story-map.md`, lines.join("\n"));
}

/** Event Modeling: Slices + Commands / Events / Views / UI / Policies. */
export function exportEventModelMarkdown(): void {
  const { elements, title, swimlanes } = boardActiveSliceFromStore();
  const { t, createdLine, emDash } = exportMarkdownI18n();
  const dash = emDash();
  const lines = [`# Event Model — ${title}`, "", createdLine(), ""];

  const slices = [...elements.filter((e) => e.type === "slice")].sort(
    (a, b) => a.x - b.x || a.y - b.y,
  );

  lines.push("## Vertical Slices", "");
  if (slices.length === 0) {
    lines.push(t("exportsMd.noSlices"), "");
  } else {
    for (const sl of slices) {
      lines.push(`### ${sl.label}`);
      if (sl.metadata?.releaseGoal) {
        lines.push(t("exportsMd.goalLine", { goal: sl.metadata.releaseGoal }));
      }
      if (sl.description) lines.push(`- ${sl.description}`);
      const systems = sl.metadata?.sliceSystems ?? [];
      if (systems.length) {
        lines.push(t("exportsMd.systemsLanes"));
        lines.push(...mdBulletList(systems, dash));
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
        lines.push("", t("exportsMd.blocksInSliceColumn"));
        for (const el of inBand.sort((a, b) => a.y - b.y)) {
          lines.push(`- ${styleForElementType(el.type).label}: ${el.label}`);
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
      if (inside.length === 0) lines.push(t("exportsMd.emptyLane"));
      else for (const el of inside) lines.push(`- ${styleForElementType(el.type).shortLabel}: ${el.label}`);
      lines.push("");
    }
  }

  downloadText(`${slugTitle(title)}-event-model.md`, lines.join("\n"));
}

/** Process flow (BPMN-lite): Start, Activities, Gateways, End. */
export function exportProcessMarkdown(): void {
  const { elements, title, swimlanes } = boardActiveSliceFromStore();
  const { t, createdLine, emDash } = exportMarkdownI18n();
  const dash = emDash();
  const lines = [`# ${t("exportsMd.processModelTitle")} — ${title}`, "", createdLine(), ""];

  const starts = elements.filter((e) => e.type === "processStart");
  const activities = elements.filter((e) => e.type === "processActivity");
  const gateways = elements.filter((e) => e.type === "processGateway");
  const ends = elements.filter((e) => e.type === "processEnd");

  if (starts.length) {
    lines.push(t("exportsMd.startHeading"), "");
    for (const s of starts) {
      lines.push(`### ${s.label}`);
      if (s.metadata?.processTrigger) {
        lines.push(t("exportsMd.triggerLine", { text: s.metadata.processTrigger }));
      }
      lines.push(...mdMetaBlock(s, t), "");
    }
  }

  if (activities.length) {
    lines.push(t("exportsMd.activitiesHeading"), "");
    for (const a of [...activities].sort((x, y) => x.x - y.x || x.y - y.y)) {
      lines.push(`### ${a.label}`);
      if (a.metadata?.processRole) lines.push(t("exportsMd.roleLine", { text: a.metadata.processRole }));
      if (a.metadata?.processSystem) {
        lines.push(t("exportsMd.systemLine", { text: a.metadata.processSystem }));
      }
      if (a.metadata?.processDuration) {
        lines.push(t("exportsMd.durationLine", { text: a.metadata.processDuration }));
      }
      if (a.metadata?.processInputs?.length) {
        lines.push(t("exportsMd.inputsHeading"));
        lines.push(...mdBulletList(a.metadata.processInputs, dash));
      }
      if (a.metadata?.processOutputs?.length) {
        lines.push(t("exportsMd.outputsHeading"));
        lines.push(...mdBulletList(a.metadata.processOutputs, dash));
      }
      lines.push(...mdMetaBlock(a, t), "");
    }
  }

  if (gateways.length) {
    lines.push(t("exportsMd.gatewaysHeading"), "");
    for (const g of gateways) {
      lines.push(`### ${g.label} (${(g.metadata?.gatewayKind ?? "xor").toUpperCase()})`);
      if (g.metadata?.gatewayConditions?.length) {
        lines.push(t("exportsMd.pathsConditions"));
        lines.push(...mdBulletList(g.metadata.gatewayConditions, dash));
      }
      lines.push(...mdMetaBlock(g, t), "");
    }
  }

  if (ends.length) {
    lines.push(t("exportsMd.endHeading"), "");
    for (const e of ends) {
      lines.push(`### ${e.label}`);
      if (e.metadata?.processResult) {
        lines.push(t("exportsMd.resultLine", { text: e.metadata.processResult }));
      }
      lines.push(...mdMetaBlock(e, t), "");
    }
  }

  if (swimlanes.length) {
    lines.push("## Swimlanes", "");
    for (const lane of swimlanes) {
      const inside = elements.filter((el) => el.swimlaneId === lane.id);
      lines.push(`### ${lane.label}`);
      if (inside.length === 0) lines.push(t("exportsMd.emptyLane"));
      else for (const el of inside) lines.push(`- ${styleForElementType(el.type).shortLabel}: ${el.label}`);
      lines.push("");
    }
  }

  if (starts.length + activities.length + gateways.length + ends.length === 0) {
    lines.push(t("exportsMd.noProcessOnBoard"), "");
  }

  downloadText(`${slugTitle(title)}-process.md`, lines.join("\n"));
}

/** Conceptual data model: entities, associations, attributes/keys. */
export function exportDataModelMarkdown(): void {
  const { elements, title, relations } = boardActiveSliceFromStore();
  const { t, createdLine, emDash } = exportMarkdownI18n();
  const dash = emDash();
  const lines = [`# ${t("exportsMd.dataModelTitle")} — ${title}`, "", createdLine(), ""];

  const entities = elements.filter((e) => e.type === "dataEntity");
  const associations = elements.filter((e) => e.type === "dataAssociation");

  lines.push(t("exportsMd.entitiesHeading"), "");
  if (entities.length === 0) {
    lines.push(t("exportsMd.noEntities"), "");
  } else {
    for (const ent of entities) {
      lines.push(`### ${ent.label}`);
      if (ent.metadata?.dataTableName) {
        lines.push(t("exportsMd.tableLine", { name: ent.metadata.dataTableName }));
      }
      if (ent.metadata?.identityFields?.length) {
        lines.push(t("exportsMd.primaryKeyHeading"));
        lines.push(...mdBulletList(ent.metadata.identityFields, dash));
      }
      if (ent.metadata?.attributes?.length) {
        lines.push(t("exportsMd.attributesHeading"));
        lines.push(...mdBulletList(ent.metadata.attributes, dash));
      }
      if (ent.metadata?.dataUniqueKeys?.length) {
        lines.push(t("exportsMd.uniqueKeysHeading"));
        lines.push(...mdBulletList(ent.metadata.dataUniqueKeys, dash));
      }
      lines.push(...mdMetaBlock(ent, t), "");
    }
  }

  if (associations.length) {
    lines.push(t("exportsMd.associationsHeading"), "");
    for (const a of associations) {
      const card = a.metadata?.dataCardinality ?? "1:n";
      const left = a.metadata?.dataLeftEntity ?? "?";
      const right = a.metadata?.dataRightEntity ?? "?";
      lines.push(`### ${a.label} (${card})`);
      lines.push(`- ${left} — ${right}`);
      if (a.metadata?.attributes?.length) {
        lines.push(t("exportsMd.relationAttributesHeading"));
        lines.push(...mdBulletList(a.metadata.attributes, dash));
      }
      lines.push(...mdMetaBlock(a, t), "");
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
    lines.push(t("exportsMd.boardRelationsHeading"), "");
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

/** Architecture documentation: Bausteinsicht, C4, Cloud, ERM. */
export function exportArchitectureDocumentationMarkdown(): void {
  const { elements, title, relations, boundedContexts } = boardActiveSliceFromStore();
  const { t, createdLine, emDash } = exportMarkdownI18n();
  const dash = emDash();
  const detailSuffix = t("exportsMd.detailViewSuffix");
  const lines = [`# ${t("exportsMd.architectureDocTitle")} — ${title}`, "", createdLine(), ""];

  const blackboxes = elements.filter((e) => e.type === "archBlackbox");
  const whiteboxes = elements.filter((e) => e.type === "archWhitebox");
  const components = elements.filter((e) => e.type === "archComponent");
  lines.push(t("exportsMd.buildingBlockView"), "");
  if (blackboxes.length + whiteboxes.length + components.length === 0) {
    lines.push(t("exportsMd.noArchitectureBlocks"), "");
  } else {
    if (blackboxes.length) {
      lines.push(t("exportsMd.blackboxesHeading"), "");
      for (const el of blackboxes) {
        lines.push(`- **${el.label}**${el.detailViewId ? detailSuffix : ""}`);
        if (el.description?.trim()) lines.push(`  - ${el.description.trim()}`);
      }
      lines.push("");
    }
    if (whiteboxes.length) {
      lines.push(t("exportsMd.whiteboxesHeading"), "");
      for (const el of whiteboxes) {
        lines.push(`- **${el.label}**${el.detailViewId ? detailSuffix : ""}`);
        lines.push(...mdMetaBlock(el, t), "");
      }
    }
    if (components.length) {
      lines.push(t("exportsMd.componentsHeading"), "");
      for (const el of components) {
        lines.push(`- **${el.label}**`);
        lines.push(...mdMetaBlock(el, t));
      }
      lines.push("");
    }
    const contains = relations.filter((r) => r.type === "contains");
    if (contains.length) {
      lines.push(t("exportsMd.containsRelationsHeading"), "");
      for (const r of contains) {
        const src = elements.find((e) => e.id === r.sourceId);
        const tgt = elements.find((e) => e.id === r.targetId);
        if (!src || !tgt) continue;
        lines.push(`- ${src.label} → ${tgt.label}`);
      }
      lines.push("");
    }
  }

  const c4Types = ["c4Person", "c4SoftwareSystem", "c4Container", "c4Component"] as const;
  lines.push(t("exportsMd.c4ModelHeading"), "");
  let hasC4 = false;
  for (const type of c4Types) {
    const items = elements.filter((e) => e.type === type);
    if (items.length === 0) continue;
    hasC4 = true;
    lines.push(`### ${styleForElementType(type).label}`, "");
    for (const el of items) {
      lines.push(`- **${el.label}**`);
      if (el.metadata?.c4Technology) {
        lines.push(t("exportsMd.technologyLine", { text: el.metadata.c4Technology }));
      }
      if (el.description?.trim()) lines.push(`  - ${el.description.trim()}`);
    }
    lines.push("");
  }
  if (!hasC4) lines.push(t("exportsMd.noC4Elements"), "");

  const cloudTypes = [
    "cloudBoundary",
    "cloudNetwork",
    "cloudCompute",
    "cloudDataStore",
    "cloudMessaging",
    "cloudIdentity",
    "cloudEdge",
    "cloudManagedService",
  ] as const;
  lines.push(t("exportsMd.cloudArchitectureHeading"), "");
  let hasCloud = false;
  for (const type of cloudTypes) {
    const items = elements.filter((e) => e.type === type);
    if (items.length === 0) continue;
    hasCloud = true;
    lines.push(`### ${styleForElementType(type).label}`, "");
    for (const el of items) {
      lines.push(`- **${el.label}**${el.detailViewId ? detailSuffix : ""}`);
      if (el.metadata?.cloudProvider) {
        lines.push(t("exportsMd.providerLine", { text: el.metadata.cloudProvider }));
      }
      if (el.metadata?.c4Technology) {
        lines.push(t("exportsMd.cloudTechnologyLine", { text: el.metadata.c4Technology }));
      }
      if (el.description?.trim()) lines.push(`  - ${el.description.trim()}`);
    }
    lines.push("");
  }
  if (!hasCloud) lines.push(t("exportsMd.noCloudBlocks"), "");

  const entities = elements.filter((e) => e.type === "dataEntity");
  const associations = elements.filter((e) => e.type === "dataAssociation");
  lines.push(t("exportsMd.ermEntitiesHeading"), "");
  if (entities.length === 0) {
    lines.push(t("exportsMd.noEntities"), "");
  } else {
    for (const ent of entities) {
      lines.push(`### ${ent.label}`);
      if (ent.metadata?.identityFields?.length) {
        lines.push(t("exportsMd.identityHeading"), ...mdBulletList(ent.metadata.identityFields, dash));
      }
      if (ent.metadata?.attributes?.length) {
        lines.push(t("exportsMd.attributesHeading"), ...mdBulletList(ent.metadata.attributes, dash));
      }
      lines.push(...mdMetaBlock(ent, t), "");
    }
  }

  if (associations.length) {
    lines.push(t("exportsMd.ermRelationsHeading"), "");
    for (const a of associations) {
      const card = a.metadata?.dataCardinality ?? "1:n";
      lines.push(`- **${a.label}** (${card}): ${a.metadata?.dataLeftEntity ?? "?"} — ${a.metadata?.dataRightEntity ?? "?"}`);
    }
    lines.push("");
  }

  if (boundedContexts.length) {
    lines.push("## Bounded Contexts", "");
    for (const bc of boundedContexts) {
      const inside = elements.filter((e) => e.boundedContextId === bc.id);
      lines.push(`### ${bc.label}`);
      if (bc.purpose?.trim()) lines.push(t("exportsMd.purposeLine", { text: bc.purpose.trim() }));
      if (bc.detailViewId) lines.push(t("exportsMd.detailViewLinked"));
      if (inside.length) {
        lines.push(t("exportsMd.contentsHeading"));
        for (const el of inside) lines.push(`  - ${styleForElementType(el.type).shortLabel}: ${el.label}`);
      }
      lines.push("");
    }
  }

  const archIds = new Set(elements.map((e) => e.id));
  const archRels = relations.filter((r) => archIds.has(r.sourceId) && archIds.has(r.targetId));
  if (archRels.length) {
    lines.push(t("exportsMd.relationsHeading"), "");
    for (const r of archRels) {
      const src = elements.find((e) => e.id === r.sourceId);
      const tgt = elements.find((e) => e.id === r.targetId);
      lines.push(
        `- ${src?.label ?? r.sourceId} → ${tgt?.label ?? r.targetId}${r.label ? ` (${r.label})` : ""}`,
      );
    }
    lines.push("");
  }

  downloadText(`${slugTitle(title)}-architecture.md`, lines.join("\n"));
}

function elementRect(
  el: StormElement,
  notesCompact: boolean,
): { x: number; y: number; w: number; h: number } {
  return elementCanvasBounds(el, notesCompact);
}

function drawExportCompactNoteInfo(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  stroke: string,
  ink: string,
): void {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = size * 0.35;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = ink;
  ctx.font = `600 ${Math.max(10, Math.round(size * 0.45))}px ${EXPORT_FONT_FAMILY}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("i", cx, cy);
}

function pushExportCompactNoteInfoSvg(
  parts: string[],
  x: number,
  y: number,
  size: number,
  stroke: string,
  ink: string,
  rot?: string,
): void {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = size * 0.35;
  const rotAttr = rot ?? "";
  parts.push(
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${stroke}" stroke-width="1.5"${rotAttr}/>`,
    `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" fill="${ink}" font-size="${Math.max(10, Math.round(size * 0.45))}" font-weight="600"${rotAttr}>i</text>`,
  );
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function cssFont(weight: number, sizePx: number): string {
  return cssExportFont(weight, sizePx);
}

function cornerRadius(el: StormElement, w: number, h: number): number {
  const shape = styleForElementType(el.type).shape;
  if (shape === "pill") return elementPillCornerRadiusPx(w, h);
  if (shape === "rectangle") return 2;
  if (shape === "wide") return 6;
  return 8;
}

function elementFillStrokeInk(
  el: StormElement,
  customCardTypes: CustomCardType[] = [],
): { fill: string; stroke: string; ink: string } {
  if (el.type === "note") {
    const c = resolveNoteColor(el.metadata?.noteColor);
    return { fill: c.fill, stroke: c.stroke, ink: c.ink };
  }
  const s = resolveElementStyle(el, customCardTypes);
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

function elementDimmedForExportHighlight(elementId: string, state: BoardExportSlice): boolean {
  const highlight = state.selectionHighlight;
  if (!highlight) return false;
  return elementDimmedBySelectionFilter(
    elementId,
    highlight.enabled,
    highlight.selectedElementIds,
  );
}

function computeBoardBounds(state: BoardActiveSlice | BoardExportSlice): BoardBounds {
  const notesCompact = state.notesCompact ?? false;
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
    const r = elementRect(el, notesCompact);
    expand(r.x, r.y, r.w, r.h);
  }
  for (const bc of state.boundedContexts) {
    expand(bc.x, bc.y, bc.width, bc.height);
  }
  for (const lane of state.swimlanes) {
    expand(lane.x ?? 0, lane.y, lane.width ?? 4000, lane.height);
  }
  for (const line of state.canvasLines) {
    expand(Math.min(line.x1, line.x2), Math.min(line.y1, line.y2), Math.abs(line.x2 - line.x1), Math.abs(line.y2 - line.y1));
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

function cardPreviewLines(el: StormElement): {
  description?: string;
  attrs: string[];
  methods: string[];
  links: string[];
} {
  return {
    description: cardShowsDescription(el)
      ? markdownToPlainText(el.description ?? "") || undefined
      : undefined,
    attrs: el.metadata?.showAttributesOnCard ? cardAttributeLines(el).slice(0, 8) : [],
    methods: el.metadata?.showMethodsOnCard ? cardMethodLines(el).slice(0, 8) : [],
    links: el.metadata?.showWebLinksOnCard ? cardWebLinkLines(el).slice(0, 8) : [],
  };
}

/** Stable mxGraph cell ids (0/1 are reserved by draw.io). */
function mxCellId(prefix: string, id: string): string {
  return `${prefix}_${id.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

function mxStyle(parts: Record<string, string | number | boolean | undefined>): string {
  return Object.entries(parts)
    .filter(([, v]) => v !== undefined && v !== false)
    .map(([k, v]) => (v === true ? `${k}=1` : `${k}=${v}`))
    .join(";");
}

function mxHtmlText(text: string): string {
  return escapeXml(text).replace(/\r\n|\n|\r/g, "<br/>");
}

function mxHtmlValue(html: string): string {
  return escapeXml(html);
}

const MX_FONT = {
  fontFamily: EXPORT_FONT_FAMILY,
};

/** draw.io `absoluteArcSize`: arcSize is divided by 2, so store diameter in px. */
function mxAbsoluteArcSize(radiusPx: number): number {
  return Math.max(0, Math.round(radiusPx * 2));
}

function mxElementHtml(
  el: StormElement,
  customCardTypes: CustomCardType[],
): string {
  const caption = elementTypeBadgeLabel(el, customCardTypes);
  const preview = cardPreviewLines(el);
  const parts: string[] = [
    `<div style="font-size:${META_FONT_PX}px;font-weight:500;letter-spacing:0.04em;opacity:0.7">${mxHtmlText(caption)}</div>`,
    `<div style="font-size:${LABEL_FONT_PX}px;font-weight:${LABEL_FONT_WEIGHT}">${mxHtmlText(el.label)}</div>`,
  ];
  if (preview.description) {
    parts.push(
      `<div style="font-size:${META_FONT_PX}px;font-weight:500">${mxHtmlText(preview.description)}</div>`,
    );
  }
  for (const line of preview.attrs) {
    parts.push(`<div style="font-size:${META_FONT_PX}px;font-weight:500">${mxHtmlText(line)}</div>`);
  }
  for (const line of preview.methods) {
    parts.push(`<div style="font-size:${META_FONT_PX}px;font-weight:500">${mxHtmlText(line)}</div>`);
  }
  for (const line of preview.links) {
    parts.push(`<div style="font-size:${META_FONT_PX}px;font-weight:500">${mxHtmlText(line)}</div>`);
  }
  return parts.join("");
}

function mxPushVertex(
  cells: string[],
  id: string,
  valueHtml: string,
  style: string,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  cells.push(
    `<mxCell id="${id}" value="${mxHtmlValue(valueHtml)}" style="${style}" vertex="1" parent="1">`,
    `<mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/>`,
    `</mxCell>`,
  );
}

/**
 * Builds an uncompressed draw.io mxfile for the board.
 * Embedded in SVG `content` so diagrams.net / draw.io can reopen the file for editing.
 */
export function buildDrawioMxFile(state: BoardActiveSlice | BoardExportSlice, bounds: BoardBounds): string {
  const { width, height, ox, oy } = bounds;
  const notesCompact = state.notesCompact ?? false;
  const canvasBg = exportCanvasBackground(state.appearance);
  const pageW = Math.max(1, Math.ceil(width));
  const pageH = Math.max(1, Math.ceil(height));
  const cells: string[] = [
    `<mxCell id="0"/>`,
    `<mxCell id="1" parent="0"/>`,
  ];

  for (const entry of sortedRegions(state)) {
    if (entry.kind === "swimlane") {
      const lane = entry.region;
      const x = (lane.x ?? 0) + ox;
      const y = lane.y + oy;
      const w = lane.width ?? 4000;
      const h = lane.height;
      const paint = resolveRegionPaint("swimlane", lane);
      const style = mxStyle({
        shape: "partialRectangle",
        top: 1,
        bottom: 1,
        left: 0,
        right: 0,
        whiteSpace: "wrap",
        html: 1,
        align: "left",
        verticalAlign: "top",
        spacingLeft: 12,
        spacingTop: 8,
        fillColor: paint.fillHex,
        fillOpacity: Math.round(paint.fillOpacity * 100),
        strokeColor: paint.borderHex,
        strokeOpacity: Math.round(paint.borderOpacity * 100),
        strokeWidth: 2,
        fontColor: SWIMLANE_LABEL_FILL,
        fontSize: REGION_LABEL_FONT_PX,
        fontStyle: 1,
        ...MX_FONT,
      });
      mxPushVertex(cells, mxCellId("lane", lane.id), mxHtmlText(lane.label), style, x, y, w, h);
    } else {
      const bc = entry.region;
      const paint = resolveRegionPaint("boundedContext", bc);
      const style = mxStyle({
        rounded: 1,
        absoluteArcSize: 1,
        arcSize: mxAbsoluteArcSize(8),
        whiteSpace: "wrap",
        html: 1,
        align: "left",
        verticalAlign: "top",
        spacingLeft: 8,
        spacingTop: 4,
        fillColor: paint.fillHex,
        fillOpacity: Math.round(paint.fillOpacity * 100),
        strokeColor: paint.borderHex,
        strokeOpacity: Math.round(paint.borderOpacity * 100),
        strokeWidth: 2,
        fontColor: BC_LABEL_FILL,
        fontSize: REGION_LABEL_FONT_PX,
        fontStyle: 1,
        ...MX_FONT,
      });
      mxPushVertex(
        cells,
        mxCellId("bc", bc.id),
        mxHtmlText(bc.label),
        style,
        bc.x + ox,
        bc.y + oy,
        bc.width,
        bc.height,
      );
    }
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
      strokeColor: TIMELINE_STROKE,
      strokeWidth: 2,
      fontColor: TIMELINE_STROKE,
      fontSize: 10,
      fontStyle: 0,
      ...MX_FONT,
    });
    const timelineLabel = state.timeline.startLabel
      ? `Timeline · ${state.timeline.startLabel} → ${state.timeline.endLabel ?? "Ende"}`
      : "Timeline";
    cells.push(
      `<mxCell id="timeline" value="${mxHtmlValue(mxHtmlText(timelineLabel))}" style="${style}" edge="1" parent="1">`,
      `<mxGeometry relative="1" as="geometry">`,
      `<mxPoint x="${x1}" y="${ty}" as="sourcePoint"/>`,
      `<mxPoint x="${x2}" y="${ty}" as="targetPoint"/>`,
      `</mxGeometry>`,
      `</mxCell>`,
    );
  }

  cells.push(
    ...drawioExportConnectorCells(state, bounds, mxCellId, mxStyle, mxHtmlValue, mxHtmlText, MX_FONT),
  );

  for (const el of sortElementsByZOrder(state.elements)) {
    const r = elementRect(el, notesCompact);
    const { fill, stroke, ink } = elementFillStrokeInk(el, state.customCardTypes);
    const compactNote = noteUsesCompactLayout(el, notesCompact);
    const shape = styleForElementType(el.type).shape;
    const radius = cornerRadius(el, r.w, r.h);
    const circularPill = shape === "pill" && isCircularPillShape(r.w, r.h);
    const align = elementLabelAlign(el);
    const vAlign = elementVerticalAlign(el);
    const style = mxStyle({
      rounded: circularPill || (shape === "rectangle" && radius <= 0) ? 0 : 1,
      absoluteArcSize: circularPill ? undefined : 1,
      arcSize: circularPill ? undefined : mxAbsoluteArcSize(radius),
      ellipse: circularPill ? 1 : undefined,
      shape: el.type === "instruction" ? "process" : undefined,
      whiteSpace: "wrap",
      html: 1,
      align: compactNote ? "center" : align,
      verticalAlign: compactNote ? "middle" : vAlign,
      spacingLeft: align === "left" ? CARD_PAD_X : 4,
      spacingRight: align === "left" ? CARD_PAD_X : 4,
      spacingTop: vAlign === "top" ? CARD_PAD_Y : 2,
      spacingBottom: 2,
      fillColor: fill,
      fillOpacity: isBoundaryElement(el) ? 38 : undefined,
      strokeColor: stroke,
      strokeWidth: elementStrokeWidth(el),
      fontColor: ink,
      fontSize: LABEL_FONT_PX,
      fontStyle: 0,
      dashed: elementIsDashed(el) ? 1 : undefined,
      dashPattern: elementIsDashed(el) ? "4 3" : undefined,
      rotation: elementExportRotation(el) || undefined,
      ...MX_FONT,
    });
    mxPushVertex(
      cells,
      mxCellId("el", el.id),
      compactNote ? mxHtmlValue("i") : mxElementHtml(el, state.customCardTypes),
      style,
      r.x + ox,
      r.y + oy,
      r.w,
      r.h,
    );
  }

  const modified = new Date().toISOString();
  const diagramName = escapeXml(state.title || "Board");
  return [
    `<mxfile host="app.diagrams.net" modified="${modified}" agent="E2" version="22.0.0" type="device">`,
    `<diagram id="board" name="${diagramName}">`,
    `<mxGraphModel dx="${pageW}" dy="${pageH}" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${pageW}" pageHeight="${pageH}" math="0" shadow="0" background="${canvasBg}">`,
    `<root>`,
    ...cells,
    `</root>`,
    `</mxGraphModel>`,
    `</diagram>`,
    `</mxfile>`,
  ].join("");
}

export function exportBoardSvg(): void {
  const state = boardExportSliceFromStore();
  const bounds = computeBoardBounds(state);
  const { width, height, ox, oy } = bounds;
  const notesCompact = state.notesCompact ?? false;
  const canvasBg = exportCanvasBackground(state.appearance);
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
    `<rect width="100%" height="100%" fill="${escapeXml(canvasBg)}"/>`,
    `<defs>`,
    `<style><![CDATA[
      @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');
      .label { font-family: ${EXPORT_FONT_STACK}; font-size: ${LABEL_FONT_PX}px; font-weight: ${LABEL_FONT_WEIGHT}; }
      .meta { font-family: ${EXPORT_FONT_STACK}; font-size: ${META_FONT_PX}px; font-weight: 500; }
      .badge { font-family: ${EXPORT_FONT_STACK}; font-size: ${META_FONT_PX}px; font-weight: 500; letter-spacing: 0.04em; opacity: 0.7; }
      .region { font-family: ${EXPORT_FONT_STACK}; font-size: ${REGION_LABEL_FONT_PX}px; font-weight: ${LABEL_FONT_WEIGHT}; }
    ]]></style>`,
    `</defs>`,
  ];

  for (const entry of sortedRegions(state)) {
    if (entry.kind === "swimlane") {
      const lane = entry.region;
      const x = (lane.x ?? 0) + ox;
      const y = lane.y + oy;
      const w = lane.width ?? 4000;
      const h = lane.height;
      const paint = resolveRegionPaint("swimlane", lane);
      parts.push(
        `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${escapeXml(paint.backgroundColor)}" stroke="none"/>`,
        svgSwimlaneExportBorder(x, y, w, h, paint.borderColor),
        `<text class="region" x="${x + 12}" y="${y + 18}" fill="${SWIMLANE_LABEL_FILL}">${escapeXml(lane.label)}</text>`,
      );
    } else {
      const bc = entry.region;
      const paint = resolveRegionPaint("boundedContext", bc);
      parts.push(
        `<rect x="${bc.x + ox}" y="${bc.y + oy}" width="${bc.width}" height="${bc.height}" fill="${escapeXml(paint.backgroundColor)}" stroke="${escapeXml(paint.borderColor)}" stroke-width="2" rx="8"/>`,
        `<text class="region" x="${bc.x + ox + 8}" y="${bc.y + oy + 18}" fill="${BC_LABEL_FILL}">${escapeXml(bc.label)}</text>`,
      );
    }
  }

  if (state.timeline.visible !== false) {
    const ty = state.timeline.y + oy;
    parts.push(
      `<line x1="${PAD / 2}" y1="${ty}" x2="${width - PAD / 2}" y2="${ty}" stroke="${TIMELINE_STROKE}" stroke-width="2" stroke-dasharray="8 4"/>`,
    );
  }

  parts.push(...svgExportConnectors(state, ox, oy, escapeXml));

  for (const el of sortElementsByZOrder(state.elements)) {
    const selectionDimmed = elementDimmedForExportHighlight(el.id, state);
    if (selectionDimmed) {
      parts.push(`<g opacity="${EXPORT_HIGHLIGHT_DIMMED_ELEMENT_OPACITY}">`);
    }
    const r = elementRect(el, notesCompact);
    const { fill, stroke, ink } = elementFillStrokeInk(el, state.customCardTypes);
    const compactNote = noteUsesCompactLayout(el, notesCompact);
    const x = r.x + ox;
    const y = r.y + oy;
    const rx = cornerRadius(el, r.w, r.h);
    const rotDeg = elementExportRotation(el);
    const rot = rotDeg
      ? ` transform="rotate(${rotDeg} ${x + r.w / 2} ${y + r.h / 2})"`
      : "";
    const dash = elementIsDashed(el) ? ` stroke-dasharray="4 3"` : "";
    const paintFill = elementFillWithOpacity(fill, el);
    parts.push(
      `<rect x="${x}" y="${y}" width="${r.w}" height="${r.h}" fill="${escapeXml(paintFill)}" stroke="${escapeXml(stroke)}" stroke-width="${elementStrokeWidth(el)}" rx="${rx}"${dash}${rot}/>`,
    );
    if (el.type === "instruction") {
      parts.push(
        `<rect x="${x}" y="${y}" width="4" height="${r.h}" fill="${escapeXml(stroke)}" stroke="none"${rot}/>`,
      );
    }

    if (compactNote) {
      pushExportCompactNoteInfoSvg(parts, x, y, r.w, escapeXml(stroke), escapeXml(ink), rot);
      if (selectionDimmed) {
        parts.push(`</g>`);
      }
      continue;
    }

    const textW = Math.max(20, r.w - CARD_PAD_X * 2);
    const caption = elementTypeBadgeLabel(el, state.customCardTypes);
    const captionLines = [caption];
    const labelLines = wrapLabelLines(el.label, textW, (s) =>
      measureAt(LABEL_FONT_PX, LABEL_FONT_WEIGHT, s),
    );
    const preview = cardPreviewLines(el);
    const descLines = preview.description
      ? wrapLabelLines(preview.description, textW, (s) => measureAt(META_FONT_PX, 500, s)).slice(0, 3)
      : [];
    const lineH = LABEL_FONT_PX * 1.25;
    const metaH = META_FONT_PX * 1.25;
    const captionH = META_FONT_PX * 1.2;
    const blockH =
      captionH +
      labelLines.length * lineH +
      descLines.length * metaH +
      preview.attrs.length * metaH +
      preview.methods.length * metaH +
      preview.links.length * metaH;
    const centered = elementLabelIsCentered(el);
    let cursorY = y + CARD_PAD_Y + META_FONT_PX;
    if (centered && blockH < r.h - CARD_PAD_Y * 2) {
      cursorY = y + (r.h - blockH) / 2 + META_FONT_PX;
    }

    const pushTextBlock = (
      lines: string[],
      className: string,
      fillColor: string,
      step: number,
      forceStart: boolean,
    ) => {
      if (lines.length === 0) return;
      const anchor = centered && !forceStart ? "middle" : "start";
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

    if (captionLines.length) {
      pushTextBlock(captionLines, "badge", ink, captionH, false);
      cursorY += 2;
    }
    pushTextBlock(labelLines, "label", ink, lineH, false);
    if (descLines.length) {
      cursorY += 2;
      pushTextBlock(descLines, "meta", ink, metaH, true);
    }
    if (preview.attrs.length) {
      cursorY += 2;
      pushTextBlock(preview.attrs, "meta", ink, metaH, true);
    }
    if (preview.methods.length) {
      cursorY += 2;
      pushTextBlock(preview.methods, "meta", ink, metaH, true);
    }
    if (preview.links.length) {
      cursorY += 2;
      pushTextBlock(preview.links, "meta", ink, metaH, true);
    }
    if (selectionDimmed) {
      parts.push(`</g>`);
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

function boardExportBasename(title: string): string {
  return slugForExportFilename(title);
}

function renderActiveViewRaster(): {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  title: string;
} | null {
  const state = boardExportSliceFromStore();
  const { width, height, ox, oy } = computeBoardBounds(state);
  const notesCompact = state.notesCompact ?? false;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Crisp export on retina displays.
  const scale = Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
  canvas.width = Math.ceil(width * scale);
  canvas.height = Math.ceil(height * scale);
  ctx.scale(scale, scale);

  ctx.fillStyle = exportCanvasBackground(state.appearance);
  ctx.fillRect(0, 0, width, height);

  for (const entry of sortedRegions(state)) {
    if (entry.kind === "swimlane") {
      const lane = entry.region;
      const x = (lane.x ?? 0) + ox;
      const y = lane.y + oy;
      const w = lane.width ?? 4000;
      const h = lane.height;
      const paint = resolveRegionPaint("swimlane", lane);
      ctx.fillStyle = paint.backgroundColor;
      ctx.fillRect(x, y, w, h);
      strokeSwimlaneExportBorder(ctx, x, y, w, h, paint.borderColor);
      ctx.fillStyle = SWIMLANE_LABEL_FILL;
      ctx.font = cssFont(LABEL_FONT_WEIGHT, REGION_LABEL_FONT_PX);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(lane.label, x + 12, y + 18);
    } else {
      const bc = entry.region;
      const x = bc.x + ox;
      const y = bc.y + oy;
      const paint = resolveRegionPaint("boundedContext", bc);
      ctx.fillStyle = paint.backgroundColor;
      roundRect(ctx, x, y, bc.width, bc.height, 8);
      ctx.fill();
      ctx.strokeStyle = paint.borderColor;
      ctx.lineWidth = 2;
      roundRect(ctx, x, y, bc.width, bc.height, 8);
      ctx.stroke();
      ctx.fillStyle = BC_LABEL_FILL;
      ctx.font = cssFont(LABEL_FONT_WEIGHT, REGION_LABEL_FONT_PX);
      ctx.textAlign = "left";
      ctx.fillText(bc.label, x + 8, y + 18);
    }
  }

  if (state.timeline.visible !== false) {
    ctx.strokeStyle = TIMELINE_STROKE;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    const ty = state.timeline.y + oy;
    ctx.moveTo(PAD / 2, ty);
    ctx.lineTo(width - PAD / 2, ty);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  drawExportConnectorsOnCanvas(ctx, state, ox, oy, cssFont);

  for (const el of sortElementsByZOrder(state.elements)) {
    const r = elementRect(el, notesCompact);
    const x = r.x + ox;
    const y = r.y + oy;
    const { fill, stroke, ink } = elementFillStrokeInk(el, state.customCardTypes);
    const compactNote = noteUsesCompactLayout(el, notesCompact);
    const rx = cornerRadius(el, r.w, r.h);

    ctx.save();
    const selectionDimmed = elementDimmedForExportHighlight(el.id, state);
    if (selectionDimmed) {
      ctx.globalAlpha = EXPORT_HIGHLIGHT_DIMMED_ELEMENT_OPACITY;
      ctx.filter = EXPORT_HIGHLIGHT_DIMMED_ELEMENT_FILTER;
    }
    const rotDeg = elementExportRotation(el);
    if (rotDeg) {
      ctx.translate(x + r.w / 2, y + r.h / 2);
      ctx.rotate((rotDeg * Math.PI) / 180);
      ctx.translate(-(x + r.w / 2), -(y + r.h / 2));
    }

    ctx.fillStyle = elementFillWithOpacity(fill, el);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = elementStrokeWidth(el);
    if (elementIsDashed(el)) {
    ctx.setLineDash([4, 3]);
  }
    roundRect(ctx, x, y, r.w, r.h, rx);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    if (el.type === "instruction") {
      ctx.fillStyle = stroke;
      ctx.fillRect(x, y, 4, r.h);
    }

    if (compactNote) {
      drawExportCompactNoteInfo(ctx, x, y, r.w, stroke, ink);
      ctx.restore();
      continue;
    }

    const textW = Math.max(20, r.w - CARD_PAD_X * 2);
    ctx.font = cssFont(LABEL_FONT_WEIGHT, LABEL_FONT_PX);
    const labelLines = wrapLabelLines(el.label, textW, (s) => ctx.measureText(s).width);
    const preview = cardPreviewLines(el);
    ctx.font = cssFont(500, META_FONT_PX);
    const descLines = preview.description
      ? wrapLabelLines(preview.description, textW, (s) => ctx.measureText(s).width).slice(0, 3)
      : [];
    const caption = elementTypeBadgeLabel(el, state.customCardTypes);
    const lineH = LABEL_FONT_PX * 1.25;
    const metaH = META_FONT_PX * 1.25;
    const captionH = META_FONT_PX * 1.2;
    const blockH =
      captionH +
      labelLines.length * lineH +
      descLines.length * metaH +
      preview.attrs.length * metaH +
      preview.methods.length * metaH +
      preview.links.length * metaH;

    const centered = elementLabelIsCentered(el);
    let cursorY = y + CARD_PAD_Y + META_FONT_PX;
    if (centered && blockH < r.h - CARD_PAD_Y * 2) {
      cursorY = y + (r.h - blockH) / 2 + META_FONT_PX;
    }

    ctx.fillStyle = ink;
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = centered ? "center" : "left";
    const tx = centered ? x + r.w / 2 : x + CARD_PAD_X;

    ctx.font = cssFont(500, META_FONT_PX);
    ctx.globalAlpha = 0.7;
    ctx.fillText(caption, tx, cursorY, textW);
    ctx.globalAlpha = 1;
    cursorY += captionH + 2;

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
    for (const line of preview.links) {
      cursorY += 1;
      ctx.globalAlpha = 0.85;
      ctx.fillText(line, metaX, cursorY, textW);
      ctx.globalAlpha = 1;
      cursorY += metaH;
    }

    ctx.restore();
  }

  return { canvas, width, height, title: state.title };
}

export async function exportBoardPng(): Promise<void> {
  const rendered = renderActiveViewRaster();
  if (!rendered) return;
  const blob = await new Promise<Blob | null>((resolve) =>
    rendered.canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${boardExportBasename(rendered.title)}.png`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Active view as a one-page PDF (same raster as PNG). */
export function exportBoardPdf(): void {
  const rendered = renderActiveViewRaster();
  if (!rendered) return;
  downloadCanvasAsPdf(
    rendered.canvas,
    rendered.width,
    rendered.height,
    `${boardExportBasename(rendered.title)}.pdf`,
  );
}

export function exportActiveViewAsPrompt(): string {
  const s = useStormBoardStore.getState();
  const view = s.views.find((v) => v.id === s.activeViewId);
  const slice = boardActiveSliceFromStore();
  const contextTitle = view?.name?.trim()
    ? `${slice.title} — ${view.name.trim()}`
    : slice.title;
  return exportBoardAsPrompt(slice, { contextTitle });
}

export async function copyBoardPromptToClipboard(): Promise<boolean> {
  return writeClipboardText(exportActiveViewAsPrompt());
}

/** mxfile XML for diagrams.net (Ctrl/Cmd+V). */
export async function copyBoardDrawioToClipboard(): Promise<boolean> {
  const state = boardActiveSliceFromStore();
  const bounds = computeBoardBounds(state);
  return writeClipboardXml(buildDrawioMxFile(state, bounds));
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
