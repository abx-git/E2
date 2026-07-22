import type { StormElement } from "@/types/storm-element";

/** Lines shown under „Attribute“ on the sticky (type-aware). */
export function cardAttributeLines(
  el: StormElement,
  opts?: { viewNameById?: Record<string, string> },
): string[] {
  const m = el.metadata;
  if (!m) return [];
  const lines: string[] = [];

  if (m.identityFields?.length) {
    lines.push(...m.identityFields.map((f) => `id: ${f}`));
  }
  if (m.attributes?.length) lines.push(...m.attributes);
  if (m.ruleCriteria?.length) lines.push(...m.ruleCriteria);
  if (m.storyAcceptance?.length) lines.push(...m.storyAcceptance);
  if (m.storyPersona?.trim()) lines.push(`Persona: ${m.storyPersona.trim()}`);
  if (m.releaseGoal?.trim()) lines.push(m.releaseGoal.trim());
  if (m.sliceSystems?.length) lines.push(...m.sliceSystems);
  if (m.aggregateRootRef?.trim()) lines.push(`Root: ${m.aggregateRootRef.trim()}`);
  if (m.createsRef?.trim()) lines.push(`→ ${m.createsRef.trim()}`);

  if (m.processRole?.trim()) lines.push(`Rolle: ${m.processRole.trim()}`);
  if (m.processSystem?.trim()) lines.push(`System: ${m.processSystem.trim()}`);
  if (m.processDuration?.trim()) lines.push(`Dauer: ${m.processDuration.trim()}`);
  if (m.processTrigger?.trim()) lines.push(`Trigger: ${m.processTrigger.trim()}`);
  if (m.processResult?.trim()) lines.push(`Ergebnis: ${m.processResult.trim()}`);
  if (m.gatewayKind) {
    lines.push(`Gateway: ${m.gatewayKind.toUpperCase()}`);
  }
  if (m.gatewayConditions?.length) lines.push(...m.gatewayConditions);
  if (m.processInputs?.length) {
    for (const i of m.processInputs) lines.push(`In: ${i}`);
  }
  if (m.processOutputs?.length) {
    for (const o of m.processOutputs) lines.push(`Out: ${o}`);
  }

  if (m.dataTableName?.trim()) lines.push(`Tabelle: ${m.dataTableName.trim()}`);
  if (m.dataUniqueKeys?.length) {
    for (const u of m.dataUniqueKeys) lines.push(`unique: ${u}`);
  }
  if (m.dataCardinality) lines.push(m.dataCardinality);
  if (m.dataLeftEntity?.trim() || m.dataRightEntity?.trim()) {
    lines.push(`${m.dataLeftEntity?.trim() || "?"} — ${m.dataRightEntity?.trim() || "?"}`);
  }

  const linkKind = m.linkKind ?? "external";
  if (linkKind === "view") {
    const viewId = m.linkViewId?.trim();
    if (viewId) {
      const name = opts?.viewNameById?.[viewId];
      lines.push(name ? `→ ${name}` : "→ Sicht");
    }
  } else if (m.linkUrl?.trim()) {
    lines.push(m.linkUrl.trim());
  }

  const given = m.exampleGiven ?? [];
  const when = m.exampleWhen ?? [];
  const then = m.exampleThen ?? [];
  if (given.length || when.length || then.length) {
    for (const g of given) lines.push(`G: ${g}`);
    for (const w of when) lines.push(`W: ${w}`);
    for (const t of then) lines.push(`T: ${t}`);
  }

  return lines;
}

/** Lines shown under „Methoden“ on the sticky. */
export function cardMethodLines(el: StormElement): string[] {
  const m = el.metadata;
  if (!m) return [];
  const lines: string[] = [];
  if (m.aggregateMethods?.length) lines.push(...m.aggregateMethods);
  if (m.operations?.length) lines.push(...m.operations);
  if (m.aggregateInvariants?.length) {
    lines.push(...m.aggregateInvariants.map((i) => `◇ ${i}`));
  }
  return lines;
}

export function cardShowsDetails(el: StormElement): boolean {
  const m = el.metadata;
  return Boolean(
    m?.showDescriptionOnCard || m?.showAttributesOnCard || m?.showMethodsOnCard,
  );
}
