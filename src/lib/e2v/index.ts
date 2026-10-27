export {
  E2V_FORMAT,
  E2V_VERSION,
  E2V_MAGIC,
  E2V_SCHEMA_ID,
  E2V_SCHEMA_FILENAME,
  E2V_MIME,
} from "@/lib/e2v/constants";

export { encodeE2vDocument, encodeE2vSingleView, type EncodeE2vOptions, type E2vEncodeScope } from "@/lib/e2v/encode";
export {
  decodeE2vText,
  isE2vText,
  boardImportPayloadFromE2vText,
  type DecodeE2vOptions,
} from "@/lib/e2v/decode";
export {
  E2V_SCHEMA_DOCUMENT,
  E2V_SELECTION_SCHEMA_DOCUMENT,
  E2V_ENGLISH_LLM_PROMPT,
  E2V_SELECTION_LLM_PROMPT,
  stringifyE2vSchema,
  stringifyE2vSelectionSchema,
} from "@/lib/e2v/schema";
export {
  buildE2vClipboardPackage,
  buildE2vSelectionClipboardPackage,
  buildE2vSchemaPromptPackage,
  buildE2vSchemaPromptPackageForView,
  e2vSchemaPromptExportFilename,
  extractE2vFromClipboardText,
  e2vExportFilename,
} from "@/lib/e2v/package";
export {
  sliceCanvasViewForSelection,
  collectE2vEntityIds,
  collectE2vScopeDeleteIds,
  type E2vSelectionInput,
} from "@/lib/e2v/selection-slice";
export {
  mergeImportedViewIntoCanvas,
  reconcilePatchConnectorsWithBase,
} from "@/lib/e2v/merge-into-view";
