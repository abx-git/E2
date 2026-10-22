import { describe, expect, it } from "vitest";

import { boardImportPayloadFromE2vText, decodeE2vText } from "@/lib/e2v";
import { splitRow } from "@/lib/e2v/text";

/** Space-separated LLM output (no tabs), shorthand r/cn rows, ES type aliases. */
const LLM_SEGEL_SAMPLE = `# e2v/1
@format event-storming-tool-e2v
@version 1
@scope document
@exported 2026-10-22T21:00:00Z
@title Aufnahme neuer Mitglieder im Segelflugverein
@activeViewId v1
@workshopMode 0
g Schnupperflug Einfuehrungsflug mit Fluglehrer
@view v1 "Prozess" event-storming generic 0 0
@v 0 0 1
@t "Erstkontakt" "Vollmitgliedschaft" 1
@snap 1 1
s s1 "Interessent" 0 40 2200 160
b bc1 "Kennenlernen" 40 20 380 740
e e01 role 60 60 140 60 0 1 s1 bc1 - - - Interessent
e e02 command 60 130 140 60 0 1 s1 bc1 - - - SchnupperflugAnfragen
e e03 event 230 130 140 60 0 1 s1 bc1 - - - SchnupperterminFestgelegt
cn element:e01 element:e02
r e02 e03
@desc e01 Interessierte Person mit Absicht zum Lizenzerwerb
@endview
`;

describe("E2V LLM whitespace compatibility", () => {
  it("splits space-separated rows like tab export", () => {
    expect(splitRow('@view v1 "Prozess" event-storming generic 0 0')).toEqual([
      "@view",
      "v1",
      "Prozess",
      "event-storming",
      "generic",
      "0",
      "0",
    ]);
    expect(splitRow("r e02 e03")).toEqual(["r", "e02", "e03"]);
  });

  it("decodes space-separated LLM board fragment", () => {
    const payload = boardImportPayloadFromE2vText(LLM_SEGEL_SAMPLE);
    expect(payload).not.toBeNull();
    expect(payload!.title).toBe("Aufnahme neuer Mitglieder im Segelflugverein");
    expect(payload!.glossary[0]?.term).toBe("Schnupperflug");
    expect(payload!.glossary[0]?.definition).toContain("Fluglehrer");
    const view = payload!.views[0]!;
    expect(view.name).toBe("Prozess");
    expect(view.elements.find((e) => e.label === "Interessent")?.type).toBe("actor");
    expect(view.elements.find((e) => e.label === "SchnupperterminFestgelegt")?.type).toBe("domainEvent");
    expect(view.connectors.length).toBeGreaterThanOrEqual(1);
    // LLM output may list both `cn` and `r` for the same edge; merge keeps connectors.
    expect(view.relations.length + view.connectors.length).toBeGreaterThanOrEqual(1);
    expect(view.elements.find((e) => e.label === "Interessent")?.description).toContain("Lizenzerwerb");
  });

  it("decodeE2vText returns null for non-E2V", () => {
    expect(decodeE2vText("not e2v")).toBeNull();
  });
});
