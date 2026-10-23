export const dialogsDe = {
  dialogs: {
    unsavedBody:
      "{label} wurde geändert. Möchtest du speichern, bevor du „{action}“ ausführst?",
    dontSave: "Nicht speichern",
    fileConflictTitle: "Datei und E2 wurden gleichzeitig geändert",
    fileConflictBody:
      "{file} wurde extern geändert, während Sie in E2 ungespeicherte Änderungen haben.",
    externalFileChangedTitle: "Datei wurde extern geändert",
    externalFileChangedBody:
      "Dein Editor-Stand bleibt erhalten. Du kannst die Datei laden oder den Editor behalten und später unter neuem Namen speichern.",
    keepEditor: "Editor behalten",
    loadFile: "Datei laden",
    workingFileSetupBody:
      "Du kannst sofort mit einem leeren Board starten. Einen Speicherort für die Arbeitsdatei wählst du jetzt oder später über „Speichern unter…“.",
    startEmpty: "Leeres Board starten",
    pickSaveLocation: "Speicherort wählen…",
    openExisting: "Bestehende Datei öffnen",
    pickViaBrowser: "Datei über Browser-Dialog wählen",
    jsonPasteClipboardFailed:
      "Zwischenablage konnte nicht gelesen werden. Bitte ⌘V / Strg+V in das Feld.",
    jsonPasteTitle: "JSON einfügen",
    jsonPasteConfirm: "Einfügen",
    deleteViewTitle: "Sicht löschen?",
    deleteViewConfirm: "Sicht löschen",
    viewTabMenu: "Sicht-Menü",
    renameView: "Umbenennen",
    deleteView: "Löschen…",
    viewTabTitle: "{name} — Doppelklick: umbenennen, Rechtsklick: Menü",
    deleteViewAria: "Sicht „{name}“ löschen",
    remoteBoardLoadIntro: "Das Board wird von dieser URL geladen und in den Editor übernommen:",
    remoteBoardSaveAsHint: "Danach kannst du lokal weiterarbeiten („Speichern unter…“).",
    remoteBoardOverwriteHint:
      "Wenn eine Arbeitsdatei verknüpft ist, wird sie nicht überschrieben („Speichern unter…“).",
    remoteBoardLoad: "Board laden",
    shareLinkHint:
      "Prüfen. Passt das Schema, erhältst du einen E2-Link zum Teilen.",
    shareLinkCheck: "Prüfen",
    shareLinkCors:
      "Die Quelle muss CORS für die E2-Origin erlauben. Wer den Link öffnet, lädt das Board nach Bestätigung und arbeitet danach lokal weiter.",
    collabLeaveHint:
      "War eine Arbeitsdatei verknüpft, enthält sie den zuletzt synchronisierten Stand aus dem Raum.",
    collabEnterDirty:
      "Zuerst „Speichern unter…“ — der Raum braucht eine Datei als lokales Backup.",
    collabEnterBoardAdopted: "Dein aktuelles Board wird als Startinhalt in den neuen Raum übernommen.",
    collabEnterFileSafe:
      "Das Board wird über den Raum mit allen Teilnehmern synchronisiert. Deine verknüpfte Datei wird parallel fortlaufend aktualisiert (eigene Änderungen und empfangener Sync). Neu/Öffnen ist im Raum gesperrt.",
    collabRoomTitle: "Kollaborations-Raum",
    collabRoomSupabase: "Geteilter Raum über Supabase Free Tier",
    collabSaveFailed: "Speichern in die Arbeitsdatei fehlgeschlagen.",
    collabSaveFirst: "Bitte zuerst speichern.",
    collabEnvLocked:
      "Verbindung kommt aus der Umgebung (.env) und kann hier nicht überschrieben werden.",
    collabValidUntil: "Gültig bis {when}",
    collabFileNotOverwritten: "Arbeitsdatei wird parallel zum Raum fortlaufend mitgeschrieben",
    newWorkingFileTitle: "Neue Arbeitsdatei",
    unsavedTitle: "Änderungen speichern?",
    unsavedThisBoard: "dieses Board",
    fileConflictKeepLocal: "E2-Stand in die Datei schreiben",
    fileConflictLoadFile: "Datei in E2 laden",
    fileConflictYourFile: "Ihre Datei",
    welcomeTitle: "Willkommen bei E2",
    startWithoutFile: "Ohne Datei starten",
    jsonPasteClipboardEmpty: "Die Zwischenablage ist leer.",
    jsonPasteClipboardButton: "Zwischenablage",
    jsonPasteJsonLabel: "Import-Text (JSON oder E2V)",
    deleteViewBody: "„{name}“ und der gesamte Inhalt dieser Sicht werden entfernt.",
    addViewTab: "Sicht",
    newViewMenuTitle: "Neue Sicht anlegen",
    newViewCanvasGroup: "Canvas (Modellierung)",
    newViewMeasuresOption: "Maßnahmen-Matrix",
    newViewTitle: "Neue Sicht",
    pasteJsonNewViewTitle: "JSON aus der Zwischenablage als neue Sicht",
    renameViewAria: "Sicht umbenennen",
    duplicateView: "Duplizieren",
    shareLinkCopyFailed: "Link konnte nicht in die Zwischenablage kopiert werden.",
    descriptionTitle: "Beschreibung",
    descriptionFallback: "WYSIWYG · Quelltext in der Toolbar",
    remoteBoardLoadButton: "Laden",
    descriptionPlaceholder: "Beschreibung schreiben…",
    remoteBoardTitle: "Board von URL laden",
    shareLinkTitle: "Board-Link teilen",
    collabEnterJoinReplace:
      "Der Editor wird durch den Raum-Stand ersetzt. Alle Teilnehmer arbeiten danach live am selben Board — ohne weitere Nachfragen.",
    collabEnterGuestLocalHint:
      "Als Gast: „Nur Online-Sync“ arbeitet detached ohne lokale Datei. „Beitreten und auf Platte speichern…“ legt eine Raum-Kopie an, die fortlaufend aktualisiert wird.",
    collabEnterExportOptional: "Optional: JSON exportieren als zusätzliche Kopie.",
    exportJsonButton: "JSON exportieren",
    remoteBoardLoadQuestion: "Remote-Board laden?",
    remoteBoardStormFromUrl:
      "Es wird eine .storm.json von dieser URL geladen und in den Editor übernommen:",
    remoteBoardReplaceContent:
      "Der aktuelle Editor-Inhalt wird ersetzt. Danach kannst du lokal weiterarbeiten („Speichern unter…“).",
    importOpenTitle: "Datei öffnen",
    importOpenBody:
      "Die gewählte Datei konnte nicht als E2-Board geladen werden, oder der Inhalt ist ungültig. Der Editor behält deinen aktuellen Stand — die Datei wird nicht überschrieben.",
    importKeepEditor: "Editor behalten (Datei nicht überschreiben)",
    importTryLoad: "Datei trotzdem versuchen",
    jsonPasteBoardTitle: "JSON einfügen",
    jsonPasteBoardBody:
      "Vollständiges Board (.storm.json), kompaktes E2V (# e2v/1), E2V-Paket oder KI-Kontext einfügen. Ersetzt den aktuellen Board-Stand.",
    jsonPasteBoardConfirm: "Board laden",
    jsonPasteViewTitle: "JSON als neue Sicht",
    jsonPasteViewBody:
      "E2-JSON (.storm.json), E2V (# e2v/1 / E2V-Paket) oder KI-Kontext als neue Sicht hinzufügen. Bestehende Sichten bleiben erhalten; E2V behält Layout bei.",
    jsonPasteViewConfirm: "Als Sicht importieren",
    jsonPasteAiTitle: "KI-Kontext einfügen",
    jsonPasteAiBody:
      "Reduziertes KI-JSON (oder .storm.json) als neue Sicht hinzufügen. Bestehende Sichten bleiben erhalten; Elemente werden automatisch arrangiert.",
    jsonPasteE2vTitle: "E2V einfügen",
    jsonPasteE2vBody:
      "Kompaktes E2V (# e2v/1) oder E2V-Paket aus der Zwischenablage als neue Sicht. Layout (x/y, Größen, Connectors) bleibt erhalten.",
    jsonPasteDiagramTitle: "Diagramm einfügen",
    jsonPasteDiagramBody:
      "Mermaid- oder PlantUML-Text als neue Sicht importieren. Elemente werden automatisch arrangiert.",
    newFileTitle: "Neue Datei",
    newFileBody: "Leeres Board in diesem Tab anlegen. Andere Tabs bleiben unverändert.",
    newFileDiscardUnsaved: "Ungespeicherte Änderungen in diesem Tab werden verworfen.",
    newFileDiscardContent: "Der aktuelle Board-Inhalt in diesem Tab wird verworfen.",
    newFileKeepOnDisk: "Die bisherige Datei „{file}“ bleibt auf dem Datenträger erhalten.",
    newFileBoardTitle: "Board-Titel",
    newFileDefaultTitle: "Neues Event Storming Board",
    newFileSuggestedFilename: "Vorgeschlagener Dateiname:",
    newFileCreateWithFile: "Anlegen und Speicherort wählen…",
    newFileEmptyWithoutFile: "Leeres Board ohne Datei",
    newFileEmptyOnly: "Leeres Board anlegen",
  },
} as const;
