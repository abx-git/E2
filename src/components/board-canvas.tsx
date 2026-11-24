"use client";

import { useSyncExternalStore } from "react";

import { DrawioCanvas } from "@/components/drawio-canvas";
import { StormCanvas } from "@/components/storm-canvas";
import { readCanvasEngine, subscribeCanvasEngine } from "@/lib/canvas-engine-prefs";

export function BoardCanvas() {
  const engine = useSyncExternalStore(subscribeCanvasEngine, readCanvasEngine, () => "legacy" as const);
  if (engine === "drawio") return <DrawioCanvas />;
  return <StormCanvas />;
}