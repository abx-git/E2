/** mxGraph cell kinds mapped to E2 domain entities (see docs/drawio-sync.md). */
export type E2MxCellKind =
  | "element"
  | "boundedContext"
  | "swimlane"
  | "connector"
  | "timeline"
  | "unknown";

const PREFIX_KIND: Record<string, E2MxCellKind> = {
  el: "element",
  bc: "boundedContext",
  lane: "swimlane",
  conn: "connector",
};

/** Stable mxGraph cell ids (0/1 reserved by draw.io). */
export function mxCellId(prefix: string, id: string): string {
  return `${prefix}_${id.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

export function parseMxStyleString(style: string | undefined): Record<string, string> {
  if (!style) return {};
  const out: Record<string, string> = {};
  for (const part of style.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) {
      out[trimmed] = "1";
    } else {
      out[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
    }
  }
  return out;
}

export function e2RefFromMxCell(
  cellId: string,
  style?: string,
): { kind: E2MxCellKind; e2Id: string | null } {
  const parsed = parseMxStyleString(style);
  const styleKind = parsed.e2Kind as E2MxCellKind | undefined;
  const styleId = parsed.e2Id;
  if (styleKind && styleId) {
    return { kind: styleKind, e2Id: styleId };
  }
  if (cellId === "timeline") {
    return { kind: "timeline", e2Id: null };
  }
  const und = cellId.indexOf("_");
  if (und > 0) {
    const prefix = cellId.slice(0, und);
    const kind = PREFIX_KIND[prefix];
    if (kind) {
      return { kind, e2Id: cellId.slice(und + 1) };
    }
  }
  return { kind: "unknown", e2Id: null };
}

export function mxStyleE2Meta(kind: E2MxCellKind, e2Id: string): Record<string, string> {
  return { e2Kind: kind, e2Id };
}