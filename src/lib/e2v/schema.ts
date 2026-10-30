import { E2V_FORMAT, E2V_SCHEMA_ID, E2V_VERSION } from "@/lib/e2v/constants";

/** Compact machine-readable schema (for download / tooling). */
export const E2V_SCHEMA_DOCUMENT = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: E2V_SCHEMA_ID,
  title: "E2 View Compact (E2V)",
  description:
    "Line-oriented, layout-preserving export for one E2 diagram view or a full board document.",
  type: "object",
  properties: {
    format: { const: E2V_FORMAT },
    version: { const: E2V_VERSION },
    magicFirstLine: { const: "# e2v/1" },
  },
  required: ["format", "version"],
  e2vGrammar: {
    header: ["# e2v/1", "@format", "@version", "@scope document|view", "@exported ISO-8601", "@title"],
    documentMeta: ["@activeViewId", "@workshopMode 0|1", "@appearance JSON", "g term definition", "ai …"],
    viewMeta: [
      "@view id name modelingMode workshopFormat facilitatorEnabled facilitatorPhase",
      "@v viewportX viewportY zoom",
      "@t startLabel endLabel visible",
      "@snap snapToTimeline snapToGrid",
      "@id alias realId",
      "@ct id name fill stroke ink",
    ],
    records: {
      s: "swimlane: id label x y w h [color fillOpacity borderColor borderOpacity locked]",
      b: "boundedContext: id label x y w h [purpose detailViewId colors… locked]",
      e: "element: id type x y [w h rot z swimlane bc aggregate subdomain detailView label]",
      r: "sticky relation between elements",
      cr: "context-map relation between bounded contexts",
      cn: "connector with endpoints element:|bc:|swimlane:|point:x,y",
      ln: "free canvas line segment",
    },
    extensions: ["@desc elementAlias text", "@meta elementAlias JSON"],
    footer: ["@endview"],
  },
} as const;

export function stringifyE2vSchema(): string {
  return JSON.stringify(E2V_SCHEMA_DOCUMENT, null, 2);
}

/** English instructions for LLMs (embedded in clipboard packages). */
export const E2V_ENGLISH_LLM_PROMPT = `You are editing an Event Storming / domain modeling board for the E2 app.

## Your task
- Produce or modify **E2V** (\`# e2v/1\`) text that round-trips into the canvas **with exact layout** (positions, sizes, rotation, z-order, regions, connectors).
- Do **not** replace layout with auto-layout. Every sticky needs numeric \`x\`, \`y\`; set \`width\`/\`height\` when not default.
- Prefer **tab-separated** rows (canonical export). Spaces between columns are accepted; use JSON-quoted strings for labels with spaces.
- Use canonical \`elementType\` values (\`domainEvent\`, \`command\`, \`actor\`, …) or common aliases (\`event\`, \`role\`).
- Relations: full row \`r <id> <type> <source> <target>\` or shorthand \`r <source> <target>\` (defaults to \`triggers\`).
- Connectors: \`cn <id> <sourceEp> <targetEp>\` or shorthand \`cn element:e1 element:e2\`.

## Wire format
- First line: \`# e2v/1\`
- \`@format event-storming-tool-e2v\`, \`@version 1\`
- One view: \`@scope view\` + single \`@view …\` block ending with \`@endview\`
- Full file: \`@scope document\`, optional \`g\` glossary rows, multiple \`@view\` blocks

## Core rows (tabs between columns)
- \`@view <id> <name> <modelingMode> <workshopFormat> <0|1 facilitator> <phaseIndex>\`
- \`@v <panX> <panY> <zoom>\`
- \`e <id> <elementType> <x> <y> [w h [rot [z]]] [swimlaneId] [bcId] … <label>\`
- \`s\` swimlane rectangle, \`b\` bounded context rectangle (with x,y,w,h)
- \`r\` element relation (triggers, causal, …), \`cr\` BC context-map pattern
- \`cn\` board connector: endpoints \`element:e1\`, \`bc:b0\`, \`swimlane:s0\`, or \`point:120,80\`
- \`ln\` free line: x1 y1 x2 y2
- \`@desc <elementId> <text>\`, \`@meta <elementId> <JSON metadata>\` — use \` ↵ \` (space-arrows-space) between lines in @desc/glossary text instead of JSON \`\\n\`
- \`@id <alias> <stable-id>\` optional; use short ids (\`e0\`, \`e1\`) consistently in the block

## Layout rules
- Preserve coordinates when editing existing boards.
- Event Storming: timeline left→right; actors above commands above events.
- Keep relation endpoints referencing existing element/bc ids in the same view.

## Output
Return only the **data** fence content when asked for data alone; otherwise follow the package layout with \`## schema\`, \`## prompt\`, and \`## data\` sections.
Paste target in E2: **Daten → E2V einfügen** or **E2V kopieren** roundtrip package.
`;

/**
 * Machine-readable rules for **selection subset** roundtrips only (not full-board export).
 * Embedded in selection clipboard packages instead of the full E2V schema.
 */
export const E2V_SELECTION_SCHEMA_DOCUMENT = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: `${E2V_SCHEMA_ID}#selection-subset`,
  title: "E2V selection subset (partial view fragment)",
  description:
    "Strict fragment: one @scope view block containing ONLY rows for the extracted selection. No document scope, glossary, or other views.",
  format: E2V_FORMAT,
  version: E2V_VERSION,
  allowedScope: "view",
  requiredHeader: ["# e2v/1", "@format", "@version", "@scope view", "@exported", "@title"],
  requiredViewWrapper: ["@view …", "@endview"],
  allowedRecordRows: ["e", "s", "b", "r", "cr", "cn", "@desc", "@meta", "@id", "@ct", "@v", "@t", "@snap"],
  forbidden: [
    "@scope document",
    "multiple @view blocks",
    "glossary g rows",
    "action item ai rows",
    "@appearance",
    "entities not present in input ## data unless user asked to add",
  ],
  outputContract:
    "Return ONLY the E2V subset text (same shape as input ## data). No markdown, no JSON schema, no commentary.",
} as const;

export function stringifyE2vSelectionSchema(): string {
  return JSON.stringify(E2V_SELECTION_SCHEMA_DOCUMENT, null, 2);
}

/** Instructions for LLMs editing an extracted canvas selection (subset only). */
export const E2V_SELECTION_LLM_PROMPT = `You edit a **selection fragment** of one E2 canvas view. The user message includes \`## data\` with the **only** objects you may describe.

## Hard output rule (mandatory)
- Your **entire** reply must be **only** the E2V subset text: from \`# e2v/1\` through \`@endview\`.
- **No** markdown fences, **no** \`## schema\` / \`## prompt\`, **no** prose before or after, **no** JSON.
- **No** full board, **no** \`@scope document\`, **no** glossary (\`g\`), **no** second \`@view\` block, **no** stickies/connectors/regions **outside** the input \`## data\` unless the user explicitly asks to add one.

## Subset content rules
- Keep \`@view\` **id** and **name** exactly as in the input \`## data\`.
- \`@scope\` must stay \`view\` (single fragment).
- Change only what the user asks; leave every other row, **id**, and **x/y/w/h/rot** unchanged.
- **Preserve stable ids** (\`e…\`, \`cn…\`, \`r…\`, …) unless adding/removing as requested.
- **Always keep every \`cn\` connector row** from the input (same \`cn\` id and \`element:\`/\`bc:\`/\`swimlane:\` endpoints) unless the user asks to delete that link.
- To **remove** a sticky card from the selection, omit its \`e\` row (app deletes on paste).
- To **add**, use new unique ids near related items; do not move unrelated coordinates.
- Do **not** auto-layout; layout is explicit in E2V.

## Row reference (subset)
- Header: \`# e2v/1\`, \`@format event-storming-tool-e2v\`, \`@version 1\`, \`@scope view\`, \`@exported\`, \`@title\`
- One \`@view …\` … \`@endview\` block with only the \`e\` / \`s\` / \`b\` / \`r\` / \`cr\` / \`cn\` / \`@desc\` / \`@meta\` / \`@id\` rows from the input (after your edits).

Paste target: E2 context menu → **E2V anwenden** (same view as extract).
`;
