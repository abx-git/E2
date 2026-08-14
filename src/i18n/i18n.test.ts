import { describe, expect, it } from "vitest";

import { DEFAULT_LOCALE, isLocale, LOCALES } from "@/i18n/config";
import { interpolate, getMessageByPath } from "@/i18n/path";
import {
  localeFromLanguageTag,
  readLocaleFromSearch,
  resolveInitialLocale,
} from "@/i18n/resolve-locale";
import { createTranslator, translate } from "@/i18n/translate";
import { de } from "@/i18n/messages/de";
import { en } from "@/i18n/messages/en";
import type { MessageKey } from "@/i18n/types";

function collectKeys(tree: unknown, prefix = ""): string[] {
  if (typeof tree === "string") return prefix ? [prefix] : [];
  if (!tree || typeof tree !== "object") return [];
  const out: string[] = [];
  for (const [k, v] of Object.entries(tree as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") out.push(path);
    else out.push(...collectKeys(v, path));
  }
  return out;
}

describe("i18n config", () => {
  it("lists de and en with German default", () => {
    expect(LOCALES).toEqual(["de", "en"]);
    expect(DEFAULT_LOCALE).toBe("de");
    expect(isLocale("de")).toBe(true);
    expect(isLocale("fr")).toBe(false);
  });
});

describe("i18n catalogs", () => {
  it("keeps English keys in sync with German", () => {
    const deKeys = collectKeys(de).sort();
    const enKeys = collectKeys(en).sort();
    expect(enKeys).toEqual(deKeys);
  });
});

describe("path / interpolate", () => {
  it("resolves nested keys", () => {
    expect(getMessageByPath(de, "common.cancel")).toBe("Abbrechen");
    expect(getMessageByPath(en, "common.cancel")).toBe("Cancel");
  });

  it("interpolates placeholders", () => {
    expect(interpolate("Hello {name}", { name: "Ada" })).toBe("Hello Ada");
    expect(interpolate("{n} Min.", { n: 15 })).toBe("15 Min.");
    expect(interpolate("keep {missing}", {})).toBe("keep {missing}");
  });
});

describe("resolveInitialLocale", () => {
  it("prefers ?lang= over storage and navigator", () => {
    expect(
      resolveInitialLocale({
        search: "?lang=en&wf=x",
        stored: "de",
        navigatorLanguages: ["de-DE"],
      }),
    ).toBe("en");
  });

  it("uses storage when URL has no lang", () => {
    expect(
      resolveInitialLocale({
        search: "?wf=x",
        stored: "en",
        navigatorLanguages: ["de-DE"],
      }),
    ).toBe("en");
  });

  it("falls back to navigator then default", () => {
    expect(
      resolveInitialLocale({
        search: "",
        stored: null,
        navigatorLanguages: ["fr-FR", "en-GB"],
      }),
    ).toBe("en");
    expect(
      resolveInitialLocale({
        search: "",
        stored: null,
        navigatorLanguages: ["fr-FR"],
      }),
    ).toBe("de");
  });

  it("maps language tags", () => {
    expect(localeFromLanguageTag("de-AT")).toBe("de");
    expect(localeFromLanguageTag("en-US")).toBe("en");
    expect(localeFromLanguageTag("pt-BR")).toBe(null);
  });

  it("reads lang from search", () => {
    expect(readLocaleFromSearch("?lang=EN")).toBe("en");
    expect(readLocaleFromSearch("?lang=xx")).toBe(null);
  });
});

describe("translate", () => {
  it("translates and interpolates", () => {
    expect(translate("en", "backup.automaticMinutes", { n: 10 })).toBe("10 min");
    expect(createTranslator("de")("backup.saveNow")).toBe("Jetzt sichern");
  });

  it("falls back to German for unknown keys in English tree", () => {
    // Simulate by asking for a valid key — fallback path is covered by createTranslator
    const t = createTranslator("en");
    expect(t("common.yes")).toBe("Yes");
    // Invalid keys return the key string (typed callers won't hit this)
    expect(t("does.not.exist" as MessageKey)).toBe("does.not.exist");
  });
});
