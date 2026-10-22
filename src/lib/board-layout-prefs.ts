const ELEMENTS_KEY = "e2.layout.elementsPanel";
const PROPERTIES_KEY = "e2.layout.propertiesPanel";

export function readElementsPanelOpen(defaultOpen = true): boolean {
  return readBool(ELEMENTS_KEY, defaultOpen);
}

export function readPropertiesPanelOpen(defaultOpen = true): boolean {
  return readBool(PROPERTIES_KEY, defaultOpen);
}

export function writeElementsPanelOpen(open: boolean): void {
  writeBool(ELEMENTS_KEY, open);
}

export function writePropertiesPanelOpen(open: boolean): void {
  writeBool(PROPERTIES_KEY, open);
}

function readBool(key: string, defaultOpen: boolean): boolean {
  if (typeof window === "undefined") return defaultOpen;
  try {
    const raw = sessionStorage.getItem(key);
    if (raw === "0" || raw === "false") return false;
    if (raw === "1" || raw === "true") return true;
  } catch {
    /* ignore */
  }
  return defaultOpen;
}

function writeBool(key: string, open: boolean): void {
  try {
    sessionStorage.setItem(key, open ? "1" : "0");
  } catch {
    /* ignore */
  }
}
