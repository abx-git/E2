/**
 * One-page PDF with an embedded JPEG (no extra PDF library).
 */

export function buildJpegPdf(
  jpeg: Uint8Array,
  pageWidthPt: number,
  pageHeightPt: number,
  imageWidthPx: number = pageWidthPt,
  imageHeightPx: number = pageHeightPt,
): Uint8Array {
  const pageW = Math.max(1, Math.round(pageWidthPt));
  const pageH = Math.max(1, Math.round(pageHeightPt));
  const imgW = Math.max(1, Math.round(imageWidthPx));
  const imgH = Math.max(1, Math.round(imageHeightPx));
  const encoder = new TextEncoder();

  const parts: Uint8Array[] = [];
  let byteLength = 0;
  const track = (chunk: Uint8Array) => {
    parts.push(chunk);
    byteLength += chunk.length;
  };
  const trackText = (text: string) => track(encoder.encode(text));

  const objectOffsets: number[] = [0];

  trackText("%PDF-1.4\n");

  objectOffsets.push(byteLength);
  trackText("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  objectOffsets.push(byteLength);
  trackText("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");

  objectOffsets.push(byteLength);
  trackText(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Contents 4 0 R /Resources << /XObject << /Im0 5 0 R >> >> >>\nendobj\n`,
  );

  const contentStream = `q\n${pageW} 0 0 ${pageH} 0 0 cm\n/Im0 Do\nQ\n`;
  const contentBytes = encoder.encode(contentStream);
  objectOffsets.push(byteLength);
  trackText(`4 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n`);
  track(contentBytes);
  trackText("\nendstream\nendobj\n");

  objectOffsets.push(byteLength);
  trackText(
    `5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
  );
  track(jpeg);
  trackText("\nendstream\nendobj\n");

  const xrefStart = byteLength;
  trackText(`xref\n0 ${objectOffsets.length}\n`);
  trackText("0000000000 65535 f \n");
  for (let i = 1; i < objectOffsets.length; i += 1) {
    trackText(`${String(objectOffsets[i]).padStart(10, "0")} 00000 n \n`);
  }
  trackText(
    `trailer\n<< /Size ${objectOffsets.length} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`,
  );

  const out = new Uint8Array(byteLength);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

export function downloadPdfBytes(filename: string, bytes: Uint8Array): void {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const blob = new Blob([copy], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) throw new Error("Ungültiges Bild-Data-URL");
  const binary = atob(dataUrl.slice(comma + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function defaultCanvasPdfFilename(stamp = new Date()): string {
  const y = stamp.getFullYear();
  const m = String(stamp.getMonth() + 1).padStart(2, "0");
  const d = String(stamp.getDate()).padStart(2, "0");
  const hh = String(stamp.getHours()).padStart(2, "0");
  const mm = String(stamp.getMinutes()).padStart(2, "0");
  return `e2-canvas-${y}${m}${d}-${hh}${mm}.pdf`;
}

/** Raster canvas → one-page JPEG PDF download. */
export function downloadCanvasAsPdf(
  canvas: HTMLCanvasElement,
  cssWidth: number,
  cssHeight: number,
  filename?: string,
  quality = 0.92,
): void {
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  const jpeg = dataUrlToUint8Array(dataUrl);
  const pdf = buildJpegPdf(jpeg, cssWidth, cssHeight, canvas.width, canvas.height);
  downloadPdfBytes(filename ?? defaultCanvasPdfFilename(), pdf);
}
