"use client";

import { useEffect, useState } from "react";
import { Braces, Plus, Trash2 } from "lucide-react";

import { useStormBoardStore } from "@/store/storm-board-store";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

type ValueKind = "string" | "number" | "boolean" | "null" | "object" | "array";

function kindOf(value: unknown): ValueKind {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "object") return "object";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return "string";
}

function defaultForKind(kind: ValueKind): JsonValue {
  switch (kind) {
    case "number":
      return 0;
    case "boolean":
      return false;
    case "null":
      return null;
    case "object":
      return {};
    case "array":
      return [];
    default:
      return "";
  }
}

function asObject(value: unknown): Record<string, JsonValue> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, JsonValue>;
  }
  return {};
}

function uniqueKey(obj: Record<string, unknown>, base = "field"): string {
  if (!(base in obj)) return base;
  let i = 1;
  while (`${base}${i}` in obj) i += 1;
  return `${base}${i}`;
}

export interface JsonValueEditorProps {
  value: Record<string, unknown> | undefined;
  onChange: (next: Record<string, unknown> | undefined) => void;
  emptyHint?: string;
}

/** Structured JSON object editor (tree + raw) for Event Schema fields. */
export function JsonValueEditor({
  value,
  onChange,
  emptyHint = "Keine Felder — Eigenschaft hinzufügen",
}: JsonValueEditorProps) {
  const [mode, setMode] = useState<"tree" | "raw">("tree");
  const [rawText, setRawText] = useState("");
  const [rawError, setRawError] = useState<string | null>(null);

  const obj = asObject(value);
  const entries = Object.entries(obj);

  useEffect(() => {
    if (mode === "raw") {
      setRawText(value ? JSON.stringify(value, null, 2) : "{\n  \n}");
      setRawError(null);
    }
  }, [mode, value]);

  const commitObject = (next: Record<string, JsonValue>) => {
    onChange(Object.keys(next).length === 0 ? undefined : next);
  };

  const applyRaw = (text: string) => {
    setRawText(text);
    const trimmed = text.trim();
    if (!trimmed) {
      setRawError(null);
      onChange(undefined);
      return;
    }
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        setRawError("Schema muss ein JSON-Objekt sein ({ … }).");
        return;
      }
      setRawError(null);
      onChange(parsed as Record<string, unknown>);
    } catch {
      setRawError("Ungültiges JSON");
    }
  };

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--control)]">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-2 py-1">
        <div className="flex gap-1">
          <button
            type="button"
            className={[
              "rounded px-2 py-0.5 text-[0.68rem] font-medium",
              mode === "tree" ? "bg-[var(--control-hover)] text-[var(--text)]" : "text-[var(--muted)]",
            ].join(" ")}
            onClick={() => setMode("tree")}
          >
            Werte
          </button>
          <button
            type="button"
            className={[
              "rounded px-2 py-0.5 text-[0.68rem] font-medium",
              mode === "raw" ? "bg-[var(--control-hover)] text-[var(--text)]" : "text-[var(--muted)]",
            ].join(" ")}
            onClick={() => setMode("raw")}
          >
            JSON
          </button>
        </div>
        {mode === "tree" && (
          <button
            type="button"
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[0.68rem] text-[var(--muted)] hover:bg-[var(--control-hover)] hover:text-[var(--text)]"
            onClick={() => {
              const key = uniqueKey(obj);
              commitObject({ ...obj, [key]: "string" });
            }}
          >
            <Plus className="h-3 w-3" />
            Feld
          </button>
        )}
      </div>

      {mode === "raw" ? (
        <div className="p-2">
          <textarea
            className="dock-field min-h-[7rem] font-mono text-[0.72rem]"
            value={rawText}
            spellCheck={false}
            onFocus={() => useStormBoardStore.getState().beginGesture()}
            onBlur={() => useStormBoardStore.getState().endGesture()}
            onChange={(e) => applyRaw(e.target.value)}
            placeholder='{\n  "orderId": "string"\n}'
          />
          {rawError && (
            <p className="mt-1 text-[0.68rem] text-[var(--accent-2)]">{rawError}</p>
          )}
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-3 py-4 text-center">
          <Braces className="h-5 w-5 text-[var(--muted)]" />
          <p className="text-[0.72rem] text-[var(--muted)]">{emptyHint}</p>
          <button
            type="button"
            className="dock-control rounded-md px-2 py-1 text-[0.72rem]"
            onClick={() => commitObject({ field: "string" })}
          >
            Erstes Feld hinzufügen
          </button>
        </div>
      ) : (
        <ul className="max-h-64 space-y-1 overflow-y-auto p-2">
          {entries.map(([key, val]) => (
            <ObjectEntryRow
              key={key}
              entryKey={key}
              value={val}
              siblings={obj}
              onRename={(nextKey) => {
                if (!nextKey || nextKey === key) return;
                if (nextKey in obj) return;
                const next: Record<string, JsonValue> = {};
                for (const [k, v] of Object.entries(obj)) {
                  next[k === key ? nextKey : k] = v;
                }
                commitObject(next);
              }}
              onChangeValue={(nextVal) => commitObject({ ...obj, [key]: nextVal })}
              onRemove={() => {
                const { [key]: _removed, ...rest } = obj;
                commitObject(rest);
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ObjectEntryRow({
  entryKey,
  value,
  siblings,
  onRename,
  onChangeValue,
  onRemove,
}: {
  entryKey: string;
  value: JsonValue;
  siblings: Record<string, JsonValue>;
  onRename: (nextKey: string) => void;
  onChangeValue: (next: JsonValue) => void;
  onRemove: () => void;
}) {
  const kind = kindOf(value);
  const [keyDraft, setKeyDraft] = useState(entryKey);

  useEffect(() => {
    setKeyDraft(entryKey);
  }, [entryKey]);

  const commitKey = () => {
    const next = keyDraft.trim();
    if (!next || next === entryKey) {
      setKeyDraft(entryKey);
      return;
    }
    if (next in siblings) {
      setKeyDraft(entryKey);
      return;
    }
    onRename(next);
  };

  return (
    <li className="rounded-md border border-[var(--border)]/60 bg-[var(--panel-solid)]/40 p-1.5">
      <div className="flex flex-wrap items-center gap-1">
        <input
          className="dock-field min-w-0 flex-1 py-1 font-mono text-[0.72rem]"
          value={keyDraft}
          spellCheck={false}
          aria-label="Feldname"
          onFocus={() => useStormBoardStore.getState().beginGesture()}
          onBlur={() => {
            commitKey();
            useStormBoardStore.getState().endGesture();
          }}
          onChange={(e) => setKeyDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
        <select
          className="dock-field w-[5.5rem] py-1 text-[0.68rem]"
          value={kind}
          aria-label="Werttyp"
          onChange={(e) => onChangeValue(defaultForKind(e.target.value as ValueKind))}
        >
          <option value="string">string</option>
          <option value="number">number</option>
          <option value="boolean">boolean</option>
          <option value="null">null</option>
          <option value="object">object</option>
          <option value="array">array</option>
        </select>
        <button
          type="button"
          className="rounded p-1 text-[var(--muted)] hover:bg-[var(--control-hover)] hover:text-red-300"
          title="Feld löschen"
          aria-label="Feld löschen"
          onClick={onRemove}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-1">
        <ValueEditor value={value} kind={kind} onChange={onChangeValue} />
      </div>
    </li>
  );
}

function ValueEditor({
  value,
  kind,
  onChange,
}: {
  value: JsonValue;
  kind: ValueKind;
  onChange: (next: JsonValue) => void;
}) {
  if (kind === "null") {
    return <p className="px-1 text-[0.68rem] italic text-[var(--muted)]">null</p>;
  }

  if (kind === "boolean") {
    return (
      <label className="flex items-center gap-2 px-1 text-[0.72rem] text-[var(--text)]">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
        />
        {value ? "true" : "false"}
      </label>
    );
  }

  if (kind === "number") {
    return (
      <input
        type="number"
        className="dock-field py-1 font-mono text-[0.72rem]"
        value={typeof value === "number" ? value : 0}
        onFocus={() => useStormBoardStore.getState().beginGesture()}
        onBlur={() => useStormBoardStore.getState().endGesture()}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    );
  }

  if (kind === "string") {
    return (
      <input
        type="text"
        className="dock-field py-1 font-mono text-[0.72rem]"
        value={typeof value === "string" ? value : ""}
        placeholder="Wert / Typ"
        spellCheck={false}
        onFocus={() => useStormBoardStore.getState().beginGesture()}
        onBlur={() => useStormBoardStore.getState().endGesture()}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  if (kind === "array") {
    const text = JSON.stringify(Array.isArray(value) ? value : [], null, 2);
    return (
      <ArrayTextEditor
        text={text}
        onCommit={(parsed) => onChange(parsed)}
      />
    );
  }

  // object
  const nested = asObject(value);
  const nestedEntries = Object.entries(nested);

  return (
    <div className="ml-1 space-y-1 border-l border-[var(--border)] pl-2">
      {nestedEntries.map(([k, v]) => (
        <ObjectEntryRow
          key={k}
          entryKey={k}
          value={v}
          siblings={nested}
          onRename={(nextKey) => {
            if (!nextKey || nextKey === k || nextKey in nested) return;
            const next: Record<string, JsonValue> = {};
            for (const [nk, nv] of Object.entries(nested)) {
              next[nk === k ? nextKey : nk] = nv;
            }
            onChange(next);
          }}
          onChangeValue={(nextVal) => onChange({ ...nested, [k]: nextVal })}
          onRemove={() => {
            const { [k]: _r, ...rest } = nested;
            onChange(rest);
          }}
        />
      ))}
      <button
        type="button"
        className="flex items-center gap-1 rounded px-1 py-0.5 text-[0.68rem] text-[var(--muted)] hover:text-[var(--text)]"
        onClick={() => {
          const key = uniqueKey(nested);
          onChange({ ...nested, [key]: "string" });
        }}
      >
        <Plus className="h-3 w-3" />
        Unterfeld
      </button>
    </div>
  );
}

function ArrayTextEditor({
  text,
  onCommit,
}: {
  text: string;
  onCommit: (parsed: JsonValue[]) => void;
}) {
  const [draft, setDraft] = useState(text);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(text);
    setError(null);
  }, [text]);

  return (
    <div>
      <textarea
        className="dock-field min-h-[3.5rem] font-mono text-[0.72rem]"
        value={draft}
        spellCheck={false}
        onFocus={() => useStormBoardStore.getState().beginGesture()}
        onBlur={() => {
          try {
            const parsed = JSON.parse(draft) as unknown;
            if (!Array.isArray(parsed)) {
              setError("Muss ein JSON-Array sein");
            } else {
              setError(null);
              onCommit(parsed as JsonValue[]);
            }
          } catch {
            setError("Ungültiges JSON");
          }
          useStormBoardStore.getState().endGesture();
        }}
        onChange={(e) => setDraft(e.target.value)}
      />
      {error && <p className="mt-0.5 text-[0.65rem] text-[var(--accent-2)]">{error}</p>}
    </div>
  );
}
