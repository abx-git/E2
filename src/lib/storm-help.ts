import type { FacilitatorPhase } from "@/lib/facilitator-phases";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import {
  elementTypeShortLabel,
  workshopFormatLabel,
} from "@/i18n/domain-labels";
import { createTranslator } from "@/i18n/translate";
import type { ElementType, WorkshopFormat } from "@/types/storm-element";
import type { ContextMapPattern, RelationType } from "@/types/storm-relation";
import { CONTEXT_MAP_PATTERN_LABELS } from "@/types/storm-relation";

import {
  CONTEXT_MAP_HELP_DE,
  ELEMENT_HELP_DE,
  RELATION_HELP_DE,
} from "@/lib/storm-help-content-de";
import {
  CONTEXT_MAP_HELP_EN,
  ELEMENT_HELP_EN,
  RELATION_HELP_EN,
} from "@/lib/storm-help-content-en";

export interface HelpDialogModel {
  title: string;
  subtitle?: string;
  paragraphs?: string[];
  bullets?: string[];
  chips?: string[];
}

const ELEMENT_HELP_BY_LOCALE: Record<Locale, Record<ElementType, HelpDialogModel>> = {
  de: ELEMENT_HELP_DE,
  en: ELEMENT_HELP_EN,
};

const RELATION_HELP_BY_LOCALE: Record<Locale, Record<RelationType, HelpDialogModel>> = {
  de: RELATION_HELP_DE,
  en: RELATION_HELP_EN,
};

const CONTEXT_MAP_HELP_BY_LOCALE: Record<Locale, Record<ContextMapPattern, HelpDialogModel>> = {
  de: CONTEXT_MAP_HELP_DE,
  en: CONTEXT_MAP_HELP_EN,
};

export function getElementHelp(type: ElementType, locale: Locale = DEFAULT_LOCALE): HelpDialogModel {
  return ELEMENT_HELP_BY_LOCALE[locale][type];
}

export function getRelationHelp(type: RelationType, locale: Locale = DEFAULT_LOCALE): HelpDialogModel {
  return RELATION_HELP_BY_LOCALE[locale][type];
}

export function getContextMapHelp(
  type: ContextMapPattern,
  locale: Locale = DEFAULT_LOCALE,
): HelpDialogModel {
  const catalog = CONTEXT_MAP_HELP_BY_LOCALE[locale];
  return (
    catalog[type] ?? {
      title: CONTEXT_MAP_PATTERN_LABELS[type],
      paragraphs: locale === "en" ? ["DDD context map pattern."] : ["DDD Context-Map-Muster."],
    }
  );
}

export function getPhaseHelp(
  format: WorkshopFormat,
  phase: FacilitatorPhase,
  locale: Locale = DEFAULT_LOCALE,
): HelpDialogModel {
  const t = createTranslator(locale);
  const formatLabel = workshopFormatLabel(t, format);
  const extra = phase.allowedTypes.length - 6;
  return {
    title: t("helpPhase.title", { title: phase.title }),
    subtitle: t("helpPhase.subtitle", { format: formatLabel }),
    paragraphs: [
      phase.description,
      t("helpPhase.allowedElements", { count: phase.allowedTypes.length }),
    ],
    bullets: [...phase.checklist, "", t("helpPhase.tip")],
    chips: [
      ...phase.allowedTypes.slice(0, 6).map((ty) => elementTypeShortLabel(t, ty)),
      ...(extra > 0 ? [t("helpPhase.moreChip", { count: extra })] : []),
    ],
  };
}
