"use client";

import { useEffect, useState } from "react";

import {
  imageSourceCacheKey,
  loadBoardImageObjectUrl,
  readActiveBoardSourceUrl,
  resolveBoardImageSrcSync,
} from "@/lib/board-image";
import type { StormElement } from "@/types/storm-element";

const objectUrlCache = new Map<string, string>();

export function useBoardImageSrc(element: Pick<StormElement, "id" | "metadata">): {
  src: string | null;
  loading: boolean;
} {
  const boardUrl = readActiveBoardSourceUrl();
  const cacheKey = imageSourceCacheKey(element);
  const syncSrc = resolveBoardImageSrcSync(element, boardUrl);

  const [src, setSrc] = useState<string | null>(() => {
    if (syncSrc) return syncSrc;
    return objectUrlCache.get(cacheKey) ?? null;
  });
  const [loading, setLoading] = useState(!syncSrc && Boolean(element.metadata?.imagePath?.trim()));

  useEffect(() => {
    if (syncSrc) {
      setSrc(syncSrc);
      setLoading(false);
      return;
    }

    const path = element.metadata?.imagePath?.trim();
    if (!path) {
      setSrc(null);
      setLoading(false);
      return;
    }

    const cached = objectUrlCache.get(cacheKey);
    if (cached) {
      setSrc(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void loadBoardImageObjectUrl(element, boardUrl).then((url) => {
      if (cancelled) {
        if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
        return;
      }
      if (url?.startsWith("blob:")) objectUrlCache.set(cacheKey, url);
      setSrc(url);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [cacheKey, syncSrc, element, boardUrl]);

  return { src, loading };
}