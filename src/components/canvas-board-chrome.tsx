"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  BoxSelect,
  ClipboardCopy,
  Download,
  FileText,
  Image,
  Layers,
  Link2,
  Minus,
  MoreHorizontal,
  Search,
  SquareDashed,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { lineArrowHeadShortLabel } from "@/components/canvas-lines";
import { clampZoom } from "@/lib/canvas-viewport";
import { matchElementSearch, normalizeSearchQuery } from "@/lib/element-search";
import {
  copyBoardDrawioToClipboard,
  copyBoardPromptToClipboard,
  exportBoardPdf,
  exportBoardPng,
  exportBoardSvg,
} from "@/lib/storm-export";
import { LINE_ARROW_HEADS, LINE_ARROW_HEAD_LABELS } from "@/types/canvas-annotation";
import { useStormBoardStore } from "@/store/storm-board-store";

type CanvasTool = "select" | "connect" | "bc" | "line";

function ToolIconButton({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={[
        "flex h-8 w-8 max-lg:h-10 max-lg:w-10 items-center justify-center rounded-lg transition touch-manipulation",
        active
          ? "dock-control-active"
          : "text-[var(--muted)] hover:bg-[var(--control)] hover:text-[var(--text)]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function ViewMenu({
  open,
  onClose,
  anchorRef,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const timeline = useStormBoardStore((s) => s.timeline);
  const setTimeline = useStormBoardStore((s) => s.setTimeline);
  const snapToTimeline = useStormBoardStore((s) => s.snapToTimeline);
  const setSnapToTimeline = useStormBoardStore((s) => s.setSnapToTimeline);
  const snapToGrid = useStormBoardStore((s) => s.snapToGrid);
  const setSnapToGrid = useStormBoardStore((s) => s.setSnapToGrid);
  const focusMode = useStormBoardStore((s) => s.focusMode);
  const setFocusMode = useStormBoardStore((s) => s.setFocusMode);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || anchorRef.current?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className="dock-surface absolute bottom-[calc(100%+0.4rem)] left-0 z-50 min-w-[14rem] rounded-xl p-2 shadow-dock"
      role="menu"
    >
      <p className="group-label px-2 pb-1.5 pt-1">Ansicht</p>
      <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-[var(--control)]">
        <input
          type="checkbox"
          checked={timeline.visible !== false}
          onChange={(e) => setTimeline({ visible: e.target.checked })}
        />
        Timeline anzeigen
      </label>
      <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-[var(--control)]">
        <input
          type="checkbox"
          checked={snapToTimeline}
          onChange={(e) => setSnapToTimeline(e.target.checked)}
        />
        An Timeline einrasten
      </label>
      <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-[var(--control)]">
        <input
          type="checkbox"
          checked={snapToGrid}
          onChange={(e) => setSnapToGrid(e.target.checked)}
        />
        Raster
      </label>
      <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-[var(--control)]">
        <input
          type="checkbox"
          checked={focusMode}
          onChange={(e) => setFocusMode(e.target.checked)}
        />
        Fokus (nur Palette-Typ)
      </label>
    </div>
  );
}

type SceneExportKind = "png" | "pdf" | null;
type ClipboardExportKind = "prompt" | "drawio" | null;

function ExportMenu({
  open,
  onClose,
  anchorRef,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<SceneExportKind>(null);
  const [copied, setCopied] = useState<ClipboardExportKind>(null);
  const copiedTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || anchorRef.current?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, anchorRef]);

  useEffect(() => {
    return () => {
      if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
    };
  }, []);

  if (!open) return null;

  const markCopied = (kind: ClipboardExportKind) => {
    setCopied(kind);
    if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
    copiedTimer.current = window.setTimeout(() => setCopied(null), 1400);
  };

  const runRaster = async (kind: "png" | "pdf") => {
    if (busy) return;
    setBusy(kind);
    try {
      if (kind === "png") await exportBoardPng();
      else exportBoardPdf();
    } catch (err) {
      console.error(`Canvas-${kind.toUpperCase()}-Export fehlgeschlagen`, err);
      window.alert(`${kind.toUpperCase()}-Export fehlgeschlagen. Bitte erneut versuchen.`);
    } finally {
      setBusy(null);
    }
  };

  const runCopy = async (kind: "prompt" | "drawio") => {
    const ok =
      kind === "prompt"
        ? await copyBoardPromptToClipboard()
        : await copyBoardDrawioToClipboard();
    if (ok) markCopied(kind);
    else window.alert("Kopieren in die Zwischenablage ist fehlgeschlagen.");
  };

  return (
    <div
      ref={panelRef}
      className="dock-surface absolute right-0 top-[calc(100%+0.4rem)] z-50 min-w-[16.5rem] rounded-xl p-2 shadow-dock"
      role="menu"
    >
      <p className="group-label px-2 pb-1.5 pt-1">Aktive Sicht</p>
      <ExportMenuItem
        icon={FileText}
        label={copied === "prompt" ? "Kopiert" : "Prompt"}
        detail="Text für KI-Chat"
        disabled={busy !== null}
        onClick={() => void runCopy("prompt")}
      />
      <ExportMenuItem
        icon={Image}
        label={busy === "png" ? "PNG…" : "PNG"}
        detail="Rasterbild"
        disabled={busy !== null}
        onClick={() => void runRaster("png")}
      />
      <ExportMenuItem
        icon={Download}
        label="SVG"
        detail="Draw.io-Datei"
        disabled={busy !== null}
        onClick={() => {
          try {
            exportBoardSvg();
          } catch (err) {
            console.error("Canvas-SVG-Export fehlgeschlagen", err);
            window.alert("SVG-Export fehlgeschlagen. Bitte erneut versuchen.");
          }
        }}
      />
      <ExportMenuItem
        icon={Download}
        label={busy === "pdf" ? "PDF…" : "PDF"}
        detail="Eine Seite, wie PNG"
        disabled={busy !== null}
        onClick={() => void runRaster("pdf")}
      />
      <ExportMenuItem
        icon={ClipboardCopy}
        label={copied === "drawio" ? "Kopiert" : "Draw.io kopieren"}
        detail="In diagrams.net einfügen"
        disabled={busy !== null}
        onClick={() => void runCopy("drawio")}
      />
    </div>
  );
}

function ExportMenuItem({
  icon: Icon,
  label,
  detail,
  disabled,
  onClick,
}: {
  icon: typeof Download;
  label: string;
  detail: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-[var(--control)] disabled:opacity-50"
    >
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--muted)]" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block leading-tight text-[var(--text)]">{label}</span>
        <span className="block text-[0.65rem] leading-snug text-[var(--muted)]">{detail}</span>
      </span>
    </button>
  );
}

export interface CanvasBoardChromeProps {
  bcMode: boolean;
  onToggleBcMode: () => void;
  /** Contextual status when a tool / draft is active. */
  status?: {
    message: ReactNode;
    onCancel?: () => void;
  } | null;
}

/** Floating tool + zoom chrome for the canvas. */
export function CanvasBoardChrome({ bcMode, onToggleBcMode, status }: CanvasBoardChromeProps) {
  const relationMode = useStormBoardStore((s) => s.relationMode);
  const setRelationMode = useStormBoardStore((s) => s.setRelationMode);
  const setRelationDraftSource = useStormBoardStore((s) => s.setRelationDraftSource);
  const setContextMapMode = useStormBoardStore((s) => s.setContextMapMode);
  const setContextMapDraftSource = useStormBoardStore((s) => s.setContextMapDraftSource);
  const lineDrawMode = useStormBoardStore((s) => s.lineDrawMode);
  const setLineDrawMode = useStormBoardStore((s) => s.setLineDrawMode);
  const lineArrowHead = useStormBoardStore((s) => s.lineArrowHead);
  const setLineArrowHead = useStormBoardStore((s) => s.setLineArrowHead);
  const addSwimlane = useStormBoardStore((s) => s.addSwimlane);
  const viewport = useStormBoardStore((s) => s.viewport);
  const setViewport = useStormBoardStore((s) => s.setViewport);
  const snapToGrid = useStormBoardStore((s) => s.snapToGrid);
  const focusMode = useStormBoardStore((s) => s.focusMode);
  const searchQuery = useStormBoardStore((s) => s.searchQuery);
  const setSearchQuery = useStormBoardStore((s) => s.setSearchQuery);
  const elements = useStormBoardStore((s) => s.elements);
  const views = useStormBoardStore((s) => s.views);

  const [viewOpen, setViewOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const viewBtnRef = useRef<HTMLButtonElement>(null);
  const exportBtnRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const activeTool: CanvasTool = lineDrawMode
    ? "line"
    : bcMode
      ? "bc"
      : relationMode
        ? "connect"
        : "select";

  const clearConnect = () => {
    setRelationMode(false);
    setRelationDraftSource(null);
    setContextMapMode(false);
    setContextMapDraftSource(null);
  };

  const setTool = (tool: CanvasTool) => {
    if (tool === activeTool && tool !== "select") {
      // Toggle off → back to select
      clearConnect();
      setLineDrawMode(false);
      if (bcMode) onToggleBcMode();
      return;
    }

    clearConnect();
    setLineDrawMode(false);
    if (bcMode && tool !== "bc") onToggleBcMode();

    if (tool === "connect") {
      setRelationMode(true);
    } else if (tool === "bc") {
      if (!bcMode) onToggleBcMode();
    } else if (tool === "line") {
      setLineDrawMode(true);
    }
  };

  const viewHighlighted = viewOpen || snapToGrid || focusMode;
  const searchActive = Boolean(normalizeSearchQuery(searchQuery));
  const viewNameById = Object.fromEntries(views.map((v) => [v.id, v.name]));
  const hitCount = searchActive
    ? elements.filter((el) => matchElementSearch(el, searchQuery, { viewNameById }).match).length
    : 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "f") return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) {
        if (t === searchInputRef.current) {
          e.preventDefault();
          searchInputRef.current?.select();
        }
        return;
      }
      e.preventDefault();
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <div
        className="absolute right-3 top-3 z-30 flex max-w-[min(100%-1.5rem,22rem)] items-start gap-1.5"
        data-canvas-chrome
      >
        <label className="dock-surface flex min-w-0 flex-1 items-center gap-1.5 rounded-xl px-2 py-1 shadow-dock">
          <Search className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" aria-hidden />
          <input
            ref={searchInputRef}
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Escape") {
                e.preventDefault();
                if (searchQuery) setSearchQuery("");
                else (e.target as HTMLInputElement).blur();
              }
            }}
            placeholder="Suchen…"
            aria-label="Elemente suchen"
            className="min-w-0 flex-1 bg-transparent text-xs text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
          />
          {searchActive && (
            <span className="shrink-0 text-[0.65rem] tabular-nums text-[var(--muted)]">
              {hitCount}
            </span>
          )}
          {searchQuery ? (
            <button
              type="button"
              className="rounded p-0.5 text-[var(--muted)] hover:bg-[var(--control)] hover:text-[var(--text)]"
              title="Suche leeren"
              aria-label="Suche leeren"
              onClick={() => {
                setSearchQuery("");
                searchInputRef.current?.focus();
              }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </label>
        <div className="relative shrink-0">
          <button
            ref={exportBtnRef}
            type="button"
            onClick={() => setExportOpen((v) => !v)}
            title="Sicht exportieren"
            aria-label="Sicht exportieren"
            aria-expanded={exportOpen}
            className={[
              "dock-surface flex h-8 w-8 items-center justify-center rounded-xl shadow-dock transition",
              exportOpen
                ? "dock-control-active"
                : "text-[var(--muted)] hover:bg-[var(--control)] hover:text-[var(--text)]",
            ].join(" ")}
          >
            <Download className="h-3.5 w-3.5" />
          </button>
          <ExportMenu
            open={exportOpen}
            onClose={() => setExportOpen(false)}
            anchorRef={exportBtnRef}
          />
        </div>
      </div>

      {status && (
        <div
          data-canvas-chrome
          className="dock-surface absolute left-1/2 top-3 z-40 flex max-w-[min(100%-2rem,28rem)] -translate-x-1/2 items-center gap-2 px-3 py-2 text-xs text-[var(--text)] shadow-dock"
        >
          <span className="min-w-0 flex-1 truncate">{status.message}</span>
          {status.onCancel && (
            <button
              type="button"
              onClick={status.onCancel}
              className="shrink-0 rounded p-0.5 hover:bg-[var(--control-hover)]"
              title="Beenden (Esc)"
              aria-label="Werkzeug beenden"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      <div
        className="absolute bottom-3 left-3 z-30 flex items-center gap-1.5 max-lg:bottom-14"
        data-canvas-chrome
      >
        <div
          className="dock-surface flex items-center gap-0.5 rounded-xl p-0.5 shadow-dock"
          role="toolbar"
          aria-label="Canvas-Werkzeuge"
        >
          <ToolIconButton
            active={activeTool === "select"}
            title="Auswählen / Verschieben"
            onClick={() => setTool("select")}
          >
            <BoxSelect className="h-3.5 w-3.5" />
          </ToolIconButton>
          <ToolIconButton
            active={activeTool === "connect"}
            title="Verbinden (Elemente oder Bounded Contexts)"
            onClick={() => setTool("connect")}
          >
            <Link2 className="h-3.5 w-3.5" />
          </ToolIconButton>
          <ToolIconButton
            active={activeTool === "bc"}
            title="Bounded Context zeichnen"
            onClick={() => setTool("bc")}
          >
            <SquareDashed className="h-3.5 w-3.5" />
          </ToolIconButton>
          <ToolIconButton
            active={activeTool === "line"}
            title="Freie Linie zeichnen"
            onClick={() => setTool("line")}
          >
            <Minus className="h-3.5 w-3.5" />
          </ToolIconButton>

          {activeTool === "line" && (
            <>
              <span className="mx-0.5 h-4 w-px bg-[var(--border)]" aria-hidden />
              <button
                type="button"
                title={LINE_ARROW_HEAD_LABELS[lineArrowHead]}
                aria-label={LINE_ARROW_HEAD_LABELS[lineArrowHead]}
                onClick={() => {
                  const index = LINE_ARROW_HEADS.indexOf(lineArrowHead);
                  const next = LINE_ARROW_HEADS[(index + 1) % LINE_ARROW_HEADS.length]!;
                  setLineArrowHead(next);
                }}
                className="flex h-8 min-w-8 items-center justify-center rounded-lg px-1.5 text-sm font-medium text-[var(--text)] hover:bg-[var(--control)]"
              >
                {lineArrowHeadShortLabel(lineArrowHead)}
              </button>
            </>
          )}

          <span className="mx-0.5 h-4 w-px bg-[var(--border)]" aria-hidden />

          <ToolIconButton title="Swimlane hinzufügen" onClick={() => addSwimlane()}>
            <Layers className="h-3.5 w-3.5" />
          </ToolIconButton>

          <div className="relative">
            <button
              ref={viewBtnRef}
              type="button"
              onClick={() => setViewOpen((v) => !v)}
              title="Ansichtsoptionen"
              aria-label="Ansichtsoptionen"
              aria-expanded={viewOpen}
              className={[
                "flex h-8 w-8 items-center justify-center rounded-lg transition",
                viewHighlighted
                  ? "dock-control-active"
                  : "text-[var(--muted)] hover:bg-[var(--control)] hover:text-[var(--text)]",
              ].join(" ")}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
            <ViewMenu open={viewOpen} onClose={() => setViewOpen(false)} anchorRef={viewBtnRef} />
          </div>
        </div>
      </div>

      <div
        className="dock-surface absolute bottom-3 right-3 z-30 flex items-center gap-0.5 rounded-xl p-0.5 shadow-dock max-lg:bottom-14"
        data-canvas-chrome
      >
        <button
          type="button"
          className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--control)] hover:text-[var(--text)] max-lg:p-2.5 touch-manipulation"
          title="Verkleinern"
          onClick={() => setViewport({ ...viewport, zoom: clampZoom(viewport.zoom - 0.1) })}
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="min-w-[2.75rem] text-center text-xs tabular-nums text-[var(--muted)]">
          {Math.round(viewport.zoom * 100)}%
        </span>
        <button
          type="button"
          className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--control)] hover:text-[var(--text)] max-lg:p-2.5 touch-manipulation"
          title="Vergrößern"
          onClick={() => setViewport({ ...viewport, zoom: clampZoom(viewport.zoom + 0.1) })}
        >
          <ZoomIn className="h-4 w-4" />
        </button>
      </div>
    </>
  );
}
