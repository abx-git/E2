export const alertsDe = {
  alerts: {
    noBoardToBackup: "Kein Board-Inhalt zum Sichern.",
    boardLoadFailed: "Board konnte nicht geladen werden.",
    jsonClipboardFailed:
      "JSON konnte nicht in die System-Zwischenablage kopiert werden. Bitte Browser-Berechtigung prüfen oder JSON herunterladen.",
    viewExportFailed: "Sicht konnte nicht exportiert werden.",
    elementAttributesCopied: "Kartenattribute kopiert.",
    elementAttributesPasteNoClipboard: "Keine kopierten Kartenattribute.",
    elementAttributesPasteNoTarget: "Zielkarte wählen (genau ein Element).",
    elementAttributesPasteSameElement: "Attribute können nicht auf dieselbe Karte eingefügt werden.",
    aiContextExportFailed: "KI-Paket konnte nicht exportiert werden.",
    aiContextClipboardFailed:
      "KI-Paket konnte nicht in die Zwischenablage kopiert werden. Bitte Browser-Berechtigung prüfen.",
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
    invalidImportJson: "Ungültiges E2-JSON, E2V oder KI-Kontext.",
    invalidImportFormat:
      "Ungültiges E2-JSON, E2V, KI-Kontext oder Diagramm (Mermaid / PlantUML).",
    fileReadFailed: "Datei konnte nicht gelesen werden.",
    openFileFailedOpenDialog:
      "Datei konnte nicht geöffnet werden. Bitte Berechtigung erteilen oder die Datei erneut über „Öffnen…“ wählen.",
    pasteFileName: "Einfügen",
    dropImportKind: "eine Datei",
    collabSupabaseNotConfigured: "Supabase nicht konfiguriert",
    collabSupabaseNotConfiguredDocs:
      "Supabase nicht konfiguriert (siehe docs/COLLABORATION.md)",
    collabRoomCreateFailed: "Raum konnte nicht erstellt werden",
    collabRoomNotFound: "Raum nicht gefunden oder abgelaufen",
    collabRoomExpired: "Raum ist abgelaufen",
    collabInvalidRoomSnapshot: "Kein gültiger Board-Snapshot im Raum",
    collabPassiveTabNoWrite: "Dieser Tab darf gerade nicht schreiben (passiv).",
    collabNoSession: "Keine Session",
    collabServerChangedAgain: "Server hat sich erneut geändert — bitte nochmal wählen.",
    collabPushLocalConfirm:
      "Meinen Stand auf den Server schreiben?\n\nDas überschreibt den aktuellen Server-Stand für alle Teilnehmer. Besser vorher JSON exportieren.",
    collabRealtimeLimited: "Realtime-Broadcast eingeschränkt",
    collabCreateNeedsSaveAs:
      "Zuerst „Speichern unter…“ — der Raum braucht ein Sync-Ziel, das parallel mitgeschrieben wird.",
    collabCreateNeedsSave: "Zuerst speichern — Raum erstellen nur mit gesichertem Stand.",
    collabUrlKeyRequired: "URL und Key sind erforderlich",
    collabUrlHttps: "URL muss mit https:// beginnen",
    collabBrowserOnly: "Nur im Browser speicherbar",
    collabAnonAuthFailed: "Anonymous Auth fehlgeschlagen",
    collabAnonAuthDisabled:
      "Anonymous Auth ist in Supabase deaktiviert. Dashboard: Authentication → Providers → Anonymous aktivieren.",
    collabBroadcastFailed: "Broadcast fehlgeschlagen: {detail}",
    collabBroadcastError: "Broadcast-Fehler",
    fileNoViews: "Die Datei enthält keine Sichten.",
    fileNotLinked: "Keine Arbeitsdatei verknüpft.",
    wfFileExternallyChanged: "Datei wurde extern geändert.",
    wfWriteIoFailed: "Schreiben fehlgeschlagen — Datei ggf. prüfen.",
    wfImportFailed: "Import fehlgeschlagen.",
    wfFileSwitchBlocked:
      "Dateiwechsel läuft — Speichern in die neue Datei ist blockiert, bis sie geladen ist.",
    wfMobileCopyChanged: "Mobile-Kopie wurde extern geändert.",
    wfRenameNotSupported:
      "Umbenennen wird in diesem Browser nicht unterstützt. Nutze Speichern unter…",
    wfFilePermissionDenied: "Keine Schreibberechtigung für die Datei.",
    wfRenameFailed: "Umbenennen fehlgeschlagen.",
    wfNotWriterTab: "Dieser Tab schreibt die Datei gerade nicht (anderer Tab ist aktiv).",
    wfUrlContextMismatch: "URL und verknüpfte Datei stimmen nicht überein.",
    wfFenceEmptyOverNonempty:
      "Leerer oder inhaltsloser Stand wird nicht über eine nicht-leere Arbeitsdatei geschrieben.",
    wfUnknownDiskBaseline:
      "Dateistand unbekannt — Speichern abgebrochen (kein Überschreiben ohne Basis).",
    wfUnknownSyncBaseline:
      "Kein bekannter Sync-Stand zur Datei — Speichern abgebrochen. Bitte Datei neu öffnen oder Speichern unter…",
    wfContentCasMismatch:
      "Die Datei wurde außerhalb dieses Tabs geändert. Lokal nicht überschrieben — Speichern unter… oder Datei neu laden.",
    linkNoViewSelected: "Keine Sicht gewählt.",
    linkViewNotFound: "Sicht nicht gefunden (gelöscht?).",
    linkInvalidUrl: "Keine gültige URL.",
    remoteInvalidHttpUrl: "Keine gültige http(s)-URL.",
    remoteHttpsOnly: "Nur HTTPS-URLs (oder http://localhost) sind erlaubt.",
    remoteCheckAborted: "Prüfung abgebrochen.",
    remoteLoadFailedCors:
      "Datei konnte nicht geladen werden (Netzwerk oder CORS). Die Quelle muss Cross-Origin-Zugriff von E2 erlauben.",
    remoteHttpStatus: "HTTP {status} — Datei nicht erreichbar.",
    remoteResponseUnreadable: "Antwort konnte nicht gelesen werden.",
    remoteFileEmpty: "Die Datei ist leer.",
    remoteInvalidBoard:
      "Kein gültiges E2-Board (.storm.json). Format/Version passen nicht zum Schema.",
    remoteUnnamedBoard: "Unbenanntes Board",
    wfPersistPaused:
      "Speichern in die Arbeitsdatei ist pausiert (fremder Stand oder Kollaboration). Nutze Speichern unter…",
  },
} as const;
