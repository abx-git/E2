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
