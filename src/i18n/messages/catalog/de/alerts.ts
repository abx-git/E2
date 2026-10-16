export const alertsDe = {
  alerts: {
    noBoardToBackup: "Kein Board-Inhalt zum Sichern.",
    boardLoadFailed: "Board konnte nicht geladen werden.",
    jsonClipboardFailed:
      "JSON konnte nicht in die System-Zwischenablage kopiert werden. Bitte Browser-Berechtigung prüfen oder JSON herunterladen.",
    viewExportFailed: "Sicht konnte nicht exportiert werden.",
    aiContextExportFailed: "KI-Kontext konnte nicht exportiert werden.",
    aiContextClipboardFailed:
      "KI-Kontext konnte nicht in die Zwischenablage kopiert werden. Bitte Browser-Berechtigung prüfen oder herunterladen.",
    mermaidExportFailed: "Mermaid konnte nicht exportiert werden.",
    mermaidClipboardFailed:
      "Mermaid konnte nicht in die Zwischenablage kopiert werden. Bitte herunterladen.",
    plantUmlExportFailed: "PlantUML konnte nicht exportiert werden.",
    plantUmlClipboardFailed:
      "PlantUML konnte nicht in die Zwischenablage kopiert werden. Bitte herunterladen.",
    saveAsNeedsFsApi:
      "Speichern unter… braucht die File-System-API (Chrome, Edge oder Brave). Alternativ JSON exportieren.",
    saveConflictDownloaded:
      "Die Datei wurde zwischenzeitlich geändert und wurde nicht überschrieben. Eine Kopie des Dateistands wurde heruntergeladen — bitte „Speichern unter…“ nutzen oder die Datei neu öffnen.",
    saveEmptyOverNonempty: "Leerer Stand wird nicht über die Arbeitsdatei geschrieben.",
    savePaused: "Speichern ist pausiert — bitte „Speichern unter…“ nutzen.",
    saveNotWriter: "Ein anderer Tab speichert diese Datei gerade. Bitte den sichtbaren Tab nutzen.",
    saveFailed: "Speichern fehlgeschlagen — Datei nicht überschrieben.",
    saveFailedShort: "Speichern fehlgeschlagen.",
    collabNoNewFile:
      "Während der Kollaboration kann keine neue Datei angelegt werden — das würde den Raum überschreiben. Bitte zuerst den Raum verlassen.",
    collabNoOpenFile:
      "Während der Kollaboration kann keine andere Datei in den Editor geladen werden — das würde den Raum überschreiben. Bitte zuerst den Raum verlassen.",
    collabNoCloseFile:
      "Während der Kollaboration kann die Datei nicht geschlossen werden. Bitte zuerst den Raum verlassen.",
    noWorkingFileLinked: "Keine Arbeitsdatei verknüpft — zuerst Speichern unter…",
    renamePrompt: "Neuer Dateiname:",
    openFileFailedPermission:
      "Datei konnte nicht geöffnet werden. Bitte Berechtigung erteilen oder die Datei erneut über „Datei öffnen“ wählen.",
    openFileFailedRetry:
      "Datei konnte nicht geöffnet werden. Bitte die Datei erneut über „Datei öffnen“ wählen.",
    libraryEntryMissing:
      "Datei wurde im Übersichtsordner nicht gefunden. Bitte „Öffnen…“ nutzen oder den Ordner neu wählen.",
    backupOpenEmpty: "Backup wurde nicht gefunden oder ist leer.",
    actionOpenBackup: "Backup öffnen",
    actionOpen: "Öffnen",
    actionNew: "Neu",
    actionClose: "Schließen",
    actionPasteJson: "JSON einfügen",
    backupLoadFailed: "Backup konnte nicht geladen werden.",
    collabNoBackupLoad:
      "Während der Kollaboration kann kein Backup in den Editor geladen werden. Bitte zuerst den Raum verlassen.",
    collabNoJsonLoad:
      "Während der Kollaboration kann kein JSON in den Editor geladen werden. Bitte zuerst den Raum verlassen.",
    collabNoPaste:
      "Während der Kollaboration kann kein {kind} eingefügt werden. Bitte zuerst den Raum verlassen.",
    keepEditorAfterConflict:
      "Editor behalten — die geöffnete Datei wurde nicht überschrieben. Nutze „Speichern unter…“, wenn du speichern willst.",
    restorePreCollabConfirm:
      "Stand vor dem Raum wiederherstellen?\n\nDer aktuelle Board-Inhalt (Raum-Stand) wird im Editor durch die ältere lokale Kopie ersetzt. Die Arbeitsdatei wird dabei nicht überschrieben.\n\nWähle Abbrechen und danach „Raum verlassen“, wenn du den Remote-Stand behalten willst.",
    restorePreCollabFailed: "Vorheriger Stand konnte nicht wiederhergestellt werden.",
    restorePreCollabDone:
      "Stand vor dem Raum wiederhergestellt. Die Arbeitsdatei wurde nicht überschrieben — nutze „Speichern unter…“, wenn du speichern willst.",
    invalidImportJson: "Ungültiges E2-JSON oder KI-Kontext-JSON.",
    invalidImportFormat:
      "Ungültiges E2-JSON, KI-Kontext oder Diagramm (Mermaid / PlantUML).",
    fileReadFailed: "Datei konnte nicht gelesen werden.",
    openFileFailedOpenDialog:
      "Datei konnte nicht geöffnet werden. Bitte Berechtigung erteilen oder die Datei erneut über „Öffnen…“ wählen.",
    pasteFileName: "Einfügen",
  },
} as const;
