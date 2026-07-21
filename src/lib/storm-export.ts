import { elementRect as geomElementRect, relationAnchors } from "@/lib/connector-geometry";
import { ELEMENT_STYLES } from "@/lib/element-styles";
import { resolveNoteColor } from "@/lib/note-colors";
import { boardImportPayloadFromStore } from "@/store/storm-board-store";
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
  const { elements, title } = boardImportPayloadFromStore();
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
  const { glossary, title } = boardImportPayloadFromStore();
  const lines = [`# Ubiquitous Language — ${title}`, "", "| Begriff | Definition |", "| --- | --- |"];
  for (const g of glossary) {
    lines.push(`| ${g.term} | ${g.definition.replace(/\|/g, "\\|")} |`);
  }
  if (glossary.length === 0) lines.push("| _leer_ | _leer_ |");
  downloadText(`${title.replace(/\s+/g, "-").toLowerCase()}-glossary.md`, lines.join("\n"));
}

export function exportContextMapMarkdown(): void {
  const { boundedContexts, elements, relations, contextRelations, title } =
    boardImportPayloadFromStore();
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
  const { elements, title } = boardImportPayloadFromStore();
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

function elementRect(el: StormElement): { x: number; y: number; w: number; h: number } {
  return geomElementRect(el);
}

const TYPE_COLORS: Record<string, string> = {
  domainEvent: "#ffedd5",
  command: "#dbeafe",
  actor: "#fef9c3",
  aggregate: "#fef08a",
  policy: "#f5d0fe",
  readModel: "#dcfce7",
  externalSystem: "#fce7f3",
  ui: "#f1f5f9",
  note: "#faf6ef",
  hotspot: "#fee2e2",
  pivotalEvent: "#fef3c7",
};

export function exportBoardSvg(): void {
  const state = boardImportPayloadFromStore();
  const padding = 80;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const el of state.elements) {
    const r = elementRect(el);
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.w);
    maxY = Math.max(maxY, r.y + r.h);
  }
  for (const bc of state.boundedContexts) {
    minX = Math.min(minX, bc.x);
    minY = Math.min(minY, bc.y);
    maxX = Math.max(maxX, bc.x + bc.width);
    maxY = Math.max(maxY, bc.y + bc.height);
  }

  if (!Number.isFinite(minX)) {
    minX = 0;
    minY = 0;
    maxX = 800;
    maxY = 600;
  }

  const width = maxX - minX + padding * 2;
  const height = maxY - minY + padding * 2;
  const ox = -minX + padding;
  const oy = -minY + padding;

  const parts: string[] = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="100%" height="100%" fill="#f4f5f7"/>`,
  ];

  if (state.timeline.visible !== false) {
    parts.push(
      `<line x1="${ox}" y1="${oy + state.timeline.y - minY + padding}" x2="${width - padding}" y2="${oy + state.timeline.y - minY + padding}" stroke="#94a3b8" stroke-width="2" stroke-dasharray="8 4"/>`,
    );
  }

  for (const bc of state.boundedContexts) {
    parts.push(
      `<rect x="${bc.x + ox}" y="${bc.y + oy}" width="${bc.width}" height="${bc.height}" fill="${bc.color ?? "#dbeafe"}" fill-opacity="0.4" stroke="#3b82f6" stroke-width="2" rx="8"/>`,
      `<text x="${bc.x + ox + 8}" y="${bc.y + oy + 20}" font-size="14" font-weight="600" fill="#1e40af">${escapeXml(bc.label)}</text>`,
    );
  }

  for (const rel of state.relations) {
    const src = state.elements.find((e) => e.id === rel.sourceId);
    const tgt = state.elements.find((e) => e.id === rel.targetId);
    if (!src || !tgt) continue;
    const { start, end } = relationAnchors(src, tgt);
    parts.push(
      `<line x1="${start.x + ox}" y1="${start.y + oy}" x2="${end.x + ox}" y2="${end.y + oy}" stroke="#64748b" stroke-width="2" marker-end="url(#arrow)"/>`,
    );
  }

  parts.push(
    `<defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto"><path d="M0,0 L10,3 L0,6 Z" fill="#64748b"/></marker></defs>`,
  );

  for (const el of state.elements) {
    const r = elementRect(el);
    const fill =
      el.type === "note"
        ? resolveNoteColor(el.metadata?.noteColor).fill
        : (TYPE_COLORS[el.type] ?? "#e2e8f0");
    const rot = el.rotation ? ` transform="rotate(${el.rotation} ${r.x + ox + r.w / 2} ${r.y + oy + r.h / 2})"` : "";
    parts.push(
      `<rect x="${r.x + ox}" y="${r.y + oy}" width="${r.w}" height="${r.h}" fill="${fill}" stroke="#334155" stroke-width="1.5" rx="6"${rot}/>`,
      `<text x="${r.x + ox + r.w / 2}" y="${r.y + oy + r.h / 2 + 5}" text-anchor="middle" font-size="12" fill="#0f172a"${rot}>${escapeXml(el.label)}</text>`,
    );
  }

  parts.push("</svg>");
  downloadText(`${state.title.replace(/\s+/g, "-").toLowerCase()}.svg`, parts.join("\n"), "image/svg+xml");
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function exportBoardPng(): Promise<void> {
  const state = boardImportPayloadFromStore();
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const padding = 80;
  let minX = 0;
  let minY = 0;
  let maxX = 1200;
  let maxY = 800;

  if (state.elements.length > 0) {
    minX = Math.min(...state.elements.map((e) => e.x));
    minY = Math.min(...state.elements.map((e) => e.y));
    maxX = Math.max(...state.elements.map((e) => e.x + (e.width ?? 140)));
    maxY = Math.max(...state.elements.map((e) => e.y + (e.height ?? 60)));
  }

  canvas.width = maxX - minX + padding * 2;
  canvas.height = maxY - minY + padding * 2;

  ctx.fillStyle = "#f4f5f7";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (state.timeline.visible !== false) {
    ctx.strokeStyle = "#94a3b8";
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    const ty = state.timeline.y - minY + padding;
    ctx.moveTo(0, ty);
    ctx.lineTo(canvas.width, ty);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  for (const bc of state.boundedContexts) {
    ctx.fillStyle = bc.color ?? "#dbeafe";
    ctx.globalAlpha = 0.4;
    ctx.fillRect(bc.x - minX + padding, bc.y - minY + padding, bc.width, bc.height);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#3b82f6";
    ctx.strokeRect(bc.x - minX + padding, bc.y - minY + padding, bc.width, bc.height);
    ctx.fillStyle = "#1e40af";
    ctx.font = "600 14px sans-serif";
    ctx.fillText(bc.label, bc.x - minX + padding + 8, bc.y - minY + padding + 20);
  }

  for (const rel of state.relations) {
    const src = state.elements.find((e) => e.id === rel.sourceId);
    const tgt = state.elements.find((e) => e.id === rel.targetId);
    if (!src || !tgt) continue;
    const { start, end } = relationAnchors(src, tgt);
    ctx.strokeStyle = "#64748b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(start.x - minX + padding, start.y - minY + padding);
    ctx.lineTo(end.x - minX + padding, end.y - minY + padding);
    ctx.stroke();
  }

  for (const el of state.elements) {
    const r = elementRect(el);
    const x = r.x - minX + padding;
    const y = r.y - minY + padding;
    ctx.fillStyle =
      el.type === "note"
        ? resolveNoteColor(el.metadata?.noteColor).fill
        : (TYPE_COLORS[el.type] ?? "#e2e8f0");
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 1.5;
    roundRect(ctx, x, y, r.w, r.h, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#0f172a";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(el.label, x + r.w / 2, y + r.h / 2 + 4);
    ctx.textAlign = "start";
  }

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${state.title.replace(/\s+/g, "-").toLowerCase()}.png`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
