export const alertsEn = {
  alerts: {
    noBoardToBackup: "No board content to back up.",
    boardLoadFailed: "Could not load board.",
    jsonClipboardFailed:
      "Could not copy JSON to the system clipboard. Check browser permissions or download JSON.",
    viewExportFailed: "Could not export view.",
    elementAttributesCopied: "Card attributes copied.",
    elementAttributesPasteNoClipboard: "No copied card attributes.",
    elementAttributesPasteNoTarget: "Select a target card (exactly one element).",
    elementAttributesPasteSameElement: "Cannot paste attributes onto the same card.",
    aiContextExportFailed: "Could not export AI package.",
    aiContextClipboardFailed:
      "Could not copy the AI package to the clipboard. Check browser permissions.",
    mermaidExportFailed: "Could not export Mermaid.",
    mermaidClipboardFailed: "Could not copy Mermaid to the clipboard. Download instead.",
    plantUmlExportFailed: "Could not export PlantUML.",
    plantUmlClipboardFailed: "Could not copy PlantUML to the clipboard. Download instead.",
    saveAsNeedsFsApi:
      "Save as… requires the File System API (Chrome, Edge, or Brave). Export JSON instead.",
    saveConflictDownloaded:
      "The file changed meanwhile and was not overwritten. A copy of the file on disk was downloaded — use “Save as…” or reopen the file.",
    saveEmptyOverNonempty: "An empty state will not be written to the working file.",
    savePaused: "Saving is paused — use “Save as…”.",
    saveNotWriter: "Another tab is saving this file. Use the visible tab.",
    saveFailed: "Save failed — file not overwritten.",
    saveFailedShort: "Save failed.",
    collabNoNewFile:
      "While collaborating you cannot create a new file — that would overwrite the room. Leave the room first.",
    collabNoOpenFile:
      "While collaborating you cannot load another file into the editor — that would overwrite the room. Leave the room first.",
    collabNoCloseFile:
      "While collaborating you cannot close the file. Leave the room first.",
    noWorkingFileLinked: "No working file linked — use Save as… first.",
    renamePrompt: "New file name:",
    openFileFailedPermission:
      "Could not open file. Grant permission or choose the file again via Open file.",
    openFileFailedRetry: "Could not open file. Choose the file again via Open file.",
    libraryEntryMissing:
      "File not found in the overview folder. Use Open… or pick the folder again.",
    backupOpenEmpty: "Backup was not found or is empty.",
    actionOpenBackup: "Open backup",
    actionOpen: "Open",
    actionNew: "New",
    actionClose: "Close",
    actionPasteJson: "Paste JSON",
    backupLoadFailed: "Could not load backup.",
    collabNoBackupLoad:
      "While collaborating you cannot load a backup into the editor. Leave the room first.",
    collabNoJsonLoad:
      "While collaborating you cannot load JSON into the editor. Leave the room first.",
    collabNoPaste: "While collaborating you cannot paste {kind}. Leave the room first.",
    keepEditorAfterConflict:
      "Editor kept — the open file was not overwritten. Use “Save as…” if you want to save.",
    restorePreCollabConfirm:
      "Restore pre-room state?\n\nThe current board (room state) will be replaced in the editor by the older local copy. The working file will not be overwritten.\n\nChoose Cancel and then “Leave room” if you want to keep the remote state.",
    restorePreCollabFailed: "Could not restore the previous state.",
    restorePreCollabDone:
      "Pre-room state restored. The working file was not overwritten — use “Save as…” if you want to save.",
    invalidImportJson: "Invalid E2 JSON, E2V, or AI context.",
    invalidImportFormat: "Invalid E2 JSON, E2V, AI context, or diagram (Mermaid / PlantUML).",
    fileReadFailed: "Could not read file.",
    openFileFailedOpenDialog:
      "Could not open file. Grant permission or choose the file again via Open…",
    pasteFileName: "Paste",
    dropImportKind: "a file",
    collabSupabaseNotConfigured: "Supabase is not configured",
    collabSupabaseNotConfiguredDocs:
      "Supabase is not configured (see docs/COLLABORATION.md)",
    collabRoomCreateFailed: "Room could not be created",
    collabRoomNotFound: "Room not found or expired",
    collabRoomExpired: "Room has expired",
    collabInvalidRoomSnapshot: "No valid board snapshot in the room",
    collabPassiveTabNoWrite: "This tab cannot write right now (passive).",
    collabNoSession: "No session",
    collabServerChangedAgain: "The server changed again — please choose again.",
    collabPushLocalConfirm:
      "Push my state to the server?\n\nThis overwrites the current server state for all participants. Export JSON first if you want a backup.",
    collabRealtimeLimited: "Realtime broadcast limited",
    collabCreateNeedsSaveAs:
      "Use Save as… first — the room needs a sync target that is written in parallel.",
    collabCreateNeedsSave: "Save first — create a room only with a secured state.",
    collabUrlKeyRequired: "URL and key are required",
    collabUrlHttps: "URL must start with https://",
    collabBrowserOnly: "Can only be saved in the browser",
    collabAnonAuthFailed: "Anonymous sign-in failed",
    collabAnonAuthDisabled:
      "Anonymous Auth is disabled in Supabase. Dashboard: Authentication → Providers → enable Anonymous.",
    collabBroadcastFailed: "Broadcast failed: {detail}",
    collabBroadcastError: "Broadcast error",
    fileNoViews: "The file contains no views.",
  },
} as const;
