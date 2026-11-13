"use client";

import { ColorOpacityRow } from "@/components/color-opacity-row";
import {
  cardAppearanceFromMetadata,
  mergeCardAppearancePatch,
  resolveCardPaint,
  type CardAppearancePatch,
} from "@/lib/card-appearance";
import type { ElementStyle } from "@/lib/element-styles";
import { opacityToPercent, percentToOpacity } from "@/lib/region-style";
import type { StormElement } from "@/types/storm-element";
import type { NoteColorStyle } from "@/lib/note-colors";
import { useT } from "@/i18n";

export interface CardAppearanceControlsProps {
  element: Pick<StormElement, "type" | "metadata">;
  style: ElementStyle;
  noteColors: NoteColorStyle | null;
  onMetadataChange: (metadata: StormElement["metadata"]) => void;
}

export function CardAppearanceControls({
  element,
  style,
  noteColors,
  onMetadataChange,
}: CardAppearanceControlsProps) {
  const t = useT();
  const paint = resolveCardPaint(element, style, noteColors);
  const current = cardAppearanceFromMetadata(element.metadata);

  const patch = (p: CardAppearancePatch) => {
    onMetadataChange(mergeCardAppearancePatch(element.metadata, p));
  };

  const reset = () => {
    onMetadataChange(
      mergeCardAppearancePatch(element.metadata, {
        cardFillColor: undefined,
        cardFillOpacity: undefined,
        cardBorderColor: undefined,
        cardBorderOpacity: undefined,
      }),
    );
  };

  return (
    <div className="space-y-3.5">
      {paint.hasCustomAppearance && (
        <button
          type="button"
          className="text-[0.62rem] text-[var(--muted)] underline hover:text-[var(--text)]"
          onClick={reset}
        >
          {t("detailSidebar.appearance.resetDefaults")}
        </button>
      )}
      <ColorOpacityRow
        label={t("detailSidebar.appearance.fill")}
        colorHex={paint.fillHex}
        opacityPercent={opacityToPercent(paint.fillOpacity)}
        onColorChange={(hex) => patch({ cardFillColor: hex, cardFillOpacity: current.cardFillOpacity ?? paint.fillOpacity })}
        onOpacityChange={(percent) =>
          patch({
            cardFillColor: current.cardFillColor ?? paint.fillHex,
            cardFillOpacity: percentToOpacity(percent),
          })
        }
      />
      <ColorOpacityRow
        label={t("detailSidebar.appearance.border")}
        colorHex={paint.borderHex}
        opacityPercent={opacityToPercent(paint.borderOpacity)}
        onColorChange={(hex) =>
          patch({ cardBorderColor: hex, cardBorderOpacity: current.cardBorderOpacity ?? paint.borderOpacity })
        }
        onOpacityChange={(percent) =>
          patch({
            cardBorderColor: current.cardBorderColor ?? paint.borderHex,
            cardBorderOpacity: percentToOpacity(percent),
          })
        }
      />
    </div>
  );
}
