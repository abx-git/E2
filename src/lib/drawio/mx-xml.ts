/** Extract mxGraphModel XML from a draw.io mxfile wrapper. */
export function extractMxGraphModelXml(mxfile: string): string {
  const doc = new DOMParser().parseFromString(mxfile, "text/xml");
  const model = doc.querySelector("mxGraphModel");
  if (!model) {
    throw new Error("mxGraphModel not found in mxfile");
  }
  return new XMLSerializer().serializeToString(model);
}