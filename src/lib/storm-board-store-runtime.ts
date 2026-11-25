/**
 * Lazy access to the Zustand board store — breaks circular imports between
 * `storm-board-store` and clipboard UI helpers on the webpack client bundle.
 */
type StormBoardStoreModule = typeof import("@/store/storm-board-store");

function loadStormBoardStoreModule(): StormBoardStoreModule {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("@/store/storm-board-store") as StormBoardStoreModule;
}

export function getUseStormBoardStore(): StormBoardStoreModule["useStormBoardStore"] {
  return loadStormBoardStoreModule().useStormBoardStore;
}

export function getStormBoardState(): ReturnType<StormBoardStoreModule["useStormBoardStore"]["getState"]> {
  return getUseStormBoardStore().getState();
}