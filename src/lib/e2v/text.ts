/** Escape a cell for tab-separated E2V rows (JSON string when needed). */
export function cell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  if (typeof value === "boolean") return value ? "1" : "0";
  const s = String(value);
  if (!/[\t\r\n"\\]/.test(s) && s.length < 120) return s;
  return JSON.stringify(s);
}

export function parseCell(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  if (t.startsWith('"') || t.startsWith("'")) {
    try {
      return JSON.parse(t) as string;
    } catch {
      return t;
    }
  }
  return t;
}

function pushCell(parts: string[], cur: string): void {
  parts.push(cur);
}

/** Quote-aware split on a single delimiter character (tab). */
function splitRowOnChar(line: string, delimiter: "\t"): string[] {
  const parts: string[] = [];
  let cur = "";
  let inStr = false;
  let esc = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (inStr) {
      if (esc) {
        cur += ch;
        esc = false;
        continue;
      }
      if (ch === "\\") {
        esc = true;
        continue;
      }
      if (ch === '"') {
        inStr = false;
        continue;
      }
      cur += ch;
      continue;
    }
    if (ch === '"') {
      inStr = true;
      continue;
    }
    if (ch === delimiter) {
      pushCell(parts, cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  pushCell(parts, cur);
  return parts;
}

/** Quote-aware split on ASCII whitespace (LLM output often uses spaces instead of tabs). */
function splitRowOnWhitespace(line: string): string[] {
  const parts: string[] = [];
  let cur = "";
  let inStr = false;
  let esc = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (inStr) {
      if (esc) {
        cur += ch;
        esc = false;
        continue;
      }
      if (ch === "\\") {
        esc = true;
        continue;
      }
      if (ch === '"') {
        inStr = false;
        continue;
      }
      cur += ch;
      continue;
    }
    if (ch === '"') {
      inStr = true;
      continue;
    }
    if (/\s/.test(ch)) {
      if (cur.length > 0) {
        pushCell(parts, cur);
        cur = "";
      }
      continue;
    }
    cur += ch;
  }
  if (cur.length > 0) pushCell(parts, cur);
  return parts;
}

/**
 * Split one E2V row into cells. Canonical export uses tabs; LLM output often uses spaces.
 */
export function splitRow(line: string): string[] {
  if (line.includes("\t")) return splitRowOnChar(line, "\t");
  return splitRowOnWhitespace(line);
}

export function row(cols: Array<string | number | boolean | null | undefined>): string {
  return cols.map((c) => cell(c)).join("\t");
}

/** Treat `-` and empty as unset optional id cells. */
export function optionalIdCell(raw: string | undefined): string | undefined {
  const t = raw?.trim();
  if (!t || t === "-") return undefined;
  return t;
}

function optionalNumCell(raw: string | undefined): number | undefined {
  const t = raw?.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

/** Fixed column index for label in a canonical 15-column `e` row. */
const ELEMENT_LABEL_INDEX = 14;

export interface ParsedElementE2vCells {
  width?: number;
  height?: number;
  rotation?: number;
  zIndex?: number;
  swimlaneId?: string;
  boundedContextId?: string;
  aggregateId?: string;
  subdomainId?: string;
  detailViewId?: string;
  label: string;
}

/**
 * Parse optional geometry / containment cells and label from an `e` row.
 * Canonical export always uses 15 columns (label at index 14). Shorter rows
 * treat the last column as the label so round-trip survives trimmed trailing tabs.
 */
export function parseElementE2vCells(cols: string[]): ParsedElementE2vCells {
  if (cols.length > ELEMENT_LABEL_INDEX) {
    return {
      width: optionalNumCell(cols[5]),
      height: optionalNumCell(cols[6]),
      rotation: optionalNumCell(cols[7]),
      zIndex: optionalNumCell(cols[8]),
      swimlaneId: optionalIdCell(cols[9]),
      boundedContextId: optionalIdCell(cols[10]),
      aggregateId: optionalIdCell(cols[11]),
      subdomainId: optionalIdCell(cols[12]),
      detailViewId: optionalIdCell(cols[13]),
      label: parseCell(cols[ELEMENT_LABEL_INDEX] ?? ""),
    };
  }

  const label =
    cols.length > 5 ? parseCell(cols[cols.length - 1] ?? "") : "";
  const optional = cols.slice(5, Math.max(5, cols.length - 1));
  const cellAt = (index: number) => optional[index] ?? "";

  return {
    width: optionalNumCell(cellAt(0)),
    height: optionalNumCell(cellAt(1)),
    rotation: optionalNumCell(cellAt(2)),
    zIndex: optionalNumCell(cellAt(3)),
    swimlaneId: optionalIdCell(cellAt(4)),
    boundedContextId: optionalIdCell(cellAt(5)),
    aggregateId: optionalIdCell(cellAt(6)),
    subdomainId: optionalIdCell(cellAt(7)),
    detailViewId: optionalIdCell(cellAt(8)),
    label,
  };
}
