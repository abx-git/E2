# E2 — Collaborative Domain Modeling

Browser-based board for **Event Storming**, **Domain-Driven Design**, **BDD / Example Mapping**, **User Story Mapping**, **Event Modeling**, **Process**, **Data**, and **Freeform** (custom card types / stereotypes) with local JSON persistence (`.storm.json`).  
No server for domain data — the working file stays with the user.

**Live:** [abx-git.github.io/E2](https://abx-git.github.io/E2/)  
**Repository:** [github.com/abx-git/E2](https://github.com/abx-git/E2)

---

## Purpose of this document

This README describes **implemented features** and compares them to classic workshop methods (Brandolini, Evans/Vernon, Example Mapping, Story Mapping, Event Modeling, process/data modeling).

---

## Quick overview

| Area | Content |
|--------|--------|
| Method modes | ES · DDD · BDD · USM · EM · PROC · DATA · C4 · arc42 · Cloud · Freeform (palette/facilitator separate); the board may mix types |
| Sticky types | Method-specific catalogs + freeform stereotypes + shared notes/instructions/hotspots/links |
| Relations | 8 connection types including auto-suggestion |
| Surface | Timeline, swimlanes, bounded contexts, pan/zoom |
| Workshop | Per-mode facilitator formats + Free |
| Language | Glossary (Ubiquitous Language) |
| Uncertainty | Hotspots including status/priority |
| I/O | `.storm.json` + schema, SVG/PNG, Markdown reports |
| UX | Multi-select, align, context menus, colors |
| UI language | German / English (client-side; data → presentation) |

---

## 1. Element types (stickies)

The **palette** shows only types for the active method mode (in facilitator mode additionally restricted by phase).  
Stickies already on the board remain visible when switching modes — elements from the other method are slightly de-emphasized (dashed border).

### Event Storming

| Type | Color / shape | Method role |
|-----|--------------|-------------------|
| **Domain Event** | Orange | “What happened?” (past tense) |
| **Command** | Blue | “What should happen?” / trigger |
| **Actor** | Yellow (pill) | Who executes the command? |
| **Aggregate** | Yellow rectangle | Consistency boundary, commands → events |
| **Policy** | Purple | “When X, then Y” |
| **Read Model** | Green | Information needed for decisions |
| **External System** | Pink | Integration outside the domain |
| **UI** | Gray/white | Screen / view |
| **Note** | Cream, dashed (color selectable) | Free annotation (workshop hint) |
| **Instruction** | Teal, badge + left accent | Implementation guidance / aspects |
| **Hotspot** | Red, rotated | Open question, conflict, ambiguity |
| **Link** | Sky blue (pill) | External URL or jump to a board view |
| **Pivotal Event** | Wide yellow block | Phase change / significant breakpoint |

### Domain-Driven Design

| Type | Color / shape | Method role |
|-----|--------------|-------------------|
| **Subdomain** | Violet | Problem space: Core / Supporting / Generic |
| **Entity** | Turquoise | Identity over time |
| **Value Object** | Cyan | Value without identity |
| **Aggregate** | Yellow rectangle | Consistency boundary (shared with ES) |
| **Domain Service** | Indigo | Domain logic without a natural entity home |
| **Repository** | Stone | Persistence access for aggregate roots |
| **Factory** | Lime | Complex creation |
| **Domain Event** | Orange | Meaningful state change (shared) |
| **External System** | Pink | Integration (shared) |
| **Note / Instruction / Hotspot** | Cream / Teal / Red | Annotations (shared) |

### BDD / Example Mapping

| Type | Color / shape | Method role |
|-----|--------------|-------------------|
| **Rule** | Amber | Business rule for the story |
| **Example** | Green | Concrete scenario (Given/When/Then) |
| **Question** | Sky blue | Open spec question |
| **Actor** | Yellow (pill) | Who is affected? |
| **Note / Instruction / Hotspot** | Cream / Teal / Red | Annotations |

### User Story Mapping

| Type | Color / shape | Method role |
|-----|--------------|-------------------|
| **Activity** | Blue, wide | Backbone of the user journey |
| **User Task** | Light blue | Task under an activity |
| **User Story** | Yellow | Deliverable story |
| **Release** | Pink, wide | Horizontal release / MVP slice |
| **Actor** | Yellow (pill) | Persona / role |
| **Note / Instruction / Hotspot** | Cream / Teal / Red | Annotations |

### Event Modeling

| Type | Color / shape | Method role |
|-----|--------------|-------------------|
| **Slice** | Orange, wide | Vertical slice (UI→Command→Event→View) |
| **Domain Event / Command / Read Model / UI / Policy / Actor / External System** | as in ES | Building blocks of the timeline |
| **Note / Instruction / Hotspot** | Cream / Teal / Red | Annotations |

### Process (BPMN-lite)

| Type | Color / shape | Method role |
|-----|--------------|-------------------|
| **Start** | Green, round | Process start / trigger |
| **Activity** | Blue | Work step (role, system, I/O, duration) |
| **Gateway** | Diamond | XOR / AND / OR branch with conditions |
| **End** | Red, round | Process end / outcome |
| **Note / Instruction / Hotspot** | Cream / Teal / Red | Annotations |

### Data (ER-lite)

| Type | Color / shape | Method role |
|-----|--------------|-------------------|
| **Entity** | Turquoise | Table / concept (PK, attributes, unique keys) |
| **Association** | Gray | Relationship with cardinality (1:1, 1:n, …) |
| **Note / Instruction / Hotspot** | Cream / Teal / Red | Annotations |

### Editable per element

- Label, description  
- **Show on card:** description / attributes / methods / web links (detail pane or right-click)  
- **Web links:** arbitrary http(s) URLs with optional title; optionally on the card as a clickable list  
- Position and size (drag, handles, numbers in the right pane)  
- Assignment to swimlane / bounded context (automatic when enclosed; still available via right-click)   
- “Recurring” (right-click)  
- **Domain Event / Aggregate:** event schema (value editor or raw JSON)  
- **Aggregate:** attributes, methods, invariants  
- **Entity:** identity fields, attributes, operations  
- **Value Object:** attributes/components, “immutable” flag  
- **Domain Service:** operations, “stateless” flag  
- **Repository:** aggregate root, operations  
- **Factory:** produced type, operations  
- **Hotspot:** status (open/resolved), priority (low/medium/high)
- **Note:** background color (detail pane or right-click)
- **Instruction:** fixed styling for implementation instructions (no color picker)
- **Link:** target type (URL or view), URL or view selection; open via icon / detail pane
- **Subdomain:** kind (Core / Supporting / Generic)
- **Rule:** criteria / notes  
- **Example:** Given / When / Then  
- **Question:** status (open/clarified)  
- **User Story:** persona, MoSCoW priority, estimate, acceptance criteria  
- **Release / Slice:** goal; slice additionally systems/lanes  
- **Process Start / End:** trigger or outcome  
- **Process Activity:** role, system, inputs/outputs, duration  
- **Process Gateway:** kind (XOR/AND/OR), conditions/paths  
- **Data Entity:** table name, identity fields, attributes, unique keys  
- **Data Association:** cardinality, left/right entity, relationship attributes  

> **Note:** List fields (attributes, methods, …) are maintained row by row in the detail pane.

---

## 2. Relations

Elements can be connected (canvas **Connect**, arrow on sticky, or right-click → start relation).

**Undo/Redo:** app bar or ⌘Z / Ctrl+Z (undo) and ⌘⇧Z / Ctrl+Y (redo). **Duplicate:** ⌘D / Ctrl+D (selection). **Edit status** (cards & connectors, badge with icon): ⌘/Ctrl+1 OK · +2 ! · +3 ? · +4 In progress · +5 New (again = remove). Dragging a group counts as one step. History is not stored in `.storm.json`.

| Type | Meaning (UI) |
|-----|----------------|
| `triggers` | triggers |
| `reactsWith` | reacts with |
| `informs` | informs (dashed) |
| `executedBy` | executed by |
| `invokes` | invokes |
| `causal` | causes |
| `contains` | contains |
| `annotates` | annotates (dashed; note/instruction ↔ sticky) |

The relation type is **heuristically suggested** when connecting and can be changed via right-click. Optional label in the detail pane.

---

## 3. Canvas & structure

### Navigation & selection

- **Pan:** trackpad scroll, space + drag, or middle mouse button  
- **Zoom:** pinch / Ctrl+scroll (⌘+scroll), ± bottom-right on canvas (approx. 25%–250%)
- **Selection:** click, Shift+click, marquee drag  
- **Move:** one element or the multi-selection  
- **Resize:** eight handles on the selected element  
- **Align:** right-click with ≥2 elements (left/center/right, top/middle/bottom, distribute, same width/height)  
- **Create:** double-click empty canvas, right-click → add element, or **1–9/0** (type) + **Enter/A** (viewport center)  
- **Title:** double-click a sticky → inline edit (Enter save, Esc cancel; notes/instructions: ⌘/Ctrl+Enter)  
- **Actions:** right-click context menu (delete, assignment, hotspot status, help, …)

### Timeline

- Show/hide (canvas **View → Timeline**)  
- Vertically movable  
- Start/end labels (right-click)  
- Optional **Snap T**: elements snap to the timeline height  

Methodically: chronological axis left → right for domain events.

### Swimlanes

- Create via canvas toolbar  
- Move and resize (like bounded contexts)  
- Elements are **assigned automatically** when fully inside the lane (and removed when no longer fully inside)  
- When **moving** a lane, fully contained elements move with it  
- Manual assignment still available via right-click  

Methodically: parallel actors / streams / responsibilities.

### Bounded contexts

- Draw a rectangle on the surface (“Bounded Context” mode)  
- Move, scale, label, purpose, color  
- Elements are **assigned automatically** when fully enclosed (overlapping BCs: the smallest one wins)  
- When **moving** a BC, fully contained elements move with it  
- Manual assignment still available via right-click  
- **Context map:** canvas button → click two BCs; patterns (ACL, Shared Kernel, Customer/Supplier, …) via right-click on the line  

Methodically: clusters by language and responsibility; context-map patterns model interfaces between contexts.

---

## 4. Method modes, facilitator & workshop formats

In the app bar: method dropdown (**Event Storming**, DDD, …, **Freeform**). The mode controls the palette and facilitator formats — not board content. Workshop format and facilitator live under **Session**.

### Freeform

Create, rename, and color custom card types in the left palette. Types apply per view and appear in color on cards. Starters: Concept, Interface, Class — all editable. Annotations remain available.

### Event Storming

| Format | Focus |
|--------|--------|
| **Free** | All ES types, no phase guidance |
| **Big Picture** | Chaotic Exploration → Timeline → Consistency → Commands/Actors → Policies/Read Models → Bounded Contexts → Hotspots → Wrap-Up |
| **Process Modeling** | Commands & Policies → Pivotal Events → refine contexts → Aggregates & Read Models |
| **Software Design** | Aggregate Design → Event Schemas → Repository & Service |

### Domain-Driven Design

| Format | Focus |
|--------|--------|
| **Free** | All DDD types, no phase guidance |
| **Strategic Design** | Subdomains → Ubiquitous Language → Bounded Contexts → Context Map → Wrap-Up |
| **Tactical Design** | Aggregates & Entities → Value Objects → Services & Factories → Repositories → Domain Events → Wrap-Up |

### BDD / Example Mapping

| Format | Focus |
|--------|--------|
| **Free** | Rules, Examples, Questions, … |
| **Example Mapping** | Story & Rules → Examples → Questions → Wrap-Up |

### User Story Mapping

| Format | Focus |
|--------|--------|
| **Free** | Activities, Tasks, Stories, Releases |
| **Story Mapping** | Backbone → Tasks → Stories → Releases |

### Event Modeling

| Format | Focus |
|--------|--------|
| **Free** | Slice + ES building blocks |
| **Event Modeling** | Events → Commands & UI → Views & Automation → Vertical Slices |

### Process

| Format | Focus |
|--------|--------|
| **Free** | Start, activities, gateways, end |
| **Process modeling** | Happy path → decisions (gateways) → roles & systems |

### Data

| Format | Focus |
|--------|--------|
| **Free** | Entities & associations |
| **Data modeling** | Entities → attributes & keys → relationships |

In facilitator mode:

- Palette limited to **allowed types for the phase** (in the current mode)  
- Checklist, recommended duration, phase transitions  
- Help dialogs for elements, relations, and phases  

---

## 5. Language, hotspots, validation

| Feature | Content |
|----------|--------|
| **Glossary** | Terms + definitions (Ubiquitous Language), Markdown export |
| **Hotspot list** | Overview of all hotspots, click selects; status/priority visible |
| **Validation** | Hints on the selected element (e.g. past tense for events, isolated elements, hotspot without description) — soft, non-blocking |
| **Help** | Contextual explanations (palette, sidebar, right-click, facilitator) |

---

## 6. Persistence & export

### Working file

- Primary: local `.storm.json` (File System Access API where available) — **one document, multiple views (tabs)**  
- Format **v2** (`views[]`); older v1 files are migrated on open  
- Alternatives: open file / paste JSON — with unsaved changes: Save / Don’t save / Cancel (like desktop apps)  
- File menu: **New**, **Open…**, **Save**, **Save as…**, **Close**, **Rename…**  
- **Import as new page:** Data → *Import as new page* — views from a `.storm.json` as new tabs; **colors / title / glossary / workshop mode** stay from the open file  
- **JSON as new view:** Data → export *Paste JSON*, file *JSON as new view*, or tab bar *JSON* — reads E2/AI JSON from the system clipboard and creates new view(s) (existing tabs remain)  
- **Share board link:** Data → *Share board link…* — validates remote URL to a public `.storm.json` (schema); on success share link with `?board=…`. Opening the link asks for confirmation then loads locally (CORS must allow it)  
- **Overwrite protection:** autosave never writes an empty/foreign state over a non-empty working file. When opening another file, save is blocked until its content is loaded — the previous editor state is never written into the new file. Backup / remote and collaboration pause saving — continue with “Save as…”. If another tool changes the working file, E2 adopts the file state automatically (visible tab, ~1 s poll); if editor changes were open, an editor safety copy is downloaded first.  
- Autosave, conflict handling on external change  
- **Backup:** Data → with history (timestamped copies) or without history (always overwrite the same backup file); manual or every 5–30 min. Opening a backup does not overwrite the working file.  
- During **collaboration** the working file is **not** mirrored (autosave paused); on leave: keep board or restore state from before the room (no silent disk overwrite)  
- **Workshop** toggle: in collab sync the active tab for everyone (otherwise local like viewport)  
- PWA / offline-capable (Serwist)

### Export

| Format | Use | Typical for |
|--------|--------|-------------|
| **JSON** | Full board state including schema reference | all |
| **JSON Schema** | For other tools that produce valid boards | all |
| **Copy for AI** | Mode schema + view data (with layout) to clipboard — one prompt package for AI; return path: Data JSON → paste AI | all |
| **E2V schema** | English LLM prompt + E2V format spec **without** view data — reusable in prompts | all |
| **Mermaid / PlantUML** | Diagram text per view; import with auto-layout | all |
| **SVG / PNG** | Visual snapshot; SVG as `.drawio.svg` with embedded diagram — editable in [diagrams.net](https://app.diagrams.net) / Draw.io | all |
| **Hotspot report (MD)** | Open items | all |
| **Glossary (MD)** | Ubiquitous Language | all |
| **Context map (MD)** | Contexts + context-map patterns + cross-boundary relations | ES, DDD |
| **Event catalog (MD)** | Domain events including schema | ES, Event Modeling |
| **Domain model (MD)** | Aggregates, entities, VOs, services, repos, factories, subdomains | DDD |
| **Example mapping (MD)** | Rules, examples (Given/When/Then), questions | BDD |
| **Story map (MD)** | Activities, tasks, stories, releases | User Story Mapping |
| **Event model / slices (MD)** | Slices with contained events/commands/read models | Event Modeling |
| **Process model (MD)** | Start, activities (role/system/I/O), gateways, end | Process |
| **Data model (MD)** | Entities (PK/attributes/keys), associations, relations | Data |

Schema & format docs: [`docs/BOARD-JSON-SCHEMA.md`](docs/BOARD-JSON-SCHEMA.md), [`public/schemas/board-snapshot-v2.schema.json`](public/schemas/board-snapshot-v2.schema.json), [`public/schemas/ai-board-context-v1.schema.json`](public/schemas/ai-board-context-v1.schema.json).

---

## 7. Presentation

Under **Data → Presentation**:

- **Workspace** (canvas) color  
- **Sidebars** / dock color  
- Presets (Waypoints, Midnight, Workshop light, Paper)  

Sticky colors stay fixed by method (Event Storming convention). Settings are saved in the board JSON.

---

## Comparison: Event Storming aspects vs. E2

Legend: ✅ present · 🟡 partial · ❌ missing / intentionally not

### Big Picture / Discovery

| Aspect | Status | In E2 |
|--------|--------|--------|
| Collect domain events (Chaotic Exploration) | ✅ | Orange stickies, facilitator phase |
| Past tense / event wording | 🟡 | Help + soft validation |
| Chronological timeline | ✅ | Timeline + snap |
| Parallel streams | ✅ | Swimlanes (auto-assign on enclosure) |
| Commands | ✅ | Blue stickies |
| Actors / personas | ✅ | Actor stickies |
| Policies | ✅ | Purple stickies |
| Read models / views | ✅ | Green + UI type |
| External systems | ✅ | Pink stickies |
| Hotspots / open questions | ✅ | Type + list + status/priority |
| Pivotal events | ✅ | Dedicated type + process modeling phases |
| Recognize/cluster bounded contexts | ✅ | Draw, name, assign |
| Quantity before quality (many stickies) | ✅ | Free creation, no artificial limits |

### Process Modeling

| Aspect | Status | In E2 |
|--------|--------|--------|
| Fine-grained process along the timeline | ✅ | Canvas + process modeling format |
| Policies between events and commands | ✅ | Type + relation `reactsWith` |
| Pivotal events as phase boundaries | ✅ | Type + facilitator checklists |
| Swimlanes for actors/systems | ✅ | Auto-assign on full enclosure |

### Software Design / DDD bridge

| Aspect | Status | In E2 |
|--------|--------|--------|
| Aggregates | ✅ | Type + methods + schema fields |
| Event schemas | ✅ | JSON on event/aggregate + event catalog export |
| Aggregate invariants | ✅ | Detail pane (one line per invariant) + soft hint |
| Context map (visual) | ✅ | BC boxes + context-map lines + Markdown report |
| Context-map patterns (ACL, Shared Kernel, Customer/Supplier, …) | ✅ | BC↔BC relations, pattern menu, styles |
| Ubiquitous Language | 🟡 | Glossary; no binding to sticky labels |
| Microservice / module cut | 🟡 | Via BC clusters and cross-boundary report |

### Workshop practice

| Aspect | Status | In E2 |
|--------|--------|--------|
| Phase guidance / facilitator | ✅ | Three formats + checklists |
| Type restriction per phase | ✅ | Filtered palette |
| Recommended time boxes | ✅ | Phase countdown start/pause/reset in facilitator |
| Multi-user / real-time collaboration | ✅ | Room with single-writer, CAS writes, sync conflict dialog (no silent overwrite) |
| Undo/redo | ✅ | History stack, app bar, ⌘Z / Ctrl+Z |
| Paper workshop extras (Opportunity, Problem, Value Stream overlays) | ❌ | Only the 10 core types |

### Tooling / handoff

| Aspect | Status | In E2 |
|--------|--------|--------|
| Local persistence | ✅ | `.storm.json` |
| Interchangeable format | ✅ | Schema + `$schema` |
| Image / report export | ✅ | SVG, PNG, multiple MD reports |
| Miro direct import | ❌ | No native Miro format (CSV/paste possible outside) |

---

## Quick start

1. Create or open a working file under **Data**.  
2. Pick an element type in the left palette → **double-click** the canvas — or **1–9/0** for type and **Enter/A** to create at viewport center.  
3. Relations: canvas **Connect** or arrow on sticky.  
4. Structure: canvas **View** / swimlane / bounded context.  
5. Finishing touches: right-click menu; text/schema/invariants in the right pane.  
6. Optionally enable a facilitator format under **Session** (including phase timer).  
7. Export via **Data**.  
8. UI language (**German** / **English**) under **Data → Presentation** (or `?lang=en` once).

Details on the i18n infrastructure: [`docs/i18n.md`](docs/i18n.md).

---

## GitHub Pages

See [`docs/GITHUB-PAGES.md`](docs/GITHUB-PAGES.md).

```bash
npm run build:static
npx serve out
# → http://localhost:3000/E2/
```

## Development

```bash
npm install
npm run dev
npm run test:run
```

## Tech Stack

Next.js 15, React 19, TypeScript, Tailwind CSS, Zustand, Serwist (PWA).  
Persistence pattern inspired by [T2](https://github.com/abx-git/T2).

---

## Method coverage summary

E2 covers the **core of Event Storming**: all common sticky types, relations, timeline, swimlanes, bounded contexts, hotspots, glossary, and guided workshop phases (Big Picture → Process → Design) including soft validation and exports for handoff.

**Optional real-time collaboration** uses Supabase when configured: participants join with a **room code**, updates use **compare-and-swap (CAS)** writes with a **single writer** at a time, and sync conflicts surface in a **dialog** rather than silently overwriting local or disk state. The working file is not mirrored during a session (autosave pauses); leaving a room lets you keep the board or restore the pre-room state. See [`docs/COLLABORATION.md`](docs/COLLABORATION.md).

**Still partial or intentional gaps:** binding glossary terms to sticky labels; spatial assignment to lanes/contexts now happens automatically on full enclosure.

If you want to prioritize gaps, the largest method levers are typically: **glossary binding** and auto-assignment.

---

## License

MIT © Andreas Bergmann — see [`LICENSE`](LICENSE).  
**Beta:** The `.storm.json` file format may still change and become incompatible.
