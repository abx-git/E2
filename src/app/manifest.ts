import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "E2 Event Storming",
    short_name: "E2",
    description: "Event Storming Tool mit lokaler JSON-Persistenz",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f5f7",
    theme_color: "#0f172a",
    icons: [],
  };
}
