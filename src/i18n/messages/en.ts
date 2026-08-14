import type { MessageTree } from "@/i18n/types";

/**
 * English UI catalog — must cover every key from `de.ts`.
 */
export const en = {
  app: {
    name: "E2",
    description: "Event Storming — domain modeling with local JSON persistence",
    documentTitle: "E2",
    documentTitleWithFile: "{file} · E2",
  },
  common: {
    cancel: "Cancel",
    save: "Save",
    close: "Close",
    open: "Open…",
    delete: "Delete",
    rename: "Rename…",
    loading: "Please wait …",
    copy: "Copy",
    paste: "Paste",
    reset: "Reset",
    yes: "Yes",
    no: "No",
  },
  language: {
    label: "Language",
    hint: "Applies to this browser profile’s UI.",
    de: "Deutsch",
    en: "English",
  },
  storage: {
    tabFile: "File",
    tabExport: "Export",
    tabAppearance: "Appearance",
    panelTitle: "Data",
    panelHint: "Working file, export, and colors",
  },
  appearance: {
    workspace: "Workspace",
    sidebars: "Sidebars",
    presets: "Presets",
    reset: "Reset",
  },
  backup: {
    title: "Backup",
    hintUnsaved: "Only while unsaved. Opening a backup does not overwrite the working file.",
    saveNow: "Back up now",
    openFile: "Open file",
    history: "History",
    historyOn: "Keep history",
    historyRolling: "Single file",
    automatic: "Automatic",
    automaticOff: "Off",
    automaticMinutes: "{n} min",
    recent: "Recent backups",
    showAll: "Show all {n}",
    showLess: "Show less",
    lastLabel: "Last: {when}",
    lastNone: "No backup yet",
  },
} as const satisfies MessageTree;
