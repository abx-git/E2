import { normalizeExternalUrl } from "@/lib/board-link";
import { readBoardUrlFromSearch } from "@/lib/board-remote-url";
import {
  isFileLibraryAttached,
  normalizeLibraryRelativePath,
  relativeLibraryPathForHandle,
  resolveLibraryFileHandle,
} from "@/lib/file-library";
import { getWorkingFileHandle } from "@/lib/working-file";
import type { ElementMetadata, StormElement } from "@/types/storm-element";

const DEFAULT_IMAGE_MIME = "image/png";

export function guessImageMimeType(
  pathOrName: string | undefined,
  fallback: string = DEFAULT_IMAGE_MIME,
): string {
  const lower = (pathOrName ?? "").toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".png")) return "image/png";
  return fallback;
}

export function boardJsonBaseUrl(rawBoardUrl: string | null | undefined): string | null {
  const trimmed = rawBoardUrl?.trim();
  if (!trimmed) return null;
  try {
    return new URL(trimmed).href;
  } catch {
    return null;
  }
}

export function readActiveBoardSourceUrl(): string | null {
  if (typeof window === "undefined") return null;
  return boardJsonBaseUrl(readBoardUrlFromSearch(window.location.search));
}

/** Resolve `imagePath` next to a remote `board.e2.json` URL. */
export function joinImagePathToBoardUrl(boardJsonUrl: string, imagePath: string): string | null {
  const base = boardJsonBaseUrl(boardJsonUrl);
  if (!base) return null;
  const rel = normalizeLibraryRelativePath(imagePath.trim());
  if (!rel) return null;
  try {
    return new URL(rel, base).href;
  } catch {
    return null;
  }
}

export function dirnameLibraryPath(filePath: string): string {
  const normalized = normalizeLibraryRelativePath(filePath);
  const idx = normalized.lastIndexOf("/");
  if (idx <= 0) return "";
  return normalized.slice(0, idx);
}

/** Path of an asset relative to the board JSON directory (for storing in metadata). */
export function imagePathRelativeToBoard(boardJsonPath: string, assetLibraryPath: string): string {
  const boardDir = dirnameLibraryPath(boardJsonPath);
  const asset = normalizeLibraryRelativePath(assetLibraryPath);
  if (!boardDir) return asset;
  const prefix = `${boardDir}/`;
  if (asset.startsWith(prefix)) return asset.slice(prefix.length);
  return asset;
}

export function imageDataUrlFromMetadata(
  mimeType: string | undefined,
  base64: string | undefined,
  hintPath?: string,
): string | null {
  const payload = base64?.trim();
  if (!payload) return null;
  const mime = (mimeType?.trim() || guessImageMimeType(hintPath)).trim() || DEFAULT_IMAGE_MIME;
  return `data:${mime};base64,${payload}`;
}

/** Whether the element declares any image source (path, URL, or embedded data). */
export function imageHasSource(el: Pick<StormElement, "metadata">): boolean {
  const meta = el.metadata;
  if (!meta) return false;
  if (meta.imagePath?.trim()) return true;
  if (meta.imageUrl?.trim()) return true;
  if (meta.imageDataBase64?.trim()) return true;
  return false;
}

/**
 * Resolve a displayable `src` synchronously when possible (URL, data URL, or HTTP path beside board).
 * Returns `null` when only a library-relative path needs async FS access.
 */
export function resolveBoardImageSrcSync(
  el: Pick<StormElement, "metadata">,
  boardSourceUrl: string | null = readActiveBoardSourceUrl(),
): string | null {
  const meta = el.metadata;
  if (!meta) return null;

  const path = meta.imagePath?.trim();
  if (path) {
    if (boardSourceUrl) {
      return joinImagePathToBoardUrl(boardSourceUrl, path);
    }
    return null;
  }

  const url = normalizeExternalUrl(meta.imageUrl);
  if (url) return url;

  return imageDataUrlFromMetadata(meta.imageMimeType, meta.imageDataBase64, meta.imagePath);
}

export function imageFitStyle(fit: ElementMetadata["imageFit"]): "cover" | "contain" {
  return fit === "contain" ? "contain" : "cover";
}

export function imageSourceCacheKey(el: Pick<StormElement, "id" | "metadata">): string {
  const meta = el.metadata;
  return [
    el.id,
    meta?.imagePath ?? "",
    meta?.imageUrl ?? "",
    meta?.imageDataBase64?.length ?? 0,
    meta?.imageMimeType ?? "",
  ].join("|");
}

/** Library path for an image sibling of the working board file. */
export async function resolveBoardRelativeImageLibraryPath(imagePath: string): Promise<string | null> {
  const rel = normalizeLibraryRelativePath(imagePath.trim());
  if (!rel) return null;
  const boardHandle = getWorkingFileHandle();
  if (!boardHandle) return rel;
  try {
    const boardPath = await relativeLibraryPathForHandle(boardHandle);
    const boardDir = dirnameLibraryPath(boardPath);
    return boardDir ? `${boardDir}/${rel}` : rel;
  } catch {
    return rel;
  }
}

export async function loadBoardImageObjectUrl(
  el: Pick<StormElement, "metadata">,
  boardSourceUrl: string | null = readActiveBoardSourceUrl(),
): Promise<string | null> {
  const sync = resolveBoardImageSrcSync(el, boardSourceUrl);
  if (sync) return sync;

  const path = el.metadata?.imagePath?.trim();
  if (!path) return null;

  const libraryPath = await resolveBoardRelativeImageLibraryPath(path);
  if (!libraryPath) return null;

  let handle: FileSystemFileHandle | null = null;
  if (isFileLibraryAttached()) {
    handle = await resolveLibraryFileHandle(libraryPath);
  }
  if (!handle) return null;
  try {
    const file = await handle.getFile();
    return URL.createObjectURL(file);
  } catch {
    return null;
  }
}

export async function readFileAsImageEmbed(
  file: File,
): Promise<{ imageDataBase64: string; imageMimeType: string }> {
  const mime =
    file.type?.startsWith("image/") ? file.type : guessImageMimeType(file.name);
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return {
    imageMimeType: mime,
    imageDataBase64: btoa(binary),
  };
}

export async function pickBoardImageFromDisk(): Promise<
  | {
      imagePath?: string;
      imageUrl?: string;
      imageDataBase64?: string;
      imageMimeType?: string;
    }
  | null
> {
  if (typeof window === "undefined") return null;
  if (!window.showOpenFilePicker) {
    return null;
  }
  let handles: FileSystemFileHandle[];
  try {
    handles = await window.showOpenFilePicker({
      multiple: false,
      types: [
        {
          description: "Images",
          accept: {
            "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"],
          },
        },
      ],
    });
  } catch {
    return null;
  }
  const handle = handles[0];
  if (!handle) return null;
  const file = await handle.getFile();

  const boardHandle = getWorkingFileHandle();
  if (boardHandle && isFileLibraryAttached()) {
    try {
      const boardPath = await relativeLibraryPathForHandle(boardHandle);
      const assetPath = await relativeLibraryPathForHandle(handle);
      return {
        imagePath: imagePathRelativeToBoard(boardPath, assetPath),
        imageMimeType: file.type || guessImageMimeType(file.name),
      };
    } catch {
      /* fall through to embed */
    }
  }

  const embedded = await readFileAsImageEmbed(file);
  return {
    imageDataBase64: embedded.imageDataBase64,
    imageMimeType: embedded.imageMimeType,
  };
}

export function clearImageSourcesMetadata(
  meta: StormElement["metadata"] | undefined,
): StormElement["metadata"] {
  const next = { ...(meta ?? {}) };
  delete next.imagePath;
  delete next.imageUrl;
  delete next.imageDataBase64;
  delete next.imageMimeType;
  return Object.keys(next).length ? next : undefined;
}