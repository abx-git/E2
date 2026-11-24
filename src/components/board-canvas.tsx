"use client";

import { useEffect, useState } from "react";

import { DrawioCanvas } from "@/components/drawio-canvas";
import { StormCanvas } from "@/components/storm-canvas";
import {
  readCanvasEngine,
  subscribeCanvasEngine,
  type CanvasEngine,
} from "@/lib/canvas-engine-prefs";

/**
 * SSR / static export always renders legacy canvas first so HTML matches hydration.
 * Engine from localStorage applies after mount only.
 */
export function BoardCanvas() {
  const [engine, setEngine] = useState<CanvasEngine>("legacy");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setEngine(readCanvasEngine());
    setReady(true);
    return subscribeCanvasEngine(() => setEngine(readCanvasEngine()));
  }, []);

  if (!ready || engine === "legacy") return <StormCanvas />;
  return <DrawioCanvas />;
}