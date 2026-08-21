/** Writes UTF-8 text to the OS clipboard. Returns false if the write is not possible. */
export async function writeClipboardText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* execCommand fallback */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

/**
 * Writes XML as both text/plain and text/html so diagrams.net can paste it.
 * Falls back to plain text when ClipboardItem is unavailable.
 */
export async function writeClipboardXml(xml: string): Promise<boolean> {
  try {
    if (
      typeof navigator !== "undefined" &&
      navigator.clipboard?.write &&
      typeof ClipboardItem !== "undefined"
    ) {
      const html = `<div data-type="text/plain">${xml
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")}</div>`;
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": new Blob([xml], { type: "text/plain" }),
          "text/html": new Blob([html], { type: "text/html" }),
        }),
      ]);
      return true;
    }
  } catch {
    /* fallback */
  }
  return writeClipboardText(xml);
}
