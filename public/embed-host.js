/**
 * Optional enhancements for E2 markdown embeds (fullscreen message relay).
 * Iframes from markdown-it-e2 already work without this script.
 */
(function () {
  if (typeof window === "undefined") return;

  const MESSAGE = "e2/embed-load";

  window.addEventListener("message", (event) => {
    if (event.data?.type !== "e2/embed-inline") return;
    const host = document.querySelector(
      `iframe[data-e2-inline-id="${event.data.id}"]`,
    );
    if (!host || !host.contentWindow) return;
    host.contentWindow.postMessage(
      { type: MESSAGE, json: event.data.json, editable: event.data.editable },
      "*",
    );
  });

  /** Send inline JSON into an iframe embed (call after iframe load). */
  window.e2SendInlineBoard = function e2SendInlineBoard(iframe, json, opts) {
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage(
      {
        type: MESSAGE,
        json: typeof json === "string" ? json : JSON.stringify(json),
        editable: Boolean(opts?.editable),
      },
      "*",
    );
  };
})();
