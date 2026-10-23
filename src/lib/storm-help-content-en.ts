import type { ElementType } from "@/types/storm-element";
import type { ContextMapPattern, RelationType } from "@/types/storm-relation";
import type { HelpDialogModel } from "@/lib/storm-help";

export const ELEMENT_HELP_EN: Record<ElementType, HelpDialogModel> = {
  domainEvent: {
    title: "Domain Event",
    subtitle: "Orange sticky — “What happened?”",
    paragraphs: [
      "A fact from the past. Phrase it in past tense.",
      "Placement: along the timeline (left → right).",
    ],
    bullets: [
      "Example: “Order Placed”, “Payment Processed”",
      "Start with quantity: capture many events first, then sort",
      "Merge duplicate events later",
    ],
  },
  command: {
    title: "Command",
    subtitle: "Blue sticky — “What triggers the event?”",
    paragraphs: [
      "An imperative action that kicks off a state change or process.",
      "Placement: before the event it triggers.",
    ],
    bullets: [
      "Example: “Place Order”, “Confirm Delivery”",
      "Commands are often mapped to an aggregate or handler later",
    ],
  },
  actor: {
    title: "Actor / User",
    subtitle: "Small yellow — “Who does it?”",
    paragraphs: ["Who executes the command (person, role, or a system as initiator)."],
    bullets: ["Pattern: Actor → Command → Event", "Place the actor note typically above the command"],
  },
  aggregate: {
    title: "Aggregate",
    subtitle: "Yellow rectangle — aggregate root + boundary",
    paragraphs: [
      "Consistency boundary and aggregate root in one element: label = root name, area = space for entities and value objects.",
      "In Event Storming, between command(s) and event(s); in tactical DDD, drag entities and value objects inside.",
    ],
    bullets: [
      "Fully enclosed stickies belong to the aggregate and move with it",
      "Document methods and invariants in the detail panel",
    ],
  },
  policy: {
    title: "Policy",
    subtitle: "Purple — “When X, then Y”",
    paragraphs: [
      "Business rule or automation that reacts to events.",
      "Placement: between an event and the following command.",
    ],
    bullets: [
      'Example: "When payment received, confirm order"',
      "Ask questions if policies seem contradictory",
    ],
  },
  readModel: {
    title: "Read Model",
    subtitle: "Green — “What information do I need?”",
    paragraphs: ["Information or queries needed for decisions or to execute a command."],
    bullets: ["Placement: before commands", "Often: screens, lists, status views"],
  },
  externalSystem: {
    title: "External System",
    subtitle: "Pink — “Integration outside the domain”",
    paragraphs: ["Third-party system outside the boundary that emits events or receives commands."],
    bullets: ["Mark external dependencies", "Helps later with service and API design"],
  },
  ui: {
    title: "UI",
    subtitle: "White — “View / screen”",
    paragraphs: [
      "User interface or UI component that displays events and triggers commands.",
    ],
    bullets: ["Useful for Actor → Command context", "Can later enable direct screen checks"],
  },
  note: {
    title: "Note",
    subtitle: "Cream — free workshop annotation",
    paragraphs: [
      "Freely placed remark that is not part of the Event Storming notation.",
      "Attach to stickies with Connect / the arrow handle (relation “annotates”).",
    ],
    bullets: [
      "For questions, parking-lot ideas, facilitator hints",
      "Multi-line text on the card",
      "Background color in the detail panel or via right-click",
    ],
  },
  instruction: {
    title: "Instruction",
    subtitle: "Teal — guidance for implementation",
    paragraphs: [
      "Marks aspects to consider or implement during delivery.",
      "Clearer than a free note: labeled “Instruction” on the card with a fixed color.",
      "Attach to stickies with Connect / the arrow handle (relation “annotates”).",
    ],
    bullets: [
      "For DoD hints, edge cases, NFRs, technical constraints",
      "Multi-line text — ⌘/Ctrl+Enter to save",
      "Available alongside note and hotspot in all methods",
    ],
  },
  hotspot: {
    title: "Hotspot",
    subtitle: "Red (15° slant) — “Open question / conflict”",
    paragraphs: ["Marks uncertainty, contradictions, friction, or rules not yet understood."],
    bullets: [
      "Prioritize hotspots and resolve them at the end",
      "Typical hotspot idea: detail later",
    ],
  },
  link: {
    title: "Link",
    subtitle: "Compact chip — external URL or board view",
    paragraphs: [
      "Navigation, not a domain concept: points to a web page or switches to another view on the board.",
      "Set the target in the detail panel. Double-click or the icon opens it; without a target the chip appears dashed.",
    ],
    bullets: [
      "External: http(s) URL (https is added if the protocol is omitted)",
      "Internal: pick an existing view — icon shows the board symbol",
      "All card types can also carry web links in the detail panel",
      "In the palette under annotations, separate from method elements",
      "Relation “annotates” to other stickies is supported",
    ],
  },
  pivotalEvent: {
    title: "Pivotal Event",
    subtitle: "Yellow long block — “Phase change”",
    paragraphs: [
      "Significant event that changes the course or character of the process.",
      "Helps spot time or boundary shifts.",
    ],
    bullets: ["Placement: prominent on the timeline", "Often hints at bounded contexts"],
  },
  entity: {
    title: "Entity",
    subtitle: "Teal — identity over time",
    paragraphs: [
      "Domain object with stable identity; attributes may change.",
      "Usually inside an aggregate — drag into the aggregate boundary.",
    ],
    bullets: [
      "Example: “Customer”, “Order Line”",
      "Maintain identity fields and attributes in the detail panel",
      "Operations describe behavior changes",
      "Equality by ID, not by all attributes",
    ],
  },
  valueObject: {
    title: "Value Object",
    subtitle: "Cyan — value without identity",
    paragraphs: [
      "Describes properties by value; interchangeable when the structure matches.",
      "Ideally immutable.",
    ],
    bullets: [
      "Example: “Money”, “Address”, “Date Range”",
      "List attributes / components in the detail panel",
      "Set the “Immutable” flag",
      "Equality by attributes",
    ],
  },
  domainService: {
    title: "Domain Service",
    subtitle: "Indigo — operation without a natural entity home",
    paragraphs: [
      "Domain logic that does not naturally belong to an entity or value object.",
      "Stateless with respect to the process, but business-relevant.",
    ],
    bullets: [
      "Only when no entity is responsible",
      "Document operations in the detail panel",
      "Check the “Stateless” flag",
      "Name from the ubiquitous language",
    ],
  },
  repository: {
    title: "Repository",
    subtitle: "Stone — persistence access",
    paragraphs: [
      "Abstraction for loading and saving aggregate roots.",
      "Keeps infrastructure out of the domain model.",
    ],
    bullets: [
      "Name the aggregate root in the detail panel",
      "Operations: findById, save, …",
      "No SQL/ORM inside entities",
    ],
  },
  factory: {
    title: "Factory",
    subtitle: "Lime — complex creation",
    paragraphs: [
      "Encapsulates creating aggregates or complex objects.",
      "Enforces invariants at construction time.",
    ],
    bullets: [
      "“Creates” field: target type / aggregate",
      "Operations for create / reconstitute",
      "Useful for multi-step initialization",
    ],
  },
  subdomain: {
    title: "Subdomain",
    subtitle: "Violet boundary — problem-space area",
    paragraphs: [
      "Part of the problem space as an area: Core (differentiating), Supporting, or Generic.",
      "Strategic DDD — often a precursor to bounded contexts. Drag elements into the area.",
    ],
    bullets: [
      "Set kind in the detail panel (Core / Supporting / Generic)",
      "Fully enclosed stickies are assigned and move with the area",
      "Do not confuse with bounded context (problem vs. solution)",
    ],
  },
  rule: {
    title: "Rule",
    subtitle: "Amber — business rule (Example Mapping)",
    paragraphs: [
      "Business rule or constraint for the story — without implementation detail yet.",
      "Forms the column or cluster that examples belong under.",
    ],
    bullets: [
      "Keep it short and testable",
      "Acceptance hints in the detail panel",
      "Classic: yellow card in Example Mapping",
    ],
  },
  example: {
    title: "Example",
    subtitle: "Green — concrete scenario",
    paragraphs: [
      "Concrete example for the rule: Given / When / Then.",
      "Foundation for specs, tests, and shared understanding.",
    ],
    bullets: [
      "Given / When / Then in the detail panel",
      "One example = one scenario",
      "Edge cases as separate examples",
    ],
  },
  question: {
    title: "Question",
    subtitle: "Sky blue — open clarification",
    paragraphs: [
      "Uncertainty that blocks the spec — keep open until answered.",
    ],
    bullets: [
      "Open / resolved status in the detail panel",
      "Owner and follow-up in the description",
      "Not the same as a hotspot (workshop uncertainty vs. spec question)",
    ],
  },
  activity: {
    title: "Activity",
    subtitle: "Wide blue — backbone",
    paragraphs: [
      "User activity on the story-map backbone (left → right).",
      "Coarse user-journey steps, not technical tasks.",
    ],
    bullets: ["Read left to right", "Stack user tasks underneath"],
  },
  userTask: {
    title: "User Task",
    subtitle: "Light blue — task under an activity",
    paragraphs: [
      "Concrete task the user performs within an activity.",
    ],
    bullets: ["Place under the matching activity", "Break down into stories later"],
  },
  userStory: {
    title: "User Story",
    subtitle: "Yellow — deliverable story",
    paragraphs: [
      "Small, value-delivering increment: As a … I want … So that …",
    ],
    bullets: [
      "Persona, priority, estimate, acceptance in the detail panel",
      "Use MoSCoW priority",
    ],
  },
  release: {
    title: "Release",
    subtitle: "Wide pink — horizontal slice",
    paragraphs: [
      "Release or MVP line across the map — what ships in a version.",
    ],
    bullets: ["State the release goal", "Walking skeleton first"],
  },
  slice: {
    title: "Slice",
    subtitle: "Wide orange — vertical slice (Event Modeling)",
    paragraphs: [
      "Implementable slice: typically UI → Command → Event → View.",
    ],
    bullets: [
      "Name the slice and document systems",
      "Cluster the slice’s events on the timeline",
      "Define implementation order",
    ],
  },
  processStart: {
    title: "Process Start",
    subtitle: "Green circle — entry to the flow",
    paragraphs: ["Marks the beginning of a concrete business process."],
    bullets: ["Document the trigger (event, request, time)", "One clear start per process"],
  },
  processEnd: {
    title: "Process End",
    subtitle: "Gray circle — completion",
    paragraphs: ["Successful or alternative end of a flow."],
    bullets: ["Name the outcome", "Multiple ends allowed for alternative paths"],
  },
  processActivity: {
    title: "Activity / Step",
    subtitle: "Blue — concrete work in the process",
    paragraphs: ["A step with clear responsibility and optional system involvement."],
    bullets: [
      "Maintain role and system",
      "Inputs / outputs as attributes",
      "Order in swimlanes by role or system",
    ],
  },
  processGateway: {
    title: "Gateway",
    subtitle: "Yellow — decision / branch",
    paragraphs: ["XOR (exclusive), AND (parallel), or OR (inclusive)."],
    bullets: ["Choose gateway type", "List conditions / paths as attributes"],
  },
  dataEntity: {
    title: "Data Entity",
    subtitle: "Cyan — conceptual data object",
    paragraphs: ["Core building block of the information model (not necessarily a table)."],
    bullets: [
      "Maintain primary key / identity",
      "Attributes as “name: type”",
      "Optional table name for implementation",
    ],
  },
  dataAssociation: {
    title: "Association",
    subtitle: "Violet — relationship between entities",
    paragraphs: ["Especially useful for n:m with their own attributes."],
    bullets: [
      "Set cardinality (1:1, 1:n, n:1, n:m)",
      "Link to participating entities with relations",
      "Relationship attributes in the description or as attributes",
    ],
  },
  c4Person: {
    title: "Person",
    subtitle: "C4 Level 1 — user / actor",
    paragraphs: [
      "Human (role, persona) who interacts with software systems.",
      "Place on the context diagram around the central system — technology does not matter here.",
    ],
    bullets: [
      "Only people and software systems at Level 1",
      "Label relationships (e.g. “uses”, “sends email to”)",
      "Suitable for technical and non-technical audiences",
    ],
  },
  c4SoftwareSystem: {
    title: "Software System",
    subtitle: "C4 Level 1 — black box in context",
    paragraphs: [
      "Highest abstraction: the system as a closed box in the overall context.",
      "Use “Detail view” to zoom in — like a C4 container diagram (black box → white box).",
    ],
    bullets: [
      "Name the central system clearly; separate external systems",
      "Open detail view → model containers inside",
      "Not every zoom level is required — context + containers often suffice",
    ],
  },
  c4Container: {
    title: "Container",
    subtitle: "C4 Level 2 — application / data store",
    paragraphs: [
      "Deployable unit within a system: web app, SPA, API, database, queue, …",
      "Shows rough technical shape and responsibilities. Zoom in for components.",
    ],
    bullets: [
      "State technology / protocol (e.g. Spring Boot, PostgreSQL)",
      "Label communication between containers with relations",
      "Open detail view → component diagram (Level 3)",
    ],
  },
  c4Component: {
    title: "C4 Component",
    subtitle: "C4 Level 3 — building block in a container",
    paragraphs: [
      "Logical building block inside a container (controller, service, adapter, …).",
      "Add only when zoom adds value — often automatable or optional.",
    ],
    bullets: [
      "Brief responsibility in the description",
      "Technology optional",
      "Interfaces via relations",
    ],
  },
  archBlackbox: {
    title: "Black Box",
    subtitle: "Closed building block — C4-style zoom",
    paragraphs: [
      "Building block from the outside: name, responsibility, and interfaces — internals hidden.",
      "Works like C4: “Detail view” = zoom in → white box with inner building blocks (container / component level).",
    ],
    bullets: [
      "Context: black boxes + person / software system",
      "Open detail view for white-box drill-down",
      "Nesting: a white box can contain black boxes again",
    ],
  },
  archWhitebox: {
    title: "White Box",
    subtitle: "Opened building block — scope after zoom-in",
    paragraphs: [
      "Opened building block / dashed scope (like the system or container boundary in a C4 diagram).",
      "Shows inner components and relationships; usually created as the detail view of a black box or C4 system/container.",
    ],
    bullets: [
      "Place inner black boxes, containers, or components",
      "Drill down again for deeper zoom levels",
      "Return to overview via detail navigation",
    ],
  },
  archComponent: {
    title: "Component",
    subtitle: "Leaf building block — like C4 Level 3",
    paragraphs: [
      "Fine-grained building block inside a white box (module, service, adapter, …).",
      "Corresponds to the component level in the C4 model.",
    ],
    bullets: [
      "Optional technology in the description",
      "Relations to interfaces and neighbors",
      "Refine further as a black box when needed",
    ],
  },
  cloudBoundary: {
    title: "Cloud Boundary",
    subtitle: "Account / landing zone / tenant",
    paragraphs: [
      "Outer boundary of a cloud environment: account, subscription, project, or landing zone.",
      "Use “Detail view” to zoom in — like C4/arc42 drill-down.",
    ],
    bullets: [
      "Optionally set provider (AWS, Azure, GCP, …)",
      "Regions as labels or multiple boundaries",
      "Open detail view for workloads and networks",
    ],
  },
  cloudNetwork: {
    title: "Network",
    subtitle: "VPC / VNet / subnet / segment",
    paragraphs: [
      "Network segment or connectivity building block — name in a provider-agnostic way.",
    ],
    bullets: [
      "CIDR / zone in the description",
      "Peering and ingress/egress as relations",
      "Couple with identity and edge",
    ],
  },
  cloudCompute: {
    title: "Compute",
    subtitle: "VM · container · function · app service",
    paragraphs: ["Runtime for workloads: servers, clusters, serverless, or PaaS apps."],
    bullets: [
      "Technology / service name (e.g. EKS, AKS, Cloud Run)",
      "Note scaling and runtime model briefly",
      "Data and messaging dependencies as relations",
    ],
  },
  cloudDataStore: {
    title: "Data Store",
    subtitle: "DB · object store · cache · warehouse",
    paragraphs: ["Persistence and storage services — relational, document, blob, cache, …"],
    bullets: [
      "Separate primary vs. analytical stores",
      "Backup / RPO in notes or hotspots",
      "Access only via defined compute / edge paths",
    ],
  },
  cloudMessaging: {
    title: "Messaging",
    subtitle: "Queue · bus · stream · pub/sub",
    paragraphs: ["Asynchronous integration between workloads and domains."],
    bullets: [
      "Name event vs. command channels clearly",
      "Capture ordering / DLQ as a hotspot",
      "Connect producers and consumers with relations",
    ],
  },
  cloudIdentity: {
    title: "Identity",
    subtitle: "IAM · directory · secrets · policies",
    paragraphs: ["Identity, access control, and secrets for the cloud environment."],
    bullets: [
      "Least privilege and trust boundaries",
      "Workload identities vs. human users",
      "Secrets and key vaults as managed service or here",
    ],
  },
  cloudEdge: {
    title: "Edge / Gateway",
    subtitle: "CDN · API gateway · WAF · load balancer",
    paragraphs: ["Entry and edge of the architecture: traffic, TLS, routing, protection."],
    bullets: [
      "Public vs. private entry points",
      "Label protocols and routing rules",
      "Couple with network and identity",
    ],
  },
  cloudManagedService: {
    title: "Managed Service",
    subtitle: "PaaS / SaaS / cloud service (catch-all)",
    paragraphs: [
      "Managed cloud or SaaS service that does not clearly fit compute, data, or messaging.",
    ],
    bullets: [
      "Set provider and product name",
      "Briefly describe responsibility and data flow",
      "Prefer more specific types when they fit",
    ],
  },
  customCard: {
    title: "Custom Card Type",
    subtitle: "Your own types in freeform mode",
    paragraphs: [
      "Cards with user-defined types — color identifies the type.",
      "Create types in the element panel on the left; color and name apply to all cards of that type.",
    ],
    bullets: [
      "Example: Interface, Class, Entity",
      "Edit type: pencil icon next to the type in the palette",
      "Annotations (note, hotspot, …) remain available",
    ],
  },
};

export const RELATION_HELP_EN: Record<RelationType, HelpDialogModel> = {
  triggers: {
    title: "Relation: triggers",
    subtitle: "Command → Event",
    paragraphs: ["Shows the trigger chain: this command leads to this event."],
    bullets: ["Typical representation: arrow with clear direction (Command → Event)"],
  },
  reactsWith: {
    title: "Relation: reactsWith",
    subtitle: "Event → Policy → Command",
    paragraphs: ["A policy reacts to an event and (indirectly) starts the following command."],
    bullets: ["Helpful for rules and automated reactions"],
  },
  informs: {
    title: "Relation: informs",
    subtitle: "Read Model → Command",
    paragraphs: ["The read model supplies decision information needed for the command."],
    bullets: ["Helps later with which data/queries each handler needs"],
  },
  executedBy: {
    title: "Relation: executedBy",
    subtitle: "Actor → Command",
    paragraphs: ["The actor executes this command."],
    bullets: ["Pattern: Actor → Command → Event"],
  },
  invokes: {
    title: "Relation: invokes",
    subtitle: "External System ↔ Command/Event",
    paragraphs: ["Marks interaction with an external system (integration)."],
    bullets: ["Helps with API / gateway interfaces"],
  },
  causal: {
    title: "Relation: causal",
    subtitle: "Event → Event",
    paragraphs: ["Temporal or semantic causality between two events."],
    bullets: ["Often combined with swimlanes or parallel streams"],
  },
  contains: {
    title: "Relation: contains",
    subtitle: "Aggregate encloses elements",
    paragraphs: [
      "Grouping relationship: this aggregate includes entities/value objects (or other elements) within its boundary.",
      "Geometric placement inside the aggregate area is usually enough; the relation documents membership explicitly.",
    ],
    bullets: ["Aggregate root = yellow boundary with header", "Drag entities and value objects into the area"],
  },
  annotates: {
    title: "Relation: annotates",
    subtitle: "Note ↔ sticky",
    paragraphs: [
      "Links a free note to a domain element (or the reverse).",
      "Not process flow — annotation / comment only.",
    ],
    bullets: ["Set by default when a note is involved"],
  },
};

export const CONTEXT_MAP_HELP_EN: Record<ContextMapPattern, HelpDialogModel> = {
  partnership: {
    title: "Partnership",
    subtitle: "Collaboration as peers",
    paragraphs: [
      "Both bounded contexts coordinate changes together. No clear upstream/downstream.",
    ],
    bullets: ["High coupling on shared decisions", "Only when interests are strongly aligned"],
  },
  sharedKernel: {
    title: "Shared Kernel",
    subtitle: "Shared model",
    paragraphs: [
      "A small, deliberately shared model core. Changes require agreement from both teams.",
    ],
    bullets: ["Keep it small", "Clear ownership of the kernel"],
  },
  customerSupplier: {
    title: "Customer / Supplier",
    subtitle: "Upstream supplies, downstream consumes",
    paragraphs: [
      "The supplier (source) provides a model; the customer (target) depends on it and can state requirements.",
    ],
    bullets: ["Upstream = sourceContextId", "Downstream = targetContextId"],
  },
  conformist: {
    title: "Conformist",
    subtitle: "Downstream adopts upstream model",
    paragraphs: [
      "The downstream takes the upstream model as-is, without its own translation.",
    ],
    bullets: ["Less effort than an ACL", "Stronger dependency on upstream"],
  },
  antiCorruptionLayer: {
    title: "Anti-Corruption Layer",
    subtitle: "Translation layer at the boundary",
    paragraphs: [
      "The downstream protects its model with a translation layer against foreign concepts.",
    ],
    bullets: ["Recommended for cross-context integration", "Map instead of adopting the model directly"],
  },
  openHostService: {
    title: "Open Host Service",
    subtitle: "Protocol for many downstream clients",
    paragraphs: [
      "The upstream offers a standardized protocol/API for multiple consumers.",
    ],
    bullets: ["Often combined with Published Language"],
  },
  publishedLanguage: {
    title: "Published Language",
    subtitle: "Shared integration language",
    paragraphs: [
      "A documented language (schema, events) for exchange between contexts.",
    ],
    bullets: ["Mind versioning", "Often together with OHS"],
  },
  separateWays: {
    title: "Separate Ways",
    subtitle: "No integration",
    paragraphs: [
      "The contexts deliberately do not integrate — duplicated functionality is accepted.",
    ],
    bullets: ["Less coupling", "Possible redundancy"],
  },
};
