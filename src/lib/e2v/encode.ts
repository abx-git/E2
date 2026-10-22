import { normalizeAppearance } from "@/lib/board-appearance";
import type { BoardImportPayload, BoardView } from "@/lib/storm-json";
import type { BoardConnector, ConnectorEndpoint } from "@/types/board-connector";
import type { CanvasLine } from "@/types/canvas-annotation";
import type { ActionItem } from "@/types/action-item";
import type { ContextRelation, StormRelation } from "@/types/storm-relation";
import type { StormElement } from "@/types/storm-element";

import { AliasMap } from "@/lib/e2v/alias-map";
import { E2V_FORMAT, E2V_MAGIC, E2V_VERSION } from "@/lib/e2v/constants";
import { cell, row } from "@/lib/e2v/text";

function formatEndpoint(ep: ConnectorEndpoint, maps: {
  e: AliasMap;
  s: AliasMap;
  b: AliasMap;
}): string {
  switch (ep.attach) {
    case "element":
      return `element:${maps.e.alias(ep.id)}`;
    case "swimlane":
      return `swimlane:${maps.s.alias(ep.id)}`;
    case "boundedContext":
      return `bc:${maps.b.alias(ep.id)}`;
    case "point":
      return `point:${ep.x},${ep.y}`;
    default:
      return "point:0,0";
  }
}

function pushIdLines(out: string[], maps: AliasMap[]): void {
  for (const m of maps) {
    for (const [alias, real] of m.entries()) {
      out.push(`@id ${alias} ${real}`);
    }
  }
}

function encodeViewBody(view: BoardView, out: string[]): void {
  const eMap = new AliasMap("e");
  const sMap = new AliasMap("s");
  const bMap = new AliasMap("b");
  const cnMap = new AliasMap("cn");
  const rMap = new AliasMap("r");
  const crMap = new AliasMap("cr");
  const lnMap = new AliasMap("ln");
  const ctMap = new AliasMap("ct");

  for (const ct of view.customCardTypes) ctMap.alias(ct.id);
  for (const s of view.swimlanes) sMap.alias(s.id);
  for (const bc of view.boundedContexts) bMap.alias(bc.id);
  for (const el of view.elements) eMap.alias(el.id);
  for (const c of view.connectors) cnMap.alias(c.id);
  for (const r of view.relations) rMap.alias(r.id);
  for (const r of view.contextRelations) crMap.alias(r.id);
  for (const ln of view.canvasLines) lnMap.alias(ln.id);

  out.push(
    row([
      "@view",
      view.id,
      view.name,
      view.modelingMode,
      view.workshopFormat,
      view.facilitatorEnabled ? 1 : 0,
      view.facilitatorPhase,
    ]),
  );
  out.push(
    row(["@v", view.viewport.x, view.viewport.y, view.viewport.zoom]),
  );
  out.push(
    row([
      "@t",
      view.timeline.startLabel ?? "",
      view.timeline.endLabel ?? "",
      view.timeline.visible !== false ? 1 : 0,
    ]),
  );
  out.push(row(["@snap", view.snapToTimeline ? 1 : 0, view.snapToGrid ? 1 : 0]));

  pushIdLines(out, [eMap, sMap, bMap, cnMap, rMap, crMap, lnMap, ctMap]);

  for (const ct of view.customCardTypes) {
    out.push(row(["@ct", ctMap.alias(ct.id), ct.name, ct.fill, ct.stroke, ct.ink]));
  }

  for (const s of view.swimlanes) {
    out.push(
      row([
        "s",
        sMap.alias(s.id),
        s.label,
        s.x,
        s.y,
        s.width,
        s.height,
        s.color ?? "",
        s.fillOpacity ?? "",
        s.borderColor ?? "",
        s.borderOpacity ?? "",
        s.locked ? 1 : 0,
      ]),
    );
  }

  for (const bc of view.boundedContexts) {
    out.push(
      row([
        "b",
        bMap.alias(bc.id),
        bc.label,
        bc.x,
        bc.y,
        bc.width,
        bc.height,
        bc.purpose ?? "",
        bc.detailViewId ?? "",
        bc.color ?? "",
        bc.fillOpacity ?? "",
        bc.borderColor ?? "",
        bc.borderOpacity ?? "",
        bc.locked ? 1 : 0,
      ]),
    );
  }

  for (const el of view.elements) {
    out.push(
      row([
        "e",
        eMap.alias(el.id),
        el.type,
        el.x,
        el.y,
        el.width ?? "",
        el.height ?? "",
        el.rotation ?? "",
        el.zIndex ?? "",
        el.swimlaneId ? sMap.alias(el.swimlaneId) : "",
        el.boundedContextId ? bMap.alias(el.boundedContextId) : "",
        el.aggregateId ? eMap.alias(el.aggregateId) : "",
        el.subdomainId ? bMap.alias(el.subdomainId) : "",
        el.detailViewId ?? "",
        el.label,
      ]),
    );
    if (el.description?.trim()) {
      out.push(`@desc ${eMap.alias(el.id)} ${cell(el.description.trim())}`);
    }
    if (el.metadata && Object.keys(el.metadata).length > 0) {
      out.push(`@meta ${eMap.alias(el.id)} ${JSON.stringify(el.metadata)}`);
    }
  }

  for (const r of view.relations) {
    out.push(
      row([
        "r",
        rMap.alias(r.id),
        r.type,
        eMap.alias(r.sourceId),
        eMap.alias(r.targetId),
        r.label ?? "",
        r.labelMode ?? "",
        r.strokeStyle ?? "",
        r.progressMark ?? "",
      ]),
    );
  }

  for (const r of view.contextRelations) {
    out.push(
      row([
        "cr",
        crMap.alias(r.id),
        r.type,
        bMap.alias(r.sourceContextId),
        bMap.alias(r.targetContextId),
        r.label ?? "",
        r.labelMode ?? "",
        r.strokeStyle ?? "",
        r.progressMark ?? "",
      ]),
    );
  }

  for (const c of view.connectors) {
    out.push(
      row([
        "cn",
        cnMap.alias(c.id),
        formatEndpoint(c.source, { e: eMap, s: sMap, b: bMap }),
        formatEndpoint(c.target, { e: eMap, s: sMap, b: bMap }),
        c.arrowHead ?? "",
        c.relationType ?? "",
        c.contextMapPattern ?? "",
        c.strokeStyle ?? "",
        c.color ?? "",
        c.label ?? "",
        c.labelMode ?? "",
        c.progressMark ?? "",
      ]),
    );
  }

  for (const ln of view.canvasLines) {
    out.push(
      row([
        "ln",
        lnMap.alias(ln.id),
        ln.x1,
        ln.y1,
        ln.x2,
        ln.y2,
        ln.arrowHead ?? "",
        ln.strokeStyle ?? "",
        ln.color ?? "",
        ln.label ?? "",
      ]),
    );
  }

  out.push("@endview");
}

export type E2vEncodeScope = "document" | "view";

export interface EncodeE2vOptions {
  scope?: E2vEncodeScope;
  exportedAt?: string;
}

export function encodeE2vDocument(
  doc: BoardImportPayload,
  options?: EncodeE2vOptions,
): string {
  const out: string[] = [];
  const scope = options?.scope ?? "document";
  out.push(E2V_MAGIC);
  out.push(row(["@format", E2V_FORMAT]));
  out.push(row(["@version", E2V_VERSION]));
  out.push(row(["@scope", scope]));
  out.push(row(["@exported", options?.exportedAt ?? new Date().toISOString()]));
  out.push(row(["@title", doc.title]));
  if (scope === "document") {
    out.push(row(["@activeViewId", doc.activeViewId]));
    out.push(row(["@workshopMode", doc.workshopMode ? 1 : 0]));
    out.push(`@appearance ${JSON.stringify(normalizeAppearance(doc.appearance))}`);
    for (const g of doc.glossary) {
      out.push(row(["g", g.term, g.definition]));
    }
    for (const item of doc.actionItems ?? []) {
      out.push(
        row([
          "ai",
          item.id,
          item.title,
          item.status,
          item.area,
          item.notes ?? "",
          item.elementId ?? "",
          item.boundedContextId ?? "",
        ]),
      );
    }
  }

  const views =
    scope === "view" && doc.views.length === 1
      ? doc.views
      : doc.views;

  if (scope === "view") {
    const v = views[0];
    if (!v) throw new Error("encodeE2vDocument: no view");
    encodeViewBody(v, out);
  } else {
    for (const view of doc.views) {
      encodeViewBody(view, out);
    }
  }

  return `${out.join("\n")}\n`;
}

export function encodeE2vSingleView(
  doc: BoardImportPayload,
  viewId: string,
  options?: Omit<EncodeE2vOptions, "scope">,
): string | null {
  const view = doc.views.find((v) => v.id === viewId);
  if (!view) return null;
  const slice: BoardImportPayload = {
    title: doc.title,
    glossary: doc.glossary,
    actionItems: doc.actionItems,
    appearance: doc.appearance,
    workshopMode: doc.workshopMode,
    activeViewId: view.id,
    views: [view],
  };
  return encodeE2vDocument(slice, { ...options, scope: "view" });
}
