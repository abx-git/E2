import type { StormElement } from "@/types/storm-element";

/** Lines shown under „Attribute“ on the sticky (type-aware). */
export function cardAttributeLines(el: StormElement): string[] {
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
