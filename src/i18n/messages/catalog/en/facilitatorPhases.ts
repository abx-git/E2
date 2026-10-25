export const facilitatorPhasesEn = {
  facilitatorPhases: {
    formats: {
    "bigPicture": {
      label: "Big Picture",
      description: "Explore the full domain, discover Bounded Contexts",
    },
    "processModeling": {
      label: "Process Modeling",
      description: "Model a single business process in detail",
    },
    "softwareDesign": {
      label: "Software Design",
      description: "Translate the domain model into software design",
    },
    "strategicDesign": {
      label: "Strategic Design",
      description: "Subdomains, language, Bounded Contexts, and Context Map",
    },
    "tacticalDesign": {
      label: "Tactical Design",
      description: "Entities, Value Objects, Aggregates, Services, Repositories",
    },
    "exampleMapping": {
      label: "Example Mapping",
      description: "Rules, Examples, and Questions to clarify specs",
    },
    "storyMapping": {
      label: "Story Mapping",
      description: "Activities, Tasks, Stories, and Releases",
    },
    "eventModelingWorkshop": {
      label: "Event Modeling",
      description: "Timeline, UI, Commands, Views, and Vertical Slices",
    },
    "processWorkshop": {
      label: "Process Modeling",
      description: "Concrete flows with steps, gateways, and roles",
    },
    "arc42Workshop": {
      label: "arc42 Workshop",
      description: "Building block view with zoom (Blackbox → Whitebox → Component)",
    },
    "c4Modeling": {
      label: "C4 Modeling",
      description: "Context → Container → Components (zoom as on c4model.com/diagrams)",
    },
    "cloudArchitecture": {
      label: "Cloud Workshop",
      description: "Boundaries → Workloads → Data/Messaging → Network/IAM (provider-agnostic)",
    },
    "dataModelWorkshop": {
      label: "Data Modeling",
      description: "Conceptual entities, attributes, and relationships",
    },
    "ermDocumentation": {
      label: "ERM Documentation",
      description: "Entities, attributes, and relationships",
    }
    },
    phases: {
    "chaotic-exploration": {
      title: "Chaotic Exploration",
      description: "Collect all Domain Events — past tense, without discussion.",
      checklist: ["Everyone writes events on orange sticky notes", "Order Placed", "Do not enforce order yet"],
    },
    "enforce-timeline": {
      title: "Enforce Timeline",
      description: "Arrange events chronologically from left to right.",
      checklist: ["Identify start and end points", "Spot parallel streams", "Mark duplicates"],
    },
    "enforce-consistency": {
      title: "Check Consistency",
      description: "Validate the timeline, remove duplicates, mark gaps.",
      checklist: ["What happens next?", "Merge duplicates", "Mark open questions as hotspots"],
    },
    "commands-actors": {
      title: "Commands & Actors",
      description: "For each event: What triggered it? Who performed it?",
      checklist: [],
    },
    "policies-readmodels": {
      title: "Policies & Read Models",
      description: "Identify automatic reactions and required information.",
      checklist: ["When X, then Y", "Place Read Models before Commands", "Mark external systems"],
    },
    "bounded-contexts": {
      title: "Bounded Contexts",
      description: "Cluster related elements and name them.",
      checklist: ["Cluster by vocabulary and responsibility", "Name 3–8 Bounded Contexts", "Mark integration points"],
    },
    "hotspots": {
      title: "Hotspots",
      description: "Capture open questions, conflicts, and uncertainties.",
      checklist: ["What is uncertain?", "Prioritize hotspots", "Assign owners"],
    },
    "wrap-up": {
      title: "Wrap-Up",
      description: "Document outcomes and plan next steps.",
      checklist: ["Export the board", "Create hotspot list", "Document Context Map", "Plan follow-up sessions"],
    },
    "commands-policies": {
      title: "Deepen Commands & Policies",
      description: "Model business rules and actions in detail.",
      checklist: ["Link each policy to an event and command", "Mark edge cases as hotspots"],
    },
    "pivotal-events": {
      title: "Verify Pivotal Events",
      description: "Review phase transitions and key moments.",
      checklist: ["Mark pivotal events on the timeline", "Check Bounded Context boundaries"],
    },
    "refine-contexts": {
      title: "Refine Bounded Contexts",
      description: "Optimize boundaries and naming of contexts.",
      checklist: ["Use meaningful names", "... Management"],
    },
    "aggregates-readmodels": {
      title: "Aggregates & Read Models",
      description: "Add consistency boundaries and decision information.",
      checklist: ["Place Aggregates between Command and Event", "Place Read Models before decisions", "Add UI elements"],
    },
    "aggregate-design": {
      title: "Aggregate Design",
      description: "Model Commands as methods, Events as state changes.",
      checklist: ["Define methods per Aggregate", "Document invariants"],
    },
    "event-schemas": {
      title: "Event Schema Definition",
      description: "Define JSON structure for each Domain Event.",
      checklist: ["Document schema per event", "Define versioning strategy"],
    },
    "repository-service": {
      title: "Repository & Service Design",
      description: "Define persistence and external services.",
      checklist: ["Set persistence boundaries", "Document external service APIs"],
    },
    "subdomains": {
      title: "Subdomains",
      description: "Divide the domain into Core, Supporting, and Generic Subdomains.",
      checklist: ["Sketch the problem space", "Name the Core Domain (competitive advantage)", "Distinguish Supporting and Generic"],
    },
    "ubiquitous-language": {
      title: "Ubiquitous Language",
      description: "Anchor shared language in the glossary and on the board.",
      checklist: ["Capture key terms in the glossary", "Mark ambiguities as hotspots", "Domain language, not tech jargon"],
    },
    "bounded-contexts-ddd": {
      title: "Bounded Contexts",
      description: "Draw and name explicit model boundaries.",
      checklist: ["One model / one language per context", "Name 3–8 Bounded Contexts", "Clarify Subdomain ↔ Context mapping"],
    },
    "context-map": {
      title: "Context Map",
      description: "Relationships between Bounded Contexts (ACL, Shared Kernel, …).",
      checklist: ["Context Map mode: connect BCs", "Choose upstream/downstream and patterns", "Integration risks as hotspots"],
    },
    "strategic-wrap-up": {
      title: "Wrap-Up",
      description: "Document strategic decisions and next steps.",
      checklist: ["Export Context Map", "Prioritize Core Domain", "Plan tactical design"],
    },
    "aggregates-entities": {
      title: "Aggregates & Entities",
      description: "Model consistency boundaries and identity-bearing objects.",
      checklist: ["Name Aggregate Roots", "Place Entities within the boundary", "Check transaction boundaries"],
    },
    "value-objects": {
      title: "Value Objects",
      description: "Values without identity — measurements, descriptions, compositions.",
      checklist: ["Clarify immutability and equality", "Attach Value Objects to Entities/Aggregates", "Simplify overly complex Entities"],
    },
    "services-factories": {
      title: "Domain Services & Factories",
      description: "Operations without a natural Entity home and creation logic.",
      checklist: ["Only when no Entity is responsible", "Factories for complex Aggregate creation", "Briefly document interfaces"],
    },
    "repositories-persistence": {
      title: "Repositories",
      description: "Persistence access per Aggregate Root.",
      checklist: ["One Repository per Aggregate Root", "No persistence details in the Domain Model", "Separate external systems"],
    },
    "domain-events-tactical": {
      title: "Domain Events",
      description: "Record meaningful state changes as events.",
      checklist: ["Derive events from Aggregates", "Past tense / Ubiquitous Language", "Mark integration to other contexts"],
    },
    "tactical-wrap-up": {
      title: "Wrap-Up",
      description: "Document the tactical model and clarify open items.",
      checklist: ["Add invariants and methods", "Prioritize hotspots", "Plan transition to implementation"],
    },
    "story-rules": {
      title: "Story & Rules",
      description: "Collect business rules for the user story (yellow Rules).",
      checklist: ["Clarify story title / scope", "Phrase rules in Ubiquitous Language", "Name actors"],
    },
    "examples": {
      title: "Examples",
      description: "Concrete examples (Given/When/Then) for the Rules.",
      checklist: ["At least one Example per Rule", "Given / When / Then in the detail pane", "Edge cases as separate Examples"],
    },
    "questions": {
      title: "Questions",
      description: "Mark and clarify uncertainties as Questions.",
      checklist: ["Open items as Question", "Assign owner / follow-up", "Close resolved Questions"],
    },
    "bdd-wrap-up": {
      title: "Wrap-Up",
      description: "Prioritize examples and turn them into specs / stories.",
      checklist: ["Mark examples for automation", "Document open Questions", "Derive next slices / stories"],
    },
    "backbone": {
      title: "Activities (Backbone)",
      description: "User activities from left to right as the backbone.",
      checklist: ["Journey left to right", "Activities coarse and user-centered", "No technical tasks on the backbone"],
    },
    "tasks": {
      title: "User Tasks",
      description: "Stack concrete tasks under each Activity.",
      checklist: ["Tasks under the matching Activity", "Capture variants and alternatives", "Hotspots for uncertainties"],
    },
    "stories": {
      title: "User Stories",
      description: "Break tasks into implementable stories.",
      checklist: ["Maintain persona and acceptance criteria", "Set priority (MoSCoW)", "Add estimate optionally"],
    },
    "releases": {
      title: "Releases / Walking Skeleton",
      description: "Draw horizontal release slices.",
      checklist: ["Lay MVP / release lines", "State release goal", "Mark dependencies"],
    },
    "em-events": {
      title: "Events on the Timeline",
      description: "What happened? Arrange events chronologically.",
      checklist: ["Past tense for events", "Timeline left to right", "Hint at first slices"],
    },
    "em-commands-ui": {
      title: "Commands & UI",
      description: "Who triggers what? Add screens and Commands.",
      checklist: ["UI above relevant events", "Commands before events", "Assign actors"],
    },
    "em-views-automation": {
      title: "Views & Automation",
      description: "Wire Read Models and Policies / automation.",
      checklist: ["Read Models for decisions", "Policies between Event and Command", "Mark external systems"],
    },
    "em-slices": {
      title: "Vertical Slices",
      description: "Cut and name implementable slices.",
      checklist: ["Each slice: UI → Command → Event → View", "Document slice goal and systems", "Set implementation order"],
    },
    "process-happy-path": {
      title: "Happy Path",
      description: "Sketch start, activities, and end of the main path.",
      checklist: ["Name trigger and outcome", "Lay steps in order (left → right)", "No branches yet"],
    },
    "process-decisions": {
      title: "Decisions",
      description: "Add gateways and alternative paths.",
      checklist: ["Set XOR / AND / OR", "Document conditions on gateways", "Open clarifications as hotspots"],
    },
    "process-roles-systems": {
      title: "Roles & Systems",
      description: "Maintain responsibility and systems on activities, use swimlanes.",
      checklist: ["Role / system per activity", "Add inputs and outputs", "Swimlanes by role or system"],
    },
    "data-entities": {
      title: "Find Entities",
      description: "Collect and name central information objects.",
      checklist: ["Nouns from glossary / domain language", "Do not force technical table names", "Merge duplicates"],
    },
    "data-attributes-keys": {
      title: "Attributes & Keys",
      description: "Model fields, identity, and uniqueness.",
      checklist: ["Primary keys / identity fields", "Attributes as “name: type”", "Unclear fields as hotspot"],
    },
    "data-relationships": {
      title: "Relationships",
      description: "Set associations and cardinalities.",
      checklist: ["Choose 1:1 / 1:n / n:m", "n:m as association with attributes if needed", "Draw relations between entities"],
    },
    "arc42-context": {
      title: "Context (Level 1)",
      description: "Blackbox in the environment — central systems and interfaces of the building block view.",
      checklist: ["Central system as blackbox", "External systems as additional blackboxes", "Label relationships (not just “uses”)"],
    },
    "arc42-building-blocks": {
      title: "Building Block View (Zoom)",
      description: "Drill-down: Blackbox → Whitebox → Components.",
      checklist: ["Open detail view per blackbox", "Whitebox as scope; components inside", "Optionally zoom again into sub-blocks"],
    },
    "arc42-runtime-deploy": {
      title: "Runtime & Deployment",
      description: "Dynamics and deployment with building blocks and notes.",
      checklist: ["Runtime paths as relations/notes", "Deployment across blackboxes / components", "Hotspots for open questions"],
    },
    "arc42-decisions": {
      title: "Decisions & Risks",
      description: "Record ADRs, quality, and technical debt.",
      checklist: ["Architecture decisions as notes/links", "Quality requirements and risks (hotspots)", "Maintain glossary panel in parallel"],
    },
    "c4-context": {
      title: "Context Diagram",
      description: "C4 Level 1: People and software systems. Systems are blackboxes — zoom in the next phase.",
      checklist: ["Name the central system clearly", "Draw external systems and users", "Prepare detail view on system for container zoom"],
    },
    "c4-container": {
      title: "Container Diagram",
      description: "C4 Level 2: Zoom into a software system — containers (apps, DBs) within the whitebox/system boundary.",
      checklist: ["Open detail view from the software system", "Label containers with technology", "Communication paths and protocols as relations"],
    },
    "c4-component": {
      title: "Component Diagram",
      description: "C4 Level 3: Zoom into a container — components and responsibilities (optional).",
      checklist: ["Open detail view from the container", "Components and responsibilities", "Only add when zoom adds value"],
    },
    "erm-entities": {
      title: "Entities",
      description: "Central data objects for the information model.",
      checklist: ["Terms from glossary / domain language", "Bounded Context per schema area", "Do not force technical table names"],
    },
    "erm-attributes": {
      title: "Attributes & Keys",
      description: "Model fields, identity, and uniqueness.",
      checklist: ["Primary keys / identity fields", "Attributes as “name: type”", "Unclear fields as hotspot"],
    },
    "erm-relationships": {
      title: "Relationships",
      description: "Set associations and cardinalities.",
      checklist: ["Choose 1:1 / 1:n / n:m", "Draw relations between entities", "ERM detail via Bounded Context drill-down"],
    },
    "cloud-context": {
      title: "Context & Boundaries",
      description: "Accounts, landing zones, and external systems — the outer cloud boundary before workloads.",
      checklist: ["Name cloud boundaries (account / subscription / project)", "Set provider optionally", "External SaaS / partners as Managed Service"],
    },
    "cloud-workloads": {
      title: "Workloads",
      description: "Place compute, edge, and managed services within boundaries.",
      checklist: ["Open detail view from a cloud boundary", "Label workloads with technology/service", "Mark public entry points as Edge"],
    },
    "cloud-data-integration": {
      title: "Data & Integration",
      description: "Storage, messaging, and data flows between workloads.",
      checklist: ["Separate primary storage vs. cache / analytics", "Queues and event streams as messaging", "Label producer → consumer relations"],
    },
    "cloud-network-identity": {
      title: "Network & Identity",
      description: "Connectivity, trust boundaries, and access control.",
      checklist: ["Sketch network segments and peering", "Draw IAM / workload identities", "Trust boundaries and hotspots for gaps"],
    },
    "cloud-risks": {
      title: "Risks & Decisions",
      description: "Cost, resilience, compliance, and open architecture questions.",
      checklist: ["ADRs and quality goals as notes/links", "Single points of failure and vendor lock-in", "Prioritize open items as hotspots"],
    }
    },
  },
} as const;
