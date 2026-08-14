/**
 * German UI catalog — source of truth for keys.
 * Add new strings here first, then mirror in `en.ts`.
 */
export const de = {
  app: {
    name: "E2",
    description: "Event Storming — Domänenmodellierung mit lokaler JSON-Persistenz",
    documentTitle: "E2",
    documentTitleWithFile: "{file} · E2",
  },
  common: {
    cancel: "Abbrechen",
    save: "Speichern",
    close: "Schließen",
    open: "Öffnen…",
    delete: "Löschen",
    rename: "Umbenennen…",
    loading: "Bitte warten …",
    copy: "Kopieren",
    paste: "Einfügen",
    reset: "Zurücksetzen",
    yes: "Ja",
    no: "Nein",
  },
  language: {
    label: "Sprache",
    hint: "Gilt für diese Browser-Profil-Oberfläche.",
    de: "Deutsch",
    en: "English",
  },
  storage: {
    tabFile: "Datei",
    tabExport: "Export",
    tabAppearance: "Darstellung",
    panelTitle: "Daten",
    panelHint: "Arbeitsdatei, Export und Farben",
  },
  appearance: {
    workspace: "Arbeitsbereich",
    sidebars: "Seitenleisten",
    presets: "Presets",
    reset: "Zurücksetzen",
  },
  backup: {
    title: "Backup",
    hintUnsaved: "Nur bei ungespeichertem Stand. Öffnen überschreibt die Arbeitsdatei nicht.",
    saveNow: "Jetzt sichern",
    openFile: "Datei öffnen",
    history: "Historie",
    historyOn: "Mit Historie",
    historyRolling: "Eine Datei",
    automatic: "Automatisch",
    automaticOff: "Aus",
    automaticMinutes: "{n} Min.",
    recent: "Zuletzt gesichert",
    showAll: "Alle {n} anzeigen",
    showLess: "Weniger anzeigen",
    lastLabel: "Zuletzt: {when}",
    lastNone: "Noch kein Backup",
  },
} as const;
