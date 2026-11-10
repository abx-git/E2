/**
 * E2 embed API for React hosts (Next.js, MDX, Vite, etc.).
 *
 * Node / markdown without React: use `event-storming-tool/embed/markdown-it`
 * and `public/embed-host.js` — see `docs/EMBED.md`.
 */

export { E2BoardEmbed, type E2BoardEmbedProps } from "@/components/e2-board-embed";
export { BoardEmbedShell, type BoardEmbedShellProps } from "@/components/board-embed-shell";
export {
  loadEmbedBoardFromText,
  loadEmbedBoardFromPayload,
  loadEmbedBoardFromUrl,
  type EmbedBoardLoadOptions,
} from "@/lib/embed-board-load";
