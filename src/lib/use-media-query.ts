"use client";

import { useEffect, useState } from "react";

/** Subscribe to a CSS media query (defaults to false until mounted). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);

  return matches;
}

/** Matches Tailwind `lg` breakpoint — layout switches below 1024px. */
export function useIsMobileLayout(): boolean {
  return useMediaQuery("(max-width: 1023px)");
}

/** Coarse pointer / touch-primary devices. */
export function useIsCoarsePointer(): boolean {
  return useMediaQuery("(pointer: coarse)");
}
