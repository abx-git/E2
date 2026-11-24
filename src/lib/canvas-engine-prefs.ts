const CANVAS_ENGINE_KEY = "e2.canvasEngine";

export type CanvasEngine = "legacy" | "drawio";

const ENGINE_CHANGE = "e2-canvas-engine-change";

export function readCanvasEngine(defaultEngine: CanvasEngine = "legacy"): CanvasEngine {
  if (typeof window === "undefined") return defaultEngine;
  try {
    const raw = localStorage.getItem(CANVAS_ENGINE_KEY);
    if (raw === "drawio" || raw === "legacy") return raw;
  } catch {
    /* ignore */
  }
  return defaultEngine;
}

export function writeCanvasEngine(engine: CanvasEngine): void {
  try {
    localStorage.setItem(CANVAS_ENGINE_KEY, engine);
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(ENGINE_CHANGE, { detail: engine }));
  }
}

export function subscribeCanvasEngine(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (ev: StorageEvent) => {
    if (ev.key === CANVAS_ENGINE_KEY) onStoreChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(ENGINE_CHANGE, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(ENGINE_CHANGE, onStoreChange);
  };
}