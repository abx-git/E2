/**
 * Coalesce rapid draw.io → store writes (e.g. drag bursts) before collab Yjs payload sync.
 */
export function createDrawioStoreSyncCoalescer(run: () => void, delayMs = 120): {
  schedule: () => void;
  flush: () => void;
  cancel: () => void;
} {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const flush = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    run();
  };
  const schedule = () => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(flush, delayMs);
  };
  const cancel = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };
  return { schedule, flush, cancel };
}